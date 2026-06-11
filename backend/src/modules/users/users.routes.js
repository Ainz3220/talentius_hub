import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import {
  listUsersHandler, getUserHandler, createUserHandler,
  updateUserHandler, manualVerifyHandler, resendVerificationHandler, deleteUserHandler,
} from './users.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('SUPER_ADMIN', 'MANAGER'));

router.get('/', listUsersHandler);
router.get('/:id', getUserHandler);
router.post('/', createUserHandler);
router.patch('/:id', updateUserHandler);
router.patch('/:id/verify', requireRole('SUPER_ADMIN'), manualVerifyHandler);
router.post('/:id/resend-verification', resendVerificationHandler);
router.delete('/:id', requireRole('SUPER_ADMIN'), deleteUserHandler);

export default router;
