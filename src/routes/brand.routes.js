import express from "express";
import {
  create,
  getOne,
  list,
  remove,
  update,
} from "../controllers/brand.controller.js";
import {
  authenticate,
  requirePermission,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createBrandSchema,
  updateBrandSchema,
} from "../validators/brand.validator.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("brand:read"),
  list,
);

router.get(
  "/:id",
  requirePermission("brand:read"),
  getOne,
);

router.post(
  "/",
  requirePermission("brand:create"),
  validate(createBrandSchema),
  create,
);

router.patch(
  "/:id",
  requirePermission("brand:update"),
  validate(updateBrandSchema),
  update,
);

router.delete(
  "/:id",
  requirePermission("brand:delete"),
  remove,
);

export default router;