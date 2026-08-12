import app from './app';
import { env } from './config/env';
import { createEmailWorker } from './workers/emailWorker';

const PORT = env.PORT || 5000;

// Initialize BullMQ worker
const emailWorker = createEmailWorker();

const server = app.listen(PORT, () => {
  console.log(`🚀 ReachInbox Backend running on port ${PORT}`);
  console.log(`📡 Health Check URL: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Google Auth URL: http://localhost:${PORT}/api/auth/google`);
});

// Graceful Shutdown Handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n⚠️ Received ${signal}. Shutting down server gracefully...`);
  server.close(async () => {
    console.log('🔒 HTTP Server closed.');
    await emailWorker.close();
    console.log('🔒 BullMQ Worker closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
