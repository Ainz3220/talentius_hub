import { prisma } from '../../../config/db.js';
import { auditCreate, auditUpdate, auditDelete } from '../../../audit/audit.service.js';
import { getSettings } from '../../settings/settings.service.js';

const ACTIVE_EXPAT_STATUSES = ['PENDING', 'ACTIVE'];

async function nextDormitoryNo(tx) {
  const last = await tx.dormitory.findFirst({
    where: { dormitoryNo: { not: null } },
    orderBy: { dormitoryNo: 'desc' },
    select: { dormitoryNo: true },
  });
  const n = last ? parseInt(last.dormitoryNo.replace('DOR', '')) + 1 : 1;
  return `DOR${String(n).padStart(4, '0')}`;
}

export async function listDormitories(query) {
  const { status, state, page = 1, limit } = query;
  const settings = await getSettings();
  const pageSize = parseInt(limit) || settings.defaultPageSize;
  const skip = (parseInt(page) - 1) * pageSize;

  const where = { deletedAt: null };
  if (status) where.status = status;
  if (state) where.state = { contains: state, mode: 'insensitive' };

  const [dormitories, total] = await Promise.all([
    prisma.dormitory.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
    prisma.dormitory.count({ where }),
  ]);

  const data = await Promise.all(
    dormitories.map(async (d) => {
      const occupantCount = await prisma.expat.count({
        where: { dormitoryId: d.id, deletedAt: null, status: { in: ACTIVE_EXPAT_STATUSES } },
      });
      return { ...d, occupantCount };
    })
  );

  return { data, total, page: parseInt(page), limit: pageSize };
}

export async function getDormitoryById(id) {
  const d = await prisma.dormitory.findUnique({ where: { id, deletedAt: null } });
  if (!d) throw Object.assign(new Error('Dormitory not found'), { status: 404 });
  const occupantCount = await prisma.expat.count({
    where: { dormitoryId: id, deletedAt: null, status: { in: ACTIVE_EXPAT_STATUSES } },
  });
  return { ...d, occupantCount };
}

export async function createDormitory(data, createdBy, ipAddress, userAgent) {
  const dormitoryNo = await nextDormitoryNo(prisma);
  const d = await prisma.dormitory.create({ data: { ...data, dormitoryNo, createdBy } });
  await auditCreate({ tableName: 'dormitories', recordId: d.id, data, performedBy: createdBy, ipAddress, userAgent });
  return d;
}

export async function updateDormitory(id, data, updatedBy, ipAddress, userAgent) {
  const old = await prisma.dormitory.findUnique({ where: { id, deletedAt: null } });
  if (!old) throw Object.assign(new Error('Dormitory not found'), { status: 404 });
  const updated = await prisma.dormitory.update({ where: { id }, data });
  await auditUpdate({ tableName: 'dormitories', recordId: id, oldData: old, newData: updated, performedBy: updatedBy, ipAddress, userAgent });
  return updated;
}

export async function deleteDormitory(id, deletedBy, ipAddress, userAgent) {
  const d = await prisma.dormitory.findUnique({ where: { id, deletedAt: null } });
  if (!d) throw Object.assign(new Error('Dormitory not found'), { status: 404 });
  await prisma.dormitory.update({ where: { id }, data: { deletedAt: new Date() } });
  await auditDelete({ tableName: 'dormitories', recordId: id, performedBy: deletedBy, ipAddress, userAgent });
}

export async function assignClient(dormitoryId, clientId, assignedBy, note) {
  const dormitory = await prisma.dormitory.findUnique({ where: { id: dormitoryId, deletedAt: null } });
  if (!dormitory) throw Object.assign(new Error('Dormitory not found'), { status: 404 });

  const existing = await prisma.dormitoryAssignment.findFirst({
    where: { dormitoryId, clientId, removedAt: null },
  });
  if (existing) throw Object.assign(new Error('Client already assigned to this dormitory'), { status: 409 });

  return prisma.dormitoryAssignment.create({
    data: { dormitoryId, clientId, assignedBy, note },
  });
}

export async function removeClientAssignment(dormitoryId, clientId, removedBy) {
  const assignment = await prisma.dormitoryAssignment.findFirst({
    where: { dormitoryId, clientId, removedAt: null },
  });
  if (!assignment) throw Object.assign(new Error('Assignment not found'), { status: 404 });

  return prisma.dormitoryAssignment.update({
    where: { id: assignment.id },
    data: { removedAt: new Date(), removedBy },
  });
}

export async function getDormitoryOccupants(dormitoryId) {
  const dormitory = await prisma.dormitory.findUnique({ where: { id: dormitoryId, deletedAt: null } });
  if (!dormitory) throw Object.assign(new Error('Dormitory not found'), { status: 404 });

  const expats = await prisma.expat.findMany({
    where: { dormitoryId, deletedAt: null, status: { in: ACTIVE_EXPAT_STATUSES } },
  });

  return expats.map((e) => ({
    id: e.id,
    expatNo: e.expatNo,
    fullName: e.fullName,
    passportNo: e.passportNo,
    nationality: e.nationality,
    status: e.status,
    permitExpiry: e.permitExpiry,
    clientId: e.clientId,
  }));
}
