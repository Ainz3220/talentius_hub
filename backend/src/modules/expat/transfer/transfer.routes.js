import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.js';
import { requireRole } from '../../../middleware/rbac.js';
import {
  handleList,
  handleGetById,
  handleCreate,
  handleApprove,
  handleReject,
} from './transfer.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', handleList);
router.get('/:id', handleGetById);
router.post('/', handleCreate);
router.patch('/:id/approve', requireRole('MANAGER', 'SUPER_ADMIN'), handleApprove);
router.patch('/:id/reject', requireRole('MANAGER', 'SUPER_ADMIN'), handleReject);

export default router;
