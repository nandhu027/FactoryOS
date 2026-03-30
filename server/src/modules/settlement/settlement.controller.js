import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import * as service from "./settlement.service.js";
import * as validation from "./settlement.validation.js";
import { getRawInwardByIdService } from "../rawMaterial/rawMaterial.service.js";
import { getDispatchByIdService } from "../dispatch/dispatch.service.js";

export const getSettlements = asyncHandler(async (req, res) => {
  const validQuery = validation.validateSettlementQuery(req.query);

  const result = await withTransaction((client) =>
    service.getSettlementsService(client, validQuery),
  );

  res.json({
    success: true,
    data: result,
  });
});

export const getSettlementById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type } = req.query;

  if (!type) {
    return res.status(400).json({
      success: false,
      message:
        "Bill 'type' is required in query parameters to fetch the full view.",
    });
  }

  let result;

  await withTransaction(async (client) => {
    if (type === "PURCHASE") {
      result = await getRawInwardByIdService(client, Number(id));
    } else {
      result = await getDispatchByIdService(client, Number(id));
    }
  });

  res.json({
    success: true,
    message: "Full bill details fetched successfully.",
    data: result,
  });
});

export const processSettlement = asyncHandler(async (req, res) => {
  const validData = validation.validateSettlementPayload(req.body);

  const result = await withTransaction(
    (client) =>
      service.processSettlementService(client, validData, req.user.id),
    req.user.id,
  );

  res.status(201).json({
    success: true,
    message: result.message,
    data: {
      status: result.status,
      amount_paid: result.amount_paid,
      balance_due: result.balance_due,
    },
  });
});

export const reverseSettlement = asyncHandler(async (req, res) => {
  const { record_id, payment_id } = req.params;
  const { module_type } = req.query;

  if (!module_type || !record_id || !payment_id) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required parameters (record_id, payment_id, module_type).",
    });
  }

  const result = await withTransaction(
    (client) =>
      service.reverseSettlementService(
        client,
        record_id,
        payment_id,
        module_type,
        req.user.id,
      ),
    req.user.id,
  );

  res.json({
    success: true,
    message: result.message,
  });
});
