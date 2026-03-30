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

export const validateRawMaterialMaster = (data) => {
  const schema = Joi.object({
    material_name: Joi.string().trim().min(2).max(100).required(),
    default_uom: Joi.string().valid("KG", "TON", "PC").default("KG"),
    is_active: Joi.boolean().default(true),
  });
  return validate(schema, data);
};

export const validateRawInwardQuery = (query) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    search: Joi.string().trim().optional().allow(""),
    business_model: Joi.string()
      .valid("OWN_MANUFACTURING", "JOB_WORK")
      .optional()
      .allow(""),
    party_id: Joi.number().integer().positive().optional().allow(""),
    date_filter: Joi.string()
      .valid("TODAY", "YESTERDAY", "CUSTOM", "ALL", "")
      .optional()
      .allow(""),
    custom_start: Joi.date().iso().optional().allow(""),
    custom_end: Joi.date()
      .iso()
      .min(Joi.ref("custom_start"))
      .optional()
      .allow(""),
  });
  return validate(schema, query);
};

export const validateRawInwardPayload = (data) => {
  const schema = Joi.object({
    inward_no: Joi.string().trim().required(),
    inward_date: Joi.date().iso().required(),
    business_model: Joi.string()
      .valid("OWN_MANUFACTURING", "JOB_WORK")
      .required(),
    party_id: Joi.number().integer().positive().required(),

    challan_no: Joi.alternatives().conditional("business_model", {
      is: "JOB_WORK",
      then: Joi.string().trim().required(),
      otherwise: Joi.string().trim().optional().allow("", null),
    }),
    remarks: Joi.string().trim().max(1000).optional().allow("", null),

    billing: Joi.object().optional().allow(null),

    lines: Joi.array()
      .items(
        Joi.object({
          raw_material_id: Joi.number().integer().positive().required(),
          raw_number: Joi.string().trim().required(),
          thickness_mm: Joi.number().positive().precision(3).required(),
          quantity: Joi.number().positive().precision(3).required(),
          rate: Joi.number()
            .min(0)
            .precision(3)
            .optional()
            .allow("", null)
            .default(0),
          uom: Joi.string().valid("KG", "TON", "PC").default("KG"),
        }),
      )
      .min(1)
      .required(),
  });

  return validate(schema, data);
};
export const validateInwardPayment = (data) => {
  const schema = Joi.object({
    payment_date: Joi.date().iso().required(),
    amount: Joi.number().positive().precision(2).required(),
    payment_mode: Joi.string().trim().optional().allow("", null),
    reference_no: Joi.string().trim().optional().allow("", null),
  });
  return validate(schema, data);
};
