import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.js';
import { listClientsHandler, getClientHandler, createClientHandler, updateClientHandler, deleteClientHandler, getClientExpatsHandler, revealClientFieldHandler } from './client.controller.js';

const router = Router();
router.use(authenticate);
router.get('/', listClientsHandler);
router.get('/:id', getClientHandler);
router.post('/', createClientHandler);
router.patch('/:id', updateClientHandler);
router.delete('/:id', deleteClientHandler);
router.get('/:id/expats', getClientExpatsHandler);
router.post('/:id/reveal-field', revealClientFieldHandler);
export default router;
