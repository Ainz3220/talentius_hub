import prisma from '../../config/db.js';

export async function list(req, res, next) {
  try {
    const { unread } = req.query;
    const where = { userId: req.userId };
    if (unread === 'true') where.isRead = false;
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.userId, isRead: false } });
    res.json({ notifications, unreadCount });
  } catch (err) { next(err); }
}

export async function markRead(req, res, next) {
  try {
    await prisma.notification.update({
      where: { id: req.params.id, userId: req.userId },
      data: { isRead: true },
    });
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
}

export async function markAllRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All marked as read' });
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    await prisma.notification.delete({ where: { id: req.params.id, userId: req.userId } });
    res.json({ message: 'Notification deleted' });
  } catch (err) { next(err); }
}
