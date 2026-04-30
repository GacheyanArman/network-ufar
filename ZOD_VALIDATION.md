# Zod Validation Documentation

## Обзор

Zod валидация интегрирована во все критические server actions для обеспечения безопасности и валидации данных на стороне сервера.

## Файлы

### Схемы валидации
**`src/lib/validations.ts`** — централизованные Zod схемы для всех форм

### Интегрированные actions
- ✅ `src/app/actions/auth.js` — регистрация, логин, верификация email
- ✅ `src/app/actions/profile.js` — обновление профиля
- ✅ `src/app/actions/comments.ts` — создание комментариев
- ✅ `src/app/actions/post.ts` — создание и удаление постов (уже было)

## Схемы валидации

### Profile Schema
```typescript
profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/).optional(),
  faculty: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(300).optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  relationshipStatus: z.enum(["single", "in_relationship", "complicated", "prefer_not_to_say"]).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((date) => new Date(date) <= new Date()).optional(),
});
```

### Auth Schemas
```typescript
registerSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(100),
  fullName: z.string().trim().min(2).max(80),
});

loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

verifyEmailSchema = z.object({
  code: z.string().trim().length(6).regex(/^\d{6}$/),
});
```

### Comment Schema
```typescript
commentSchema = z.object({
  postId: z.string().min(1),
  content: z.string().trim().min(1).max(1000),
});
```

### Photo Schema
```typescript
photoSchema = z.object({
  caption: z.string().trim().max(200).optional(),
  albumId: z.string().optional(),
  isPrivate: z.boolean().default(false),
});
```

### Community Schema
```typescript
communitySchema = z.object({
  name: z.string().trim().min(3).max(50),
  description: z.string().trim().max(500).optional(),
});
```

### Message Schema
```typescript
messageSchema = z.object({
  recipientId: z.string().min(1),
  content: z.string().trim().min(1).max(2000),
});
```

## Использование в Server Actions

### Пример: Profile Update
```javascript
import { profileSchema } from "@/lib/validations";

export async function updateProfile(formData) {
  // ... получение данных из formData
  
  const validatedFields = profileSchema.safeParse({
    fullName,
    username,
    faculty,
    bio,
    gender,
    relationshipStatus,
    birthDate,
  });

  if (!validatedFields.success) {
    const errorMessage = validatedFields.error.issues[0]?.message || "Invalid data";
    fail(errorMessage);
  }

  const validatedData = validatedFields.data;
  // ... использование validatedData
}
```

### Пример: Auth
```javascript
import { registerSchema } from "@/lib/validations";

export async function registerUser(prevState, formData) {
  const validatedFields = registerSchema.safeParse({
    email,
    password,
    fullName,
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message || "Invalid data" };
  }

  const validatedData = validatedFields.data;
  // ... использование validatedData
}
```

## Преимущества

✅ **Типобезопасность** — TypeScript типы автоматически выводятся из схем
✅ **Централизация** — все правила валидации в одном месте
✅ **Переиспользование** — схемы можно использовать на клиенте и сервере
✅ **Безопасность** — валидация на сервере предотвращает инъекции
✅ **Читаемость** — декларативный синтаксис легко понять
✅ **Сообщения об ошибках** — понятные сообщения для пользователей

## Следующие шаги

Можно добавить Zod валидацию в:
- Photo upload actions
- Community actions
- Message actions
- Friend request actions

## Примечания

- Всегда используйте `.safeParse()` вместо `.parse()` для избежания исключений
- Обрабатывайте ошибки валидации gracefully
- Возвращайте первую ошибку пользователю: `error.issues[0]?.message`
- Используйте `.trim()` для строк, чтобы убрать пробелы
- Используйте `.toLowerCase()` для email и username
