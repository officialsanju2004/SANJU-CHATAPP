# Sanju Chat

A full-featured, real-time WhatsApp-style chat app. React + Tailwind CSS on the front end,
Express + Socket.IO + MongoDB on the back end, media hosted on Cloudinary.

Live: https://sanju-chatapp.vercel.app/

## Structure

```
SANJU-CHATAPP/
  frontend/   React (Vite) + Tailwind CSS
  backend/    Express + Socket.IO + MongoDB (Mongoose)
```

## Backend setup

```
cd backend
cp .env.example .env      # then fill in the values below
npm install
npm run dev                # nodemon, or `npm start` for plain node
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string (local or Atlas) |
| `JWT_SECRET` | Yes | Signs auth tokens |
| `PORT` | No (default `5000`) | Server port |
| `CLIENT_URL` | No (default `http://localhost:5173`) | Allowed frontend origin for CORS |
| `CLOUDINARY_CLOUD_NAME` | Yes | Media hosting - avatars, chat images/videos/voice notes/documents, status posts |
| `CLOUDINARY_API_KEY` | Yes | " |
| `CLOUDINARY_API_SECRET` | Yes | " |
| `MESSAGE_ENCRYPTION_KEY` | Yes | Encrypts message content at rest |
| `VAPID_PUBLIC_KEY` | For push notifications | Web Push |
| `VAPID_PRIVATE_KEY` | For push notifications | Web Push |
| `VAPID_CONTACT_EMAIL` | For push notifications | Web Push contact |
| `GEMINI_API_KEY` | For the AI Assistant chat | Google Gemini |

Get free Cloudinary credentials at https://cloudinary.com.

### API

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | No | Create account, returns JWT |
| POST | `/api/auth/login` | No | Log in, returns JWT |
| GET | `/api/friends/search?q=` | Yes | Search users by username, tagged with relation status |
| POST | `/api/friends/request` | Yes | Send a friend request `{ username }` |
| GET | `/api/friends/requests/incoming` | Yes | Pending requests sent *to* me |
| GET | `/api/friends/requests/outgoing` | Yes | Pending requests I've sent |
| POST | `/api/friends/requests/:id/accept` | Yes | Accept a request → becomes a friendship |
| POST | `/api/friends/requests/:id/decline` | Yes | Decline / cancel a request |
| GET | `/api/friends` | Yes | My accepted friends (chat list), with avatar + lastSeen |
| PATCH | `/api/friends/:friendUserId/nickname` | Yes | Set a private nickname for a friend |
| PATCH | `/api/friends/:friendUserId/auto-delete` | Yes | Set disappearing-message timer for a 1-to-1 chat |
| GET | `/api/chat/messages/:otherUserId?before=&limit=` | Yes | Paginated 1-to-1 history (cursor-based) |
| GET | `/api/chat/group/:groupId/messages?before=&limit=` | Yes | Paginated group history |
| GET | `/api/chat/messages/:otherUserId/around/:messageId` | Yes | Load messages around a specific one (used by search "jump to") |
| GET | `/api/chat/summaries` | Yes | Last message + unread count per friend/group, for the sidebar |
| GET | `/api/chat/search?conversation=&q=` | Yes | Search within a conversation |
| POST | `/api/chat/messages/:messageId/star` | Yes | Star / unstar a message |
| GET | `/api/chat/starred` | Yes | All starred messages |
| POST | `/api/chat/upload` (multipart `media`) | Yes | Upload chat image/video/voice/document, returns `{ url, type, fileName, fileSize }` |
| POST | `/api/chat/messages/:messageId/view-once/open` | Yes | One-time reveal of a view-once photo |
| DELETE | `/api/chat/messages/:otherUserId` | Yes | Delete the conversation for both sides |
| POST | `/api/groups` | Yes | Create a group `{ name, memberIds }` |
| GET | `/api/groups` | Yes | My groups |
| GET | `/api/groups/:id` | Yes | Group details |
| POST | `/api/groups/:id/members` | Yes | Add a member (respects each user's privacy setting) |
| DELETE | `/api/groups/:id/members/:userId` | Yes | Remove a member |
| PATCH | `/api/groups/:id` | Yes | Rename a group |
| PATCH | `/api/groups/:id/auto-delete` | Yes | Set disappearing-message timer for a group |
| POST | `/api/block/:userId` | Yes | Block a user |
| DELETE | `/api/block/:userId` | Yes | Unblock a user |
| GET | `/api/block` | Yes | My blocked-users list |
| GET | `/api/block/status/:userId` | Yes | Whether I've blocked / am blocked by a user |
| GET | `/api/status/feed` | Yes | Status (stories) feed from friends |
| POST | `/api/status/image` (multipart `status`) | Yes | Post an image status |
| POST | `/api/status/video` (multipart `status`) | Yes | Post a short video status |
| POST | `/api/status/text` | Yes | Post a text status `{ caption, bgColor }` |
| POST | `/api/status/:id/view` | Yes | Mark a status as viewed |
| GET | `/api/status/:id/viewers` | Yes | Who has viewed my status |
| DELETE | `/api/status/:id` | Yes | Remove my status |
| POST | `/api/users/avatar` (multipart `avatar`) | Yes | Upload/replace profile picture |
| GET / PATCH | `/api/users/privacy` | Yes | Who can add me to a group |
| GET / PATCH | `/api/users/privacy/visibility` | Yes | Online/last-seen visibility |
| GET | `/api/users/ai-assistant` | Yes | Fetch the built-in AI Assistant contact |
| PATCH | `/api/users/pins` | Yes | Pin/unpin a chat `{ conversationKey }` |
| PATCH | `/api/users/theme` | Yes | Save theme preference |
| GET | `/api/users/verify/search` | Verifier only | Search users to grant/revoke a verified badge |
| POST/DELETE | `/api/users/:userId/verify` | Verifier only | Grant / revoke verified badge |
| POST | `/api/lock/set` \| `/verify` \| `/disable` \| `/change` | Yes | App-wide PIN lock |
| GET | `/api/lock/status` | Yes | Whether the PIN lock is enabled |
| POST | `/api/scheduled` | Yes | Schedule a message for later |
| GET | `/api/scheduled` | Yes | My scheduled messages |
| DELETE | `/api/scheduled/:id` | Yes | Cancel a scheduled message |
| POST | `/api/reminders` | Yes | Set a reminder on a message |
| GET | `/api/reminders` | Yes | My reminders |
| DELETE | `/api/reminders/:id` | Yes | Cancel a reminder |
| GET | `/api/push/vapid-public-key` | No | Public key for Web Push subscription |
| POST | `/api/push/subscribe` \| `/unsubscribe` | Yes | Manage Web Push subscription |
| DELETE | `/api/account/me` | Yes | Delete account permanently `{ password }` |

### Friend-request flow

Two users are never able to chat just because they both signed up:

1. User A searches for User B by username (`Add Friends` tab) and sends a request.
2. User B sees it in real time under `Friend requests` and can **Accept** or **Decline**.
3. Only after acceptance does User B show up in User A's `Chats` list (and vice versa).
4. Enforced at the socket layer too — `send_message` is rejected unless
   `Friendship.findBetween(sender, receiver)` is `accepted`, and history routes 403 for non-friends.
5. Friends can also be added by scanning each other's QR code (**Add Friends → Scan QR**), or by
   picking a QR code image from the gallery instead of using the live camera.

### Socket.IO events

| Event | Direction | Payload |
| --- | --- | --- |
| `send_message` | client → server | `{ receiver \| groupId, type, content, mediaUrl, duration, replyTo, viewOnce, statusReplyTo, poll }` → ack with the saved message, or `{ error }` |
| `receive_message` | server → client | Pushed to the receiver's open sockets |
| `edit_message` | client → server | `{ messageId, content }` |
| `unsend_message` | client → server | `{ messageId }` — deletes for everyone |
| `react_message` | client → server | `{ messageId, emoji }` — toggle an emoji reaction |
| `vote_poll` | client → server | `{ messageId, optionIndexes }` |
| `update_live_location` | client → server | `{ messageId, lat, lng }` — updates a live-location share |
| `typing` | both | `{ receiver \| groupId, isTyping }` — never persisted |
| `mark_seen` | client → server | `{ sender }` |
| `open_conversation` / `close_conversation` | client → server | Tracks which chat is actively open, for accurate seen/notification behaviour |
| `open_group_conversation` / `close_group_conversation` | client → server | Same, for groups |
| `online_users` | server → client | Broadcast array of online user ids |
| `user_last_seen` | server → client | `{ userId, lastSeen }`, broadcast the moment someone's last socket disconnects |
| `friend_request_received` / `friend_request_accepted` | server → client | Real-time friend-request updates |
| `chat_deleted` | server → client | `{ by }` — the other participant's open chat clears too |
| `call_user` / `call_answer` / `call_ice_candidate` / `call_reject` / `call_end` / `call_failed` | both | WebRTC audio/video call signalling |

## Frontend setup

```
cd frontend
cp .env.example .env
npm install
npm run dev
```

Visit `http://localhost:5173` — register two users in two browser windows/devices to test
real-time messaging. Your browser will ask for **notification permission** on first load, for
**microphone/camera permission** the first time you use calling or the QR scanner, and for
**location permission** if you share your location.

## Features

### Messaging
- Real-time 1-to-1 and **group chats**, with a per-user privacy setting controlling who's allowed
  to add you to a group.
- Message types: text, image, video, voice note, document/file (PDF, Word, Excel, PowerPoint, ZIP,
  TXT, CSV, RTF, JSON), poll, live/static location.
- **Edit** and **unsend** ("delete for everyone") sent messages.
- **Reply**, **star**, **emoji reactions**, and **in-chat + global search** (jump straight to the
  matching message).
- **View-once photos** — the receiver can open them exactly once; the URL is masked afterwards.
- **Disappearing messages** — configurable auto-delete timer per 1-to-1 chat or per group.
- **Scheduled messages** and **reminders** on any message.
- Infinite scroll — the last 30 messages load first, older ones fetch on scroll-up.
- Message content is encrypted at rest (`MESSAGE_ENCRYPTION_KEY`).

### Calling & presence
- WebRTC **audio and video calling**, with boosted bitrate and explicit audio constraints for
  clearer voice quality, and graceful fallback if screen sharing isn't supported on the device.
- Typing indicators, online status, and last-seen — with an 8-second reconnect grace period so a
  quick refresh or network blip never falsely shows "just now".
- Configurable **online/last-seen visibility** privacy.

### Social
- Friend requests (search by username, accept/decline, real-time updates).
- **QR code add** — show your own code or scan a friend's, either with the live camera or by
  picking a QR image from your gallery.
- **Status/Stories** — post an image, short video, or text status; see who's viewed yours.
- **Block / unblock** users.
- **Verified badge** system (admin-granted).
- A built-in **AI Assistant** contact (Gemini-powered) you can chat with like any other friend.

### Files & media
- Send images, videos, voice notes, and documents up to 75MB.
- Documents are uploaded as raw files (not run through image processing), so large multi-page
  scanned PDFs from a phone upload just as reliably as a small PDF from a laptop.
- Downloading a file fetches the exact original bytes and saves them with the correct filename and
  extension, so ZIPs, DOCX, XLSX, PPTX etc. always come out in the right format on both mobile and
  desktop — the device's OS then opens it with whichever app is installed (Word, Excel, a ZIP
  extractor, etc.).

### Account & personalization
- Custom **nicknames** for friends, **pinned chats**, **wallpapers**, and a **theme switcher**.
- App-wide **PIN lock** with a dedicated unlock screen.
- **Push notifications** (Web Push + Service Worker) that reach you even when the tab is fully
  closed, plus in-app notification banners while it's open in the background.
- Full **account deletion** flow.

## Theme

Colors are pulled from the app's logo: `#050403` near-black background, `#ff9500` core neon
orange, with a soft glow (`shadow-neon` utilities) on buttons, active states, and the logo mark.
Defined centrally in `frontend/tailwind.config.js` under the `void`, `surface`, `ember`, and `glow`
color tokens.

## Tech stack

- **Frontend:** React (Vite), Tailwind CSS, Socket.IO client, jsQR (QR scanning)
- **Backend:** Express, Socket.IO, MongoDB/Mongoose, Multer + Cloudinary (media storage),
  JWT auth, Web Push, Google Gemini (AI Assistant)
- **Deployment:** Vercel (frontend) — see `frontend/vercel.json`
