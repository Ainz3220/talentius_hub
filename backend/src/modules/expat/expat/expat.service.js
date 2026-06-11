import { prisma } from '../../../config/db.js';
import { encrypt, decrypt } from '../../../config/encryption.js';
import { auditCreate, auditUpdate, auditDelete, writeAuditLog } from '../../../audit/audit.service.js';
import { getSettings } from '../../settings/settings.service.js';
import { fireWebhook } from '../../webhooks/webhook.service.js';

const ENCRYPTED_FIELDS = ['fullName', 'passportNo', 'dateOfBirth', 'phone'];


function decryptExpat(e) {
  return {
    ...e,
    fullName: e.fullName ? decrypt(e.fullName) : null,
    passportNo: e.passportNo ? decrypt(e.passportNo) : null,
    dateOfBirth: e.dateOfBirth ? decrypt(e.dateOfBirth) : null,
    phone: e.phone ? decrypt(e.phone) : null,
  };
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

  return { data: expats.map(decryptExpat), total, page: parseInt(page), limit: pageSize };
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
  return decryptExpat(e);
}

export async function createExpat(data, createdBy, ipAddress, userAgent) {
  const encryptedData = {
    ...data,
    fullName: data.fullName ? encrypt(data.fullName) : null,
    passportNo: data.passportNo ? encrypt(data.passportNo) : null,
    dateOfBirth: data.dateOfBirth ? encrypt(data.dateOfBirth) : null,
    phone: data.phone ? encrypt(data.phone) : null,
    status: data.status || 'PENDING',
    permitExpiry: data.permitExpiry ? new Date(data.permitExpiry) : null,
    createdBy,
  };

  const expat = await prisma.expat.create({ data: encryptedData });

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

  await auditCreate({
    tableName: 'expats',
    recordId: expat.id,
    data: { ...data, fullName: '[ENCRYPTED]', passportNo: '[ENCRYPTED]', dateOfBirth: '[ENCRYPTED]', phone: '[ENCRYPTED]' },
    performedBy: createdBy,
    ipAddress,
    userAgent,
  });

  return decryptExpat(expat);
}

export async function updateExpat(id, data, updatedBy, ipAddress, userAgent) {
  const old = await prisma.expat.findUnique({ where: { id, deletedAt: null } });
  if (!old) throw Object.assign(new Error('Expat not found'), { status: 404 });

  const update = { ...data };
  if (data.fullName !== undefined) update.fullName = data.fullName ? encrypt(data.fullName) : null;
  if (data.passportNo !== undefined) update.passportNo = data.passportNo ? encrypt(data.passportNo) : null;
  if (data.dateOfBirth !== undefined) update.dateOfBirth = data.dateOfBirth ? encrypt(data.dateOfBirth) : null;
  if (data.phone !== undefined) update.phone = data.phone ? encrypt(data.phone) : null;
  if (data.permitExpiry !== undefined) update.permitExpiry = data.permitExpiry ? new Date(data.permitExpiry) : null;

  const updated = await prisma.expat.update({ where: { id }, data: update });

  await auditUpdate({
    tableName: 'expats',
    recordId: id,
    oldData: old,
    newData: updated,
    performedBy: updatedBy,
    ipAddress,
    userAgent,
    encryptedFields: ENCRYPTED_FIELDS,
  });

  return decryptExpat(updated);
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

  return decryptExpat(updated);
}

export async function deleteExpat(id, deletedBy, ipAddress, userAgent) {
  const expat = await prisma.expat.findUnique({ where: { id, deletedAt: null } });
  if (!expat) throw Object.assign(new Error('Expat not found'), { status: 404 });
  await prisma.expat.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditDelete({ tableName: 'expats', recordId: id, performedBy: deletedBy, ipAddress, userAgent });
}

export async function revealExpatField(id, fieldName, performedBy, ipAddress, userAgent) {
  const allowed = ['fullName', 'passportNo', 'dateOfBirth', 'phone'];
  if (!allowed.includes(fieldName)) throw Object.assign(new Error('Invalid field'), { status: 400 });

  const expat = await prisma.expat.findUnique({ where: { id, deletedAt: null } });
  if (!expat) throw Object.assign(new Error('Expat not found'), { status: 404 });

  const value = expat[fieldName] ? decrypt(expat[fieldName]) : null;

  await writeAuditLog({
    tableName: 'expats',
    recordId: id,
    fieldName,
    valueFrom: null,
    valueTo: '[REVEALED]',
    action: 'UPDATE',
    performedBy,
    ipAddress,
    userAgent,
  });

  return { value };
}
