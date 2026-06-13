import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.js';
import { isStaff, isSuperAdmin } from '../../../middleware/rbac.js';
import * as ctrl from './checklist.controller.js';

const router = Router();
router.use(authenticate);

// Templates (SUPER_ADMIN only)
router.get('/templates', isStaff, ctrl.listTemplates);
router.post('/templates', isSuperAdmin, ctrl.createTemplate);
router.patch('/templates/:id', isSuperAdmin, ctrl.updateTemplate);
router.delete('/templates/:id', isSuperAdmin, ctrl.deleteTemplate);
router.post('/templates/:id/items', isSuperAdmin, ctrl.addTemplateItem);
router.patch('/templates/:id/items/:itemId', isSuperAdmin, ctrl.updateTemplateItem);
router.delete('/templates/:id/items/:itemId', isSuperAdmin, ctrl.deleteTemplateItem);

// Instances
router.get('/', isStaff, ctrl.listChecklists);
router.post('/', isStaff, ctrl.createChecklist);
router.get('/:id', isStaff, ctrl.getChecklist);
router.delete('/:id', isStaff, ctrl.archiveChecklist);
router.patch('/:id/items/:itemId', isStaff, ctrl.updateItem);

export default router;
