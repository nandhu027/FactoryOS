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

export const validateAttendanceQuery = (query) => {
  return validate(
    Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(50),
      personnel_id: Joi.number().integer().positive().optional().allow(""),
      date_filter: Joi.string()
        .valid("TODAY", "YESTERDAY", "WEEK", "MONTH", "CUSTOM", "ALL", "")
        .optional()
        .allow(""),
      startDate: Joi.date().iso().optional().allow(""),
      endDate: Joi.date().iso().min(Joi.ref("startDate")).optional().allow(""),
    }),
    query,
  );
};

export const validateSummaryQuery = (query) => {
  return validate(
    Joi.object({
      personnel_id: Joi.number().integer().positive().optional().allow(""),
      date_filter: Joi.string()
        .valid("TODAY", "YESTERDAY", "WEEK", "MONTH", "CUSTOM", "ALL", "")
        .optional()
        .allow(""),
      startDate: Joi.date().iso().optional().allow(""),
      endDate: Joi.date().iso().min(Joi.ref("startDate")).optional().allow(""),
    }),
    query,
  );
};

const otValidation = {
  type: Joi.string().valid("NONE", "HALF_DAY_SHIFT", "HOURLY").default("NONE"),
  value: Joi.number().min(0).precision(2).default(0),
};

export const validateMarkAttendance = (data) => {
  const schema = Joi.object({
    attendance_date: Joi.date().iso().required(),
    records: Joi.array()
      .items(
        Joi.object({
          personnel_id: Joi.number().integer().positive().required(),
          status: Joi.string()
            .valid("PRESENT", "ABSENT", "HALF_DAY", "HOLIDAY")
            .required(),
          morning_ot_type: otValidation.type,
          morning_ot_value: otValidation.value,
          evening_ot_type: otValidation.type,
          evening_ot_value: otValidation.value,
          remarks: Joi.string().trim().optional().allow(null, ""),
        }),
      )
      .min(1)
      .required(),
  });

  const validated = validate(schema, data);

  validated.records.forEach((record, index) => {
    if (record.morning_ot_type === "NONE" && record.morning_ot_value > 0) {
      throw new ApiError(
        400,
        `Record ${index + 1}: Morning OT Value must be 0 if Type is NONE.`,
      );
    }
    if (record.evening_ot_type === "NONE" && record.evening_ot_value > 0) {
      throw new ApiError(
        400,
        `Record ${index + 1}: Evening OT Value must be 0 if Type is NONE.`,
      );
    }
  });

  return validated;
};

export const validateUpdateAttendance = (data) => {
  return validate(
    Joi.object({
      status: Joi.string()
        .valid("PRESENT", "ABSENT", "HALF_DAY", "HOLIDAY")
        .optional(),
      morning_ot_type: otValidation.type.optional(),
      morning_ot_value: otValidation.value.optional(),
      evening_ot_type: otValidation.type.optional(),
      evening_ot_value: otValidation.value.optional(),
      remarks: Joi.string().trim().optional().allow(null, ""),
    }),
    data,
  );
};
