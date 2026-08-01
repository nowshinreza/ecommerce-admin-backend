import { z } from "zod";

const attributeTypes = [
  "dropdown",
  "radio",
  "checkbox",
  "colour-swatch",
  "image-swatch",
];

const attributeValueSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, "Value is required")
    .max(100, "Value is too long"),

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers and hyphens only",
    ),

  referenceValue: z
    .string()
    .trim()
    .max(255, "Reference value is too long")
    .optional()
    .nullable(),

  mediaId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
});

export const createAttributeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Attribute name must be at least 2 characters")
    .max(100, "Attribute name is too long"),

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers and hyphens only",
    ),

  type: z.enum(attributeTypes),

  values: z
    .array(attributeValueSchema)
    .default([]),
});

export const updateAttributeSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Attribute name must be at least 2 characters")
      .max(100, "Attribute name is too long")
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

    type: z.enum(attributeTypes).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.slug !== undefined ||
      data.type !== undefined,
    {
      message: "At least one field is required",
    },
  );

export const createAttributeValueSchema = attributeValueSchema;

export const updateAttributeValueSchema = z
  .object({
    value: z
      .string()
      .trim()
      .min(1, "Value is required")
      .max(100, "Value is too long")
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

    referenceValue: z
      .string()
      .trim()
      .max(255, "Reference value is too long")
      .optional()
      .nullable(),

    mediaId: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .nullable(),
  })
  .refine(
    (data) =>
      data.value !== undefined ||
      data.slug !== undefined ||
      data.referenceValue !== undefined ||
      data.mediaId !== undefined,
    {
      message: "At least one field is required",
    },
  );

export const attributeQuerySchema = z.object({
  search: z.string().trim().optional(),

  type: z
    .enum(attributeTypes)
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