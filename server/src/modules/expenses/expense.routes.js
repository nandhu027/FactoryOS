import { Router } from "express";
import * as controller from "./expense.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { ApiError } from "../../utils/ApiError.js";
import validate from "../../middlewares/validate.middleware.js";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryFilterSchema,
  createExpenseSchema,
  updateExpenseSchema,
  expenseFilterSchema,
} from "./expense.validation.js";

const router = Router();

router.param("id", (req, res, next, id) => {
  if (isNaN(Number(id))) return next(new ApiError(400, "Invalid ID format"));
  next();
});

router.post(
  "/categories",
  authorize("EXPENSES", "can_add"),
  validate(createCategorySchema),
  controller.createExpenseCategory,
);

router.get(
  "/categories",
  authorize("EXPENSES", "can_view"),
  validate(categoryFilterSchema, "query"),
  controller.getExpenseCategories,
);

router.get(
  "/categories/:id",
  authorize("EXPENSES", "can_view"),
  controller.getExpenseCategoryById,
);

router.patch(
  "/categories/:id",
  authorize("EXPENSES", "can_edit"),
  validate(updateCategorySchema),
  controller.updateExpenseCategory,
);

router.delete(
  "/categories/:id",
  authorize("EXPENSES", "can_delete"),
  controller.deleteExpenseCategory,
);

router.get(
  "/summary",
  authorize("EXPENSES", "can_view"),
  validate(expenseFilterSchema, "query"),
  controller.getExpenseSummary,
);

router.get(
  "/category-summary",
  authorize("EXPENSES", "can_view"),
  validate(expenseFilterSchema, "query"),
  controller.getExpenseCategorySummary,
);

router.post(
  "/",
  authorize("EXPENSES", "can_add"),
  validate(createExpenseSchema),
  controller.createExpense,
);

router.get(
  "/",
  authorize("EXPENSES", "can_view"),
  validate(expenseFilterSchema, "query"),
  controller.getExpenses,
);

router.get(
  "/:id",
  authorize("EXPENSES", "can_view"),
  controller.getExpenseById,
);

router.patch(
  "/:id",
  authorize("EXPENSES", "can_edit"),
  validate(updateExpenseSchema),
  controller.updateExpense,
);

router.delete(
  "/:id",
  authorize("EXPENSES", "can_delete"),
  controller.deleteExpense,
);

export default router;
