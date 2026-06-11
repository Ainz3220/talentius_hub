import { prisma } from '../../../config/db.js';
import { auditCreate, auditUpdate, auditDelete } from '../../../audit/audit.service.js';
import { getSettings } from '../../settings/settings.service.js';

async function nextClientNo(tx, type) {
  const prefix = type === 'COMPANY' ? 'COM' : 'IND';
  const last = await tx.client.findFirst({
    where: { clientNo: { startsWith: prefix } },
    orderBy: { clientNo: 'desc' },
    select: { clientNo: true },
  });
  const n = last ? parseInt(last.clientNo.replace(prefix, '')) + 1 : 1;
  return `${prefix}${String(n).padStart(4, '0')}`;
}

export async function listClients(query) {
  const { status, type, page = 1, limit } = query;
  const settings = await getSettings();
  const pageSize = parseInt(limit) || settings.defaultPageSize;
  const skip = (parseInt(page) - 1) * pageSize;

  const where = { deletedAt: null };
  if (status) where.status = status;
  if (type) where.type = type;

  const [clients, total] = await Promise.all([
    prisma.client.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
    prisma.client.count({ where }),
  ]);
  return { data: clients, total, page: parseInt(page), limit: pageSize };
}

export async function getClientById(id) {
  const c = await prisma.client.findUnique({ where: { id, deletedAt: null } });
  if (!c) throw Object.assign(new Error('Client not found'), { status: 404 });
  return c;
}

export async function createClient(data, createdBy, ipAddress, userAgent) {
  const clientNo = await nextClientNo(prisma, data.type);
  const c = await prisma.client.create({
    data: { ...data, clientNo, createdBy },
  });
  await auditCreate({ tableName: 'clients', recordId: c.id, data, performedBy: createdBy, ipAddress, userAgent });
  return c;
}

export async function updateClient(id, data, updatedBy, ipAddress, userAgent) {
  const old = await prisma.client.findUnique({ where: { id, deletedAt: null } });
  if (!old) throw Object.assign(new Error('Client not found'), { status: 404 });
  const updated = await prisma.client.update({ where: { id }, data });
  await auditUpdate({ tableName: 'clients', recordId: id, oldData: old, newData: updated, performedBy: updatedBy, ipAddress, userAgent });
  return updated;
}

export async function deleteClient(id, deletedBy, ipAddress, userAgent) {
  const c = await prisma.client.findUnique({ where: { id, deletedAt: null } });
  if (!c) throw Object.assign(new Error('Client not found'), { status: 404 });
  await prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditDelete({ tableName: 'clients', recordId: id, performedBy: deletedBy, ipAddress, userAgent });
}

export async function getClientExpats(clientId) {
  const expats = await prisma.expat.findMany({ where: { clientId, deletedAt: null } });
  return expats.map(e => ({ id: e.id, expatNo: e.expatNo, fullName: e.fullName, nationality: e.nationality, status: e.status, permitExpiry: e.permitExpiry }));
}
