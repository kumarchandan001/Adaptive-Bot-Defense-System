import { PaymentTransaction } from '../models/PaymentTransaction.js';
import { SuspiciousLog } from '../models/SuspiciousLog.js';
import { emitSuspicious } from '../services/realtime.js';
import { initConfig } from '../config/index.js';

const config = initConfig();

// Generate a unique session ID for tracking
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Simulate payment processing (replace with actual payment gateway integration)
async function simulatePaymentProcessing(paymentData) {
  // This would integrate with Stripe, PayPal, etc.
  // For now, we'll simulate the process
  
  const { amount, currency, paymentMethod, userId } = paymentData;
  
  // Simulate payment processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate payment success/failure based on amount
  const success = amount < 10000; // Reject payments over $10,000
  
  return {
    success,
    transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    amount,
    currency,
    status: success ? 'completed' : 'failed',
    message: success ? 'Payment processed successfully' : 'Payment amount too high'
  };
}

export async function initiatePayment(req, res) {
  try {
    const { platform, ticketId, amount, currency = 'USD', paymentMethod } = req.body;
    const userId = req.user.id;
    const ip = req.ip;
    const userAgent = req.get('user-agent') || '';
    
    // Generate session ID
    const sessionId = generateSessionId();
    
    // Get bot detection results from middleware
    const botDetection = req.botDetection || { score: 0, riskFactors: {}, detectionReasons: [] };
    
    // Create payment transaction record
    const transaction = await PaymentTransaction.create({
      userId,
      sessionId,
      ticketId,
      platform,
      amount,
      currency,
      status: 'pending',
      botScore: botDetection.score,
      botDetectionReasons: botDetection.detectionReasons || [],
      paymentMethod,
      ip,
      userAgent,
      geoData: botDetection.geoData || {},
      deviceFingerprint: botDetection.deviceFingerprint || '',
      riskFactors: botDetection.riskFactors || {},
      verificationSteps: [{
        step: 'bot_detection',
        passed: botDetection.score < 0.6,
        timestamp: new Date(),
        details: {
          score: botDetection.score,
          reasons: botDetection.detectionReasons
        }
      }]
    });
    
    // If high risk, require additional verification
    if (botDetection.score >= 0.6) {
      return res.status(400).json({
        message: 'Payment blocked due to bot detection',
        reason: 'bot_detected',
        botScore: botDetection.score,
        detectionReasons: botDetection.detectionReasons,
        transactionId: transaction._id,
        requiresVerification: true,
        verificationSteps: [
          'captcha',
          'phone_verification',
          'email_verification'
        ]
      });
    }
    
    // If medium risk, proceed with additional verification
    if (botDetection.score >= 0.3) {
      return res.status(200).json({
        message: 'Payment requires additional verification',
        reason: 'medium_risk',
        botScore: botDetection.score,
        detectionReasons: botDetection.detectionReasons,
        transactionId: transaction._id,
        requiresVerification: true,
        verificationSteps: ['captcha']
      });
    }
    
    // Low risk - proceed with payment
    return res.status(200).json({
      message: 'Payment initiated successfully',
      transactionId: transaction._id,
      sessionId,
      botScore: botDetection.score,
      status: 'processing'
    });
    
  } catch (error) {
    console.error('Payment initiation error:', error);
    return res.status(500).json({
      message: 'Payment initiation failed',
      error: error.message
    });
  }
}

export async function processPayment(req, res) {
  try {
    const { transactionId, verificationData } = req.body;
    const userId = req.user.id;
    
    // Find the transaction
    const transaction = await PaymentTransaction.findOne({
      _id: transactionId,
      userId,
      status: { $in: ['pending', 'processing'] }
    });
    
    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found or already processed'
      });
    }
    
    // Update verification steps
    if (verificationData) {
      transaction.verificationSteps.push({
        step: verificationData.step,
        passed: verificationData.passed,
        timestamp: new Date(),
        details: verificationData.details || {}
      });
    }
    
    // Check if all required verifications are complete
    const requiredSteps = transaction.botScore >= 0.6 ? 
      ['bot_detection', 'captcha', 'phone_verification'] : 
      ['bot_detection', 'captcha'];
    
    const completedSteps = transaction.verificationSteps
      .filter(step => step.passed)
      .map(step => step.step);
    
    const allStepsCompleted = requiredSteps.every(step => completedSteps.includes(step));
    
    if (!allStepsCompleted) {
      await transaction.save();
      return res.status(200).json({
        message: 'Additional verification required',
        completedSteps,
        requiredSteps,
        transactionId: transaction._id
      });
    }
    
    // Process the actual payment
    const paymentResult = await simulatePaymentProcessing({
      amount: transaction.amount,
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      userId: transaction.userId
    });
    
    // Update transaction status
    transaction.status = paymentResult.success ? 'completed' : 'failed';
    transaction.metadata = {
      ...transaction.metadata,
      paymentResult,
      processedAt: new Date()
    };
    
    await transaction.save();
    
    // Log the transaction
    if (paymentResult.success) {
      await SuspiciousLog.create({
        ip: transaction.ip,
        userId: transaction.userId,
        userAgent: transaction.userAgent,
        path: req.path,
        method: req.method,
        reason: 'payment_completed',
        score: transaction.botScore,
        meta: {
          platform: transaction.platform,
          ticketId: transaction.ticketId,
          amount: transaction.amount,
          transactionId: transaction._id,
          riskFactors: transaction.riskFactors
        }
      });
      
      emitSuspicious({
        ip: transaction.ip,
        userId: transaction.userId,
        userAgent: transaction.userAgent,
        path: req.path,
        method: req.method,
        reason: 'payment_completed',
        score: transaction.botScore,
        platform: transaction.platform,
        ticketId: transaction.ticketId,
        amount: transaction.amount
      });
    }
    
    return res.status(200).json({
      message: paymentResult.success ? 'Payment completed successfully' : 'Payment failed',
      success: paymentResult.success,
      transactionId: transaction._id,
      botScore: transaction.botScore,
      detectionReasons: transaction.botDetectionReasons,
      paymentResult
    });
    
  } catch (error) {
    console.error('Payment processing error:', error);
    return res.status(500).json({
      message: 'Payment processing failed',
      error: error.message
    });
  }
}

export async function getPaymentStatus(req, res) {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;
    
    const transaction = await PaymentTransaction.findOne({
      _id: transactionId,
      userId
    });
    
    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found'
      });
    }
    
    return res.status(200).json({
      transactionId: transaction._id,
      status: transaction.status,
      botScore: transaction.botScore,
      detectionReasons: transaction.botDetectionReasons,
      riskFactors: transaction.riskFactors,
      verificationSteps: transaction.verificationSteps,
      platform: transaction.platform,
      ticketId: transaction.ticketId,
      amount: transaction.amount,
      currency: transaction.currency,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    });
    
  } catch (error) {
    console.error('Get payment status error:', error);
    return res.status(500).json({
      message: 'Failed to get payment status',
      error: error.message
    });
  }
}

export async function getPaymentHistory(req, res) {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, platform } = req.query;
    
    const filter = { userId };
    if (platform) filter.platform = platform;
    
    const transactions = await PaymentTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await PaymentTransaction.countDocuments(filter);
    
    return res.status(200).json({
      transactions: transactions.map(t => ({
        transactionId: t._id,
        status: t.status,
        botScore: t.botScore,
        detectionReasons: t.botDetectionReasons,
        platform: t.platform,
        ticketId: t.ticketId,
        amount: t.amount,
        currency: t.currency,
        createdAt: t.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get payment history error:', error);
    return res.status(500).json({
      message: 'Failed to get payment history',
      error: error.message
    });
  }
}
