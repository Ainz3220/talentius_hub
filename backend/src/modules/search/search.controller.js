import { prisma } from '../../config/db.js';
import { decrypt } from '../../config/encryption.js';

const RESULT_LIMIT = 20;

async function searchExpats(q) {
  // First try nationality field (plain text)
  const byNationality = await prisma.expat.findMany({
    where: {
      deletedAt: null,
      nationality: { contains: q, mode: 'insensitive' },
    },
    take: RESULT_LIMIT,
    select: { id: true, fullName: true, nationality: true, status: true, clientId: true, dormitoryId: true },
  });

  const nationalityIds = new Set(byNationality.map((e) => e.id));

  // Then scan fullName by decrypting (only fetch what we need)
  // For large datasets this is expensive; we use a small batch approach
  const allExpats = await prisma.expat.findMany({
    where: { deletedAt: null, id: { notIn: [...nationalityIds] } },
    select: { id: true, fullName: true, nationality: true, status: true, clientId: true, dormitoryId: true },
    take: 500, // scan limit to avoid full table decrypt
  });

  const nameMatches = allExpats
    .filter((e) => {
      if (!e.fullName) return false;
      const decrypted = decrypt(e.fullName);
      return decrypted && decrypted.toLowerCase().includes(q.toLowerCase());
    })
    .slice(0, RESULT_LIMIT - byNationality.length);

  return [...byNationality, ...nameMatches].slice(0, RESULT_LIMIT).map((e) => ({
    ...e,
    fullName: e.fullName ? decrypt(e.fullName) : null,
    type: 'expat',
  }));
}

async function searchClients(q) {
  const results = await prisma.client.findMany({
    where: {
      deletedAt: null,
      name: { contains: q, mode: 'insensitive' },
    },
    take: RESULT_LIMIT,
    select: { id: true, name: true, type: true, status: true },
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
      ],
    },
    take: RESULT_LIMIT,
    select: { id: true, name: true, state: true, status: true },
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

    if (type === 'all' || type === 'expat') {
      results.expats = await searchExpats(query);
    }
    if (type === 'all' || type === 'client') {
      results.clients = await searchClients(query);
    }
    if (type === 'all' || type === 'dormitory') {
      results.dormitories = await searchDormitories(query);
    }

    const combined = Object.values(results).flat();

    res.json({ data: combined, breakdown: results, query });
  } catch (err) { next(err); }
}
