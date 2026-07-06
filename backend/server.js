import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import friendRoutes from './routes/friends.js';
import userRoutes from './routes/users.js';
import pushRoutes from './routes/push.js';
import { initSocket } from './socket/index.js';

const app = express();
const httpServer = createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// Serve uploaded avatars/images/voice notes as static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
  maxHttpBufferSize: 2 * 1e6, // generous enough for typing/ack payloads only; media goes via REST upload
});

// Make io available inside REST route handlers (e.g. to push a live
// notification when a friend request is sent or accepted)
app.locals.io = io;

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/users', userRoutes);
app.use('/api/push', pushRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

initSocket(io);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
