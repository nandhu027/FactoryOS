import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import * as DispatchService from "./dispatch.service.js";
import {
  validateCreateDispatch,
  validatePaymentStatus,
  validateDispatchQuery,
  validateDispatchInfoUpdate,
  validateDispatchPayment,
} from "./dispatch.validation.js";

export const createDispatch = asyncHandler(async (req, res) => {
  const validData = validateCreateDispatch(req.body);
  try {
    const result = await withTransaction(async (client) => {
      return await DispatchService.createDispatchService(
        client,
        validData,
        req.user.id,
      );
    }, req.user.id);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes("Negative stock is not allowed")) {
      return res.status(400).json({
        success: false,
        message:
          "Insufficient Stock: Cannot dispatch more than what is currently available.",
      });
    }
    throw error;
  }
});

export const getDispatches = asyncHandler(async (req, res) => {
  const validQuery = validateDispatchQuery(req.query);
  const result = await withTransaction(async (client) => {
    return await DispatchService.getDispatchesService(client, validQuery);
  });
  res.status(200).json({ success: true, ...result });
});

export const getDispatchById = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) => {
    return await DispatchService.getDispatchByIdService(client, req.params.id);
  });
  res.status(200).json({ success: true, data: result });
});

export const addDispatchPayment = asyncHandler(async (req, res) => {
  const validData = validateDispatchPayment(req.body);
  const result = await withTransaction(async (client) => {
    return await DispatchService.addDispatchPaymentService(
      client,
      req.params.id,
      validData,
      req.user.id,
    );
  }, req.user.id);
  res.status(201).json({ success: true, data: result });
});

export const cancelDispatch = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) => {
    return await DispatchService.cancelDispatchService(
      client,
      req.params.id,
      req.user.id,
    );
  }, req.user.id);
  res.status(200).json({ success: true, data: result });
});

export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const validData = validatePaymentStatus(req.body);
  const result = await withTransaction(async (client) => {
    return await DispatchService.updatePaymentStatusService(
      client,
      req.params.id,
      validData.payment_status,
      req.user.id,
    );
  }, req.user.id);
  res.status(200).json({
    success: true,
    message: `Payment status auto-settled to ${validData.payment_status}`,
    data: result,
  });
});

export const updateDispatchInfo = asyncHandler(async (req, res) => {
  const validData = validateDispatchInfoUpdate(req.body);
  const result = await withTransaction(async (client) => {
    return await DispatchService.updateDispatchInfoService(
      client,
      req.params.id,
      validData,
      req.user.id,
    );
  }, req.user.id);
  res
    .status(200)
    .json({ success: true, message: "Dispatch info updated.", data: result });
});
