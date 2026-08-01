import { z } from "zod";

const moneySchema = z.coerce
  .number()
  .min(0, "Value cannot be negative");

const mediaItemSchema = z.object({
  mediaId: z.coerce.number().int().positive(),
  isThumbnail: z.boolean().default(false),
  isGallery: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const variantMediaSchema = z.object({
  mediaId: z.coerce.number().int().positive(),
  isThumbnail: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const variantSchema = z.object({
  id: z.coerce.number().int().positive().optional(),

  sku: z
    .string()
    .trim()
    .min(1, "Variant SKU is required")
    .max(100),

  attributeValueIds: z
    .array(z.coerce.number().int().positive())
    .min(1, "At least one attribute value is required"),

  price: moneySchema,

  salePrice: moneySchema.optional().nullable(),

  stock: z.coerce
    .number()
    .int()
    .min(0, "Stock cannot be negative"),

  lowStockThreshold: z.coerce
    .number()
    .int()
    .min(0)
    .default(5),

  weight: moneySchema.optional().nullable(),

  active: z.boolean().default(true),

  media: z.array(variantMediaSchema).default([]),
});

const productBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters")
    .max(200),

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers and hyphens only",
    ),

  sku: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable(),

  shortDescription: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable(),

  longDescription: z
    .string()
    .trim()
    .max(10000)
    .optional()
    .nullable(),

  hasVariants: z.boolean().default(false),

  price: moneySchema.optional().nullable(),

  salePrice: moneySchema.optional().nullable(),

  stock: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .nullable(),

  weight: moneySchema.optional().nullable(),

  active: z.boolean().default(true),

  featured: z.boolean().default(false),

  sortOrder: z.coerce
    .number()
    .int()
    .min(0)
    .default(0),

  brandId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),

  categoryIds: z
    .array(z.coerce.number().int().positive())
    .default([]),

  media: z.array(mediaItemSchema).default([]),

  variants: z.array(variantSchema).default([]),
});

function validateProductRules(data, context) {
  if (data.hasVariants) {
    if (data.price !== undefined && data.price !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Variable products cannot have a product-level price",
      });
    }

    if (data.stock !== undefined && data.stock !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stock"],
        message: "Variable products cannot have product-level stock",
      });
    }

    if (data.variants.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variants"],
        message: "Variable products require at least one variant",
      });
    }
  } else {
    if (data.variants.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variants"],
        message: "Simple products cannot contain variants",
      });
    }

    if (data.price === undefined || data.price === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Simple products require a price",
      });
    }

    if (data.stock === undefined || data.stock === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stock"],
        message: "Simple products require stock",
      });
    }
  }

  if (
    data.salePrice !== undefined &&
    data.salePrice !== null &&
    data.price !== undefined &&
    data.price !== null &&
    data.salePrice > data.price
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["salePrice"],
      message: "Sale price cannot exceed price",
    });
  }

  const productThumbnails = data.media.filter(
    (item) => item.isThumbnail,
  );

  if (productThumbnails.length > 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["media"],
      message: "A product can have only one thumbnail",
    });
  }

  data.variants.forEach((variant, index) => {
    if (
      variant.salePrice !== undefined &&
      variant.salePrice !== null &&
      variant.salePrice > variant.price
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variants", index, "salePrice"],
        message: "Variant sale price cannot exceed price",
      });
    }

    const thumbnails = variant.media.filter(
      (item) => item.isThumbnail,
    );

    if (thumbnails.length > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variants", index, "media"],
        message: "A variant can have only one thumbnail",
      });
    }
  });
}

export const createProductSchema =
  productBaseSchema.superRefine(validateProductRules);

export const updateProductSchema =
  productBaseSchema.superRefine(validateProductRules);

export const productQuerySchema = z.object({
  search: z.string().trim().optional(),

  categoryId: z.coerce
    .number()
    .int()
    .positive()
    .optional(),

  brandId: z.coerce
    .number()
    .int()
    .positive()
    .optional(),

  active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),

  sortBy: z
    .enum(["createdAt", "name", "price", "stock"])
    .default("createdAt"),

  sortOrder: z
    .enum(["asc", "desc"])
    .default("desc"),

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