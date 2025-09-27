import { SuspiciousLog } from '../models/SuspiciousLog.js'
let ioInstance = null;

export function createIoEmitter (io) {
  ioInstance = io;
  io.on('connection', (socket) => {
    // console.log('admin connected', socket.id);
  });
}

export function emitSuspicious (payload) {
  if (ioInstance) ioInstance.emit('suspicious', payload);
}

export async function recordSuspicious (req, meta) {
  // Persist suspicious activity to DB and emit to realtime channel
  const ip = req.ip;
  const userId = req.user?.id || null;
  const userAgent = req.get('user-agent') || '';
  const path = req.path;
  const method = req.method;
  const reason = meta?.type || 'suspected_activity';
  const score = typeof meta?.score === 'number' ? meta.score : undefined;

  try {
    const log = await SuspiciousLog.create({
      ip,
      userId,
      userAgent,
      path,
      method,
      reason,
      score,
      meta
    });
    emitSuspicious({ id: log._id, ip, path, score: log.score, reason, userAgent });
  } catch (_) {
    // swallow errors to avoid breaking request flow
  }
}


