import Joi from "joi";

export const createPaymentSchema = Joi.object({
  payment_date: Joi.date().iso().required().messages({
    "date.base": "Invalid date format. Use YYYY-MM-DD",
    "any.required": "Payment date is required",
  }),
  personnel_id: Joi.number().integer().positive().required(),
  amount: Joi.number().min(0).precision(2).required().messages({
    "number.min": "Amount cannot be negative",
    "any.required": "Amount is required",
  }),
  reason: Joi.string().trim().min(2).max(500).required(),
});

export const updatePaymentSchema = Joi.object({
  payment_date: Joi.date().iso(),
  personnel_id: Joi.number().integer().positive(),
  amount: Joi.number().positive().precision(2),
  reason: Joi.string().trim().min(2).max(500),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be updated",
  });

export const paymentFilterSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(20),

  personnel_id: Joi.number().integer().positive().empty(""),
  personnel_type: Joi.string().valid("STAFF", "CONTRACTOR").empty(""),
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

export const salaryGenerationSchema = Joi.object({
  personnel_id: Joi.number().integer().positive().required().messages({
    "any.required": "Personnel ID is required to generate salary",
  }),
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2000).max(2100).required(),
  base_salary: Joi.number().min(0).required().messages({
    "number.min": "Base salary cannot be negative",
    "any.required": "Base salary is required for calculations",
  }),
  shift_hours: Joi.number().positive().default(8).messages({
    "number.base": "Shift hours must be a number (default is 8)",
  }),
});

export const contractorPayoutSchema = Joi.object({
  personnel_id: Joi.number().integer().positive().required().messages({
    "any.required": "Contractor ID is required to generate payout",
  }),
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2000).max(2100).required(),
  rates: Joi.string()
    .required()
    .custom((val, helpers) => {
      try {
        JSON.parse(val);
        return val;
      } catch (err) {
        return helpers.error("any.invalid");
      }
    }),
  selected_items: Joi.string()
    .optional()
    .custom((val, helpers) => {
      try {
        JSON.parse(val);
        return val;
      } catch (err) {
        return helpers.error("any.invalid");
      }
    }),
});
