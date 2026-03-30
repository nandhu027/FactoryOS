import { Router } from "express";
import {
  createWorkType,
  getWorkTypes,
  updateWorkType,
  deleteWorkType,
  createStaff,
  getStaff,
  updateStaff,
  deleteStaff,
  getPersonnelOngoingWork,
  getPersonnelPayments,
  getPersonnelAttendance,
} from "./staff.controller.js";
import { authorize } from "../../middlewares/rbac.middleware.js";

const router = Router();

router.post(
  "/work-types",
  authorize("STAFF_CONTRACTORS", "can_add"),
  createWorkType,
);
router.get(
  "/work-types",
  authorize("STAFF_CONTRACTORS", "can_view"),
  getWorkTypes,
);
router.put(
  "/work-types/:id",
  authorize("STAFF_CONTRACTORS", "can_edit"),
  updateWorkType,
);
router.delete(
  "/work-types/:id",
  authorize("STAFF_CONTRACTORS", "can_delete"),
  deleteWorkType,
);

router.post("/", authorize("STAFF_CONTRACTORS", "can_add"), createStaff);
router.get("/", authorize("STAFF_CONTRACTORS", "can_view"), getStaff);
router.put("/:id", authorize("STAFF_CONTRACTORS", "can_edit"), updateStaff);
router.delete(
  "/:id",
  authorize("STAFF_CONTRACTORS", "can_delete"),
  deleteStaff,
);

router.get(
  "/:id/ongoing-work",
  authorize("STAFF_CONTRACTORS", "can_view"),
  getPersonnelOngoingWork,
);

router.get(
  "/:id/payments",
  authorize("PAYMENTS", "can_view"),
  getPersonnelPayments,
);

router.get(
  "/:id/attendance",
  authorize("STAFF_ATTENDANCE", "can_view"),
  getPersonnelAttendance,
);

export default router;
