import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/db.js';
import { encrypt, decrypt, hashForLookup } from '../../config/encryption.js';
import { getSettings } from '../settings/settings.service.js';
import { sendEmailVerification } from '../../notifications/email.service.js';
import { env } from '../../config/env.js';
import { auditCreate, auditUpdate, auditDelete } from '../../audit/audit.service.js';
import { fireWebhook } from '../webhooks/webhook.service.js';

const ENCRYPTED_FIELDS = ['email'];

function formatUser(u, requestingRole) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ? decrypt(u.email) : null,
    role: u.role,
    isActive: u.isActive,
    emailVerified: u.emailVerified,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    createdBy: u.createdBy,
    deletedAt: u.deletedAt,
  };
}

export async function listUsers(requestingUser) {
  const where = { deletedAt: null };
  if (requestingUser.role === 'MANAGER') {
    where.role = 'STAFF';
  }
  const users = await prisma.user.findMany({ where, orderBy: { createdAt: 'desc' } });
  return users.map(u => formatUser(u, requestingUser.role));
}

export async function getUserById(id) {
  const u = await prisma.user.findUnique({ where: { id, deletedAt: null } });
  if (!u) throw Object.assign(new Error('User not found'), { status: 404 });
  return formatUser(u);
}

export async function createUser({ email, password, role }, createdBy, ipAddress, userAgent) {
  const settings = await getSettings();
  const passwordHash = await bcrypt.hash(password || uuidv4(), 12);
  const verifyToken = uuidv4();
  const verifyExpiry = new Date(Date.now() + settings.emailVerifyTtlHours * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      email: encrypt(email),
      emailLookupHash: hashForLookup(email),
      passwordHash,
      role,
      isActive: false,
      emailVerified: false,
      emailVerifyToken: verifyToken,
      emailVerifyExpiry: verifyExpiry,
      createdBy,
    },
  });

  await auditCreate({ tableName: 'users', recordId: user.id, data: { email: '[ENCRYPTED]', role }, performedBy: createdBy, ipAddress, userAgent });

  // Send verification email
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${verifyToken}`;
  const creatorUser = await prisma.user.findUnique({ where: { id: createdBy } });
  await sendEmailVerification({
    to: email,
    userName: email.split('@')[0],
    verifyUrl,
    expiresInHours: settings.emailVerifyTtlHours,
    appName: settings.appName,
    createdByName: creatorUser ? decrypt(creatorUser.email) : 'Admin',
  }).catch(err => console.error('Verification email failed:', err));

  // Fire USER_CREATED webhook
  setImmediate(() => fireWebhook('USER_CREATED', {
    userId: user.id,
    role: user.role,
    emailVerificationRequired: true,
    createdBy: { id: createdBy },
  }));

  return formatUser(user);
}

export async function updateUser(id, data, updatedBy, ipAddress, userAgent) {
  const old = await prisma.user.findUnique({ where: { id, deletedAt: null } });
  if (!old) throw Object.assign(new Error('User not found'), { status: 404 });

  const updated = await prisma.user.update({ where: { id }, data });

  await auditUpdate({
    tableName: 'users',
    recordId: id,
    oldData: old,
    newData: updated,
    performedBy: updatedBy,
    ipAddress,
    userAgent,
    encryptedFields: ENCRYPTED_FIELDS,
  });

  return formatUser(updated);
}

export async function manualVerifyUser(id, verifiedBy, ipAddress, userAgent) {
  const user = await prisma.user.findUnique({ where: { id, deletedAt: null } });
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const updated = await prisma.user.update({
    where: { id },
    data: { emailVerified: true, isActive: true, emailVerifyToken: null, emailVerifyExpiry: null },
  });

  await auditCreate({ tableName: 'users', recordId: id, data: { manualVerify: true }, performedBy: verifiedBy, ipAddress, userAgent });
  return formatUser(updated);
}

export async function resendUserVerification(id, requestedBy) {
  const user = await prisma.user.findUnique({ where: { id, deletedAt: null } });
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  if (user.emailVerified) throw Object.assign(new Error('User is already verified'), { status: 400 });

  const settings = await getSettings();
  const token = uuidv4();
  const expiry = new Date(Date.now() + settings.emailVerifyTtlHours * 60 * 60 * 1000);

  await prisma.user.update({ where: { id }, data: { emailVerifyToken: token, emailVerifyExpiry: expiry } });

  const email = decrypt(user.email);
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  await sendEmailVerification({
    to: email,
    userName: email.split('@')[0],
    verifyUrl,
    expiresInHours: settings.emailVerifyTtlHours,
    appName: settings.appName,
    createdByName: 'Admin',
  }).catch(err => console.error('Resend email failed:', err));
}

export async function softDeleteUser(id, deletedBy, ipAddress, userAgent) {
  const user = await prisma.user.findUnique({ where: { id, deletedAt: null } });
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditDelete({ tableName: 'users', recordId: id, performedBy: deletedBy, ipAddress, userAgent });
}
