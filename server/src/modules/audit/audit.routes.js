import { Router } from "express";
import * as controller from "./audit.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";

const router = Router();

router.get("/", authorize("AUDIT_LOG", "can_view"), controller.getAuditLogs);
router.get(
  "/tables",
  authorize("AUDIT_LOG", "can_view"),
  controller.getAuditTables,
);

export default router;
