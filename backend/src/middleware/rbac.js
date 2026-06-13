const ROLE_HIERARCHY = { STAFF: 0, MANAGER: 1, SUPER_ADMIN: 2 };

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    const userLevel = ROLE_HIERARCHY[req.user.role] ?? -1;
    const allowed = roles.some(r => ROLE_HIERARCHY[r] !== undefined && userLevel >= ROLE_HIERARCHY[r]);
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

export const isSuperAdmin = requireRole('SUPER_ADMIN');
export const isManager = requireRole('MANAGER', 'SUPER_ADMIN');
export const isStaff = requireRole('STAFF', 'MANAGER', 'SUPER_ADMIN');
