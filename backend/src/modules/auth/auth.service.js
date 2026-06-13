import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/db.js';
import { env } from '../../config/env.js';
import { hmac, decrypt } from '../../config/encryption.js';
import { sendOtp } from '../../notifications/email.service.js';

// OTP store in memory (production: use Redis)
const otpStore = new Map(); // userId -> { otp, expiresAt }

export function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

export function generateAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });
}

export function generateRefreshToken(user) {
  return jwt.sign({ sub: user.id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  });
}

export async function findUserByEmail(email) {
  const hash = hmac(email);
  return prisma.user.findUnique({ where: { emailHash: hash } });
}

export async function initiateLogin(email, password, settings) {
  const user = await findUserByEmail(email);
  if (!user || !user.isActive) throw { status: 401, message: 'Invalid credentials' };

  // Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    throw { status: 423, message: `Account locked. Try again in ${mins} minute(s).` };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const maxAttempts = settings?.loginMaxAttempts ?? 5;
    const lockMins = settings?.loginLockoutMinutes ?? 15;
    const updates = { failedLoginAttempts: attempts };
    if (attempts >= maxAttempts) {
      updates.lockedUntil = new Date(Date.now() + lockMins * 60000);
    }
    await prisma.user.update({ where: { id: user.id }, data: updates });
    throw { status: 401, message: 'Invalid credentials' };
  }

  if (!user.emailVerified) {
    throw { status: 403, message: 'Please verify your email before logging in.' };
  }

  // Reset failed attempts
  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });

  // Generate OTP
  const otp = generateOtp();
  const expiresAt = Date.now() + (settings?.otpTtlMinutes ?? env.OTP_TTL_MINUTES) * 60000;
  otpStore.set(user.id, { otp, expiresAt });

  const userEmail = decrypt(user.emailEncrypted);
  if (env.isDev) {
    console.log(`[OTP] User ${user.id}: ${otp}`);
  } else {
    await sendOtp(userEmail, otp);
  }

  return { otpRequired: true, userId: user.id };
}

export async function verifyOtp(userId, otp) {
  const stored = otpStore.get(userId);
  if (!stored) throw { status: 400, message: 'OTP expired or not found. Please login again.' };
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(userId);
    throw { status: 400, message: 'OTP expired. Please login again.' };
  }
  if (stored.otp !== otp) throw { status: 400, message: 'Invalid OTP.' };
  otpStore.delete(userId);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, message: 'User not found.' };

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  return { accessToken, refreshToken, user: sanitizeUser(user) };
}

export async function refreshTokens(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch {
    throw { status: 401, message: 'Invalid refresh token.' };
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.refreshToken !== token) throw { status: 401, message: 'Refresh token revoked.' };

  const accessToken = generateAccessToken(user);
  const newRefresh = generateRefreshToken(user);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefresh } });
  return { accessToken, refreshToken: newRefresh };
}

export function sanitizeUser(user) {
  const { passwordHash, refreshToken, otpSecret, emailEncrypted, emailHash, emailVerifyToken, ...safe } = user;
  return safe;
}
