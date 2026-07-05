import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';

// userId -> Set of socket ids (a user can have multiple tabs/devices open)
const onlineUsers = new Map();

function addSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
}

function removeSocket(userId, socketId) {
  const set = onlineUsers.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) onlineUsers.delete(userId);
}

export function initSocket(io) {
  // Authenticate every socket connection using the same JWT used for REST calls
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    addSocket(userId, socket.id);
    io.emit('online_users', Array.from(onlineUsers.keys()));

    socket.on('send_message', async ({ receiver, content }, callback) => {
      try {
        if (!receiver || !content?.trim()) {
          return callback?.(null);
        }

        const message = await Message.create({
          sender: userId,
          receiver,
          content: content.trim(),
        });

        // Send to every socket the receiver has open
        const receiverSockets = onlineUsers.get(receiver);
        if (receiverSockets) {
          receiverSockets.forEach((sid) => io.to(sid).emit('receive_message', message));
        }

        callback?.(message);
      } catch (err) {
        console.error('send_message error:', err.message);
        callback?.(null);
      }
    });

    socket.on('disconnect', () => {
      removeSocket(userId, socket.id);
      io.emit('online_users', Array.from(onlineUsers.keys()));
    });
  });
}
