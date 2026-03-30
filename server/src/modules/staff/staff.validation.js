import Joi from "joi";
import { ApiError } from "../../utils/ApiError.js";

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    errors: { wrap: { label: false } },
  });

  if (error) {
    const errorMessages = error.details.map((err) => err.message).join(", ");
    throw new ApiError(400, `Validation Error: ${errorMessages}`);
  }
  return value;
};

const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

const dateFilterSchema = {
  date_filter: Joi.string()
    .valid("today", "yesterday", "nextday", "week", "month", "custom", "")
    .optional()
    .allow(""),
  start_date: Joi.date().iso().optional().allow(""),
  end_date: Joi.date().iso().min(Joi.ref("start_date")).optional().allow(""),
};

export const validateCreateWorkType = (data) => {
  const schema = Joi.object({
    work_type_name: Joi.string().trim().min(2).max(100).required(),
    description: Joi.string().trim().max(500).optional().allow(""),
  });
  return validate(schema, data);
};

export const validateUpdateWorkType = (data) => {
  const schema = Joi.object({
    work_type_name: Joi.string().trim().min(2).max(100).optional(),
    description: Joi.string().trim().max(500).optional().allow(""),
    is_active: Joi.boolean().optional(),
  }).min(1);
  return validate(schema, data);
};

export const validateWorkTypeQuery = (query) => {
  const schema = Joi.object({
    search: Joi.string().trim().optional().allow(""),
    is_active: Joi.boolean().optional(),
  });
  return validate(schema, query);
};

export const validateCreateStaff = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
      "string.empty": "Personnel name cannot be empty.",
      "any.required": "Personnel name is required.",
    }),
    category: Joi.string().valid("STAFF", "CONTRACTOR").required(),
    phone: Joi.string().trim().max(20).optional().allow(""),
    address: Joi.string().trim().max(500).optional().allow(""),
    // Accepts either an array of existing integer IDs or new string names to be created on the fly
    work_types: Joi.array()
      .items(
        Joi.alternatives().try(Joi.string(), Joi.number().integer().positive()),
      )
      .default([]),
    machine_ids: Joi.array()
      .items(Joi.number().integer().positive())
      .default([]),
  });

  return validate(schema, data);
};

export const validateUpdateStaff = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    category: Joi.string().valid("STAFF", "CONTRACTOR").optional(),
    phone: Joi.string().trim().max(20).optional().allow(""),
    address: Joi.string().trim().max(500).optional().allow(""),
    is_active: Joi.boolean().optional(),
    work_types: Joi.array()
      .items(
        Joi.alternatives().try(Joi.string(), Joi.number().integer().positive()),
      )
      .optional(),
    machine_ids: Joi.array()
      .items(Joi.number().integer().positive())
      .optional(),
  }).min(1);

  return validate(schema, data);
};

export const validateStaffQuery = (query) => {
  const schema = Joi.object({
    ...paginationSchema,
    search: Joi.string().trim().optional().allow(""),
    personnel_type: Joi.string()
      .valid("STAFF", "CONTRACTOR", "")
      .optional()
      .allow(""),
    type: Joi.string().valid("STAFF", "CONTRACTOR", "").optional().allow(""), // Fallback
    is_active: Joi.boolean().optional(),
  });

  return validate(schema, query);
};

export const validatePersonnelDetailsQuery = (query) => {
  const schema = Joi.object({
    ...paginationSchema,
    ...dateFilterSchema,
    search: Joi.string().trim().optional().allow(""),
    status: Joi.string().valid("OPEN", "CLOSED", "ALL").default("ALL"),
  });

  const validated = validate(schema, query);
  if (validated.date_filter === "custom") {
    if (!validated.start_date || !validated.end_date) {
      throw new ApiError(
        400,
        "start_date and end_date are strictly required when using custom date_filter.",
      );
    }
  }
  return validated;
};
