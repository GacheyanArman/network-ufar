# UFARnet — University Student Network

UFARnet is a modern, full-stack social platform built exclusively for university students. It provides a secure environment for students to connect, share study materials, join faculty-specific communities, and communicate in real-time.

## 🚀 Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Database:** [PostgreSQL](https://postgresql.org/) (Hosted on [Neon Serverless](https://neon.tech/))
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication:** Custom JWT-based Auth (using `jose` for Edge compatibility) + Bcrypt
- **Email Service:** `nodemailer` (SMTP configured for OTP delivery)
- **Styling:** Vanilla CSS (CSS Modules & Global Variables)

## 🏗 Core Architecture & Security

The project avoids heavy third-party monolithic Auth providers in favor of a custom, highly controlled authentication flow:

- **Strict Domain Validation:** Registration is restricted to `@ufar.com` / `@ufar.am` domains (with a configurable whitelist for administrative/testing access).
- **OTP Verification Separation:** Transient data (One-Time Passwords, attempt counters, TTL timestamps) is completely decoupled from the core `user` table into an isolated `email_verification` table. This prevents database bloating and solves the "dead-soul" unverified account registration loops.
- **Optimistic UI:** Utilizes React's `useOptimistic` hook for immediate interface feedback on interactions (likes, comments, posts) before server confirmation.
- **Stateless Sessions:** HTTP-only, secure JWT cookies ensure XSS protection without the overhead of database session lookups on every request.

## 📂 Project Structure

\`\`\`bash
├── src/
│   ├── app/
│   │   ├── (auth)/          # Auth flow pages (Login, Register, Verify OTP)
│   │   ├── (main)/          # Core application (Feed, Profile, Communities, Messages)
│   │   └── actions/         # Next.js Server Actions (Business logic, DB transactions)
│   ├── components/          # Reusable React components (PostCard, Uploaders, Modals)
│   ├── lib/                 # Core utilities (DB connection, Schema, Drizzle setup, Mailer)
│   └── public/              # Static assets and local uploads
└── drizzle/                 # SQL Migration files
\`\`\`

## ⚙️ Local Development Setup

### 1. Prerequisites
- Node.js (v18+ recommended)
- A [Neon.tech](https://neon.tech/) account (or local PostgreSQL database)
- A Gmail account with 2-Step Verification and an **App Password** for SMTP.

### 2. Environment Variables
Create a `.env` file in the root directory and populate it with the following:

\`\`\`env
# Database
DATABASE_URL="postgresql://<user>:<password>@<host>/<dbname>?sslmode=require"

# Security
JWT_SECRET="your_super_secret_random_string_here"

# SMTP Configuration (Google App Passwords)
EMAIL_DEV_MODE="false"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_16_char_app_password"
SMTP_FROM="UFARnet <your_email@gmail.com>"
\`\`\`

### 3. Installation & Database Sync

Install dependencies:
\`\`\`bash
npm install
\`\`\`

Push the schema to your database (Force sync):
\`\`\`bash
npx drizzle-kit push
\`\`\`

### 4. Run the Application
\`\`\`bash
npm run dev
\`\`\`
The application will be available at `http://localhost:3000`.

## ⚠️ Known Limitations & Roadmap

- **File Storage:** Currently, uploads (photos, materials) utilize the local file system (`fs/promises`). This is functional for local development but must be migrated to an S3-compatible Object Storage (e.g., Vercel Blob, AWS S3) before serverless production deployment to prevent data loss due to ephemeral container storage.
- **Request Validation:** Implementation of `zod` schema validation for all Server Actions is planned to ensure strict payload typing and prevent malicious bypasses.
- **TypeScript Migration:** Gradual adoption of `.ts`/`.tsx` is planned to leverage Drizzle's full type-safety potential.