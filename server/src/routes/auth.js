import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();
const publicUser = user => ({ id: user._id, name: user.name, username: user.username, email: user.email, phone: user.phone, avatarColor: user.avatarColor, privacy: user.privacy });
const makeToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || password.length < 6) return res.status(400).json({ message: 'Name, email and a 6+ character password are required' });
    if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: 'Email is already registered' });
    const colors = ['#6c5ce7', '#0984e3', '#00b894', '#e17055', '#e84393'];
    const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';
    let username = base; let suffix = 1;
    while (await User.exists({ username })) username = `${base}${suffix++}`;
    const user = await User.create({ name, username, email, phone, password: await bcrypt.hash(password, 12), avatarColor: colors[Math.floor(Math.random() * colors.length)] });
    res.status(201).json({ token: makeToken(user._id), user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() }).select('+password');
    if (!user || !await bcrypt.compare(req.body.password || '', user.password)) return res.status(401).json({ message: 'Incorrect email or password' });
    if (!user.username) {
      const base = user.email.split('@')[0].replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user';
      let username = base; let suffix = 1;
      while (await User.exists({ username, _id: { $ne: user._id } })) username = `${base}${suffix++}`;
      user.username = username; await user.save();
    }
    res.json({ token: makeToken(user._id), user: publicUser(user) });
  } catch (error) { next(error); }
});

export default router;
