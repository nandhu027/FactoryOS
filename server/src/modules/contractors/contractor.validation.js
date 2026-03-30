import Joi from "joi";
import { ApiError } from "../../utils/ApiError.js";

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const errorMessages = error.details.map((x) => x.message).join(", ");
    throw new ApiError(400, `Validation Failed: ${errorMessages}`);
  }
  return value;
};

export const validateContractorQuery = (query) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    search: Joi.string().trim().optional().allow(""),
    status: Joi.string()
      .valid("OPEN", "CLOSED", "CANCELLED", "ALL", "")
      .empty("")
      .default("ALL"),
    contractor_id: Joi.number().integer().positive().optional().allow(""),
    date_filter: Joi.string()
      .valid("TODAY", "YESTERDAY", "WEEK", "MONTH", "CUSTOM", "ALL", "")
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

export const validateContractorJob = (data) => {
  const schema = Joi.object({
    job_no: Joi.string().trim().required(),
    contractor_id: Joi.number().integer().positive().required(),
    out_date: Joi.date().iso().required(),
    ownership_type: Joi.string().valid("OWN", "JOB_WORK").required(),
    owner_party_id: Joi.alternatives().conditional("ownership_type", {
      is: "JOB_WORK",
      then: Joi.number().integer().positive().required(),
      otherwise: Joi.any().strip(),
    }),
    semi_finished_id: Joi.number().integer().positive().required(),
    qty_sent: Joi.number().positive().precision(3).required(),
    uom: Joi.string().valid("KG", "TON", "PC").required(),
    remarks: Joi.string().trim().optional().allow(""),
    production_order_id: Joi.number()
      .integer()
      .positive()
      .optional()
      .allow(null),
    source_step_id: Joi.number().integer().positive().optional().allow(null),
  });
  return validate(schema, data);
};

export const validateContractorReturn = (data) => {
  const schema = Joi.object({
    contractor_job_id: Joi.number().integer().positive().required(),
    return_date: Joi.date().iso().required(),
    quantity: Joi.number().min(0).precision(3).required(),
    uom: Joi.string().valid("KG", "TON", "PC").required(),
    remarks: Joi.string().trim().optional().allow(""),
    return_item_kind: Joi.string()
      .valid("SEMI_FINISHED", "FINISHED", "SCRAP")
      .optional()
      .allow(""),
    return_item_id: Joi.number()
      .integer()
      .positive()
      .optional()
      .allow(null, ""),
    loss_qty: Joi.number().min(0).precision(3).optional().allow(null, ""),
  });
  return validate(schema, data);
};

export const validateMultiDispatch = (data) => {
  const schema = Joi.object({
    contractor_id: Joi.number().integer().positive().required(),
    out_date: Joi.date().iso().required(),
    remarks: Joi.string().trim().optional().allow(""),
    items: Joi.array()
      .items(
        Joi.object({
          ownership_type: Joi.string().valid("OWN", "JOB_WORK").required(),
          owner_party_id: Joi.alternatives().conditional("ownership_type", {
            is: "JOB_WORK",
            then: Joi.number().integer().positive().required(),
            otherwise: Joi.any().strip(),
          }),
          source_semi_finished_id: Joi.number().integer().positive().required(),
          qty_sent: Joi.number().positive().precision(3).required(),
          uom: Joi.string().valid("KG", "TON", "PC").required(),
        }),
      )
      .min(1)
      .required(),
  });
  return validate(schema, data);
};

export const validateMultiReturn = (data) => {
  const schema = Joi.object({
    return_date: Joi.date().iso().required(),
    remarks: Joi.string().trim().optional().allow(""),
    returns: Joi.array()
      .items(
        Joi.object({
          contractor_job_id: Joi.number().integer().positive().required(),
          return_item_kind: Joi.string()
            .valid("SEMI_FINISHED", "FINISHED", "SCRAP")
            .required(),
          return_item_id: Joi.number()
            .integer()
            .positive()
            .optional()
            .allow(null, ""),
          qty_returned: Joi.number().min(0).precision(3).required(),
          uom: Joi.string().valid("KG", "TON", "PC").required(),
          loss_qty: Joi.number().min(0).precision(3).optional().allow(null, ""),
        }),
      )
      .min(1)
      .required(),
  });
  return validate(schema, data);
};
