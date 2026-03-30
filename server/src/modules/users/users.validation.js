import Joi from "joi";

export const createUserSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).required(),
  full_name: Joi.string().trim().min(2).max(100).required(),
  password: Joi.string().min(6).required(),
  is_super_admin: Joi.boolean().default(false),
  is_active: Joi.boolean().default(true),
});

export const updateUserSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(100),
  password: Joi.string().min(6).allow(""),
  is_active: Joi.boolean(),
  is_super_admin: Joi.boolean(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided to update",
  });

export const assignRolesSchema = Joi.object({
  role_ids: Joi.array().items(Joi.number().integer().positive()).required(),
});
