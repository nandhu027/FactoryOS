import { ApiError } from "../utils/ApiError.js";
import { pool } from "../config/db.js";

export const authorize = (moduleCode, action) => {
  return async (req, res, next) => {
    try {
      if (req.user?.is_super_admin) return next();

      const userId = req.user?.id;
      if (!userId) throw new ApiError(401, "Unauthorized");

      const result = await pool.query(
        `
        SELECT bool_or(rmp.${action}) as has_perm
        FROM user_roles ur
        JOIN role_module_permissions rmp ON ur.role_id = rmp.role_id
        WHERE ur.user_id = $1 AND rmp.module_code = $2
        `,
        [userId, moduleCode],
      );

      if (!result.rows[0]?.has_perm) {
        throw new ApiError(
          403,
          `Permission Denied: ${action} on ${moduleCode}`,
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
