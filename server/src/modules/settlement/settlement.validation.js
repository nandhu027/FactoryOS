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

export const validateSettlementQuery = (query) => {
  const schema = Joi.object({
    party_id: Joi.number().integer().positive().optional().allow(""),
    status: Joi.string()
      .valid("PENDING", "PARTIAL", "PAID", "ALL")
      .default("ALL"),
    bill_type: Joi.string()
      .valid(
        "ALL",
        "PURCHASE",
        "DISPATCH",
        "OWN_SALE",
        "JOB_WORK_RETURN",
        "SCRAP_SALE",
      )
      .default("ALL"),
    start_date: Joi.date().iso().optional().allow(""),
    end_date: Joi.date().iso().optional().allow(""),
    search: Joi.string().trim().optional().allow(""),
  });
  return validate(schema, query);
};

export const validateSettlementPayload = (data) => {
  const schema = Joi.object({
    module_type: Joi.string()
      .valid("PURCHASE", "OWN_SALE", "JOB_WORK_RETURN", "SCRAP_SALE")
      .required(),
    record_id: Joi.number().integer().positive().required(),
    amount: Joi.number().positive().precision(2).required(),
    payment_date: Joi.date().iso().required(),
    payment_mode: Joi.string().trim().max(50).required(),
    reference_no: Joi.string().trim().max(100).optional().allow("", null),
  });
  return validate(schema, data);
};
