import { ApiError } from "../utils/ApiError.js";

const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((d) => d.message).join(", ");
      return next(new ApiError(400, message));
    }
    if (property === "body") {
      req.body = value;
    }
    if (property === "query") {
      req.validatedQuery = value;
    }

    next();
  };
};

export default validate;
