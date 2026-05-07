import { pgTable, foreignKey, text, timestamp, index, boolean, integer, unique, uniqueIndex, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const albumCategory = pgEnum("album_category", ['events', 'clubs', 'student_life', 'sports', 'academic', 'parties', 'erasmus', 'graduation', 'freshmen', 'other'])
export const calendarEventType = pgEnum("calendar_event_type", ['exam', 'assignment', 'lecture', 'holiday', 'deadline', 'other'])
export const eventType = pgEnum("event_type", ['party', 'academic', 'sports', 'cultural', 'workshop', 'other'])
export const friendStatus = pgEnum("friend_status", ['pending', 'accepted'])
export const gender = pgEnum("gender", ['male', 'female', 'other', 'prefer_not_to_say'])
export const notificationType = pgEnum("notification_type", ['like', 'comment', 'friend_request'])
export const photoModerationStatus = pgEnum("photo_moderation_status", ['pending', 'approved', 'rejected'])
export const privacyLevel = pgEnum("privacy_level", ['public', 'friends', 'private'])
export const relationshipStatus = pgEnum("relationship_status", ['single', 'in_relationship', 'complicated', 'prefer_not_to_say'])
export const reportReason = pgEnum("report_reason", ['spam', 'harassment', 'inappropriate_content', 'hate_speech', 'violence', 'misinformation', 'other'])
export const reportStatus = pgEnum("report_status", ['pending', 'reviewed', 'resolved', 'dismissed'])
export const rsvpStatus = pgEnum("rsvp_status", ['going', 'interested', 'not_going'])


export const friendship = pgTable("friendship", {
	id: text().primaryKey().notNull(),
	status: friendStatus().default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	userId1: text("user_id_1").notNull(),
	userId2: text("user_id_2").notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId1],
			foreignColumns: [user.id],
			name: "friendship_user_id_1_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId2],
			foreignColumns: [user.id],
			name: "friendship_user_id_2_user_id_fk"
		}).onDelete("cascade"),
]);

export const photo = pgTable("photo", {
	id: text().primaryKey().notNull(),
	imageUrl: text("image_url").notNull(),
	caption: text(),
	ownerId: text("owner_id").notNull(),
	albumId: text("album_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	isPrivate: boolean("is_private").default(false).notNull(),
	moderationStatus: photoModerationStatus("moderation_status").default('approved').notNull(),
	moderatedBy: text("moderated_by"),
	moderatedAt: timestamp("moderated_at", { mode: 'string' }),
	viewCount: integer("view_count").default(0).notNull(),
}, (table) => [
	index("photo_album_idx").using("btree", table.albumId.asc().nullsLast().op("text_ops")),
	index("photo_moderation_idx").using("btree", table.moderationStatus.asc().nullsLast().op("enum_ops")),
	index("photo_owner_idx").using("btree", table.ownerId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [user.id],
			name: "photo_owner_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.albumId],
			foreignColumns: [photoAlbum.id],
			name: "photo_album_id_photo_album_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.moderatedBy],
			foreignColumns: [user.id],
			name: "photo_moderated_by_user_id_fk"
		}).onDelete("set null"),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	fullName: text().notNull(),
	faculty: text(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	username: text(),
	bio: text(),
	coverImage: text("cover_image"),
	avatarUrl: text("avatar_url"),
	emailVerified: boolean("email_verified").default(false).notNull(),
	gender: gender(),
	relationshipStatus: relationshipStatus("relationship_status"),
	birthDate: timestamp("birth_date", { mode: 'string' }),
	privacyLevel: privacyLevel("privacy_level").default('public').notNull(),
}, (table) => [
	unique("user_email_unique").on(table.email),
	unique("user_username_unique").on(table.username),
]);

export const photoAlbum = pgTable("photo_album", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	ownerId: text("owner_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	category: albumCategory().default('other'),
	eventDate: timestamp("event_date", { mode: 'string' }),
	coverPhotoUrl: text("cover_photo_url"),
	isPrivate: boolean("is_private").default(false).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [user.id],
			name: "photo_album_owner_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const studyMaterial = pgTable("study_material", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	fileUrl: text("file_url"),
	ownerId: text("owner_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [user.id],
			name: "study_material_owner_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const post = pgTable("post", {
	id: text().primaryKey().notNull(),
	content: text().notNull(),
	authorId: text("author_id").notNull(),
	likesCount: integer("likes_count").default(0).notNull(),
	commentsCount: integer("comments_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
	communityId: text("community_id"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	tags: text(),
	postType: text("post_type").default('post').notNull(),
	isPinned: boolean("is_pinned").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [user.id],
			name: "post_author_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.communityId],
			foreignColumns: [community.id],
			name: "post_community_id_community_id_fk"
		}).onDelete("cascade"),
]);

export const message = pgTable("message", {
	id: text().primaryKey().notNull(),
	senderId: text("sender_id").notNull(),
	receiverId: text("receiver_id"),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	groupChatId: text("group_chat_id"),
}, (table) => [
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [user.id],
			name: "message_sender_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.receiverId],
			foreignColumns: [user.id],
			name: "message_receiver_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.groupChatId],
			foreignColumns: [groupChat.id],
			name: "message_group_chat_id_group_chat_id_fk"
		}).onDelete("cascade"),
]);

export const academicCalendar = pgTable("academic_calendar", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	eventType: calendarEventType("event_type").notNull(),
	course: text(),
	dueDate: timestamp("due_date", { mode: 'string' }).notNull(),
	createdBy: text("created_by").notNull(),
	isPublic: boolean("is_public").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("academic_calendar_created_by_idx").using("btree", table.createdBy.asc().nullsLast().op("text_ops")),
	index("academic_calendar_due_date_idx").using("btree", table.dueDate.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [user.id],
			name: "academic_calendar_created_by_user_id_fk"
		}).onDelete("cascade"),
]);

export const photoTag = pgTable("photo_tag", {
	id: text().primaryKey().notNull(),
	photoId: text("photo_id").notNull(),
	userId: text("user_id").notNull(),
	taggedBy: text("tagged_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("photo_tag_photo_idx").using("btree", table.photoId.asc().nullsLast().op("text_ops")),
	uniqueIndex("photo_tag_photo_user_unique").using("btree", table.photoId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	index("photo_tag_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.photoId],
			foreignColumns: [photo.id],
			name: "photo_tag_photo_id_photo_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "photo_tag_user_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.taggedBy],
			foreignColumns: [user.id],
			name: "photo_tag_tagged_by_user_id_fk"
		}).onDelete("cascade"),
]);

export const communityMember = pgTable("community_member", {
	id: text().primaryKey().notNull(),
	communityId: text("community_id").notNull(),
	userId: text("user_id").notNull(),
	role: text().default('member').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.communityId],
			foreignColumns: [community.id],
			name: "community_member_community_id_community_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "community_member_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const postLike = pgTable("post_like", {
	id: text().primaryKey().notNull(),
	postId: text("post_id").notNull(),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [post.id],
			name: "post_like_post_id_post_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "post_like_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const notification = pgTable("notification", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	actorId: text("actor_id"),
	type: notificationType().notNull(),
	entityId: text("entity_id"),
	postId: text("post_id"),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "notification_user_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.actorId],
			foreignColumns: [user.id],
			name: "notification_actor_id_user_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [post.id],
			name: "notification_post_id_post_id_fk"
		}).onDelete("cascade"),
]);

export const schedule = pgTable("schedule", {
	id: text().primaryKey().notNull(),
	courseName: text("course_name").notNull(),
	courseCode: text("course_code"),
	instructor: text(),
	room: text(),
	dayOfWeek: integer("day_of_week").notNull(),
	startTime: text("start_time").notNull(),
	endTime: text("end_time").notNull(),
	faculty: text(),
	semester: text(),
	createdBy: text("created_by").notNull(),
	isPublic: boolean("is_public").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("schedule_created_by_idx").using("btree", table.createdBy.asc().nullsLast().op("text_ops")),
	index("schedule_day_of_week_idx").using("btree", table.dayOfWeek.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [user.id],
			name: "schedule_created_by_user_id_fk"
		}).onDelete("cascade"),
]);

export const groupChat = pgTable("group_chat", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	avatar: text(),
	faculty: text(),
	course: text(),
	creatorId: text("creator_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("group_chat_course_idx").using("btree", table.course.asc().nullsLast().op("text_ops")),
	index("group_chat_faculty_idx").using("btree", table.faculty.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [user.id],
			name: "group_chat_creator_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const groupChatMember = pgTable("group_chat_member", {
	id: text().primaryKey().notNull(),
	groupChatId: text("group_chat_id").notNull(),
	userId: text("user_id").notNull(),
	role: text().default('member').notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("group_chat_member_unique_idx").using("btree", table.groupChatId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.groupChatId],
			foreignColumns: [groupChat.id],
			name: "group_chat_member_group_chat_id_group_chat_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "group_chat_member_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const photoComment = pgTable("photo_comment", {
	id: text().primaryKey().notNull(),
	photoId: text("photo_id").notNull(),
	userId: text("user_id").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("photo_comment_photo_idx").using("btree", table.photoId.asc().nullsLast().op("text_ops")),
	index("photo_comment_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.photoId],
			foreignColumns: [photo.id],
			name: "photo_comment_photo_id_photo_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "photo_comment_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const community = pgTable("community", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	ownerId: text("owner_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	avatar: text(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("community_creator_idx").using("btree", table.ownerId.asc().nullsLast().op("text_ops")),
	index("community_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [user.id],
			name: "community_owner_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const userFollow = pgTable("user_follow", {
	id: text().primaryKey().notNull(),
	followerId: text("follower_id").notNull(),
	followingId: text("following_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("user_follow_unique_idx").using("btree", table.followerId.asc().nullsLast().op("text_ops"), table.followingId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.followerId],
			foreignColumns: [user.id],
			name: "user_follow_follower_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.followingId],
			foreignColumns: [user.id],
			name: "user_follow_following_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const comment = pgTable("comment", {
	id: text().primaryKey().notNull(),
	postId: text("post_id").notNull(),
	authorId: text("author_id").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [post.id],
			name: "comment_post_id_post_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [user.id],
			name: "comment_author_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const emailVerification = pgTable("email_verification", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	codeHash: text("code_hash").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	attempts: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "email_verification_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const blockedUser = pgTable("blocked_user", {
	id: text().primaryKey().notNull(),
	blockerId: text("blocker_id").notNull(),
	blockedId: text("blocked_id").notNull(),
	reason: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("blocked_user_unique_idx").using("btree", table.blockerId.asc().nullsLast().op("text_ops"), table.blockedId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.blockerId],
			foreignColumns: [user.id],
			name: "blocked_user_blocker_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.blockedId],
			foreignColumns: [user.id],
			name: "blocked_user_blocked_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const report = pgTable("report", {
	id: text().primaryKey().notNull(),
	reporterId: text("reporter_id").notNull(),
	reportedUserId: text("reported_user_id"),
	postId: text("post_id"),
	commentId: text("comment_id"),
	reason: reportReason().notNull(),
	description: text(),
	status: reportStatus().default('pending').notNull(),
	reviewedBy: text("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	photoId: text("photo_id"),
}, (table) => [
	index("report_reporter_idx").using("btree", table.reporterId.asc().nullsLast().op("text_ops")),
	index("report_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.reporterId],
			foreignColumns: [user.id],
			name: "report_reporter_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.reportedUserId],
			foreignColumns: [user.id],
			name: "report_reported_user_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [post.id],
			name: "report_post_id_post_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.commentId],
			foreignColumns: [comment.id],
			name: "report_comment_id_comment_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [user.id],
			name: "report_reviewed_by_user_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.photoId],
			foreignColumns: [photo.id],
			name: "report_photo_id_photo_id_fk"
		}).onDelete("cascade"),
]);

export const event = pgTable("event", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	eventType: eventType("event_type").notNull(),
	location: text(),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }),
	imageUrl: text("image_url"),
	organizerId: text("organizer_id").notNull(),
	communityId: text("community_id"),
	maxAttendees: integer("max_attendees"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("event_organizer_idx").using("btree", table.organizerId.asc().nullsLast().op("text_ops")),
	index("event_start_time_idx").using("btree", table.startTime.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.organizerId],
			foreignColumns: [user.id],
			name: "event_organizer_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.communityId],
			foreignColumns: [community.id],
			name: "event_community_id_community_id_fk"
		}).onDelete("cascade"),
]);

export const eventRsvp = pgTable("event_rsvp", {
	id: text().primaryKey().notNull(),
	eventId: text("event_id").notNull(),
	userId: text("user_id").notNull(),
	status: rsvpStatus().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("event_rsvp_unique_idx").using("btree", table.eventId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [event.id],
			name: "event_rsvp_event_id_event_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "event_rsvp_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const photoLike = pgTable("photo_like", {
	id: text().primaryKey().notNull(),
	photoId: text("photo_id").notNull(),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("photo_like_photo_idx").using("btree", table.photoId.asc().nullsLast().op("text_ops")),
	uniqueIndex("photo_like_photo_user_unique").using("btree", table.photoId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	index("photo_like_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.photoId],
			foreignColumns: [photo.id],
			name: "photo_like_photo_id_photo_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "photo_like_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const photoSave = pgTable("photo_save", {
	id: text().primaryKey().notNull(),
	photoId: text("photo_id").notNull(),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("photo_save_photo_idx").using("btree", table.photoId.asc().nullsLast().op("text_ops")),
	uniqueIndex("photo_save_photo_user_unique").using("btree", table.photoId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	index("photo_save_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.photoId],
			foreignColumns: [photo.id],
			name: "photo_save_photo_id_photo_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "photo_save_user_id_user_id_fk"
		}).onDelete("cascade"),
]);
