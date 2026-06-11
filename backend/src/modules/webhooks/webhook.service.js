import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/db.js';
import { decrypt } from '../../config/encryption.js';
import { getSettings } from '../settings/settings.service.js';

function buildEnvelope(eventType, data, isTest = false) {
  return {
    id: uuidv4(),
    event: eventType,
    timestamp: new Date().toISOString(),
    appName: 'ExpatFlow',
    ...(isTest && { test: true }),
    data,
  };
}

function sign(payload, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

async function deliverWebhook(config, envelope, attemptNumber = 1) {
  const secret = decrypt(config.secret);
  const signature = sign(envelope, secret);
  const deliveryId = envelope.id;
  const start = Date.now();

  const headers = {
    'Content-Type': 'application/json',
    'X-ExpatFlow-Event': envelope.event,
    'X-ExpatFlow-Signature': signature,
    'X-ExpatFlow-Delivery': deliveryId,
    ...((config.headers && typeof config.headers === 'object') ? config.headers : {}),
  };

  let responseStatus = null;
  let responseBody = null;
  let success = false;
  let errorMessage = null;
  let durationMs = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(envelope),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    durationMs = Date.now() - start;
    responseStatus = response.status;
    responseBody = await response.text().catch(() => null);
    success = response.ok;
  } catch (err) {
    durationMs = Date.now() - start;
    errorMessage = err.message;
    success = false;
  }

  await prisma.webhookDeliveryLog.create({
    data: {
      webhookConfigId: config.id,
      eventType: envelope.event,
      payload: envelope,
      responseStatus,
      responseBody: responseBody?.slice(0, 2000),
      durationMs,
      success,
      attemptNumber,
      errorMessage,
    },
  });

  return success;
}

async function deliverWithRetry(config, envelope) {
  const maxAttempts = config.retryCount + 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const success = await deliverWebhook(config, envelope, attempt);
    if (success) return;
    if (attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, config.retryDelayMs));
    }
  }
}

export async function fireWebhook(eventType, data) {
  setImmediate(async () => {
    try {
      const configs = await prisma.webhookConfig.findMany({
        where: { eventType, isActive: true, deletedAt: null },
      });

      const settings = await getSettings();
      const envelope = buildEnvelope(eventType, { ...data, appName: settings.appName });

      await Promise.all(configs.map(config => deliverWithRetry(config, envelope)));
    } catch (err) {
      console.error('Webhook fire error:', err);
    }
  });
}

export async function testWebhook(configId, performedBy) {
  const config = await prisma.webhookConfig.findUnique({ where: { id: configId, deletedAt: null } });
  if (!config) throw Object.assign(new Error('Webhook not found'), { status: 404 });

  const sampleData = getSamplePayload(config.eventType);
  const envelope = buildEnvelope(config.eventType, sampleData, true);

  await deliverWebhook(config, envelope, 0);
  return { success: true };
}

function getSamplePayload(eventType) {
  const samples = {
    CHECKLIST_ITEM_OVERDUE: { checklistId: 'sample-id', checklistName: 'Expat Onboarding', entityType: 'EXPAT', entityId: 'sample-id', entityName: 'Sample Expat', itemId: 'sample-id', itemText: 'Sample item', overdueSince: new Date().toISOString(), overdueDays: 7 },
    CHECKLIST_COMPLETED: { checklistId: 'sample-id', checklistName: 'Expat Onboarding', entityType: 'EXPAT', entityId: 'sample-id', totalItems: 8, completedAt: new Date().toISOString(), completedBy: { id: 'sample-id', name: 'Sample User' } },
    DOCUMENT_EXPIRING: { documentId: 'sample-id', documentType: 'work_permit', entityType: 'EXPAT', entityId: 'sample-id', expiryDate: new Date().toISOString().split('T')[0], daysUntilExpiry: 7, alertLevel: '7D' },
    DOCUMENT_EXPIRED: { documentId: 'sample-id', documentType: 'work_permit', entityType: 'EXPAT', entityId: 'sample-id', expiredOn: new Date().toISOString().split('T')[0] },
    TRANSFER_REQUESTED: { transferId: 'sample-id', expatId: 'sample-id', changeType: 'BOTH', fromDormitory: 'Block A', toDormitory: 'Block C', fromClient: 'Apex', toClient: 'BuildCo', reason: 'Contract ended', requestedBy: { id: 'sample-id', name: 'Sample User' } },
    TRANSFER_APPROVED: { transferId: 'sample-id', expatId: 'sample-id', status: 'APPROVED', actionBy: { id: 'sample-id', name: 'Sample Manager' }, actionAt: new Date().toISOString(), rejectedReason: null },
    TRANSFER_REJECTED: { transferId: 'sample-id', expatId: 'sample-id', status: 'REJECTED', actionBy: { id: 'sample-id', name: 'Sample Manager' }, actionAt: new Date().toISOString(), rejectedReason: 'Invalid request' },
    EXPAT_STATUS_CHANGED: { expatId: 'sample-id', fromStatus: 'PENDING', toStatus: 'ACTIVE', changedBy: { id: 'sample-id', name: 'Sample User' }, changedAt: new Date().toISOString() },
    USER_CREATED: { userId: 'sample-id', role: 'STAFF', emailVerificationRequired: true, createdBy: { id: 'sample-id', name: 'Manager' } },
  };
  return samples[eventType] || {};
}
