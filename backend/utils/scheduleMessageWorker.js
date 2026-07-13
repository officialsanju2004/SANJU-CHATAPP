import Message from '../models/Message.js';
import ScheduledMessage from '../models/ScheduledMessage.js';

import { emitToUser } from '../socket/index.js';

export function startScheduledMessageWorker(io) {
  setInterval(async () => {
    try {
      const now = new Date();

      const messages = await ScheduledMessage.find({
        sent: false,
        cancelled: false,
        scheduledFor: { $lte: now },
      });

      for (const item of messages) {
        let conversationId;

        if (item.group) {
          conversationId = `group_${item.group}`;
        } else {
          conversationId = Message.conversationIdFor(
            item.sender,
            item.receiver
          );
        }

        const message = await Message.create({
          sender: item.sender,
          receiver: item.receiver,
          group: item.group,
          conversationId,
          type: item.type,
          content: item.content,
          mediaUrl: item.mediaUrl,
        });

        item.sent = true;
        await item.save();

        if (item.receiver) {
          emitToUser(io, item.receiver, "receive_message", message);
          emitToUser(io, item.sender, "receive_message", message);
        }
      }
    } catch (err) {
      console.error("Scheduled worker:", err);
    }
  }, 5000); // har 5 second check karega
}