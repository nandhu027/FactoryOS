import { Router } from "express";
import * as controller from "./machines.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { ApiError } from "../../utils/ApiError.js";

const router = Router();

router.param("id", (req, res, next, id) => {
  if (isNaN(Number(id))) return next(new ApiError(400, "Invalid Machine ID"));
  next();
});

router.get("/", authorize("MACHINES", "can_view"), controller.getMachines);
router.post("/", authorize("MACHINES", "can_add"), controller.createMachine);

router.get(
  "/:id",
  authorize("MACHINES", "can_view"),
  controller.getMachineById,
);

router.put("/:id", authorize("MACHINES", "can_edit"), controller.updateMachine);
router.delete(
  "/:id",
  authorize("MACHINES", "can_delete"),
  controller.deleteMachine,
);

export default router;
