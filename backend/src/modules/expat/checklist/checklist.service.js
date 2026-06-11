import { prisma } from '../../../config/db.js';
import { auditCreate, auditUpdate, auditDelete, writeAuditLog } from '../../../audit/audit.service.js';
import { getSettings } from '../../settings/settings.service.js';
import { fireWebhook } from '../../webhooks/webhook.service.js';

// ─── Template functions ───────────────────────────────────────────────────────

export async function listTemplates(query) {
  const { entityType, scope, isActive, page = 1, limit } = query;
  const settings = await getSettings();
  const pageSize = parseInt(limit) || settings.defaultPageSize;
  const skip = (parseInt(page) - 1) * pageSize;

  const where = { deletedAt: null };
  if (entityType) where.entityType = entityType;
  if (scope) where.scope = scope;
  if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;

  const [templates, total] = await Promise.all([
    prisma.checklistTemplate.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { items: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
    }),
    prisma.checklistTemplate.count({ where }),
  ]);

  return { data: templates, total, page: parseInt(page), limit: pageSize };
}

export async function getTemplateById(id) {
  const t = await prisma.checklistTemplate.findUnique({
    where: { id, deletedAt: null },
    include: { items: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
  });
  if (!t) throw Object.assign(new Error('Template not found'), { status: 404 });
  return t;
}

export async function createTemplate(data, createdBy, ipAddress, userAgent) {
  const { name, entityType, scope, description, items = [] } = data;

  const template = await prisma.checklistTemplate.create({
    data: { name, entityType, scope, description, isActive: true, createdBy },
  });

  if (items.length > 0) {
    await prisma.checklistTemplateItem.createMany({
      data: items.map((item) => ({
        templateId: template.id,
        itemText: item.itemText,
        order: item.order ?? 0,
        notes: item.notes,
      })),
    });
  }

  await auditCreate({ tableName: 'checklist_templates', recordId: template.id, data, performedBy: createdBy, ipAddress, userAgent });

  return getTemplateById(template.id);
}

export async function updateTemplate(id, data, updatedBy, ipAddress, userAgent) {
  const old = await prisma.checklistTemplate.findUnique({ where: { id, deletedAt: null } });
  if (!old) throw Object.assign(new Error('Template not found'), { status: 404 });

  const { items, ...templateData } = data;
  const updated = await prisma.checklistTemplate.update({ where: { id }, data: templateData });

  await auditUpdate({ tableName: 'checklist_templates', recordId: id, oldData: old, newData: updated, performedBy: updatedBy, ipAddress, userAgent });

  return getTemplateById(id);
}

export async function deleteTemplate(id, deletedBy, ipAddress, userAgent) {
  const t = await prisma.checklistTemplate.findUnique({ where: { id, deletedAt: null } });
  if (!t) throw Object.assign(new Error('Template not found'), { status: 404 });

  await prisma.checklistTemplate.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditDelete({ tableName: 'checklist_templates', recordId: id, performedBy: deletedBy, ipAddress, userAgent });
}

// ─── Template item functions ──────────────────────────────────────────────────

export async function addTemplateItem(templateId, data, createdBy) {
  const template = await prisma.checklistTemplate.findUnique({ where: { id: templateId, deletedAt: null } });
  if (!template) throw Object.assign(new Error('Template not found'), { status: 404 });

  return prisma.checklistTemplateItem.create({
    data: { templateId, itemText: data.itemText, order: data.order ?? 0, notes: data.notes },
  });
}

export async function updateTemplateItem(templateId, itemId, data, updatedBy) {
  const item = await prisma.checklistTemplateItem.findFirst({
    where: { id: itemId, templateId, deletedAt: null },
  });
  if (!item) throw Object.assign(new Error('Template item not found'), { status: 404 });

  return prisma.checklistTemplateItem.update({ where: { id: itemId }, data });
}

export async function deleteTemplateItem(templateId, itemId, deletedBy) {
  const item = await prisma.checklistTemplateItem.findFirst({
    where: { id: itemId, templateId, deletedAt: null },
  });
  if (!item) throw Object.assign(new Error('Template item not found'), { status: 404 });

  await prisma.checklistTemplateItem.update({ where: { id: itemId }, data: { deletedAt: new Date() } });
}

// ─── Checklist instance functions ─────────────────────────────────────────────

export async function listChecklists(query) {
  const { entityType, entityId, status, page = 1, limit } = query;
  const settings = await getSettings();
  const pageSize = parseInt(limit) || settings.defaultPageSize;
  const skip = (parseInt(page) - 1) * pageSize;

  const where = { deletedAt: null };
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (status) where.status = status;

  const [checklists, total] = await Promise.all([
    prisma.checklist.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { orderBy: { order: 'asc' } },
        _count: { select: { items: true } },
      },
    }),
    prisma.checklist.count({ where }),
  ]);

  return { data: checklists, total, page: parseInt(page), limit: pageSize };
}

export async function getChecklistById(id) {
  const c = await prisma.checklist.findUnique({
    where: { id, deletedAt: null },
    include: {
      items: { orderBy: { order: 'asc' } },
    },
  });
  if (!c) throw Object.assign(new Error('Checklist not found'), { status: 404 });
  return c;
}

export async function createChecklist(data, createdBy, ipAddress, userAgent) {
  const { templateId, entityType, entityId, name, scope } = data;

  let items = [];
  let templateScope;
  if (templateId) {
    const template = await prisma.checklistTemplate.findUnique({
      where: { id: templateId, deletedAt: null },
      include: { items: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
    });
    if (!template) throw Object.assign(new Error('Template not found'), { status: 404 });
    items = template.items;
    templateScope = template.scope;
  }

  const checklist = await prisma.checklist.create({
    data: {
      templateId,
      entityType,
      entityId,
      name,
      scope: scope || templateScope || 'CUSTOM',
      status: 'IN_PROGRESS',
      createdBy,
    },
  });

  if (items.length > 0) {
    await prisma.checklistItem.createMany({
      data: items.map((item) => ({
        checklistId: checklist.id,
        itemText: item.itemText,
        order: item.order,
        notes: item.notes,
        status: 'PENDING',
      })),
    });
  }

  await auditCreate({ tableName: 'checklists', recordId: checklist.id, data, performedBy: createdBy, ipAddress, userAgent });

  return getChecklistById(checklist.id);
}

export async function archiveChecklist(id, archivedBy, ipAddress, userAgent) {
  const c = await prisma.checklist.findUnique({ where: { id, deletedAt: null } });
  if (!c) throw Object.assign(new Error('Checklist not found'), { status: 404 });

  await prisma.checklist.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditDelete({ tableName: 'checklists', recordId: id, performedBy: archivedBy, ipAddress, userAgent });
}

// ─── Item functions ───────────────────────────────────────────────────────────

export async function updateChecklistItem(checklistId, itemId, data, updatedBy, ipAddress, userAgent) {
  const checklist = await prisma.checklist.findUnique({ where: { id: checklistId, deletedAt: null } });
  if (!checklist) throw Object.assign(new Error('Checklist not found'), { status: 404 });

  const item = await prisma.checklistItem.findFirst({ where: { id: itemId, checklistId } });
  if (!item) throw Object.assign(new Error('Checklist item not found'), { status: 404 });

  const updateData = {};

  if (data.status === 'DONE') {
    updateData.status = 'DONE';
    updateData.completedBy = updatedBy;
    updateData.completedAt = new Date();
  } else if (data.status === 'WAIVED') {
    updateData.status = 'WAIVED';
    updateData.waivedBy = updatedBy;
    updateData.waivedReason = data.waivedReason;
  } else if (data.status === 'PENDING') {
    updateData.status = 'PENDING';
    updateData.completedBy = null;
    updateData.completedAt = null;
    updateData.waivedBy = null;
    updateData.waivedReason = null;
  }

  if (data.notes !== undefined) updateData.notes = data.notes;

  const updated = await prisma.checklistItem.update({ where: { id: itemId }, data: updateData });

  await writeAuditLog({
    tableName: 'checklist_items',
    recordId: itemId,
    fieldName: 'status',
    valueFrom: item.status,
    valueTo: updateData.status || item.status,
    action: 'UPDATE',
    performedBy: updatedBy,
    ipAddress,
    userAgent,
  });

  // Check if all items are DONE or WAIVED
  const allItems = await prisma.checklistItem.findMany({ where: { checklistId } });
  const allFinished = allItems.every((i) => i.status === 'DONE' || i.status === 'WAIVED');

  if (allFinished && checklist.status !== 'COMPLETED') {
    await prisma.checklist.update({ where: { id: checklistId }, data: { status: 'COMPLETED' } });

    fireWebhook('CHECKLIST_COMPLETED', {
      checklistId,
      checklistName: checklist.name,
      entityType: checklist.entityType,
      entityId: checklist.entityId,
      totalItems: allItems.length,
      completedAt: new Date().toISOString(),
      completedBy: { id: updatedBy },
    });
  }

  return updated;
}
