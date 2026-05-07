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
  bio: text("bio"),
  image: text("image"),
  coverImage: text("cover_image"),
  avatarUrl: text("avatar_url"),
  gender: genderEnum("gender"),
  relationshipStatus: relationshipStatusEnum("relationship_status"),
  birthDate: timestamp("birth_date", { mode: "date" }),
  privacyLevel: privacyLevelEnum("privacy_level").default("public").notNull(),
  role: userRoleEnum("role").default("user").notNull(),
  lastSeenAt: timestamp("last_seen_at"),
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
  rules: text("rules"),
  avatar: text("avatar"),
  creatorId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isPrivate: boolean("is_private").default(false).notNull(),
  facultyTag: text("faculty_tag"),
  yearTag: text("year_tag"),
  interests: text("interests"), // comma-separated keywords
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index("community_creator_idx").on(table.creatorId),
  nameIdx: index("community_name_idx").on(table.name),
  facultyIdx: index("community_faculty_idx").on(table.facultyTag),
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
}));

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
  caption: text("caption"),
  location: text("location"),
  isPrivate: boolean("is_private").default(false).notNull(),
  moderationStatus: photoModerationStatusEnum("moderation_status").default("approved").notNull(),
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
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  photoIdx: index("photo_comment_photo_idx").on(table.photoId),
  userIdx: index("photo_comment_user_idx").on(table.userId),
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
  year: text("year"),
  subject: text("subject"),
  professorCourse: text("professor_course"),
  topicTags: text("topic_tags"),
  visibility: materialVisibilityEnum("visibility").default("all").notNull(),
  status: materialStatusEnum("status").default("pending").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  downloadsCount: integer("downloads_count").default(0).notNull(),
  helpfulCount: integer("helpful_count").default(0).notNull(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  facultyIdx: index("study_material_faculty_idx").on(table.faculty),
  subjectIdx: index("study_material_subject_idx").on(table.subject),
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
});

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const reports = pgTable("report", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  reporterId: text("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportedUserId: text("reported_user_id").references(() => users.id, { onDelete: "cascade" }),
  postId: text("post_id").references(() => posts.id, { onDelete: "cascade" }),
  commentId: text("comment_id").references(() => comments.id, { onDelete: "cascade" }),
  photoId: text("photo_id").references(() => photos.id, { onDelete: "cascade" }),
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