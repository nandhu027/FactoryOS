import Joi from "joi";

export const createCategorySchema = Joi.object({
  category_name: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Category name cannot be empty",
    "string.min": "Category name must be at least 2 characters long",
    "any.required": "Category name is required",
  }),
  is_active: Joi.boolean().default(true),
});

export const updateCategorySchema = Joi.object({
  category_name: Joi.string().trim().min(2).max(100),
  is_active: Joi.boolean(),
})
  .min(1)
  .messages({
    "object.min":
      "At least one field (category_name or is_active) must be provided for update",
  });

export const categoryFilterSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow(""),
  is_active: Joi.boolean(),
  sort: Joi.string().valid("asc", "desc").default("asc"),
});

export const createExpenseSchema = Joi.object({
  expense_date: Joi.date().iso().required().messages({
    "date.base": "Invalid date format. Use YYYY-MM-DD",
    "any.required": "Expense date is required",
  }),
  category_id: Joi.number().integer().positive().required().messages({
    "number.base": "Category ID must be a valid number",
    "any.required": "Category ID is required",
  }),
  amount: Joi.number().positive().precision(2).required().messages({
    "number.positive": "Amount must be greater than zero",
    "any.required": "Amount is required",
  }),
  reason: Joi.string().trim().min(2).max(500).required().messages({
    "string.empty": "Reason cannot be empty",
    "any.required": "Reason is required",
  }),
});

export const updateExpenseSchema = Joi.object({
  expense_date: Joi.date().iso(),
  category_id: Joi.number().integer().positive(),
  amount: Joi.number().positive().precision(2),
  reason: Joi.string().trim().min(2).max(500),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be updated",
  });

export const expenseFilterSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),

  category_id: Joi.number().integer().positive().empty(""),
  search: Joi.string().trim().max(200).allow("").empty(""),

  date_filter: Joi.string()
    .valid("today", "yesterday", "nextday", "week", "month", "custom")
    .empty(""),

  start_date: Joi.date().iso().empty(""),
  end_date: Joi.date().iso().min(Joi.ref("start_date")).empty(""),

  sort: Joi.string().valid("asc", "desc").default("desc"),
}).custom((value, helpers) => {
  if (
    value.date_filter === "custom" &&
    (!value.start_date || !value.end_date)
  ) {
    return helpers.message(
      "start_date and end_date are required when date_filter is 'custom'",
    );
  }
  return value;
});
