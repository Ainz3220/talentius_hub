import {
  listDormitories,
  getDormitoryById,
  createDormitory,
  updateDormitory,
  deleteDormitory,
  assignClient,
  removeClientAssignment,
  getDormitoryOccupants,
} from './dormitory.service.js';

function ipOf(req) { return req.ip || req.connection?.remoteAddress; }
function uaOf(req) { return req.headers['user-agent']; }

export async function handleList(req, res, next) {
  try {
    const result = await listDormitories(req.query);
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleGetById(req, res, next) {
  try {
    const result = await getDormitoryById(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleCreate(req, res, next) {
  try {
    const result = await createDormitory(req.body, req.user.id, ipOf(req), uaOf(req));
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function handleUpdate(req, res, next) {
  try {
    const result = await updateDormitory(req.params.id, req.body, req.user.id, ipOf(req), uaOf(req));
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleDelete(req, res, next) {
  try {
    await deleteDormitory(req.params.id, req.user.id, ipOf(req), uaOf(req));
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function handleAssignClient(req, res, next) {
  try {
    const { clientId, note } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const result = await assignClient(req.params.id, clientId, req.user.id, note);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function handleRemoveClient(req, res, next) {
  try {
    await removeClientAssignment(req.params.id, req.params.clientId, req.user.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function handleGetOccupants(req, res, next) {
  try {
    const result = await getDormitoryOccupants(req.params.id);
    res.json({ data: result });
  } catch (err) { next(err); }
}
