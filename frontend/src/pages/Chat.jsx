import { useEffect, useState, useCallback, useRef } from 'react';
import { friendsApi, chatApi } from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useNotifications } from '../hooks/useNotifications.js';
import Sidebar from '../components/Sidebar.jsx';
import AddFriendsPanel from '../components/AddFriendsPanel.jsx';
import ChatHeader from '../components/ChatHeader.jsx';
import AvatarModal from '../components/AvatarModal.jsx';
import NotificationBanner from '../components/NotificationBanner.jsx';
import { MessageList, MessageComposer } from '../components/MessageBox.jsx';

function previewFor(message) {
  if (message.type === 'image') return '📷 Photo';
  if (message.type === 'voice') return '🎤 Voice message';
  return message.content;
}

export default function Chat() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { notify, permission, requestPermission } = useNotifications();

  const [tab, setTab] = useState('chats');
  const [friends, setFriends] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const [incoming, setIncoming] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [actionError, setActionError] = useState('');

  const activeUserRef = useRef(activeUser);
  activeUserRef.current = activeUser;
  const typingTimeoutRef = useRef(null);

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

  // Load the latest page of a conversation when the active friend changes
  useEffect(() => {
    if (!activeUser) return;
    setMessageError('');
    setMessages([]);
    setRemoteTyping(false);
    chatApi
      .messages(activeUser._id)
      .then(({ data }) => {
        setMessages(data.messages);
        setHasMore(data.hasMore);
      })
      .catch(() => setMessages([]));
  }, [activeUser]);

  // Infinite scroll: fetch the page before the oldest message currently loaded
  const loadOlderMessages = useCallback(async () => {
    if (!activeUser || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldestId = messages[0]._id;
      const { data } = await chatApi.messages(activeUser._id, oldestId);
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
    } catch (err) {
      // silently ignore - user can retry by scrolling again
    } finally {
      setLoadingMore(false);
    }
  }, [activeUser, messages]);

  // Real-time: incoming chat messages
  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      const otherId = msg.sender === user.id ? msg.receiver : msg.sender;
      const isActiveChat = activeUserRef.current && otherId === activeUserRef.current._id;

      setMessages((prev) => (isActiveChat ? [...prev, msg] : prev));

      if (msg.sender !== user.id) {
        const friend = friends.find((f) => f._id === otherId);
        notify(friend ? friend.username : 'New message', { body: previewFor(msg), tag: `chat-${otherId}` });
      }
    };
    socket.on('receive_message', handler);
    return () => socket.off('receive_message', handler);
  }, [socket, user, friends, notify]);

  // Real-time: typing indicator from whoever we're chatting with
  useEffect(() => {
    if (!socket) return;
    const handler = ({ from, isTyping }) => {
      if (activeUserRef.current && from === activeUserRef.current._id) {
        setRemoteTyping(isTyping);
      }
    };
    socket.on('typing', handler);
    return () => socket.off('typing', handler);
  }, [socket]);

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
      if (activeUserRef.current && by === activeUserRef.current._id) {
        setMessages([]);
        setHasMore(false);
      }
    };
    socket.on('chat_deleted', handler);
    return () => socket.off('chat_deleted', handler);
  }, [socket]);

  // Real-time: keep last-seen fresh in both the friends list and the open chat
  useEffect(() => {
    if (!socket) return;
    const handler = ({ userId, lastSeen }) => {
      setFriends((prev) => prev.map((f) => (f._id === userId ? { ...f, lastSeen } : f)));
      setActiveUser((prev) => (prev && prev._id === userId ? { ...prev, lastSeen } : prev));
    };
    socket.on('user_last_seen', handler);
    return () => socket.off('user_last_seen', handler);
  }, [socket]);

  const sendMessage = useCallback(
    (payload) => {
      if (!activeUser || !socket) return;
      setMessageError('');
      socket.emit('send_message', { receiver: activeUser._id, ...payload }, (result) => {
        if (result?.error) {
          setMessageError(result.error);
        } else if (result) {
          setMessages((prev) => [...prev, result]);
        }
      });
    },
    [activeUser, socket]
  );

  const handleSendText = (content) => sendMessage({ type: 'text', content });
  const handleSendMedia = ({ type, mediaUrl, duration }) => sendMessage({ type, mediaUrl, duration });

  const handleTyping = useCallback(
    (isTyping) => {
      if (!activeUser || !socket) return;
      socket.emit('typing', { receiver: activeUser._id, isTyping });
      clearTimeout(typingTimeoutRef.current);
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing', { receiver: activeUser._id, isTyping: false });
        }, 2000);
      }
    },
    [activeUser, socket]
  );

  const handleSendRequest = async (username) => {
    setActionError('');
    try {
      await friendsApi.sendRequest(username);
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
      setHasMore(false);
    } catch (err) {
      setMessageError(err.response?.data?.message || 'Could not delete conversation');
    }
  };

  return (
    <div className="h-[100dvh] flex overflow-hidden">
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
        hiddenOnMobile={!!activeUser}
        onAvatarClick={() => setShowAvatarModal(true)}
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

      <main
        className={`flex-1 flex-col h-full min-w-0 ${activeUser ? 'flex' : 'hidden sm:flex'}`}
      >
        <ChatHeader
          activeUser={activeUser}
          isOnline={onlineUsers?.includes(activeUser?._id)}
          onDeleteChat={handleDeleteChat}
          onBack={() => setActiveUser(null)}
          isTyping={remoteTyping}
        />
        {messageError && (
          <div className="mx-4 sm:mx-6 mt-3 text-sm text-ember-200 bg-ember-900/40 border border-ember-700/50 rounded-lg px-3 py-2">
            {messageError}
          </div>
        )}
        <NotificationBanner permission={permission} onEnable={requestPermission} />
        <MessageList
          messages={messages}
          currentUserId={user?.id}
          onLoadMore={loadOlderMessages}
          hasMore={hasMore}
          loadingMore={loadingMore}
          typing={remoteTyping}
        />
        <MessageComposer
          onSendText={handleSendText}
          onSendMedia={handleSendMedia}
          onTyping={handleTyping}
          disabled={!activeUser}
        />
      </main>

      {showAvatarModal && <AvatarModal onClose={() => setShowAvatarModal(false)} />}
    </div>
  );
}
