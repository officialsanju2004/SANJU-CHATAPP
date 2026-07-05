import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ChatHeader from '../components/ChatHeader.jsx';
import { MessageList, MessageComposer } from '../components/MessageBox.jsx';

export default function Chat() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);

  // Load all other users once
  useEffect(() => {
    api.get('/chat/users').then(({ data }) => setUsers(data));
  }, []);

  // Load conversation history when active user changes
  useEffect(() => {
    if (!activeUser) return;
    api.get(`/chat/messages/${activeUser._id}`).then(({ data }) => setMessages(data));
  }, [activeUser]);

  // Listen for incoming real-time messages
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

  const sendMessage = useCallback(
    (content) => {
      if (!activeUser || !socket) return;
      socket.emit('send_message', { receiver: activeUser._id, content }, (saved) => {
        if (saved) setMessages((prev) => [...prev, saved]);
      });
    },
    [activeUser, socket]
  );

  return (
    <div className="h-screen flex">
      <Sidebar
        users={users}
        activeUser={activeUser}
        onSelectUser={setActiveUser}
        onlineUserIds={onlineUsers}
      />
      <main className="flex-1 flex flex-col h-full min-w-0">
        <ChatHeader activeUser={activeUser} isOnline={onlineUsers?.includes(activeUser?._id)} />
        <MessageList messages={messages} currentUserId={user?.id} />
        <MessageComposer onSend={sendMessage} disabled={!activeUser} />
      </main>
    </div>
  );
}
