import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import * as RolesService from "./roles.service.js";
import {
  validateCreateRole,
  validatePermissionsPayload,
  validateQueryPagination,
  validateRoleIds,
} from "./roles.validation.js";
import { ApiError } from "../../utils/ApiError.js";

export const createRole = asyncHandler(async (req, res) => {
  const validatedData = validateCreateRole(req.body);
  const result = await withTransaction(
    async (client) => RolesService.createRoleService(client, validatedData),
    req.user.id,
  );
  res.status(201).json({ success: true, data: result });
});

export const updateRole = asyncHandler(async (req, res) => {
  const validatedData = validateCreateRole(req.body);
  const result = await withTransaction(
    async (client) =>
      RolesService.updateRoleService(client, req.params.roleId, validatedData),
    req.user.id,
  );
  if (!result) throw new ApiError(404, "Role not found");
  res.json({ success: true, data: result });
});

export const deleteRole = asyncHandler(async (req, res) => {
  const result = await withTransaction(
    async (client) => RolesService.deleteRoleService(client, req.params.roleId),
    req.user.id,
  );
  if (!result) throw new ApiError(404, "Role not found");
  res.json({ success: true, message: "Role deleted successfully" });
});

export const getRoles = asyncHandler(async (req, res) => {
  const paginationFilters = validateQueryPagination(req.query);
  const result = await withTransaction(async (client) =>
    RolesService.getRolesService(client, paginationFilters),
  );
  res.json({ success: true, ...result });
});

export const getModules = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) =>
    RolesService.getModulesService(client),
  );
  res.json({ success: true, data: result });
});

export const assignPermissionsToRole = asyncHandler(async (req, res) => {
  const validatedPermissions = validatePermissionsPayload(req.body.permissions);
  const result = await withTransaction(
    async (client) =>
      RolesService.assignPermissionsToRoleService(
        client,
        req.params.roleId,
        validatedPermissions,
      ),
    req.user.id,
  );
  res.json({ success: true, data: result });
});

export const getRolePermissions = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) =>
    RolesService.getRolePermissionsService(client, req.params.roleId),
  );
  res.json({ success: true, data: result });
});

export const assignRolesToUser = asyncHandler(async (req, res) => {
  const validatedRoleIds = validateRoleIds(req.body.roleIds);
  const result = await withTransaction(
    async (client) =>
      RolesService.assignRolesToUserService(
        client,
        req.params.userId,
        validatedRoleIds,
      ),
    req.user.id,
  );
  res.json({ success: true, data: result });
});

export const getUsersWithRoles = asyncHandler(async (req, res) => {
  const filters = validateQueryPagination(req.query);
  const result = await withTransaction(async (client) =>
    RolesService.getUsersWithRolesService(client, filters),
  );
  res.json({ success: true, data: result });
});
