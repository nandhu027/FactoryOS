import { Router } from "express";
import * as controller from "./jobbook.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";

const router = Router();

router.get(
  "/live",
  authorize("JOBBOOK", "can_view"),
  controller.getLiveJobBook,
);

export default router;
