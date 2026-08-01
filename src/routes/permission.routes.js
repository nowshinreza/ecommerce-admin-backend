import express from "express";
import {
  createGroup,
  deleteGroup,
  getGroup,
  listGroups,
  updateGroup,
} from "../controllers/permission.controller.js";
import {
  authenticate,
  requirePermission,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createPermissionGroupSchema,
  updatePermissionGroupSchema,
} from "../validators/permission.validator.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("permission:read"),
  listGroups,
);

router.get(
  "/:id",
  requirePermission("permission:read"),
  getGroup,
);

router.post(
  "/",
  requirePermission("permission:create"),
  validate(createPermissionGroupSchema),
  createGroup,
);

router.patch(
  "/:id",
  requirePermission("permission:update"),
  validate(updatePermissionGroupSchema),
  updateGroup,
);

router.delete(
  "/:id",
  requirePermission("permission:delete"),
  deleteGroup,
);

export default router;