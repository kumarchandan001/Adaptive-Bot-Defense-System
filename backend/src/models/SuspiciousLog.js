import mongoose from 'mongoose';

const suspiciousLogSchema = new mongoose.Schema({
  ip: String,
  userId: { type: mongoose.Types.ObjectId, ref: 'User' },
  userAgent: String,
  path: String,
  method: String,
  reason: String,
  score: Number,
  meta: Object
}, { timestamps: true });

suspiciousLogSchema.index({ reason: 'text', path: 'text', userAgent: 'text' });

export const SuspiciousLog = mongoose.model('SuspiciousLog', suspiciousLogSchema);


