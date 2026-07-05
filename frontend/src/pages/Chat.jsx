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

  return (
    <div className="h-screen flex">
      <Sidebar
        tab={tab}
        onTabChange={setTab}
        friends={friends}
        activeUser={activeUser}
        onSelectUser={(u) => {
          setActiveUser(u);
          setTab('chats');
        }}
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
      <main className="flex-1 flex flex-col h-full min-w-0">
        <ChatHeader
          activeUser={activeUser}
          isOnline={onlineUsers?.includes(activeUser?._id)}
          onDeleteChat={handleDeleteChat}
        />
        {messageError && (
          <div className="mx-6 mt-3 text-sm text-ember-200 bg-ember-900/40 border border-ember-700/50 rounded-lg px-3 py-2">
            {messageError}
          </div>
        )}
        <MessageList messages={messages} currentUserId={user?.id} />
        <MessageComposer onSend={sendMessage} disabled={!activeUser} />
      </main>
    </div>
  );
}
