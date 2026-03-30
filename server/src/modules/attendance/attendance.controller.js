import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import * as AttendanceService from "./attendance.service.js";
import {
  validateMarkAttendance,
  validateAttendanceQuery,
  validateUpdateAttendance,
  validateSummaryQuery,
} from "./attendance.validtion.js";

export const markAttendance = asyncHandler(async (req, res) => {
  const validData = validateMarkAttendance(req.body);
  const result = await withTransaction(async (client) => {
    return await AttendanceService.markAttendanceService(
      client,
      validData,
      req.user.id,
    );
  }, req.user.id);
  res.status(201).json({ success: true, ...result });
});

export const getAttendance = asyncHandler(async (req, res) => {
  const validQuery = validateAttendanceQuery(req.query);
  const result = await withTransaction(async (client) => {
    return await AttendanceService.getAttendanceService(client, validQuery);
  });
  res.status(200).json({ success: true, ...result });
});

export const getAttendanceSummary = asyncHandler(async (req, res) => {
  const validQuery = validateSummaryQuery(req.query);
  const result = await withTransaction(async (client) => {
    return await AttendanceService.getAttendanceSummaryService(
      client,
      validQuery,
    );
  });
  res.status(200).json({ success: true, data: result });
});

export const updateAttendance = asyncHandler(async (req, res) => {
  const validData = validateUpdateAttendance(req.body);
  const result = await withTransaction(async (client) => {
    return await AttendanceService.updateAttendanceService(
      client,
      req.params.id,
      validData,
      req.user.id,
    );
  }, req.user.id);
  res
    .status(200)
    .json({ success: true, message: "Attendance updated.", data: result });
});

export const deleteAttendance = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) => {
    return await AttendanceService.deleteAttendanceService(
      client,
      req.params.id,
      req.user.id,
    );
  }, req.user.id);
  res.status(200).json({ success: true, ...result });
});
