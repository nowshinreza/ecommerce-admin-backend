import express from "express";
import {
  create,
  getOne,
  list,
  remove,
  tree,
  update,
} from "../controllers/category.controller.js";
import {
  authenticate,
  requirePermission,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../validators/category.validator.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/tree",
  requirePermission("category:read"),
  tree,
);

router.get(
  "/",
  requirePermission("category:read"),
  list,
);

router.get(
  "/:id",
  requirePermission("category:read"),
  getOne,
);

router.post(
  "/",
  requirePermission("category:create"),
  validate(createCategorySchema),
  create,
);

router.patch(
  "/:id",
  requirePermission("category:update"),
  validate(updateCategorySchema),
  update,
);

router.delete(
  "/:id",
  requirePermission("category:delete"),
  remove,
);

export default router;