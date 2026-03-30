import Joi from "joi";
import { ApiError } from "../../utils/ApiError.js";

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true, // This is great for security, but means we MUST list every valid field
    errors: { wrap: { label: false } },
  });

  if (error) {
    const errorMessages = error.details.map((err) => err.message).join(" | ");
    throw new ApiError(400, `Validation Failed: ${errorMessages}`);
  }
  return value;
};

const uomEnum = Joi.string().valid("KG", "TON", "PC").default("KG");

export const validateProductPayload = (data) => {
  const schema = Joi.object({
    product_name: Joi.string().trim().min(2).max(100).required(),
    product_code: Joi.string().trim().min(2).max(50).required(),
    default_uom: uomEnum,
    is_active: Joi.boolean().default(true),
  });
  return validate(schema, data);
};

export const validateProductUpdate = (data) => {
  const schema = Joi.object({
    product_name: Joi.string().trim().min(2).max(100).optional(),
    product_code: Joi.string().trim().min(2).max(50).optional(),
    default_uom: uomEnum.optional(),
    is_active: Joi.boolean().optional(),
  }).min(1);
  return validate(schema, data);
};

export const validateSemiFinishedPayload = (data) => {
  const schema = Joi.object({
    item_name: Joi.string().trim().min(2).max(100).required(),
    item_code: Joi.string().trim().min(2).max(50).required(),
    default_uom: uomEnum,
    is_active: Joi.boolean().default(true),
  });
  return validate(schema, data);
};

export const validateSemiFinishedUpdate = (data) => {
  const schema = Joi.object({
    item_name: Joi.string().trim().min(2).max(100).optional(),
    item_code: Joi.string().trim().min(2).max(50).optional(),
    default_uom: uomEnum.optional(),
    is_active: Joi.boolean().optional(),
  }).min(1);
  return validate(schema, data);
};

export const validateCatalogQuery = (query) => {
  const schema = Joi.object({
    search: Joi.string().trim().optional().allow(""),
    // 🚀 PRO FIX 1: Allow boolean OR the exact string "ALL"
    is_active: Joi.alternatives()
      .try(Joi.boolean(), Joi.string().valid("ALL", "all"))
      .optional(),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).optional().default(50),
  });
  return validate(schema, query);
};

export const validateDrillDownQuery = (query) => {
  const schema = Joi.object({
    startDate: Joi.date().iso().optional().allow(""),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).optional().allow(""),
  });
  return validate(schema, query);
};
