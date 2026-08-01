import express from "express";
import {
  getOne,
  list,
  remove,
  update,
  uploadFiles,
} from "../controllers/media.controller.js";
import {
  authenticate,
  requirePermission,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { upload } from "../middleware/upload.js";
import { updateMediaSchema } from "../validators/media.validator.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("media:read"),
  list,
);

router.get(
  "/:id",
  requirePermission("media:read"),
  getOne,
);

router.post(
  "/upload",
  requirePermission("media:upload"),
  upload.array("files", 10),
  uploadFiles,
);

router.patch(
  "/:id",
  requirePermission("media:write"),
  validate(updateMediaSchema),
  update,
);

router.delete(
  "/:id",
  requirePermission("media:delete"),
  remove,
);

export default router;