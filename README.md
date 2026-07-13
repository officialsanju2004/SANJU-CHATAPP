# Sanju Chat

A full-featured real-time chat app themed on a black + neon-orange logo — think WhatsApp, built from
scratch. React + Tailwind on the front end, Express + Socket.io + MongoDB on the back end, with
Cloudinary for media, Web Push for notifications, and a built-in Gemini-powered AI Assistant.

## Structure

```
chat-app/
  frontend/   React (Vite) + Tailwind CSS, installable PWA
  backend/    Express + Socket.io + MongoDB (Mongoose)
```

## Feature overview

- **1:1 chat** with a mandatory friend-request flow (see below)
- **Group chats** with admin/member roles, add/remove members, rename, per-group auto-delete
- **Messages**: text, image, video, voice notes, polls, live/static location sharing
- **Message actions**: reply-to, edit (text only), unsend/delete-for-everyone, delete-for-me,
  star/favourite, emoji reactions (👍 ❤️ 😂 😮 😢 🙏), view-once photos
- **Read receipts** — per-message `seen` for DMs, per-member `seenBy` for groups; instant "seen" if
  the other side already has the chat open, live typing indicator
- **Status / Stories** — image, video, or coloured-text statuses that auto-expire after 24h (Mongo
  TTL index), with view tracking and a viewers list, plus replying to a status as a message
- **Voice & video calls** — WebRTC signaling over Socket.io (offer/answer/ICE/reject/end), blocked
  automatically between blocked users, sends a "missed call" push if the callee is offline
- **Search** — in-conversation full-text search plus jump-to-message (loads a window of messages
  centered on a search hit), and a global search modal
- **Scheduled messages** — queue a text/image/video to send at a future time; a background worker
  sends it and marks it `sent`
- **Reminders** — snooze any message with a note + future date; a background scheduler pushes it
  back to you when it's due
- **Chat lock** — a 4–6 digit PIN (bcrypt-hashed) that locks the whole app, independent of the
  account password
- **Block / unblock** — mutual block cuts off messaging and calls in both directions
- **Privacy controls** — hide online status (or show only to selected people), last-seen visibility
  (everyone / nobody / selected), and an "block being added to groups" toggle
- **Contact nicknames** — a private name you set for a friend, like saving a phone contact; never
  visible to them
- **Pinned chats**, **5 colour themes** (ember/blue/green/purple/AMOLED), **wallpaper picker**
- **Verified badge** — an orange tick grantable only by the `@sanju` account
- **QR codes** — share/scan a QR code to add a friend (`qrcode` + `jsqr`)
- **Built-in AI Assistant** — a reserved bot contact (auto-created on first request) that skips the
  friendship requirement and replies using Gemini, with a live typing indicator while it "thinks"
- **Account deletion** — wipes messages, friendships, statuses, push subscriptions, blocks, and
  group memberships in one transaction-like `Promise.all`
- **Web Push notifications** with VAPID, installable **PWA** (service worker, offline shell)
- **Cloudinary-backed uploads** for avatars, chat media, and statuses — chosen specifically because
  most free hosts wipe local disk on every deploy/restart

## Backend setup

```bash
cd backend
cp .env.example .env      # then fill in the variables below
npm install
npm run dev                # nodemon, or `npm start` for plain node
```

### Environment variables (`backend/.env`)

| Variable | Required | Notes |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string (local or Atlas) |
| `JWT_SECRET` | Yes | Signs auth tokens, 7-day expiry |
| `CLIENT_URL` | Yes | Frontend origin, used for CORS |
| `PORT` | No | Defaults to `5000` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | For uploads | Avatars, chat media, and statuses all go through Cloudinary; without these, uploads fail (server logs a warning, doesn't crash) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_CONTACT_EMAIL` | For push | Generate with `npx web-push generate-vapid-keys`; without these, push is silently skipped |
| `GEMINI_API_KEY` | For AI Assistant | Powers the built-in bot's replies (Gemini 3 Flash preview) |

Uploaded avatars/chat media/statuses are stored on Cloudinary, not the local disk — this is
intentional so files survive redeploys on ephemeral-filesystem hosts (Render, Railway, Vercel, etc.).

### REST API

| Method | Route | Auth | Description |
|---|---|---|---|
| **Auth** |
| POST | `/api/auth/register` | No | Create account, returns JWT |
| POST | `/api/auth/login` | No | Log in, returns JWT |
| **Friends** |
| GET | `/api/friends/search?q=` | Yes | Search users by username, tagged with relation status |
| POST | `/api/friends/request` | Yes | Send a friend request `{ username }` |
| GET | `/api/friends/requests/incoming` | Yes | Pending requests sent *to* me |
| GET | `/api/friends/requests/outgoing` | Yes | Pending requests I've sent |
| POST | `/api/friends/requests/:id/accept` | Yes | Accept a request → becomes a friendship |
| POST | `/api/friends/requests/:id/decline` | Yes | Decline / cancel a request |
| GET | `/api/friends` | Yes | My accepted friends, with avatar + lastSeen + nickname |
| PATCH | `/api/friends/:friendUserId/nickname` | Yes | Set a private nickname for a friend |
| PATCH | `/api/friends/:friendUserId/auto-delete` | Yes | Set disappearing-messages timer (seconds, 0 = off) |
| **Chat** |
| GET | `/api/chat/messages/:otherUserId?before=&limit=` | Yes | Paginated DM history (cursor-based, oldest-first) |
| GET | `/api/chat/group/:groupId/messages?before=&limit=` | Yes | Paginated group message history |
| GET | `/api/chat/summaries` | Yes | Last message + unread count per friend, for chat-list previews |
| GET | `/api/chat/search?conversation=&q=` | Yes | Full-text search within a DM or group (`group_<id>`) |
| GET | `/api/chat/messages/:otherUserId/around/:messageId` | Yes | Jump-to-message: a window centered on a hit |
| POST | `/api/chat/messages/:messageId/star` | Yes | Toggle star (per-user, private) |
| GET | `/api/chat/starred` | Yes | All my starred messages across every conversation |
| POST | `/api/chat/upload` (multipart `media`) | Yes | Upload a chat image/video/voice note → `{ url, type }` |
| POST | `/api/chat/messages/:messageId/view-once/open` | Yes | One-time reveal of a view-once photo |
| DELETE | `/api/chat/messages/:otherUserId` | Yes | Delete a conversation for me only |
| **Groups** |
| POST | `/api/groups` | Yes | Create a group `{ name, memberIds[] }`, creator becomes admin |
| GET | `/api/groups` | Yes | My groups, with chat-list preview |
| GET | `/api/groups/:id` | Yes | Group details (members list) |
| POST | `/api/groups/:id/members` | Yes | Add a member (admin only) |
| DELETE | `/api/groups/:id/members/:userId` | Yes | Remove member (admin) or leave (self) |
| PATCH | `/api/groups/:id` | Yes | Rename group (admin only) |
| PATCH | `/api/groups/:id/auto-delete` | Yes | Set group's disappearing-messages timer (admin only) |
| **Status** |
| POST | `/api/status/image` \| `/video` (multipart `status`) | Yes | Post a photo/video status |
| POST | `/api/status/text` | Yes | Post a coloured-text status `{ caption, bgColor }` |
| GET | `/api/status/feed` | Yes | Friends with active statuses, grouped, with unseen flag |
| POST | `/api/status/:id/view` | Yes | Mark a status as seen |
| GET | `/api/status/:id/viewers` | Yes | Who viewed my status, and when (owner only) |
| DELETE | `/api/status/:id` | Yes | Remove my own status early |
| **Block** |
| POST | `/api/block/:userId` | Yes | Block a user |
| DELETE | `/api/block/:userId` | Yes | Unblock |
| GET | `/api/block` | Yes | People I've blocked |
| GET | `/api/block/status/:userId` | Yes | `{ blockedByMe, blockedByThem }` |
| **Chat lock** |
| GET | `/api/lock/status` | Yes | `{ enabled, pinLength }` |
| POST | `/api/lock/set` | Yes | Turn the PIN lock on `{ pin }` (4–6 digits) |
| POST | `/api/lock/verify` | Yes | Check a PIN on app unlock |
| POST | `/api/lock/disable` | Yes | Turn it off (requires current PIN) |
| POST | `/api/lock/change` | Yes | Change PIN `{ currentPin, newPin }` |
| **Reminders & Scheduled** |
| POST | `/api/reminders` | Yes | Remind me about a message `{ messageId, remindAt, note }` |
| GET | `/api/reminders` | Yes | My upcoming reminders |
| DELETE | `/api/reminders/:id` | Yes | Cancel a reminder |
| POST | `/api/scheduled` | Yes | Queue a future message `{ receiver\|groupId, type, content, scheduledFor }` |
| GET | `/api/scheduled` | Yes | My pending scheduled messages |
| DELETE | `/api/scheduled/:id` | Yes | Cancel before it sends |
| **Users / profile / privacy** |
| POST | `/api/users/avatar` (multipart `avatar`) | Yes | Upload/replace profile picture |
| GET / PATCH | `/api/users/privacy` | Yes | `blockGroupAdd` toggle |
| GET / PATCH | `/api/users/privacy/visibility` | Yes | Online-status & last-seen visibility rules |
| PATCH | `/api/users/pins` | Yes | Toggle a pinned chat `{ conversationKey }` |
| PATCH | `/api/users/theme` | Yes | Set colour theme |
| GET | `/api/users/ai-assistant` | Yes | The built-in AI bot's public profile (auto-creates it) |
| GET | `/api/users/verify/search?q=` | Yes (verifier only) | Search anyone to grant/revoke a verified badge |
| POST / DELETE | `/api/users/:userId/verify` | Yes (verifier only) | Grant / revoke the verified badge — only the `@sanju` account can do this |
| **Account** |
| DELETE | `/api/account/me` | Yes | Permanently delete my account and all associated data `{ password }` |

### Friend-request flow

Two users are never able to chat just because they both signed up. Every new
account only sees **its own friends and its own pending requests**:

1. User A searches for User B by username (`Add Friends` tab) and sends a request.
2. User B sees it appear in real time under `Friend requests` and can **Accept** or **Decline**.
3. Only after acceptance does User B show up in User A's `Chats` list (and vice versa).
4. Enforced at the socket layer too — `send_message` is rejected unless
   `Friendship.findBetween(sender, receiver)` is `accepted`, and `GET /api/chat/messages/:id`
   returns 403 for non-friends. A modified client still can't message someone who hasn't accepted.
5. A third user (User C) starts with an empty friends list — they only ever see who *they* add.
6. **Exception:** the built-in AI Assistant bypasses this entirely — messaging it auto-creates an
   accepted `Friendship` behind the scenes so features like nicknames/auto-delete still work.

### Socket.io events

**Messaging**
- `send_message` `{ receiver | groupId, type, content, mediaUrl, duration, replyTo, viewOnce, statusReplyTo, poll, location }` → ack callback with the saved message, or `{ error }`
- `receive_message` → pushed to the recipient(s)
- `edit_message` / `message_edited` — text-only, sender-only
- `unsend_message` / `message_unsent` — "delete for everyone", scrubs content for all viewers
- `react_message` / `message_reacted` — one reaction per user per message, toggles off on repeat
- `vote_poll` / `poll_updated`
- `update_live_location` / `location_updated`

**Presence & read state**
- `typing` in/out (DM or group via `groupId`) — relayed only, never persisted
- `online_users` — personalized broadcast (respects `hideOnlineStatus`/`onlineVisibleTo`)
- `user_last_seen` `{ userId, lastSeen }` — respects `lastSeenVisibility`
- `open_conversation` / `close_conversation`, `open_group_conversation` / `close_group_conversation` — instant "seen" while a chat window is open
- `mark_seen`, `messages_seen`, `group_messages_seen`

**Friends & groups**
- `friend_request_received`, `friend_request_accepted`
- `added_to_group`, `removed_from_group`

**Calls (WebRTC signaling)**
- `call_user` `{ to, offer, callType }` → `incoming_call`, blocked for blocked users, sends a missed-call push if offline
- `call_answer` / `call_answered`, `call_ice_candidate`, `call_reject` / `call_rejected`, `call_end` / `call_ended`, `call_failed`

**Status**
- `new_status`, `status_viewed`

**Other**
- `chat_deleted` `{ by }`, `view_once_opened`, `verification_changed`

## Frontend setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Environment variables (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend REST base, e.g. `http://localhost:5000/api` |
| `VITE_SOCKET_URL` | Backend Socket.io origin, e.g. `http://localhost:5000` |

Visit http://localhost:5173 — register two users in two browser windows to test real-time messaging.
Your browser will ask for **notification permission** (via an in-app "Enable" banner, not
automatically) and for **microphone/camera permission** the first time you record a voice note or
start a call.

### Key frontend pieces

- **Pages**: `Login`, `Register`, `Chat` (the whole app shell lives here)
- **Notable components**: `Sidebar`, `ChatHeader`, `MessageBox`, `MessageOptionsMenu`,
  `EmojiReactionPicker`, `PollBubble` / `PollComposerModal`, `LocationBubble` / `LocationShareModal`,
  `CallModal`, `StatusRing` / `StatusRow` / `StatusViewer` / `StatusComposer`, `CreateGroupModal` /
  `GroupInfoModal`, `PinLockScreen` / `ChatLockSettings`, `BlockedUsersModal`,
  `PrivacyVisibilityModal`, `QRCodeModal` / `QRScannerModal`, `ReminderModal`,
  `ScheduleMessageModal` / `ScheduledMessagesList`, `StarredMessagesModal`, `GlobalSearchModal` /
  `InChatSearchBar`, `RenameContactModal`, `AutoDeleteModal`, `ThemeSwitcher`, `WallpaperPicker`,
  `VerifiedBadge` / `VerifyUsersModal`, `DeleteAccountModal`, `NotificationBanner`

## Theme

Colors are pulled straight from the logo: `#050403` near-black background, `#ff9500` core neon
orange, with a soft glow (`shadow-neon` utilities) used on buttons, active states, and the logo
mark. Defined centrally in `frontend/tailwind.config.js` under the `void`, `surface`, `ember`, and
`glow` color tokens. Four alternate themes (blue/green/purple/AMOLED) are switchable per-user and
persisted via `PATCH /api/users/theme`.

## Architecture notes worth knowing

- **Pagination & performance** — messages are paginated (~30 at a time) via a
  `{conversationId, createdAt}` compound index instead of an `$or` scan across both directions.
- **Presence grace period** — disconnects (refresh, dev restarts, brief network blips) don't
  immediately flip someone offline; there's an 8-second grace window before `lastSeen` is stamped
  and broadcast, so quick reconnects don't flash everyone's status.
- **Ephemeral filesystem safety** — all uploads go to Cloudinary, never local disk, so avatars/media
  survive redeploys on hosts like Render/Railway/Vercel that wipe disk on restart.
- **View-once photos** — the URL is only ever returned once to the receiver
  (`POST /messages/:id/view-once/open`); every subsequent fetch masks it server-side, regardless of
  what the client does.
- **Unsend vs delete-for-me** — unsend (`deletedForEveryone`) scrubs content for *everyone* including
  the sender but keeps the document alive (so replies/reactions pointing at it don't break); delete
  is per-viewer (`deletedFor` array) and doesn't touch the other side's copy.
- **Status TTL** — statuses use a MongoDB TTL index (`expiresAt`) to auto-delete after 24h; no cron
  job needed.
- **AI Assistant** — a real `User` document (`isBot: true`) auto-created on first lookup, so it can
  be messaged, shown in chat lists, etc. like any other contact, but bypasses the friend-request
  requirement.

## Next steps (not built yet, ask if you want them)

- Message search across *all* conversations at once (currently per-conversation only)
- Password reset flow
- Image/video compression before upload (currently uploads the original file)
- Group message reactions/read-receipt avatars in the UI polish pass
- Push notification grouping/summarization for busy group chats
