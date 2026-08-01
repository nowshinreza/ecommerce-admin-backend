import express from "express";
import {
  login,
  logout,
  refresh,
  session,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  loginSchema,
  refreshSchema,
} from "../validators/auth.validator.js";

const router = express.Router();

router.post("/login", validate(loginSchema), login);

router.post("/refresh", validate(refreshSchema), refresh);

router.post("/logout", validate(refreshSchema), logout);

router.get("/session", authenticate, session);

export default router;