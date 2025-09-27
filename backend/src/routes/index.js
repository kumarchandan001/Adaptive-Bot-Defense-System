import express from 'express';
import authRouter from './auth.js';
import adminRouter from './admin.js';
import captchaRouter from './captcha.js';
import paymentRouter from './payment.js';

export const apiRouter = express.Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/captcha', captchaRouter);
apiRouter.use('/payment', paymentRouter);


