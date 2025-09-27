import fetch from 'node-fetch';
import { initConfig } from '../config/index.js';

const config = initConfig();

export async function verifyCaptcha (req, res) {
  const { provider, token } = req.body;
  if (!provider || !token) return res.status(400).json({ message: 'Missing provider or token' });

  try {
    let verifyUrl = '';
    let secret = '';
    if (provider === 'recaptcha') {
      verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
      secret = config.captcha.recaptchaSecret;
    } else {
      return res.status(400).json({ message: 'Unsupported provider' });
    }

    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);

    const r = await fetch(verifyUrl, { method: 'POST', body: params });
    const data = await r.json();
    if (!data.success) {
      return res.status(400).json({ success: false, message: 'Captcha failed', data });
    }
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ message: 'Captcha verify error' });
  }
}


