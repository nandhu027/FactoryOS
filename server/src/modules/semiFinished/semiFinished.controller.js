import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import * as service from "./semiFinished.service.js";
import {
  validateSemiFinishedQuery,
  validateCreateSemiFinished,
  validateUpdateSemiFinished,
} from "./semiFinished.validation.js";

export const getAllSemiFinished = asyncHandler(async (req, res) => {
  const validQuery = validateSemiFinishedQuery(req.query);
  const result = await withTransaction((client) =>
    service.getAllSemiFinishedService(client, validQuery),
  );
  res.json({ success: true, ...result });
});

export const getSemiFinishedById = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    service.getSemiFinishedByIdService(client, req.params.id),
  );
  res.json({ success: true, data: result });
});

export const createSemiFinished = asyncHandler(async (req, res) => {
  const validData = validateCreateSemiFinished(req.body);
  const result = await withTransaction((client) =>
    service.createSemiFinishedService(client, validData),
  );
  res.status(201).json({ success: true, data: result });
});

export const updateSemiFinished = asyncHandler(async (req, res) => {
  const validData = validateUpdateSemiFinished(req.body);
  const result = await withTransaction((client) =>
    service.updateSemiFinishedService(client, req.params.id, validData),
  );
  res.json({ success: true, data: result });
});

export const deleteSemiFinished = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    service.deleteSemiFinishedService(client, req.params.id),
  );
  res.json({ success: true, data: result });
});
