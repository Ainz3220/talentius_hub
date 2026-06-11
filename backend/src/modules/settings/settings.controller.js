import { z } from 'zod';
import { getSettings, updateSettings, resetSettings } from './settings.service.js';
import { checklistOverdueJobController } from '../../jobs/checklistOverdue.job.js';

const patchSchema = z.object({
  appName: z.string().min(1).optional(),
  appLogoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  docAlertDays1: z.number().int().positive().optional(),
  docAlertDays2: z.number().int().positive().optional(),
  docAlertRecipients: z.array(z.string()).optional(),
  checklistOverdueDays: z.number().int().positive().optional(),
  checklistOverdueCheckHours: z.number().int().positive().optional(),
  checklistOverdueRecipients: z.array(z.string()).optional(),
  transferRequiresApproval: z.boolean().optional(),
  transferApprovalRoles: z.array(z.string()).optional(),
  emailVerifyTtlHours: z.number().int().positive().optional(),
  otpTtlSeconds: z.number().int().min(60).max(600).optional(),
  maxFileSizeMb: z.number().int().min(1).max(50).optional(),
  allowedMimeTypes: z.array(z.string()).optional(),
  loginMaxAttempts: z.number().int().min(1).max(20).optional(),
  loginLockoutMinutes: z.number().int().min(1).max(60).optional(),
  defaultPageSize: z.number().int().refine(v => [10,25,50,100].includes(v)).optional(),
  timezone: z.string().optional(),
  dateFormat: z.enum(['DD MMM YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY']).optional(),
  tableShowAvatars: z.boolean().optional(),
  tableShowEncryptedMask: z.boolean().optional(),
  tableCompactMode: z.boolean().optional(),
  dashboardWidgets: z.array(z.string()).optional(),
}).strict();

export async function getSettingsHandler(req, res, next) {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err) { next(err); }
}

export async function updateSettingsHandler(req, res, next) {
  try {
    const data = patchSchema.parse(req.body);
    const updated = await updateSettings(data, req.user.id, req.ip, req.headers['user-agent']);

    // Reschedule checklist overdue job if check hours changed
    if (data.checklistOverdueCheckHours !== undefined) {
      await checklistOverdueJobController.reschedule(data.checklistOverdueCheckHours);
    }

    res.json(updated);
  } catch (err) { next(err); }
}

export async function resetSettingsHandler(req, res, next) {
  try {
    const fresh = await resetSettings(req.user.id, req.ip, req.headers['user-agent']);
    res.json(fresh);
  } catch (err) { next(err); }
}
