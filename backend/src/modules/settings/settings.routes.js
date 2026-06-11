import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { getSettingsHandler, updateSettingsHandler, resetSettingsHandler } from './settings.controller.js';

const router = Router();

router.get('/', authenticate, getSettingsHandler);
router.patch('/', authenticate, requireRole('SUPER_ADMIN'), updateSettingsHandler);
router.post('/reset', authenticate, requireRole('SUPER_ADMIN'), resetSettingsHandler);

export default router;
