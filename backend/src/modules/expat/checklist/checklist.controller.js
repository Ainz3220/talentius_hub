import prisma from '../../../config/db.js';
import { z } from 'zod';
import { logCreate, logUpdate } from '../../../audit/audit.service.js';
import { decrypt } from '../../../config/encryption.js';

async function enrichItemsWithUsers(checklists) {
  const userIds = new Set();
  for (const cl of checklists) {
    for (const item of cl.items || []) {
      if (item.completedBy) userIds.add(item.completedBy);
      if (item.waivedBy) userIds.add(item.waivedBy);
    }
  }
  if (!userIds.size) return checklists;
  const users = await prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, name: true, emailEncrypted: true } });
  const userMap = Object.fromEntries(users.map(u => [u.id, u.name || decrypt(u.emailEncrypted)]));
  return checklists.map(cl => ({
    ...cl,
    items: (cl.items || []).map(item => ({
      ...item,
      completedByName: item.completedBy ? userMap[item.completedBy] : null,
      waivedByName: item.waivedBy ? userMap[item.waivedBy] : null,
    })),
  }));
}

// ── Templates ──────────────────────────────────────
export async function listTemplates(req, res, next) {
  try {
    const templates = await prisma.checklistTemplate.findMany({
      include: { items: { orderBy: { order: 'asc' } }, _count: { select: { checklists: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  } catch (err) { next(err); }
}

export async function createTemplate(req, res, next) {
  try {
    const data = z.object({
      name: z.string().min(1),
      entityType: z.enum(['EXPAT', 'CLIENT', 'DORMITORY']),
      scope: z.enum(['GLOBAL', 'CUSTOM']).default('GLOBAL'),
    }).parse(req.body);
    const template = await prisma.checklistTemplate.create({ data });
    res.status(201).json(template);
  } catch (err) { next(err); }
}

export async function updateTemplate(req, res, next) {
  try {
    const data = z.object({
      name: z.string().optional(),
      isActive: z.boolean().optional(),
      scope: z.enum(['GLOBAL', 'CUSTOM']).optional(),
    }).parse(req.body);
    const template = await prisma.checklistTemplate.update({ where: { id: req.params.id }, data });
    res.json(template);
  } catch (err) { next(err); }
}

export async function deleteTemplate(req, res, next) {
  try {
    await prisma.checklistTemplate.delete({ where: { id: req.params.id } });
    res.json({ message: 'Template deleted' });
  } catch (err) { next(err); }
}

export async function addTemplateItem(req, res, next) {
  try {
    const { itemText, notes } = z.object({ itemText: z.string().min(1), notes: z.string().optional() }).parse(req.body);
    const count = await prisma.checklistTemplateItem.count({ where: { templateId: req.params.id } });
    const item = await prisma.checklistTemplateItem.create({
      data: { templateId: req.params.id, itemText, notes, order: count + 1 },
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
}

export async function updateTemplateItem(req, res, next) {
  try {
    const data = z.object({ itemText: z.string().optional(), notes: z.string().optional(), order: z.number().optional() }).parse(req.body);
    const item = await prisma.checklistTemplateItem.update({ where: { id: req.params.itemId }, data });
    res.json(item);
  } catch (err) { next(err); }
}

export async function deleteTemplateItem(req, res, next) {
  try {
    await prisma.checklistTemplateItem.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Item deleted' });
  } catch (err) { next(err); }
}

function applyOverdue(checklists, overdueDays) {
  if (overdueDays == null) return checklists.map(cl => ({ ...cl, isOverdue: false }));
  const now = Date.now();
  const threshold = overdueDays * 86400000;
  return checklists.map(cl => {
    const overdue = cl.status === 'IN_PROGRESS' && (now - new Date(cl.createdAt).getTime()) > threshold;
    const overdueSinceDate = overdue ? new Date(new Date(cl.createdAt).getTime() + threshold) : null;
    return {
      ...cl,
      isOverdue: overdue,
      items: (cl.items || []).map(item => ({
        ...item,
        overdueSince: item.status === 'PENDING' && overdue ? overdueSinceDate : (item.overdueSince ?? null),
      })),
    };
  });
}

// ── Instances ──────────────────────────────────────
export async function listChecklists(req, res, next) {
  try {
    const { entityType, entityId, status } = req.query;
    const where = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (status) where.status = status;
    const [checklists, s] = await Promise.all([
      prisma.checklist.findMany({
        where,
        include: {
          items: { orderBy: { order: 'asc' } },
          template: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.systemSettings.findUnique({ where: { id: 'system' } }),
    ]);
    const enriched = await enrichItemsWithUsers(checklists);
    res.json(applyOverdue(enriched, s?.checklistOverdueDays));
  } catch (err) { next(err); }
}

export async function getChecklist(req, res, next) {
  try {
    const [checklist, s] = await Promise.all([
      prisma.checklist.findUnique({
        where: { id: req.params.id },
        include: { items: { orderBy: { order: 'asc' } }, template: true },
      }),
      prisma.systemSettings.findUnique({ where: { id: 'system' } }),
    ]);
    if (!checklist) return res.status(404).json({ error: 'Checklist not found' });
    const [enriched] = await enrichItemsWithUsers([checklist]);
    const [result] = applyOverdue([enriched], s?.checklistOverdueDays);
    res.json(result);
  } catch (err) { next(err); }
}

export async function createChecklist(req, res, next) {
  try {
    const data = z.object({
      templateId: z.string().optional(),
      entityType: z.enum(['EXPAT', 'CLIENT', 'DORMITORY']),
      entityId: z.string(),
      name: z.string().min(1),
    }).parse(req.body);

    const checklist = await prisma.checklist.create({ data });

    if (data.templateId) {
      const items = await prisma.checklistTemplateItem.findMany({
        where: { templateId: data.templateId },
        orderBy: { order: 'asc' },
      });
      await prisma.checklistItem.createMany({
        data: items.map(i => ({ checklistId: checklist.id, itemText: i.itemText, order: i.order, status: 'PENDING' })),
      });
    }

    await logCreate('checklists', checklist, req);
    res.status(201).json(checklist);
  } catch (err) { next(err); }
}

export async function archiveChecklist(req, res, next) {
  try {
    const checklist = await prisma.checklist.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' },
    });
    res.json(checklist);
  } catch (err) { next(err); }
}

export async function updateItem(req, res, next) {
  try {
    const { status, waivedReason } = z.object({
      status: z.enum(['PENDING', 'DONE', 'WAIVED']),
      waivedReason: z.string().optional(),
    }).parse(req.body);

    const existing = await prisma.checklistItem.findUnique({ where: { id: req.params.itemId } });
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    const updateData = { status };
    if (status === 'DONE') {
      updateData.completedBy = req.user.id;
      updateData.completedAt = new Date();
    } else if (status === 'WAIVED') {
      updateData.waivedBy = req.user.id;
      updateData.waivedReason = waivedReason || null;
    } else {
      updateData.completedBy = null;
      updateData.completedAt = null;
    }

    const item = await prisma.checklistItem.update({ where: { id: req.params.itemId }, data: updateData });
    await logUpdate('checklist_items', item.id, { status: { from: existing.status, to: status } }, req);

    // Auto-complete checklist if all items done/waived
    const checklist = await prisma.checklist.findUnique({
      where: { id: existing.checklistId },
      include: { items: true },
    });
    const allDone = checklist.items.every(i =>
      (i.id === item.id ? status : i.status) === 'DONE' || (i.id === item.id ? status : i.status) === 'WAIVED'
    );
    if (allDone && checklist.status === 'IN_PROGRESS') {
      await prisma.checklist.update({ where: { id: checklist.id }, data: { status: 'COMPLETED' } });
    }

    res.json(item);
  } catch (err) { next(err); }
}
