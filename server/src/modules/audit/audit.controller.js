import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import { getAuditLogsService, getAuditTablesService } from "./audit.service.js";

export const getAuditLogs = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    getAuditLogsService(client, req.query),
  );
  res.json({ success: true, ...result });
});

export const getAuditTables = asyncHandler(async (req, res) => {
  const result = await withTransaction((client) =>
    getAuditTablesService(client),
  );
  res.json({ success: true, data: result });
});
