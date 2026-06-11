import { prisma } from '../../../config/db.js';
import { encrypt, decrypt } from '../../../config/encryption.js';
import { auditCreate, auditUpdate, auditDelete } from '../../../audit/audit.service.js';
import { getSettings } from '../../settings/settings.service.js';

const ENCRYPTED_FIELDS = ['registrationNo', 'contactName', 'contactPhone', 'contactEmail', 'address'];

function formatClient(c) {
  if (!c) return null;
  return {
    id: c.id,
    type: c.type,
    name: c.name,
    registrationNo: c.registrationNo ? decrypt(c.registrationNo) : null,
    contactName: c.contactName ? decrypt(c.contactName) : null,
    contactPhone: c.contactPhone ? decrypt(c.contactPhone) : null,
    contactEmail: c.contactEmail ? decrypt(c.contactEmail) : null,
    address: c.address ? decrypt(c.address) : null,
    status: c.status,
    createdBy: c.createdBy,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    deletedAt: c.deletedAt,
  };
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
  return { data: clients.map(c => formatClient(c)), total, page: parseInt(page), limit: pageSize };
}

export async function getClientById(id) {
  const c = await prisma.client.findUnique({ where: { id, deletedAt: null } });
  if (!c) throw Object.assign(new Error('Client not found'), { status: 404 });
  return formatClient(c);
}

export async function createClient(data, createdBy, ipAddress, userAgent) {
  const c = await prisma.client.create({
    data: {
      ...data,
      registrationNo: data.registrationNo ? encrypt(data.registrationNo) : null,
      contactName: encrypt(data.contactName),
      contactPhone: encrypt(data.contactPhone),
      contactEmail: encrypt(data.contactEmail),
      address: data.address ? encrypt(data.address) : null,
      createdBy,
    },
  });
  await auditCreate({ tableName: 'clients', recordId: c.id, data: { ...data, registrationNo: '[ENCRYPTED]', contactName: '[ENCRYPTED]', contactPhone: '[ENCRYPTED]', contactEmail: '[ENCRYPTED]', address: '[ENCRYPTED]' }, performedBy: createdBy, ipAddress, userAgent });
  return formatClient(c);
}

export async function updateClient(id, data, updatedBy, ipAddress, userAgent) {
  const old = await prisma.client.findUnique({ where: { id, deletedAt: null } });
  if (!old) throw Object.assign(new Error('Client not found'), { status: 404 });

  const update = { ...data };
  if (data.registrationNo !== undefined) update.registrationNo = data.registrationNo ? encrypt(data.registrationNo) : null;
  if (data.contactName !== undefined) update.contactName = encrypt(data.contactName);
  if (data.contactPhone !== undefined) update.contactPhone = encrypt(data.contactPhone);
  if (data.contactEmail !== undefined) update.contactEmail = encrypt(data.contactEmail);
  if (data.address !== undefined) update.address = data.address ? encrypt(data.address) : null;

  const updated = await prisma.client.update({ where: { id }, data: update });
  await auditUpdate({ tableName: 'clients', recordId: id, oldData: old, newData: updated, performedBy: updatedBy, ipAddress, userAgent, encryptedFields: ENCRYPTED_FIELDS });
  return formatClient(updated);
}

export async function deleteClient(id, deletedBy, ipAddress, userAgent) {
  const c = await prisma.client.findUnique({ where: { id, deletedAt: null } });
  if (!c) throw Object.assign(new Error('Client not found'), { status: 404 });
  await prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditDelete({ tableName: 'clients', recordId: id, performedBy: deletedBy, ipAddress, userAgent });
}

export async function getClientExpats(clientId) {
  const expats = await prisma.expat.findMany({ where: { clientId, deletedAt: null } });
  return expats.map(e => ({ id: e.id, fullName: e.fullName ? decrypt(e.fullName) : null, nationality: e.nationality, status: e.status, permitExpiry: e.permitExpiry }));
}

export async function revealClientField(id, fieldName, performedBy, ipAddress, userAgent) {
  const allowed = ['registrationNo', 'contactName', 'contactPhone', 'contactEmail', 'address'];
  if (!allowed.includes(fieldName)) throw Object.assign(new Error('Invalid field'), { status: 400 });

  const c = await prisma.client.findUnique({ where: { id, deletedAt: null } });
  if (!c) throw Object.assign(new Error('Client not found'), { status: 404 });

  const value = c[fieldName] ? decrypt(c[fieldName]) : null;

  await prisma.auditLog.create({
    data: { tableName: 'clients', recordId: id, fieldName, valueFrom: null, valueTo: '[REVEALED]', action: 'UPDATE', performedBy, ipAddress, userAgent },
  });

  return { value };
}
