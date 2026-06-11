import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { prisma } from '../config/db.js';

async function getSettings() {
  return prisma.systemSettings.findUnique({ where: { id: 'system' } });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.UPLOAD_DIR || '/data/uploads';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // hard upper cap; runtime limit checked in fileFilter
  fileFilter: async (req, file, cb) => {
    try {
      const settings = await getSettings();
      const maxBytes = (settings?.maxFileSizeMb ?? 10) * 1024 * 1024;
      const allowed = settings?.allowedMimeTypes ?? ['application/pdf', 'image/jpeg', 'image/png'];

      if (!allowed.includes(file.mimetype)) {
        return cb(new Error(`File type ${file.mimetype} not allowed`));
      }

      // Store for size check after upload
      req._uploadMaxBytes = maxBytes;
      cb(null, true);
    } catch (err) {
      cb(err);
    }
  },
});

export function checkFileSize(req, res, next) {
  if (req.file && req._uploadMaxBytes && req.file.size > req._uploadMaxBytes) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'File size exceeds the allowed limit' });
  }
  next();
}
