# 🎓 UFARnet — University Social & Academic Platform

<div align="center">

A modern full-stack platform designed specifically for university students.

UFARnet combines social networking, academic collaboration, messaging, event management, study resources, and campus services into a single ecosystem.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge\&logo=next.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue?style=for-the-badge\&logo=postgresql)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-Latest-green?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=for-the-badge\&logo=typescript)
![Playwright](https://img.shields.io/badge/Playwright-E2E_Testing-brightgreen?style=for-the-badge)

</div>

---

## 📖 Overview

UFARnet is a centralized university platform that connects students through social networking and academic tools.

Instead of using separate applications for communication, study materials, scheduling, and campus activities, students can access everything from one place.

The platform provides:

* Social networking
* Academic collaboration
* Real-time communication
* Course and schedule management
* Event organization
* Community engagement
* Resource sharing

---

## ✨ Features

### 🌐 Social Network

* Personal student profiles
* News feed and posts
* Comments and interactions
* Stories system
* Friend management
* User blocking
* Hashtags and search
* Photo sharing

### 👥 Communities

* Create and join communities
* Community discussions
* Member management
* Community settings
* Faculty and interest groups

### 💬 Messaging

* Private messaging
* Group chats
* Real-time message updates
* Typing indicators
* Online presence tracking
* Unread message notifications

### 📚 Academic Tools

* Course management
* Class schedules
* Academic calendar
* Study materials sharing
* Learning resources repository
* Study groups

### 📅 Events

* Create university events
* Event registration
* Event attendance tracking
* Event reminders
* Campus activities management

### 📷 Media Platform

* Photo uploads
* Photo albums
* Saved photos
* Media explorer
* Tag-based browsing
* Comments and reactions

### 🔔 Notifications

* Message notifications
* Event reminders
* Community updates
* Social activity notifications
* Smart notification management

### 🎯 Campus Services

* Lost & Found system
* Library resources
* Student collaboration tools
* Daily dashboard
* Campus announcements

### 🛡 Administration

* User management
* Content moderation
* Reports system
* Audit logs
* Community administration
* Event administration

---

## 🏗 Architecture

The application follows a modular architecture based on feature separation.

```text
src/
├── app/                # Next.js App Router
├── components/         # Shared UI components
├── contexts/           # React contexts
├── features/           # Feature modules
│   ├── auth
│   ├── feed
│   ├── messages
│   ├── communities
│   ├── events
│   ├── photos
│   ├── profile
│   ├── courses
│   ├── materials
│   ├── notifications
│   └── admin
├── shared/             # Shared services
├── lib/                # Core libraries
└── types/              # Type definitions
```

---

## ⚙ Technology Stack

### Frontend

* Next.js 16
* React
* TypeScript
* JavaScript
* CSS Modules

### Backend

* Next.js Server Actions
* API Routes
* Node.js

### Database

* PostgreSQL
* Drizzle ORM
* Drizzle Migrations

### Authentication

* Custom Authentication System
* Email Verification
* Password Recovery
* Session Management

### Storage

* File Upload System
* Image Processing
* Thumbnail Generation

### Internationalization

* Multi-language Support (i18n)
* Language Context Management

### Testing

* Playwright
* End-to-End Testing
* Automated Authentication Testing

---

## 🔒 Security Features

* Password hashing
* Protected routes
* Email verification
* Password reset tokens
* Session validation
* Access control
* Rate limiting
* Audit logging

---

## 📊 Main Modules

| Module          | Description                     |
| --------------- | ------------------------------- |
| Feed            | Social posts, comments, stories |
| Messages        | Private and group communication |
| Communities     | Student communities             |
| Courses         | Course management               |
| Schedule        | Personal timetable              |
| Events          | University events               |
| Materials       | Study resources                 |
| Photos          | Albums and media                |
| Notifications   | Activity notifications          |
| Library         | Educational resources           |
| Lost & Found    | Campus item recovery            |
| Admin Dashboard | Moderation and management       |

---

## 🚀 Installation

### Prerequisites

* Node.js 18+
* PostgreSQL
* npm

### Clone Repository

```bash
git clone https://github.com/your-username/ufarnet.git
cd ufarnet
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env.local` file:

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_password
```

### Run Database Migrations

```bash
npx drizzle-kit push
```

### Start Development Server

```bash
npm run dev
```

Application will be available at:

```text
http://localhost:3000
```

---

## 🧪 Testing

Run all tests:

```bash
npx playwright test
```

Run authentication tests:

```bash
npx playwright test tests/e2e/auth.spec.ts
```

Run dashboard tests:

```bash
npx playwright test tests/e2e/dashboard.spec.ts
```

---

## 📈 Future Improvements

* Mobile application
* Push notifications
* WebSocket-based real-time communication
* AI-powered recommendations
* Advanced analytics
* Cloud file storage integration
* Enhanced moderation tools

---

## 📄 License

This project was developed for educational and university purposes.

---

## 👨‍💻 Author

Developed as a full-stack university platform focused on improving communication, collaboration, and academic productivity within the student community.
