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

export const messages = pgTable("message", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  senderId: text("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: text("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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