import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { isSuperAdmin } from '../../middleware/rbac.js';
import * as ctrl from './audit.controller.js';

const router = Router();
router.use(authenticate, isSuperAdmin);

router.get('/', ctrl.list);
router.get('/export', ctrl.exportCsv);

export default router;
