import { z } from "zod";

// Profile validation schemas
export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(80, "Full name must be 80 characters or less"),

  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/, "Username must be 3-24 characters: letters, numbers or underscore only")
    .optional()
    .or(z.literal("")),

  faculty: z.string().trim().max(100).optional().or(z.literal("")),

  bio: z
    .string()
    .trim()
    .max(300, "Bio must be 300 characters or less")
    .optional()
    .or(z.literal("")),

  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional().or(z.literal("")),

  relationshipStatus: z
    .enum(["single", "in_relationship", "complicated", "prefer_not_to_say"])
    .optional()
    .or(z.literal("")),

  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      return birthDate <= today;
    }, "Birth date cannot be in the future")
    .optional()
    .or(z.literal("")),

  privacyLevel: z
    .enum(["public", "friends", "private"])
    .optional()
    .or(z.literal("")),
});

// Auth validation schemas
export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .toLowerCase(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),

  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(80, "Full name must be 80 characters or less"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .toLowerCase(),

  password: z.string().min(1, "Password is required"),
});

export const verifyEmailSchema = z.object({
  code: z
    .string()
    .trim()
    .length(6, "Verification code must be 6 digits")
    .regex(/^\d{6}$/, "Verification code must contain only digits"),
});

// Comment validation schema
export const commentSchema = z.object({
  postId: z.string().min(1, "Invalid post ID"),
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be 1000 characters or less"),
});

// Photo validation schema
export const photoSchema = z.object({
  caption: z
    .string()
    .trim()
    .max(200, "Caption must be 200 characters or less")
    .optional()
    .or(z.literal("")),

  albumId: z.string().optional().or(z.literal("")),

  isPrivate: z.boolean().default(false),
});

// Community validation schema
export const communitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Community name must be at least 3 characters")
    .max(50, "Community name must be 50 characters or less"),

  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .or(z.literal("")),
});

// Message validation schema
export const messageSchema = z.object({
  recipientId: z.string().min(1, "Invalid recipient ID"),
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be 2000 characters or less"),
});
