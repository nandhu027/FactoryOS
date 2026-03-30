import { Router } from "express";
import {
  createRole,
  updateRole,
  deleteRole,
  getRoles,
  getModules,
  assignPermissionsToRole,
  getRolePermissions,
  assignRolesToUser,
  getUsersWithRoles,
} from "./roles.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";

const router = Router();

router.get("/", authorize("ADMIN_USERS", "can_view"), getRoles);
router.post("/", authorize("ADMIN_USERS", "can_add"), createRole);
router.put("/:roleId", authorize("ADMIN_USERS", "can_edit"), updateRole);
router.delete("/:roleId", authorize("ADMIN_USERS", "can_delete"), deleteRole);

router.get("/modules", authorize("ADMIN_USERS", "can_view"), getModules);
router.get(
  "/:roleId/permissions",
  authorize("ADMIN_USERS", "can_view"),
  getRolePermissions,
);
router.put(
  "/:roleId/permissions",
  authorize("ADMIN_USERS", "can_edit"),
  assignPermissionsToRole,
);

router.get(
  "/users-mapping",
  authorize("ADMIN_USERS", "can_view"),
  getUsersWithRoles,
);
router.put(
  "/assign/:userId",
  authorize("ADMIN_USERS", "can_edit"),
  assignRolesToUser,
);

export default router;
