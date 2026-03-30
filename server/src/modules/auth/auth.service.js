import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ApiError } from "../../utils/ApiError.js";
import { env } from "../../config/env.js";

export const loginService = async (
  client,
  username,
  password,
  rememberMe = false,
) => {
  try {
    const result = await client.query(
      `
      SELECT id, username, full_name, password_hash, is_super_admin, is_active
      FROM users
      WHERE lower(username) = lower($1)
      `,
      [username],
    );

    if (result.rowCount === 0) {
      throw new ApiError(404, "This user doesn't exist in this system.");
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new ApiError(
        403,
        "Account suspended. Please contact your system administrator for access.",
      );
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      throw new ApiError(401, "Wrong Password. Try a different password.");
    }

    const expiresIn = rememberMe ? "30d" : env.jwtExpiresIn;

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        is_super_admin: user.is_super_admin,
      },
      env.jwtSecret,
      { expiresIn },
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        is_super_admin: user.is_super_admin,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("[Login Service Error]:", error);
    throw new ApiError(
      500,
      "A critical system anomaly occurred while establishing a secure connection. Please try again later.",
    );
  }
};

export const getCurrentUserService = async (client, userId) => {
  try {
    const userRes = await client.query(
      `
      SELECT id, username, full_name, is_super_admin
      FROM users
      WHERE id = $1
      `,
      [userId],
    );

    if (userRes.rowCount === 0) {
      throw new ApiError(
        404,
        "User profile integrity check failed. Record not found.",
      );
    }

    const user = userRes.rows[0];

    if (user.is_super_admin) {
      return {
        user,
        permissions: "ALL",
      };
    }

    const permRes = await client.query(
      `
      SELECT rmp.module_code,
             bool_or(rmp.can_add) AS can_add,
             bool_or(rmp.can_edit) AS can_edit,
             bool_or(rmp.can_delete) AS can_delete,
             bool_or(rmp.can_view) AS can_view
      FROM user_roles ur
      JOIN role_module_permissions rmp
        ON ur.role_id = rmp.role_id
      WHERE ur.user_id = $1
      GROUP BY rmp.module_code
      `,
      [userId],
    );

    return {
      user,
      permissions: permRes.rows,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("[Get Current User Error]:", error);
    throw new ApiError(
      500,
      "Unable to verify access clearances at this time. Please reload the dashboard.",
    );
  }
};
