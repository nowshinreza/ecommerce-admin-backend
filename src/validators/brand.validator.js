import { z } from "zod";

export const createBrandSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Brand name must be at least 2 characters")
    .max(100, "Brand name is too long"),

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers and hyphens only",
    ),

  logoId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),

  status: z.boolean().default(true),

  description: z
    .string()
    .trim()
    .max(1000, "Description is too long")
    .optional()
    .nullable(),
});

export const updateBrandSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Brand name must be at least 2 characters")
      .max(100, "Brand name is too long")
      .optional(),

    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must contain lowercase letters, numbers and hyphens only",
      )
      .optional(),

    logoId: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .nullable(),

    status: z.boolean().optional(),

    description: z
      .string()
      .trim()
      .max(1000, "Description is too long")
      .optional()
      .nullable(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.slug !== undefined ||
      data.logoId !== undefined ||
      data.status !== undefined ||
      data.description !== undefined,
    {
      message: "At least one field is required",
    },
  );

export const brandQuerySchema = z.object({
  search: z.string().trim().optional(),

  status: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),

  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(10),
});