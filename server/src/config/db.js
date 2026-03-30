import pkg from "pg";
import { env } from "./env.js";
import { logger } from "./logger.js";

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: env.db.url,
  ssl: {
    rejectUnauthorized: false,
  },

  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  application_name: "steel_erp_backend",
});

pool.on("error", (err) => {
  logger.error("Unexpected PostgreSQL pool error", err);
  process.exit(1);
});

export const connectDatabase = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    logger.info(`PostgreSQL connected at ${result.rows[0].now}`);

    client.release();
  } catch (error) {
    logger.error("Database connection failed", error);
    process.exit(1);
  }
};

export const closeDatabase = async () => {
  await pool.end();
  logger.info("PostgreSQL connection closed");
};
