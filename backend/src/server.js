import 'dotenv/config';
import './config/env.js';
import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { startDocumentExpiryJob } from './jobs/documentExpiry.job.js';
import { startChecklistOverdueJob } from './jobs/checklistOverdue.job.js';

const PORT = env.PORT;

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    await startDocumentExpiryJob();
    await startChecklistOverdueJob();

    app.listen(PORT, () => {
      console.log(`ExpatFlow server running on port ${PORT} [${env.NODE_ENV}]`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
