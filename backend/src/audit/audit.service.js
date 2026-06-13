import prisma from '../config/db.js';

export async function logAudit({ tableName, recordId, fieldName, valueFrom, valueTo, action, req }) {
  try {
    await prisma.auditLog.create({
      data: {
        tableName,
        recordId: String(recordId),
        fieldName: fieldName ?? null,
        valueFrom: valueFrom !== undefined ? String(valueFrom) : null,
        valueTo: valueTo !== undefined ? String(valueTo) : null,
        action,
        performedBy: req?.user?.id ?? null,
        ipAddress: req?.ip ?? null,
        userAgent: req?.headers?.['user-agent'] ?? null,
      },
    });
  } catch (err) {
    console.error('[AuditService] Failed to log:', err.message);
  }
}

export async function logCreate(tableName, record, req) {
  await logAudit({ tableName, recordId: record.id, action: 'CREATE', req });
}

export async function logUpdate(tableName, recordId, changes, req) {
  for (const [field, { from, to }] of Object.entries(changes)) {
    await logAudit({ tableName, recordId, fieldName: field, valueFrom: from, valueTo: to, action: 'UPDATE', req });
  }
}

export async function logDelete(tableName, recordId, req) {
  await logAudit({ tableName, recordId, action: 'DELETE', req });
}
