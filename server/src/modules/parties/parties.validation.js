import Joi from "joi";
import { ApiError } from "../../utils/ApiError.js";

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    errors: { wrap: { label: false } },
  });

  if (error) {
    const errorMessages = error.details.map((err) => err.message).join(" | ");
    throw new ApiError(400, `Validation Failed: ${errorMessages}`);
  }
  return value;
};

const PARTY_TYPES = ["PURCHASE", "SALE", "JOB_WORK"];

export const validatePartyPayload = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(150).required(),
    phone: Joi.string().trim().max(20).optional().allow("", null),
    address: Joi.string().trim().max(500).optional().allow("", null),
    types: Joi.array()
      .items(Joi.string().valid(...PARTY_TYPES))
      .min(1)
      .required(),
    is_active: Joi.boolean().default(true),
  });
  return validate(schema, data);
};

export const validatePartyUpdate = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(150).optional(),
    phone: Joi.string().trim().max(20).optional().allow("", null),
    address: Joi.string().trim().max(500).optional().allow("", null),
    types: Joi.array()
      .items(Joi.string().valid(...PARTY_TYPES))
      .min(1)
      .optional(),
    is_active: Joi.boolean().optional(),
  }).min(1);
  return validate(schema, data);
};

export const validatePartyQuery = (query) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(50),
    search: Joi.string().trim().optional().allow(""),
    type: Joi.string()
      .valid(...PARTY_TYPES)
      .optional()
      .allow(""),
    is_active: Joi.boolean().optional(),
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
