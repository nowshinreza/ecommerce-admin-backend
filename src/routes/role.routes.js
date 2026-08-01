import express from "express";
import {
  create,
  getOne,
  list,
  remove,
  update,
} from "../controllers/role.controller.js";
import {
  authenticate,
  requirePermission,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createRoleSchema,
  updateRoleSchema,
} from "../validators/role.validator.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("role:read"),
  list,
);

router.get(
  "/:id",
  requirePermission("role:read"),
  getOne,
);

router.post(
  "/",
  requirePermission("role:create"),
  validate(createRoleSchema),
  create,
);

router.patch(
  "/:id",
  requirePermission("role:update"),
  validate(updateRoleSchema),
  update,
);

router.delete(
  "/:id",
  requirePermission("role:delete"),
  remove,
);

export default router;