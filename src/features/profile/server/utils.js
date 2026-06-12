// Утилиты для работы с gender и relationshipStatus
import { translations } from "@/shared/i18n/i18n";

export const FACULTY_OPTIONS = [
  "management", "marketing", "finance", "computerScience",
  "law", "internationalRelations", "languages", "economics", "other",
];

export function getFacultyLabel(faculty, language = "en") {
  if (!faculty) return "";
  const lang = translations[language] || translations.en;
  const facultyLabels = lang.onboarding?.faculty;
  if (facultyLabels && facultyLabels[faculty]) return facultyLabels[faculty];
  return faculty;
}

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

// --- "Open to" (soft social intent, stored as `open_*` tokens inside users.looking_for) ---

export const OPEN_TO_PREFIX = "open_";

export const OPEN_TO_VALUES = [
  "new_friends",
  "study_partner",
  "events",
  "dating",
  "not_looking",
  "private",
];

/** Extracts the "open to" base values (without prefix) from a looking_for string. */
export function parseOpenTo(lookingFor) {
  if (!lookingFor) return [];
  return lookingFor
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.startsWith(OPEN_TO_PREFIX))
    .map((t) => t.slice(OPEN_TO_PREFIX.length))
    .filter((t) => OPEN_TO_VALUES.includes(t));
}

/** Returns the non-"open to" tokens of a looking_for string (onboarding interests etc.). */
export function parseLookingForRest(lookingFor) {
  if (!lookingFor) return [];
  return lookingFor
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t && !t.startsWith(OPEN_TO_PREFIX));
}

/** Serializes rest tokens + selected "open to" values back into one looking_for string. */
export function serializeLookingFor(restTokens, openToValues) {
  const open = (openToValues || [])
    .filter((v) => OPEN_TO_VALUES.includes(v))
    .map((v) => `${OPEN_TO_PREFIX}${v}`);
  return [...(restTokens || []), ...open].join(",");
}

export function getOpenToLabel(value, language = "en") {
  const lang = translations[language] || translations.en;
  const openToOptions = lang.profile?.openToOptions || translations.en.profile.openToOptions;
  return openToOptions[value] || value;
}
