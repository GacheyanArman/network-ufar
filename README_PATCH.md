# UFARnet completion patch

Copy the files into your `ufar-network` project.

## Apply database changes

Preferred:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

If you want to apply the included SQL manually, inspect `drizzle/0002_ufarnet_complete.sql` first, especially if your local database still has `friendship.requester_id` and `friendship.receiver_id`.

## New/updated modules

- Advanced friendships: `src/app/actions/friends.js`, `/friends`
- Messaging structure: `src/app/actions/messages.js`, `/messages`
- Notifications engine: `src/lib/notifications.js`, `/notifications`
- Full-text search: `/search`
- Likes/comments: `src/app/actions/interactions.js`, `PostCard`, `FeedClient`
- Centralized uploads: `src/lib/upload.js`
- Communities: `src/app/actions/community.js`, `/communities`
