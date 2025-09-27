import { SuspiciousLog } from '../models/SuspiciousLog.js';
import { BlockList } from '../models/BlockList.js';

export async function getLogs (req, res) {
  const { q = '', limit = 50, skip = 0 } = req.query;
  const filter = q ? { $text: { $search: q } } : {};
  const items = await SuspiciousLog.find(filter)
    .sort({ createdAt: -1 })
    .skip(Number(skip))
    .limit(Number(limit));
  const total = await SuspiciousLog.countDocuments(filter);
  res.json({ items, total });
}

export async function block (req, res) {
  const { ip, userId } = req.body;
  if (!ip && !userId) return res.status(400).json({ message: 'Provide ip or userId' });
  const doc = await BlockList.create({ ip, userId });
  res.status(201).json(doc);
}

export async function unblock (req, res) {
  const { ip, userId } = req.body;
  if (!ip && !userId) return res.status(400).json({ message: 'Provide ip or userId' });
  await BlockList.deleteOne({ ip: ip || null, userId: userId || null });
  res.json({ message: 'Unblocked' });
}


