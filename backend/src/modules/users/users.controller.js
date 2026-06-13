import prisma from '../../config/db.js';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { encrypt, hmac, decrypt } from '../../config/encryption.js';
import { logCreate, logUpdate, logDelete } from '../../audit/audit.service.js';
import { sendEmail } from '../../notifications/email.service.js';
import { env } from '../../config/env.js';

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'MANAGER', 'STAFF']).default('STAFF'),
});

function sanitize(user) {
  const { passwordHash, refreshToken, emailEncrypted, emailHash, emailVerifyToken, otpSecret, ...rest } = user;
  return { ...rest, email: decrypt(user.emailEncrypted) };
}

export async function list(req, res, next) {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(users.map(sanitize));
  } catch (err) { next(err); }
}

export async function get(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(sanitize(user));
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const emailHashVal = hmac(data.email);
    const existing = await prisma.user.findUnique({ where: { emailHash: emailHashVal } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(data.password, 12);
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        emailHash: emailHashVal,
        emailEncrypted: encrypt(data.email),
        passwordHash,
        name: data.name || null,
        role: data.role,
        emailVerifyToken: verifyToken,
      },
    });

    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${verifyToken}`;
    await sendEmail({
      to: data.email,
      subject: 'Welcome to Talentius Hub — Verify your email',
      html: `<p>Welcome! Please <a href="${verifyUrl}">verify your email</a> to activate your account.</p>`,
    });

    await logCreate('users', user, req);
    res.status(201).json(sanitize(user));
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const allowed = z.object({
      name: z.string().optional(),
      role: z.enum(['SUPER_ADMIN', 'MANAGER', 'STAFF']).optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body);

    const changes = {};
    for (const [k, v] of Object.entries(allowed)) {
      if (existing[k] !== v) changes[k] = { from: existing[k], to: v };
    }

    const user = await prisma.user.update({ where: { id: req.params.id }, data: allowed });
    await logUpdate('users', user.id, changes, req);
    res.json(sanitize(user));
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    if (req.params.id === req.userId) return res.status(400).json({ error: 'Cannot delete yourself' });
    await prisma.user.delete({ where: { id: req.params.id } });
    await logDelete('users', req.params.id, req);
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
}

export async function verify(req, res, next) {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { emailVerified: true },
    });
    res.json(sanitize(user));
  } catch (err) { next(err); }
}
