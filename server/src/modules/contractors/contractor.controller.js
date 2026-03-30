import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import * as service from "./contractor.service.js";
import {
  validateContractorQuery,
  validateContractorJob,
  validateContractorReturn,
  validateMultiDispatch,
  validateMultiReturn,
} from "./contractor.validation.js";

export const getContractorJobs = asyncHandler(async (req, res) => {
  const validQuery = validateContractorQuery(req.query);
  const result = await withTransaction((client) =>
    service.getContractorJobsService(client, validQuery),
  );
  res.json({ success: true, ...result });
});

export const getContractorJobById = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    service.getContractorJobByIdService(client, req.params.id),
  );
  res.json({ success: true, data: result });
});

export const createContractorJob = asyncHandler(async (req, res) => {
  const validData = validateContractorJob(req.body);
  const result = await withTransaction(
    (client) =>
      service.createContractorJobService(client, validData, req.user.id),
    req.user.id,
  );

  if (result.merged) {
    res.status(200).json({
      success: true,
      message: `Auto-appended to active job ${result.job_no}`,
      data: result,
    });
  } else {
    res.status(201).json({
      success: true,
      message: "Dispatched to contractor successfully.",
      data: result,
    });
  }
});

export const createContractorReturn = asyncHandler(async (req, res) => {
  const payload = { ...req.body, contractor_job_id: Number(req.params.id) };
  const validData = validateContractorReturn(payload);
  const result = await withTransaction(
    (client) =>
      service.createContractorReturnService(client, validData, req.user.id),
    req.user.id,
  );
  res.status(201).json({ success: true, data: result });
});

export const cancelContractorJob = asyncHandler(async (req, res) => {
  const result = await withTransaction(
    (client) =>
      service.cancelContractorJobService(client, req.params.id, req.user.id),
    req.user.id,
  );
  res.json({ success: true, data: result });
});

export const getAvailableSemiStock = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    service.getAvailableSemiStockService(client),
  );
  res.json({ success: true, data: result });
});

export const createMultiDispatch = asyncHandler(async (req, res) => {
  const validData = validateMultiDispatch(req.body);
  const result = await withTransaction(
    (client) =>
      service.createMultiDispatchService(client, validData, req.user.id),
    req.user.id,
  );

  res.status(201).json({
    success: true,
    message: "General Take batch dispatched successfully.",
    data: result,
  });
});

export const createMultiReturn = asyncHandler(async (req, res) => {
  const validData = validateMultiReturn(req.body);
  const result = await withTransaction(
    (client) =>
      service.createMultiReturnService(client, validData, req.user.id),
    req.user.id,
  );

  res.status(201).json({
    success: true,
    message: "General Return batch logged successfully.",
    data: result,
  });
});

export const reverseContractorReturn = asyncHandler(async (req, res) => {
  const result = await withTransaction(
    (client) =>
      service.reverseContractorReturnService(
        client,
        req.params.returnId,
        req.user.id,
      ),
    req.user.id,
  );
  res.json({ success: true, data: result });
});
