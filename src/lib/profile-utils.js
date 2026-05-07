// Утилиты для работы с gender и relationshipStatus
import { translations } from "./i18n";

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

export function getGenderLabel(gender, language = "en") {
  const lang = translations[language] || translations.en;
  const genderOptions = lang.profile.genderOptions;
  return genderOptions[gender] || genderOptions.prefer_not_to_say;
}

export function getRelationshipStatusLabel(status, language = "en") {
  const lang = translations[language] || translations.en;
  const relationshipOptions = lang.profile.relationshipOptions;
  return relationshipOptions[status] || relationshipOptions.prefer_not_to_say;
}
