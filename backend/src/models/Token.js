import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  user: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  type: { type: String, enum: ['refresh'], required: true }
}, { timestamps: true });

tokenSchema.index({ token: 1 }, { unique: true });

export const Token = mongoose.model('Token', tokenSchema);


