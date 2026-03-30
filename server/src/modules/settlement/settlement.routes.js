import { Router } from "express";
import * as controller from "./settlement.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";

const router = Router();

router.get("/", authorize("PAYMENTS", "can_view"), controller.getSettlements);

router.post(
  "/process",
  authorize("PAYMENTS", "can_add"),
  controller.processSettlement,
);

router.delete(
  "/:record_id/payments/:payment_id",
  authorize("PAYMENTS", "can_delete"),
  controller.reverseSettlement,
);

router.get(
  "/:id",
  authorize("PAYMENTS", "can_view"),
  controller.getSettlementById,
);

export default router;
