import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.js';
import { upload, checkFileSize } from '../../../middleware/upload.js';
import {
  handleList,
  handleGetExpiring,
  handleUpload,
  handleDownload,
  handleDelete,
  handleBulkDownload,
} from './document.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', handleList);
router.get('/expiring', handleGetExpiring);
router.post('/', upload.single('file'), checkFileSize, handleUpload);
router.post('/bulk-download', handleBulkDownload);
router.get('/:id/download', handleDownload);
router.delete('/:id', handleDelete);

export default router;
