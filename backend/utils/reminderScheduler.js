import Reminder from '../models/Reminder.js';
import { emitToUser } from '../socket/index.js';
import { sendPushToUser } from './webpush.js';

export function startReminderScheduler(io) {
  setInterval(async () => {
    try {
      const reminders = await Reminder.find({
        sent: false,
        remindAt: { $lte: new Date() }
      }).populate('message');

      for (const reminder of reminders) {

        const message = reminder.message;

        const payload = {
          title: 'Reminder ⏰',
          body: reminder.note || message?.content || 'You have a reminder',
          messageId: message?._id
        };


        // realtime notification
        emitToUser(
          io,
          reminder.user,
          'reminder',
          payload
        );


        // browser push if offline
        sendPushToUser(
          reminder.user,
          {
            title: payload.title,
            body: payload.body,
            tag: `reminder-${reminder._id}`,
            url: '/'
          }
        ).catch(console.error);


        reminder.sent = true;
        await reminder.save();
      }

    } catch(err) {
      console.error("Reminder scheduler error:", err.message);
    }

  }, 30000); // every 30 seconds
}