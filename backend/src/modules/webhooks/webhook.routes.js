import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import {
  listWebhooksHandler, getWebhookHandler, createWebhookHandler,
  updateWebhookHandler, deleteWebhookHandler, testWebhookHandler,
  getLogsHandler, getLogHandler,
} from './webhook.controller.js';

const router = Router();

router.use(authenticate, requireRole('SUPER_ADMIN'));

router.get('/', listWebhooksHandler);
router.get('/:id', getWebhookHandler);
router.post('/', createWebhookHandler);
router.patch('/:id', updateWebhookHandler);
router.delete('/:id', deleteWebhookHandler);
router.post('/:id/test', testWebhookHandler);
router.get('/:id/logs', getLogsHandler);
router.get('/:id/logs/:logId', getLogHandler);

export default router;
