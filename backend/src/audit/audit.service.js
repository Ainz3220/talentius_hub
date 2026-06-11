import { prisma } from '../config/db.js';

export async function writeAuditLog({ tableName, recordId, fieldName, valueFrom, valueTo, action, performedBy, ipAddress, userAgent }) {
  await prisma.auditLog.create({
    data: { tableName, recordId, fieldName: fieldName || '', valueFrom, valueTo, action, performedBy, ipAddress, userAgent },
  });
}

export async function auditCreate({ tableName, recordId, data, performedBy, ipAddress, userAgent }) {
  await writeAuditLog({ tableName, recordId, fieldName: '*', valueFrom: null, valueTo: JSON.stringify(data), action: 'CREATE', performedBy, ipAddress, userAgent });
}

export async function auditUpdate({ tableName, recordId, oldData, newData, performedBy, ipAddress, userAgent, encryptedFields = [] }) {
  const promises = [];
  for (const key of Object.keys(newData)) {
    if (oldData[key] !== newData[key]) {
      const isEncrypted = encryptedFields.includes(key);
      promises.push(writeAuditLog({
        tableName, recordId, fieldName: key,
        valueFrom: isEncrypted ? '[ENCRYPTED]' : String(oldData[key] ?? ''),
        valueTo: isEncrypted ? '[ENCRYPTED]' : String(newData[key] ?? ''),
        action: 'UPDATE', performedBy, ipAddress, userAgent,
      }));
    }
  }
  await Promise.all(promises);
}

export async function auditDelete({ tableName, recordId, performedBy, ipAddress, userAgent }) {
  await writeAuditLog({ tableName, recordId, fieldName: '*', valueFrom: null, valueTo: null, action: 'DELETE', performedBy, ipAddress, userAgent });
}
