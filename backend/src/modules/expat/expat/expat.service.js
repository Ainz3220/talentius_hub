import { prisma } from '../../../config/db.js';
import { auditCreate, auditUpdate, auditDelete } from '../../../audit/audit.service.js';
import { getSettings } from '../../settings/settings.service.js';
import { fireWebhook } from '../../webhooks/webhook.service.js';

async function nextExpatNo(tx) {
  const last = await tx.expat.findFirst({
    where: { expatNo: { not: null } },
    orderBy: { expatNo: 'desc' },
    select: { expatNo: true },
  });
  const n = last ? parseInt(last.expatNo.replace('EXP', '')) + 1 : 1;
  return `EXP${String(n).padStart(5, '0')}`;
}

export async function listExpats(query) {
  const { status, clientId, dormitoryId, expiringDays, page = 1, limit } = query;
  const settings = await getSettings();
  const pageSize = parseInt(limit) || settings.defaultPageSize;
  const skip = (parseInt(page) - 1) * pageSize;

  const where = { deletedAt: null };
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;
  if (dormitoryId) where.dormitoryId = dormitoryId;
  if (expiringDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + parseInt(expiringDays));
    where.permitExpiry = { lte: cutoff, gt: new Date() };
  }

  const [expats, total] = await Promise.all([
    prisma.expat.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
    prisma.expat.count({ where }),
  ]);

  return { data: expats, total, page: parseInt(page), limit: pageSize };
}

export async function getExpatById(id) {
  const e = await prisma.expat.findUnique({
    where: { id, deletedAt: null },
    include: {
      client: { select: { id: true, name: true } },
      dormitory: { select: { id: true, name: true } },
    },
  });
  if (!e) throw Object.assign(new Error('Expat not found'), { status: 404 });
  return e;
}

export async function createExpat(data, createdBy, ipAddress, userAgent) {
  const expatNo = await nextExpatNo(prisma);

  const expat = await prisma.expat.create({
    data: {
      ...data,
      expatNo,
      status: data.status || 'PENDING',
      permitExpiry: data.permitExpiry ? new Date(data.permitExpiry) : null,
      createdBy,
    },
  });

  // Auto-start all global EXPAT checklist templates
  const templates = await prisma.checklistTemplate.findMany({
    where: { scope: 'GLOBAL', entityType: 'EXPAT', isActive: true, deletedAt: null },
    include: { items: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
  });

  for (const template of templates) {
    const checklist = await prisma.checklist.create({
      data: {
        templateId: template.id,
        entityType: 'EXPAT',
        entityId: expat.id,
        name: template.name,
        scope: template.scope,
        status: 'IN_PROGRESS',
        createdBy,
      },
    });

    if (template.items.length > 0) {
      await prisma.checklistItem.createMany({
        data: template.items.map((item) => ({
          checklistId: checklist.id,
          itemText: item.itemText,
          order: item.order,
          notes: item.notes,
          status: 'PENDING',
        })),
      });
    }
  }

  await auditCreate({ tableName: 'expats', recordId: expat.id, data, performedBy: createdBy, ipAddress, userAgent });

  return expat;
}

export async function updateExpat(id, data, updatedBy, ipAddress, userAgent) {
  const old = await prisma.expat.findUnique({ where: { id, deletedAt: null } });
  if (!old) throw Object.assign(new Error('Expat not found'), { status: 404 });

  const update = { ...data };
  if (data.permitExpiry !== undefined) update.permitExpiry = data.permitExpiry ? new Date(data.permitExpiry) : null;

  const updated = await prisma.expat.update({ where: { id }, data: update });

  await auditUpdate({ tableName: 'expats', recordId: id, oldData: old, newData: updated, performedBy: updatedBy, ipAddress, userAgent });

  return updated;
}

export async function updateExpatStatus(id, newStatus, updatedBy, ipAddress, userAgent) {
  const expat = await prisma.expat.findUnique({ where: { id, deletedAt: null } });
  if (!expat) throw Object.assign(new Error('Expat not found'), { status: 404 });

  const fromStatus = expat.status;
  const updated = await prisma.expat.update({
    where: { id },
    data: { status: newStatus, statusUpdatedAt: new Date(), statusUpdatedBy: updatedBy },
  });

  await auditUpdate({
    tableName: 'expats',
    recordId: id,
    oldData: { status: fromStatus },
    newData: { status: newStatus },
    performedBy: updatedBy,
    ipAddress,
    userAgent,
  });

  fireWebhook('EXPAT_STATUS_CHANGED', {
    expatId: id,
    fromStatus,
    toStatus: newStatus,
    changedBy: { id: updatedBy },
    changedAt: new Date().toISOString(),
  });

  return updated;
}

export async function deleteExpat(id, deletedBy, ipAddress, userAgent) {
  const expat = await prisma.expat.findUnique({ where: { id, deletedAt: null } });
  if (!expat) throw Object.assign(new Error('Expat not found'), { status: 404 });
  await prisma.expat.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditDelete({ tableName: 'expats', recordId: id, performedBy: deletedBy, ipAddress, userAgent });
}
