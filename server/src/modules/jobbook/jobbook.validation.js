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
    throw new ApiError(
      400,
      `JobBook Filter Validation Failed: ${errorMessages}`,
    );
  }
  return value;
};

export const validateJobBookQuery = (query) => {
  const schema = Joi.object({
    target_date: Joi.date()
      .iso()
      .optional()
      .empty("")
      .default(() => new Date().toISOString().split("T")[0]),

    search: Joi.string().trim().optional().allow(""),

    machine_id: Joi.number().integer().positive().optional().allow(""),
    party_id: Joi.number().integer().positive().optional().allow(""),
    personnel_id: Joi.number().integer().positive().optional().allow(""),

    view_mode: Joi.string()
      .valid("ALL", "STUCK_ONLY", "ACTIVE_ONLY")
      .default("ALL"),

    stuck_threshold_mins: Joi.number().integer().min(15).max(1440).default(120),
  });

  return validate(schema, query);
};
