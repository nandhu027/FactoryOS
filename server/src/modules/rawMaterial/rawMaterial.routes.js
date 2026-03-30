import { Router } from "express";
import * as controller from "./rawMaterial.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { ApiError } from "../../utils/ApiError.js";

const router = Router();

router.param("id", (req, res, next, id) => {
  if (isNaN(Number(id))) return next(new ApiError(400, "Invalid id parameter"));
  next();
});

router.get(
  "/master",
  authorize("RAW_INWARD", "can_view"),
  controller.getRawMaterialsMaster,
);
router.post(
  "/master",
  authorize("RAW_INWARD", "can_add"),
  controller.createRawMaterialMaster,
);
router.put(
  "/master/:id",
  authorize("RAW_INWARD", "can_edit"),
  controller.updateRawMaterialMaster,
);
router.delete(
  "/master/:id",
  authorize("RAW_INWARD", "can_delete"),
  controller.deleteRawMaterialMaster,
);

router.get(
  "/master/:id/stock",
  authorize("RAW_INWARD", "can_view"),
  controller.getRawMaterialStock,
);
router.get(
  "/master/:id/traceability",
  authorize("RAW_INWARD", "can_view"),
  controller.getRawMaterialTraceability,
);

router.get("/", authorize("RAW_INWARD", "can_view"), controller.getRawInwards);
router.post(
  "/",
  authorize("RAW_INWARD", "can_add"),
  controller.createRawInward,
);
router.put(
  "/:id",
  authorize("RAW_INWARD", "can_edit"),
  controller.updateRawInward,
);
router.delete(
  "/:id",
  authorize("RAW_INWARD", "can_delete"),
  controller.cancelRawInward,
);

router.get(
  "/:id",
  authorize("RAW_INWARD", "can_view"),
  controller.getRawInwardById,
);

router.post(
  "/:id/payments",
  authorize("RAW_INWARD", "can_edit"),
  controller.addRawInwardPayment,
);

export default router;
