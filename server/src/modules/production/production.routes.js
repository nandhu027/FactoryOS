import { Router } from "express";
import * as controller from "./production.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { ApiError } from "../../utils/ApiError.js";

const router = Router();

router.param("id", (req, res, next, id) => {
  if (isNaN(Number(id)))
    return next(new ApiError(400, "Invalid Production ID"));
  next();
});

router.get("/", authorize("PRODUCTION", "can_view"), controller.getProductions);
router.post(
  "/",
  authorize("PRODUCTION", "can_add"),
  controller.createProduction,
);
router.get(
  "/:id",
  authorize("PRODUCTION", "can_view"),
  controller.getProductionById,
);

router.put(
  "/:id",
  authorize("PRODUCTION", "can_edit"),
  controller.updateProduction,
);

router.post(
  "/:id/steps/:stepId/post",
  authorize("PRODUCTION", "can_edit"),
  controller.postProductionStep,
);

router.delete(
  "/:id",
  authorize("PRODUCTION", "can_delete"),
  controller.cancelProduction,
);

router.delete(
  "/:id/hard",
  authorize("PRODUCTION", "can_delete"),
  controller.deleteProduction,
);

export default router;
