import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { isSuperAdmin, isStaff } from '../../middleware/rbac.js';
import * as ctrl from './settings.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', isStaff, ctrl.get);
router.patch('/', isSuperAdmin, ctrl.update);
router.post('/reset', isSuperAdmin, ctrl.reset);

export default router;
