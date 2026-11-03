const http = require('http');
const env = require('./config/env');
const app = require('./app');
const logger = require('./utils/logger');
const { connectDB, disconnectDB } = require('./config/db');
const { startRoiScheduler, stopRoiScheduler } = require('./cron/roiScheduler');

async function main() {
  await connectDB();

  const server = http.createServer(app);
  server.listen(env.port, () => logger.info(`API listening on http://localhost:${env.port} (${env.nodeEnv})`));

  startRoiScheduler();

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down...`);
    stopRoiScheduler();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection', err);
  process.exit(1);
});

main().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
