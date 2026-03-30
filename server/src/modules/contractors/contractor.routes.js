import { Router } from "express";
import * as controller from "./contractor.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { ApiError } from "../../utils/ApiError.js";

const router = Router();

router.param("id", (req, res, next, id) => {
  if (id !== "semi-available" && isNaN(Number(id)))
    return next(new ApiError(400, "Invalid Job ID"));
  next();
});

router.get(
  "/",
  authorize("CONTRACTOR_IO", "can_view"),
  controller.getContractorJobs,
);
router.post(
  "/",
  authorize("CONTRACTOR_IO", "can_add"),
  controller.createContractorJob,
);

router.get(
  "/semi-available",
  authorize("STOCK_ENGINE", "can_view"),
  controller.getAvailableSemiStock,
);

router.get(
  "/:id",
  authorize("CONTRACTOR_IO", "can_view"),
  controller.getContractorJobById,
);
router.post(
  "/:id/return",
  authorize("CONTRACTOR_IO", "can_add"),
  controller.createContractorReturn,
);
router.delete(
  "/:id",
  authorize("CONTRACTOR_IO", "can_delete"),
  controller.cancelContractorJob,
);

router.post(
  "/multi-dispatch",
  authorize("CONTRACTOR_IO", "can_add"),
  controller.createMultiDispatch,
);

router.post(
  "/multi-return",
  authorize("CONTRACTOR_IO", "can_add"),
  controller.createMultiReturn,
);

router.post(
  "/:id/return",
  authorize("CONTRACTOR_IO", "can_add"),
  controller.createContractorReturn,
);

router.post(
  "/return/:returnId/reverse",
  authorize("CONTRACTOR_IO", "can_delete"),
  controller.reverseContractorReturn,
);

router.delete(
  "/:id",
  authorize("CONTRACTOR_IO", "can_delete"),
  controller.cancelContractorJob,
);

export default router;
