import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import * as service from "./rawMaterial.service.js";
import * as validation from "./rawMaterial.validation.js";

export const createRawMaterialMaster = asyncHandler(async (req, res) => {
  const validData = validation.validateRawMaterialMaster(req.body);
  const result = await withTransaction((client) =>
    service.createRawMaterialMasterService(client, validData),
  );
  res.status(201).json({
    success: true,
    message: "Raw material added to master.",
    data: result,
  });
});

export const getRawMaterialsMaster = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    service.getRawMaterialsMasterService(client, req.query),
  );
  res.json({ success: true, data: result });
});

export const updateRawMaterialMaster = asyncHandler(async (req, res) => {
  const validData = validation.validateRawMaterialMaster(req.body);
  const result = await withTransaction((client) =>
    service.updateRawMaterialMasterService(
      client,
      Number(req.params.id),
      validData,
    ),
  );
  res.json({ success: true, message: "Material updated.", data: result });
});

export const deleteRawMaterialMaster = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    service.deleteRawMaterialMasterService(client, Number(req.params.id)),
  );
  res.json({ success: true, ...result });
});

export const getRawInwards = asyncHandler(async (req, res) => {
  const validQuery = validation.validateRawInwardQuery(req.query);
  const result = await withTransaction((client) =>
    service.getRawInwardService(client, validQuery),
  );
  res.json({ success: true, ...result });
});

export const createRawInward = asyncHandler(async (req, res) => {
  const validData = validation.validateRawInwardPayload(req.body);
  const result = await withTransaction(
    (client) => service.createRawInwardService(client, validData, req.user.id),
    req.user.id,
  );
  res.status(201).json({
    success: true,
    message: "Raw material inward recorded and stock updated.",
    data: result,
  });
});

export const updateRawInward = asyncHandler(async (req, res) => {
  const validData = validation.validateRawInwardPayload(req.body);
  const result = await withTransaction(
    (client) =>
      service.updateRawInwardService(
        client,
        Number(req.params.id),
        validData,
        req.user.id,
      ),
    req.user.id,
  );
  res.json({
    success: true,
    message: "Inward updated and stock re-adjusted.",
    data: result,
  });
});

export const cancelRawInward = asyncHandler(async (req, res) => {
  const result = await withTransaction(
    (client) =>
      service.cancelRawInwardService(
        client,
        Number(req.params.id),
        req.user.id,
      ),
    req.user.id,
  );
  res.json({ success: true, ...result });
});

export const getRawMaterialTraceability = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    service.getRawMaterialTraceabilityService(client, Number(req.params.id)),
  );
  res.json({ success: true, data: result });
});

export const getRawMaterialStock = asyncHandler(async (req, res) => {
  const { business_model, party_id } = req.query;
  const result = await withTransaction((client) =>
    service.getRawMaterialStockService(
      client,
      Number(req.params.id),
      business_model,
      party_id,
    ),
  );
  res.json({ success: true, data: result });
});
export const getRawInwardById = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    service.getRawInwardByIdService(client, Number(req.params.id)),
  );
  res.json({ success: true, data: result });
});

export const addRawInwardPayment = asyncHandler(async (req, res) => {
  const validData = validation.validateInwardPayment(req.body);
  const result = await withTransaction(
    (client) =>
      service.addRawInwardPaymentService(
        client,
        Number(req.params.id),
        validData,
        req.user.id,
      ),
    req.user.id,
  );
  res.status(201).json({ success: true, data: result });
});
