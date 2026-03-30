import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import { loginService, getCurrentUserService } from "./auth.service.js";

export const login = asyncHandler(async (req, res) => {
  const { username, password, rememberMe } = req.body;

  const result = await withTransaction(async (client) => {
    return await loginService(client, username, password, rememberMe);
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) => {
    return await getCurrentUserService(client, req.user.id);
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});
