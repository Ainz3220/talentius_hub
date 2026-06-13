import prisma from '../../config/db.js';

export async function globalSearch(req, res, next) {
  try {
    const { q, type } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const results = [];

    if (!type || type === 'expat') {
      const expats = await prisma.expat.findMany({
        where: {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { nationality: { contains: q, mode: 'insensitive' } },
            { expatNo: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, expatNo: true, fullName: true, nationality: true, status: true },
        take: 5,
      });
      results.push(...expats.map(e => ({ type: 'expat', id: e.id, label: e.fullName, sub: `${e.expatNo} · ${e.nationality}`, status: e.status })));
    }

    if (!type || type === 'client') {
      const clients = await prisma.client.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true, type: true, status: true, clientNo: true },
        take: 5,
      });
      results.push(...clients.map(c => ({ type: 'client', id: c.id, label: c.name, sub: `Client #${c.clientNo} · ${c.type}`, status: c.status })));
    }

    if (!type || type === 'dormitory') {
      const dorms = await prisma.dormitory.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { state: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, state: true, status: true },
        take: 5,
      });
      results.push(...dorms.map(d => ({ type: 'dormitory', id: d.id, label: d.name, sub: d.state, status: d.status })));
    }

    res.json(results.slice(0, 15));
  } catch (err) { next(err); }
}
