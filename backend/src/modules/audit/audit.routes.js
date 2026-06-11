import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { prisma } from '../../config/db.js';
import { writeAuditLog } from '../../audit/audit.service.js';

const router = Router();

router.use(authenticate);

// GET /api/audit - list audit logs with filters
router.get('/', async (req, res, next) => {
  try {
    const { tableName, action, performedBy, from, to, page = 1, limit = 50 } = req.query;
    const pageSize = Math.min(parseInt(limit) || 50, 200);
    const skip = (parseInt(page) - 1) * pageSize;

    const where = {};
    if (tableName) where.tableName = tableName;
    if (action) where.action = action;
    if (performedBy) where.performedBy = { contains: performedBy, mode: 'insensitive' };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ data: logs, total, page: parseInt(page), limit: pageSize });
  } catch (err) { next(err); }
});

// GET /api/audit/export?format=csv - SUPER_ADMIN only
router.get('/export', requireRole('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { tableName, action, performedBy, from, to, format = 'csv' } = req.query;

    const where = {};
    if (tableName) where.tableName = tableName;
    if (action) where.action = action;
    if (performedBy) where.performedBy = { contains: performedBy, mode: 'insensitive' };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    // Write audit log for the export itself
    await writeAuditLog({
      tableName: 'audit_logs',
      recordId: 'export',
      fieldName: 'export',
      valueFrom: null,
      valueTo: JSON.stringify({ format, filters: { tableName, action, performedBy, from, to } }),
      action: 'CREATE',
      performedBy: req.user.id,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    if (format === 'csv') {
      const headers = ['id', 'tableName', 'recordId', 'fieldName', 'valueFrom', 'valueTo', 'action', 'performedBy', 'ipAddress', 'userAgent', 'createdAt'];

      const csvRows = [
        headers.join(','),
        ...logs.map((log) =>
          headers.map((h) => {
            const val = log[h] == null ? '' : String(log[h]);
            return `"${val.replace(/"/g, '""')}"`;
          }).join(',')
        ),
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
      return res.send(csvRows.join('\n'));
    }

    res.json({ data: logs, total: logs.length });
  } catch (err) { next(err); }
});

export default router;
