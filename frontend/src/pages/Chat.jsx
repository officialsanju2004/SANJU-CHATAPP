import { useEffect, useState, useCallback } from 'react';
import { friendsApi, chatApi } from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import AddFriendsPanel from '../components/AddFriendsPanel.jsx';
import ChatHeader from '../components/ChatHeader.jsx';
import { MessageList, MessageComposer } from '../components/MessageBox.jsx';

export default function Chat() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();

  const [tab, setTab] = useState('chats');
  const [friends, setFriends] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageError, setMessageError] = useState('');

  const [incoming, setIncoming] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [actionError, setActionError] = useState('');

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);

  const loadFriends = useCallback(() => {
    friendsApi.list().then(({ data }) => setFriends(data));
  }, []);

  const loadIncoming = useCallback(() => {
    friendsApi.incoming().then(({ data }) => setIncoming(data));
  }, []);

  // Initial load
  useEffect(() => {
    loadFriends();
    loadIncoming();
  }, [loadFriends, loadIncoming]);

  // Live search as the user types (debounced)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(() => {
      friendsApi.search(searchQuery.trim()).then(({ data }) => setSearchResults(data));
    }, 300);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Load conversation history when active friend changes
  useEffect(() => {
    if (!activeUser) return;
    setMessageError('');
    chatApi
      .messages(activeUser._id)
      .then(({ data }) => setMessages(data))
      .catch(() => setMessages([]));
  }, [activeUser]);

  // Real-time: incoming chat messages
  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      const otherId = msg.sender === user.id ? msg.receiver : msg.sender;
      setMessages((prev) => {
        if (!activeUser || otherId !== activeUser._id) return prev;
        return [...prev, msg];
      });
    };
    socket.on('receive_message', handler);
    return () => socket.off('receive_message', handler);
  }, [socket, activeUser, user]);

  // Real-time: someone sent me a friend request
  useEffect(() => {
    if (!socket) return;
    const handler = () => loadIncoming();
    socket.on('friend_request_received', handler);
    return () => socket.off('friend_request_received', handler);
  }, [socket, loadIncoming]);

  // Real-time: someone accepted my friend request -> refresh my friends list
  useEffect(() => {
    if (!socket) return;
    const handler = () => loadFriends();
    socket.on('friend_request_accepted', handler);
    return () => socket.off('friend_request_accepted', handler);
  }, [socket, loadFriends]);

  // Real-time: the other person deleted this conversation -> clear it on my side too
  useEffect(() => {
    if (!socket) return;
    const handler = ({ by }) => {
      if (activeUser && by === activeUser._id) {
        setMessages([]);
      }
    };
    socket.on('chat_deleted', handler);
    return () => socket.off('chat_deleted', handler);
  }, [socket, activeUser]);

  const sendMessage = useCallback(
    (content) => {
      if (!activeUser || !socket) return;
      setMessageError('');
      socket.emit('send_message', { receiver: activeUser._id, content }, (result) => {
        if (result?.error) {
          setMessageError(result.error);
        } else if (result) {
          setMessages((prev) => [...prev, result]);
        }
      });
    },
    [activeUser, socket]
  );

  const handleSendRequest = async (username) => {
    setActionError('');
    try {
      await friendsApi.sendRequest(username);
      setSearchQuery((q) => q); // keep query, results refresh below
      const { data } = await friendsApi.search(searchQuery.trim());
      setSearchResults(data);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not send request');
    }
  };

  const handleAccept = async (id) => {
    await friendsApi.accept(id);
    loadIncoming();
    loadFriends();
  };

  const handleDecline = async (id) => {
    await friendsApi.decline(id);
    loadIncoming();
  };

  const handleDeleteChat = async () => {
    if (!activeUser) return;
    try {
      await chatApi.deleteChat(activeUser._id);
      setMessages([]);
    } catch (err) {
      setMessageError(err.response?.data?.message || 'Could not delete conversation');
    }
  };

  // Handle mobile sidebar toggle
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Close sidebar on mobile when a user is selected
  const handleUserSelect = (u) => {
    setActiveUser(u);
    setTab('chats');
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Global styles for mobile responsiveness */}
      <style jsx>{`
        @media (max-width: 767px) {
          /* Make all text readable on mobile */
          .mobile-text-base {
            font-size: 14px !important;
            line-height: 1.5 !important;
          }
          
          .mobile-text-sm {
            font-size: 12px !important;
            line-height: 1.4 !important;
          }
          
          .mobile-text-lg {
            font-size: 16px !important;
            line-height: 1.6 !important;
          }
          
          /* Make chat messages touch-friendly */
          .message-bubble-mobile {
            padding: 8px 12px !important;
            margin: 4px 0 !important;
            max-width: 85% !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
          }
          
          /* Improve touch targets */
          .touch-target {
            min-height: 44px !important;
            min-width: 44px !important;
          }
          
          /* Make input fields more usable */
          .input-mobile {
            font-size: 16px !important;
            padding: 10px 12px !important;
          }
          
          /* Better spacing for mobile */
          .mobile-padding {
            padding: 8px 12px !important;
          }
          
          .mobile-margin {
            margin: 4px 0 !important;
          }
          
          /* Prevent text overflow */
          .mobile-truncate {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          /* Smooth scrolling for mobile */
          .scroll-mobile {
            -webkit-overflow-scrolling: touch;
            scroll-behavior: smooth;
          }
        }
        
        /* Tablet responsive adjustments */
        @media (min-width: 768px) and (max-width: 1023px) {
          .sidebar-tablet {
            width: 280px !important;
          }
        }
        
        /* Animation for mobile sidebar */
        .sidebar-transition {
          transition: transform 0.3s ease-in-out;
        }
        
        /* Overlay for mobile */
        .overlay-mobile {
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(2px);
        }
      `}</style>

      <div className="h-screen flex overflow-hidden bg-white dark:bg-gray-900">
        {/* Mobile sidebar overlay */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 overlay-mobile z-40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar with mobile responsiveness */}
        <div className={`
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed md:relative z-50 md:z-auto
          w-[85vw] max-w-[320px] md:max-w-none md:w-auto
          h-full sidebar-transition
        `}>
          <Sidebar
            tab={tab}
            onTabChange={setTab}
            friends={friends}
            activeUser={activeUser}
            onSelectUser={handleUserSelect}
            onlineUserIds={onlineUsers}
            incomingCount={incoming.length}
          >
            <AddFriendsPanel
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchResults={searchResults}
              onSendRequest={handleSendRequest}
              incoming={incoming}
              onAccept={handleAccept}
              onDecline={handleDecline}
              actionError={actionError}
            />
          </Sidebar>
        </div>

        {/* Main chat area */}
        <main className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-gray-900">
          {/* Mobile header with menu toggle */}
          <div className="flex items-center gap-2 px-3 py-2 md:hidden border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <button
              onClick={toggleMobileSidebar}
              className="touch-target p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {activeUser ? (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white mobile-text-base truncate">
                  {activeUser.displayName || activeUser.username}
                </p>
                <p className="mobile-text-sm text-gray-500 dark:text-gray-400">
                  {onlineUsers?.includes(activeUser._id) ? '🟢 Online' : '⚫ Offline'}
                </p>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 mobile-text-base">
                Select a conversation
              </p>
            )}
            
            {activeUser && (
              <button
                onClick={handleDeleteChat}
                className="touch-target p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Delete chat"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>

          {/* Desktop ChatHeader - hidden on mobile */}
          <div className="hidden md:block">
            <ChatHeader
              activeUser={activeUser}
              isOnline={onlineUsers?.includes(activeUser?._id)}
              onDeleteChat={handleDeleteChat}
            />
          </div>

          {/* Error messages - responsive */}
          {messageError && (
            <div className="mx-3 md:mx-6 mt-2 md:mt-3 mobile-text-sm md:text-sm text-ember-200 bg-ember-900/40 border border-ember-700/50 rounded-lg px-3 py-2">
              {messageError}
            </div>
          )}

          {/* Message list - responsive padding */}
          <div className="flex-1 overflow-hidden scroll-mobile">
            <MessageList messages={messages} currentUserId={user?.id} />
          </div>

          {/* Message composer - responsive */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 md:p-3">
            <MessageComposer onSend={sendMessage} disabled={!activeUser} />
          </div>
        </main>
      </div>
    </>
  );
}