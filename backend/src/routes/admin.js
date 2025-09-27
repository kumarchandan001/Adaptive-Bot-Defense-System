import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/logs', adminController.getLogs);
router.post('/block', adminController.block);
router.post('/unblock', adminController.unblock);

export default router;


