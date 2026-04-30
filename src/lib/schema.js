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
export const eventTypeEnum = pgEnum("event_type", [
  "party",
  "academic",
  "sports",
  "cultural",
  "workshop",
  "other",
]);
export const rsvpStatusEnum = pgEnum("rsvp_status", [
  "going",
  "interested",
  "not_going",
]);
export const calendarEventTypeEnum = pgEnum("calendar_event_type", [
  "exam",
  "assignment",
  "lecture",
  "holiday",
  "deadline",
  "other",
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
  bio: text("bio"),
  image: text("image"),
  coverImage: text("cover_image"),
  avatarUrl: text("avatar_url"),
  gender: genderEnum("gender"),
  relationshipStatus: relationshipStatusEnum("relationship_status"),
  birthDate: timestamp("birth_date", { mode: "date" }),
  privacyLevel: privacyLevelEnum("privacy_level").default("public").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  avatar: text("avatar"),
  creatorId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index("community_creator_idx").on(table.creatorId),
  nameIdx: index("community_name_idx").on(table.name),
}));

export const communityMembers = pgTable("community_member", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  communityId: text("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

export const messages = pgTable("message", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  senderId: text("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: text("receiver_id").references(() => users.id, { onDelete: "cascade" }),
  groupChatId: text("group_chat_id").references(() => groupChats.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

export const posts = pgTable("post", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  communityId: text("community_id").references(() => communities.id, { onDelete: "cascade" }),
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const postLikes = pgTable("post_like", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comment", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notification", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  type: notificationTypeEnum("type").notNull(),
  entityId: text("entity_id"),
  postId: text("post_id").references(() => posts.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const photoAlbums = pgTable("photo_album", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const photos = pgTable("photo", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  isPrivate: boolean("is_private").default(false).notNull(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  albumId: text("album_id").references(() => photoAlbums.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studyMaterials = pgTable("study_material", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url"),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reports = pgTable("report", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  reporterId: text("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportedUserId: text("reported_user_id").references(() => users.id, { onDelete: "cascade" }),
  postId: text("post_id").references(() => posts.id, { onDelete: "cascade" }),
  commentId: text("comment_id").references(() => comments.id, { onDelete: "cascade" }),
  reason: reportReasonEnum("reason").notNull(),
  description: text("description"),
  status: reportStatusEnum("status").default("pending").notNull(),
  reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  reporterIdx: index("report_reporter_idx").on(table.reporterId),
  statusIdx: index("report_status_idx").on(table.status),
}));

export const events = pgTable("event", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  eventType: eventTypeEnum("event_type").notNull(),
  location: text("location"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  imageUrl: text("image_url"),
  organizerId: text("organizer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  communityId: text("community_id").references(() => communities.id, { onDelete: "cascade" }),
  maxAttendees: integer("max_attendees"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  startTimeIdx: index("event_start_time_idx").on(table.startTime),
  organizerIdx: index("event_organizer_idx").on(table.organizerId),
}));

export const eventRsvps = pgTable("event_rsvp", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: rsvpStatusEnum("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueRsvpIdx: uniqueIndex("event_rsvp_unique_idx").on(table.eventId, table.userId),
}));

export const academicCalendar = pgTable("academic_calendar", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  eventType: calendarEventTypeEnum("event_type").notNull(),
  course: text("course"),
  dueDate: timestamp("due_date").notNull(),
  createdBy: text("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  dueDateIdx: index("academic_calendar_due_date_idx").on(table.dueDate),
  createdByIdx: index("academic_calendar_created_by_idx").on(table.createdBy),
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