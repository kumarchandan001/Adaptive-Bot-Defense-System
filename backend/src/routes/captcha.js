import express from 'express';
import * as captchaController from '../controllers/captchaController.js';

const router = express.Router();

router.post('/verify', captchaController.verifyCaptcha);

export default router;


