import { Router } from "express";
import * as controller from "./attendance.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { ApiError } from "../../utils/ApiError.js";

const router = Router();

router.param("id", (req, res, next, id) => {
  if (isNaN(Number(id)))
    return next(new ApiError(400, "Invalid Attendance ID"));
  next();
});

router.get(
  "/",
  authorize("STAFF_ATTENDANCE", "can_view"),
  controller.getAttendance,
);
router.get(
  "/summary",
  authorize("STAFF_ATTENDANCE", "can_view"),
  controller.getAttendanceSummary,
);

router.post(
  "/",
  authorize("STAFF_ATTENDANCE", "can_add"),
  controller.markAttendance,
);
router.patch(
  "/:id",
  authorize("STAFF_ATTENDANCE", "can_edit"),
  controller.updateAttendance,
);
router.delete(
  "/:id",
  authorize("STAFF_ATTENDANCE", "can_delete"),
  controller.deleteAttendance,
);

export default router;
