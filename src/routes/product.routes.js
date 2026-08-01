import express from "express";
import {
  create,
  getOne,
  list,
  remove,
  update,
} from "../controllers/product.controller.js";
import {
  authenticate,
  requirePermission,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createProductSchema,
  updateProductSchema,
} from "../validators/product.validator.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("product:read"),
  list,
);

router.get(
  "/:id",
  requirePermission("product:read"),
  getOne,
);

router.post(
  "/",
  requirePermission("product:create"),
  validate(createProductSchema),
  create,
);

router.put(
  "/:id",
  requirePermission("product:update"),
  validate(updateProductSchema),
  update,
);

router.delete(
  "/:id",
  requirePermission("product:delete"),
  remove,
);

export default router;