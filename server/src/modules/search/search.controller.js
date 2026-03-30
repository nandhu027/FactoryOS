import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import { performGlobalSearchService } from "./search.service.js";

export const globalSearch = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return res.json({ success: true, data: [] });
  }

  const result = await withTransaction(async (client) => {
    await client.query(`SELECT set_config('app.user_id', $1::text, true)`, [
      req.user.id,
    ]);
    return await performGlobalSearchService(client, q.trim(), req.user.id);
  });

  res.json({ success: true, data: result });
});
