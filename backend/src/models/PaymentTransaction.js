import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true },
  ticketId: { type: String, required: true },
  platform: { type: String, required: true }, // e.g., 'ticketmaster', 'eventbrite', 'stubhub'
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'blocked'], 
    default: 'pending' 
  },
  botScore: { type: Number, min: 0, max: 1 },
  botDetectionReasons: [String],
  paymentMethod: String,
  ip: String,
  userAgent: String,
  geoData: {
    country: String,
    city: String,
    timezone: String
  },
  deviceFingerprint: String,
  riskFactors: {
    rapidPurchase: Boolean,
    multipleDevices: Boolean,
    suspiciousPattern: Boolean,
    geoMismatch: Boolean,
    headlessBrowser: Boolean,
    missingJsChallenge: Boolean,
    unusualTiming: Boolean
  },
  verificationSteps: [{
    step: String,
    passed: Boolean,
    timestamp: Date,
    details: Object
  }],
  metadata: Object
}, { timestamps: true });

paymentTransactionSchema.index({ userId: 1, createdAt: -1 });
paymentTransactionSchema.index({ sessionId: 1 });
paymentTransactionSchema.index({ platform: 1, status: 1 });
paymentTransactionSchema.index({ botScore: -1 });

export const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);
