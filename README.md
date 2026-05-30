<div align="center">
  <h1>🎓 UFARnet — The Ultimate University Student Network</h1>
  <p>A modern, full-stack social and academic platform built exclusively for university students. Designed to seamlessly integrate social networking with academic tools like study material sharing, library resources, and event tracking.</p>

  [![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue?style=for-the-badge&logo=postgresql)](https://neon.tech/)
  [![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.31-green?style=for-the-badge)](https://orm.drizzle.team/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
</div>

---

## 📑 Table of Contents
- [About The Project](#-about-the-project)
- [Core Features](#-core-features)
  - [Social & Community](#social--community)
  - [Academic & Study Tools](#academic--study-tools)
  - [Communication](#communication)
  - [Security & Moderation](#security--moderation)
- [Tech Stack](#-tech-stack)
- [Architecture & Security](#-architecture--security)
- [UI/UX Design System](#-uiux-design-system)
- [Local Development Setup](#%EF%B8%8F-local-development-setup)
- [Roadmap](#-roadmap)

---

## 🚀 About The Project

UFARnet is designed as a centralized hub for students. It eliminates the need for fragmented communication across multiple apps by combining a social feed, group chats, photo galleries, academic calendars, and peer-to-peer study material sharing into a single, cohesive platform. 

Registration is exclusively restricted to university domains (e.g., `@ufar.com`, `@ufar.am`) to ensure a safe, closed community.

---

## 🧩 Core Features

### Social & Community
- **Dynamic Feed:** Twitter-style feed supporting various post types (Discussions, Questions with "Best Answer" features, Announcements).
- **Profiles & Relationships:** Follow users, add friends, block users, and manage privacy levels (Public, Friends, Private).
- **Communities:** Create and join public or private faculty/year-specific communities with role-based access.
- **Photos & Stories:** Create albums, upload photos with tags and likes. Expiring 24-hour stories with view tracking.
- **Events:** Create and RSVP to university events, parties, or workshops.

### Academic & Study Tools
- **UFAR Materials:** A peer-to-peer hub for students to upload, request, and share study notes, exam prep, and templates. Filterable by faculty, year, and subject.
- **UFAR Library:** An official resource catalog with reading lists, book availability tracking, and digital access links.
- **Academic Calendar & Schedule:** Track exams, deadlines, and personal class schedules.

### Communication
- **Real-time Messaging:** 1:1 direct messaging with read receipts and optimistic UI updates.
- **Group Chats:** Create course-specific or faculty group chats with moderation tools.

### Security & Moderation
- **Custom Auth:** Secure JWT-based authentication stored in HTTP-only cookies.
- **Domain Restriction:** Only allowed university email domains can register.
- **Reporting System:** Robust user, post, and photo reporting and moderation dashboard.

---

## 💻 Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL (Neon Serverless)
- **ORM:** Drizzle ORM
- **Authentication:** Custom JWT (`jose`) + bcrypt
- **Email Service:** Nodemailer (SMTP with OTP verification)
- **Styling:** Custom Vanilla CSS Design System (Tailwind-free for maximum control)
- **Validation:** Zod (planned/in-progress)

---

## 🏗 Architecture & Security

UFARnet avoids heavy third-party authentication providers in favor of a highly controlled, custom flow.

- **Stateless Sessions:** JWTs are verified efficiently without database lookups per request, while remaining secure against XSS.
- **OTP Verification:** Email verification uses a transient `email_verification` table with expiration times and attempt limits to prevent database pollution.
- **Optimistic UI:** Extensive use of React's `useOptimistic` hook for instant feedback on likes, saves, and messaging.

---

## 🎨 UI/UX Design System

The application features a modern, clean interface tailored for a university environment.

- **Layout:** Standard 3-column layout (Navigation / Feed / Widgets).
- **Aesthetics:** Card-based UI with consistent borders and spacing. No heavy gradients; relies on clean typography and subtle interactive states.
- **Unified Icons:** Custom `<UiIcon />` component system ensures pixel-perfect rendering across all operating systems, replacing inconsistent native emojis.

---

## ⚙️ Local Development Setup

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL Database (e.g., Neon.tech)
- Gmail App Password (for email verification)

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your_super_secret_jwt_string"

EMAIL_DEV_MODE="false"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"
SMTP_FROM="UFARnet <your_email@gmail.com>"
```

### 3. Installation & Database Sync
```bash
# Install dependencies
npm install

# Push schema to database
npx drizzle-kit push

# Start development server
npm run dev
```
The app will be running at `http://localhost:3000`.

---

## 🛣 Roadmap
- [ ] Migrate file storage to AWS S3 or Vercel Blob.
- [ ] Implement WebSockets for true real-time chat and notifications.
- [ ] Complete Zod validation across all server actions.
- [ ] Full migration of legacy `.js` files to strictly typed TypeScript.

---

<div align="center">
  <i>Developed for educational and internal university use.</i>
</div>