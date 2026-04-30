Technical Documentation: UFARnet Core Architecture
1. Stack Overview

Проект построен на передовом стеке 2026 года для обеспечения максимальной производительности и типизации:

    Framework: Next.js 16.2.4 (App Router)

    Database: Neon PostgreSQL (Serverless Tier)

    ORM: Drizzle ORM (выбран вместо Prisma из-за проблем с кириллическими путями в Query Engine)

    Security: bcryptjs (hashing), jose (JWT for Edge runtime)

    ID Generation: @paralleldrive/cuid2 (безопасные коллизионно-стойкие ID)

2. Directory Structure & Route Groups

Мы использовали Route Groups для разделения логики отображения без изменения URL-структуры.

    src/app/(auth): Группа маршрутов для авторизации. Использует стандартный root layout, чтобы интерфейс был чистым (без боковых меню).

    src/app/(main): Группа маршрутов основной части соцсети. Содержит layout.js, который оборачивает все страницы в общую сетку: Topbar, Sidebar Left (навигация), Main Content, Sidebar Right (виджеты).

    src/app/actions: Централизованное хранилище для Server Actions. Это функции, которые исполняются строго на сервере.

3. Database Layer (Drizzle + Neon)
Schema Definition (src/lib/schema.js)

Таблица пользователей спроектирована с учетом специфики университета:
JavaScript

export const users = pgTable("user", {
  id: text("id").primaryKey(), // CUID2
  email: text("email").notNull().unique(), // Unique university email
  password: text("password").notNull(), // Hashed string
  fullName: text("fullName").notNull(),
  faculty: text("faculty"),
  createdAt: timestamp("created_at").defaultNow(),
});

Connection Singleton (src/lib/db.js)

Используется HTTP-драйвер @neondatabase/serverless для работы в Serverless окружении без утечек соединений.
4. Authentication Flow
Registration (registerUser) Logic:

    Validation: Проверка всех полей на пустоту.

    Domain Guard: Жесткая проверка конца строки на @ufar.com или @ufar.am.

    Existence Check: SQL-запрос db.select() для поиска дубликатов email.

    Hashing: Пароль шифруется через bcrypt.hash с солью (10 раундов).

    Persistence: Запись в Neon через Drizzle.

Login & Session (loginUser) Logic:

    Identity Check: Поиск пользователя в базе.

    Password Verify: Сравнение введенного пароля с хешем через bcrypt.compare.

    JWT Issue: Создание токена через библиотеку jose. В полезную нагрузку (payload) зашиваются userId и email.

    Security: Токен подписывается секретным ключом JWT_SECRET.

    Cookie Storage: Установка асинхронной куки session:

        httpOnly: true: Защита от кражи токена через XSS скрипты.

        secure: true: Передача только по HTTPS (в режиме production).

        maxAge: 7 дней.

5. Environment & Security Policies

    .env: Хранит критические данные (DATABASE_URL, JWT_SECRET). Файл добавлен в .gitignore и никогда не должен попасть в публичный репозиторий.

    Validation Errors: Все ошибки бэкенда обрабатываются через try/catch и возвращают понятные сообщения для UI через useActionState.

    Next.js 16 Sync Dynamic APIs: Мы учли изменения в API кук. Функции cookies() теперь асинхронны и требуют await.

6. Git Workflow

Для поддержания чистоты репозитория:

    git add . — индексация изменений.

    git commit -m "prefix: description" — создание снимка.

        Prefixes: feat: (новая фича), fix: (баг), docs: (документация), refactor: (изменение структуры).

    git push origin main — синхронизация с облаком.