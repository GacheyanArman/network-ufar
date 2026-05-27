import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const friendStatusEnum = pgEnum("friend_status", ["pending", "accepted"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "like",
  "comment",
  "friend_request",
  "friend_accept",
  "message",
  "reminder",
  "material_approved",
  "photo_approved",
  "event_new",
  "deadline",
  "group_join",
]);
export const genderEnum = pgEnum("gender", [
  "male",
  "female",
  "other",
  "prefer_not_to_say",
]);
export const relationshipStatusEnum = pgEnum("relationship_status", [
  "single",
  "in_relationship",
  "complicated",
  "prefer_not_to_say",
]);
export const privacyLevelEnum = pgEnum("privacy_level", [
  "public",
  "friends",
  "private",
]);
export const reportReasonEnum = pgEnum("report_reason", [
  "spam",
  "harassment",
  "inappropriate_content",
  "hate_speech",
  "violence",
  "misinformation",
  "other",
]);
export const reportStatusEnum = pgEnum("report_status", [
  "pending",
  "reviewed",
  "resolved",
  "dismissed",
]);
// Event categories. Legacy values (`party`, `cultural`) are kept so old rows
// keep working; the UI maps them to the new "social" bucket.
export const eventTypeEnum = pgEnum("event_type", [
  "party",
  "academic",
  "sports",
  "cultural",
  "workshop",
  "other",
  // New categories
  "club",
  "career",
  "social",
  "exam",
]);
// RSVP states. `waitlisted` is set automatically when an event is full and the
// user tries to RSVP "going".
export const rsvpStatusEnum = pgEnum("rsvp_status", [
  "going",
  "interested",
  "not_going",
  "waitlisted",
]);
export const eventStatusEnum = pgEnum("event_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);
export const communityStatusEnum = pgEnum("community_status", [
  "pending",
  "approved",
  "rejected",
]);
export const auditActionEnum = pgEnum("audit_action", [
  "approve_material",
  "reject_material",
  "approve_photo",
  "reject_photo",
  "approve_event",
  "reject_event",
  "approve_community",
  "reject_community",
  "resolve_report",
  "dismiss_report",
  "ban_user",
  "unban_user",
  "change_role",
  "delete_post",
  "delete_comment",
  "delete_photo",
  "delete_material",
  "delete_event",
  "delete_community",
  "soft_delete",
  "restore",
  "password_reset",
  "update_book_request",
]);
// `calendar_event_type` is the *category* — controls colour/icon/filtering in
// the calendar UI. `assignment` is kept as an alias of `homework` for backward
// compatibility with rows already in the DB.
export const calendarEventTypeEnum = pgEnum("calendar_event_type", [
  "exam",
  "homework",
  "assignment", // legacy alias for homework
  "project",
  "event",
  "personal",
  "community",
  "lecture",
  "holiday",
  "deadline",
  "other",
]);

// Repeat rule for recurring entries. We store the rule on the master row and
// "expand" virtual occurrences at read-time (no row explosion in the DB).
export const calendarRecurrenceEnum = pgEnum("calendar_recurrence", [
  "none",
  "daily",
  "weekly",
  "monthly",
]);
export const libraryResourceTypeEnum = pgEnum("library_resource_type", [
  "book",
  "ebook",
  "article",
  "guide",
  "reading_list",
  "website_link",
  "database",
  "video_lecture",
  "official_document",
  "erasmus_resource",
  "language_resource",
  "other",
]);
export const libraryResourceStatusEnum = pgEnum("library_resource_status", [
  "pending",
  "approved",
  "rejected",
]);
export const libraryAvailabilityEnum = pgEnum("library_availability", [
  "available_in_library",
  "digital_access",
  "external_link",
  "request_needed",
  "coming_soon",
  "not_available_yet",
]);
export const libraryRequestUrgencyEnum = pgEnum("library_request_urgency", [
  "low",
  "medium",
  "high",
]);
export const libraryRequestStatusEnum = pgEnum("library_request_status", [
  "pending",
  "reviewed",
  "completed",
  "rejected",
]);
export const materialTypeEnum = pgEnum("material_type", [
  "lecture_notes",
  "summary",
  "slides",
  "past_questions",
  "exam_prep",
  "formula_sheet",
  "template",
  "case_study",
  "project_example",
  "cheat_sheet",
  "language_practice",
  "useful_link",
  "other",
]);
export const materialVisibilityEnum = pgEnum("material_visibility", [
  "all",
  "faculty",
  "year",
  "community",
]);
export const materialStatusEnum = pgEnum("material_status", [
  "pending",
  "approved",
  "rejected",
]);
export const materialUrgencyEnum = pgEnum("material_urgency", [
  "low",
  "medium",
  "high",
]);

export const userRoleEnum = pgEnum("user_role", [
  "user",
  "moderator",
  "admin",
]);

// CORE ENTITY: Users
export const users = pgTable("user", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("fullName").notNull(),

  // Only the boolean flag stays in the core table
  emailVerified: boolean("email_verified").default(false).notNull(),

  username: text("username").unique(),
  faculty: text("faculty"),
  year: text("study_year"),
  studyGroup: text("study_group"),
  interests: text("interests"),
  languages: text("languages"),
  lookingFor: text("looking_for"),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  bio: text("bio"),
  image: text("image"),
  coverImage: text("cover_image"),
  avatarUrl: text("avatar_url"),
  gender: genderEnum("gender"),
  relationshipStatus: relationshipStatusEnum("relationship_status"),
  birthDate: timestamp("birth_date", { mode: "date" }),
  privacyLevel: privacyLevelEnum("privacy_level").default("public").notNull(),
  role: userRoleEnum("role").default("user").notNull(),
  isBanned: boolean("is_banned").default(false).notNull(),
  bannedAt: timestamp("banned_at"),
  banReason: text("ban_reason"),
  banExpiresAt: timestamp("ban_expires_at"),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- COURSE HUB ENTITIES ---

export const faculties = pgTable("faculty", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const programs = pgTable("program", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  facultyId: text("faculty_id").notNull().references(() => faculties.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code"),
  degreeLevel: text("degree_level"), // e.g., "Bachelor", "Master"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  facultyIdx: index("program_faculty_idx").on(table.facultyId),
}));

export const semesters = pgTable("semester", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(), // e.g., "Fall 2026"
  year: integer("year").notNull(),
  season: text("season").notNull(), // "Fall", "Spring", "Summer"
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const courses = pgTable("course", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  facultyId: text("faculty_id").references(() => faculties.id, { onDelete: "set null" }),
  programId: text("program_id").references(() => programs.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  credits: integer("credits"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  facultyIdx: index("course_faculty_idx").on(table.facultyId),
  programIdx: index("course_program_idx").on(table.programId),
}));

export const courseEnrollmentRoleEnum = pgEnum("course_enrollment_role", [
  "student",
  "ta",
  "professor"
]);

export const courseEnrollments = pgTable("course_enrollment", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  semesterId: text("semester_id").notNull().references(() => semesters.id, { onDelete: "cascade" }),
  role: courseEnrollmentRoleEnum("role").default("student").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueEnrollmentIdx: uniqueIndex("course_enrollment_unique_idx").on(table.userId, table.courseId, table.semesterId),
  userIdx: index("course_enrollment_user_idx").on(table.userId),
  courseIdx: index("course_enrollment_course_idx").on(table.courseId),
}));

// ---------------------------

// TRANSIENT ENTITY: OTP Codes
export const emailVerifications = pgTable("email_verification", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// The rest of your schema remains the same
export const communities = pgTable("community", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  rules: text("rules"),
  avatar: text("avatar"),
  creatorId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isPrivate: boolean("is_private").default(false).notNull(),
  facultyTag: text("faculty_tag"),
  yearTag: text("year_tag"),
  interests: text("interests"), // comma-separated keywords
  status: communityStatusEnum("status").default("approved").notNull(),
  reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index("community_creator_idx").on(table.creatorId),
  nameIdx: index("community_name_idx").on(table.name),
  facultyIdx: index("community_faculty_idx").on(table.facultyTag),
  statusIdx: index("community_status_idx").on(table.status),
}));

// role values: "owner" (singular per community = creator), "moderator", "member"
export const communityMembers = pgTable("community_member", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  communityId: text("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueIdx: uniqueIndex("community_member_unique_idx").on(table.communityId, table.userId),
  communityIdx: index("community_member_community_idx").on(table.communityId),
  userIdx: index("community_member_user_idx").on(table.userId),
}));

export const communityJoinRequestStatusEnum = pgEnum("community_join_request_status", [
  "pending",
  "approved",
  "rejected",
]);

export const communityJoinRequests = pgTable("community_join_request", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  communityId: text("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message"),
  status: communityJoinRequestStatusEnum("status").default("pending").notNull(),
  decidedBy: text("decided_by").references(() => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueIdx: uniqueIndex("community_join_request_unique_idx").on(table.communityId, table.userId),
  statusIdx: index("community_join_request_status_idx").on(table.status),
}));

export const friendships = pgTable("friendship", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  requesterId: text("user_id_1").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: text("user_id_2").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: friendStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userFollows = pgTable("user_follow", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  followerId: text("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: text("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  unq: uniqueIndex("user_follow_unique_idx").on(table.followerId, table.followingId),
}));

export const blockedUsers = pgTable("blocked_user", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  blockerId: text("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  blockedId: text("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueBlockIdx: uniqueIndex("blocked_user_unique_idx").on(table.blockerId, table.blockedId),
}));

export const messageStatusEnum = pgEnum("message_status", [
  "sent",
  "delivered",
  "seen",
]);

export const messages = pgTable("message", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  senderId: text("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: text("receiver_id").references(() => users.id, { onDelete: "cascade" }),
  groupChatId: text("group_chat_id").references(() => groupChats.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type"), // "image" | "file"
  status: messageStatusEnum("status").default("sent").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
  deletedForEveryone: boolean("deleted_for_everyone").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  receiverIdx: index("message_receiver_idx").on(table.receiverId),
  senderIdx: index("message_sender_idx").on(table.senderId),
  groupIdx: index("message_group_idx").on(table.groupChatId),
  createdAtIdx: index("message_created_at_idx").on(table.createdAt),
  // Critical: unread count query — filter by receiverId + isRead
  receiverUnreadIdx: index("message_receiver_unread_idx").on(table.receiverId, table.isRead),
  // Soft-delete filter: exclude deletedAt IS NOT NULL
  deletedAtIdx: index("message_deleted_at_idx").on(table.deletedAt),
}));

export const groupChats = pgTable("group_chat", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  avatar: text("avatar"),
  faculty: text("faculty"),
  course: text("course"),
  creatorId: text("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  facultyIdx: index("group_chat_faculty_idx").on(table.faculty),
  courseIdx: index("group_chat_course_idx").on(table.course),
}));

export const groupChatMembers = pgTable("group_chat_member", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  groupChatId: text("group_chat_id").notNull().references(() => groupChats.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(), // admin, moderator, member
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => ({
  uniqueMemberIdx: uniqueIndex("group_chat_member_unique_idx").on(table.groupChatId, table.userId),
}));

// Per-user read receipts (used both for group chats and 1:1 to track "seen" timestamp).
export const messageReads = pgTable("message_read", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  messageId: text("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").defaultNow().notNull(),
}, (table) => ({
  uniqueReadIdx: uniqueIndex("message_read_unique_idx").on(table.messageId, table.userId),
  userIdx: index("message_read_user_idx").on(table.userId),
}));

export const posts = pgTable("post", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  communityId: text("community_id").references(() => communities.id, { onDelete: "cascade" }),
  courseId: text("course_id").references(() => courses.id, { onDelete: "cascade" }),
  tags: text("tags"),
  postType: text("post_type").default("discussion").notNull(),
  // discussion, question, study_group, material, event, announcement
  isPinned: boolean("is_pinned").default(false).notNull(),
  pinnedAt: timestamp("pinned_at"),
  pinnedBy: text("pinned_by").references(() => users.id, { onDelete: "set null" }),
  // For postType = "question":
  isSolved: boolean("is_solved").default(false).notNull(),
  bestCommentId: text("best_comment_id"),
  solvedAt: timestamp("solved_at"),
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  communityTypeIdx: index("post_community_type_idx").on(table.communityId, table.postType),
  communityPinnedIdx: index("post_community_pinned_idx").on(table.communityId, table.isPinned),
  courseIdx: index("post_course_idx").on(table.courseId),
  // Performance: feed queries always sort by createdAt DESC
  createdAtIdx: index("post_created_at_idx").on(table.createdAt),
  authorCreatedIdx: index("post_author_created_at_idx").on(table.authorId, table.createdAt),
}));

export const postLikes = pgTable("post_like", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const postSaves = pgTable("post_save", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  postUserUnique: uniqueIndex("post_save_post_user_unique").on(table.postId, table.userId),
  postIdx: index("post_save_post_idx").on(table.postId),
  userIdx: index("post_save_user_idx").on(table.userId),
}));

export const comments = pgTable("comment", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Instagram-style threading: a reply points at the comment it replies to.
  parentId: text("parent_comment_id"),
  content: text("content").notNull(),
  likesCount: integer("likes_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  postIdx: index("comment_post_idx").on(table.postId),
  parentIdx: index("comment_parent_idx").on(table.parentId),
}));

export const commentLikes = pgTable("comment_like", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  commentId: text("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  commentUserUnique: uniqueIndex("comment_like_comment_user_unique").on(table.commentId, table.userId),
  commentIdx: index("comment_like_comment_idx").on(table.commentId),
}));

export const notifications = pgTable("notification", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  type: notificationTypeEnum("type").notNull(),
  category: text("category").notNull().default("social"),
  entityId: text("entity_id"),
  postId: text("post_id").references(() => posts.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Critical: unread badge COUNT query — userId + isRead compound
  userReadIdx: index("notification_user_read_idx").on(table.userId, table.isRead),
  // Notification list sorted by time
  userCreatedAtIdx: index("notification_user_created_at_idx").on(table.userId, table.createdAt),
}));

export const notificationPreferences = pgTable("notification_preference", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  academic: boolean("academic").default(true).notNull(),
  events: boolean("events").default(true).notNull(),
  photos: boolean("photos").default(true).notNull(),
  messages: boolean("messages").default(true).notNull(),
  materials: boolean("materials").default(true).notNull(),
  social: boolean("social").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const albumCategoryEnum = pgEnum("album_category", [
  "events",
  "clubs",
  "student_life",
  "sports",
  "academic",
  "parties",
  "erasmus",
  "graduation",
  "freshmen",
  "other",
]);

export const photoModerationStatusEnum = pgEnum("photo_moderation_status", [
  "pending",
  "approved",
  "rejected",
]);

export const photoTagStatusEnum = pgEnum("photo_tag_status", [
  "pending",
  "approved",
  "rejected",
]);

export const photoAlbums = pgTable("photo_album", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: albumCategoryEnum("category").default("other"),
  eventDate: timestamp("event_date", { mode: "date" }),
  coverPhotoUrl: text("cover_photo_url"),
  isPrivate: boolean("is_private").default(false).notNull(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventId: text("event_id").references(() => events.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  eventIdx: index("photo_album_event_idx").on(table.eventId),
}));

export const photos = pgTable("photo", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  mediumUrl: text("medium_url"),
  width: integer("width"),
  height: integer("height"),
  caption: text("caption"),
  location: text("location"),
  isPrivate: boolean("is_private").default(false).notNull(),
  moderationStatus: photoModerationStatusEnum("moderation_status").default("pending").notNull(),
  moderatedBy: text("moderated_by").references(() => users.id, { onDelete: "set null" }),
  moderatedAt: timestamp("moderated_at"),
  viewCount: integer("view_count").default(0).notNull(),
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  albumId: text("album_id").references(() => photoAlbums.id, { onDelete: "set null" }),
  eventId: text("event_id").references(() => events.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  ownerIdx: index("photo_owner_idx").on(table.ownerId),
  albumIdx: index("photo_album_idx").on(table.albumId),
  moderationIdx: index("photo_moderation_idx").on(table.moderationStatus),
  eventIdx: index("photo_event_idx").on(table.eventId),
  createdAtIdx: index("photo_created_at_idx").on(table.createdAt),
}));

export const photoLikes = pgTable("photo_like", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  photoId: text("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  photoUserUnique: uniqueIndex("photo_like_photo_user_unique").on(table.photoId, table.userId),
  photoIdx: index("photo_like_photo_idx").on(table.photoId),
  userIdx: index("photo_like_user_idx").on(table.userId),
}));

export const photoSaves = pgTable("photo_save", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  photoId: text("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  photoUserUnique: uniqueIndex("photo_save_photo_user_unique").on(table.photoId, table.userId),
  photoIdx: index("photo_save_photo_idx").on(table.photoId),
  userIdx: index("photo_save_user_idx").on(table.userId),
}));

export const photoTags = pgTable("photo_tag", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  photoId: text("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taggedBy: text("tagged_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: photoTagStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  photoUserUnique: uniqueIndex("photo_tag_photo_user_unique").on(table.photoId, table.userId),
  photoIdx: index("photo_tag_photo_idx").on(table.photoId),
  userIdx: index("photo_tag_user_idx").on(table.userId),
}));

export const photoComments = pgTable("photo_comment", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  photoId: text("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: text("parent_comment_id"),
  content: text("content").notNull(),
  likesCount: integer("likes_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  photoIdx: index("photo_comment_photo_idx").on(table.photoId),
  userIdx: index("photo_comment_user_idx").on(table.userId),
  parentIdx: index("photo_comment_parent_idx").on(table.parentId),
}));

export const photoCommentLikes = pgTable("photo_comment_like", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  commentId: text("comment_id").notNull().references(() => photoComments.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  commentUserUnique: uniqueIndex("photo_comment_like_comment_user_unique").on(table.commentId, table.userId),
  commentIdx: index("photo_comment_like_comment_idx").on(table.commentId),
}));

export const hashtags = pgTable("hashtag", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  tag: text("tag").notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tagUnique: uniqueIndex("hashtag_tag_unique").on(table.tag),
  usageIdx: index("hashtag_usage_idx").on(table.usageCount),
}));

export const photoHashtags = pgTable("photo_hashtag", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  photoId: text("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
  hashtagId: text("hashtag_id").notNull().references(() => hashtags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  photoHashtagUnique: uniqueIndex("photo_hashtag_unique").on(table.photoId, table.hashtagId),
  photoIdx: index("photo_hashtag_photo_idx").on(table.photoId),
  hashtagIdx: index("photo_hashtag_hashtag_idx").on(table.hashtagId),
}));

export const stories = pgTable("story", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  location: text("location"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  ownerIdx: index("story_owner_idx").on(table.ownerId),
  expiresIdx: index("story_expires_idx").on(table.expiresAt),
}));

export const storyViews = pgTable("story_view", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  storyId: text("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  viewerId: text("viewer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  storyViewerUnique: uniqueIndex("story_view_unique").on(table.storyId, table.viewerId),
  storyIdx: index("story_view_story_idx").on(table.storyId),
  viewerIdx: index("story_view_viewer_idx").on(table.viewerId),
}));

export const studyMaterials = pgTable("study_material", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url"),
  type: materialTypeEnum("type").default("other").notNull(),
  faculty: text("faculty"),
  // `course` is kept distinct from `year` so we can filter by both
  // (e.g. "2nd Year" plus a specific course code like "FIN-201").
  course: text("course"),
  courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
  semesterId: text("semester_id").references(() => semesters.id, { onDelete: "set null" }),
  year: text("year"),
  subject: text("subject"),
  professorCourse: text("professor_course"),
  topicTags: text("topic_tags"),
  visibility: materialVisibilityEnum("visibility").default("all").notNull(),
  status: materialStatusEnum("status").default("pending").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  // Counters denormalised onto the row for cheap sorting/listing.
  // They are kept in sync via server actions in increments of 1.
  viewsCount: integer("views_count").default(0).notNull(),
  downloadsCount: integer("downloads_count").default(0).notNull(),
  helpfulCount: integer("helpful_count").default(0).notNull(),
  // Aggregated rating cache. ratingSum / ratingCount = average.
  // We use integer sum (not float average) to avoid drift on updates.
  ratingSum: integer("rating_sum").default(0).notNull(),
  ratingCount: integer("rating_count").default(0).notNull(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  facultyIdx: index("study_material_faculty_idx").on(table.faculty),
  subjectIdx: index("study_material_subject_idx").on(table.subject),
  courseIdx: index("study_material_course_idx").on(table.courseId),
  legacyCourseIdx: index("study_material_legacy_course_idx").on(table.course),
  statusIdx: index("study_material_status_idx").on(table.status),
  // Performance: materials list page sorts by createdAt DESC with status filter
  statusCreatedAtIdx: index("study_material_status_created_at_idx").on(table.status, table.createdAt),
  ownerIdx: index("study_material_owner_idx").on(table.ownerId),
}));

export const studyMaterialSaves = pgTable("study_material_save", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  materialId: text("material_id").notNull().references(() => studyMaterials.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userMaterialSaveIdx: uniqueIndex("study_material_save_unique_idx").on(table.userId, table.materialId),
}));

export const studyMaterialComments = pgTable("study_material_comment", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  materialId: text("material_id").notNull().references(() => studyMaterials.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  materialIdx: index("study_material_comment_material_idx").on(table.materialId),
}));

// 1..5 star ratings. The unique index guarantees one rating per (user, material).
// To "change" a rating the user simply re-rates which we implement as upsert.
export const studyMaterialRatings = pgTable("study_material_rating", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  materialId: text("material_id").notNull().references(() => studyMaterials.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1..5, validated server-side
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserMaterialIdx: uniqueIndex("study_material_rating_unique_idx").on(table.materialId, table.userId),
  materialIdx: index("study_material_rating_material_idx").on(table.materialId),
}));

export const studyMaterialRequests = pgTable("study_material_request", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  faculty: text("faculty"),
  year: text("year"),
  subject: text("subject"),
  materialType: text("material_type"),
  topic: text("topic"),
  professorCourse: text("professor_course"),
  examDate: timestamp("exam_date"),
  description: text("description"),
  urgency: materialUrgencyEnum("urgency").default("medium").notNull(),
  status: materialStatusEnum("status").default("pending").notNull(),
  // How many other students supported this request ("I need this material too").
  // Kept here as a counter; supporters table below has the granular records.
  supportersCount: integer("supporters_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Each row = one student saying "I need this material too" for a given request.
// Unique on (request, user) so a single user can't inflate the counter.
export const studyMaterialRequestSupporters = pgTable("study_material_request_supporter", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  requestId: text("request_id").notNull().references(() => studyMaterialRequests.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueIdx: uniqueIndex("study_material_request_supporter_unique_idx").on(table.requestId, table.userId),
  requestIdx: index("study_material_request_supporter_request_idx").on(table.requestId),
}));


export const reports = pgTable("report", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  reporterId: text("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportedUserId: text("reported_user_id").references(() => users.id, { onDelete: "cascade" }),
  postId: text("post_id").references(() => posts.id, { onDelete: "cascade" }),
  commentId: text("comment_id").references(() => comments.id, { onDelete: "cascade" }),
  photoId: text("photo_id").references(() => photos.id, { onDelete: "cascade" }),
  photoCommentId: text("photo_comment_id").references(() => photoComments.id, { onDelete: "cascade" }),
  reason: reportReasonEnum("reason").notNull(),
  description: text("description"),
  targetType: text("target_type"),
  status: reportStatusEnum("status").default("pending").notNull(),
  reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  reporterIdx: index("report_reporter_idx").on(table.reporterId),
  statusIdx: index("report_status_idx").on(table.status),
  targetTypeIdx: index("report_target_type_idx").on(table.targetType),
}));

export const events = pgTable("event", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  eventType: eventTypeEnum("event_type").notNull(),
  location: text("location"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  // `imageUrl` is kept (legacy callers rely on it). `coverImageUrl` is a new
  // alias used by the rewritten UI; both are populated on create/update.
  imageUrl: text("image_url"),
  coverImageUrl: text("cover_image_url"),
  coverThumbnailUrl: text("cover_thumbnail_url"),
  coverMediumUrl: text("cover_medium_url"),
  organizerId: text("organizer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  communityId: text("community_id").references(() => communities.id, { onDelete: "cascade" }),
  maxAttendees: integer("max_attendees"),
  // Enables an automatic waitlist when `going` is full.
  enableWaitlist: boolean("enable_waitlist").default(true).notNull(),
  // Reminder offsets in minutes (CSV) — same convention as academicCalendar.
  reminderOffsets: text("reminder_offsets"),
  lastReminderSentMinutes: integer("last_reminder_sent_minutes"),
  // Random opaque token used for QR-code check-in URLs. Created lazily on
  // first request so legacy events stay un-mutated.
  qrToken: text("qr_token").unique(),
  isCancelled: boolean("is_cancelled").default(false).notNull(),
  status: eventStatusEnum("status").default("approved").notNull(),
  reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  startTimeIdx: index("event_start_time_idx").on(table.startTime),
  organizerIdx: index("event_organizer_idx").on(table.organizerId),
  communityIdx: index("event_community_idx").on(table.communityId),
  statusIdx: index("event_status_idx").on(table.status),
}));

export const eventRsvps = pgTable("event_rsvp", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: rsvpStatusEnum("status").notNull(),
  // Position in the waitlist queue (1-based) when status = waitlisted.
  // null otherwise.
  waitlistPosition: integer("waitlist_position"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueRsvpIdx: uniqueIndex("event_rsvp_unique_idx").on(table.eventId, table.userId),
  eventStatusIdx: index("event_rsvp_event_status_idx").on(table.eventId, table.status),
}));

// Co-organizers can edit / delete the event and trigger check-ins, just like
// the primary organizer.
export const eventCoOrganizers = pgTable("event_co_organizer", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueIdx: uniqueIndex("event_co_organizer_unique_idx").on(table.eventId, table.userId),
  eventIdx: index("event_co_organizer_event_idx").on(table.eventId),
}));

// One-line public discussion under each event.
export const eventComments = pgTable("event_comment", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  eventIdx: index("event_comment_event_idx").on(table.eventId),
}));

// Each row marks a successful QR check-in for an attendee. Unique per
// (event, user) — re-scanning is a no-op.
export const eventCheckIns = pgTable("event_check_in", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  checkedInAt: timestamp("checked_in_at").defaultNow().notNull(),
}, (table) => ({
  uniqueIdx: uniqueIndex("event_check_in_unique_idx").on(table.eventId, table.userId),
  eventIdx: index("event_check_in_event_idx").on(table.eventId),
}));

// Calendar entry — covers personal deadlines, public academic events,
// community events and recurring entries. `isPublic = false` means private to
// the creator; only the creator (or staff) can edit/delete in that case.
export const academicCalendar = pgTable("academic_calendar", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  eventType: calendarEventTypeEnum("event_type").notNull(),
  // Course/subject text (free-form; e.g. "FIN-201", "Microeconomics").
  course: text("course"),
  // Faculty/community used both for filtering and permissions on public entries.
  faculty: text("faculty"),
  communityId: text("community_id").references(() => communities.id, { onDelete: "set null" }),
  courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
  // For multi-hour or all-day events. If null, treat it as an instant deadline.
  dueDate: timestamp("due_date").notNull(),
  endDate: timestamp("end_date"),
  isAllDay: boolean("is_all_day").default(false).notNull(),
  location: text("location"),
  onlineLink: text("online_link"),
  // Recurrence — stored on the master row only. Occurrences are expanded
  // virtually at read time up to `recurrenceUntil` (nullable = "forever",
  // we cap to ~1 year in code regardless).
  recurrence: calendarRecurrenceEnum("recurrence").default("none").notNull(),
  recurrenceUntil: timestamp("recurrence_until"),
  // Reminder offsets selected by the creator (in minutes before dueDate).
  // Stored as a CSV (e.g. "1440,180,30") to keep the schema tiny — parsed in
  // the server action / cron.
  reminderOffsets: text("reminder_offsets"),
  // Last reminder offset that was already fired. Prevents duplicate sends.
  lastReminderSentMinutes: integer("last_reminder_sent_minutes"),
  createdBy: text("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  dueDateIdx: index("academic_calendar_due_date_idx").on(table.dueDate),
  createdByIdx: index("academic_calendar_created_by_idx").on(table.createdBy),
  facultyIdx: index("academic_calendar_faculty_idx").on(table.faculty),
  communityIdx: index("academic_calendar_community_idx").on(table.communityId),
  courseIdx: index("academic_calendar_course_idx").on(table.courseId),
  eventTypeIdx: index("academic_calendar_event_type_idx").on(table.eventType),
}));

export const schedule = pgTable("schedule", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  courseName: text("course_name").notNull(),
  courseCode: text("course_code"),
  instructor: text("instructor"),
  room: text("room"),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Monday, 6 = Sunday
  startTime: text("start_time").notNull(), // Format: "09:00"
  endTime: text("end_time").notNull(), // Format: "10:30"
  faculty: text("faculty"),
  semester: text("semester"),
  createdBy: text("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  dayOfWeekIdx: index("schedule_day_of_week_idx").on(table.dayOfWeek),
  createdByIdx: index("schedule_created_by_idx").on(table.createdBy),
}));

export const libraryResources = pgTable("library_resource", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  title: text("title").notNull(),
  author: text("author"),
  type: libraryResourceTypeEnum("type").notNull(),
  faculty: text("faculty"),
  subject: text("subject"),
  description: text("description"),
  availability: libraryAvailabilityEnum("availability").default("not_available_yet").notNull(),
  locationOrLink: text("location_or_link"),
  status: libraryResourceStatusEnum("status").default("pending").notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  createdBy: text("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  typeIdx: index("library_resource_type_idx").on(table.type),
  facultyIdx: index("library_resource_faculty_idx").on(table.faculty),
  subjectIdx: index("library_resource_subject_idx").on(table.subject),
  statusIdx: index("library_resource_status_idx").on(table.status),
  createdAtIdx: index("library_resource_created_at_idx").on(table.createdAt),
}));

export const libraryReadingLists = pgTable("library_reading_list", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  faculty: text("faculty"),
  subject: text("subject"),
  professorOrCourse: text("professor_or_course"),
  createdBy: text("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const libraryReadingListItems = pgTable("library_reading_list_item", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  listId: text("list_id").notNull().references(() => libraryReadingLists.id, { onDelete: "cascade" }),
  resourceId: text("resource_id").notNull().references(() => libraryResources.id, { onDelete: "cascade" }),
  priority: text("priority"), // "required", "recommended", "optional"
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  listResourceIdx: uniqueIndex("library_list_resource_unique_idx").on(table.listId, table.resourceId),
}));

export const librarySavedResources = pgTable("library_saved_resource", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  resourceId: text("resource_id").references(() => libraryResources.id, { onDelete: "cascade" }),
  listId: text("list_id").references(() => libraryReadingLists.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userResourceIdx: uniqueIndex("library_saved_resource_unique_idx").on(table.userId, table.resourceId),
  userListIdx: uniqueIndex("library_saved_list_unique_idx").on(table.userId, table.listId),
}));

export const libraryRequests = pgTable("library_request", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  title: text("title").notNull(),
  author: text("author"),
  subject: text("subject").notNull(),
  faculty: text("faculty").notNull(),
  reason: text("reason").notNull(),
  urgency: libraryRequestUrgencyEnum("urgency").default("medium").notNull(),
  link: text("link"),
  status: libraryRequestStatusEnum("status").default("pending").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const studyGroupStatusEnum = pgEnum("study_group_status", [
  "active",
  "completed",
  "cancelled",
]);

export const studyGroups = pgTable("study_group", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  title: text("title").notNull(),
  subject: text("subject"),
  faculty: text("faculty"),
  description: text("description"),
  meetingDay: text("meeting_day"),
  meetingTime: text("meeting_time"),
  location: text("location"),
  onlineLink: text("online_link"),
  maxMembers: integer("max_members").default(10),
  membersCount: integer("members_count").default(1).notNull(),
  status: studyGroupStatusEnum("status").default("active").notNull(),
  communityId: text("community_id").references(() => communities.id, { onDelete: "set null" }),
  courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
  calendarEntryId: text("calendar_entry_id").references(() => academicCalendar.id, { onDelete: "set null" }),
  groupChatId: text("group_chat_id").references(() => groupChats.id, { onDelete: "set null" }),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  ownerIdx: index("study_group_owner_idx").on(table.ownerId),
  subjectIdx: index("study_group_subject_idx").on(table.subject),
  facultyIdx: index("study_group_faculty_idx").on(table.faculty),
  statusIdx: index("study_group_status_idx").on(table.status),
}));

export const studyGroupMembers = pgTable("study_group_member", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  groupId: text("group_id").notNull().references(() => studyGroups.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => ({
  uniqueIdx: uniqueIndex("study_group_member_unique_idx").on(table.groupId, table.userId),
  groupIdx: index("study_group_member_group_idx").on(table.groupId),
}));

export const lostFoundStatusEnum = pgEnum("lost_found_status", [
  "open",
  "returned",
  "expired",
]);

export const lostFoundTypeEnum = pgEnum("lost_found_type", [
  "lost",
  "found",
]);

export const lostFoundItems = pgTable("lost_found_item", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  title: text("title").notNull(),
  type: lostFoundTypeEnum("type").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  itemDate: timestamp("item_date").defaultNow().notNull(),
  imageUrl: text("image_url"),
  contact: text("contact"),
  status: lostFoundStatusEnum("status").default("open").notNull(),
  communityId: text("community_id").references(() => communities.id, { onDelete: "set null" }),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  typeIdx: index("lost_found_type_idx").on(table.type),
  statusIdx: index("lost_found_status_idx").on(table.status),
  ownerIdx: index("lost_found_owner_idx").on(table.ownerId),
  createdAtIdx: index("lost_found_created_at_idx").on(table.createdAt),
}));

export const auditLog = pgTable("audit_log", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  actorId: text("actor_id").notNull().references(() => users.id, { onDelete: "set null" }),
  action: auditActionEnum("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  actorIdx: index("audit_actor_idx").on(table.actorId),
  actionIdx: index("audit_action_idx").on(table.action),
  targetIdx: index("audit_target_idx").on(table.targetId),
  createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
}));

export const passwordResets = pgTable("password_reset", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("password_reset_user_idx").on(table.userId),
  expiresIdx: index("password_reset_expires_idx").on(table.expiresAt),
}));