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

  year: z.string().trim().max(50).optional().or(z.literal("")),

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
    location: z
      .string()
      .trim()
      .min(1, "Location is required")
      .max(220),
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
    courseId: z.string().trim().optional().or(z.literal("")),
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

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// ---------------------------------------------------------------
// Helpers — used by server actions to validate FormData payloads.
// ---------------------------------------------------------------

/** Thrown when FormData fails Zod validation. */
export class FormValidationError extends Error {
  issues: z.ZodIssue[];
  constructor(issues: z.ZodIssue[]) {
    const first = issues[0];
    super(first ? first.message : "Invalid form data");
    this.name = "FormValidationError";
    this.issues = issues;
  }
}

/**
 * Materialize a FormData into a plain object suitable for Zod parsing.
 * Files are passed through. Duplicate keys collapse to the last value
 * (Zod schemas can use z.array on a single key by explicitly preprocessing
 * with .getAll instead — none of our schemas need it yet).
 */
function formDataToObject(formData: FormData): Record<string, FormDataEntryValue> {
  const obj: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) {
    obj[key] = value;
  }
  return obj;
}

/**
 * Strict parser — throws FormValidationError if invalid. Use in actions
 * that already throw (no `useFormState`).
 */
export function parseFormDataWith<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
): z.infer<T> {
  const result = schema.safeParse(formDataToObject(formData));
  if (!result.success) {
    throw new FormValidationError(result.error.issues);
  }
  return result.data;
}

/**
 * Lenient parser — returns `{ ok: false, error }` on failure.
 * Use in actions paired with `useFormState`/`useActionState`.
 */
export function safeParseFormData<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
):
  | { ok: true; data: z.infer<T> }
  | { ok: false; error: string; issues: z.ZodIssue[] } {
  const result = schema.safeParse(formDataToObject(formData));
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      ok: false,
      error: first ? first.message : "Invalid form data",
      issues: result.error.issues,
    };
  }
  return { ok: true, data: result.data };
}

// ---------------------------------------------------------------
// FormData-specific schemas (coerce / preprocess from FormDataEntryValue).
// ---------------------------------------------------------------

/** Coerces FormDataEntryValue into a trimmed string ("" for null/file). */
const fdString = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : ""),
  z.string(),
);

/** Coerces "on" / "true" / "1" into a boolean. */
const fdCheckbox = z.preprocess(
  (v) => v === "true" || v === "on" || v === true || v === "1",
  z.boolean(),
);

/** Coerces a FormData entry into a number, or NaN if not numeric. */
const fdNumber = z.preprocess(
  (v) => {
    if (v === undefined || v === null || v === "") return Number.NaN;
    const n = Number(v);
    return Number.isFinite(n) ? n : Number.NaN;
  },
  z.number(),
);

// Helper builders --------------------------------------------------------
const fdId = (label = "id") =>
  fdString.pipe(z.string().min(1, `Invalid ${label}`));
const fdText = (max: number, label = "field") =>
  fdString.pipe(
    z.string().min(1, `${label} is required`).max(max, `${label} is too long`),
  );
const fdOptionalText = (max: number) =>
  fdString.pipe(z.string().max(max, "Field is too long"));

// ---------- Generic small schemas ----------

/** Single non-empty id. */
export const idFormSchema = z.object({ id: fdId("id") });

export const targetIdFormSchema = z.object({ targetId: fdId("user") });

export const followFormSchema = z.object({ targetId: fdId("user") });

export const friendshipIdFormSchema = z.object({
  friendshipId: fdId("request"),
});

export const friendIdFormSchema = z.object({ friendId: fdId("friend") });

// ---------- Block ----------
export const blockUserFormSchema = z.object({
  blockedId: fdId("user"),
  reason: fdOptionalText(500),
});

export const unblockUserFormSchema = z.object({
  blockedId: fdId("user"),
});

// ---------- Admin ----------
export const adminBanUserSchema = z.object({
  userId: fdId("user"),
  reason: fdOptionalText(500),
  durationHours: fdNumber.pipe(
    z.number().int().min(0).max(24 * 365),
  ).or(z.literal(Number.NaN).transform(() => 0)),
});

export const adminUnbanUserSchema = z.object({ userId: fdId("user") });

export const adminChangeUserRoleSchema = z.object({
  userId: fdId("user"),
  role: fdString.pipe(z.enum(["user", "moderator", "admin"])),
});

export const adminBookRequestStatusSchema = z.object({
  id: fdId("id"),
  status: fdString.pipe(
    z.enum(["pending", "reviewed", "completed", "rejected", "cancelled"]),
  ),
});

// ---------- Lost & Found ----------
export const lostFoundCreateSchema = z.object({
  title: fdText(200, "Title"),
  type: fdString.pipe(z.enum(["lost", "found"])),
  description: fdOptionalText(1000),
  location: fdText(200, "Location"),
  contact: fdOptionalText(200),
  communityId: fdOptionalText(80),
  itemDate: fdOptionalText(40),
});

export const lostFoundUpdateStatusSchema = z.object({
  itemId: fdId("item"),
  status: fdString.pipe(z.enum(["open", "returned", "expired"])),
});

export const lostFoundDeleteSchema = z.object({ itemId: fdId("item") });

// ---------- Messages ----------
export const sendMessageSchema = z
  .object({
    receiverId: fdOptionalText(80),
    groupChatId: fdOptionalText(80),
    content: fdOptionalText(2000),
  })
  .superRefine((val, ctx) => {
    if (!val.receiverId && !val.groupChatId) {
      ctx.addIssue({
        code: "custom",
        message: "Either receiverId or groupChatId is required",
        path: ["receiverId"],
      });
    }
  });

export const editMessageSchema = z.object({
  messageId: fdId("message"),
  content: fdText(2000, "Message"),
});

export const deleteMessageSchema = z.object({
  messageId: fdId("message"),
  forEveryone: fdOptionalText(10),
});

export const markThreadReadSchema = z
  .object({
    userId: fdOptionalText(80),
    groupId: fdOptionalText(80),
  })
  .superRefine((val, ctx) => {
    if (!val.userId && !val.groupId) {
      ctx.addIssue({
        code: "custom",
        message: "Either userId or groupId is required",
        path: ["userId"],
      });
    }
  });

export const broadcastTypingSchema = z.object({
  userId: fdOptionalText(80),
  groupId: fdOptionalText(80),
  isTyping: fdOptionalText(10),
});

// ---------- Story ----------
export const createStoryFormSchema = z.object({
  caption: fdOptionalText(240),
  location: fdOptionalText(120),
});

export const storyIdSchema = z.object({ storyId: fdId("story") });

// ---------- Notifications ----------
export const markNotificationReadSchema = z.object({
  notificationId: fdId("notification"),
});

const fdPref = z.preprocess(
  (v) => v === "on" || v === "true" || v === true,
  z.boolean(),
);
export const notificationPreferencesSchema = z.object({
  academic: fdPref,
  events: fdPref,
  photos: fdPref,
  messages: fdPref,
  materials: fdPref,
  social: fdPref,
});

// ---------- Onboarding ----------
export const onboardingSchema = z.object({
  faculty: fdText(100, "Faculty"),
  program: fdOptionalText(100),
  year: fdText(20, "Year"),
  courses: fdOptionalText(1000), // comma-separated course names/ids
  studyGroup: fdOptionalText(40),
  gender: fdString.transform((v) => v || undefined).pipe(
    z.enum(["male", "female", "other", "prefer_not_to_say"]).optional()
  ),
  relationshipStatus: fdString.transform((v) => v || undefined).pipe(
    z.enum(["single", "in_relationship", "complicated", "prefer_not_to_say"]).optional()
  ),
  birthDate: fdString.refine(
    (d) => !d || new Date(d) <= new Date(),
    "Birth date cannot be in the future",
  ),
  interests: fdOptionalText(500),
  languages: fdOptionalText(200),
  lookingFor: fdOptionalText(200),
});

// ---------- Community ----------
export const createCommunityFormSchema = z.object({
  name: fdText(80, "Name").pipe(z.string().min(3, "Name is too short")),
  description: fdOptionalText(500),
  rules: fdOptionalText(2000),
  facultyTag: fdOptionalText(80),
  yearTag: fdOptionalText(20),
  interests: fdOptionalText(240),
  isPrivate: fdCheckbox.optional(),
});

export const updateCommunityFormSchema = z.object({
  communityId: fdId("community"),
  name: fdOptionalText(80),
  description: fdOptionalText(500),
  rules: fdOptionalText(2000),
  facultyTag: fdOptionalText(80),
  yearTag: fdOptionalText(20),
  interests: fdOptionalText(240),
  isPrivate: fdOptionalText(10),
});

export const communityIdSchema = z.object({ communityId: fdId("community") });

export const joinCommunitySchema = z.object({
  communityId: fdId("community"),
  message: fdOptionalText(500),
});

export const joinRequestSchema = z.object({ requestId: fdId("request") });

export const setMemberRoleSchema = z.object({
  communityId: fdId("community"),
  targetUserId: fdId("user"),
  role: fdString.pipe(z.enum(["member", "moderator", "admin"])),
});

export const removeMemberSchema = z.object({
  communityId: fdId("community"),
  targetUserId: fdId("user"),
});

export const communityPostCreateSchema = z.object({
  communityId: fdId("community"),
  content: fdOptionalText(3000),
  tags: fdOptionalText(200),
  postType: fdOptionalText(40),
});

export const communityPostIdSchema = z.object({ postId: fdId("post") });

export const markQuestionSolvedSchema = z.object({
  postId: fdId("post"),
  bestCommentId: fdOptionalText(80),
});

// ---------- Group Chats ----------
export const createGroupChatSchema = z.object({
  name: fdText(120, "Group name"),
  description: fdOptionalText(500),
  faculty: fdOptionalText(120),
  course: fdOptionalText(120),
});

export const updateGroupChatSchema = z.object({
  groupChatId: fdId("group"),
  name: fdOptionalText(120),
  description: fdOptionalText(500),
  faculty: fdOptionalText(120),
  course: fdOptionalText(120),
});

export const groupChatIdSchema = z.object({ groupChatId: fdId("group") });

export const groupChatMemberSchema = z.object({
  groupChatId: fdId("group"),
  userId: fdId("user"),
});

export const setGroupMemberRoleSchema = z.object({
  groupChatId: fdId("group"),
  userId: fdId("user"),
  role: fdString.pipe(z.enum(["admin", "moderator", "member"])),
});

export const sendGroupMessageSchema = z.object({
  groupChatId: fdId("group"),
  content: fdText(2000, "Message"),
});

// ---------- Study Groups ----------
export const createStudyGroupSchema = z.object({
  title: fdText(200, "Title"),
  subject: fdOptionalText(120),
  faculty: fdOptionalText(120),
  description: fdOptionalText(1000),
  meetingDay: fdOptionalText(50),
  meetingTime: fdOptionalText(20),
  location: fdOptionalText(200),
  onlineLink: fdOptionalText(500),
  maxMembers: fdNumber.pipe(z.number().int().min(2).max(500)).or(
    fdString.pipe(z.literal("").transform(() => 10)),
  ),
  communityId: fdOptionalText(80),
});

export const studyGroupIdSchema = z.object({ groupId: fdId("group") });

export const studyGroupStatusSchema = z.object({
  groupId: fdId("group"),
  status: fdString.pipe(z.enum(["active", "completed", "cancelled"])),
});

// ---------- Schedule ----------
export const createScheduleEntrySchema = z.object({
  courseName: fdText(200, "Course"),
  courseCode: fdOptionalText(40),
  instructor: fdOptionalText(120),
  room: fdOptionalText(80),
  dayOfWeek: fdNumber.pipe(z.number().int().min(0).max(6)),
  startTime: fdString.pipe(z.string().regex(/^\d{2}:\d{2}$/, "Invalid time")),
  endTime: fdString.pipe(z.string().regex(/^\d{2}:\d{2}$/, "Invalid time")),
  faculty: fdOptionalText(100),
  semester: fdOptionalText(40),
  isPublic: fdCheckbox.optional(),
});

export const scheduleEntryIdSchema = z.object({ entryId: fdId("entry") });

// ---------- Report ----------
export const reportContentSchema = z
  .object({
    reportedUserId: fdOptionalText(80),
    postId: fdOptionalText(80),
    commentId: fdOptionalText(80),
    reason: fdString.pipe(
      z.enum([
        "spam",
        "harassment",
        "inappropriate_content",
        "hate_speech",
        "violence",
        "misinformation",
        "other",
      ]),
    ),
    description: fdOptionalText(500),
  })
  .superRefine((val, ctx) => {
    if (!val.reportedUserId && !val.postId && !val.commentId) {
      ctx.addIssue({
        code: "custom",
        message: "At least one target is required",
        path: ["reportedUserId"],
      });
    }
  });

export const updateReportStatusSchema = z.object({
  reportId: fdId("report"),
  status: fdString.pipe(
    z.enum(["pending", "reviewed", "resolved", "dismissed"]),
  ),
});

// ---------- Library ----------
export const suggestResourceSchema = z.object({
  title: fdText(200, "Title"),
  type: fdString.pipe(z.string().min(1, "Type is required")),
  locationOrLink: fdOptionalText(500),
  faculty: fdText(120, "Faculty"),
  subject: fdText(120, "Subject"),
  description: fdOptionalText(1000),
});

export const requestBookSchema = z.object({
  title: fdText(200, "Title"),
  author: fdOptionalText(200),
  subject: fdText(120, "Subject"),
  faculty: fdText(120, "Faculty"),
  reason: fdText(1000, "Reason"),
  urgency: fdString
    .pipe(z.enum(["low", "medium", "high"]))
    .or(fdString.pipe(z.literal("").transform(() => "medium" as const))),
  link: fdOptionalText(500),
});

// ---------- Photos ----------
export const photoIdFormSchema = z.object({ photoId: fdId("photo") });

export const photoAlbumIdFormSchema = z.object({ albumId: fdId("album") });

export const commentIdFormSchema = z.object({ commentId: fdId("comment") });

export const createPhotoAlbumSchema = z.object({
  title: fdText(120, "Title"),
  description: fdOptionalText(400),
  category: fdOptionalText(40),
  eventDate: fdOptionalText(40),
  eventId: fdOptionalText(80),
  isPrivate: fdCheckbox.optional(),
});

export const commentPhotoSchema = z.object({
  photoId: fdId("photo"),
  content: fdText(500, "Comment"),
  parentId: fdOptionalText(80),
});

export const reportPhotoCommentSchema = z.object({
  commentId: fdId("comment"),
  reason: fdOptionalText(80),
  description: fdOptionalText(500),
});

export const tagUserFormSchema = z.object({
  photoId: fdId("photo"),
  taggedUserId: fdId("user"),
});

export const respondToPhotoTagSchema = z.object({
  tagId: fdId("tag"),
  action: fdString.pipe(z.enum(["approve", "reject"])),
});

export const reportPhotoSchema = z.object({
  photoId: fdId("photo"),
  reason: fdText(80, "Reason"),
  description: fdOptionalText(500),
});

export const moderatePhotoSchema = z.object({
  photoId: fdId("photo"),
  status: fdString.pipe(z.string().min(1, "Status is required")),
});

export const createPhotoPostSchema = z.object({
  caption: fdOptionalText(2200),
  location: fdOptionalText(120),
  isPrivate: fdCheckbox.optional(),
  albumId: fdOptionalText(80),
  eventId: fdOptionalText(80),
  taggedUserIds: fdOptionalText(2000),
});

// ---------- Interactions (post comments / likes) ----------
export const postIdFormSchema = z.object({ postId: fdId("post") });

export const addCommentFormSchema = z.object({
  postId: fdId("post"),
  content: fdText(1000, "Comment"),
  parentId: fdOptionalText(80),
});
