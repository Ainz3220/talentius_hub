import { prisma } from '../../config/db.js';
import { auditUpdate } from '../../audit/audit.service.js';

export async function getSettings() {
  let settings = await prisma.systemSettings.findUnique({ where: { id: 'system' } });
  if (!settings) {
    settings = await prisma.systemSettings.create({ data: { id: 'system', updatedBy: 'SYSTEM' } });
  }
  return settings;
}

export async function updateSettings(data, userId, ipAddress, userAgent) {
  const old = await getSettings();
  const updated = await prisma.systemSettings.update({
    where: { id: 'system' },
    data: { ...data, updatedBy: userId },
  });

  await auditUpdate({
    tableName: 'system_settings',
    recordId: 'system',
    oldData: old,
    newData: updated,
    performedBy: userId,
    ipAddress,
    userAgent,
  });

  // If docAlertDays1 or docAlertDays2 changed, reset alert flags for upcoming docs
  if (data.docAlertDays1 !== undefined || data.docAlertDays2 !== undefined) {
    await prisma.document.updateMany({
      where: { expiryDate: { gt: new Date() }, deletedAt: null },
      data: { alertSent1: false, alertSent2: false },
    });
  }

  return updated;
}

export async function resetSettings(userId, ipAddress, userAgent) {
  const old = await getSettings();
  // Delete and recreate to reset all defaults
  await prisma.systemSettings.delete({ where: { id: 'system' } });
  const fresh = await prisma.systemSettings.create({ data: { id: 'system', updatedBy: userId } });

  await auditUpdate({
    tableName: 'system_settings',
    recordId: 'system',
    oldData: old,
    newData: fresh,
    performedBy: userId,
    ipAddress,
    userAgent,
  });

  return fresh;
}
