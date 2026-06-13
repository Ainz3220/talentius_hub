import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.js';
import { isStaff } from '../../../middleware/rbac.js';
import * as ctrl from './document.controller.js';

const router = Router();
router.use(authenticate, isStaff);

router.get('/', ctrl.list);
router.get('/expiring', ctrl.getExpiring);
router.post('/upload', ctrl.upload, ctrl.uploadDoc);
router.post('/bulk-download', ctrl.bulkDownload);
router.get('/:id/download', ctrl.download);
router.delete('/:id', ctrl.remove);

export default router;
