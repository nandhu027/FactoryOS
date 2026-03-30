import { Router } from "express";
import * as controller from "./dashboard.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";

const router = Router();

router.get(
  "/",
  authorize("DASHBOARD", "can_view"),
  controller.getDashboardData,
);

export default router;
