import {
  listTransfers,
  getTransferById,
  createTransfer,
  approveTransfer,
  rejectTransfer,
  getExpatTransfers,
} from './transfer.service.js';

function ipOf(req) { return req.ip || req.connection?.remoteAddress; }
function uaOf(req) { return req.headers['user-agent']; }

export async function handleList(req, res, next) {
  try {
    const result = await listTransfers(req.query);
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleGetById(req, res, next) {
  try {
    const result = await getTransferById(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleCreate(req, res, next) {
  try {
    const result = await createTransfer(req.body, req.user.id, ipOf(req), uaOf(req));
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function handleApprove(req, res, next) {
  try {
    const result = await approveTransfer(req.params.id, req.user.id, ipOf(req), uaOf(req));
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleReject(req, res, next) {
  try {
    const { rejectedReason } = req.body;
    const result = await rejectTransfer(req.params.id, req.user.id, rejectedReason, ipOf(req), uaOf(req));
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleGetExpatTransfers(req, res, next) {
  try {
    const result = await getExpatTransfers(req.params.id);
    res.json({ data: result });
  } catch (err) { next(err); }
}
