import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import {
  loginHandler, verifyOtpHandler, refreshHandler,
  logoutHandler, meHandler, verifyEmailHandler, resendVerificationHandler,
} from './auth.controller.js';

const router = Router();

router.post('/login', authLimiter, loginHandler);
router.post('/verify-otp', authLimiter, verifyOtpHandler);
router.post('/refresh', refreshHandler);
router.post('/logout', authenticate, logoutHandler);
router.get('/me', authenticate, meHandler);
router.get('/verify-email', verifyEmailHandler);
router.post('/resend-verification', authLimiter, resendVerificationHandler);

export default router;
