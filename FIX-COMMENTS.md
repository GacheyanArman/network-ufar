# Исправление: Комментарии исчезают при клике

## Проблема
При клике на кнопку "Comments" секция комментариев появлялась на миллисекунду и сразу исчезала.

## Причина
Состояние `showComments` было внутри `useOptimistic`, который предназначен для оптимистичных обновлений с сервером. При каждом ре-рендере это состояние сбрасывалось к начальному значению.

## Решение
Переместили `showComments` в отдельный `useState`:

```tsx
// Было (неправильно):
const [state, updateOptimistic] = useOptimistic({
  showComments: false,
  // ...
});

function handleToggleComments() {
  startTransition(() => {
    updateOptimistic({ type: "toggleComments" });
  });
}

// Стало (правильно):
const [showComments, setShowComments] = useState(false);

function handleToggleComments() {
  setShowComments((prev) => !prev);
}
```

## Файлы изменены
- `src/components/PostCard.tsx`

## Результат
✅ Комментарии теперь остаются открытыми после клика
✅ Можно переключать видимость комментариев
✅ Build проходит успешно

---

**Дата:** 30 апреля 2026, 11:40
