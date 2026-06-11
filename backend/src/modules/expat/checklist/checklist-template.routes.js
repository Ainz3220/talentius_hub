import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.js';
import {
  handleListTemplates,
  handleGetTemplateById,
  handleCreateTemplate,
  handleUpdateTemplate,
  handleDeleteTemplate,
  handleAddTemplateItem,
  handleUpdateTemplateItem,
  handleDeleteTemplateItem,
} from './checklist.controller.js';

const router = Router();

router.use(authenticate);

// Template routes — mounted at /api/checklist-templates
router.get('/', handleListTemplates);
router.get('/:id', handleGetTemplateById);
router.post('/', handleCreateTemplate);
router.patch('/:id', handleUpdateTemplate);
router.delete('/:id', handleDeleteTemplate);
router.post('/:id/items', handleAddTemplateItem);
router.patch('/:id/items/:itemId', handleUpdateTemplateItem);
router.delete('/:id/items/:itemId', handleDeleteTemplateItem);

export default router;
