import { Router } from "express";
import * as controller from "./users.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import validate from "../../middlewares/validate.middleware.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  createUserSchema,
  updateUserSchema,
  assignRolesSchema,
} from "./users.validation.js";

const router = Router();

router.param("id", (req, res, next, id) => {
  if (isNaN(Number(id))) return next(new ApiError(400, "Invalid User ID"));
  next();
});

router.get("/", authorize("ADMIN_USERS", "can_view"), controller.getUsers);

router.post(
  "/",
  authorize("ADMIN_USERS", "can_add"),
  validate(createUserSchema),
  controller.createUser,
);

router.patch(
  "/:id",
  authorize("ADMIN_USERS", "can_edit"),
  validate(updateUserSchema),
  controller.updateUser,
);

router.delete(
  "/:id",
  authorize("ADMIN_USERS", "can_delete"),
  controller.deleteUser,
);

router.post(
  "/:id/roles",
  authorize("ADMIN_USERS", "can_edit"),
  validate(assignRolesSchema),
  controller.assignRoles,
);

router.get(
  "/:id",
  authorize("ADMIN_USERS", "can_view"),
  controller.getUserById,
);

export default router;
