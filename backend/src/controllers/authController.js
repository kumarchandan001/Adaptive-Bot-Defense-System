import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Token } from '../models/Token.js';
import { initConfig } from '../config/index.js';
import { recordSuspicious } from '../services/realtime.js';

const config = initConfig();

function signAccessToken (user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtAccessSecret, { expiresIn: config.accessTokenTtlSec });
}

function signRefreshToken (user) {
  return jwt.sign({ sub: user._id.toString() }, config.jwtRefreshSecret, { expiresIn: config.refreshTokenTtlSec });
}

export async function signup (req, res) {
  const { email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'Email already registered' });
  const passwordHash = await bcrypt.hash(password, 10);
  const role = (email && email === (config.adminBootstrapEmail || 'admin@example.com')) ? 'admin' : 'user';
  const user = await User.create({ email, passwordHash, role });
  return res.status(201).json({ id: user._id, email: user.email, role: user.role });
}

export async function login (req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    await recordSuspicious(req, { type: 'login_failed', email });
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    await recordSuspicious(req, { type: 'login_failed', email });
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await Token.create({ user: user._id, token: refreshToken, type: 'refresh' });
  return res.json({ accessToken, refreshToken, user: { id: user._id, email: user.email, role: user.role } });
}

export async function refreshToken (req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Missing refreshToken' });
  const stored = await Token.findOne({ token: refreshToken, type: 'refresh' });
  if (!stored) return res.status(401).json({ message: 'Invalid refresh token' });
  try {
    const payload = jwt.verify(refreshToken, config.jwtRefreshSecret);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'User not found' });
    const accessToken = signAccessToken(user);
    return res.json({ accessToken });
  } catch (e) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

export async function logout (req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await Token.deleteOne({ token: refreshToken, type: 'refresh' });
  }
  return res.json({ message: 'Logged out' });
}


