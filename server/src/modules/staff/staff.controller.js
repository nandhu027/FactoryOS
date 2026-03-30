import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";

import {
  createWorkTypeService,
  getWorkTypesService,
  updateWorkTypeService,
  deleteWorkTypeService,
  createStaffService,
  getStaffService,
  updateStaffService,
  deleteStaffService,
  getPersonnelOngoingWorkService,
  getPersonnelPaymentsService,
  getPersonnelAttendanceService,
} from "./staff.service.js";

import {
  validateCreateWorkType,
  validateUpdateWorkType,
  validateWorkTypeQuery,
  validateCreateStaff,
  validateUpdateStaff,
  validateStaffQuery,
  validatePersonnelDetailsQuery,
} from "./staff.validation.js";

export const createWorkType = asyncHandler(async (req, res) => {
  const validData = validateCreateWorkType(req.body);
  const result = await withTransaction(async (client) => {
    return await createWorkTypeService(client, validData, req.user.id);
  }, req.user.id);
  res.status(201).json({
    success: true,
    message: "Work type created successfully",
    data: result,
  });
});

export const getWorkTypes = asyncHandler(async (req, res) => {
  const validQuery = validateWorkTypeQuery(req.query);
  const result = await withTransaction((client) =>
    getWorkTypesService(client, validQuery),
  );
  res.json({ success: true, data: result });
});

export const updateWorkType = asyncHandler(async (req, res) => {
  const validData = validateUpdateWorkType(req.body);
  const result = await withTransaction(async (client) => {
    return await updateWorkTypeService(
      client,
      req.params.id,
      validData,
      req.user.id,
    );
  }, req.user.id);
  res.json({
    success: true,
    message: "Work type updated successfully",
    data: result,
  });
});

export const deleteWorkType = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) => {
    return await deleteWorkTypeService(client, req.params.id, req.user.id);
  }, req.user.id);
  res.json({ success: true, ...result });
});

export const createStaff = asyncHandler(async (req, res) => {
  const validData = validateCreateStaff(req.body);
  const result = await withTransaction(async (client) => {
    return await createStaffService(client, validData, req.user.id);
  }, req.user.id);
  res.status(201).json({
    success: true,
    message: "Personnel created successfully",
    data: result,
  });
});

export const getStaff = asyncHandler(async (req, res) => {
  const validQuery = validateStaffQuery(req.query);
  const queryToPass = {
    ...validQuery,
    personnel_type: validQuery.personnel_type || validQuery.type,
  };
  const result = await withTransaction((client) =>
    getStaffService(client, queryToPass),
  );
  res.json({ success: true, ...result });
});

export const updateStaff = asyncHandler(async (req, res) => {
  const validData = validateUpdateStaff(req.body);
  const result = await withTransaction(async (client) => {
    return await updateStaffService(
      client,
      req.params.id,
      validData,
      req.user.id,
    );
  }, req.user.id);
  res.json({ success: true, ...result });
});

export const deleteStaff = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) => {
    return await deleteStaffService(client, req.params.id, req.user.id);
  }, req.user.id);
  res.json({ success: true, ...result });
});

export const getPersonnelOngoingWork = asyncHandler(async (req, res) => {
  const validQuery = validatePersonnelDetailsQuery(req.query);
  const result = await withTransaction((client) =>
    getPersonnelOngoingWorkService(client, req.params.id, validQuery),
  );
  res.json({ success: true, ...result });
});

export const getPersonnelPayments = asyncHandler(async (req, res) => {
  const validQuery = validatePersonnelDetailsQuery(req.query);
  const result = await withTransaction((client) =>
    getPersonnelPaymentsService(client, req.params.id, validQuery),
  );
  res.json({ success: true, ...result });
});

export const getPersonnelAttendance = asyncHandler(async (req, res) => {
  const validQuery = validatePersonnelDetailsQuery(req.query);
  const result = await withTransaction((client) =>
    getPersonnelAttendanceService(client, req.params.id, validQuery),
  );
  res.json({ success: true, ...result });
});
