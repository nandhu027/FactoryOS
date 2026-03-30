import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new ApiError(401, "Please login to access this resource"));
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, env.jwtSecret);

    req.user = {
      id: decoded.id,
      username: decoded.username,
      is_super_admin: decoded.is_super_admin,
    };

    next();
  } catch (err) {
    next(new ApiError(401, "Session expired, please login again"));
  }
};
