import fs from 'fs';
import archiver from 'archiver';
import { prisma } from '../../../config/db.js';
import { encrypt, decrypt } from '../../../config/encryption.js';
import { auditCreate, auditDelete } from '../../../audit/audit.service.js';
import { getSettings } from '../../settings/settings.service.js';

export async function listDocuments(query) {
  const { entityType, entityId, page = 1, limit } = query;
  if (!entityType || !entityId) throw Object.assign(new Error('entityType and entityId are required'), { status: 400 });

  const settings = await getSettings();
  const pageSize = parseInt(limit) || settings.defaultPageSize;
  const skip = (parseInt(page) - 1) * pageSize;

  const where = { entityType, entityId, deletedAt: null };

  const [documents, total] = await Promise.all([
    prisma.document.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
    prisma.document.count({ where }),
  ]);

  const now = new Date();
  const data = documents.map((doc) => {
    const expiryDate = doc.expiryDate;
    let expiryStatus = null;
    if (expiryDate) {
      const daysUntil = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 0) expiryStatus = 'EXPIRED';
      else if (daysUntil <= 30) expiryStatus = 'EXPIRING_SOON';
      else expiryStatus = 'VALID';
    }
    return {
      ...doc,
      originalName: doc.originalName ? decrypt(doc.originalName) : null,
      filePath: undefined, // don't expose stored path
      expiryStatus,
    };
  });

  return { data, total, page: parseInt(page), limit: pageSize };
}

export async function getExpiringDocuments(days) {
  const settings = await getSettings();
  const alertDays = parseInt(days) || settings.docAlertDays1 || 30;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + alertDays);

  const docs = await prisma.document.findMany({
    where: {
      deletedAt: null,
      expiryDate: { lte: cutoff, gt: new Date() },
    },
    orderBy: { expiryDate: 'asc' },
  });

  const now = new Date();
  return docs.map((doc) => ({
    ...doc,
    originalName: doc.originalName ? decrypt(doc.originalName) : null,
    filePath: undefined,
    daysUntilExpiry: Math.ceil((doc.expiryDate - now) / (1000 * 60 * 60 * 24)),
  }));
}

export async function uploadDocument(file, data, uploadedBy, ipAddress, userAgent) {
  const { entityType, entityId, documentType, expiryDate } = data;

  if (!expiryDate) {
    // Delete uploaded file and reject
    if (file?.path) fs.unlink(file.path, () => {});
    throw Object.assign(new Error('expiryDate is required'), { status: 400 });
  }
  if (!entityType || !entityId) {
    if (file?.path) fs.unlink(file.path, () => {});
    throw Object.assign(new Error('entityType and entityId are required'), { status: 400 });
  }
  if (!file) throw Object.assign(new Error('File is required'), { status: 400 });

  const encryptedOriginalName = encrypt(file.originalname);
  const encryptedFilePath = encrypt(file.path);

  const doc = await prisma.document.create({
    data: {
      entityType,
      entityId,
      documentType,
      originalName: encryptedOriginalName,
      filePath: encryptedFilePath,
      storedName: file.filename,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      expiryDate: new Date(expiryDate),
      uploadedBy,
    },
  });

  await auditCreate({
    tableName: 'documents',
    recordId: doc.id,
    data: { entityType, entityId, documentType, expiryDate, originalName: '[ENCRYPTED]', filePath: '[ENCRYPTED]' },
    performedBy: uploadedBy,
    ipAddress,
    userAgent,
  });

  return { ...doc, originalName: file.originalname, filePath: undefined };
}

export async function downloadDocument(id, req, res) {
  const doc = await prisma.document.findUnique({ where: { id, deletedAt: null } });
  if (!doc) throw Object.assign(new Error('Document not found'), { status: 404 });

  const filePath = doc.filePath ? decrypt(doc.filePath) : null;
  if (!filePath || !fs.existsSync(filePath)) {
    throw Object.assign(new Error('File not found on disk'), { status: 404 });
  }

  const originalName = doc.originalName ? decrypt(doc.originalName) : doc.storedName;
  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
  fs.createReadStream(filePath).pipe(res);
}

export async function deleteDocument(id, deletedBy, ipAddress, userAgent) {
  const doc = await prisma.document.findUnique({ where: { id, deletedAt: null } });
  if (!doc) throw Object.assign(new Error('Document not found'), { status: 404 });

  await prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });

  // Delete file from disk
  if (doc.filePath) {
    const filePath = decrypt(doc.filePath);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
  }

  await auditDelete({ tableName: 'documents', recordId: id, performedBy: deletedBy, ipAddress, userAgent });
}

export async function bulkDownload(ids, res) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw Object.assign(new Error('ids must be a non-empty array'), { status: 400 });
  }

  const documents = await prisma.document.findMany({
    where: { id: { in: ids }, deletedAt: null },
  });

  if (documents.length === 0) throw Object.assign(new Error('No documents found'), { status: 404 });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="documents.zip"');

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.pipe(res);

  for (const doc of documents) {
    if (!doc.filePath) continue;
    const filePath = decrypt(doc.filePath);
    if (!filePath || !fs.existsSync(filePath)) continue;

    const originalName = doc.originalName ? decrypt(doc.originalName) : doc.storedName;
    archive.file(filePath, { name: originalName });
  }

  await archive.finalize();
}
