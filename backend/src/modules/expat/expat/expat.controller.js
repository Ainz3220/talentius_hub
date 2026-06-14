import prisma from '../../../config/db.js';
import { z } from 'zod';
import { encrypt, decrypt } from '../../../config/encryption.js';
import { logCreate, logUpdate, logDelete } from '../../../audit/audit.service.js';
import { SKIP_COLUMNS, COLUMN_CONFIG, VIRTUAL_FIELDS, CATEGORY_ORDER } from './expat.fields.js';

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

// ── Filter engine — DB-introspected, override-configured ──────────────────

// PostgreSQL data_type → filter type
const PG_TYPE_MAP = {
  'character varying': 'text',
  'varchar':           'text',
  'text':              'text',
  'uuid':              'text',
  'integer':           'number',
  'bigint':            'number',
  'numeric':           'number',
  'real':              'number',
  'double precision':  'number',
  'smallint':          'number',
  'boolean':           'text',   // PostgreSQL booleans treated as text filters unless overridden
  'timestamp with time zone':    'date',
  'timestamp without time zone': 'date',
  'date':              'date',
};

function camelToLabel(str) {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

function toArr(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean);
  return [value];
}

async function resolveOptions(cfg) {
  if (cfg.options) return cfg.options;
  if (!cfg.optionsSource) return undefined;
  const src = cfg.optionsSource;
  if (src.startsWith('distinct:')) {
    const col = src.slice(9);
    const rows = await prisma.expat.findMany({
      select: { [col]: true }, distinct: [col], orderBy: { [col]: 'asc' },
    });
    return rows.filter(r => r[col] != null).map(r => ({ value: r[col], label: r[col] }));
  }
  if (src === 'model:Client') {
    const items = await prisma.client.findMany({ select: { id: true, name: true }, where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } });
    return items.map(c => ({ value: c.id, label: c.name }));
  }
  if (src === 'model:Dormitory') {
    const items = await prisma.dormitory.findMany({ select: { id: true, name: true }, where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } });
    return items.map(d => ({ value: d.id, label: d.name }));
  }
  return undefined;
}

// Introspect columns once per process (invalidated on restart)
let _columnTypeMap = null; // { colName → filterType }
async function getColumnTypeMap() {
  if (_columnTypeMap) return _columnTypeMap;
  const rows = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND lower(table_name) = 'expat'
    ORDER BY ordinal_position
  `;
  _columnTypeMap = {};
  for (const { column_name: col, data_type: pgType } of rows) {
    const cfg  = COLUMN_CONFIG[col] ?? {};
    _columnTypeMap[col] = cfg.type ?? PG_TYPE_MAP[pgType] ?? 'text';
  }
  for (const v of VIRTUAL_FIELDS) _columnTypeMap[v.key] = v.type;
  return _columnTypeMap;
}

async function buildClause({ field, op, value }) {
  // Virtual fields (e.g. unassigned)
  const virtual = VIRTUAL_FIELDS.find(v => v.key === field);
  if (virtual) return virtual.clause ?? null;

  const typeMap = await getColumnTypeMap();
  const type = typeMap[field] ?? 'text';

  const empty = value === '' || value === null || value === undefined ||
    (Array.isArray(value) && value.length === 0);
  if (empty) return null;

  if (type === 'text') {
    if (op === 'match')   return { [field]: { contains: value, mode: 'insensitive' } };
    if (op === 'eq')      return { [field]: { equals: value, mode: 'insensitive' } };
    if (op === 'include') return { [field]: { in: toArr(value) } };
    if (op === 'exclude') return { NOT: { [field]: { in: toArr(value) } } };
  }
  if (type === 'select') {
    if (op === 'eq')      return { [field]: value };
    if (op === 'include') return { [field]: { in: toArr(value) } };
    if (op === 'exclude') return { NOT: { [field]: { in: toArr(value) } } };
  }
  if (type === 'date') {
    const d = v => new Date(v);
    if (op === 'eq')  return { [field]: { equals: d(value) } };
    if (op === 'gt')  return { [field]: { gt:  d(value) } };
    if (op === 'gte') return { [field]: { gte: d(value) } };
    if (op === 'lt')  return { [field]: { lt:  d(value) } };
    if (op === 'lte') return { [field]: { lte: d(value) } };
    if (op === 'between' && Array.isArray(value) && value[0] && value[1])
      return { [field]: { gte: d(value[0]), lte: d(value[1]) } };
  }
  if (type === 'number') {
    const n = v => parseFloat(v);
    if (op === 'eq')  return { [field]: n(value) };
    if (op === 'gt')  return { [field]: { gt:  n(value) } };
    if (op === 'gte') return { [field]: { gte: n(value) } };
    if (op === 'lt')  return { [field]: { lt:  n(value) } };
    if (op === 'lte') return { [field]: { lte: n(value) } };
    if (op === 'between' && Array.isArray(value) && value[0] !== '' && value[1] !== '')
      return { [field]: { gte: n(value[0]), lte: n(value[1]) } };
  }
  return null;
}

// filterSchema — introspects DB, applies overrides, returns grouped schema
export async function filterSchema(req, res, next) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND lower(table_name) = 'expat'
      ORDER BY ordinal_position
    `;
    const columns = rows;

    // Build ordered category map
    const categoryMap = new Map(CATEGORY_ORDER.map(c => [c, []]));

    // Process DB columns
    for (const { column_name: col, data_type: pgType } of columns) {
      if (SKIP_COLUMNS.has(col)) continue;
      const cfg   = COLUMN_CONFIG[col] ?? {};
      const type  = cfg.type  ?? PG_TYPE_MAP[pgType] ?? 'text';
      const label = cfg.label ?? camelToLabel(col);
      const cat   = cfg.category ?? 'Other';

      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat).push({ key: col, label, type, optionsSource: cfg.optionsSource, options: cfg.options });
    }

    // Append virtual fields into their categories
    for (const v of VIRTUAL_FIELDS) {
      const cat = v.category ?? 'Other';
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat).push({ key: v.key, label: v.label, type: v.type });
    }

    // Resolve options and drop empty categories
    const result = await Promise.all(
      [...categoryMap.entries()]
        .filter(([, fields]) => fields.length > 0)
        .map(async ([category, fields]) => ({
          category,
          fields: await Promise.all(fields.map(async f => ({
            key: f.key, label: f.label, type: f.type,
            options: f.type === 'select' ? await resolveOptions(f) : undefined,
          }))),
        }))
    );

    res.json(result);
  } catch (err) { next(err); }
}

export async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 25, status, filters: filtersJson, logic = 'AND' } = req.query;
    const where = {};

    if (status) where.status = status;

    if (filtersJson) {
      try {
        const filters = JSON.parse(filtersJson);
        const clauses = (await Promise.all(filters.map(buildClause))).filter(Boolean);
        if (clauses.length > 0) {
          if (logic === 'OR') where.OR = clauses;
          else where.AND = clauses;
        }
      } catch (_) { /* malformed JSON — ignore */ }
    }

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
