import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.js';
import { isStaff, isManager } from '../../../middleware/rbac.js';
import * as ctrl from './transfer.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', isStaff, ctrl.list);
router.post('/', isStaff, ctrl.create);
router.get('/:id', isStaff, ctrl.get);
router.patch('/:id/approve', isManager, ctrl.approve);
router.patch('/:id/reject', isManager, ctrl.reject);

export default router;
