import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { paymentBotDetection } from '../middleware/paymentBotDetection.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import Joi from 'joi';

const router = express.Router();

// Payment validation schemas
const initiatePaymentSchema = Joi.object({
  platform: Joi.string().valid('ticketmaster', 'eventbrite', 'stubhub', 'seatgeek', 'vividseats').required(),
  ticketId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).default('USD'),
  paymentMethod: Joi.string().valid('credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay').required()
});

const processPaymentSchema = Joi.object({
  transactionId: Joi.string().required(),
  verificationData: Joi.object({
    step: Joi.string().valid('captcha', 'phone_verification', 'email_verification').required(),
    passed: Joi.boolean().required(),
    details: Joi.object().optional()
  }).optional()
});

// Apply authentication to all payment routes
router.use(requireAuth);

// Initiate payment with bot detection
router.post('/initiate', 
  paymentBotDetection(),
  validate(initiatePaymentSchema),
  paymentController.initiatePayment
);

// Process payment with verification
router.post('/process',
  validate(processPaymentSchema),
  paymentController.processPayment
);

// Get payment status
router.get('/status/:transactionId', paymentController.getPaymentStatus);

// Get payment history
router.get('/history', paymentController.getPaymentHistory);

export default router;
