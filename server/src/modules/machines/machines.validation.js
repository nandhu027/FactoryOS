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

const MACHINE_STATUSES = ["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE"];

export const validateMachinePayload = (data) => {
  const schema = Joi.object({
    machine_name: Joi.string().trim().min(2).max(100).required(),
    physical_weight_kg: Joi.number().positive().optional().allow(null, ""),
    capacity_per_hour: Joi.number().positive().optional().allow(null, ""),
    capacity_uom: Joi.string()
      .valid("KG", "TON", "PC")
      .optional()
      .allow(null, ""),
    status: Joi.string()
      .valid(...MACHINE_STATUSES)
      .default("ACTIVE"),
  });
  return validate(schema, data);
};

export const validateMachineUpdate = (data) => {
  const schema = Joi.object({
    machine_name: Joi.string().trim().min(2).max(100).optional(),
    physical_weight_kg: Joi.number().positive().optional().allow(null, ""),
    capacity_per_hour: Joi.number().positive().optional().allow(null, ""),
    capacity_uom: Joi.string()
      .valid("KG", "TON", "PC")
      .optional()
      .allow(null, ""),
    status: Joi.string()
      .valid(...MACHINE_STATUSES)
      .optional(),
    is_active: Joi.boolean().optional(),
  }).min(1);
  return validate(schema, data);
};

export const validateMachineQuery = (query) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    search: Joi.string().trim().optional().allow(""),
    status: Joi.string()
      .valid(...MACHINE_STATUSES)
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
