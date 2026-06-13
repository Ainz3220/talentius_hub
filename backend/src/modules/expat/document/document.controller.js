import prisma from '../../../config/db.js';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import archiver from 'archiver';
import { env } from '../../../config/env.js';
import { logCreate, logDelete } from '../../../audit/audit.service.js';

const UPLOAD_DIR = path.resolve(env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export async function upload(req, res, next) {
  try {
    const s = await prisma.systemSettings.findUnique({ where: { id: 'system' } });
    const fileSize = s?.maxFileSize ?? env.MAX_FILE_SIZE;
    multer({
      storage: multer.diskStorage({
        destination: UPLOAD_DIR,
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, uuid() + ext);
        },
      }),
      limits: { fileSize },
    }).single('file')(req, res, next);
  } catch (err) { next(err); }
}

export async function list(req, res, next) {
  try {
    const { entityType, entityId } = req.query;
    const where = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    const docs = await prisma.document.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(docs);
  } catch (err) { next(err); }
}

export async function getExpiring(req, res, next) {
  try {
    const s = await prisma.systemSettings.findUnique({ where: { id: 'system' } });
    const defaultDays = s?.docAlertDays1 ?? 30;
    const days = req.query.days !== undefined ? parseInt(req.query.days, 10) : defaultDays;
    const cutoff = new Date(Date.now() + days * 86400000);
    const docs = await prisma.document.findMany({
      where: { expiryDate: { lte: cutoff, gte: new Date() } },
      orderBy: { expiryDate: 'asc' },
    });
    res.json(docs);
  } catch (err) { next(err); }
}

export async function uploadDoc(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { entityType, entityId, documentType, expiryDate } = req.body;
    if (!entityType || !entityId || !documentType) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'entityType, entityId, and documentType are required' });
    }
    const doc = await prisma.document.create({
      data: {
        entityType,
        entityId,
        documentType,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        fileSizeBytes: req.file.size,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        uploadedBy: req.user.id,
      },
    });
    await logCreate('documents', doc, req);
    res.status(201).json(doc);
  } catch (err) { next(err); }
}

export async function download(req, res, next) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!fs.existsSync(doc.filePath)) return res.status(404).json({ error: 'File not found on disk' });
    res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName}"`);
    res.setHeader('Content-Type', doc.mimeType);
    res.sendFile(path.resolve(doc.filePath));
  } catch (err) { next(err); }
}

export async function bulkDownload(req, res, next) {
  try {
    const { ids } = z.object({ ids: z.array(z.string()) }).parse(req.body);
    const docs = await prisma.document.findMany({ where: { id: { in: ids } } });
    if (!docs.length) return res.status(404).json({ error: 'No documents found' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="documents.zip"');

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', err => next(err));
    archive.pipe(res);

    for (const doc of docs) {
      if (fs.existsSync(doc.filePath)) {
        archive.file(doc.filePath, { name: doc.originalName });
      }
    }

    await archive.finalize();
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
    await prisma.document.delete({ where: { id: req.params.id } });
    await logDelete('documents', req.params.id, req);
    res.json({ message: 'Document deleted' });
  } catch (err) { next(err); }
}
