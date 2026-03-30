import { Router } from "express";
import * as controller from "./products.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { ApiError } from "../../utils/ApiError.js";

const router = Router();

router.param("id", (req, res, next, id) => {
  if (isNaN(Number(id))) return next(new ApiError(400, "Invalid id parameter"));
  next();
});

router.get(
  "/semi-finished",
  authorize("PRODUCTS", "can_view"),
  controller.getSemiFinished,
);
router.post(
  "/semi-finished",
  authorize("PRODUCTS", "can_add"),
  controller.createSemiFinished,
);
router.get(
  "/semi-finished/:id",
  authorize("PRODUCTS", "can_view"),
  controller.getSemiFinishedById,
);
router.put(
  "/semi-finished/:id",
  authorize("PRODUCTS", "can_edit"),
  controller.updateSemiFinished,
);
router.delete(
  "/semi-finished/:id",
  authorize("PRODUCTS", "can_delete"),
  controller.deleteSemiFinished,
);

router.get("/", authorize("PRODUCTS", "can_view"), controller.getProducts);
router.post("/", authorize("PRODUCTS", "can_add"), controller.createProduct);
router.get(
  "/:id",
  authorize("PRODUCTS", "can_view"),
  controller.getProductById,
);
router.put("/:id", authorize("PRODUCTS", "can_edit"), controller.updateProduct);
router.delete(
  "/:id",
  authorize("PRODUCTS", "can_delete"),
  controller.deleteProduct,
);

export default router;
