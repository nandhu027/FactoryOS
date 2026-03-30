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

export const validateDispatchQuery = (query) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    search: Joi.string().trim().optional().allow(""),
    status: Joi.string()
      .valid("ACTIVE", "CANCELLED", "ALL")
      .optional()
      .allow(""),
    date_filter: Joi.string()
      .valid("TODAY", "YESTERDAY", "WEEK", "MONTH", "CUSTOM", "ALL", "")
      .optional()
      .allow(""),
    startDate: Joi.date().iso().optional().allow(""),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).optional().allow(""),
    dispatch_type: Joi.string()
      .valid("OWN_SALE", "JOB_WORK_RETURN", "SCRAP_SALE")
      .optional()
      .allow(""),
    payment_status: Joi.string()
      .valid("PAID", "UNPAID", "PARTIAL")
      .optional()
      .allow(""),
  });
  return validate(schema, query);
};

export const validateCreateDispatch = (data) => {
  const schema = Joi.object({
    dispatch_no: Joi.string().trim().required(),
    dispatch_type: Joi.string()
      .valid("OWN_SALE", "JOB_WORK_RETURN", "SCRAP_SALE")
      .required(),
    dispatch_date: Joi.date().iso().required(),
    party_id: Joi.number().integer().positive().required(),
    remarks: Joi.string().trim().allow(null, "").optional(),
    lines: Joi.array().min(1).required(),
  }).unknown(true);

  const validated = validate(schema, data);

  validated.lines.forEach((line, index) => {
    if (validated.dispatch_type !== "SCRAP_SALE") {
      if (!line.item_kind || line.item_kind !== "FINISHED") {
        throw new ApiError(
          400,
          `Line ${index + 1}: Valid item kind (FINISHED) is required for Outbound Dispatch.`,
        );
      }
      if (!line.item_id || isNaN(Number(line.item_id))) {
        throw new ApiError(
          400,
          `Line ${index + 1}: Product selection is required.`,
        );
      }
    }
    if (
      !line.quantity ||
      isNaN(Number(line.quantity)) ||
      Number(line.quantity) <= 0
    ) {
      throw new ApiError(
        400,
        `Line ${index + 1}: Quantity must be greater than zero.`,
      );
    }
    if (
      line.sale_rate === undefined ||
      isNaN(Number(line.sale_rate)) ||
      Number(line.sale_rate) < 0
    ) {
      throw new ApiError(
        400,
        `Line ${index + 1}: Sale rate is required and cannot be negative.`,
      );
    }
  });

  return validated;
};

export const validateDispatchPayment = (data) => {
  return validate(
    Joi.object({
      payment_date: Joi.date().iso().required(),
      amount: Joi.number().positive().precision(2).required(),
      payment_mode: Joi.string().trim().optional().allow("", null),
      reference_no: Joi.string().trim().optional().allow("", null),
    }),
    data,
  );
};

export const validatePaymentStatus = (data) => {
  return validate(
    Joi.object({
      payment_status: Joi.string().valid("PAID", "UNPAID").required(),
    }),
    data,
  );
};

export const validateDispatchInfoUpdate = (data) => {
  return validate(
    Joi.object({ remarks: Joi.string().trim().allow(null, "").optional() }),
    data,
  );
};
