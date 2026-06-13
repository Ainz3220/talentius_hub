import prisma from '../../../config/db.js';
import { z } from 'zod';
import { logCreate, logUpdate, logDelete } from '../../../audit/audit.service.js';

const schema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  state: z.string().min(1),
  capacity: z.number().int().min(1),
  pic: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export async function list(req, res, next) {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const dorms = await prisma.dormitory.findMany({
      where,
      include: {
        _count: { select: { expats: true } },
        clientAssignments: {
          where: { removedAt: null },
          include: { client: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(dorms);
  } catch (err) { next(err); }
}

export async function get(req, res, next) {
  try {
    const dorm = await prisma.dormitory.findUnique({
      where: { id: req.params.id },
      include: {
        expats: {
          include: { client: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        clientAssignments: {
          where: { removedAt: null },
          include: { client: true },
        },
      },
    });
    if (!dorm) return res.status(404).json({ error: 'Dormitory not found' });
    res.json(dorm);
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const data = schema.parse(req.body);
    const dorm = await prisma.dormitory.create({ data });

    const templates = await prisma.checklistTemplate.findMany({
      where: { entityType: 'DORMITORY', scope: 'GLOBAL', isActive: true },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    for (const tpl of templates) {
      const checklist = await prisma.checklist.create({
        data: { templateId: tpl.id, entityType: 'DORMITORY', entityId: dorm.id, name: tpl.name },
      });
      await prisma.checklistItem.createMany({
        data: tpl.items.map(i => ({ checklistId: checklist.id, itemText: i.itemText, order: i.order, status: 'PENDING' })),
      });
    }

    await logCreate('dormitories', dorm, req);
    res.status(201).json(dorm);
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const existing = await prisma.dormitory.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Dormitory not found' });
    const data = schema.partial().parse(req.body);
    const dorm = await prisma.dormitory.update({ where: { id: req.params.id }, data });
    await logUpdate('dormitories', dorm.id, {}, req);
    res.json(dorm);
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    await prisma.dormitory.delete({ where: { id: req.params.id } });
    await logDelete('dormitories', req.params.id, req);
    res.json({ message: 'Dormitory deleted' });
  } catch (err) { next(err); }
}

export async function assignClient(req, res, next) {
  try {
    const { clientId } = z.object({ clientId: z.string() }).parse(req.body);
    const existing = await prisma.dormitoryAssignment.findFirst({
      where: { dormitoryId: req.params.id, clientId, removedAt: null },
    });
    if (existing) return res.status(409).json({ error: 'Client already assigned to this dormitory' });
    const assignment = await prisma.dormitoryAssignment.create({
      data: { dormitoryId: req.params.id, clientId, assignedBy: req.user.id },
      include: { client: { select: { id: true, name: true } } },
    });
    res.status(201).json(assignment);
  } catch (err) { next(err); }
}

export async function removeClient(req, res, next) {
  try {
    const { clientId } = req.params;
    await prisma.dormitoryAssignment.updateMany({
      where: { dormitoryId: req.params.id, clientId, removedAt: null },
      data: { removedAt: new Date(), removedBy: req.user.id },
    });
    res.json({ message: 'Client removed from dormitory' });
  } catch (err) { next(err); }
}

export async function getOccupants(req, res, next) {
  try {
    const expats = await prisma.expat.findMany({
      where: { dormitoryId: req.params.id },
      include: { client: { select: { id: true, name: true } } },
    });
    res.json(expats);
  } catch (err) { next(err); }
}
