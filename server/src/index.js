import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import { configureSocket } from './socket.js';

const app = express();
const server = http.createServer(app);
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const io = new Server(server, { cors: { origin: clientUrl } });
app.use(cors({ origin: clientUrl }));
app.use(express.json({ limit: '20kb' }));
app.use('/uploads', express.static('uploads'));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api', chatRoutes);
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ message: 'Something went wrong' }); });
configureSocket(io);

const port = process.env.PORT || 5001;
if (!process.env.MONGO_URI || !process.env.JWT_SECRET) { console.error('MONGO_URI and JWT_SECRET are required. Copy server/.env.example to server/.env.'); process.exit(1); }
mongoose.connect(process.env.MONGO_URI).then(() => server.listen(port, () => console.log(`PulseChat server running on http://localhost:${port}`))).catch(error => { console.error('MongoDB connection failed:', error.message); process.exit(1); });
