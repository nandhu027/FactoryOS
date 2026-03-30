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

export const validateProductionQuery = (query) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    search: Joi.string().trim().optional().allow(""),
    status: Joi.string()
      .valid("DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED")
      .optional()
      .allow(""),
    business_model: Joi.string()
      .valid("OWN_MANUFACTURING", "JOB_WORK")
      .optional()
      .allow(""),
    party_id: Joi.number().integer().positive().optional().allow(""),
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
    machine_id: Joi.number().integer().positive().optional().allow(""),
    personnel_id: Joi.number().integer().positive().optional().allow(""),
    item_id: Joi.number().integer().positive().optional().allow(""),
  });
  return validate(schema, query);
};

export const validateCreateProduction = (data) => {
  const schema = Joi.object({
    production_date: Joi.date().iso().required(),
    business_model: Joi.string()
      .valid("OWN_MANUFACTURING", "JOB_WORK")
      .required(),
    party_id: Joi.alternatives().conditional("business_model", {
      is: "JOB_WORK",
      then: Joi.number().integer().positive().required(),
      otherwise: Joi.any().strip(),
    }),
    remarks: Joi.string().trim().max(1000).optional().allow("", null),
    steps: Joi.array()
      .items(
        Joi.object({
          step_name: Joi.string().trim().min(2).max(100).required(),
          machine_id: Joi.number().integer().positive().required(),
          worker_mode: Joi.string().valid("STAFF", "CONTRACTOR").required(),
          workers: Joi.array()
            .items(Joi.number().integer().positive())
            .min(1)
            .required(),

          input_item_kind: Joi.string()
            .valid("RAW", "SEMI_FINISHED")
            .optional(),
          input_raw_material_id: Joi.alternatives().conditional(
            "input_item_kind",
            {
              is: "RAW",
              then: Joi.number().integer().positive().required(),
              otherwise: Joi.any().strip(),
            },
          ),
          input_semi_finished_id: Joi.alternatives().conditional(
            "input_item_kind",
            {
              is: "SEMI_FINISHED",
              then: Joi.number().integer().positive().required(),
              otherwise: Joi.any().strip(),
            },
          ),
          input_product_id: Joi.alternatives().conditional("input_item_kind", {
            is: "SEMI_FINISHED",
            then: Joi.number().integer().positive().allow(null, "").optional(),
            otherwise: Joi.any().strip(),
          }),
          input_qty: Joi.number().positive().precision(3).optional(),
          uom: Joi.string().valid("KG", "TON", "PC").default("KG"),
          scrap_qty: Joi.number().min(0).precision(3).default(0),
          is_final_step: Joi.boolean().default(false),

          inputs: Joi.array()
            .items(
              Joi.object({
                input_item_kind: Joi.string()
                  .valid("RAW", "SEMI_FINISHED")
                  .required(),
                raw_material_id: Joi.number()
                  .integer()
                  .positive()
                  .allow(null, ""),
                semi_finished_id: Joi.number()
                  .integer()
                  .positive()
                  .allow(null, ""),
                quantity: Joi.number().positive().precision(3).required(),
                uom: Joi.string().valid("KG", "TON", "PC").default("KG"),
              }),
            )
            .optional(),

          outputs: Joi.array()
            .items(
              Joi.object({
                output_item_kind: Joi.string()
                  .valid("SEMI_FINISHED", "FINISHED")
                  .required(),
                product_id: Joi.alternatives().conditional("output_item_kind", {
                  is: "FINISHED",
                  then: Joi.number().integer().positive().required(),
                  otherwise: Joi.number()
                    .integer()
                    .positive()
                    .allow(null, "")
                    .optional(),
                }),
                semi_finished_id: Joi.alternatives().conditional(
                  "output_item_kind",
                  {
                    is: "SEMI_FINISHED",
                    then: Joi.number().integer().positive().required(),
                    otherwise: Joi.any().strip(),
                  },
                ),
                quantity: Joi.number().positive().precision(3).required(),
                uom: Joi.string().valid("KG", "TON", "PC").default("KG"),
              }),
            )
            .min(1)
            .required(),
        }),
      )
      .min(1)
      .required(),
  });
  return validate(schema, data);
};

export const validateExecuteStep = (data) => {
  const schema = Joi.object({
    is_step_complete: Joi.boolean().required(),
    scrap_qty: Joi.number().min(0).precision(3).default(0),

    actual_inputs: Joi.array()
      .items(
        Joi.object({
          input_item_kind: Joi.string()
            .valid("RAW", "SEMI_FINISHED")
            .required(),
          raw_material_id: Joi.number().integer().positive().allow(null, ""),
          semi_finished_id: Joi.number().integer().positive().allow(null, ""),
          quantity: Joi.number().min(0).precision(3).required(),
          uom: Joi.string().valid("KG", "TON", "PC").default("KG"),
        }),
      )
      .min(1)
      .required(),

    outputs: Joi.array()
      .items(
        Joi.object({
          output_item_kind: Joi.string()
            .valid("SEMI_FINISHED", "FINISHED")
            .required(),
          product_id: Joi.alternatives().conditional("output_item_kind", {
            is: "FINISHED",
            then: Joi.number().integer().positive().required(),
            otherwise: Joi.any().strip(),
          }),
          semi_finished_id: Joi.alternatives().conditional("output_item_kind", {
            is: "SEMI_FINISHED",
            then: Joi.number().integer().positive().required(),
            otherwise: Joi.any().strip(),
          }),
          quantity: Joi.number().positive().precision(3).required(),
          uom: Joi.string().valid("KG", "TON", "PC").default("KG"),
        }),
      )
      .min(1)
      .required(),
  });

  return validate(schema, data);
};
