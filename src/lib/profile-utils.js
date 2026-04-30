// Утилиты для работы с gender и relationshipStatus

export const GENDER_OPTIONS = [
  { value: "male", label: "Мужской" },
  { value: "female", label: "Женский" },
  { value: "other", label: "Другое" },
  { value: "prefer_not_to_say", label: "Не указано" },
];

export const RELATIONSHIP_STATUS_OPTIONS = [
  { value: "single", label: "Свободен / свободна" },
  { value: "in_relationship", label: "В отношениях" },
  { value: "complicated", label: "Всё сложно" },
  { value: "prefer_not_to_say", label: "Не указано" },
];

export function getGenderLabel(gender) {
  const option = GENDER_OPTIONS.find((opt) => opt.value === gender);
  return option ? option.label : "Не указано";
}

export function getRelationshipStatusLabel(status) {
  const option = RELATIONSHIP_STATUS_OPTIONS.find((opt) => opt.value === status);
  return option ? option.label : "Не указано";
}
