import {
  listDocuments,
  getExpiringDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  bulkDownload,
} from './document.service.js';

function ipOf(req) { return req.ip || req.connection?.remoteAddress; }
function uaOf(req) { return req.headers['user-agent']; }

export async function handleList(req, res, next) {
  try {
    const result = await listDocuments(req.query);
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleGetExpiring(req, res, next) {
  try {
    const result = await getExpiringDocuments(req.query.days);
    res.json({ data: result });
  } catch (err) { next(err); }
}

export async function handleUpload(req, res, next) {
  try {
    const result = await uploadDocument(req.file, req.body, req.user.id, ipOf(req), uaOf(req));
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function handleDownload(req, res, next) {
  try {
    await downloadDocument(req.params.id, req, res);
  } catch (err) { next(err); }
}

export async function handleDelete(req, res, next) {
  try {
    await deleteDocument(req.params.id, req.user.id, ipOf(req), uaOf(req));
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function handleBulkDownload(req, res, next) {
  try {
    const { ids } = req.body;
    await bulkDownload(ids, res);
  } catch (err) { next(err); }
}
