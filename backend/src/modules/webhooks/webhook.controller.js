import { z } from 'zod';
import { prisma } from '../../config/db.js';
import { encrypt } from '../../config/encryption.js';
import { testWebhook } from './webhook.service.js';
import { auditCreate, auditUpdate, auditDelete } from '../../audit/audit.service.js';

const createSchema = z.object({
  name: z.string().min(1),
  eventType: z.enum(['CHECKLIST_ITEM_OVERDUE','CHECKLIST_COMPLETED','DOCUMENT_EXPIRING','DOCUMENT_EXPIRED','TRANSFER_REQUESTED','TRANSFER_APPROVED','TRANSFER_REJECTED','EXPAT_STATUS_CHANGED','USER_CREATED']),
  url: z.string().url().startsWith('https://'),
  secret: z.string().min(8),
  isActive: z.boolean().default(true),
  headers: z.record(z.string()).optional(),
  retryCount: z.number().int().min(0).max(5).default(3),
  retryDelayMs: z.number().int().min(500).max(10000).default(2000),
});

function formatConfig(c) {
  if (!c) return null;
  return { ...c, secret: '••••••••', url: c.url };
}

export async function listWebhooksHandler(req, res, next) {
  try {
    const configs = await prisma.webhookConfig.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } });
    res.json(configs.map(formatConfig));
  } catch (err) { next(err); }
}

export async function getWebhookHandler(req, res, next) {
  try {
    const c = await prisma.webhookConfig.findUnique({ where: { id: req.params.id, deletedAt: null } });
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(formatConfig(c));
  } catch (err) { next(err); }
}

export async function createWebhookHandler(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const c = await prisma.webhookConfig.create({
      data: { ...data, secret: encrypt(data.secret), createdBy: req.user.id },
    });
    await auditCreate({ tableName: 'webhook_configs', recordId: c.id, data: { ...data, secret: '[ENCRYPTED]' }, performedBy: req.user.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    res.status(201).json(formatConfig(c));
  } catch (err) { next(err); }
}

export async function updateWebhookHandler(req, res, next) {
  try {
    const old = await prisma.webhookConfig.findUnique({ where: { id: req.params.id, deletedAt: null } });
    if (!old) return res.status(404).json({ error: 'Not found' });
    const data = createSchema.partial().parse(req.body);
    if (data.secret) data.secret = encrypt(data.secret);
    const updated = await prisma.webhookConfig.update({ where: { id: req.params.id }, data });
    await auditUpdate({ tableName: 'webhook_configs', recordId: req.params.id, oldData: old, newData: updated, performedBy: req.user.id, ipAddress: req.ip, userAgent: req.headers['user-agent'], encryptedFields: ['secret'] });
    res.json(formatConfig(updated));
  } catch (err) { next(err); }
}

export async function deleteWebhookHandler(req, res, next) {
  try {
    const c = await prisma.webhookConfig.findUnique({ where: { id: req.params.id, deletedAt: null } });
    if (!c) return res.status(404).json({ error: 'Not found' });
    await prisma.webhookConfig.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    await auditDelete({ tableName: 'webhook_configs', recordId: req.params.id, performedBy: req.user.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function testWebhookHandler(req, res, next) {
  try {
    const result = await testWebhook(req.params.id, req.user.id);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getLogsHandler(req, res, next) {
  try {
    const { page = '1', limit = '25' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      prisma.webhookDeliveryLog.findMany({
        where: { webhookConfigId: req.params.id },
        orderBy: { sentAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.webhookDeliveryLog.count({ where: { webhookConfigId: req.params.id } }),
    ]);
    res.json({ data: logs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
}

export async function getLogHandler(req, res, next) {
  try {
    const log = await prisma.webhookDeliveryLog.findUnique({ where: { id: req.params.logId } });
    if (!log) return res.status(404).json({ error: 'Not found' });
    res.json(log);
  } catch (err) { next(err); }
}
