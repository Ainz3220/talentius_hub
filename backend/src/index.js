import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import expatRoutes from './modules/expat/expat/expat.routes.js';
import clientRoutes from './modules/expat/client/client.routes.js';
import dormitoryRoutes from './modules/expat/dormitory/dormitory.routes.js';
import transferRoutes from './modules/expat/transfer/transfer.routes.js';
import documentRoutes from './modules/expat/document/document.routes.js';
import checklistRoutes from './modules/expat/checklist/checklist.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import searchRoutes from './modules/search/search.routes.js';
import webhooksRoutes from './modules/webhooks/webhooks.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1);

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(apiLimiter);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '..', env.UPLOAD_DIR)));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/expats', expatRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/dormitories', dormitoryRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/webhooks', webhooksRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', env: env.NODE_ENV }));

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`[Server] Running on port ${env.PORT} (${env.NODE_ENV})`);
});

export default app;
