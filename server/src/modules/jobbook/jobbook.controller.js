import { asyncHandler } from "../../utils/asyncHandler.js";
import { withTransaction } from "../../utils/dbTransaction.js";
import { getLiveJobBookService } from "./jobbook.service.js";
import { validateJobBookQuery } from "./jobbook.validation.js";

export const getLiveJobBook = asyncHandler(async (req, res) => {
  const validFilters = validateJobBookQuery(req.query);

  const result = await withTransaction((client) =>
    getLiveJobBookService(client, validFilters),
  );

  res.status(200).json({
    success: true,
    message: "Live Factory JobBook synchronized successfully.",
    data: result,
  });
});
