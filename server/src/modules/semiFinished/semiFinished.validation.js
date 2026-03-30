import Joi from "joi";
import { ApiError } from "../../utils/ApiError.js";

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error)
    throw new ApiError(
      400,
      `Validation Failed: ${error.details.map((x) => x.message).join(", ")}`,
    );
  return value;
};

export const validateSemiFinishedQuery = (query) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    search: Joi.string().trim().optional().allow(""),
    status: Joi.string().valid("ACTIVE", "INACTIVE", "ALL").default("ALL"),
    uom: Joi.string().valid("KG", "TON", "PC").optional().allow(""),
  });
  return validate(schema, query);
};

export const validateCreateSemiFinished = (data) => {
  const schema = Joi.object({
    item_name: Joi.string().trim().min(2).max(150).required(),
    item_code: Joi.string().trim().min(2).max(50).required(),
    default_uom: Joi.string().valid("KG", "TON", "PC").required(),
  });
  return validate(schema, data);
};

export const validateUpdateSemiFinished = (data) => {
  const schema = Joi.object({
    item_name: Joi.string().trim().min(2).max(150).optional(),
    item_code: Joi.string().trim().min(2).max(50).optional(),
    default_uom: Joi.string().valid("KG", "TON", "PC").optional(),
    is_active: Joi.boolean().optional(),
  });
  return validate(schema, data);
};
