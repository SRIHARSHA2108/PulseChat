import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '', trim: true, maxlength: 2000 },
  attachment: {
    name: String,
    url: String,
    mimeType: String,
    size: Number
  },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  kind: { type: String, enum: ['text', 'task'], default: 'text' },
  task: {
    completed: { type: Boolean, default: false },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  scheduledFor: Date,
  status: { type: String, enum: ['scheduled', 'sent'], default: 'sent' }
}, { timestamps: true });

export default mongoose.model('Message', messageSchema);
