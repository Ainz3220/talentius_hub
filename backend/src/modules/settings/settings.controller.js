import prisma from '../../config/db.js';
import { z } from 'zod';

const updateSchema = z.object({
  appName: z.string().optional(),
  accentColor: z.string().optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  pageSize: z.number().int().min(10).max(100).optional(),
  docAlertDays1: z.number().int().optional(),
  docAlertDays2: z.number().int().optional(),
  checklistOverdueDays: z.number().int().optional(),
  transferRequiresApproval: z.boolean().optional(),
  maxFileSize: z.number().int().optional(),
  allowedMimeTypes: z.array(z.string()).optional(),
  loginMaxAttempts: z.number().int().optional(),
  loginLockoutMinutes: z.number().int().optional(),
  otpTtlMinutes: z.number().int().optional(),
  dashboardWidgets: z.array(z.string()).optional(),
  emailRecipients: z.record(z.any()).optional(),
}).strict();

export async function get(req, res, next) {
  try {
    const settings = await prisma.systemSettings.upsert({
      where: { id: 'system' },
      update: {},
      create: { id: 'system' },
    });
    res.json(settings);
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const data = updateSchema.parse(req.body);
    const settings = await prisma.systemSettings.upsert({
      where: { id: 'system' },
      update: data,
      create: { id: 'system', ...data },
    });
    res.json(settings);
  } catch (err) { next(err); }
}

export async function reset(req, res, next) {
  try {
    await prisma.systemSettings.delete({ where: { id: 'system' } }).catch(() => {});
    const settings = await prisma.systemSettings.create({ data: { id: 'system' } });
    res.json(settings);
  } catch (err) { next(err); }
}
