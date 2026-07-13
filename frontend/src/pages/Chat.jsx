import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  friendsApi,
  chatApi,
  lockApi,
  statusApi,
  blockApi,
  groupsApi,
  privacyApi,
  mediaUrl,
  aiApi,
  pinApi,
} from '../api/axios.js';
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
import GroupInfoModal from '../components/GroupInfoModal.jsx';
import RenameContactModal from '../components/RenameContactModal.jsx';
import WallpaperPicker, { loadWallpaper } from '../components/WallpaperPicker.jsx';
import AutoDeleteModal from '../components/AutoDeleteModal.jsx';
import InChatSearchBar from '../components/InChatSearchBar.jsx';
import { MessageList, MessageComposer } from '../components/MessageBox.jsx';

function previewFor(message) {
  if (!message) return '';
  if (message.type === 'image') return message.viewOnce ? '📸 Photo (view once)' : '📷 Photo';
  if (message.type === 'video') return '🎥 Video';
  if (message.type === 'voice') return '🎤 Voice message';
  if (message.type === 'poll') return `📊 ${message.poll?.question || 'Poll'}`;
  if (message.type === 'location') return message.location?.live ? '📍 Live location' : '📍 Location';
  if (message.deletedForEveryone) return 'This message was deleted';
  return message.content;
}

export default function Chat() {
  const { user, updateUser } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { notify, permission, requestPermission } = useNotifications();
  usePushNotifications(permission === 'granted');
  const { startCall, callState, peerUser, setPeerUser } = useCall();

  const [tab, setTab] = useState('chats');
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [aiAssistant, setAiAssistant] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null); // { type: 'dm', user } | { type: 'group', group }
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showRenameContact, setShowRenameContact] = useState(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [showAutoDelete, setShowAutoDelete] = useState(false);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [wallpaper, setWallpaper] = useState(null);
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const [pinnedChats, setPinnedChats] = useState(user?.pinnedChats || []);

  const [incoming, setIncoming] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [actionError, setActionError] = useState('');

  const [lockEnabled, setLockEnabled] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [lockChecked, setLockChecked] = useState(false);

  const [summaries, setSummaries] = useState({}); // DM: friendId -> { lastMessage, unreadCount }
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [privacyBlockGroupAdd, setPrivacyBlockGroupAdd] = useState(false);

  const [statusFeed, setStatusFeed] = useState([]);
  const [viewingStatus, setViewingStatus] = useState(null);
  const [composingStatus, setComposingStatus] = useState(false);

  const activeConversationRef = useRef(activeConversation);
  activeConversationRef.current = activeConversation;
  const typingTimeoutRef = useRef(null);
  const liveLocationWatchRef = useRef(null);

  const activeUser = activeConversation?.type === 'dm' ? activeConversation.user : null;
  const activeGroup = activeConversation?.type === 'group' ? activeConversation.group : null;

  const activeKey = activeConversation
    ? activeConversation.type === 'dm'
      ? `dm-${activeConversation.user._id}`
      : `group-${activeConversation.group._id}`
    : null;

  const loadFriends = useCallback(() => {
    friendsApi.list().then(({ data }) => setFriends(data));
  }, []);

  const loadGroups = useCallback(() => {
    groupsApi.list().then(({ data }) => setGroups(data));
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
    statusApi.feed().then(({ data }) => setStatusFeed(data)).catch(() => {});
  }, []);

  const loadBlocked = useCallback(() => {
    blockApi.list().then(({ data }) => setBlockedIds(new Set(data.map((u) => u._id)))).catch(() => {});
  }, []);

  useEffect(() => {
    loadFriends();
    loadGroups();
    loadIncoming();
    loadSummaries();
    loadStatusFeed();
    loadBlocked();
    lockApi.status().then(({ data }) => setLockEnabled(data.enabled)).finally(() => setLockChecked(true));
    privacyApi.get().then(({ data }) => setPrivacyBlockGroupAdd(data.blockGroupAdd)).catch(() => {});
    aiApi.get().then(({ data }) => setAiAssistant(data)).catch(() => {});
  }, [loadFriends, loadGroups, loadIncoming, loadSummaries, loadStatusFeed, loadBlocked]);

  useEffect(() => {
    if (user?.pinnedChats) setPinnedChats(user.pinnedChats);
  }, [user?.pinnedChats]);

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

  // Load message history whenever the active conversation changes
  useEffect(() => {
    if (!activeConversation) return;
    setMessageError('');
    setMessages([]);
    setRemoteTyping(false);
    setReplyingTo(null);
    setShowInChatSearch(false);
    setWallpaper(loadWallpaper(activeKey));

    const fetcher =
      activeConversation.type === 'dm'
        ? chatApi.messages(activeConversation.user._id)
        : chatApi.groupMessages(activeConversation.group._id);

    fetcher
      .then(({ data }) => {
        setMessages(data.messages);
        setHasMore(data.hasMore);
      })
      .catch(() => setMessages([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation]);

  // Clear the unread badge locally the instant a conversation is opened
  useEffect(() => {
    if (!activeConversation) return;
    if (activeConversation.type === 'dm') {
      const id = activeConversation.user._id;
      setSummaries((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), unreadCount: 0 } }));
    } else {
      const id = activeConversation.group._id;
      setGroups((prev) => prev.map((g) => (g._id === id ? { ...g, unreadCount: 0 } : g)));
    }
  }, [activeConversation]);

  // ---- Read receipts: tell the server which conversation is open ----
  useEffect(() => {
    if (!socket) return;

    const announceOpen = () => {
      if (document.visibilityState !== 'visible') return;
      const conv = activeConversationRef.current;
      if (!conv) return;
      if (conv.type === 'dm') socket.emit('open_conversation', { withUser: conv.user._id });
      else socket.emit('open_group_conversation', { groupId: conv.group._id });
    };
    const announceClosed = () => {
      socket.emit('close_conversation');
      socket.emit('close_group_conversation');
    };

    if (activeConversation) announceOpen();
    else announceClosed();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') announceOpen();
      else announceClosed();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [socket, activeConversation]);

  const loadOlderMessages = useCallback(async () => {
    if (!activeConversation || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldestId = messages[0]._id;
      const { data } =
        activeConversation.type === 'dm'
          ? await chatApi.messages(activeConversation.user._id, oldestId)
          : await chatApi.groupMessages(activeConversation.group._id, oldestId);
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
    } catch (err) {
      // ignore, user can retry by scrolling again
    } finally {
      setLoadingMore(false);
    }
  }, [activeConversation, messages]);

  // Real-time: incoming messages (both DM and group share this event)
  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      const conv = activeConversationRef.current;
      const senderId = msg.sender?._id || msg.sender;

      if (msg.group) {
        const isActive = conv?.type === 'group' && conv.group._id === msg.group;
        setMessages((prev) => (isActive ? [...prev, msg] : prev));
        setGroups((prev) =>
          prev.map((g) =>
            g._id === msg.group
              ? { ...g, lastMessage: msg, unreadCount: isActive ? 0 : (g.unreadCount || 0) + 1 }
              : g
          )
        );
        if (senderId !== user.id) {
          const group = groups.find((g) => g._id === msg.group);
          notify(group?.name || 'New group message', {
            body: `${msg.sender?.username || 'Someone'}: ${previewFor(msg)}`,
            tag: `group-${msg.group}`,
          });
        }
        return;
      }

      const otherId = senderId === user.id ? msg.receiver : senderId;
      const isActiveChat = conv?.type === 'dm' && otherId === conv.user._id;
      setMessages((prev) => (isActiveChat ? [...prev, msg] : prev));
      setSummaries((prev) => ({
        ...prev,
        [otherId]: {
          lastMessage: msg,
          unreadCount: senderId === user.id || isActiveChat ? 0 : (prev[otherId]?.unreadCount || 0) + 1,
        },
      }));

      if (senderId !== user.id) {
        const friend = friends.find((f) => f._id === otherId);
        notify(friend ? friend.username : 'New message', { body: previewFor(msg), tag: `chat-${otherId}` });
      }
    };
    socket.on('receive_message', handler);
    return () => socket.off('receive_message', handler);
  }, [socket, user, friends, groups, notify]);

  // Real-time: DM seen receipts
  useEffect(() => {
    if (!socket) return;
    const handler = ({ by }) => {
      setMessages((prev) =>
        prev.map((m) => {
          const isMine = m.sender === user.id || m.sender?._id === user.id;
          const seenByRightPerson = m.receiver === by || m.receiver?._id === by;
          if (isMine && seenByRightPerson && !m.seen) return { ...m, seen: true, seenAt: new Date().toISOString() };
          return m;
        })
      );
    };
    socket.on('messages_seen', handler);
    return () => socket.off('messages_seen', handler);
  }, [socket, user]);

  // Real-time: group seen receipts
  useEffect(() => {
    if (!socket) return;
    const handler = ({ groupId, by }) => {
      const conv = activeConversationRef.current;
      if (conv?.type !== 'group' || conv.group._id !== groupId) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (String(m.group) !== groupId) return m;
          if (m.seenBy?.some((s) => (s.user?._id || s.user) === by)) return m;
          return { ...m, seenBy: [...(m.seenBy || []), { user: by, seenAt: new Date().toISOString() }] };
        })
      );
    };
    socket.on('group_messages_seen', handler);
    return () => socket.off('group_messages_seen', handler);
  }, [socket]);

  // Real-time: reactions (DM + group share this event)
  useEffect(() => {
    if (!socket) return;
    const handler = ({ messageId, reactions }) => {
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, reactions } : m)));
    };
    socket.on('message_reacted', handler);
    return () => socket.off('message_reacted', handler);
  }, [socket]);

  // Real-time: message edited
  useEffect(() => {
    if (!socket) return;
    const handler = ({ messageId, content, editedAt }) => {
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, content, editedAt } : m)));
    };
    socket.on('message_edited', handler);
    return () => socket.off('message_edited', handler);
  }, [socket]);

  // Real-time: message unsent ("deleted for everyone")
  useEffect(() => {
    if (!socket) return;
    const handler = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, deletedForEveryone: true, content: '', mediaUrl: '' } : m))
      );
    };
    socket.on('message_unsent', handler);
    return () => socket.off('message_unsent', handler);
  }, [socket]);

  // Real-time: view-once opened
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

  // Real-time: poll votes
  useEffect(() => {
    if (!socket) return;
    const handler = ({ messageId, poll }) => {
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, poll } : m)));
    };
    socket.on('poll_updated', handler);
    return () => socket.off('poll_updated', handler);
  }, [socket]);

  // Real-time: live location updates
  useEffect(() => {
    if (!socket) return;
    const handler = ({ messageId, lat, lng }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, location: { ...m.location, lat, lng } } : m))
      );
    };
    socket.on('location_updated', handler);
    return () => socket.off('location_updated', handler);
  }, [socket]);

  // Real-time: a reminder just fired
  useEffect(() => {
    if (!socket) return;
    const handler = ({ reminder }) => {
      notify('⏰ Reminder', { body: reminder.note || previewFor(reminder.message) || 'You asked to be reminded' });
    };
    socket.on('reminder_due', handler);
    return () => socket.off('reminder_due', handler);
  }, [socket, notify]);

  // Real-time: verified badge granted/revoked on my own account
  useEffect(() => {
    if (!socket) return;
    const handler = ({ verified }) => updateUser({ verified });
    socket.on('verification_changed', handler);
    return () => socket.off('verification_changed', handler);
  }, [socket, updateUser]);

  // Real-time: added to / removed from a group
  useEffect(() => {
    if (!socket) return;
    const handleAdded = () => loadGroups();
    const handleRemoved = ({ groupId }) => {
      loadGroups();
      if (activeConversationRef.current?.type === 'group' && activeConversationRef.current.group._id === groupId) {
        setActiveConversation(null);
      }
    };
    socket.on('added_to_group', handleAdded);
    socket.on('removed_from_group', handleRemoved);
    return () => {
      socket.off('added_to_group', handleAdded);
      socket.off('removed_from_group', handleRemoved);
    };
  }, [socket, loadGroups]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => loadStatusFeed();
    socket.on('new_status', handler);
    return () => socket.off('new_status', handler);
  }, [socket, loadStatusFeed]);

  // Typing indicator
  useEffect(() => {
    if (!socket) return;
    const handler = ({ from, groupId, isTyping }) => {
      const conv = activeConversationRef.current;
      if (groupId) {
        if (conv?.type === 'group' && conv.group._id === groupId) setRemoteTyping(isTyping);
        return;
      }
      if (conv?.type === 'dm' && from === conv.user._id) setRemoteTyping(isTyping);
    };
    socket.on('typing', handler);
    return () => socket.off('typing', handler);
  }, [socket]);

  useEffect(() => {
    if (callState === 'incoming' && peerUser && !peerUser.username) {
      const friend = friends.find((f) => f._id === peerUser._id);
      if (friend) setPeerUser(friend);
    }
  }, [callState, peerUser, friends, setPeerUser]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => loadIncoming();
    socket.on('friend_request_received', handler);
    return () => socket.off('friend_request_received', handler);
  }, [socket, loadIncoming]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => loadFriends();
    socket.on('friend_request_accepted', handler);
    return () => socket.off('friend_request_accepted', handler);
  }, [socket, loadFriends]);

  useEffect(() => {
    if (!socket) return;
    const handler = ({ userId, lastSeen }) => {
      setFriends((prev) => prev.map((f) => (f._id === userId ? { ...f, lastSeen } : f)));
      setActiveConversation((prev) =>
        prev?.type === 'dm' && prev.user._id === userId ? { ...prev, user: { ...prev.user, lastSeen } } : prev
      );
    };
    socket.on('user_last_seen', handler);
    return () => socket.off('user_last_seen', handler);
  }, [socket]);

  const sendMessage = useCallback(
    (payload, callback) => {
      if (!activeConversation || !socket) return;
      setMessageError('');
      const withReply = replyingTo ? { ...payload, replyTo: replyingTo._id } : payload;
      const target =
        activeConversation.type === 'dm'
          ? { receiver: activeConversation.user._id }
          : { groupId: activeConversation.group._id };

      socket.emit('send_message', { ...target, ...withReply }, (result) => {
        if (result?.error) {
          setMessageError(result.error);
        } else if (result) {
          setMessages((prev) => [...prev, result]);
          if (activeConversation.type === 'dm') {
            setSummaries((prev) => ({ ...prev, [activeConversation.user._id]: { lastMessage: result, unreadCount: 0 } }));
          } else {
            setGroups((prev) =>
              prev.map((g) => (g._id === activeConversation.group._id ? { ...g, lastMessage: result, unreadCount: 0 } : g))
            );
          }
        }
        callback?.(result);
      });
      setReplyingTo(null);
    },
    [activeConversation, socket, replyingTo]
  );

  const handleSendText = (content) => sendMessage({ type: 'text', content });
  const handleSendMedia = ({ type, mediaUrl: url, duration, viewOnce }) =>
    sendMessage({ type, mediaUrl: url, duration, viewOnce });

  const handleSendPoll = ({ question, options, allowMultiple }) =>
    sendMessage({ type: 'poll', poll: { question, options, allowMultiple } });

  const handleSendLocation = ({ lat, lng, live, liveMinutes }) => {
    sendMessage({ type: 'location', location: { lat, lng, live, liveMinutes } }, (result) => {
      if (!live || !result?._id || !socket) return;

      // Keep pushing fresh coordinates while the share is live, using the
      // browser's own location watcher - stops automatically once the
      // share's duration is up.
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          socket.emit('update_live_location', {
            messageId: result._id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {},
        { enableHighAccuracy: true }
      );
      liveLocationWatchRef.current = watchId;
      setTimeout(() => {
        navigator.geolocation.clearWatch(watchId);
      }, (liveMinutes || 60) * 60000);
    });
  };

  useEffect(
    () => () => {
      if (liveLocationWatchRef.current != null) {
        navigator.geolocation.clearWatch(liveLocationWatchRef.current);
      }
    },
    []
  );

  const handleReact = useCallback(
    (messageId, emoji) => {
      if (!socket) return;
      socket.emit('react_message', { messageId, emoji });
    },
    [socket]
  );

  const handleVotePoll = useCallback(
    (messageId, optionIndexes) => {
      if (!socket) return;
      socket.emit('vote_poll', { messageId, optionIndexes });
    },
    [socket]
  );

  const handleToggleStar = useCallback(async (messageId) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id !== messageId) return m;
        const already = m.starredBy?.some((id) => id === user.id || id?._id === user.id);
        const nextStarredBy = already
          ? m.starredBy.filter((id) => id !== user.id && id?._id !== user.id)
          : [...(m.starredBy || []), user.id];
        return { ...m, starredBy: nextStarredBy };
      })
    );
    try {
      await chatApi.toggleStar(messageId);
    } catch (err) {
      // best-effort; a page refresh will resync if this failed
    }
  }, [user]);

  const handleEdit = useCallback(
    (messageId, content) => {
      if (!socket) return;
      socket.emit('edit_message', { messageId, content });
    },
    [socket]
  );

  const handleUnsend = useCallback(
    (messageId) => {
      if (!socket) return;
      if (!window.confirm('Unsend this message for everyone?')) return;
      socket.emit('unsend_message', { messageId });
    },
    [socket]
  );

  const handleOpenViewOnce = useCallback(async (message) => {
    try {
      const { data } = await chatApi.openViewOnce(message._id);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === message._id
            ? { ...m, mediaUrl: '', viewOnceConsumed: true, viewOnceOpenedAt: new Date().toISOString() }
            : m
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
      if (!activeConversation || !socket) return;
      if (activeConversation.type === 'dm') {
        socket.emit('typing', { receiver: activeConversation.user._id, isTyping });
      } else {
        socket.emit('typing', { groupId: activeConversation.group._id, isTyping });
      }
      clearTimeout(typingTimeoutRef.current);
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => handleTyping(false), 2000);
      }
    },
    [activeConversation, socket]
  );

  const handleSendRequest = async (username) => {
    setActionError('');
    try {
      await friendsApi.sendRequest(username);
      if (searchQuery.trim()) {
        const { data } = await friendsApi.search(searchQuery.trim());
        setSearchResults(data);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not send request');
      throw err;
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
    if (!activeConversation) return;
    if (activeConversation.type === 'group') {
      await groupsApi.removeMember(activeConversation.group._id, user.id);
      setActiveConversation(null);
      loadGroups();
      return;
    }
    try {
      await chatApi.deleteChat(activeConversation.user._id);
      setMessages([]);
      setHasMore(false);
    } catch (err) {
      setMessageError(err.response?.data?.message || 'Could not delete conversation');
    }
  };

  const handleToggleBlock = async () => {
    if (!activeUser) return;
    const id = activeUser._id;
    if (blockedIds.has(id)) {
      await blockApi.unblock(id);
      setBlockedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      if (!window.confirm(`Block ${activeUser.username}? They won't be able to message or call you.`)) return;
      await blockApi.block(id);
      setBlockedIds((prev) => new Set(prev).add(id));
    }
  };

  const handleTogglePrivacy = async (value) => {
    setPrivacyBlockGroupAdd(value);
    await privacyApi.update(value).catch(() => {});
  };

  const handleTogglePin = useCallback(async (conversationKey) => {
    try {
      const { data } = await pinApi.toggle(conversationKey);
      setPinnedChats(data.pinnedChats);
    } catch (err) {
      // ignore
    }
  }, []);

  const handleNicknameSaved = (nickname) => {
    if (!activeUser) return;
    setFriends((prev) => prev.map((f) => (f._id === activeUser._id ? { ...f, nickname } : f)));
    setActiveConversation((prev) =>
      prev?.type === 'dm' ? { ...prev, user: { ...prev.user, nickname } } : prev
    );
  };

  // A status reply is really just a normal DM to the status owner, with a
  // snapshot of the status attached so the quote keeps working after the
  // status itself expires.
  const handleStatusReply = useCallback(
    (text, status, statusOwner) => {
      if (!socket) return;
      socket.emit(
        'send_message',
        { receiver: statusOwner.id || statusOwner._id, type: 'text', content: text, statusReplyTo: status._id },
        (result) => {
          if (result && !result.error) {
            setSummaries((prev) => ({
              ...prev,
              [statusOwner.id || statusOwner._id]: { lastMessage: result, unreadCount: 0 },
            }));
          }
        }
      );
    },
    [socket]
  );

  // Global search "Open chat" -> jump straight to that DM (used both for
  // regular friends and for results that happen to already be friends)
  const handleOpenChatFromSearch = useCallback(
    (u) => {
      setActiveConversation({ type: 'dm', user: u });
      setTab('chats');
    },
    []
  );

  // Jump to a specific message (from search results or starred list) - loads
  // a window of history centered on it and briefly highlights the bubble
  const handleJumpToMessage = useCallback(
    async (message) => {
      const senderId = message.sender?._id || message.sender;
      const receiverId = message.receiver?._id || message.receiver;
      const otherId = senderId === user.id ? receiverId : senderId;

      if (message.group) {
        const group = groups.find((g) => g._id === (message.group._id || message.group));
        if (group) setActiveConversation({ type: 'group', group });
      } else if (otherId) {
        const friend = friends.find((f) => f._id === otherId);
        if (friend) {
          setActiveConversation({ type: 'dm', user: friend });
          const { data } = await chatApi.messagesAround(otherId, message._id);
          setMessages(data.messages);
          setHasMore(data.hasMore);
        }
      }
      setTab('chats');
      setHighlightMessageId(message._id);
      setTimeout(() => setHighlightMessageId(null), 2500);
    },
    [friends, groups, user]
  );

  const conversations = useMemo(() => {
    const dmItems = friends.map((f) => {
      const summary = summaries[f._id];
      const key = `dm-${f._id}`;
      return {
        key,
        type: 'dm',
        raw: f,
        title: f.nickname || f.username,
        avatar: f.avatar,
        verified: f.verified,
        isOnline: onlineUsers?.includes(f._id),
        preview: summary?.lastMessage ? previewFor(summary.lastMessage) : 'Say hello 👋',
        unread: summary?.unreadCount || 0,
        lastActivity: summary?.lastMessage?.createdAt || null,
        isGroup: false,
        pinned: pinnedChats.includes(key),
      };
    });

    if (aiAssistant) {
      const key = `dm-${aiAssistant._id}`;
      dmItems.unshift({
        key,
        type: 'dm',
        raw: aiAssistant,
        title: aiAssistant.username === 'ai-assistant' ? 'AI Assistant' : aiAssistant.username,
        avatar: aiAssistant.avatar,
        verified: aiAssistant.verified,
        isOnline: true,
        preview: 'Ask me anything 🤖',
        unread: 0,
        lastActivity: null,
        isGroup: false,
        pinned: pinnedChats.includes(key),
      });
    }

    const groupItems = groups.map((g) => {
      const key = `group-${g._id}`;
      return {
        key,
        type: 'group',
        raw: g,
        title: g.name,
        avatar: g.avatar,
        isOnline: false,
        preview: g.lastMessage
          ? `${g.lastMessage.sender?.username ? g.lastMessage.sender.username + ': ' : ''}${previewFor(g.lastMessage)}`
          : 'No messages yet',
        unread: g.unreadCount || 0,
        lastActivity: g.lastMessage?.createdAt || g.createdAt,
        isGroup: true,
        pinned: pinnedChats.includes(key),
      };
    });

    const all = [...dmItems, ...groupItems].sort((a, b) => {
      if (!a.lastActivity) return 1;
      if (!b.lastActivity) return -1;
      return new Date(b.lastActivity) - new Date(a.lastActivity);
    });

    // Pinned chats float to the top, in pinnedChats order (most recently pinned first)
    const pinned = pinnedChats.map((key) => all.find((c) => c.key === key)).filter(Boolean);
    const rest = all.filter((c) => !c.pinned);
    return [...pinned, ...rest];
  }, [friends, groups, summaries, onlineUsers, aiAssistant, pinnedChats]);

  if (!lockChecked) return null;
  if (lockEnabled && !unlocked) return <PinLockScreen onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="h-[100dvh] flex overflow-hidden">
      <Sidebar
        tab={tab}
        onTabChange={setTab}
        conversations={conversations}
        activeKey={activeKey}
        onSelectConversation={(c) => {
          setActiveConversation(c.type === 'dm' ? { type: 'dm', user: c.raw } : { type: 'group', group: c.raw });
          setTab('chats');
        }}
        incomingCount={incoming.length}
        hiddenOnMobile={!!activeConversation}
        onAvatarClick={() => setShowAvatarModal(true)}
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
        friendsForGroupCreation={friends}
        onGroupCreated={() => loadGroups()}
        privacyBlockGroupAdd={privacyBlockGroupAdd}
        onTogglePrivacy={handleTogglePrivacy}
        onOpenChat={handleOpenChatFromSearch}
        onSendRequest={handleSendRequest}
        onJumpToMessage={handleJumpToMessage}
        onTogglePin={handleTogglePin}
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

      <main className={`flex-1 flex-col h-full min-w-0 relative ${activeConversation ? 'flex' : 'hidden sm:flex'}`}>
        <ChatHeader
          activeUser={activeUser}
          activeGroup={activeGroup}
          isOnline={onlineUsers?.includes(activeUser?._id)}
          onDeleteChat={handleDeleteChat}
          onBack={() => setActiveConversation(null)}
          isTyping={remoteTyping}
          onAudioCall={() => activeUser && startCall(activeUser, 'audio')}
          onVideoCall={() => activeUser && startCall(activeUser, 'video')}
          isBlocked={activeUser && blockedIds.has(activeUser._id)}
          onToggleBlock={handleToggleBlock}
          onOpenGroupInfo={() => setShowGroupInfo(true)}
          onRenameContact={() => setShowRenameContact(true)}
          onToggleSearch={() => setShowInChatSearch((v) => !v)}
          onOpenWallpaper={() => setShowWallpaperPicker(true)}
          onOpenAutoDelete={() => setShowAutoDelete(true)}
        />
        {showInChatSearch && activeConversation && (
          <InChatSearchBar
            conversationKey={activeConversation.type === 'dm' ? activeUser._id : `group_${activeGroup._id}`}
            onClose={() => setShowInChatSearch(false)}
            onJump={(m) => {
              setShowInChatSearch(false);
              handleJumpToMessage(m);
            }}
          />
        )}
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
          onEdit={handleEdit}
          onUnsend={handleUnsend}
          isGroup={!!activeGroup}
          memberCount={activeGroup?.members?.length}
          onVotePoll={handleVotePoll}
          onToggleStar={handleToggleStar}
          wallpaper={wallpaper}
          highlightMessageId={highlightMessageId}
        />
        <MessageComposer
          onSendText={handleSendText}
          onSendMedia={handleSendMedia}
          onSendPoll={handleSendPoll}
          onSendLocation={handleSendLocation}
          onTyping={handleTyping}
          disabled={!activeConversation || (activeUser && blockedIds.has(activeUser._id))}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          currentUserId={user?.id}
          friendUsername={activeUser?.username}
          conversationKey={activeKey}
          scheduleTarget={activeConversation}
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
          onReply={handleStatusReply}
        />
      )}
      {composingStatus && <StatusComposer onClose={() => setComposingStatus(false)} onPosted={loadStatusFeed} />}

      {showGroupInfo && activeGroup && (
        <GroupInfoModal
          group={activeGroup}
          friends={friends}
          onClose={() => setShowGroupInfo(false)}
          onUpdated={(updated) => {
            setActiveConversation({ type: 'group', group: updated });
            setGroups((prev) => prev.map((g) => (g._id === updated._id ? { ...g, ...updated } : g)));
          }}
          onLeft={() => {
            setShowGroupInfo(false);
            setActiveConversation(null);
            loadGroups();
          }}
        />
      )}

      {showRenameContact && activeUser && (
        <RenameContactModal
          friend={activeUser}
          onClose={() => setShowRenameContact(false)}
          onSaved={handleNicknameSaved}
        />
      )}

      {showWallpaperPicker && activeConversation && (
        <WallpaperPicker
          conversationKey={activeKey}
          onClose={() => setShowWallpaperPicker(false)}
          onChanged={setWallpaper}
        />
      )}

      {showAutoDelete && activeConversation && (
        <AutoDeleteModal
          target={activeConversation}
          currentSeconds={activeUser?.autoDeleteSeconds || activeGroup?.autoDeleteSeconds || 0}
          onClose={() => setShowAutoDelete(false)}
          onChanged={(seconds) => {
            if (activeConversation.type === 'dm') {
              setFriends((prev) => prev.map((f) => (f._id === activeUser._id ? { ...f, autoDeleteSeconds: seconds } : f)));
              setActiveConversation((prev) => ({ ...prev, user: { ...prev.user, autoDeleteSeconds: seconds } }));
            } else {
              setGroups((prev) => prev.map((g) => (g._id === activeGroup._id ? { ...g, autoDeleteSeconds: seconds } : g)));
              setActiveConversation((prev) => ({ ...prev, group: { ...prev.group, autoDeleteSeconds: seconds } }));
            }
          }}
        />
      )}
    </div>
  );
}
