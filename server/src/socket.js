import jwt from 'jsonwebtoken';
import Conversation from './models/Conversation.js';
import Message from './models/Message.js';
import User from './models/User.js';

const connected = new Map();
export function configureSocket(io) {
  async function publish(message) {
    message.status = 'sent'; await message.save();
    await Conversation.findByIdAndUpdate(message.conversation, { lastMessage: message._id, updatedAt: new Date() });
    await message.populate('sender', 'name username avatarColor');
    io.to(`conversation:${message.conversation}`).emit('new-message', message);
    const conversation = await Conversation.findById(message.conversation);
    conversation?.members.forEach(id => io.to(`user:${id}`).emit('conversation-updated', { conversationId: message.conversation, message }));
  }

  const scheduleTimer = setInterval(async () => {
    const due = await Message.find({ status: 'scheduled', scheduledFor: { $lte: new Date() } }).limit(100);
    for (const message of due) await publish(message);
  }, 5000);
  scheduleTimer.unref();
  io.use((socket, next) => {
    try { socket.userId = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET).id; next(); }
    catch { next(new Error('Authentication failed')); }
  });
  io.on('connection', socket => {
    socket.join(`user:${socket.userId}`);
    connected.set(socket.userId, (connected.get(socket.userId) || 0) + 1);
    io.emit('presence', [...connected.keys()]);
    socket.on('join-conversation', async id => {
      if (await Conversation.exists({ _id: id, members: socket.userId })) socket.join(`conversation:${id}`);
    });
    socket.on('send-message', async ({ conversationId, text, kind = 'text', scheduledFor, assignee, attachment }, acknowledge) => {
      try {
        const conversation = await Conversation.findOne({ _id: conversationId, members: socket.userId });
        if (!conversation || (!text?.trim() && !attachment?.url)) throw new Error('Invalid message');
        const sendAt = scheduledFor ? new Date(scheduledFor) : null;
        let message = await Message.create({ conversation: conversationId, sender: socket.userId, text: text?.trim() || '', attachment, readBy: [socket.userId], kind, task: kind === 'task' ? { assignee: assignee || socket.userId } : undefined, scheduledFor: sendAt, status: sendAt && sendAt > new Date() ? 'scheduled' : 'sent' });
        if (message.status === 'sent') await publish(message);
        acknowledge?.({ ok: true, message });
      } catch (error) { acknowledge?.({ ok: false, message: error.message }); }
    });
    socket.on('typing', async ({ conversationId, active }) => {
      const [user, conversation] = await Promise.all([User.findById(socket.userId), Conversation.findById(conversationId)]);
      if (user?.privacy.showTyping && !conversation?.stealthFor.some(id => id.equals(socket.userId))) socket.to(`conversation:${conversationId}`).emit('typing', { conversationId, userId: socket.userId, active });
    });
    socket.on('disconnect', async () => {
      const count = (connected.get(socket.userId) || 1) - 1;
      if (count) connected.set(socket.userId, count);
      else {
        connected.delete(socket.userId);
        const lastSeen = new Date();
        await User.findByIdAndUpdate(socket.userId, { lastSeen });
        io.emit('last-seen', { userId: socket.userId, lastSeen });
      }
      io.emit('presence', [...connected.keys()]);
    });
  });
}
