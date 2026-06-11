import { prisma } from '../../config/db.js';

export async function listNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const pageSize = parseInt(limit) || 20;
    const skip = (parseInt(page) - 1) * pageSize;

    const where = { userId };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    res.json({ data: notifications, total, unreadCount, page: parseInt(page), limit: pageSize });
  } catch (err) { next(err); }
}

export async function markRead(req, res, next) {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    if (notification.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json(updated);
  } catch (err) { next(err); }
}

export async function markAllRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function deleteNotification(req, res, next) {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    if (notification.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await prisma.notification.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) { next(err); }
}
