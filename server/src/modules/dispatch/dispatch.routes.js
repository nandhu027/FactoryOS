import { Router } from "express";
import * as controller from "./dispatch.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { ApiError } from "../../utils/ApiError.js";

const router = Router();

router.param("id", (req, res, next, id) => {
  if (isNaN(Number(id))) return next(new ApiError(400, "Invalid Dispatch ID"));
  next();
});

router.get("/", authorize("DISPATCH", "can_view"), controller.getDispatches);
router.post("/", authorize("DISPATCH", "can_add"), controller.createDispatch);
router.get(
  "/:id",
  authorize("DISPATCH", "can_view"),
  controller.getDispatchById,
);

// 🌟 NEW ROUTE
router.post(
  "/:id/payments",
  authorize("DISPATCH", "can_edit"),
  controller.addDispatchPayment,
);

router.patch(
  "/:id/payment",
  authorize("DISPATCH", "can_edit"),
  controller.updatePaymentStatus,
);
router.patch(
  "/:id/info",
  authorize("DISPATCH", "can_edit"),
  controller.updateDispatchInfo,
);
router.delete(
  "/:id",
  authorize("DISPATCH", "can_delete"),
  controller.cancelDispatch,
);

export default router;
