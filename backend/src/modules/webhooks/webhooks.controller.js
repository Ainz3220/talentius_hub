import prisma from '../../config/db.js';
import { z } from 'zod';
import fetch from 'node:http';

const schema = z.object({
  name: z.string().min(1),
  eventType: z.string().min(1),
  url: z.string().url(),
  secret: z.string().optional(),
  retryCount: z.number().int().min(0).max(5).default(3),
  isActive: z.boolean().default(true),
});

export async function list(req, res, next) {
  try {
    const hooks = await prisma.webhookConfig.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(hooks);
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const data = schema.parse(req.body);
    const hook = await prisma.webhookConfig.create({ data });
    res.status(201).json(hook);
  } catch (err) { next(err); }
}

export async function get(req, res, next) {
  try {
    const hook = await prisma.webhookConfig.findUnique({ where: { id: req.params.id } });
    if (!hook) return res.status(404).json({ error: 'Webhook not found' });
    res.json(hook);
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const data = schema.partial().parse(req.body);
    const hook = await prisma.webhookConfig.update({ where: { id: req.params.id }, data });
    res.json(hook);
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    await prisma.webhookConfig.delete({ where: { id: req.params.id } });
    res.json({ message: 'Webhook deleted' });
  } catch (err) { next(err); }
}

export async function test(req, res, next) {
  try {
    const hook = await prisma.webhookConfig.findUnique({ where: { id: req.params.id } });
    if (!hook) return res.status(404).json({ error: 'Webhook not found' });

    const payload = { event: hook.eventType, test: true, timestamp: new Date().toISOString() };
    let success = false;
    let statusCode = null;
    let response = null;

    try {
      const r = await globalThis.fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(hook.secret ? { 'X-Webhook-Secret': hook.secret } : {}) },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      statusCode = r.status;
      response = await r.text();
      success = r.ok;
    } catch (e) {
      response = e.message;
    }

    await prisma.webhookDeliveryLog.create({
      data: { webhookId: hook.id, eventType: hook.eventType, payload, statusCode, response, success, attempts: 1 },
    });

    res.json({ success, statusCode, response });
  } catch (err) { next(err); }
}

export async function logs(req, res, next) {
  try {
    const deliveries = await prisma.webhookDeliveryLog.findMany({
      where: { webhookId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(deliveries);
  } catch (err) { next(err); }
}
