import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { isStaff } from '../../middleware/rbac.js';
import * as ctrl from './search.controller.js';

const router = Router();
router.use(authenticate, isStaff);
router.get('/', ctrl.globalSearch);

export default router;
