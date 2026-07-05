# Ember Chat

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

Make sure MongoDB is running locally (or point `MONGO_URI` to Atlas).

### API

| Method | Route                          | Auth | Description                      |
|--------|---------------------------------|------|-----------------------------------|
| POST   | /api/auth/register              | No   | Create account, returns JWT       |
| POST   | /api/auth/login                 | No   | Log in, returns JWT                |
| GET    | /api/chat/users                 | Yes  | List all other users               |
| GET    | /api/chat/messages/:otherUserId | Yes  | Conversation history with a user   |

### Socket.io events

- `send_message` `{ receiver, content }` -> ack callback with the saved message
- `receive_message` -> pushed to the receiver's open sockets
- `online_users` -> broadcast array of online user ids

## Frontend setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Visit http://localhost:5173 — register two users in two browser windows to test real-time messaging.

## Theme

Colors are pulled straight from the logo: `#050403` near-black background, `#ff9500` core neon orange, with a soft glow (`shadow-neon` utilities) used on buttons, active states, and the logo mark itself. Defined centrally in `frontend/tailwind.config.js` under the `void`, `surface`, `ember`, and `glow` color tokens.

## Next steps (not built yet, ask if you want them)

- Group chats / channels
- Typing indicators & read receipts
- Message search, file/image attachments
- Password reset flow
