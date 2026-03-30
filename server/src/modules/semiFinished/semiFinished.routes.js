import { Router } from "express";
import * as controller from "./semiFinished.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";

const router = Router();

router.get(
  "/",
  authorize("PRODUCTS", "can_view"),
  controller.getAllSemiFinished,
);
router.post(
  "/",
  authorize("PRODUCTS", "can_add"),
  controller.createSemiFinished,
);
router.get(
  "/:id",
  authorize("PRODUCTS", "can_view"),
  controller.getSemiFinishedById,
);
router.put(
  "/:id",
  authorize("PRODUCTS", "can_edit"),
  controller.updateSemiFinished,
);
router.delete(
  "/:id",
  authorize("PRODUCTS", "can_delete"),
  controller.deleteSemiFinished,
);

export default router;
