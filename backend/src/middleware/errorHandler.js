export function errorHandler(err, req, res, _next) {
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation error', details: err.flatten().fieldErrors });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  if (err.message?.includes('File type') || err.message?.includes('File size')) {
    return res.status(400).json({ error: err.message });
  }

  const status = err.status || err.statusCode || 500;

  // Expected client errors (4xx, e.g. an absent/expired refresh token on page load)
  // are part of normal operation — log a concise line, not a stack trace.
  // Only genuine server faults (5xx) get the full error logged.
  if (status >= 500) {
    console.error(err);
  } else {
    console.warn(`[${status}] ${req.method} ${req.originalUrl} - ${err.message}`);
  }

  const message = status < 500 ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
}
