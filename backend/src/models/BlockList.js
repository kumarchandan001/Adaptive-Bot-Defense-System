import mongoose from 'mongoose';

const blockListSchema = new mongoose.Schema({
  ip: { type: String, default: null },
  userId: { type: mongoose.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

blockListSchema.index({ ip: 1 });
blockListSchema.index({ userId: 1 });

export const BlockList = mongoose.model('BlockList', blockListSchema);


