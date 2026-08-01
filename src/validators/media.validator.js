import { z } from "zod";

export const updateMediaSchema = z
  .object({
    title: z
      .string()
      .trim()
      .max(150, "Title is too long")
      .optional()
      .nullable(),

    altText: z
      .string()
      .trim()
      .max(255, "Alt text is too long")
      .optional()
      .nullable(),
  })
  .refine(
    (data) =>
      data.title !== undefined || data.altText !== undefined,
    {
      message: "At least one field is required",
    },
  );

export const mediaQuerySchema = z.object({
  search: z.string().trim().optional(),

  type: z
    .enum(["image", "video", "document"])
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