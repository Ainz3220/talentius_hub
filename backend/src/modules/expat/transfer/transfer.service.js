import { prisma } from '../../../config/db.js';
import { auditCreate, auditUpdate } from '../../../audit/audit.service.js';
import { getSettings } from '../../settings/settings.service.js';
import { fireWebhook } from '../../webhooks/webhook.service.js';

async function enrichTransfers(transfers) {
  if (!transfers.length) return transfers;

  // Collect all client IDs referenced
  const clientIds = [...new Set(
    transfers.flatMap(t => [t.fromClientId, t.toClientId]).filter(Boolean)
  )];

  const clients = clientIds.length
    ? await prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } })
    : [];
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  return transfers.map(t => ({
    ...t,
    fromClient: t.fromClientId ? (clientMap[t.fromClientId] ?? { id: t.fromClientId, name: null }) : null,
    toClient: t.toClientId ? (clientMap[t.toClientId] ?? { id: t.toClientId, name: null }) : null,
  }));
}

const BASE_INCLUDE = {
  expat: { select: { id: true, nationality: true } },
  fromDormitory: { select: { id: true, name: true } },
  toDormitory: { select: { id: true, name: true } },
};

export async function listTransfers(query) {
  const { status, expatId, page = 1, limit } = query;
  const settings = await getSettings();
  const pageSize = parseInt(limit) || settings.defaultPageSize;
  const skip = (parseInt(page) - 1) * pageSize;

  const where = { deletedAt: null };
  if (status) where.status = status;
  if (expatId) where.expatId = expatId;

  const [transfers, total] = await Promise.all([
    prisma.expatTransfer.findMany({
      where, skip, take: pageSize, orderBy: { createdAt: 'desc' },
      include: BASE_INCLUDE,
    }),
    prisma.expatTransfer.count({ where }),
  ]);

  return { data: await enrichTransfers(transfers), total, page: parseInt(page), limit: pageSize };
}

export async function getTransferById(id) {
  const t = await prisma.expatTransfer.findUnique({
    where: { id },
    include: BASE_INCLUDE,
  });
  if (!t) throw Object.assign(new Error('Transfer not found'), { status: 404 });
  const [enriched] = await enrichTransfers([t]);
  return enriched;
}

export async function createTransfer(data, requestedBy, ipAddress, userAgent) {
  const { expatId, fromDormitoryId, toDormitoryId, fromClientId, toClientId, reason, effectiveDate } = data;

  if (!expatId) throw Object.assign(new Error('expatId is required'), { status: 400 });
  if (!reason) throw Object.assign(new Error('reason is required'), { status: 400 });

  const expat = await prisma.expat.findUnique({ where: { id: expatId, deletedAt: null } });
  if (!expat) throw Object.assign(new Error('Expat not found'), { status: 404 });

  const transfer = await prisma.expatTransfer.create({
    data: {
      expatId,
      fromDormitoryId: fromDormitoryId || expat.dormitoryId,
      toDormitoryId: toDormitoryId || null,
      fromClientId: fromClientId || expat.clientId,
      toClientId: toClientId || null,
      reason,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
      status: 'PENDING',
      requestedBy,
    },
  });

  await auditCreate({
    tableName: 'expat_transfers',
    recordId: transfer.id,
    data: { expatId, reason, status: 'PENDING' },
    performedBy: requestedBy,
    ipAddress,
    userAgent,
  });

  fireWebhook('TRANSFER_REQUESTED', {
    transferId: transfer.id,
    expatId,
    fromDormitoryId: transfer.fromDormitoryId,
    toDormitoryId: transfer.toDormitoryId,
    fromClientId: transfer.fromClientId,
    toClientId: transfer.toClientId,
    reason,
    requestedBy: { id: requestedBy },
  });

  return transfer;
}

export async function approveTransfer(id, approvedBy, ipAddress, userAgent) {
  const transfer = await prisma.expatTransfer.findUnique({ where: { id } });
  if (!transfer) throw Object.assign(new Error('Transfer not found'), { status: 404 });
  if (transfer.status !== 'PENDING') throw Object.assign(new Error('Transfer is not pending'), { status: 400 });

  const updated = await prisma.expatTransfer.update({
    where: { id },
    data: { status: 'APPROVED', approvedBy, approvedAt: new Date() },
  });

  // Apply transfer to expat record
  const expatUpdate = {};
  if (transfer.toDormitoryId) expatUpdate.dormitoryId = transfer.toDormitoryId;
  if (transfer.toClientId) expatUpdate.clientId = transfer.toClientId;
  if (Object.keys(expatUpdate).length > 0) {
    await prisma.expat.update({ where: { id: transfer.expatId }, data: expatUpdate });
  }

  await auditUpdate({
    tableName: 'expat_transfers',
    recordId: id,
    oldData: { status: 'PENDING' },
    newData: { status: 'APPROVED', approvedBy },
    performedBy: approvedBy,
    ipAddress,
    userAgent,
  });

  fireWebhook('TRANSFER_APPROVED', {
    transferId: id,
    expatId: transfer.expatId,
    status: 'APPROVED',
    actionBy: { id: approvedBy },
    actionAt: new Date().toISOString(),
    rejectedReason: null,
  });

  return updated;
}

export async function rejectTransfer(id, rejectedBy, rejectedReason, ipAddress, userAgent) {
  const transfer = await prisma.expatTransfer.findUnique({ where: { id } });
  if (!transfer) throw Object.assign(new Error('Transfer not found'), { status: 404 });
  if (transfer.status !== 'PENDING') throw Object.assign(new Error('Transfer is not pending'), { status: 400 });

  const updated = await prisma.expatTransfer.update({
    where: { id },
    data: { status: 'REJECTED', rejectedBy, rejectedReason },
  });

  await auditUpdate({
    tableName: 'expat_transfers',
    recordId: id,
    oldData: { status: 'PENDING' },
    newData: { status: 'REJECTED', rejectedBy, rejectedReason },
    performedBy: rejectedBy,
    ipAddress,
    userAgent,
  });

  fireWebhook('TRANSFER_REJECTED', {
    transferId: id,
    expatId: transfer.expatId,
    status: 'REJECTED',
    actionBy: { id: rejectedBy },
    actionAt: new Date().toISOString(),
    rejectedReason,
  });

  return updated;
}

export async function getExpatTransfers(expatId) {
  const expat = await prisma.expat.findUnique({ where: { id: expatId, deletedAt: null } });
  if (!expat) throw Object.assign(new Error('Expat not found'), { status: 404 });

  const transfers = await prisma.expatTransfer.findMany({
    where: { expatId },
    orderBy: { createdAt: 'desc' },
    include: {
      fromDormitory: { select: { id: true, name: true } },
      toDormitory: { select: { id: true, name: true } },
    },
  });

  return enrichTransfers(transfers);
}
