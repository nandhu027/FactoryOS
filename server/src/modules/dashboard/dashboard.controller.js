import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import { getDashboardDataService } from "./dashboard.service.js";

export const getDashboardData = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const result = await withTransaction(async (client) => {
    return await getDashboardDataService(client, { startDate, endDate });
  });

  res.status(200).json({ success: true, data: result });
});
