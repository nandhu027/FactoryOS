import bcrypt from "bcrypt";
import { ApiError } from "../../utils/ApiError.js";

const SALT_ROUNDS = 10;

export const createUserService = async (client, data) => {
  const {
    username,
    full_name,
    password,
    is_super_admin = false,
    is_active = true,
  } = data;

  const existing = await client.query(
    `SELECT id FROM users WHERE lower(username) = lower($1)`,
    [username],
  );
  if (existing.rowCount > 0) throw new ApiError(400, "Username already exists");

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await client.query(
    `INSERT INTO users (username, full_name, password_hash, is_super_admin, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, full_name, is_super_admin, is_active, created_at`,
    [username, full_name, hashedPassword, is_super_admin, is_active],
  );

  return result.rows[0];
};

export const getUsersService = async (client) => {
  const result = await client.query(`
    SELECT 
      u.id, u.username, u.full_name, u.is_super_admin, u.is_active, u.created_at,
      COALESCE(
        json_agg(json_build_object('role_id', r.id, 'role_name', r.role_name)) 
        FILTER (WHERE r.id IS NOT NULL), '[]'
      ) AS assigned_roles
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    GROUP BY u.id
    ORDER BY u.id DESC
  `);

  return result.rows;
};

export const updateUserService = async (client, id, data) => {
  const userRes = await client.query(`SELECT * FROM users WHERE id = $1`, [id]);
  if (userRes.rowCount === 0) throw new ApiError(404, "User not found");

  const existing = userRes.rows[0];

  if (existing.is_super_admin && data.is_super_admin === false) {
    throw new ApiError(403, "Cannot remove Super Admin privileges");
  }

  let hashedPassword = existing.password_hash;
  if (data.password && data.password.trim() !== "") {
    hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
  }

  const result = await client.query(
    `UPDATE users
     SET password_hash = $1,
         is_active = COALESCE($2, is_active),
         full_name = COALESCE($3, full_name),
         is_super_admin = COALESCE($4, is_super_admin)
     WHERE id = $5
     RETURNING id, username, full_name, is_super_admin, is_active`,
    [hashedPassword, data.is_active, data.full_name, data.is_super_admin, id],
  );

  return result.rows[0];
};

export const deleteUserService = async (client, id) => {
  const userRes = await client.query(
    `SELECT is_super_admin FROM users WHERE id = $1`,
    [id],
  );
  if (userRes.rowCount === 0) throw new ApiError(404, "User not found");
  if (userRes.rows[0].is_super_admin)
    throw new ApiError(403, "Super Admin cannot be deleted");

  const activityCheck = await client.query(
    `SELECT 1 FROM audit_logs WHERE changed_by = $1 LIMIT 1`,
    [id],
  );

  if (activityCheck.rowCount > 0) {
    throw new ApiError(
      409, // Conflict
      "Cannot delete! This user has recorded system activity. To preserve historical audit logs, please 'Edit' the user and turn off their 'Active Account' switch to suspend them instead.",
    );
  }

  await client.query(`DELETE FROM users WHERE id = $1`, [id]);
  return { message: "User deleted successfully" };
};

export const assignUserRolesService = async (client, userId, roleIds) => {
  const userRes = await client.query(`SELECT id FROM users WHERE id = $1`, [
    userId,
  ]);
  if (userRes.rowCount === 0) throw new ApiError(404, "User not found");

  await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);

  if (roleIds && roleIds.length > 0) {
    for (const roleId of roleIds) {
      const roleCheck = await client.query(
        `SELECT id FROM roles WHERE id = $1`,
        [roleId],
      );
      if (roleCheck.rowCount > 0) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
          [userId, roleId],
        );
      }
    }
  }

  return { message: "User roles updated successfully" };
};

export const getUserByIdService = async (client, id) => {
  const userRes = await client.query(
    `
    SELECT 
      u.id, u.username, u.full_name, u.is_super_admin, u.is_active, u.created_at,
      COALESCE(
        json_agg(json_build_object('role_id', r.id, 'role_name', r.role_name)) 
        FILTER (WHERE r.id IS NOT NULL), '[]'
      ) AS assigned_roles
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE u.id = $1
    GROUP BY u.id
  `,
    [id],
  );

  if (!userRes.rowCount) throw new ApiError(404, "User not found");

  const activityRes = await client.query(
    `
    SELECT id, table_name, action, record_pk, changed_at
    FROM audit_logs
    WHERE changed_by = $1
    ORDER BY changed_at DESC
    LIMIT 50
  `,
    [id],
  );

  return {
    ...userRes.rows[0],
    recent_activity: activityRes.rows,
  };
};
