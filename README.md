<div align="center">
  <img src="client/public/pulsechat-icon.svg" width="104" alt="PulseChat logo" />
  <h1>PulseChat</h1>
  <p><strong>Conversations that keep life in sync.</strong></p>
  <p>A polished real-time communication platform built with the MERN stack and Socket.IO.</p>

  <p>
    <img alt="MERN" src="https://img.shields.io/badge/Stack-MERN-18a876?style=flat-square" />
    <img alt="Socket.IO" src="https://img.shields.io/badge/Realtime-Socket.IO-6557e8?style=flat-square" />
    <img alt="Vite" src="https://img.shields.io/badge/Frontend-Vite-8b5cf6?style=flat-square" />
    <img alt="Responsive" src="https://img.shields.io/badge/UI-Fully_Responsive-21a7e8?style=flat-square" />
  </p>
</div>

---

## Why PulseChat?

PulseChat brings messaging, focused work, file sharing, lightweight planning, live information, and privacy controls into one inviting experience. It is a portfolio-ready full-stack application with genuine real-time behavior—not a static chat mockup.

## Highlights

### Real-time communication

- Instant one-to-one messaging with Socket.IO
- Online presence, typing indicators, and last-seen timestamps
- Browser notifications, in-app notification toasts, and unread counters
- Emoji picker and responsive message composer
- Scheduled messages for time-based communication

### Friends and privacy

- JWT-based registration and login
- Private usernames instead of exposing email addresses
- Screened friend requests with Accept and Decline controls
- Phone numbers visible only inside accepted-friend conversations
- Per-chat stealth mode for typing privacy
- Separate Personal and Work inbox spaces

### Files, calls, and productivity

- Authenticated attachment uploads up to **5 GB**
- Downloadable file cards with filename and size
- Device calling through a saved international phone number
- Assignable task messages that can be marked complete
- Live Current Affairs desk with one-minute automatic refresh

### Interface

- Custom PulseChat identity and scalable SVG app icon
- Modern glass surfaces, gradients, animations, and conversation wallpaper
- Responsive layouts for phones, tablets, laptops, desktops, and landscape screens
- Safe-area support and reduced-motion accessibility

## Tech stack

| Layer | Technology |
|---|---|
| Client | React, Vite, Socket.IO Client, Lucide React |
| API | Node.js, Express |
| Realtime | Socket.IO |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Tokens, bcrypt |
| Uploads | Multer |
| Live feed | Google News RSS |

## Architecture

```text
Browser (React + Vite)
   ├── REST API ───────────────┐
   └── Socket.IO connection ───┤
                               ▼
                     Express + Socket.IO
                       ├── JWT security
                       ├── Upload service
                       ├── Live news feed
                       └── Mongoose models
                               │
                               ▼
                            MongoDB
```

## Quick start

### Prerequisites

- Node.js 20 or newer
- npm
- MongoDB locally, or a MongoDB Atlas connection string

### Installation

```bash
git clone https://github.com/SRIHARSHA2108/PulseChat.git
cd PulseChat
npm install
```

Copy and configure the server environment:

```bash
cp server/.env.example server/.env
```

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/pulsechat
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
```

For a live MongoDB Atlas database, use this format in your private `server/.env`:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-host>/pulsechat?retryWrites=true&w=majority
```

> [!IMPORTANT]
> Never commit a real database username or password. PulseChat ignores `server/.env`; only the safe `.env.example` template is published.

Start the client and server together:

```bash
npm run dev
```

Open **http://localhost:5173**. Register a second account in an incognito window to test the real-time experience.

## Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the React and Express development servers |
| `npm run build` | Create the production client bundle |
| `npm start` | Start the production API server |

## Project structure

```text
PulseChat/
├── client/
│   ├── public/             # Logo and chat wallpaper
│   └── src/                # React interface and styles
├── server/
│   ├── src/models/         # MongoDB schemas
│   ├── src/routes/         # Auth, chat, friends, files, and news APIs
│   ├── src/socket.js       # Real-time presence and messaging
│   └── uploads/            # Local development uploads
├── package.json            # Workspace scripts
└── README.md
```

## Test the experience

1. Register the first user in a normal browser window.
2. Register another user in an incognito/private window.
3. Send and accept a friend request.
4. Test messages, emojis, files, typing state, last seen, tasks, scheduled delivery, and notifications.
5. Add phone numbers from the profile card to enable the device-call button.

## Production notes

Uploads are stored locally during development. Before public deployment, move them to Amazon S3, Cloudflare R2, Supabase Storage, or another object-storage service. A production release should also add secure refresh-token cookies, rate limiting, content scanning, message pagination, automated tests, HTTPS, and a durable scheduled-job queue.

## Roadmap

- Group conversations and threaded topic channels
- WebRTC voice and video calling
- End-to-end encrypted message payloads
- Push notifications through a service worker
- Cloud-backed media and cross-device history
- Automated API and component test suites

## Repository

[github.com/SRIHARSHA2108/PulseChat](https://github.com/SRIHARSHA2108/PulseChat)

---

<div align="center">
  Built with care using MongoDB, Express, React, Node.js, and Socket.IO.
</div>
