const fs = require('fs');
const path = require('path');

const moves = [
  // Communities
  { src: 'src/lib/community.js', dest: 'src/features/communities/server/queries.js' },
  { src: 'src/app/actions/community.js', dest: 'src/features/communities/server/actions.js' },
  { src: 'src/components/CommunityCard.tsx', dest: 'src/features/communities/components/CommunityCard.tsx' },
  { src: 'src/components/CommunityJoinButton.tsx', dest: 'src/features/communities/components/CommunityJoinButton.tsx' },
  { src: 'src/components/CommunityMembersPanel.tsx', dest: 'src/features/communities/components/CommunityMembersPanel.tsx' },
  { src: 'src/components/CommunityPostCard.tsx', dest: 'src/features/communities/components/CommunityPostCard.tsx' },
  { src: 'src/components/CommunityPostComposer.tsx', dest: 'src/features/communities/components/CommunityPostComposer.tsx' },
  { src: 'src/components/CommunityTabs.tsx', dest: 'src/features/communities/components/CommunityTabs.tsx' },

  // Admin
  { src: 'src/lib/audit.js', dest: 'src/features/admin/server/audit.js' },
  { src: 'src/app/actions/admin.js', dest: 'src/features/admin/server/actions.js' },
  { src: 'src/app/actions/report.ts', dest: 'src/features/admin/server/reports.ts' },
  { src: 'src/app/actions/content.js', dest: 'src/features/admin/server/content.js' },
  { src: 'src/components/AdminShell.tsx', dest: 'src/features/admin/components/AdminShell.tsx' },
  { src: 'src/components/ReportButton.tsx', dest: 'src/features/admin/components/ReportButton.tsx' },
  { src: 'src/components/AdminUsersClient.tsx', dest: 'src/features/admin/components/AdminUsersClient.tsx' },

  // Messages
  { src: 'src/app/actions/messages.ts', dest: 'src/features/messages/server/actions.ts' },
  { src: 'src/app/actions/groupChats.ts', dest: 'src/features/messages/server/groupChats.ts' },
  { src: 'src/lib/use-message-stream.ts', dest: 'src/features/messages/hooks/use-message-stream.ts' },
  { src: 'src/lib/use-typing.ts', dest: 'src/features/messages/hooks/use-typing.ts' },
  { src: 'src/components/MessagesClient.tsx', dest: 'src/features/messages/components/MessagesClient.tsx' },
  { src: 'src/components/MessagesPageClient.jsx', dest: 'src/features/messages/components/MessagesPageClient.jsx' },
  { src: 'src/components/GroupChatsClient.tsx', dest: 'src/features/messages/components/GroupChatsClient.tsx' },
  { src: 'src/components/ChatHeaderMenu.tsx', dest: 'src/features/messages/components/ChatHeaderMenu.tsx' },
  { src: 'src/components/Message.js', dest: 'src/features/messages/components/Message.js' },

  // Notifications
  { src: 'src/lib/notifications.js', dest: 'src/features/notifications/server/queries.js' },
  { src: 'src/app/actions/notifications.js', dest: 'src/features/notifications/server/actions.js' },
  { src: 'src/components/NotificationControls.tsx', dest: 'src/features/notifications/components/NotificationControls.tsx' },
  { src: 'src/components/MessagesNotificationBridge.tsx', dest: 'src/features/notifications/components/MessagesNotificationBridge.tsx' },

  // Photos
  { src: 'src/lib/photo-feed.ts', dest: 'src/features/photos/server/queries.ts' },
  { src: 'src/app/actions/photo.js', dest: 'src/features/photos/server/actions.js' },
  { src: 'src/components/PhotoCard.tsx', dest: 'src/features/photos/components/PhotoCard.tsx' },
  { src: 'src/components/PhotoCommentsPanel.tsx', dest: 'src/features/photos/components/PhotoCommentsPanel.tsx' },
  { src: 'src/components/PhotoFeedCard.tsx', dest: 'src/features/photos/components/PhotoFeedCard.tsx' },
  { src: 'src/components/PhotoGallery.js', dest: 'src/features/photos/components/PhotoGallery.js' },
  { src: 'src/components/PhotosGrid.js', dest: 'src/features/photos/components/PhotosGrid.js' },
  { src: 'src/components/PhotosPageClient.tsx', dest: 'src/features/photos/components/PhotosPageClient.tsx' },
  { src: 'src/components/PhotoUploader.js', dest: 'src/features/photos/components/PhotoUploader.js' },
  { src: 'src/components/PhotoUploadModal.tsx', dest: 'src/features/photos/components/PhotoUploadModal.tsx' },
  { src: 'src/components/AlbumCard.tsx', dest: 'src/features/photos/components/AlbumCard.tsx' },
  { src: 'src/components/CreateAlbumModal.tsx', dest: 'src/features/photos/components/CreateAlbumModal.tsx' },
  { src: 'src/components/MediaViewer.tsx', dest: 'src/features/photos/components/MediaViewer.tsx' },
  { src: 'src/components/AlbumPageClient.tsx', dest: 'src/features/photos/components/AlbumPageClient.tsx' },

  // Profile
  { src: 'src/lib/profile-utils.js', dest: 'src/features/profile/server/utils.js' },
  { src: 'src/app/actions/profile.js', dest: 'src/features/profile/server/actions.js' },
  { src: 'src/app/actions/follow.js', dest: 'src/features/profile/server/follow.js' },
  { src: 'src/app/actions/friends.js', dest: 'src/features/profile/server/friends.js' },
  { src: 'src/components/ProfileAboutInfo.tsx', dest: 'src/features/profile/components/ProfileAboutInfo.tsx' },
  { src: 'src/components/ProfileEditForm.js', dest: 'src/features/profile/components/ProfileEditForm.js' },
  { src: 'src/components/ProfileInfo.tsx', dest: 'src/features/profile/components/ProfileInfo.tsx' },
  { src: 'src/components/ProfilePhotoTabs.tsx', dest: 'src/features/profile/components/ProfilePhotoTabs.tsx' },
  { src: 'src/components/ProfilePostsClient.tsx', dest: 'src/features/profile/components/ProfilePostsClient.tsx' },
  { src: 'src/components/PublicProfileInfo.tsx', dest: 'src/features/profile/components/PublicProfileInfo.tsx' },
  { src: 'src/components/GroupMembersPanel.tsx', dest: 'src/features/profile/components/GroupMembersPanel.tsx' },
  { src: 'src/app/actions/block.ts', dest: 'src/features/profile/server/block.ts' },
  { src: 'src/lib/birthdays.js', dest: 'src/features/profile/server/birthdays.js' },

  // Courses / Schedule
  { src: 'src/app/actions/schedule.ts', dest: 'src/features/courses/server/schedule.ts' },
  { src: 'src/app/actions/calendar.ts', dest: 'src/features/courses/server/calendar.ts' },
  { src: 'src/components/ScheduleClient.tsx', dest: 'src/features/courses/components/ScheduleClient.tsx' },
  { src: 'src/components/CalendarPageClient.tsx', dest: 'src/features/courses/components/CalendarPageClient.tsx' },

  // Library
  { src: 'src/app/actions/library.ts', dest: 'src/features/library/server/actions.ts' },
  { src: 'src/components/LibraryPageClient.tsx', dest: 'src/features/library/components/LibraryPageClient.tsx' },

  // Lost & Found
  { src: 'src/app/actions/lost-found.js', dest: 'src/features/lost-found/server/actions.js' },
  { src: 'src/components/LostFoundClient.tsx', dest: 'src/features/lost-found/components/LostFoundClient.tsx' },

  // Search
  { src: 'src/app/actions/search.js', dest: 'src/features/search/server/actions.js' },
  { src: 'src/components/SearchBar.jsx', dest: 'src/features/search/components/SearchBar.jsx' },
  { src: 'src/components/SearchAutocomplete.tsx', dest: 'src/features/search/components/SearchAutocomplete.tsx' },
  { src: 'src/components/ExploreClient.tsx', dest: 'src/features/search/components/ExploreClient.tsx' },

  // Feed
  { src: 'src/lib/feed.ts', dest: 'src/features/feed/server/queries.ts' },
  { src: 'src/lib/hashtags.ts', dest: 'src/features/feed/server/hashtags.ts' },
  { src: 'src/lib/social.js', dest: 'src/features/feed/server/social.js' },
  { src: 'src/app/actions/post.ts', dest: 'src/features/feed/server/actions.ts' },
  { src: 'src/app/actions/comments.ts', dest: 'src/features/feed/server/comments.ts' },
  { src: 'src/app/actions/interactions.ts', dest: 'src/features/feed/server/interactions.ts' },
  { src: 'src/app/actions/story.ts', dest: 'src/features/feed/server/story.ts' },
  { src: 'src/components/FeedClient.tsx', dest: 'src/features/feed/components/FeedClient.tsx' },
  { src: 'src/components/FeedEventCard.tsx', dest: 'src/features/feed/components/FeedEventCard.tsx' },
  { src: 'src/components/FeedMaterialCard.tsx', dest: 'src/features/feed/components/FeedMaterialCard.tsx' },
  { src: 'src/components/FeedPhotoCard.tsx', dest: 'src/features/feed/components/FeedPhotoCard.tsx' },
  { src: 'src/components/FeedStudyGroupCard.tsx', dest: 'src/features/feed/components/FeedStudyGroupCard.tsx' },
  { src: 'src/components/FeedBirthdayCard.tsx', dest: 'src/features/feed/components/FeedBirthdayCard.tsx' },
  { src: 'src/components/PostCard.tsx', dest: 'src/features/feed/components/PostCard.tsx' },
  { src: 'src/components/PostComposer.tsx', dest: 'src/features/feed/components/PostComposer.tsx' },
  { src: 'src/components/CommentSection.tsx', dest: 'src/features/feed/components/CommentSection.tsx' },
  { src: 'src/components/CampusMomentsFeed.tsx', dest: 'src/features/feed/components/CampusMomentsFeed.tsx' },
  { src: 'src/components/StoriesBar.tsx', dest: 'src/features/feed/components/StoriesBar.tsx' },
  { src: 'src/components/StoryViewer.tsx', dest: 'src/features/feed/components/StoryViewer.tsx' },
  { src: 'src/components/ActionEmptyState.tsx', dest: 'src/features/feed/components/ActionEmptyState.tsx' },

  // Study Groups
  { src: 'src/app/actions/study-groups.js', dest: 'src/features/study-groups/server/actions.js' },

  // Shared Core
  { src: 'src/lib/cache.ts', dest: 'src/shared/cache/cache.ts' },
  { src: 'src/lib/roles.ts', dest: 'src/shared/auth/roles.ts' },
  { src: 'src/lib/upload.ts', dest: 'src/shared/storage/upload.ts' },
  { src: 'src/lib/image-process.ts', dest: 'src/shared/storage/image-process.ts' },
  { src: 'src/lib/private-files.ts', dest: 'src/shared/storage/private-files.ts' },
  { src: 'src/lib/mail.js', dest: 'src/shared/mail/mail.js' },
  { src: 'src/lib/rate-limit.ts', dest: 'src/shared/utils/rate-limit.ts' },
  { src: 'src/lib/realtime.ts', dest: 'src/shared/realtime/realtime.ts' },
  { src: 'src/lib/use-presence.ts', dest: 'src/shared/realtime/use-presence.ts' },
  
  { src: 'src/components/NavigationMenu.tsx', dest: 'src/shared/ui/NavigationMenu.tsx' },
  { src: 'src/app/actions/onboarding.js', dest: 'src/features/auth/server/onboarding.js' },
];

const importReplacements = moves.map(move => {
  let oldPath = move.src.replace(/^src\//, '').replace(/\.(ts|js|tsx|jsx)$/, '');
  let newPath = move.dest.replace(/^src\//, '').replace(/\.(ts|js|tsx|jsx)$/, '');
  return { oldPath, newPath };
});

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let i = 0;
    (function next() {
      let file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
}

function processFiles() {
  moves.forEach(move => {
    if (fs.existsSync(move.src)) {
      const destDir = path.dirname(move.dest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.renameSync(move.src, move.dest);
      console.log(`Moved ${move.src} -> ${move.dest}`);
    } else {
      console.log(`Warning: ${move.src} not found.`);
    }
  });

  walk(path.join(__dirname, 'src'), function(err, results) {
    if (err) throw err;
    const extensions = ['.js', '.jsx', '.ts', '.tsx'];
    
    results.forEach(file => {
      if (!extensions.includes(path.extname(file))) return;
      
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;

      importReplacements.forEach(({ oldPath, newPath }) => {
        const regex1 = new RegExp(`(['"])@\/${oldPath}\\1`, 'g');
        if (regex1.test(content)) {
          content = content.replace(regex1, `$1@/${newPath}$1`);
          modified = true;
        }

        const regex2 = new RegExp(`(['"])@\/${oldPath}\\.(js|ts|jsx|tsx)\\1`, 'g');
        if (regex2.test(content)) {
          content = content.replace(regex2, `$1@/${newPath}$1`);
          modified = true;
        }
      });

      // Special handling for relative imports
      const pathDiffs = [
        { from: 'lib/db', to: 'shared/db/db' },
        { from: 'lib/schema', to: 'shared/db/schema' },
        { from: 'lib/cache', to: 'shared/cache/cache' },
        { from: 'lib/roles', to: 'shared/auth/roles' },
        { from: 'lib/session', to: 'shared/auth/session' },
        { from: 'lib/community', to: 'features/communities/server/queries' },
        { from: 'lib/audit', to: 'features/admin/server/audit' },
        { from: 'components/UiIcon', to: 'shared/ui/UiIcon' },
        { from: 'components/NavigationMenu', to: 'shared/ui/NavigationMenu' },
      ];

      pathDiffs.forEach(({from, to}) => {
         const regex = new RegExp(`(['"])(?:\\.\\/|\\.\\.\\/|\\.\\.\\/\\.\\.\\/)` + from + `(?:\\.[jt]sx?)?['"]`, 'g');
         if (regex.test(content)) {
             content = content.replace(regex, `'@/${to}'`);
             modified = true;
         }
      });

      if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated imports in ${file.replace(__dirname, '')}`);
      }
    });
    
    console.log('Phase 2 Refactoring complete.');
  });
}

processFiles();
