import { z } from "zod";

export const createRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Role name must be at least 2 characters")
    .max(100, "Role name is too long"),

  description: z
    .string()
    .trim()
    .max(255, "Description is too long")
    .optional()
    .nullable(),

  status: z.boolean().default(true),

  permissionIds: z
    .array(z.coerce.number().int().positive())
    .min(1, "At least one permission is required"),
});

export const updateRoleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Role name must be at least 2 characters")
      .max(100, "Role name is too long")
      .optional(),

    description: z
      .string()
      .trim()
      .max(255, "Description is too long")
      .optional()
      .nullable(),

    status: z.boolean().optional(),

    permissionIds: z
      .array(z.coerce.number().int().positive())
      .min(1, "At least one permission is required")
      .optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.status !== undefined ||
      data.permissionIds !== undefined,
    {
      message: "At least one field is required",
    },
  );

export const roleQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});