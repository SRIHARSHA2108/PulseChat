import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import FriendRequest from '../models/FriendRequest.js';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const router = Router();
router.use(auth);
let newsCache = { expires: 0, items: [] };
const decodeXml = value => value.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 },
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).slice(0, 10)}`)
  })
});

router.get('/users', async (req, res, next) => {
  try {
    const query = req.query.search ? { name: { $regex: req.query.search, $options: 'i' } } : {};
    const users = await User.find({ ...query, _id: { $ne: req.user._id } }).select('name username avatarColor lastSeen').limit(30);
    const friendIds = new Set(req.user.friends.map(String));
    const pending = await FriendRequest.find({ status: 'pending', $or: [{ from: req.user._id }, { to: req.user._id }] });
    res.json(users.map(user => {
      const request = pending.find(item => String(item.from) === String(user._id) || String(item.to) === String(user._id));
      return { ...user.toObject(), isFriend: friendIds.has(String(user._id)), requestStatus: request ? (String(request.to) === String(req.user._id) ? 'received' : 'sent') : null };
    }));
  } catch (error) { next(error); }
});

router.get('/current-affairs', async (req, res, next) => {
  try {
    if (req.query.refresh !== '1' && newsCache.expires > Date.now()) return res.json(newsCache.items);
    const response = await fetch('https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en', { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('News service unavailable');
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 18).map(([, item], index) => {
      const field = name => decodeXml(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`))?.[1] || '');
      const rawTitle = field('title');
      const parts = rawTitle.split(' - ');
      return { id: `${Date.now()}-${index}`, title: parts.slice(0, -1).join(' - ') || rawTitle, source: field('source') || parts.at(-1) || 'News', link: field('link'), publishedAt: field('pubDate') };
    });
    newsCache = { expires: Date.now() + 10 * 60 * 1000, items };
    res.json(items);
  } catch (error) {
    if (newsCache.items.length) return res.json(newsCache.items);
    next(error);
  }
});

router.get('/friends', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('friends', 'name email avatarColor lastSeen');
    res.json(user.friends);
  } catch (error) { next(error); }
});

router.post('/friends/:userId', async (req, res, next) => {
  try {
    const friend = await User.findById(req.params.userId).select('name email avatarColor lastSeen');
    if (!friend || friend._id.equals(req.user._id)) return res.status(400).json({ message: 'Choose another valid user' });
    if (req.user.friends.some(id => id.equals(friend._id))) return res.json({ message: 'Already friends' });
    const incoming = await FriendRequest.findOne({ from: friend._id, to: req.user._id, status: 'pending' });
    if (incoming) return res.status(409).json({ message: 'This user already sent you a request. Open Requests to respond.' });
    const request = await FriendRequest.findOneAndUpdate(
      { from: req.user._id, to: friend._id, status: 'pending' },
      { $setOnInsert: { from: req.user._id, to: friend._id, status: 'pending' } },
      { upsert: true, new: true }
    );
    res.status(201).json(request);
  } catch (error) { next(error); }
});

router.get('/friend-requests', async (req, res, next) => {
  try { res.json(await FriendRequest.find({ to: req.user._id, status: 'pending' }).populate('from', 'name username avatarColor lastSeen').sort('-createdAt')); }
  catch (error) { next(error); }
});

router.patch('/friend-requests/:id', async (req, res, next) => {
  try {
    const request = await FriendRequest.findOne({ _id: req.params.id, to: req.user._id, status: 'pending' });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (!['accepted', 'declined'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid response' });
    request.status = req.body.status; await request.save();
    if (request.status === 'accepted') await Promise.all([
      User.updateOne({ _id: request.from }, { $addToSet: { friends: request.to } }),
      User.updateOne({ _id: request.to }, { $addToSet: { friends: request.from } })
    ]);
    res.json(request);
  } catch (error) { next(error); }
});

router.get('/conversations', async (req, res, next) => {
  try {
    const items = await Conversation.find({ members: req.user._id }).populate('members', 'name username phone avatarColor lastSeen').populate({ path: 'lastMessage', populate: { path: 'sender', select: 'name' } }).sort('-updatedAt');
    res.json(items);
  } catch (error) { next(error); }
});

router.post('/conversations', async (req, res, next) => {
  try {
    const other = await User.findById(req.body.userId);
    if (!other || other._id.equals(req.user._id)) return res.status(400).json({ message: 'Choose another valid user' });
    if (!req.user.friends.some(id => id.equals(other._id))) return res.status(403).json({ message: 'Add this person as a friend before messaging' });
    let item = await Conversation.findOne({ members: { $all: [req.user._id, other._id] }, $expr: { $eq: [{ $size: '$members' }, 2] } });
    if (!item) item = await Conversation.create({ members: [req.user._id, other._id] });
    await item.populate('members', 'name username phone avatarColor lastSeen');
    res.status(201).json(item);
  } catch (error) { next(error); }
});

router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, members: req.user._id });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    const messages = await Message.find({ conversation: conversation._id }).populate('sender', 'name avatarColor').sort('createdAt').limit(200);
    await Message.updateMany({ conversation: conversation._id, readBy: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } });
    res.json(messages);
  } catch (error) { next(error); }
});

router.post('/conversations/:id/attachments', upload.single('file'), async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, members: req.user._id });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    if (!req.file) return res.status(400).json({ message: 'Choose a file to upload' });
    res.status(201).json({ name: req.file.originalname, url: `/uploads/${req.file.filename}`, mimeType: req.file.mimetype, size: req.file.size });
  } catch (error) { next(error); }
});

router.patch('/conversations/:id/settings', async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, members: req.user._id });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    if (['personal', 'work'].includes(req.body.space)) {
      conversation.spaces = conversation.spaces.filter(item => !item.user.equals(req.user._id));
      conversation.spaces.push({ user: req.user._id, value: req.body.space });
    }
    if (typeof req.body.stealth === 'boolean') req.body.stealth ? conversation.stealthFor.addToSet(req.user._id) : conversation.stealthFor.pull(req.user._id);
    await conversation.save(); res.json(conversation);
  } catch (error) { next(error); }
});

router.patch('/privacy', async (req, res, next) => {
  try {
    if (typeof req.body.showLastSeen === 'boolean') req.user.privacy.showLastSeen = req.body.showLastSeen;
    if (typeof req.body.showTyping === 'boolean') req.user.privacy.showTyping = req.body.showTyping;
    await req.user.save(); res.json(req.user.privacy);
  } catch (error) { next(error); }
});

router.patch('/profile', async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    if (!/^\+?[0-9 ()-]{7,20}$/.test(phone)) return res.status(400).json({ message: 'Enter a valid phone number including country code' });
    req.user.phone = phone; await req.user.save(); res.json({ phone: req.user.phone });
  } catch (error) { next(error); }
});

router.patch('/messages/:id/task', async (req, res, next) => {
  try {
    const message = await Message.findOne({ _id: req.params.id, kind: 'task' }).populate('conversation');
    if (!message || !message.conversation.members.some(id => id.equals(req.user._id))) return res.status(404).json({ message: 'Task not found' });
    message.task.completed = Boolean(req.body.completed); await message.save(); res.json(message);
  } catch (error) { next(error); }
});

export default router;
