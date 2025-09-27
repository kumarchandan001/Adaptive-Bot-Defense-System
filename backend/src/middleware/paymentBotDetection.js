import useragent from 'useragent';
import fetch from 'node-fetch';
import { SuspiciousLog } from '../models/SuspiciousLog.js';
import { BlockList } from '../models/BlockList.js';
import { PaymentTransaction } from '../models/PaymentTransaction.js';
import { initConfig } from '../config/index.js';
import { emitSuspicious } from '../services/realtime.js';

const config = initConfig();

// Enhanced scoring for payment-specific bot detection
function scorePaymentRequest({ 
  headless, 
  missingJs, 
  geoMismatch, 
  suspiciousUa, 
  rapidPurchase, 
  multipleDevices,
  unusualTiming,
  suspiciousPattern,
  deviceFingerprintMatch,
  paymentBehavior
}) {
  let score = 0;
  
  // Core bot indicators (higher weights for payment context)
  if (headless) score += 0.4; // Increased weight for payment
  if (missingJs) score += 0.3; // Increased weight for payment
  if (suspiciousUa) score += 0.25;
  
  // Payment-specific indicators
  if (rapidPurchase) score += 0.35;
  if (multipleDevices) score += 0.3;
  if (unusualTiming) score += 0.2;
  if (suspiciousPattern) score += 0.4;
  if (geoMismatch) score += 0.25;
  if (paymentBehavior) score += 0.3;
  
  // Device fingerprinting
  if (deviceFingerprintMatch) score += 0.2;
  
  return Math.min(1.0, score);
}

function looksHeadless(uaString) {
  const s = uaString.toLowerCase();
  return s.includes('headless') || 
         s.includes('phantom') || 
         s.includes('puppeteer') || 
         s.includes('spider') ||
         s.includes('selenium') ||
         s.includes('webdriver') ||
         s.includes('automation');
}

function detectSuspiciousUserAgent(uaString) {
  const s = uaString.toLowerCase();
  const suspiciousPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'automation',
    'headless', 'phantom', 'puppeteer', 'selenium',
    'python', 'curl', 'wget', 'postman', 'insomnia'
  ];
  
  return suspiciousPatterns.some(pattern => s.includes(pattern));
}

function generateDeviceFingerprint(req) {
  const accept = req.get('accept') || '';
  const lang = req.get('accept-language') || '';
  const enc = req.get('accept-encoding') || '';
  const dnt = req.get('dnt') || '';
  const ua = req.get('user-agent') || '';
  const screen = req.get('x-screen-resolution') || '';
  const timezone = req.get('x-timezone') || '';
  
  return `${accept}|${lang}|${enc}|${dnt}|${ua}|${screen}|${timezone}`;
}

async function geoLookup(ip) {
  try {
    const url = `${config.geoApiUrl}${ip}`;
    const r = await fetch(url);
    const data = await r.json();
    return { 
      country: data.countryCode || data.country || null, 
      city: data.city || null,
      timezone: data.timezone || null
    };
  } catch (_) {
    return { country: null, city: null, timezone: null };
  }
}

async function checkRapidPurchase(userId, platform, timeWindowMs = 300000) { // 5 minutes
  const recentPurchases = await PaymentTransaction.countDocuments({
    userId,
    platform,
    createdAt: { $gte: new Date(Date.now() - timeWindowMs) },
    status: { $in: ['completed', 'processing'] }
  });
  
  return recentPurchases >= 3; // More than 3 purchases in 5 minutes
}

async function checkMultipleDevices(userId, deviceFingerprint, timeWindowMs = 3600000) { // 1 hour
  const recentTransactions = await PaymentTransaction.find({
    userId,
    createdAt: { $gte: new Date(Date.now() - timeWindowMs) },
    'deviceFingerprint': { $ne: deviceFingerprint }
  }).limit(5);
  
  return recentTransactions.length >= 2; // Different fingerprints in last hour
}

function detectUnusualTiming() {
  const hour = new Date().getHours();
  // Unusual times for ticket purchases (3 AM - 6 AM)
  return hour >= 3 && hour <= 6;
}

function detectSuspiciousPattern(req) {
  // Check for patterns that suggest automation
  const referer = req.get('referer') || '';
  const origin = req.get('origin') || '';
  
  // Direct access without proper referer
  if (!referer && !origin) return true;
  
  // Suspicious referer patterns
  const suspiciousReferers = ['localhost', '127.0.0.1', 'test.com'];
  return suspiciousReferers.some(pattern => referer.includes(pattern));
}

export function paymentBotDetection() {
  return async (req, res, next) => {
    const ip = req.ip;
    const uaString = req.get('user-agent') || '';
    const agent = useragent.parse(uaString);
    const userId = req.user?.id;
    
    // Basic bot detection
    const headless = looksHeadless(uaString);
    const suspiciousUa = detectSuspiciousUserAgent(uaString);
    const missingJs = req.get('x-js-ok') !== '1';
    
    // Device fingerprinting
    const deviceFingerprint = generateDeviceFingerprint(req);
    
    // Geo detection
    const geoData = await geoLookup(ip);
    const expectedCountry = req.get('x-expected-country') || null;
    const geoMismatch = expectedCountry && geoData.country && expectedCountry !== geoData.country;
    
    // Payment-specific checks
    const { platform, ticketId, amount } = req.body;
    
    let rapidPurchase = false;
    let multipleDevices = false;
    let deviceFingerprintMatch = false;
    
    if (userId && platform) {
      rapidPurchase = await checkRapidPurchase(userId, platform);
      multipleDevices = await checkMultipleDevices(userId, deviceFingerprint);
      
      // Check if this device fingerprint was used recently
      const recentDevice = await PaymentTransaction.findOne({
        deviceFingerprint,
        createdAt: { $gte: new Date(Date.now() - 3600000) } // 1 hour
      });
      deviceFingerprintMatch = !!recentDevice;
    }
    
    const unusualTiming = detectUnusualTiming();
    const suspiciousPattern = detectSuspiciousPattern(req);
    
    // Payment behavior analysis
    const paymentBehavior = amount && amount > 1000; // High-value transactions
    
    const score = scorePaymentRequest({
      headless,
      missingJs,
      geoMismatch,
      suspiciousUa,
      rapidPurchase,
      multipleDevices,
      unusualTiming,
      suspiciousPattern,
      deviceFingerprintMatch,
      paymentBehavior
    });
    
    // Create risk factors object
    const riskFactors = {
      rapidPurchase,
      multipleDevices,
      suspiciousPattern,
      geoMismatch,
      headlessBrowser: headless,
      missingJsChallenge: missingJs,
      unusualTiming
    };
    
    // Determine bot detection reasons
    const botDetectionReasons = [];
    if (headless) botDetectionReasons.push('headless_browser');
    if (missingJs) botDetectionReasons.push('missing_js_challenge');
    if (rapidPurchase) botDetectionReasons.push('rapid_purchase');
    if (multipleDevices) botDetectionReasons.push('multiple_devices');
    if (unusualTiming) botDetectionReasons.push('unusual_timing');
    if (suspiciousPattern) botDetectionReasons.push('suspicious_pattern');
    if (geoMismatch) botDetectionReasons.push('geo_mismatch');
    if (suspiciousUa) botDetectionReasons.push('suspicious_user_agent');
    
    // Check if blocked
    const blocked = await BlockList.findOne({ $or: [{ ip }, { userId }] });
    if (blocked) {
      await SuspiciousLog.create({
        ip,
        userId,
        userAgent: uaString,
        path: req.path,
        method: req.method,
        reason: 'payment_blocked',
        score: 1.0,
        meta: { 
          platform, 
          ticketId, 
          amount, 
          riskFactors, 
          botDetectionReasons,
          geoData,
          deviceFingerprint
        }
      });
      
      emitSuspicious({
        ip,
        userId,
        userAgent: uaString,
        path: req.path,
        method: req.method,
        reason: 'payment_blocked',
        score: 1.0,
        platform,
        ticketId,
        amount
      });
      
      return res.status(403).json({ 
        message: 'Payment blocked due to suspicious activity',
        reason: 'blocked',
        botScore: 1.0,
        detectionReasons: botDetectionReasons
      });
    }
    
    // High-risk payment detection
    if (score >= 0.6) {
      await SuspiciousLog.create({
        ip,
        userId,
        userAgent: uaString,
        path: req.path,
        method: req.method,
        reason: 'high_risk_payment',
        score,
        meta: {
          platform,
          ticketId,
          amount,
          riskFactors,
          botDetectionReasons,
          geoData,
          deviceFingerprint
        }
      });
      
      emitSuspicious({
        ip,
        userId,
        userAgent: uaString,
        path: req.path,
        method: req.method,
        reason: 'high_risk_payment',
        score,
        platform,
        ticketId,
        amount,
        detectionReasons: botDetectionReasons
      });
      
      return res.status(400).json({
        message: 'High risk payment detected',
        reason: 'bot_detected',
        botScore: score,
        detectionReasons: botDetectionReasons,
        requiresVerification: true
      });
    }
    
    // Medium-risk payment (require additional verification)
    if (score >= 0.3) {
      await SuspiciousLog.create({
        ip,
        userId,
        userAgent: uaString,
        path: req.path,
        method: req.method,
        reason: 'medium_risk_payment',
        score,
        meta: {
          platform,
          ticketId,
          amount,
          riskFactors,
          botDetectionReasons,
          geoData,
          deviceFingerprint
        }
      });
      
      emitSuspicious({
        ip,
        userId,
        userAgent: uaString,
        path: req.path,
        method: req.method,
        reason: 'medium_risk_payment',
        score,
        platform,
        ticketId,
        amount,
        detectionReasons: botDetectionReasons
      });
      
      // Add bot detection info to request for additional verification
      req.botDetection = {
        score,
        riskFactors,
        detectionReasons: botDetectionReasons,
        requiresVerification: true
      };
    }
    
    // Add bot detection info to request
    req.botDetection = {
      score,
      riskFactors,
      detectionReasons: botDetectionReasons,
      geoData,
      deviceFingerprint
    };
    
    next();
  };
}
