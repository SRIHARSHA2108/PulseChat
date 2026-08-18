import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  spaces: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, value: { type: String, enum: ['personal', 'work'], default: 'personal' } }],
  stealthFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export default mongoose.model('Conversation', conversationSchema);
