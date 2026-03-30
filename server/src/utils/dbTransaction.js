import { pool } from "../config/db.js";

export const withTransaction = async (callback, userId = null) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (userId) {
      await client.query(`SELECT set_config('app.user_id', $1, true)`, [
        userId.toString(),
      ]);
    }

    const result = await callback(client);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
};
