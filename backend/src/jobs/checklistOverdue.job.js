import cron from 'node-cron';
import { prisma } from '../config/db.js';
import { decrypt } from '../config/encryption.js';
import { getSettings } from '../modules/settings/settings.service.js';
import { fireWebhook } from '../modules/webhooks/webhook.service.js';
import { sendChecklistOverdue } from '../notifications/email.service.js';
import { writeAuditLog } from '../audit/audit.service.js';

let currentJob = null;

async function getUsersByRoles(roles) {
  if (!Array.isArray(roles) || roles.length === 0) return [];
  return prisma.user.findMany({
    where: { role: { in: roles }, emailVerified: true, deletedAt: null },
    select: { id: true, email: true, role: true },
  });
}

async function createNotification(userId, title, body, entityType, entityId) {
  try {
    await prisma.notification.create({
      data: { userId, type: 'CHECKLIST_OVERDUE', title, body, entityType, entityId },
    });
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}

async function runChecklistOverdueCheck() {
  try {
    const settings = await getSettings();
    const overdueDays = settings.checklistOverdueDays ?? 7;
    const overdueRecipients = settings.checklistOverdueRecipients ?? [];
    const appName = settings.appName ?? 'ExpatFlow';

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - overdueDays);

    const overdueItems = await prisma.checklistItem.findMany({
      where: {
        status: 'PENDING',
        overdueAlertSent: false,
        createdAt: { lt: cutoffDate },
        checklist: {
          deletedAt: null,
          status: 'IN_PROGRESS',
        },
      },
      include: {
        checklist: true,
      },
    });

    if (overdueItems.length === 0) return;

    const recipientUsers = await getUsersByRoles(overdueRecipients);

    for (const item of overdueItems) {
      const overdueSince = new Date(item.createdAt);
      overdueSince.setDate(overdueSince.getDate() + overdueDays);

      const now = new Date();
      const overdueDayCount = Math.ceil((now - overdueSince) / (1000 * 60 * 60 * 24));

      // Mark item as overdue alerted
      await prisma.checklistItem.update({
        where: { id: item.id },
        data: { overdueAlertSent: true, overdueSince },
      });

      // Notify matching role users
      for (const user of recipientUsers) {
        await createNotification(
          user.id,
          'Checklist Item Overdue',
          `Item "${item.itemText}" in checklist "${item.checklist.name}" is overdue by ${overdueDayCount} day(s)`,
          'CHECKLIST',
          item.checklistId,
        );

        const email = user.email ? decrypt(user.email) : null;
        if (email) {
          try {
            await sendChecklistOverdue({
              to: email,
              entityName: item.checklist.entityId,
              checklistName: item.checklist.name,
              itemText: item.itemText,
              overdueDays: overdueDayCount,
              itemNotes: item.notes,
              appName,
            });
          } catch (err) {
            console.error(`sendChecklistOverdue error for user ${user.id}:`, err.message);
          }
        }
      }

      // Fire webhook
      fireWebhook('CHECKLIST_ITEM_OVERDUE', {
        checklistId: item.checklistId,
        checklistName: item.checklist.name,
        entityType: item.checklist.entityType,
        entityId: item.checklist.entityId,
        itemId: item.id,
        itemText: item.itemText,
        overdueSince: overdueSince.toISOString(),
        overdueDays: overdueDayCount,
      });

      // Write audit log as SYSTEM
      await writeAuditLog({
        tableName: 'checklist_items',
        recordId: item.id,
        fieldName: 'overdueAlertSent',
        valueFrom: 'false',
        valueTo: 'true',
        action: 'UPDATE',
        performedBy: 'SYSTEM',
        ipAddress: null,
        userAgent: 'SYSTEM/checklistOverdueJob',
      });
    }
  } catch (err) {
    console.error('Checklist overdue job error:', err);
  }
}

function buildCronExpression(hours) {
  const h = parseInt(hours) || 24;
  return `0 */${h} * * *`;
}

export const checklistOverdueJobController = {
  reschedule(hours) {
    if (currentJob) {
      currentJob.stop();
      currentJob = null;
    }
    const expression = buildCronExpression(hours);
    currentJob = cron.schedule(expression, runChecklistOverdueCheck);
    console.log(`Checklist overdue job rescheduled: ${expression}`);
  },
};

export async function startChecklistOverdueJob() {
  const settings = await getSettings();
  const intervalHours = settings.checklistOverdueCheckHours ?? 24;
  const expression = buildCronExpression(intervalHours);

  currentJob = cron.schedule(expression, runChecklistOverdueCheck);
  console.log(`Checklist overdue job started: ${expression}`);
}
