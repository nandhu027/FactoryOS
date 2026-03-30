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

export const validateStockMovement = (data) => {
  const allowedItemKinds = ["RAW", "SEMI_FINISHED", "FINISHED", "SCRAP"];
  const allowedOwnership = ["OWN", "JOB_WORK"];
  const allowedDirection = ["IN", "OUT"];

  if (!allowedItemKinds.includes(data.item_kind))
    throw new ApiError(400, "Invalid item kind.");
  if (!allowedOwnership.includes(data.ownership_type))
    throw new ApiError(400, "Invalid ownership type.");
  if (!allowedDirection.includes(data.direction))
    throw new ApiError(400, "Invalid direction.");
  if (!data.quantity || Number(data.quantity) <= 0)
    throw new ApiError(400, "Quantity must be strictly > 0.");
  if (!data.uom) throw new ApiError(400, "UOM is required.");
  if (!data.movement_type)
    throw new ApiError(400, "Movement type is required.");
};

export const validateSnapshotQuery = (query) => {
  const schema = Joi.object({
    search: Joi.string().trim().optional().allow(""),
    item_kind: Joi.string()
      .valid("RAW", "SEMI_FINISHED", "FINISHED", "SCRAP", "ALL")
      .optional()
      .allow(""),
    ownership_type: Joi.string()
      .valid("OWN", "JOB_WORK", "ALL")
      .optional()
      .allow(""),
  });
  return validate(schema, query);
};

export const validateHistoryQuery = (query) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(500).default(50),
    search: Joi.string().trim().optional().allow(""),
    item_kind: Joi.string()
      .valid("RAW", "SEMI_FINISHED", "FINISHED", "SCRAP")
      .optional()
      .allow(""),
    item_id: Joi.number().integer().positive().optional().allow(""),
    ownership_type: Joi.string().valid("OWN", "JOB_WORK").optional().allow(""),
    owner_party_id: Joi.number().integer().positive().optional().allow(""),
    movement_type: Joi.string().optional().allow(""),
    direction: Joi.string().valid("IN", "OUT", "ALL").optional().allow(""),
    startDate: Joi.date().iso().optional().allow(""),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).optional().allow(""),
  });
  return validate(schema, query);
};

export const validateStockConversion = (data) => {
  const schema = Joi.object({
    conversion_date: Joi.date().iso().required(),
    ownership_type: Joi.string().valid("OWN", "JOB_WORK").required(),
    party_id: Joi.alternatives().conditional("ownership_type", {
      is: "JOB_WORK",
      then: Joi.number().integer().positive().required(),
      otherwise: Joi.optional().allow(null, ""),
    }),
    source_item_kind: Joi.string().valid("RAW", "SEMI_FINISHED").required(),
    source_item_id: Joi.number().integer().positive().required(),
    source_qty: Joi.number().positive().precision(3).required(),
    source_uom: Joi.string().valid("KG", "TON", "PC").required(),

    target_item_kind: Joi.string()
      .valid("SEMI_FINISHED", "FINISHED")
      .required(),
    target_item_id: Joi.number().integer().positive().required(),
    target_qty: Joi.number().positive().precision(3).required(),
    target_uom: Joi.string().valid("KG", "TON", "PC").required(),

    scrap_type_id: Joi.number().integer().positive().optional().allow(null, ""),
    scrap_qty: Joi.number().min(0).precision(3).optional().allow(null, 0),
    remarks: Joi.string().trim().optional().allow("", null),
  });

  return validate(schema, data);
};

export const validateConversionQuery = (query) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    ownership_type: Joi.string()
      .valid("OWN", "JOB_WORK", "ALL")
      .optional()
      .allow(""),
  });
  return validate(schema, query);
};
