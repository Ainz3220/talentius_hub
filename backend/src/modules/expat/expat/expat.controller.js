import prisma from '../../../config/db.js';
import { z } from 'zod';
import { encrypt, decrypt } from '../../../config/encryption.js';
import { logCreate, logUpdate, logDelete } from '../../../audit/audit.service.js';

const schema = z.object({
  fullName: z.string().min(1),
  passportNo: z.string().min(1),
  nationality: z.string().min(1),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'TRANSFERRED', 'EXPIRED', 'REPATRIATED']).default('PENDING'),
  permitExpiry: z.string().optional(),
  clientId: z.string().optional(),
  dormitoryId: z.string().optional(),
});

async function nextExpatNo() {
  const last = await prisma.expat.findFirst({ orderBy: { expatNo: 'desc' } });
  if (!last) return 'EXP00001';
  const num = parseInt(last.expatNo.replace('EXP', ''), 10) + 1;
  return 'EXP' + String(num).padStart(5, '0');
}

function formatExpat(e) {
  return {
    ...e,
    passportNo: decrypt(e.passportNoEnc),
    dateOfBirth: decrypt(e.dateOfBirthEnc),
    phone: decrypt(e.phoneEnc),
    passportNoEnc: undefined,
    dateOfBirthEnc: undefined,
    phoneEnc: undefined,
  };
}

export async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 25, status, search, clientId, dormitoryId, unassigned, createdAfter } = req.query;
    const where = {};
    if (status) where.status = status;
    if (unassigned === 'true') where.clientId = null;
    else if (clientId) where.clientId = clientId;
    if (dormitoryId) where.dormitoryId = dormitoryId;
    if (search) where.fullName = { contains: search, mode: 'insensitive' };
    if (createdAfter) where.createdAt = { gte: new Date(createdAfter) };

    const [total, items] = await Promise.all([
      prisma.expat.count({ where }),
      prisma.expat.findMany({
        where,
        include: { client: { select: { id: true, name: true } }, dormitory: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      }),
    ]);

    res.json({ total, page: parseInt(page), pageSize: parseInt(pageSize), items: items.map(formatExpat) });
  } catch (err) { next(err); }
}

export async function get(req, res, next) {
  try {
    const expat = await prisma.expat.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, name: true, type: true } },
        dormitory: { select: { id: true, name: true, address: true } },
        transfers: {
          include: {
            fromDormitory: { select: { id: true, name: true } },
            toDormitory: { select: { id: true, name: true } },
            fromClient: { select: { id: true, name: true } },
            toClient: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!expat) return res.status(404).json({ error: 'Expat not found' });
    res.json(formatExpat(expat));
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const data = schema.parse(req.body);
    const expatNo = await nextExpatNo();

    const expat = await prisma.expat.create({
      data: {
        expatNo,
        fullName: data.fullName,
        passportNoEnc: encrypt(data.passportNo),
        nationality: data.nationality,
        dateOfBirthEnc: data.dateOfBirth ? encrypt(data.dateOfBirth) : null,
        phoneEnc: data.phone ? encrypt(data.phone) : null,
        status: data.status,
        permitExpiry: data.permitExpiry ? new Date(data.permitExpiry) : null,
        clientId: data.clientId || null,
        dormitoryId: data.dormitoryId || null,
      },
    });

    // Auto-create GLOBAL checklist instances
    const templates = await prisma.checklistTemplate.findMany({
      where: { entityType: 'EXPAT', scope: 'GLOBAL', isActive: true },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    for (const tpl of templates) {
      const checklist = await prisma.checklist.create({
        data: { templateId: tpl.id, entityType: 'EXPAT', entityId: expat.id, name: tpl.name },
      });
      await prisma.checklistItem.createMany({
        data: tpl.items.map(item => ({
          checklistId: checklist.id,
          itemText: item.itemText,
          order: item.order,
          status: 'PENDING',
        })),
      });
    }

    await logCreate('expats', expat, req);
    res.status(201).json(formatExpat(expat));
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const existing = await prisma.expat.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Expat not found' });

    const data = schema.partial().parse(req.body);
    const updateData = {};
    const changes = {};

    if (data.fullName !== undefined && data.fullName !== existing.fullName) {
      changes.fullName = { from: existing.fullName, to: data.fullName };
      updateData.fullName = data.fullName;
    }
    if (data.nationality !== undefined && data.nationality !== existing.nationality) {
      changes.nationality = { from: existing.nationality, to: data.nationality };
      updateData.nationality = data.nationality;
    }
    if (data.status !== undefined && data.status !== existing.status) {
      changes.status = { from: existing.status, to: data.status };
      updateData.status = data.status;
    }
    if (data.clientId !== undefined) {
      const newClientId = data.clientId || null;
      if (newClientId !== existing.clientId) {
        changes.clientId = { from: existing.clientId, to: newClientId };
        updateData.clientId = newClientId;
      }
    }
    if (data.dormitoryId !== undefined) {
      const newDormitoryId = data.dormitoryId || null;
      if (newDormitoryId !== existing.dormitoryId) {
        changes.dormitoryId = { from: existing.dormitoryId, to: newDormitoryId };
        updateData.dormitoryId = newDormitoryId;
      }
    }
    if (data.permitExpiry !== undefined) {
      updateData.permitExpiry = data.permitExpiry ? new Date(data.permitExpiry) : null;
    }
    if (data.passportNo) {
      updateData.passportNoEnc = encrypt(data.passportNo);
      changes.passportNo = { from: '[ENCRYPTED]', to: '[ENCRYPTED]' };
    }
    if (data.phone) updateData.phoneEnc = encrypt(data.phone);
    if (data.dateOfBirth) updateData.dateOfBirthEnc = encrypt(data.dateOfBirth);

    const expat = await prisma.expat.update({ where: { id: req.params.id }, data: updateData });
    if (Object.keys(changes).length) await logUpdate('expats', expat.id, changes, req);
    res.json(formatExpat(expat));
  } catch (err) { next(err); }
}

export async function updateStatus(req, res, next) {
  try {
    const { status } = z.object({ status: z.enum(['PENDING', 'ACTIVE', 'TRANSFERRED', 'EXPIRED', 'REPATRIATED']) }).parse(req.body);
    const existing = await prisma.expat.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Expat not found' });
    const expat = await prisma.expat.update({ where: { id: req.params.id }, data: { status } });
    await logUpdate('expats', expat.id, { status: { from: existing.status, to: status } }, req);
    res.json(formatExpat(expat));
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    await prisma.expat.delete({ where: { id: req.params.id } });
    await logDelete('expats', req.params.id, req);
    res.json({ message: 'Expat deleted' });
  } catch (err) { next(err); }
}

export async function getTransfers(req, res, next) {
  try {
    const transfers = await prisma.expatTransfer.findMany({
      where: { expatId: req.params.id },
      include: {
        fromDormitory: { select: { id: true, name: true } },
        toDormitory: { select: { id: true, name: true } },
        fromClient: { select: { id: true, name: true } },
        toClient: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(transfers);
  } catch (err) { next(err); }
}
