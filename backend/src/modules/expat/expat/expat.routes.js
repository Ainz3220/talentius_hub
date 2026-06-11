import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.js';
import {
  handleList,
  handleGetById,
  handleCreate,
  handleUpdate,
  handleUpdateStatus,
  handleDelete,
} from './expat.controller.js';
import { handleGetExpatTransfers } from '../transfer/transfer.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', handleList);
router.get('/:id', handleGetById);
router.post('/', handleCreate);
router.patch('/:id', handleUpdate);
router.patch('/:id/status', handleUpdateStatus);
router.delete('/:id', handleDelete);
router.get('/:id/transfers', handleGetExpatTransfers);

export default router;
