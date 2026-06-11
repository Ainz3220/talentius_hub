import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id, deletedAt: null },
    select: { id: true, email: true, role: true, emailVerified: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'User not found or inactive' });
  }

  if (!user.emailVerified) {
    return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED' });
  }

  req.user = { id: user.id, role: user.role, email: user.email };
  next();
}
