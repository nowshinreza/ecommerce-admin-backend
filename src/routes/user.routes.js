import express from "express";
import {
  create,
  getOne,
  list,
  remove,
  update,
} from "../controllers/user.controller.js";
import {
  authenticate,
  requirePermission,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createUserSchema,
  updateUserSchema,
} from "../validators/user.validator.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("user:read"),
  list,
);

router.get(
  "/:id",
  requirePermission("user:read"),
  getOne,
);

router.post(
  "/",
  requirePermission("user:create"),
  validate(createUserSchema),
  create,
);

router.patch(
  "/:id",
  requirePermission("user:update"),
  validate(updateUserSchema),
  update,
);

router.delete(
  "/:id",
  requirePermission("user:delete"),
  remove,
);

export default router;