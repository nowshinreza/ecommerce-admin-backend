import { z } from "zod";

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Category name must be at least 2 characters")
    .max(100, "Category name is too long"),

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers and hyphens only",
    ),

  description: z
    .string()
    .trim()
    .max(1000, "Description is too long")
    .optional()
    .nullable(),

  imageId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),

  parentId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),

  active: z.boolean().default(true),

  sortOrder: z.coerce
    .number()
    .int()
    .min(0)
    .default(0),
});

export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Category name must be at least 2 characters")
      .max(100, "Category name is too long")
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

    description: z
      .string()
      .trim()
      .max(1000, "Description is too long")
      .optional()
      .nullable(),

    imageId: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .nullable(),

    parentId: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .nullable(),

    active: z.boolean().optional(),

    sortOrder: z.coerce
      .number()
      .int()
      .min(0)
      .optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.slug !== undefined ||
      data.description !== undefined ||
      data.imageId !== undefined ||
      data.parentId !== undefined ||
      data.active !== undefined ||
      data.sortOrder !== undefined,
    {
      message: "At least one field is required",
    },
  );

export const categoryQuerySchema = z.object({
  search: z.string().trim().optional(),

  active: z
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