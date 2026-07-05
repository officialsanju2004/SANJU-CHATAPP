import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import Friendship from '../models/Friendship.js';

// userId -> Set of socket ids (a user can have multiple tabs/devices open)
export const onlineUsers = new Map();

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

// Emit an event to every open socket/tab a given user has, if they're online
export function emitToUser(io, userId, event, payload) {
  const sockets = onlineUsers.get(String(userId));
  if (!sockets) return;
  sockets.forEach((sid) => io.to(sid).emit(event, payload));
}

export function initSocket(io) {
  // Authenticate every socket connection using the same JWT used for REST calls
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = String(decoded.id);
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

        // Only accepted friends can exchange messages
        const relation = await Friendship.findBetween(userId, receiver);
        if (!relation || relation.status !== 'accepted') {
          return callback?.({ error: 'You must be friends to message this user' });
        }

        const message = await Message.create({
          sender: userId,
          receiver,
          content: content.trim(),
        });

        emitToUser(io, receiver, 'receive_message', message);
        callback?.(message);
      } catch (err) {
        console.error('send_message error:', err.message);
        callback?.({ error: 'Message could not be sent' });
      }
    });

    socket.on('disconnect', () => {
      removeSocket(userId, socket.id);
      io.emit('online_users', Array.from(onlineUsers.keys()));
    });
  });
}
