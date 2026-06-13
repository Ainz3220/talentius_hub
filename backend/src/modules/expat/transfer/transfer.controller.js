import prisma from '../../../config/db.js';
import { z } from 'zod';
import { logCreate, logUpdate } from '../../../audit/audit.service.js';

const createSchema = z.object({
  expatId: z.string(),
  fromDormitoryId: z.string().optional(),
  toDormitoryId: z.string().optional(),
  fromClientId: z.string().optional(),
  toClientId: z.string().optional(),
  reason: z.string().min(1),
  effectiveDate: z.string().optional(),
});

export async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 25, status } = req.query;
    const where = {};
    if (status) where.status = status;
    const [total, items] = await Promise.all([
      prisma.expatTransfer.count({ where }),
      prisma.expatTransfer.findMany({
        where,
        include: {
          expat: { select: { id: true, expatNo: true, fullName: true } },
          fromDormitory: { select: { id: true, name: true } },
          toDormitory: { select: { id: true, name: true } },
          fromClient: { select: { id: true, name: true } },
          toClient: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      }),
    ]);
    res.json({ total, items });
  } catch (err) { next(err); }
}

export async function get(req, res, next) {
  try {
    const transfer = await prisma.expatTransfer.findUnique({
      where: { id: req.params.id },
      include: {
        expat: true,
        fromDormitory: true, toDormitory: true,
        fromClient: true, toClient: true,
      },
    });
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    res.json(transfer);
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const settings = await prisma.systemSettings.findUnique({ where: { id: 'system' } });
    const requiresApproval = settings?.transferRequiresApproval ?? true;

    const transfer = await prisma.expatTransfer.create({
      data: {
        ...data,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
        status: requiresApproval ? 'PENDING' : 'APPROVED',
        requestedBy: req.user.id,
      },
    });

    if (!requiresApproval) {
      await applyTransfer(transfer);
    }

    await logCreate('transfers', transfer, req);
    res.status(201).json(transfer);
  } catch (err) { next(err); }
}

export async function approve(req, res, next) {
  try {
    const transfer = await prisma.expatTransfer.findUnique({ where: { id: req.params.id } });
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    if (transfer.status !== 'PENDING') return res.status(400).json({ error: 'Transfer is not pending' });

    const updated = await prisma.expatTransfer.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', approvedBy: req.user.id },
    });

    await applyTransfer(updated);
    await logUpdate('transfers', updated.id, { status: { from: 'PENDING', to: 'APPROVED' } }, req);
    res.json(updated);
  } catch (err) { next(err); }
}

export async function reject(req, res, next) {
  try {
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);
    const transfer = await prisma.expatTransfer.findUnique({ where: { id: req.params.id } });
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    if (transfer.status !== 'PENDING') return res.status(400).json({ error: 'Transfer is not pending' });

    const updated = await prisma.expatTransfer.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', rejectedBy: req.user.id, rejectionReason: reason || null },
    });
    await logUpdate('transfers', updated.id, { status: { from: 'PENDING', to: 'REJECTED' } }, req);
    res.json(updated);
  } catch (err) { next(err); }
}

async function applyTransfer(transfer) {
  const updates = {};
  if (transfer.toDormitoryId) updates.dormitoryId = transfer.toDormitoryId;
  if (transfer.toClientId) updates.clientId = transfer.toClientId;
  if (Object.keys(updates).length) {
    await prisma.expat.update({ where: { id: transfer.expatId }, data: { ...updates, status: 'TRANSFERRED' } });
  }
}
