import { Router } from "express";
import * as controller from "./search.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js"; // Standard safety measure

const router = Router();

router.get(
  "/global",
  authorize("JOBBOOK", "can_view"),
  controller.globalSearch,
);

export default router;
