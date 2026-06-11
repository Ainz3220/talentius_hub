import {
  listExpats,
  getExpatById,
  createExpat,
  updateExpat,
  updateExpatStatus,
  deleteExpat,
  revealExpatField,
} from './expat.service.js';

function ipOf(req) { return req.ip || req.connection?.remoteAddress; }
function uaOf(req) { return req.headers['user-agent']; }

export async function handleList(req, res, next) {
  try {
    const result = await listExpats(req.query);
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleGetById(req, res, next) {
  try {
    const result = await getExpatById(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleCreate(req, res, next) {
  try {
    const result = await createExpat(req.body, req.user.id, ipOf(req), uaOf(req));
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function handleUpdate(req, res, next) {
  try {
    const result = await updateExpat(req.params.id, req.body, req.user.id, ipOf(req), uaOf(req));
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleUpdateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });
    const result = await updateExpatStatus(req.params.id, status, req.user.id, ipOf(req), uaOf(req));
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleDelete(req, res, next) {
  try {
    await deleteExpat(req.params.id, req.user.id, ipOf(req), uaOf(req));
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function handleRevealField(req, res, next) {
  try {
    const { fieldName } = req.body;
    if (!fieldName) return res.status(400).json({ error: 'fieldName is required' });
    const result = await revealExpatField(req.params.id, fieldName, req.user.id, ipOf(req), uaOf(req));
    res.json(result);
  } catch (err) { next(err); }
}
