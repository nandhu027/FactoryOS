import { Router } from "express";
import { login, getMe } from "./auth.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import validate from "../../middlewares/validate.middleware.js";
import { loginSchema } from "./auth.validation.js";

const router = Router();

router.post("/login", validate(loginSchema), login);

router.get("/me", authenticate, getMe);

export default router;
