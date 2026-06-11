import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import webhookRoutes from './modules/webhooks/webhook.routes.js';
import clientRoutes from './modules/expat/client/client.routes.js';
import dormitoryRoutes from './modules/expat/dormitory/dormitory.routes.js';
import expatRoutes from './modules/expat/expat/expat.routes.js';
import transferRoutes from './modules/expat/transfer/transfer.routes.js';
import documentRoutes from './modules/expat/document/document.routes.js';
import checklistRoutes from './modules/expat/checklist/checklist.routes.js';
import checklistTemplateRoutes from './modules/expat/checklist/checklist-template.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import searchRoutes from './modules/search/search.routes.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(apiLimiter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/dormitories', dormitoryRoutes);
app.use('/api/expats', expatRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/checklist-templates', checklistTemplateRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);

app.use(errorHandler);

export default app;
