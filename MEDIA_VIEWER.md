# MediaViewer Component

Универсальный компонент для просмотра изображений и видео с поддержкой навигации.

## Возможности

✅ Просмотр изображений и видео в полноэкранном режиме
✅ Навигация вперед/назад по галерее (стрелки ← →)
✅ Закрытие по Escape или клику на затемненный фон
✅ Счетчик текущего элемента (1 / 10)
✅ HTML5 video player с controls
✅ Адаптивный дизайн для мобильных устройств
✅ Блокировка прокрутки страницы при открытом viewer

## Использование

### Базовое использование (одно изображение)

```jsx
import { useState } from "react";
import MediaViewer from "@/components/MediaViewer";

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <img src="/photo.jpg" onClick={() => setIsOpen(true)} />
      
      {isOpen && (
        <MediaViewer
          src="/photo.jpg"
          type="image"
          alt="My photo"
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
```

### С навигацией по галерее

```jsx
import { useState } from "react";
import MediaViewer from "@/components/MediaViewer";

function Gallery({ photos }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <>
      <div className="grid">
        {photos.map((photo, index) => (
          <img
            key={photo.id}
            src={photo.imageUrl}
            onClick={() => setSelectedIndex(index)}
          />
        ))}
      </div>

      {selectedPhoto && (
        <MediaViewer
          src={selectedPhoto.imageUrl}
          type="image"
          alt={selectedPhoto.caption}
          title={selectedPhoto.caption}
          onClose={() => setSelectedIndex(null)}
          items={photos}
          currentIndex={selectedIndex}
          onNavigate={setSelectedIndex}
        />
      )}
    </>
  );
}
```

### Для видео

```jsx
<MediaViewer
  src="/video.mp4"
  type="video"
  alt="My video"
  onClose={() => setIsOpen(false)}
/>
```

## Props

| Prop | Тип | Обязательный | Описание |
|------|-----|--------------|----------|
| `src` | `string` | ✅ | URL изображения или видео |
| `type` | `"image" \| "video"` | ✅ | Тип медиа |
| `alt` | `string` | ❌ | Alt текст для изображения |
| `title` | `string` | ❌ | Заголовок, отображается над медиа |
| `onClose` | `() => void` | ✅ | Callback при закрытии |
| `items` | `MediaItem[]` | ❌ | Массив элементов для навигации |
| `currentIndex` | `number` | ❌ | Текущий индекс в галерее |
| `onNavigate` | `(index: number) => void` | ❌ | Callback при переключении элемента |

### MediaItem Type

```typescript
type MediaItem = {
  id: string;
  imageUrl: string;
  caption?: string | null;
  mediaType?: "image" | "video" | null;
};
```

## Управление

- **Escape** — закрыть viewer
- **← (Left Arrow)** — предыдущее изображение
- **→ (Right Arrow)** — следующее изображение
- **Клик на затемненный фон** — закрыть viewer
- **Клик на кнопку ×** — закрыть viewer

## Интеграция в проекте

### PhotoGallery.js
Использует MediaViewer для просмотра фото из профиля с навигацией.

### PhotosGrid.js
Использует MediaViewer для просмотра всех фото на странице /photos.

### PostCard.tsx
Использует MediaViewer для просмотра изображений и видео в постах.

## Адаптивность

- **Desktop**: полноразмерные кнопки навигации
- **Tablet (≤768px)**: уменьшенные кнопки, двухколоночная сетка
- **Mobile (≤480px)**: одноколоночная сетка, компактные кнопки

## Стили

Все адаптивные стили находятся в `src/app/globals.css` в секции "Media Viewer Responsive Styles".
