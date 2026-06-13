import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as ctrl from './notifications.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.patch('/mark-all-read', ctrl.markAllRead);
router.patch('/:id/mark-read', ctrl.markRead);
router.delete('/:id', ctrl.remove);

export default router;
