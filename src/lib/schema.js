import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// Users Table
export const users = pgTable("user", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("fullName").notNull(),
  faculty: text("faculty"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Posts Table
export const posts = pgTable("post", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  content: text("content").notNull(),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // Foreign Key
  likesCount: integer("likes_count").default(0).notNull(), // Prepared for future
  commentsCount: integer("comments_count").default(0).notNull(), // Prepared for future
  createdAt: timestamp("created_at").defaultNow().notNull(),
});