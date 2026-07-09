import { useEffect, useState, useCallback, useRef } from 'react';
import { friendsApi, chatApi, lockApi, statusApi, mediaUrl } from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useNotifications } from '../hooks/useNotifications.js';
import { usePushNotifications } from '../hooks/usePushNotifications.js';
import { useCall } from '../context/CallContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import AddFriendsPanel from '../components/AddFriendsPanel.jsx';
import ChatHeader from '../components/ChatHeader.jsx';
import AvatarModal from '../components/AvatarModal.jsx';
import NotificationBanner from '../components/NotificationBanner.jsx';
import CallModal from '../components/CallModal.jsx';
import PinLockScreen from '../components/PinLockScreen.jsx';
import StatusViewer from '../components/StatusViewer.jsx';
import StatusComposer from '../components/StatusComposer.jsx';
import { MessageList, MessageComposer } from '../components/MessageBox.jsx';

function previewFor(message) {
  if (!message) return '';
  if (message.type === 'image') return message.viewOnce ? '📸 Photo (view once)' : '📷 Photo';
  if (message.type === 'voice') return '🎤 Voice message';
  return message.content;
}

export default function Chat() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { notify, permission, requestPermission } = useNotifications();
  usePushNotifications(permission === 'granted');
  const { startCall, callState, peerUser, setPeerUser } = useCall();

  const [tab, setTab] = useState('chats');
  const [friends, setFriends] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const [incoming, setIncoming] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [actionError, setActionError] = useState('');

  // ✅ Chat lock
  const [lockEnabled, setLockEnabled] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [lockChecked, setLockChecked] = useState(false);

  // ✅ Chat-list previews (last message + unread count per friend)
  const [summaries, setSummaries] = useState({}); // friendId -> { lastMessage, unreadCount }

  // ✅ Status
  const [statusFeed, setStatusFeed] = useState([]);
  const [viewingStatus, setViewingStatus] = useState(null); // a feed entry
  const [composingStatus, setComposingStatus] = useState(false);

  const activeUserRef = useRef(activeUser);
  activeUserRef.current = activeUser;
  const typingTimeoutRef = useRef(null);

  const loadFriends = useCallback(() => {
    friendsApi.list().then(({ data }) => setFriends(data));
  }, []);

  const loadIncoming = useCallback(() => {
    friendsApi.incoming().then(({ data }) => setIncoming(data));
  }, []);

  const loadSummaries = useCallback(() => {
    chatApi
      .summaries()
      .then(({ data }) => {
        const map = {};
        data.forEach((s) => {
          map[s.friendId] = { lastMessage: s.lastMessage, unreadCount: s.unreadCount };
        });
        setSummaries(map);
      })
      .catch(() => {});
  }, []);

  const loadStatusFeed = useCallback(() => {
    statusApi
      .feed()
      .then(({ data }) => setStatusFeed(data))
      .catch(() => {});
  }, []);

  // Initial load
  useEffect(() => {
    loadFriends();
    loadIncoming();
    loadSummaries();
    loadStatusFeed();
    lockApi
      .status()
      .then(({ data }) => setLockEnabled(data.enabled))
      .finally(() => setLockChecked(true));
  }, [loadFriends, loadIncoming, loadSummaries, loadStatusFeed]);

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
    setReplyingTo(null);
    chatApi
      .messages(activeUser._id)
      .then(({ data }) => {
        setMessages(data.messages);
        setHasMore(data.hasMore);
      })
      .catch(() => setMessages([]));
  }, [activeUser]);

  // Clear the unread badge locally the moment I open that conversation
  // (the server-side "seen" flip happens via open_conversation below, this
  // just makes the sidebar preview feel instant).
  useEffect(() => {
    if (!activeUser) return;
    setSummaries((prev) => ({
      ...prev,
      [activeUser._id]: { ...(prev[activeUser._id] || {}), unreadCount: 0 },
    }));
  }, [activeUser]);

  // ---- Read receipts ----
  useEffect(() => {
    if (!socket) return;

    const announceOpen = () => {
      if (document.visibilityState !== 'visible') return;
      if (activeUserRef.current) {
        socket.emit('open_conversation', { withUser: activeUserRef.current._id });
      }
    };
    const announceClosed = () => socket.emit('close_conversation');

    if (activeUser) {
      announceOpen();
    } else {
      announceClosed();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') announceOpen();
      else announceClosed();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket, activeUser]);

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

      // Keep the chat-list preview (and unread badge) fresh even if this
      // conversation isn't the one currently open.
      setSummaries((prev) => ({
        ...prev,
        [otherId]: {
          lastMessage: msg,
          unreadCount:
            msg.sender === user.id || isActiveChat ? 0 : (prev[otherId]?.unreadCount || 0) + 1,
        },
      }));

      if (msg.sender !== user.id) {
        const friend = friends.find((f) => f._id === otherId);
        notify(friend ? friend.username : 'New message', { body: previewFor(msg), tag: `chat-${otherId}` });
      }
    };
    socket.on('receive_message', handler);
    return () => socket.off('receive_message', handler);
  }, [socket, user, friends, notify]);

  // Real-time: the other person has seen the message(s) I sent them
  useEffect(() => {
    if (!socket) return;
    const handler = ({ by }) => {
      setMessages((prev) =>
        prev.map((m) => {
          const isMine = m.sender === user.id || m.sender?._id === user.id;
          const seenByRightPerson = m.receiver === by || m.receiver?._id === by;
          if (isMine && seenByRightPerson && !m.seen) {
            return { ...m, seen: true, seenAt: new Date().toISOString() };
          }
          return m;
        })
      );
    };
    socket.on('messages_seen', handler);
    return () => socket.off('messages_seen', handler);
  }, [socket, user]);

  // Real-time: someone reacted (or removed a reaction) to a message
  useEffect(() => {
    if (!socket) return;
    const handler = ({ messageId, reactions }) => {
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, reactions } : m)));
    };
    socket.on('message_reacted', handler);
    return () => socket.off('message_reacted', handler);
  }, [socket]);

  // Real-time: the other person opened a view-once photo I sent them
  useEffect(() => {
    if (!socket) return;
    const handler = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, viewOnceOpenedAt: new Date().toISOString() } : m))
      );
    };
    socket.on('view_once_opened', handler);
    return () => socket.off('view_once_opened', handler);
  }, [socket]);

  // Real-time: a friend posted a new status
  useEffect(() => {
    if (!socket) return;
    const handler = () => loadStatusFeed();
    socket.on('new_status', handler);
    return () => socket.off('new_status', handler);
  }, [socket, loadStatusFeed]);

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

  // An incoming call only carries the caller's userId - once the friends
  // list is available, fill in their username/avatar for the call UI.
  useEffect(() => {
    if (callState === 'incoming' && peerUser && !peerUser.username) {
      const friend = friends.find((f) => f._id === peerUser._id);
      if (friend) setPeerUser(friend);
    }
  }, [callState, peerUser, friends, setPeerUser]);

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
      const withReply = replyingTo ? { ...payload, replyTo: replyingTo._id } : payload;
      socket.emit('send_message', { receiver: activeUser._id, ...withReply }, (result) => {
        if (result?.error) {
          setMessageError(result.error);
        } else if (result) {
          setMessages((prev) => [...prev, result]);
          setSummaries((prev) => ({
            ...prev,
            [activeUser._id]: { lastMessage: result, unreadCount: 0 },
          }));
        }
      });
      setReplyingTo(null);
    },
    [activeUser, socket, replyingTo]
  );

  const handleSendText = (content) => sendMessage({ type: 'text', content });
  const handleSendMedia = ({ type, mediaUrl, duration, viewOnce }) =>
    sendMessage({ type, mediaUrl, duration, viewOnce });

  const handleReact = useCallback(
    (messageId, emoji) => {
      if (!socket) return;
      socket.emit('react_message', { messageId, emoji });
    },
    [socket]
  );

  const handleOpenViewOnce = useCallback(async (message) => {
    try {
      const { data } = await chatApi.openViewOnce(message._id);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === message._id ? { ...m, mediaUrl: '', viewOnceConsumed: true, viewOnceOpenedAt: new Date().toISOString() } : m
        )
      );
      return { url: mediaUrl(data.mediaUrl) };
    } catch (err) {
      setMessageError(err.response?.data?.message || 'Could not open photo');
      return null;
    }
  }, []);

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

  // Gate the whole app behind the PIN until it's checked + entered
  if (!lockChecked) return null;
  if (lockEnabled && !unlocked) {
    return <PinLockScreen onUnlock={() => setUnlocked(true)} />;
  }

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
        summaries={summaries}
        lockEnabled={lockEnabled}
        onLockChanged={setLockEnabled}
        statusFeed={statusFeed}
        currentUser={user}
        onOpenMyStatus={() => {
          const mine = statusFeed.find((f) => f.isMine);
          if (mine) setViewingStatus(mine);
        }}
        onAddStatus={() => setComposingStatus(true)}
        onOpenFriendStatus={(entry) => setViewingStatus(entry)}
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
          onAudioCall={() => activeUser && startCall(activeUser, 'audio')}
          onVideoCall={() => activeUser && startCall(activeUser, 'video')}
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
          onReply={setReplyingTo}
          friendUsername={activeUser?.username}
          onReact={handleReact}
          onOpenViewOnce={handleOpenViewOnce}
        />
        <MessageComposer
          onSendText={handleSendText}
          onSendMedia={handleSendMedia}
          onTyping={handleTyping}
          disabled={!activeUser}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          currentUserId={user?.id}
          friendUsername={activeUser?.username}
        />
      </main>

      {showAvatarModal && <AvatarModal onClose={() => setShowAvatarModal(false)} />}
      <CallModal />

      {viewingStatus && (
        <StatusViewer
          entry={viewingStatus}
          isMine={viewingStatus.isMine}
          onClose={() => {
            setViewingStatus(null);
            loadStatusFeed();
          }}
          onDeleted={() => loadStatusFeed()}
        />
      )}
      {composingStatus && (
        <StatusComposer onClose={() => setComposingStatus(false)} onPosted={loadStatusFeed} />
      )}
    </div>
  );
}
