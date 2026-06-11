import { z } from 'zod';
import * as authService from './auth.service.js';
import { prisma } from '../../config/db.js';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export async function loginHandler(req, res, next) {
  try {
    const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) { next(err); }
}

export async function verifyOtpHandler(req, res, next) {
  try {
    const { userId, otp } = z.object({ userId: z.string(), otp: z.string().length(6) }).parse(req.body);
    const { accessToken, refreshToken, user } = await authService.verifyOtp(userId, otp);
    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    res.json({ accessToken, user });
  } catch (err) { next(err); }
}

export async function refreshHandler(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });
    const { accessToken, refreshToken } = await authService.refresh(token);
    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    res.json({ accessToken });
  } catch (err) { next(err); }
}

export async function logoutHandler(req, res, next) {
  try {
    if (req.user) await authService.logout(req.user.id);
    res.clearCookie('refreshToken');
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function meHandler(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true, emailVerified: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    res.json(user);
  } catch (err) { next(err); }
}

export async function verifyEmailHandler(req, res, next) {
  try {
    const { token } = z.object({ token: z.string() }).parse(req.query);
    const result = await authService.verifyEmail(token);
    res.json(result);
  } catch (err) { next(err); }
}

export async function resendVerificationHandler(req, res, next) {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    await authService.resendVerification(email);
    res.json({ success: true, message: 'If this email exists and is unverified, a new link has been sent.' });
  } catch (err) { next(err); }
}
