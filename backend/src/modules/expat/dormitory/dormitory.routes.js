import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.js';
import {
  handleList,
  handleGetById,
  handleCreate,
  handleUpdate,
  handleDelete,
  handleAssignClient,
  handleRemoveClient,
  handleGetOccupants,
} from './dormitory.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', handleList);
router.get('/:id', handleGetById);
router.post('/', handleCreate);
router.patch('/:id', handleUpdate);
router.delete('/:id', handleDelete);
router.post('/:id/assign-client', handleAssignClient);
router.delete('/:id/assign-client/:clientId', handleRemoveClient);
router.get('/:id/occupants', handleGetOccupants);

export default router;
