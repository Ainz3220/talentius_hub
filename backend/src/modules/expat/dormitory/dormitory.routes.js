import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.js';
import { isStaff } from '../../../middleware/rbac.js';
import * as ctrl from './dormitory.controller.js';

const router = Router();
router.use(authenticate, isStaff);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.get);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/assign-client', ctrl.assignClient);
router.delete('/:id/assign-client/:clientId', ctrl.removeClient);
router.get('/:id/occupants', ctrl.getOccupants);

export default router;
