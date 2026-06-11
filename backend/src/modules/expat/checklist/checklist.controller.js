import {
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  addTemplateItem,
  updateTemplateItem,
  deleteTemplateItem,
  listChecklists,
  getChecklistById,
  createChecklist,
  archiveChecklist,
  updateChecklistItem,
} from './checklist.service.js';

function ipOf(req) { return req.ip || req.connection?.remoteAddress; }
function uaOf(req) { return req.headers['user-agent']; }

// ─── Template handlers ─────────────────────────────────────────────────────────

export async function handleListTemplates(req, res, next) {
  try {
    const result = await listTemplates(req.query);
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleGetTemplateById(req, res, next) {
  try {
    const result = await getTemplateById(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleCreateTemplate(req, res, next) {
  try {
    const result = await createTemplate(req.body, req.user.id, ipOf(req), uaOf(req));
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function handleUpdateTemplate(req, res, next) {
  try {
    const result = await updateTemplate(req.params.id, req.body, req.user.id, ipOf(req), uaOf(req));
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleDeleteTemplate(req, res, next) {
  try {
    await deleteTemplate(req.params.id, req.user.id, ipOf(req), uaOf(req));
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function handleAddTemplateItem(req, res, next) {
  try {
    const result = await addTemplateItem(req.params.id, req.body, req.user.id);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function handleUpdateTemplateItem(req, res, next) {
  try {
    const result = await updateTemplateItem(req.params.id, req.params.itemId, req.body, req.user.id);
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleDeleteTemplateItem(req, res, next) {
  try {
    await deleteTemplateItem(req.params.id, req.params.itemId, req.user.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

// ─── Checklist instance handlers ──────────────────────────────────────────────

export async function handleListChecklists(req, res, next) {
  try {
    const result = await listChecklists(req.query);
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleGetChecklistById(req, res, next) {
  try {
    const result = await getChecklistById(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
}

export async function handleCreateChecklist(req, res, next) {
  try {
    const result = await createChecklist(req.body, req.user.id, ipOf(req), uaOf(req));
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function handleArchiveChecklist(req, res, next) {
  try {
    await archiveChecklist(req.params.id, req.user.id, ipOf(req), uaOf(req));
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function handleUpdateChecklistItem(req, res, next) {
  try {
    const result = await updateChecklistItem(
      req.params.id,
      req.params.itemId,
      req.body,
      req.user.id,
      ipOf(req),
      uaOf(req)
    );
    res.json(result);
  } catch (err) { next(err); }
}
