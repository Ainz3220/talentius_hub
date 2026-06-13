import { Router } from 'express';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { authenticate } from '../../middleware/auth.js';
import * as ctrl from './auth.controller.js';

const router = Router();

router.post('/login', authLimiter, ctrl.login);
router.post('/verify-otp', authLimiter, ctrl.verifyOtpController);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.get('/verify-email', ctrl.verifyEmail);
router.post('/resend-verification', ctrl.resendVerification);

export default router;
