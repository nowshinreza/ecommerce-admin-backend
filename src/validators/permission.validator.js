import { z } from "zod";

const allowedActions = [
  "watch",
  "create",
  "read",
  "update",
  "delete",
  "upload",
  "write",
  "approve",
  "status",
];

export const createPermissionGroupSchema = z.object({
  name: z
    .string()
    .min(2, "Group name must be at least 2 characters")
    .max(50, "Group name is too long"),
  description: z.string().max(255).optional().nullable(),
  actions: z
    .array(
      z
        .string()
        .trim()
        .toLowerCase()
        .refine(
          (value) =>
            allowedActions.includes(value) ||
            /^[a-z][a-z0-9_-]*$/.test(value),
          "Invalid action name",
        ),
    )
    .min(1, "At least one action is required"),
});

export const updatePermissionGroupSchema =
  createPermissionGroupSchema.partial();

export const permissionQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});