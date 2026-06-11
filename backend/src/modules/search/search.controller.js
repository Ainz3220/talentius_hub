import { prisma } from '../../config/db.js';

const RESULT_LIMIT = 20;

async function searchExpats(q) {
  const results = await prisma.expat.findMany({
    where: {
      deletedAt: null,
      OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { nationality: { contains: q, mode: 'insensitive' } },
        { expatNo: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: RESULT_LIMIT,
    select: { id: true, expatNo: true, fullName: true, nationality: true, status: true, clientId: true, dormitoryId: true },
  });
  return results.map((e) => ({ ...e, type: 'expat' }));
}

async function searchClients(q) {
  const results = await prisma.client.findMany({
    where: {
      deletedAt: null,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { clientNo: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: RESULT_LIMIT,
    select: { id: true, clientNo: true, name: true, type: true, status: true },
  });
  return results.map((r) => ({ ...r, type: 'client' }));
}

async function searchDormitories(q) {
  const results = await prisma.dormitory.findMany({
    where: {
      deletedAt: null,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { state: { contains: q, mode: 'insensitive' } },
        { dormitoryNo: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: RESULT_LIMIT,
    select: { id: true, dormitoryNo: true, name: true, state: true, status: true },
  });
  return results.map((r) => ({ ...r, type: 'dormitory' }));
}

export async function search(req, res, next) {
  try {
    const { q, type = 'all' } = req.query;
    if (!q || q.trim().length < 1) {
      return res.status(400).json({ error: 'q (search query) is required' });
    }

    const query = q.trim();
    const results = {};

    if (type === 'all' || type === 'expat') results.expats = await searchExpats(query);
    if (type === 'all' || type === 'client') results.clients = await searchClients(query);
    if (type === 'all' || type === 'dormitory') results.dormitories = await searchDormitories(query);

    const combined = Object.values(results).flat();
    res.json({ data: combined, breakdown: results, query });
  } catch (err) { next(err); }
}
