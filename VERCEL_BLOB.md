# Vercel Blob Storage Migration

## Обзор

Все загрузки файлов мигрированы с локального хранилища (`public/uploads`) на Vercel Blob Storage для улучшения производительности, масштабируемости и надёжности.

## Преимущества Vercel Blob

✅ **Масштабируемость** — автоматическое масштабирование без ограничений
✅ **CDN** — глобальная доставка контента через Edge Network
✅ **Надёжность** — автоматическое резервное копирование и репликация
✅ **Производительность** — быстрая загрузка и отдача файлов
✅ **Безопасность** — поддержка публичных и приватных файлов
✅ **Простота** — не нужно управлять файловой системой

## Реализация

### Утилита загрузки
**`src/lib/upload.ts`** — централизованная функция для загрузки файлов

```typescript
import { put } from "@vercel/blob";

export async function saveUploadFile(
  file: File | null | undefined,
  options: SaveUploadFileOptions = {}
): Promise<string | null> {
  const {
    subdir = "misc",
    prefix = "file",
    maxSize = MAX_UPLOAD_SIZE,
    allowedMimePrefix,
    access = "public",
  } = options;

  // Валидация и санитизация
  assertSafeSubdir(subdir);
  
  if (!file || file.size === 0) return null;
  if (file.size > maxSize) throw new Error("File too large");
  if (allowedMimePrefix && !file.type?.startsWith(allowedMimePrefix)) {
    throw new Error("Invalid file type");
  }

  // Генерация безопасного имени файла
  const safeName = sanitizeFileName(file.name);
  const filename = `${subdir}/${prefix}-${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  // Загрузка в Vercel Blob
  const blob = await put(filename, file, {
    access,
    addRandomSuffix: false,
  });

  return blob.url;
}
```

### Использование в actions

#### Profile Images
**`src/app/actions/profile.js`**
```javascript
import { saveUploadFile } from "@/lib/upload";

async function saveProfileImage(file, type) {
  if (!file || file.size === 0) return null;

  const imageUrl = await saveUploadFile(file, {
    subdir: "profile",
    prefix: type,
    maxSize: 5 * 1024 * 1024,
    allowedMimePrefix: "image/",
    access: "public",
  });

  return imageUrl;
}
```

#### Post Media
**`src/app/actions/post.ts`**
```typescript
const imageUrl = await saveUploadFile(validatedImage, {
  subdir: "posts",
  prefix: isVideoFile(validatedImage) ? "video" : "post",
  maxSize: getMaxMediaSize(validatedImage),
  access: "public",
});
```

## Конфигурация

### Environment Variables
Добавьте в `.env`:
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

### Vercel Dashboard
1. Перейти в проект на Vercel
2. Storage → Blob → Create Store
3. Скопировать токен в `.env`

## Структура файлов в Blob

```
/profile/
  ├── avatar-1714471619196-uuid-photo.jpg
  └── cover-1714471619196-uuid-banner.jpg

/posts/
  ├── post-1714471619196-uuid-image.jpg
  └── video-1714471619196-uuid-clip.mp4

/photos/
  └── photo-1714471619196-uuid-vacation.jpg
```

## Безопасность

### Санитизация имён файлов
```typescript
function sanitizeFileName(name: string): string {
  return String(name || "file")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}
```

### Валидация путей
```typescript
function assertSafeSubdir(subdir: string): void {
  if (!/^[a-zA-Z0-9/_-]+$/.test(subdir) || subdir.includes("..")) {
    throw new Error("Invalid upload folder constraint.");
  }
}
```

### Ограничения размера
- Изображения: 5MB (profile), 10MB (posts)
- Видео: 80MB
- По умолчанию: 10MB

### MIME типы
- Изображения: `image/*`
- Видео: `video/mp4`, `video/webm`, `video/quicktime`, `video/x-m4v`

## Миграция существующих файлов

Если у вас есть файлы в `public/uploads`, их нужно мигрировать:

```bash
# Скрипт миграции (создать отдельно)
node scripts/migrate-to-blob.js
```

## Удаление старых файлов

После миграции можно удалить:
- `public/uploads/` директорию
- Старые импорты `fs/promises`, `path`

## Мониторинг

### Vercel Dashboard
- Storage → Blob → Usage
- Просмотр загруженных файлов
- Статистика использования
- Управление файлами

### Логирование
```typescript
try {
  const blob = await put(filename, file, { access });
  return blob.url;
} catch (error) {
  console.error("Vercel Blob Upload Failed:", error);
  throw new Error("Cloud storage upload failed.");
}
```

## Стоимость

Vercel Blob включён в Pro план:
- 100GB хранилища
- 1TB трафика
- Дополнительно: $0.15/GB хранилища, $0.10/GB трафика

## Следующие шаги

- ✅ Profile images мигрированы
- ✅ Post media мигрированы
- ⏳ Photo gallery (уже использует Blob)
- ⏳ Community avatars (если добавятся)

## Примечания

- URL файлов постоянные и не меняются
- Файлы доступны через CDN глобально
- Поддержка публичных и приватных файлов
- Автоматическая оптимизация изображений (опционально)
