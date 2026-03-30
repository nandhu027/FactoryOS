import { Router } from "express";
import * as controller from "../controllers/master.controller.js";
import { authorize } from "../middlewares/rbac.middleware.js";

const router = Router();

router.get(
  "/machines",
  authorize("MACHINES", "can_view"),
  controller.getMachinesMaster,
);
router.get(
  "/personnel",
  authorize("STAFF_CONTRACTORS", "can_view"),
  controller.getPersonnelMaster,
);
router.get(
  "/raw-materials",
  authorize("RAW_INWARD", "can_view"),
  controller.getRawMaterialsMaster,
);
router.get(
  "/products",
  authorize("PRODUCTS", "can_view"),
  controller.getProductsMaster,
);

router.get(
  "/semi-finished",
  authorize("PRODUCTS", "can_view"),
  controller.getSemiFinishedMaster,
);

router.get(
  "/scrap-types",
  authorize("PRODUCTS", "can_view"),
  controller.getScrapTypesMaster,
);
router.get(
  "/parties",
  authorize("PARTIES", "can_view"),
  controller.getPartiesMaster,
);

router.get(
  "/raw-materials/:id/stock",
  authorize("RAW_INWARD", "can_view"),
  controller.getRawMaterialStock,
);

export default router;
