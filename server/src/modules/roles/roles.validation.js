import Joi from "joi";
import { ApiError } from "../../utils/ApiError.js";

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => detail.message).join(", ");
    throw new ApiError(400, `Validation Failed: ${errors}`);
  }
  return value;
};

export const validateCreateRole = (data) => {
  const schema = Joi.object({
    role_name: Joi.string().trim().min(2).required().messages({
      "string.min": `"role_name" must be at least 2 characters`,
      "any.required": `"role_name" is required`,
      "string.empty": `"role_name" is required`,
    }),
  });
  return validate(schema, data);
};

export const validatePermissionsPayload = (data) => {
  const schema = Joi.array()
    .items(
      Joi.object({
        module_code: Joi.string().min(1).required().messages({
          "any.required": `"module_code" is required`,
          "string.empty": `"module_code" is required`,
        }),
        can_add: Joi.boolean().default(false),
        can_edit: Joi.boolean().default(false),
        can_delete: Joi.boolean().default(false),
        can_view: Joi.boolean().default(true),
      }),
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one permission is required",
      "any.required": "Permissions array is required",
    });

  return validate(schema, data);
};

export const validateQueryPagination = (query) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().allow("").optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
  });

  return validate(schema, query);
};

export const validateRoleIds = (data) => {
  const schema = Joi.array()
    .items(Joi.number().integer().required())
    .min(1)
    .required()
    .messages({
      "array.min": "At least one role ID is required",
      "any.required": "Role IDs array is required",
    });

  return validate(schema, data);
};
