import { Router } from "express";
import {
  fetchStockSnapshot,
  fetchStockHistory,
  createStockConversion,
  fetchStockConversions,
  reverseStockConversion,
} from "./stock.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";

const router = Router();

router.get(
  "/snapshot",
  authorize("STOCK_ENGINE", "can_view"),
  fetchStockSnapshot,
);

router.get(
  "/history",
  authorize("STOCK_ENGINE", "can_view"),
  fetchStockHistory,
);

router.post(
  "/conversions",
  authorize("STOCK_ENGINE", "can_edit"),
  createStockConversion,
);

router.post(
  "/conversions/:id/reverse",
  authorize("STOCK_ENGINE", "can_edit"), // Use the appropriate permission
  reverseStockConversion,
);

router.get(
  "/conversions",
  authorize("STOCK_ENGINE", "can_view"),
  fetchStockConversions,
);

export default router;
