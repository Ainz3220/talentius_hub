import { z } from 'zod';
import * as clientService from './client.service.js';

const createSchema = z.object({
  type: z.enum(['COMPANY', 'INDIVIDUAL']),
  name: z.string().min(1),
  registrationNo: z.string().optional(),
  contactName: z.string().min(1),
  contactPhone: z.string().min(1),
  contactEmail: z.string().email(),
  address: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export async function listClientsHandler(req, res, next) {
  try { res.json(await clientService.listClients(req.query)); } catch (err) { next(err); }
}
export async function getClientHandler(req, res, next) {
  try { res.json(await clientService.getClientById(req.params.id)); } catch (err) { next(err); }
}
export async function createClientHandler(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    res.status(201).json(await clientService.createClient(data, req.user.id, req.ip, req.headers['user-agent']));
  } catch (err) { next(err); }
}
export async function updateClientHandler(req, res, next) {
  try {
    const data = createSchema.partial().parse(req.body);
    res.json(await clientService.updateClient(req.params.id, data, req.user.id, req.ip, req.headers['user-agent']));
  } catch (err) { next(err); }
}
export async function deleteClientHandler(req, res, next) {
  try {
    await clientService.deleteClient(req.params.id, req.user.id, req.ip, req.headers['user-agent']);
    res.status(204).send();
  } catch (err) { next(err); }
}
export async function getClientExpatsHandler(req, res, next) {
  try { res.json(await clientService.getClientExpats(req.params.id)); } catch (err) { next(err); }
}
export async function revealClientFieldHandler(req, res, next) {
  try {
    const { fieldName } = z.object({ fieldName: z.string() }).parse(req.body);
    res.json(await clientService.revealClientField(req.params.id, fieldName, req.user.id, req.ip, req.headers['user-agent']));
  } catch (err) { next(err); }
}
