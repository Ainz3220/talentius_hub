import prisma from '../../config/db.js';
import { initiateLogin, verifyOtp, refreshTokens, sanitizeUser } from './auth.service.js';
import { decrypt, hmac, encrypt } from '../../config/encryption.js';
import { sendEmail } from '../../notifications/email.service.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { z } from 'zod';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const otpSchema = z.object({ userId: z.string(), otp: z.string().length(6) });

export async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const settings = await prisma.systemSettings.findUnique({ where: { id: 'system' } });
    const result = await initiateLogin(email, password, settings);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function verifyOtpController(req, res, next) {
  try {
    const { userId, otp } = otpSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await verifyOtp(userId, otp);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: !env.isDev,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken, user });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });
    const { accessToken, refreshToken } = await refreshTokens(token);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: !env.isDev,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function logout(req, res) {
  const token = req.cookies?.refreshToken;
  if (token) {
    await prisma.user.updateMany({ where: { refreshToken: token }, data: { refreshToken: null } });
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
}

export async function me(req, res) {
  res.json(sanitizeUser(req.user));
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required' });
    const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, emailVerifyToken: null } });
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
}

export async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const emailHash = hmac(email);
    const user = await prisma.user.findUnique({ where: { emailHash } });
    if (!user || user.emailVerified) {
      return res.json({ message: 'If that email exists and is unverified, a link was sent.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({ where: { id: user.id }, data: { emailVerifyToken: token } });
    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
    await sendEmail({
      to: decrypt(user.emailEncrypted),
      subject: 'Verify your Talentius Hub email',
      html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email. Link expires in 24 hours.</p>`,
    });
    res.json({ message: 'Verification email sent.' });
  } catch (err) {
    next(err);
  }
}
