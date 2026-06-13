import prisma from '../../../config/db.js';
import { z } from 'zod';
import { encrypt, decrypt, hmac } from '../../../config/encryption.js';
import { logCreate, logUpdate, logDelete } from '../../../audit/audit.service.js';

function formatClient(c) {
  return {
    ...c,
    registrationNo: decrypt(c.registrationNoEnc),
    contactName: decrypt(c.contactNameEnc),
    contactPhone: decrypt(c.contactPhoneEnc),
    contactEmail: decrypt(c.contactEmailEnc),
    registrationNoEnc: undefined,
    contactNameEnc: undefined,
    contactPhoneEnc: undefined,
    contactEmailEnc: undefined,
    contactEmailHash: undefined,
  };
}

const schema = z.object({
  type: z.enum(['COMPANY', 'INDIVIDUAL']),
  name: z.string().min(1),
  registrationNo: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  address: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 25, status, type, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [total, items] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        include: { _count: { select: { expats: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      }),
    ]);
    res.json({ total, items: items.map(formatClient) });
  } catch (err) { next(err); }
}

export async function get(req, res, next) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        expats: { select: { id: true, expatNo: true, fullName: true, status: true, nationality: true } },
        dormAssignments: {
          where: { removedAt: null },
          include: { dormitory: { select: { id: true, name: true } } },
        },
      },
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(formatClient(client));
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const data = schema.parse(req.body);
    const client = await prisma.client.create({
      data: {
        type: data.type,
        name: data.name,
        registrationNoEnc: data.registrationNo ? encrypt(data.registrationNo) : null,
        contactNameEnc: data.contactName ? encrypt(data.contactName) : null,
        contactPhoneEnc: data.contactPhone ? encrypt(data.contactPhone) : null,
        contactEmailEnc: data.contactEmail ? encrypt(data.contactEmail) : null,
        contactEmailHash: data.contactEmail ? hmac(data.contactEmail) : null,
        address: data.address || null,
        status: data.status,
      },
    });

    // Auto-create GLOBAL checklist instances
    const templates = await prisma.checklistTemplate.findMany({
      where: { entityType: 'CLIENT', scope: 'GLOBAL', isActive: true },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    for (const tpl of templates) {
      const checklist = await prisma.checklist.create({
        data: { templateId: tpl.id, entityType: 'CLIENT', entityId: client.id, name: tpl.name },
      });
      await prisma.checklistItem.createMany({
        data: tpl.items.map(i => ({ checklistId: checklist.id, itemText: i.itemText, order: i.order, status: 'PENDING' })),
      });
    }

    await logCreate('clients', client, req);
    res.status(201).json(formatClient(client));
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Client not found' });
    const data = schema.partial().parse(req.body);
    const updateData = {};
    const changes = {};
    if (data.name !== undefined) { changes.name = { from: existing.name, to: data.name }; updateData.name = data.name; }
    if (data.status !== undefined) { changes.status = { from: existing.status, to: data.status }; updateData.status = data.status; }
    if (data.address !== undefined) updateData.address = data.address;
    if (data.contactName) updateData.contactNameEnc = encrypt(data.contactName);
    if (data.contactPhone) updateData.contactPhoneEnc = encrypt(data.contactPhone);
    if (data.registrationNo) updateData.registrationNoEnc = encrypt(data.registrationNo);

    const client = await prisma.client.update({ where: { id: req.params.id }, data: updateData });
    if (Object.keys(changes).length) await logUpdate('clients', client.id, changes, req);
    res.json(formatClient(client));
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    await logDelete('clients', req.params.id, req);
    res.json({ message: 'Client deleted' });
  } catch (err) { next(err); }
}

export async function getExpats(req, res, next) {
  try {
    const expats = await prisma.expat.findMany({
      where: { clientId: req.params.id },
      include: { dormitory: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(expats);
  } catch (err) { next(err); }
}
