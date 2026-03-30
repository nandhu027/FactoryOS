import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import {
  getStockSnapshotService,
  getStockLedgerHistoryService,
  createStockConversionService,
  getStockConversionsService,
  reverseStockConversionService,
} from "./stock.service.js";
import {
  validateSnapshotQuery,
  validateHistoryQuery,
  validateStockConversion,
  validateConversionQuery,
} from "./stock.validation.js";

export const fetchStockSnapshot = asyncHandler(async (req, res) => {
  const validQuery = validateSnapshotQuery(req.query);
  const result = await withTransaction((client) =>
    getStockSnapshotService(client, validQuery),
  );
  res.json({ success: true, data: result });
});

export const fetchStockHistory = asyncHandler(async (req, res) => {
  const validQuery = validateHistoryQuery(req.query);
  const result = await withTransaction((client) =>
    getStockLedgerHistoryService(client, validQuery),
  );
  res.json({ success: true, ...result });
});

export const createStockConversion = asyncHandler(async (req, res) => {
  const validData = validateStockConversion(req.body);
  try {
    const result = await withTransaction(async (client) => {
      return await createStockConversionService(client, validData, req.user.id);
    }, req.user.id);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes("Negative stock is not allowed")) {
      return res.status(400).json({
        success: false,
        message:
          "Insufficient Stock: Cannot convert more material than is currently available in the ledger.",
      });
    }
    throw error;
  }
});

export const fetchStockConversions = asyncHandler(async (req, res) => {
  const validQuery = validateConversionQuery(req.query);
  const result = await withTransaction((client) =>
    getStockConversionsService(client, validQuery),
  );
  res.json({ success: true, ...result });
});

export const reverseStockConversion = asyncHandler(async (req, res) => {
  const result = await withTransaction(
    (client) =>
      reverseStockConversionService(client, req.params.id, req.user.id),
    req.user.id,
  );

  res.json({ success: true, data: result });
});
