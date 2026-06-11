// This middleware is used selectively; most audit logging happens in service layer
export function auditMiddleware(tableName) {
  return (req, res, next) => {
    req.auditContext = {
      tableName,
      performedBy: req.user?.id || 'SYSTEM',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
    next();
  };
}
