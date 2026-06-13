import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { isSuperAdmin } from '../../middleware/rbac.js';
import * as ctrl from './webhooks.controller.js';

const router = Router();
router.use(authenticate, isSuperAdmin);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.get);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/test', ctrl.test);
router.get('/:id/logs', ctrl.logs);

export default router;
