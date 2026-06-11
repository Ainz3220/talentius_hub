import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.js';
import {
  handleListChecklists,
  handleGetChecklistById,
  handleCreateChecklist,
  handleArchiveChecklist,
  handleUpdateChecklistItem,
} from './checklist.controller.js';

const router = Router();

router.use(authenticate);

// Instance routes — mounted at /api/checklists
router.get('/', handleListChecklists);
router.get('/:id', handleGetChecklistById);
router.post('/', handleCreateChecklist);
router.delete('/:id', handleArchiveChecklist);
router.patch('/:id/items/:itemId', handleUpdateChecklistItem);

export default router;
