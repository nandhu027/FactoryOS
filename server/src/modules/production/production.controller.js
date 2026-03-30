import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import * as service from "./production.service.js";
import {
  validateProductionQuery,
  validateCreateProduction,
  validateExecuteStep,
} from "./production.validation.js";

export const getProductions = asyncHandler(async (req, res) => {
  const validQuery = validateProductionQuery(req.query);
  const result = await withTransaction((client) =>
    service.getProductionService(client, validQuery),
  );
  res.json({ success: true, ...result });
});

export const getProductionById = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    service.getProductionByIdService(client, req.params.id),
  );
  res.json({ success: true, data: result });
});

export const createProduction = asyncHandler(async (req, res) => {
  const validData = validateCreateProduction(req.body);
  const result = await withTransaction(
    (client) => service.createProductionService(client, validData, req.user.id),
    req.user.id,
  );
  res.status(201).json({ success: true, data: result });
});

export const updateProduction = asyncHandler(async (req, res) => {
  const validData = validateCreateProduction(req.body);
  const result = await withTransaction(
    (client) =>
      service.updateProductionService(
        client,
        req.params.id,
        validData,
        req.user.id,
      ),
    req.user.id,
  );
  res.json({ success: true, data: result });
});

export const postProductionStep = asyncHandler(async (req, res) => {
  const validExecutionData = validateExecuteStep(req.body);
  const result = await withTransaction(
    (client) =>
      service.postProductionStepService(
        client,
        req.params.id,
        req.params.stepId,
        validExecutionData,
        req.user.id,
      ),
    req.user.id,
  );
  res.json({ success: true, data: result });
});

export const cancelProduction = asyncHandler(async (req, res) => {
  const result = await withTransaction(
    (client) =>
      service.cancelProductionService(client, req.params.id, req.user.id),
    req.user.id,
  );
  res.json({ success: true, data: result });
});

export const deleteProduction = asyncHandler(async (req, res) => {
  const result = await withTransaction(
    (client) =>
      service.deleteProductionService(client, req.params.id, req.user.id),
    req.user.id,
  );
  res.json({ success: true, data: result });
});
