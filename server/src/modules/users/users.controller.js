import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import * as UserService from "./users.service.js";

export const createUser = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) => {
    return await UserService.createUserService(client, req.body);
  }, req.user?.id);

  res.status(201).json({ success: true, data: result });
});

export const getUsers = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) => {
    return await UserService.getUsersService(client);
  });

  res.status(200).json({ success: true, data: result });
});

export const updateUser = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) => {
    return await UserService.updateUserService(client, req.params.id, req.body);
  }, req.user?.id);

  res.status(200).json({ success: true, data: result });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) => {
    return await UserService.deleteUserService(client, req.params.id);
  }, req.user?.id);

  res.status(200).json({ success: true, data: result });
});

export const assignRoles = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) => {
    return await UserService.assignUserRolesService(
      client,
      req.params.id,
      req.body.role_ids,
    );
  }, req.user?.id);

  res.status(200).json({ success: true, data: result });
});
export const getUserById = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) => {
    return await UserService.getUserByIdService(client, req.params.id);
  });
  res.status(200).json({ success: true, data: result });
});
