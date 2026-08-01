import { z } from "zod";

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),

  email: z
    .string()
    .trim()
    .email("A valid email is required")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),

  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long")
    .optional()
    .nullable(),

  gender: z
    .enum(["Male", "Female", "Other"])
    .optional()
    .nullable(),

  avatar: z
    .string()
    .trim()
    .max(500, "Avatar URL is too long")
    .optional()
    .nullable(),

  roleId: z.coerce
    .number()
    .int()
    .positive("A valid role is required"),

  active: z.boolean().default(true),
});

export const updateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name is too long")
      .optional(),

    email: z
      .string()
      .trim()
      .email("A valid email is required")
      .transform((value) => value.toLowerCase())
      .optional(),

    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password is too long")
      .optional(),

    phone: z
      .string()
      .trim()
      .max(30, "Phone number is too long")
      .optional()
      .nullable(),

    gender: z
      .enum(["Male", "Female", "Other"])
      .optional()
      .nullable(),

    avatar: z
      .string()
      .trim()
      .max(500, "Avatar URL is too long")
      .optional()
      .nullable(),

    roleId: z.coerce
      .number()
      .int()
      .positive("A valid role is required")
      .optional(),

    active: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.email !== undefined ||
      data.password !== undefined ||
      data.phone !== undefined ||
      data.gender !== undefined ||
      data.avatar !== undefined ||
      data.roleId !== undefined ||
      data.active !== undefined,
    {
      message: "At least one field is required",
    },
  );

export const userQuerySchema = z.object({
  search: z.string().trim().optional(),

  roleId: z.coerce
    .number()
    .int()
    .positive()
    .optional(),

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