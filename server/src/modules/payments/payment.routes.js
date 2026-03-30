import { Router } from "express";
import * as controller from "./payment.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { ApiError } from "../../utils/ApiError.js";
import validate from "../../middlewares/validate.middleware.js";
import {
  createPaymentSchema,
  updatePaymentSchema,
  paymentFilterSchema,
  salaryGenerationSchema,
  contractorPayoutSchema,
} from "./payment.validation.js";

const router = Router();

router.param("id", (req, res, next, id) => {
  if (isNaN(Number(id))) return next(new ApiError(400, "Invalid ID format"));
  next();
});

router.get(
  "/summary",
  authorize("PAYMENTS", "can_view"),
  validate(paymentFilterSchema, "query"),
  controller.getPaymentSummary,
);

router.get(
  "/personnel-summary",
  authorize("PAYMENTS", "can_view"),
  validate(paymentFilterSchema, "query"),
  controller.getPersonnelPaymentSummary,
);

router.get(
  "/generate-salary",
  authorize("PAYMENTS", "can_view"),
  validate(salaryGenerationSchema, "query"),
  controller.generateSalary,
);

router.get(
  "/generate-contractor-payout",
  authorize("PAYMENTS", "can_view"),
  validate(contractorPayoutSchema, "query"),
  controller.generateContractorPayout,
);

router.post(
  "/",
  authorize("PAYMENTS", "can_add"),
  validate(createPaymentSchema),
  controller.createPayment,
);

router.get(
  "/",
  authorize("PAYMENTS", "can_view"),
  validate(paymentFilterSchema, "query"),
  controller.getPayments,
);

router.get(
  "/:id",
  authorize("PAYMENTS", "can_view"),
  controller.getPaymentById,
);

router.patch(
  "/:id",
  authorize("PAYMENTS", "can_edit"),
  validate(updatePaymentSchema),
  controller.updatePayment,
);

router.delete(
  "/:id",
  authorize("PAYMENTS", "can_delete"),
  controller.deletePayment,
);

export default router;
