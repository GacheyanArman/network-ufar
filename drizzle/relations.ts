import { relations } from "drizzle-orm/relations";
import {
  user,
  friendship,
  photo,
  photoAlbum,
  studyMaterial,
  post,
  community,
  message,
  groupChat,
  academicCalendar,
  photoTag,
  communityMember,
  postLike,
  notification,
  schedule,
  groupChatMember,
  photoComment,
  userFollow,
  comment,
  emailVerification,
  blockedUser,
  report,
  event,
  eventRsvp,
  eventCoOrganizer,
  eventComment,
  eventCheckIn,
  photoLike,
  photoSave,
} from "./schema";

export const friendshipRelations = relations(friendship, ({ one }) => ({
  user_userId1: one(user, {
    fields: [friendship.userId1],
    references: [user.id],
    relationName: "friendship_userId1_user_id",
  }),
  user_userId2: one(user, {
    fields: [friendship.userId2],
    references: [user.id],
    relationName: "friendship_userId2_user_id",
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  friendships_userId1: many(friendship, {
    relationName: "friendship_userId1_user_id",
  }),
  friendships_userId2: many(friendship, {
    relationName: "friendship_userId2_user_id",
  }),
  photos_ownerId: many(photo, {
    relationName: "photo_ownerId_user_id",
  }),
  photos_moderatedBy: many(photo, {
    relationName: "photo_moderatedBy_user_id",
  }),
  photoAlbums: many(photoAlbum),
  studyMaterials: many(studyMaterial),
  posts: many(post),
  messages_senderId: many(message, {
    relationName: "message_senderId_user_id",
  }),
  messages_receiverId: many(message, {
    relationName: "message_receiverId_user_id",
  }),
  academicCalendars: many(academicCalendar),
  photoTags_userId: many(photoTag, {
    relationName: "photoTag_userId_user_id",
  }),
  photoTags_taggedBy: many(photoTag, {
    relationName: "photoTag_taggedBy_user_id",
  }),
  communityMembers: many(communityMember),
  postLikes: many(postLike),
  notifications_userId: many(notification, {
    relationName: "notification_userId_user_id",
  }),
  notifications_actorId: many(notification, {
    relationName: "notification_actorId_user_id",
  }),
  schedules: many(schedule),
  groupChats: many(groupChat),
  groupChatMembers: many(groupChatMember),
  photoComments: many(photoComment),
  communities: many(community),
  userFollows_followerId: many(userFollow, {
    relationName: "userFollow_followerId_user_id",
  }),
  userFollows_followingId: many(userFollow, {
    relationName: "userFollow_followingId_user_id",
  }),
  comments: many(comment),
  emailVerifications: many(emailVerification),
  blockedUsers_blockerId: many(blockedUser, {
    relationName: "blockedUser_blockerId_user_id",
  }),
  blockedUsers_blockedId: many(blockedUser, {
    relationName: "blockedUser_blockedId_user_id",
  }),
  reports_reporterId: many(report, {
    relationName: "report_reporterId_user_id",
  }),
  reports_reportedUserId: many(report, {
    relationName: "report_reportedUserId_user_id",
  }),
  reports_reviewedBy: many(report, {
    relationName: "report_reviewedBy_user_id",
  }),
  events: many(event),
  eventRsvps: many(eventRsvp),
  eventCoOrganizers: many(eventCoOrganizer),
  eventComments: many(eventComment),
  eventCheckIns: many(eventCheckIn),
  photoLikes: many(photoLike),
  photoSaves: many(photoSave),
}));

export const photoRelations = relations(photo, ({ one, many }) => ({
  user_ownerId: one(user, {
    fields: [photo.ownerId],
    references: [user.id],
    relationName: "photo_ownerId_user_id",
  }),
  photoAlbum: one(photoAlbum, {
    fields: [photo.albumId],
    references: [photoAlbum.id],
  }),
  user_moderatedBy: one(user, {
    fields: [photo.moderatedBy],
    references: [user.id],
    relationName: "photo_moderatedBy_user_id",
  }),
  photoTags: many(photoTag),
  photoComments: many(photoComment),
  reports: many(report),
  photoLikes: many(photoLike),
  photoSaves: many(photoSave),
}));

export const photoAlbumRelations = relations(photoAlbum, ({ one, many }) => ({
  photos: many(photo),
  user: one(user, {
    fields: [photoAlbum.ownerId],
    references: [user.id],
  }),
}));

export const studyMaterialRelations = relations(studyMaterial, ({ one }) => ({
  user: one(user, {
    fields: [studyMaterial.ownerId],
    references: [user.id],
  }),
}));

export const postRelations = relations(post, ({ one, many }) => ({
  user: one(user, {
    fields: [post.authorId],
    references: [user.id],
  }),
  community: one(community, {
    fields: [post.communityId],
    references: [community.id],
  }),
  postLikes: many(postLike),
  notifications: many(notification),
  comments: many(comment),
  reports: many(report),
}));

export const communityRelations = relations(community, ({ one, many }) => ({
  posts: many(post),
  communityMembers: many(communityMember),
  user: one(user, {
    fields: [community.ownerId],
    references: [user.id],
  }),
  events: many(event),
}));

export const messageRelations = relations(message, ({ one }) => ({
  user_senderId: one(user, {
    fields: [message.senderId],
    references: [user.id],
    relationName: "message_senderId_user_id",
  }),
  user_receiverId: one(user, {
    fields: [message.receiverId],
    references: [user.id],
    relationName: "message_receiverId_user_id",
  }),
  groupChat: one(groupChat, {
    fields: [message.groupChatId],
    references: [groupChat.id],
  }),
}));

export const groupChatRelations = relations(groupChat, ({ one, many }) => ({
  messages: many(message),
  user: one(user, {
    fields: [groupChat.creatorId],
    references: [user.id],
  }),
  groupChatMembers: many(groupChatMember),
}));

export const academicCalendarRelations = relations(
  academicCalendar,
  ({ one }) => ({
    user: one(user, {
      fields: [academicCalendar.createdBy],
      references: [user.id],
    }),
  }),
);

export const photoTagRelations = relations(photoTag, ({ one }) => ({
  photo: one(photo, {
    fields: [photoTag.photoId],
    references: [photo.id],
  }),
  user_userId: one(user, {
    fields: [photoTag.userId],
    references: [user.id],
    relationName: "photoTag_userId_user_id",
  }),
  user_taggedBy: one(user, {
    fields: [photoTag.taggedBy],
    references: [user.id],
    relationName: "photoTag_taggedBy_user_id",
  }),
}));

export const communityMemberRelations = relations(
  communityMember,
  ({ one }) => ({
    community: one(community, {
      fields: [communityMember.communityId],
      references: [community.id],
    }),
    user: one(user, {
      fields: [communityMember.userId],
      references: [user.id],
    }),
  }),
);

export const postLikeRelations = relations(postLike, ({ one }) => ({
  post: one(post, {
    fields: [postLike.postId],
    references: [post.id],
  }),
  user: one(user, {
    fields: [postLike.userId],
    references: [user.id],
  }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
  user_userId: one(user, {
    fields: [notification.userId],
    references: [user.id],
    relationName: "notification_userId_user_id",
  }),
  user_actorId: one(user, {
    fields: [notification.actorId],
    references: [user.id],
    relationName: "notification_actorId_user_id",
  }),
  post: one(post, {
    fields: [notification.postId],
    references: [post.id],
  }),
}));

export const scheduleRelations = relations(schedule, ({ one }) => ({
  user: one(user, {
    fields: [schedule.createdBy],
    references: [user.id],
  }),
}));

export const groupChatMemberRelations = relations(
  groupChatMember,
  ({ one }) => ({
    groupChat: one(groupChat, {
      fields: [groupChatMember.groupChatId],
      references: [groupChat.id],
    }),
    user: one(user, {
      fields: [groupChatMember.userId],
      references: [user.id],
    }),
  }),
);

export const photoCommentRelations = relations(photoComment, ({ one }) => ({
  photo: one(photo, {
    fields: [photoComment.photoId],
    references: [photo.id],
  }),
  user: one(user, {
    fields: [photoComment.userId],
    references: [user.id],
  }),
}));

export const userFollowRelations = relations(userFollow, ({ one }) => ({
  user_followerId: one(user, {
    fields: [userFollow.followerId],
    references: [user.id],
    relationName: "userFollow_followerId_user_id",
  }),
  user_followingId: one(user, {
    fields: [userFollow.followingId],
    references: [user.id],
    relationName: "userFollow_followingId_user_id",
  }),
}));

export const commentRelations = relations(comment, ({ one, many }) => ({
  post: one(post, {
    fields: [comment.postId],
    references: [post.id],
  }),
  user: one(user, {
    fields: [comment.authorId],
    references: [user.id],
  }),
  reports: many(report),
}));

export const emailVerificationRelations = relations(
  emailVerification,
  ({ one }) => ({
    user: one(user, {
      fields: [emailVerification.userId],
      references: [user.id],
    }),
  }),
);

export const blockedUserRelations = relations(blockedUser, ({ one }) => ({
  user_blockerId: one(user, {
    fields: [blockedUser.blockerId],
    references: [user.id],
    relationName: "blockedUser_blockerId_user_id",
  }),
  user_blockedId: one(user, {
    fields: [blockedUser.blockedId],
    references: [user.id],
    relationName: "blockedUser_blockedId_user_id",
  }),
}));

export const reportRelations = relations(report, ({ one }) => ({
  user_reporterId: one(user, {
    fields: [report.reporterId],
    references: [user.id],
    relationName: "report_reporterId_user_id",
  }),
  user_reportedUserId: one(user, {
    fields: [report.reportedUserId],
    references: [user.id],
    relationName: "report_reportedUserId_user_id",
  }),
  post: one(post, {
    fields: [report.postId],
    references: [post.id],
  }),
  comment: one(comment, {
    fields: [report.commentId],
    references: [comment.id],
  }),
  user_reviewedBy: one(user, {
    fields: [report.reviewedBy],
    references: [user.id],
    relationName: "report_reviewedBy_user_id",
  }),
  photo: one(photo, {
    fields: [report.photoId],
    references: [photo.id],
  }),
}));

export const eventRelations = relations(event, ({ one, many }) => ({
  user: one(user, {
    fields: [event.organizerId],
    references: [user.id],
  }),
  community: one(community, {
    fields: [event.communityId],
    references: [community.id],
  }),
  eventRsvps: many(eventRsvp),
  eventCoOrganizers: many(eventCoOrganizer),
  eventComments: many(eventComment),
  eventCheckIns: many(eventCheckIn),
}));

export const eventRsvpRelations = relations(eventRsvp, ({ one }) => ({
  event: one(event, {
    fields: [eventRsvp.eventId],
    references: [event.id],
  }),
  user: one(user, {
    fields: [eventRsvp.userId],
    references: [user.id],
  }),
}));

export const eventCoOrganizerRelations = relations(
  eventCoOrganizer,
  ({ one }) => ({
    event: one(event, {
      fields: [eventCoOrganizer.eventId],
      references: [event.id],
    }),
    user: one(user, {
      fields: [eventCoOrganizer.userId],
      references: [user.id],
    }),
  }),
);

export const eventCommentRelations = relations(eventComment, ({ one }) => ({
  event: one(event, {
    fields: [eventComment.eventId],
    references: [event.id],
  }),
  user: one(user, {
    fields: [eventComment.userId],
    references: [user.id],
  }),
}));

export const eventCheckInRelations = relations(eventCheckIn, ({ one }) => ({
  event: one(event, {
    fields: [eventCheckIn.eventId],
    references: [event.id],
  }),
  user: one(user, {
    fields: [eventCheckIn.userId],
    references: [user.id],
  }),
}));

export const photoLikeRelations = relations(photoLike, ({ one }) => ({
  photo: one(photo, {
    fields: [photoLike.photoId],
    references: [photo.id],
  }),
  user: one(user, {
    fields: [photoLike.userId],
    references: [user.id],
  }),
}));

export const photoSaveRelations = relations(photoSave, ({ one }) => ({
  photo: one(photo, {
    fields: [photoSave.photoId],
    references: [photo.id],
  }),
  user: one(user, {
    fields: [photoSave.userId],
    references: [user.id],
  }),
}));
