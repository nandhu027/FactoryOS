import { Router } from "express";
import * as controller from "./parties.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { ApiError } from "../../utils/ApiError.js";

const router = Router();

router.param("id", (req, res, next, id) => {
  if (isNaN(Number(id))) return next(new ApiError(400, "Invalid Party ID"));
  next();
});

router.get("/", authorize("PARTIES", "can_view"), controller.getParties);
router.post("/", authorize("PARTIES", "can_add"), controller.createParty);

router.get("/:id", authorize("PARTIES", "can_view"), controller.getPartyById);

router.put("/:id", authorize("PARTIES", "can_edit"), controller.updateParty);
router.delete(
  "/:id",
  authorize("PARTIES", "can_delete"),
  controller.deleteParty,
);

export default router;
