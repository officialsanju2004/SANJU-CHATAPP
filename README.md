# Sanju Chat

A real-time 1-to-1 chat app themed on the black + neon-orange logo. React + Tailwind on the front end, Express + Socket.io + MongoDB on the back end.

## Structure

```
chat-app/
  frontend/   React (Vite) + Tailwind CSS
  backend/    Express + Socket.io + MongoDB (Mongoose)
```

## Backend setup

```bash
cd backend
cp .env.example .env      # then fill in MONGO_URI and JWT_SECRET
npm install
npm run dev                # nodemon, or `npm start` for plain node
```

Make sure MongoDB is running locally (or point `MONGO_URI` to Atlas). Uploaded avatars/images/voice
notes are saved to `backend/uploads/` and served statically at `/uploads/...` — this folder is
created automatically on first run.

### API

| Method | Route                              | Auth | Description                                                |
|--------|--------------------------------------|------|--------------------------------------------------------------|
| POST   | /api/auth/register                  | No   | Create account, returns JWT                                   |
| POST   | /api/auth/login                     | No   | Log in, returns JWT                                            |
| GET    | /api/friends/search?q=              | Yes  | Search users by username, tagged with relation status        |
| POST   | /api/friends/request                | Yes  | Send a friend request `{ username }`                           |
| GET    | /api/friends/requests/incoming      | Yes  | Pending requests sent *to* me                                  |
| GET    | /api/friends/requests/outgoing      | Yes  | Pending requests I've sent, awaiting a reply                   |
| POST   | /api/friends/requests/:id/accept    | Yes  | Accept a request -> becomes a friendship                        |
| POST   | /api/friends/requests/:id/decline   | Yes  | Decline / cancel a request                                      |
| GET    | /api/friends                        | Yes  | My accepted friends (the chat list), with avatar + lastSeen     |
| GET    | /api/chat/messages/:id?before=&limit=| Yes | Paginated conversation history (cursor-based, newest-first internally, returned oldest-first) |
| DELETE | /api/chat/messages/:otherUserId     | Yes  | Permanently delete the conversation for both sides              |
| POST   | /api/chat/upload (multipart `media`)| Yes  | Upload a chat image or voice note, returns `{ url, type }`       |
| POST   | /api/users/avatar (multipart `avatar`)| Yes | Upload/replace your profile picture, returns `{ avatar }`        |

### Friend-request flow

Two users are never able to chat just because they both signed up. Every new
account only sees **its own friends and its own pending requests**:

1. User A searches for User B by username (`Add Friends` tab) and sends a request.
2. User B sees it appear in real time under `Friend requests` and can **Accept** or **Decline**.
3. Only after acceptance does User B show up in User A's `Chats` list (and vice versa).
4. The backend also enforces this at the socket layer — `send_message` is rejected
   with an error unless `Friendship.findBetween(sender, receiver)` is `accepted`, and
   `GET /api/chat/messages/:id` returns 403 for non-friends. So even a modified
   client can't message someone who hasn't accepted.
5. When a third user (User C) registers, they start with an empty friends list and
   an empty request list — they only see whoever *they* add and accept, never A's or B's chats.

### Socket.io events

- `send_message` `{ receiver, type, content, mediaUrl, duration }` -> ack callback with the saved message, or `{ error }`
- `receive_message` -> pushed to the receiver's open sockets
- `typing` `{ receiver, isTyping }` in / `{ from, isTyping }` out -> live typing indicator, never persisted
- `online_users` -> broadcast array of online user ids
- `user_last_seen` `{ userId, lastSeen }` -> broadcast the moment someone's last socket disconnects
- `friend_request_received` -> pushed to the recipient the moment a request is sent
- `friend_request_accepted` -> pushed to the original requester once accepted
- `chat_deleted` `{ by }` -> pushed to the other participant so their open chat clears too

## Frontend setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Visit http://localhost:5173 — register two users in two browser windows to test real-time messaging.
Your browser will ask for **notification permission** on first load, and for **microphone
permission** the first time you hold the mic button to record a voice note — allow both to use
those features.

## What's new in this version

- **Fixed: last seen flashing "just now" for everyone** — disconnects (page refresh, a dev
  backend restart, brief network blips) used to stamp `lastSeen` immediately, so a quick reconnect
  looked identical to someone actually closing the app. There's now an 8-second grace period: if
  the user reconnects within that window, nothing is stamped or broadcast at all. Only a genuine
  "closed the app" disconnect updates `lastSeen`. React StrictMode (which double-fires effects in
  dev, causing spurious connect/disconnect pairs) has also been removed from `main.jsx` since it
  was contributing to the same symptom.
- **Fixed: notifications never appearing** — permission was being requested automatically on page
  load, which several browsers (Safari, and increasingly Chrome/Firefox) silently ignore unless
  it's triggered by a real user click. There's now a small banner ("Turn on notifications…") with
  an **Enable** button — clicking it reliably triggers the browser's permission prompt. Remember:
  even with permission granted, notifications only fire while the tab/app is open in the
  background — if someone has fully closed the tab, no notification can reach them (that requires
  Web Push + a Service Worker, which isn't built yet - ask if you want it added).
- **Profile pictures** — tap your own avatar (top-left of the sidebar) to upload/replace it.
- **Images in chat** — the 🖼 button next to the composer uploads and sends a photo.
- **Voice notes** — hold the mic button to record, release to send; tap the play button on a
  received voice note to listen. Recording uses the browser's `MediaRecorder` API.
- **Notifications** — when a message arrives and the tab isn't focused, you get a real browser
  notification with the sender's name and a preview (`📷 Photo` / `🎤 Voice message` for media).
- **Infinite scroll** — conversations load the most recent 30 messages first; scrolling to the top
  fetches the previous 30 automatically, so opening a long-running chat is instant instead of
  loading the whole history at once.
- **Last seen** — shown under a friend's name when they're offline, and kept live via the
  `user_last_seen` socket event.
- **Typing indicator** — a small animated "Typing…" replaces the online/offline text while the
  other person is composing a reply.
- **Mobile-first UI** — on narrow screens the sidebar and the open conversation are two separate
  full-width views (like WhatsApp), with a back button in the chat header; text and tap targets
  are sized up on mobile so nothing feels cramped.
- **Performance** — messages are now paginated (never load more than ~30 at a time) and looked up
  via a single indexed `conversationId` field (`{conversationId, createdAt}` compound index)
  instead of an `$or` scan across both message directions — this is the main fix for the slowness
  you were seeing as conversations grew.

## Theme

Colors are pulled straight from the logo: `#050403` near-black background, `#ff9500` core neon orange, with a soft glow (`shadow-neon` utilities) used on buttons, active states, and the logo mark itself. Defined centrally in `frontend/tailwind.config.js` under the `void`, `surface`, `ember`, and `glow` color tokens.

## Next steps (not built yet, ask if you want them)

- Remove friend / block user
- Group chats / channels
- Read receipts (currently only a static "sent" checkmark, no real read state)
- Message search
- Password reset flow
- Delete for me only (currently delete clears the chat for both sides)
- Image compression before upload (currently uploads the original file, up to 15MB)
