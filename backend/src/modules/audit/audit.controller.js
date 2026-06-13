import prisma from '../../config/db.js';

export async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 50, action, tableName, dateFrom, dateTo } = req.query;
    const where = {};
    if (action) where.action = action;
    if (tableName) where.tableName = tableName;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59');
    }

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: { performedByUser: { select: { id: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      }),
    ]);
    res.json({ total, items });
  } catch (err) { next(err); }
}

export async function exportCsv(req, res, next) {
  try {
    const { action, tableName, dateFrom, dateTo } = req.query;
    const where = {};
    if (action) where.action = action;
    if (tableName) where.tableName = tableName;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59');
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const header = 'Timestamp,Action,Table,Record ID,Field,From,To,Performed By,IP\n';
    const rows = logs.map(l =>
      [l.createdAt.toISOString(), l.action, l.tableName, l.recordId, l.fieldName || '', l.valueFrom || '', l.valueTo || '', l.performedBy || '', l.ipAddress || '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit_${Date.now()}.csv"`);
    res.send(header + rows);
  } catch (err) { next(err); }
}
