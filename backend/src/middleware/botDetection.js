import rateLimit from 'express-rate-limit';
import useragent from 'useragent';
import fetch from 'node-fetch';
import { SuspiciousLog } from '../models/SuspiciousLog.js';
import { BlockList } from '../models/BlockList.js';
import { initConfig } from '../config/index.js';
import { emitSuspicious } from '../services/realtime.js';

const config = initConfig();

export const ipLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000, // Increased for testing
  keyGenerator: (req) => req.ip,
  standardHeaders: true,
  legacyHeaders: false
});

export const routeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500, // Increased for testing
  keyGenerator: (req) => `${req.ip}:${req.path}`,
  standardHeaders: true,
  legacyHeaders: false
});

function scoreRequest ({ headless, missingJs, geoMismatch, suspiciousUa, tooManyRequests, failedLogins }) {
  let score = 0;
  if (headless) score += 0.3;
  if (missingJs) score += 0.2;
  if (geoMismatch) score += 0.2;
  if (suspiciousUa) score += 0.2;
  if (tooManyRequests) score += 0.2;
  if (failedLogins) score += 0.2;
  return Math.min(1.0, score);
}

function looksHeadless (uaString) {
  const s = uaString.toLowerCase();
  return s.includes('headless') || s.includes('phantom') || s.includes('puppeteer') || s.includes('spider');
}

function fingerprintFromHeaders (req) {
  const accept = req.get('accept') || '';
  const lang = req.get('accept-language') || '';
  const enc = req.get('accept-encoding') || '';
  const dnt = req.get('dnt') || '';
  return `${accept}|${lang}|${enc}|${dnt}`;
}

async function geoLookup (ip) {
  try {
    const url = `${config.geoApiUrl}${ip}`;
    const r = await fetch(url);
    const data = await r.json();
    return { country: data.countryCode || data.country || null, city: data.city || null };
  } catch (_) {
    return { country: null, city: null };
  }
}

export function botDetection () {
  return async (req, res, next) => {
    const ip = req.ip;
    const uaString = req.get('user-agent') || '';
    const agent = useragent.parse(uaString);
    const suspiciousUa = !agent || agent.family === 'Other';
    const headless = looksHeadless(uaString);

    // naive JS challenge: expect a header `x-js-ok: 1` that only browsers set via small inline script
    const missingJs = req.get('x-js-ok') !== '1';

    const fp = fingerprintFromHeaders(req);
    const { country } = await geoLookup(req.ip);

    // pretend user's expected country can be supplied via `x-expected-country`
    const expectedCountry = req.get('x-expected-country') || null;
    const geoMismatch = expectedCountry && country && expectedCountry !== country;

    // Check for failed login attempts (this happens before response)
    const failedLogins = req.path.includes('/auth/login') && req.method === 'POST';
    
    // Check for rapid requests (simplified - could be enhanced with Redis)
    const tooManyRequests = false; // This would need proper implementation with counters

    const score = scoreRequest({ headless, missingJs, geoMismatch, suspiciousUa, tooManyRequests, failedLogins });

    // Block if listed
    const blocked = await BlockList.findOne({ $or: [{ ip }, { userId: req.user?.id || null }] });
    if (blocked) {
      await SuspiciousLog.create({ ip, userId: req.user?.id || null, userAgent: uaString, path: req.path, method: req.method, reason: 'blocklist', score, meta: { fp, country, expectedCountry } });
      emitSuspicious({ ip, userId: req.user?.id || null, userAgent: uaString, path: req.path, method: req.method, reason: 'blocklist', score });
      return res.status(403).json({ message: 'Blocked' });
    }

    // Log suspicious activity
    if (score >= 0.3) { // Lowered threshold for better testing
      const reason = failedLogins ? 'login_failed' : 'suspected_bot';
      const log = await SuspiciousLog.create({ 
        ip, 
        userId: req.user?.id || null, 
        userAgent: uaString, 
        path: req.path, 
        method: req.method, 
        reason, 
        score, 
        meta: { fp, country, expectedCountry, headless, missingJs, suspiciousUa, failedLogins } 
      });
      emitSuspicious({ id: log._id, ip, path: req.path, score, reason, userAgent: uaString });
    }

    next();
  };
}


