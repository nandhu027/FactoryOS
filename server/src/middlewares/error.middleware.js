import { logger } from "../config/logger.js";

export const errorMiddleware = (err, req, res, next) => {
  logger.error(
    `${err.statusCode || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`,
  );
  if (process.env.NODE_ENV === "development") console.error(err.stack);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  if (err.code === "23505") {
    statusCode = 400;
    message = "This record already exists.";
  }

  if (err.code === "23503") {
    statusCode = 400;
    message = "Cannot delete this item because it is being used elsewhere.";
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
