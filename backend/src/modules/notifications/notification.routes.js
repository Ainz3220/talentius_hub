import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  listNotifications,
  markRead,
  markAllRead,
  deleteNotification,
} from './notification.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', listNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
router.delete('/:id', deleteNotification);

export default router;
