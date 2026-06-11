import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { search } from './search.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', search);

export default router;
