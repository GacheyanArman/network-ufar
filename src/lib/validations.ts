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
    .regex(
      /^[a-z0-9_]{3,24}$/,
      "Username must be 3-24 characters: letters, numbers or underscore only",
    )
    .optional()
    .or(z.literal("")),

  faculty: z.string().trim().max(100).optional().or(z.literal("")),

  bio: z
    .string()
    .trim()
    .max(300, "Bio must be 300 characters or less")
    .optional()
    .or(z.literal("")),

  gender: z
    .enum(["male", "female", "other", "prefer_not_to_say"])
    .optional()
    .or(z.literal("")),

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
  email: z.string().trim().email("Invalid email address").toLowerCase(),

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
  email: z.string().trim().email("Invalid email address").toLowerCase(),

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

// Study materials validation schemas
export const materialRatingSchema = z.object({
  materialId: z.string().min(1, "Invalid material ID"),
  rating: z
    .number({ error: "Rating must be a number" })
    .int("Rating must be an integer")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
});

export const materialCommentSchema = z.object({
  materialId: z.string().min(1, "Invalid material ID"),
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be 1000 characters or less"),
});

// Calendar entry — used by createCalendarEntry / updateCalendarEntry.
// We accept ISO date strings from the client and convert in the action.
export const calendarEntrySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be 200 characters or less"),
    description: z
      .string()
      .trim()
      .max(1000, "Description must be 1000 characters or less")
      .optional()
      .or(z.literal("")),
    eventType: z.enum([
      "exam",
      "homework",
      "assignment",
      "project",
      "event",
      "personal",
      "community",
      "lecture",
      "holiday",
      "deadline",
      "other",
    ]),
    course: z.string().trim().max(100).optional().or(z.literal("")),
    faculty: z.string().trim().max(100).optional().or(z.literal("")),
    communityId: z.string().trim().optional().or(z.literal("")),
    location: z.string().trim().max(200).optional().or(z.literal("")),
    onlineLink: z.string().trim().max(500).optional().or(z.literal("")),
    dueDate: z.string().min(1, "Date is required"),
    endDate: z.string().optional().or(z.literal("")),
    isAllDay: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    recurrence: z
      .enum(["none", "daily", "weekly", "monthly"])
      .optional()
      .default("none"),
    recurrenceUntil: z.string().optional().or(z.literal("")),
    // Comma-separated offsets in minutes. Each value 0..43_200 (30 days).
    reminderOffsets: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine(
        (s) =>
          !s ||
          s
            .split(",")
            .map((x) => x.trim())
            .every(
              (x) => /^\d+$/.test(x) && Number(x) >= 0 && Number(x) <= 43200,
            ),
        "Reminder offsets must be non-negative integers in minutes (max 30 days)",
      ),
  })
  .superRefine((val, ctx) => {
    // dueDate must parse to a valid date.
    const due = new Date(val.dueDate);
    if (isNaN(due.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Invalid due date",
      });
      return;
    }
    if (val.endDate) {
      const end = new Date(val.endDate);
      if (isNaN(end.getTime())) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "Invalid end date",
        });
      } else if (end.getTime() < due.getTime()) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "End date must be after start date",
        });
      }
    }
    if (val.recurrenceUntil) {
      const until = new Date(val.recurrenceUntil);
      if (isNaN(until.getTime())) {
        ctx.addIssue({
          code: "custom",
          path: ["recurrenceUntil"],
          message: "Invalid recurrence end date",
        });
      } else if (until.getTime() < due.getTime()) {
        ctx.addIssue({
          code: "custom",
          path: ["recurrenceUntil"],
          message: "Recurrence end must be after the start date",
        });
      }
    }
  });

export type CalendarEntryInput = z.infer<typeof calendarEntrySchema>;

// Events ---------------------------------------------------------------
export const eventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters")
      .max(160, "Title must be 160 characters or less"),
    description: z
      .string()
      .trim()
      .max(1500, "Description must be 1500 characters or less")
      .optional()
      .or(z.literal("")),
    eventType: z.enum([
      "academic",
      "club",
      "career",
      "social",
      "sports",
      "workshop",
      "exam",
      // Legacy values still accepted on update so old rows can re-save:
      "party",
      "cultural",
      "other",
    ]),
    location: z.string().trim().max(220).optional().or(z.literal("")),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().optional().or(z.literal("")),
    maxAttendees: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .optional()
      .refine((value) => {
        if (value === null || value === undefined || value === "") return true;
        const n = Number(value);
        return Number.isInteger(n) && n >= 0 && n <= 10000;
      }, "Max attendees must be a whole number between 0 and 10000"),
    enableWaitlist: z.boolean().optional(),
    communityId: z.string().trim().optional().or(z.literal("")),
    reminderOffsets: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine(
        (s) =>
          !s ||
          s
            .split(",")
            .map((x) => x.trim())
            .every(
              (x) => /^\d+$/.test(x) && Number(x) >= 0 && Number(x) <= 43200,
            ),
        "Reminder offsets must be non-negative integers in minutes (max 30 days)",
      ),
  })
  .superRefine((val, ctx) => {
    const start = new Date(val.startTime);
    if (isNaN(start.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "Invalid start time",
      });
      return;
    }
    if (val.endTime) {
      const end = new Date(val.endTime);
      if (isNaN(end.getTime())) {
        ctx.addIssue({
          code: "custom",
          path: ["endTime"],
          message: "Invalid end time",
        });
      } else if (end.getTime() < start.getTime()) {
        ctx.addIssue({
          code: "custom",
          path: ["endTime"],
          message: "End time must be after start time",
        });
      }
    }
  });

export const eventCommentSchema = z.object({
  eventId: z.string().min(1, "Invalid event ID"),
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be 1000 characters or less"),
});

export type EventInput = z.infer<typeof eventSchema>;
