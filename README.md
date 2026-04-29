# UFARnet — University Student Network

UFARnet is a modern, full-stack social platform built exclusively for university students. It provides a secure environment for students to connect, share study materials, join faculty-specific communities, and communicate in real-time.

---

## 🚀 Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL (Neon Serverless)
- **ORM:** Drizzle ORM
- **Authentication:** Custom JWT-based Auth (`jose`) + bcrypt
- **Email Service:** nodemailer (SMTP with OTP verification)
- **Styling:** Vanilla CSS (custom design system)

---

## 🏗 Core Architecture & Security

UFARnet avoids heavy third-party auth systems and instead implements a custom, controlled authentication flow:

### 🔐 Authentication
- JWT stored in **HTTP-only cookies**
- Stateless session handling (no DB lookup per request)
- Secure against XSS

### 📩 Email Verification System
- OTP stored in a separate `email_verification` table
- Includes:
  - expiration time (TTL)
  - attempt counter
- Prevents “dead accounts” and DB pollution

### 🎓 Domain Restriction
- Registration limited to:
  - `@ufar.com`
  - `@ufar.am`

### ⚡ Optimistic UI
- Uses React `useOptimistic`
- Instant feedback for:
  - likes
  - reposts
  - interactions

---

## 🎨 UI/UX Design System

UFARnet uses a custom lightweight design system inspired by **Twitter/X + Facebook**, adapted for a university environment.

### 🧩 Design Principles

- Clean 3-column layout:
  - Left: navigation
  - Center: feed/content
  - Right: widgets
- Card-based UI (consistent borders, radius, spacing)
- No gradients — clean university style
- Colors aligned with UFAR branding

---

### 🎯 Key UI Features

#### 📰 Feed & Posts
- Twitter-style post layout:
  - avatar (left)
  - author + handle + time
  - text + media
  - actions (like, repost, views, share)
- Optimistic interactions

#### 👤 Profile Pages
- Fully redesigned:
  - current user profile
  - public user profile
- Sidebar with:
  - stats
  - actions (follow, friend, message)
- Tabs:
  - Posts
  - About
  - Photos

#### 🔔 Notifications
- Clean notification list
- Unread states
- Action buttons:
  - Mark as read
  - Mark all as read
- Badge counter in sidebar

#### 📚 Sidebar Navigation
Includes:
- Feed
- Search
- Notifications
- Messages
- Friends
- Profile
- Communities
- Photos
- Materials

---

### 🎨 Icon System (IMPORTANT)

All emoji have been replaced with a unified icon system:

```jsx
import UiIcon from "@/components/UiIcon";

Example:

<UiIcon name="bell" />
<UiIcon name="user" />
<UiIcon name="book" />

✔ Consistent across all platforms
❌ No native emoji (they look different on each OS)

📂 Project Structure
src/
├── app/
│   ├── (auth)/          # Login, Register, OTP
│   ├── (main)/          # Feed, Profile, Notifications, Messages
│   └── actions/         # Server Actions (DB logic)
│
├── components/          # UI components
│   ├── PostCard
│   ├── UiIcon
│   ├── PhotoGallery
│   └── ...
│
├── lib/
│   ├── db
│   ├── schema
│   ├── session
│   └── mailer
│
└── public/              # uploads

⚙️ Local Development Setup

1. Requirements

Node.js (v18+)
PostgreSQL / Neon
Gmail (App Password)

2. Environment Variables

Create .env:

DATABASE_URL="postgresql://..."

JWT_SECRET="your_secret"

EMAIL_DEV_MODE="false"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"
SMTP_FROM="UFARnet <your_email@gmail.com>"

3. Install
npm install

4. Sync DB
npx drizzle-kit push

5. Run
npm run dev

App runs at:

http://localhost:3000

🧠 Core Features
👥 Social
Follow users
Friend system
Messaging
📝 Content
Create posts
Upload images/videos
Like / repost / view
🔔 Notifications
Real-time-like UX
Optimistic updates
📁 Study Tools
Materials upload
Library access

⚠️ Known Limitations
❗ File uploads use local storage (not production-safe)
❗ No real-time WebSocket yet
❗ No Zod validation (planned)

🛣 Roadmap
 Move storage to S3 / Vercel Blob
 Add WebSocket real-time updates
 Add Zod validation
 Full TypeScript migration
 Extract UI into reusable design system (Button, Card, Avatar)

🧩 Recent Updates
✅ Redesigned post UI (Twitter-style)
✅ Redesigned profile pages
✅ Redesigned notifications page
✅ Unified icon system (removed emoji)
✅ Cleaned topbar (removed clutter)
✅ Improved sidebar navigation
✅ Fixed optimistic update warnings
✅ Improved overall UI consistency
📄 License

Private project (educational / internal use)


---

## 🔥 Идеальный commit для этого

```bash
git commit -m "Complete UI redesign, unified icon system, improved profiles, posts, and notifications"