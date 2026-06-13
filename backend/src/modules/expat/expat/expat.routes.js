import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.js';
import { isStaff } from '../../../middleware/rbac.js';
import * as ctrl from './expat.controller.js';

const router = Router();
router.use(authenticate, isStaff);

router.get('/', ctrl.list);
router.get('/filter-schema', ctrl.filterSchema);
router.post('/', ctrl.create);
router.get('/:id', ctrl.get);
router.patch('/:id', ctrl.update);
router.patch('/:id/status', ctrl.updateStatus);
router.delete('/:id', ctrl.remove);
router.get('/:id/transfers', ctrl.getTransfers);

export default router;
