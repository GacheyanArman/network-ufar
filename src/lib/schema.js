import { pgTable, text, timestamp, integer, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const users = pgTable("user", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("fullName").notNull(),

  username: text("username").unique(),
  faculty: text("faculty"),
  bio: text("bio"),
  image: text("image"),
  coverImage: text("cover_image"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const posts = pgTable("post", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  content: text("content").notNull(),
  imageUrl: text("image_url"), 
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const friendships = pgTable(
  "friendship",
  {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    requesterId: text("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    receiverId: text("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: text("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueFriendPair: uniqueIndex("friendship_pair_unique").on(table.requesterId, table.receiverId),
  })
);

export const messages = pgTable("message", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  senderId: text("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: text("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communities = pgTable("community", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
