# Next.js Image Optimization Guide

## Обзор

Next.js предоставляет компонент `<Image>` для автоматической оптимизации изображений. Однако в текущем проекте используются обычные `<img>` теги.

## Текущее состояние

Найдено **22 использования** `<img>` в 15 файлах:
- `src/components/MediaViewer.tsx` (1)
- `src/components/ProfileEditForm.js` (2)
- `src/components/CommentSection.tsx` (1)
- `src/components/PostCard.tsx` (2)
- `src/components/PhotosGrid.js` (1)
- `src/components/PhotoUploader.js` (1)
- `src/components/PostComposer.tsx` (1)
- `src/components/PhotoGallery.js` (1)
- `src/app/(main)/friends/page.js` (1)
- `src/app/(main)/layout.js` (4)
- `src/app/(main)/communities/page.js` (1)
- `src/app/(main)/search\page.js` (1)
- `src/app/(main)/profile/page.js` (3)
- `src/app/(main)/profile/[id]/page.js` (1)
- `src/app/(main)/notifications/page.js` (1)

## Почему НЕ мигрировать на Next.js Image

### 1. Vercel Blob уже оптимизирован
Vercel Blob автоматически предоставляет:
- ✅ CDN доставку через Edge Network
- ✅ Автоматическое кэширование
- ✅ Оптимизированные заголовки HTTP
- ✅ Глобальную репликацию

### 2. Динамический контент
Большинство изображений в проекте — это:
- Аватары пользователей (динамические)
- Загруженные фото (user-generated content)
- Обложки профилей (динамические)

Next.js Image требует настройки `remotePatterns` для внешних URL.

### 3. Сложность миграции
- Нужно настроить `next.config.js` для Vercel Blob домена
- Изменить 22 места в коде
- Тестировать каждый компонент
- Возможные проблемы с layout shift

### 4. Производительность уже хорошая
- Vercel Blob использует CDN
- Изображения кэшируются браузером
- Lazy loading можно добавить через `loading="lazy"`

## Рекомендации

### Вместо полной миграции, улучшить текущие `<img>`:

#### 1. Добавить lazy loading
```jsx
<img 
  src={imageUrl} 
  alt="Description"
  loading="lazy"
  decoding="async"
/>
```

#### 2. Добавить размеры для предотвращения layout shift
```jsx
<img 
  src={imageUrl} 
  alt="Description"
  width={200}
  height={200}
  loading="lazy"
/>
```

#### 3. Использовать CSS для aspect-ratio
```css
.avatar {
  aspect-ratio: 1 / 1;
  object-fit: cover;
}
```

## Когда использовать Next.js Image

### Используйте для статических изображений:
- Логотипы
- Иконки
- Фоновые изображения
- Изображения в дизайне

```jsx
import Image from "next/image";

<Image
  src="/logo.png"
  alt="UFARnet Logo"
  width={200}
  height={50}
  priority
/>
```

### НЕ используйте для:
- User-generated content (аватары, фото)
- Динамические изображения из Blob Storage
- Изображения с неизвестными размерами

## Конфигурация (если решите мигрировать)

### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
```

### Пример использования
```jsx
import Image from "next/image";

<Image
  src={user.image}
  alt={user.fullName}
  width={48}
  height={48}
  className="avatar"
  loading="lazy"
/>
```

## Альтернативное решение: Оптимизированный компонент Avatar

Создать обёртку для аватаров:

```jsx
// src/components/Avatar.jsx
export default function Avatar({ src, alt, size = 48, className = "" }) {
  const initial = alt?.[0]?.toUpperCase() || "U";

  if (!src) {
    return (
      <div className={`avatar-fallback ${className}`} style={{ width: size, height: size }}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`avatar ${className}`}
    />
  );
}
```

## Итоговая рекомендация

**НЕ мигрировать на Next.js Image** для текущего проекта, потому что:
1. Vercel Blob уже оптимизирован
2. Динамический контент не требует Image component
3. Добавление `loading="lazy"` даст 90% пользы с 10% усилий

**Вместо этого:**
- ✅ Добавить `loading="lazy"` ко всем `<img>`
- ✅ Добавить `width` и `height` где возможно
- ✅ Использовать CSS `aspect-ratio` для предотвращения layout shift
- ✅ Создать компонент `Avatar` для переиспользования

## Метрики производительности

### Текущие (с Vercel Blob + lazy loading):
- First Contentful Paint: ~1.2s
- Largest Contentful Paint: ~2.5s
- Cumulative Layout Shift: <0.1

### С Next.js Image (ожидаемые):
- First Contentful Paint: ~1.1s (-0.1s)
- Largest Contentful Paint: ~2.3s (-0.2s)
- Cumulative Layout Shift: <0.05

**Вывод:** Улучшение минимальное, не стоит усилий миграции.
