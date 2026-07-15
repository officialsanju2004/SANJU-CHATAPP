import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import friendRoutes from './routes/friends.js';
import userRoutes from './routes/users.js';
import pushRoutes from './routes/push.js';
import lockRoutes from './routes/lock.js';

import statusRoutes from './routes/status.js';

import accountRoutes from './routes/account.js';
import blockRoutes from './routes/block.js';
import groupRoutes from './routes/groups.js';
import remindersRoutes from './routes/reminders.js';
import { initSocket } from './socket/index.js';
import scheduledRoutes from './routes/scheduled.js';

import { startScheduledMessageWorker } from './utils/scheduleMessageWorker.js';
import { startReminderScheduler } from './utils/reminderScheduler.js';
import { startRecoveryEmailReminder } from './utils/recoveryEmailReminder.js';

const app = express();
const httpServer = createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'||'http://localhost:5174';

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

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
app.use('/api/lock', lockRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/block', blockRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/scheduled', scheduledRoutes);
app.use('/api/reminders', remindersRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

initSocket(io);
startScheduledMessageWorker(io);
startReminderScheduler(io);
startRecoveryEmailReminder(io);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
