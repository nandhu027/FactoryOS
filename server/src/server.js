import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDatabase, closeDatabase } from "./config/db.js";

const startServer = async () => {
  try {
    await connectDatabase();

    const server = app.listen(env.port, () => {
      logger.info(
        `🚀 FactoryOS Backend running on port ${env.port} [${env.nodeEnv}]`,
      );
    });

    const shutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      server.close(async () => {
        await closeDatabase();
        logger.info("Cleanup complete. Server closed.");
        process.exit(0);
      });

      setTimeout(() => {
        logger.error("Could not close connections in time, forceful shutdown.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error("FATAL: Failed to start server", error);
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection at Promise", { reason });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception thrown", { error });
  process.exit(1);
});

startServer();
