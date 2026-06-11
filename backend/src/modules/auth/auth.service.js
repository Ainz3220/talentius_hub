import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { decrypt, hashForLookup, normalizeEmail } from '../../config/encryption.js';
import { getSettings } from '../settings/settings.service.js';
import { sendOtpEmail, sendEmailVerification } from '../../notifications/email.service.js';
import { auditCreate } from '../../audit/audit.service.js';

// In-memory OTP store (keyed by userId)
const otpStore = new Map();

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function issueJwt(userId, role) {
  return jwt.sign({ id: userId, role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function issueRefreshToken(userId) {
  const token = uuidv4();
  const hashed = hashToken(token);
  return { token, hashed };
}

async function findUserByEmail(email, { emailVerified } = {}) {
  const normalized = normalizeEmail(email);
  const emailLookupHash = hashForLookup(normalized);

  const where = { deletedAt: null, emailLookupHash };
  if (emailVerified !== undefined) where.emailVerified = emailVerified;

  const byHash = await prisma.user.findFirst({ where });
  if (byHash) return byHash;

  const legacyWhere = { deletedAt: null, emailLookupHash: null };
  if (emailVerified !== undefined) legacyWhere.emailVerified = emailVerified;

  const legacyUsers = await prisma.user.findMany({ where: legacyWhere });
  for (const user of legacyUsers) {
    const decrypted = decrypt(user.email);
    if (decrypted === null) {
      if (user.email) {
        console.error(`[auth] Cannot decrypt email for user ${user.id}; account unreachable until data is repaired`);
      }
      continue;
    }
    if (normalizeEmail(decrypted) === normalized) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailLookupHash },
      }).catch((err) => {
        console.error(`[auth] Failed to backfill emailLookupHash for user ${user.id}:`, err.message);
      });
      return user;
    }
  }

  return null;
}

export async function login(email, password) {
  const settings = await getSettings();

  const user = await findUserByEmail(email);

  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  // Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw Object.assign(new Error('Account temporarily locked due to too many failed attempts'), { status: 429 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const locked = attempts >= settings.loginMaxAttempts;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: locked ? new Date(Date.now() + settings.loginLockoutMinutes * 60 * 1000) : null,
      },
    });
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  // Reset failed attempts
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  // Generate and send OTP
  const otp = generateOtp();
  const expiresAt = Date.now() + settings.otpTtlSeconds * 1000;
  otpStore.set(user.id, { otp, expiresAt });

  if (env.NODE_ENV === 'development') {
    console.log(`\n[DEV] OTP for ${email}: ${otp}\n`);
  }

  const appSettings = await getSettings();
  await sendOtpEmail({
    to: email,
    otpCode: otp,
    expiresInMinutes: Math.round(settings.otpTtlSeconds / 60),
    appName: appSettings.appName,
  }).catch(err => console.error('OTP email failed:', err.message));

  const response = { otpRequired: true, userId: user.id };
  if (env.NODE_ENV === 'development') response.devOtp = otp;
  return response;
}

export async function verifyOtp(userId, otp) {
  const stored = otpStore.get(userId);
  if (!stored) throw Object.assign(new Error('OTP not found or expired'), { status: 401 });
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(userId);
    throw Object.assign(new Error('OTP expired'), { status: 401 });
  }
  if (stored.otp !== otp) throw Object.assign(new Error('Invalid OTP'), { status: 401 });

  otpStore.delete(userId);

  const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
  if (!user || !user.isActive) throw Object.assign(new Error('User not found or inactive'), { status: 401 });
  if (!user.emailVerified) {
    throw Object.assign(new Error('Please verify your email before signing in'), { status: 403 });
  }

  const accessToken = issueJwt(user.id, user.role);
  const { token: refreshToken, hashed } = issueRefreshToken(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashed, lastLoginAt: new Date() },
  });

  return { accessToken, refreshToken, user: { id: user.id, role: user.role } };
}

export async function refresh(refreshToken) {
  const hashed = hashToken(refreshToken);
  const user = await prisma.user.findFirst({
    where: { refreshToken: hashed, deletedAt: null, isActive: true },
  });
  if (!user) throw Object.assign(new Error('Invalid refresh token'), { status: 401 });

  const accessToken = issueJwt(user.id, user.role);
  const { token: newRefresh, hashed: newHashed } = issueRefreshToken(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: newHashed },
  });

  return { accessToken, refreshToken: newRefresh };
}

export async function logout(userId) {
  await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
}

export async function verifyEmail(token) {
  const user = await prisma.user.findFirst({
    where: { emailVerifyToken: token, deletedAt: null },
  });

  if (!user) throw Object.assign(new Error('Invalid verification token'), { status: 400 });
  if (user.emailVerified) return { alreadyVerified: true };
  if (user.emailVerifyExpiry && user.emailVerifyExpiry < new Date()) {
    throw Object.assign(new Error('Verification token has expired'), { status: 400, expired: true });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, isActive: true, emailVerifyToken: null, emailVerifyExpiry: null },
  });

  await auditCreate({
    tableName: 'users',
    recordId: user.id,
    data: { emailVerified: true },
    performedBy: user.id,
  });

  return { success: true };
}

export async function resendVerification(email) {
  const user = await findUserByEmail(email, { emailVerified: false });
  if (!user) return; // Silently return to prevent email enumeration

  const settings = await getSettings();
  const token = uuidv4();
  const expiry = new Date(Date.now() + settings.emailVerifyTtlHours * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifyToken: token, emailVerifyExpiry: expiry },
  });

  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  await sendEmailVerification({
    to: email,
    userName: 'User',
    verifyUrl,
    expiresInHours: settings.emailVerifyTtlHours,
    appName: settings.appName,
    createdByName: 'System',
  }).catch(err => console.error('Resend verification email failed:', err));
}
