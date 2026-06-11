import cron from 'node-cron';
import { prisma } from '../config/db.js';
import { decrypt } from '../config/encryption.js';
import { getSettings } from '../modules/settings/settings.service.js';
import { fireWebhook } from '../modules/webhooks/webhook.service.js';
import { sendDocAlert, sendDocExpired } from '../notifications/email.service.js';

async function getEntityName(entityType, entityId) {
  try {
    if (entityType === 'EXPAT') {
      const expat = await prisma.expat.findUnique({ where: { id: entityId }, select: { fullName: true } });
      return expat?.fullName || 'Unknown Expat';
    }
    if (entityType === 'CLIENT') {
      const client = await prisma.client.findUnique({ where: { id: entityId }, select: { name: true } });
      return client?.name || 'Unknown Client';
    }
    if (entityType === 'DORMITORY') {
      const dormitory = await prisma.dormitory.findUnique({ where: { id: entityId }, select: { name: true } });
      return dormitory?.name || 'Unknown Dormitory';
    }
  } catch {
    return 'Unknown';
  }
  return 'Unknown';
}

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
      data: { userId, type: 'DOC_EXPIRY', title, body, entityType, entityId },
    });
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}

async function runDocumentExpiryCheck() {
  try {
    const settings = await getSettings();
    const docAlertDays1 = settings.docAlertDays1 ?? 30;
    const docAlertDays2 = settings.docAlertDays2 ?? 7;
    const docAlertRecipients = settings.docAlertRecipients ?? [];
    const appName = settings.appName ?? 'ExpatFlow';

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);

    const docs = await prisma.document.findMany({
      where: {
        deletedAt: null,
        expiryDate: { gt: cutoff },
      },
    });

    const now = new Date();
    const alertUsers = await getUsersByRoles(docAlertRecipients);

    for (const doc of docs) {
      const daysUntilExpiry = Math.ceil((doc.expiryDate - now) / (1000 * 60 * 60 * 24));
      const entityName = await getEntityName(doc.entityType, doc.entityId);
      const expiryDateStr = doc.expiryDate.toISOString().split('T')[0];

      // Alert 1 (e.g. 30 days)
      if (daysUntilExpiry <= docAlertDays1 && daysUntilExpiry > 0 && !doc.alertSent1) {
        for (const user of alertUsers) {
          const email = user.email ? decrypt(user.email) : null;
          if (email) {
            try {
              await sendDocAlert({
                to: email,
                entityName,
                entityType: doc.entityType,
                docType: doc.documentType,
                expiryDate: expiryDateStr,
                daysLeft: daysUntilExpiry,
                appName,
              });
            } catch (err) {
              console.error(`sendDocAlert error for user ${user.id}:`, err.message);
            }
          }
          await createNotification(
            user.id,
            'Document Expiring Soon',
            `${doc.documentType} for ${entityName} expires in ${daysUntilExpiry} day(s) on ${expiryDateStr}`,
            'DOCUMENT',
            doc.id
          );
        }

        await prisma.document.update({ where: { id: doc.id }, data: { alertSent1: true } });

        fireWebhook('DOCUMENT_EXPIRING', {
          documentId: doc.id,
          documentType: doc.documentType,
          entityType: doc.entityType,
          entityId: doc.entityId,
          entityName,
          expiryDate: expiryDateStr,
          daysUntilExpiry,
          alertLevel: `${docAlertDays1}D`,
        });
      }

      // Alert 2 (e.g. 7 days)
      if (daysUntilExpiry <= docAlertDays2 && daysUntilExpiry > 0 && !doc.alertSent2) {
        for (const user of alertUsers) {
          const email = user.email ? decrypt(user.email) : null;
          if (email) {
            try {
              await sendDocAlert({
                to: email,
                entityName,
                entityType: doc.entityType,
                docType: doc.documentType,
                expiryDate: expiryDateStr,
                daysLeft: daysUntilExpiry,
                appName,
              });
            } catch (err) {
              console.error(`sendDocAlert error for user ${user.id}:`, err.message);
            }
          }
          await createNotification(
            user.id,
            'Document Expiring Very Soon',
            `URGENT: ${doc.documentType} for ${entityName} expires in ${daysUntilExpiry} day(s) on ${expiryDateStr}`,
            'DOCUMENT',
            doc.id
          );
        }

        await prisma.document.update({ where: { id: doc.id }, data: { alertSent2: true } });

        fireWebhook('DOCUMENT_EXPIRING', {
          documentId: doc.id,
          documentType: doc.documentType,
          entityType: doc.entityType,
          entityId: doc.entityId,
          entityName,
          expiryDate: expiryDateStr,
          daysUntilExpiry,
          alertLevel: `${docAlertDays2}D`,
        });
      }

      // Expired
      if (daysUntilExpiry <= 0 && !doc.alertSentExpired) {
        for (const user of alertUsers) {
          const email = user.email ? decrypt(user.email) : null;
          if (email) {
            try {
              await sendDocExpired({
                to: email,
                entityName,
                entityType: doc.entityType,
                docType: doc.documentType,
                expiryDate: expiryDateStr,
                appName,
              });
            } catch (err) {
              console.error(`sendDocExpired error for user ${user.id}:`, err.message);
            }
          }
          await createNotification(
            user.id,
            'Document Expired',
            `${doc.documentType} for ${entityName} expired on ${expiryDateStr}`,
            'DOCUMENT',
            doc.id
          );
        }

        // If EXPAT, update status to EXPIRED
        if (doc.entityType === 'EXPAT') {
          try {
            await prisma.expat.updateMany({
              where: { id: doc.entityId, deletedAt: null },
              data: { status: 'EXPIRED', statusUpdatedAt: new Date(), statusUpdatedBy: 'SYSTEM' },
            });
          } catch (err) {
            console.error('Error updating expat status to EXPIRED:', err.message);
          }
        }

        await prisma.document.update({ where: { id: doc.id }, data: { alertSentExpired: true } });

        fireWebhook('DOCUMENT_EXPIRED', {
          documentId: doc.id,
          documentType: doc.documentType,
          entityType: doc.entityType,
          entityId: doc.entityId,
          entityName,
          expiredOn: expiryDateStr,
        });
      }
    }
  } catch (err) {
    console.error('Document expiry job error:', err);
  }
}

export async function startDocumentExpiryJob() {
  console.log('Starting document expiry job...');
  // Run at 8am daily; timezone re-read each run from DB
  cron.schedule('0 8 * * *', runDocumentExpiryCheck);
  console.log('Document expiry job scheduled (0 8 * * *)');
}
