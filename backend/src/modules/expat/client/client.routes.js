import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.js';
import { isStaff } from '../../../middleware/rbac.js';
import * as ctrl from './client.controller.js';

const router = Router();
router.use(authenticate, isStaff);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.get);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/:id/expats', ctrl.getExpats);

export default router;
