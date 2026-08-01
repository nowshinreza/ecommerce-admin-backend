import express from "express";
import {
  create,
  createValue,
  getOne,
  list,
  remove,
  removeValue,
  update,
  updateValue,
} from "../controllers/attribute.controller.js";
import {
  authenticate,
  requirePermission,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createAttributeSchema,
  createAttributeValueSchema,
  updateAttributeSchema,
  updateAttributeValueSchema,
} from "../validators/attribute.validator.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("attribute:read"),
  list,
);

router.get(
  "/:id",
  requirePermission("attribute:read"),
  getOne,
);

router.post(
  "/",
  requirePermission("attribute:create"),
  validate(createAttributeSchema),
  create,
);

router.patch(
  "/:id",
  requirePermission("attribute:update"),
  validate(updateAttributeSchema),
  update,
);

router.delete(
  "/:id",
  requirePermission("attribute:delete"),
  remove,
);

router.post(
  "/:attributeId/values",
  requirePermission("attribute:create"),
  validate(createAttributeValueSchema),
  createValue,
);

router.patch(
  "/:attributeId/values/:valueId",
  requirePermission("attribute:update"),
  validate(updateAttributeValueSchema),
  updateValue,
);

router.delete(
  "/:attributeId/values/:valueId",
  requirePermission("attribute:delete"),
  removeValue,
);

export default router;