/**
 * Pure helper functions for the Today Dashboard.
 *
 * All time-of-day logic uses the campus timezone so the server
 * always matches what a student sees on-campus — regardless of
 * where the Node process is deployed (Vercel, Railway, etc.).
 */

// ─── Campus timezone ────────────────────────────────────────────────────────

export const CAMPUS_TZ =
  process.env.NEXT_PUBLIC_CAMPUS_TIMEZONE || "Asia/Yerevan";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ClassStatus = "past" | "current" | "next" | "upcoming";

export type ScheduleItem = {
  id: string;
  courseName: string;
  courseCode: string | null;
  room: string | null;
  dayOfWeek: number; // 0 = Monday … 6 = Sunday
  startTime: string; // "09:00"
  endTime: string;   // "10:30"
};

export type DeadlineItem = {
  id: string;
  title: string;
  eventType: string;
  dueDate: Date;
};

export type MaterialItem = {
  id: string;
  title: string;
  type: string | null;
  courseCode: string | null;
  createdAt: Date | null;
};

export type EventItem = {
  id: string;
  title: string;
  startTime: Date;
  location: string | null;
  eventType: string;
  description: string | null;
  communityName: string | null;
  courseCode: string | null;
};

// ─── Timezone helpers ───────────────────────────────────────────────────────

/**
 * Return the current wall-clock parts in the given IANA timezone.
 * We use Intl.DateTimeFormat to extract the parts so Node doesn't
 * need a polyfill — V8 ships full ICU data.
 */
export function getCampusNow(timeZone: string = CAMPUS_TZ) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const weekdayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  return {
    date: now,
    hour,
    minute,
    timeStr,            // "14:05"
    dayOfWeek: weekdayMap[get("weekday")] ?? 0, // 0=Mon
    dayNum: parseInt(get("day"), 10),
    month: parseInt(get("month"), 10),
    year: parseInt(get("year"), 10),
  };
}

/**
 * Get the Monday-based day-of-week (0=Mon..6=Sun) for an arbitrary
 * Date in the given timezone.
 */
export function getDayOfWeekInTimezone(
  date: Date,
  timeZone: string = CAMPUS_TZ,
): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);

  const map: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  };
  return map[wd] ?? 0;
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

/**
 * "Today" / "Tomorrow" / "In 3 days" / formatted date.
 * Uses `locale` for the fallback date format only.
 */
export function formatRelativeDay(
  date: Date,
  locale: string,
  timeZone: string = CAMPUS_TZ,
): string {
  const now = new Date();

  // Build midnight-aligned "dates" in the campus timezone by formatting both
  // to YYYY-MM-DD and comparing those strings.
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d); // en-CA → "2026-06-02"

  const todayStr = fmt(now);
  const targetStr = fmt(date);

  const diffMs =
    new Date(targetStr).getTime() - new Date(todayStr).getTime();
  const diffDays = Math.round(diffMs / 86_400_000);

  if (diffDays === 0) return getRelativeLabel("today", locale);
  if (diffDays === 1) return getRelativeLabel("tomorrow", locale);
  if (diffDays >= 2 && diffDays <= 6) {
    return getRelativeLabel("inDays", locale).replace("{n}", String(diffDays));
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(date);
}

function getRelativeLabel(
  key: "today" | "tomorrow" | "inDays",
  locale: string,
): string {
  const map: Record<string, Record<string, string>> = {
    "en-US": { today: "Today", tomorrow: "Tomorrow", inDays: "In {n} days" },
    "fr-FR": { today: "Aujourd\u2019hui", tomorrow: "Demain", inDays: "Dans {n} jours" },
    "hy-AM": { today: "\u0531\u0575\u057d\u0585\u0580", tomorrow: "\u054e\u0561\u0572\u0568", inDays: "{n} \u0585\u0580\u056b\u0581" },
  };
  const dict = map[locale] ?? map["en-US"];
  return dict[key] ?? key;
}

/**
 * Format a Date to "HH:MM" in the campus timezone.
 */
export function formatTime(
  date: Date,
  locale: string,
  timeZone: string = CAMPUS_TZ,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

// ─── Greeting ───────────────────────────────────────────────────────────────

/**
 * Time-of-day greeting for the dashboard header.
 * Uses the `today.goodMorning/goodAfternoon/goodEvening` i18n keys
 * via a simple internal map. The real i18n `t()` function is used
 * in the component; this serves as the fallback/standalone version.
 */
export function getGreeting(
  hour: number,
  lang: string,
  firstName: string,
): string {
  let key: "goodMorning" | "goodAfternoon" | "goodEvening";
  if (hour < 12) key = "goodMorning";
  else if (hour < 18) key = "goodAfternoon";
  else key = "goodEvening";

  const greetings: Record<string, Record<string, string>> = {
    en: {
      goodMorning: "Good morning",
      goodAfternoon: "Good afternoon",
      goodEvening: "Good evening",
    },
    fr: {
      goodMorning: "Bonjour",
      goodAfternoon: "Bon apr\u00e8s-midi",
      goodEvening: "Bonsoir",
    },
    hy: {
      goodMorning: "\u0532\u0561\u0580\u056b \u056c\u0578\u0582\u0575\u057d",
      goodAfternoon: "\u0532\u0561\u0580\u056b \u0585\u0580",
      goodEvening: "\u0532\u0561\u0580\u056b \u0565\u0580\u0565\u056f\u0578",
    },
  };

  const dict = greetings[lang] ?? greetings["en"];
  const greeting = dict[key] ?? "Hello";

  return firstName ? `${greeting}, ${firstName}` : greeting;
}

// ─── Class status ───────────────────────────────────────────────────────────

/**
 * Determine class status relative to "now" in campus time.
 * `nowDay` is Mon=0..Sun=6, `nowTime` is "HH:MM".
 */
export function getClassStatus(
  cls: ScheduleItem,
  nowDay: number,
  nowTime: string,
): ClassStatus {
  if (cls.dayOfWeek !== nowDay) return "upcoming";
  if (nowTime >= cls.endTime) return "past";
  if (nowTime >= cls.startTime && nowTime < cls.endTime) return "current";
  return "upcoming";
}

// ─── Safe enum display ──────────────────────────────────────────────────────

const MATERIAL_TYPE_LABELS: Record<string, Record<string, string>> = {
  en: {
    lecture_notes: "Lecture notes",
    summary: "Summary",
    slides: "Slides",
    past_questions: "Past questions",
    exam_prep: "Exam prep",
    formula_sheet: "Formula sheet",
    template: "Template",
    case_study: "Case study",
    project_example: "Project example",
    cheat_sheet: "Cheat sheet",
    language_practice: "Language practice",
    useful_link: "Useful link",
    other: "Document",
  },
  fr: {
    lecture_notes: "Notes de cours",
    summary: "R\u00e9sum\u00e9",
    slides: "Diapositives",
    past_questions: "Annales",
    exam_prep: "Pr\u00e9paration d\u2019examen",
    formula_sheet: "Formulaire",
    template: "Mod\u00e8le",
    case_study: "\u00c9tude de cas",
    project_example: "Exemple de projet",
    cheat_sheet: "Aide-m\u00e9moire",
    language_practice: "Exercice de langue",
    useful_link: "Lien utile",
    other: "Document",
  },
  hy: {
    lecture_notes: "\u0534\u0561\u057d\u0561\u056d\u0578\u057d\u056b \u0576\u0578\u0569\u0565\u0580",
    summary: "\u0531\u0574\u0583\u0578\u0583\u0578\u0582\u0574",
    slides: "\u054d\u056c\u0561\u0575\u0564\u0565\u0580",
    past_questions: "\u0546\u0561\u056d\u056f\u056b\u0576 \u0570\u0561\u0580\u0581\u0565\u0580",
    exam_prep: "\u0554\u0576\u0576\u0561\u056f\u0561\u0576 \u0576\u0561\u056d\u0561\u057a\u0561\u057f\u0580\u0561\u057d\u057f\u0578\u0582\u0574",
    formula_sheet: "\u0532\u0561\u0576\u0561\u0571\u0587\u0565\u0580",
    template: "\u0546\u0574\u0578\u0582\u0577",
    case_study: "\u053f\u0565\u0575\u057d \u057d\u0569\u0561\u0564\u056b",
    project_example: "\u0546\u0561\u056d\u0561\u0563\u056e\u056b \u0585\u0580\u056b\u0576\u0561\u056f",
    cheat_sheet: "\u0555\u0563\u0576\u0561\u056f\u0561\u0576 \u0569\u0565\u0580\u0569\u056b\u056f",
    language_practice: "\u053c\u0565\u0566\u057e\u0561\u056f\u0561\u0576 \u057e\u0561\u0580\u056a\u0578\u0582\u0569\u0575\u0578\u0582\u0576",
    useful_link: "\u0555\u0563\u057f\u0561\u056f\u0561\u0580 \u0570\u0572\u0578\u0582\u0574",
    other: "\u0553\u0561\u057d\u057f\u0561\u0569\u0578\u0582\u0572\u0569",
  },
};

/**
 * Map raw material_type enum value to human-readable label.
 * Returns a safe fallback ("Document") if the type is null or unknown.
 */
export function safeMaterialType(
  type: string | null | undefined,
  lang: string,
): string {
  if (!type) return MATERIAL_TYPE_LABELS[lang]?.other ?? "Document";
  const dict = MATERIAL_TYPE_LABELS[lang] ?? MATERIAL_TYPE_LABELS["en"];
  return dict[type] ?? dict["other"] ?? "Document";
}

const DEADLINE_TYPE_LABELS: Record<string, Record<string, string>> = {
  en: {
    deadline: "Deadline",
    exam: "Exam",
    homework: "Homework",
    assignment: "Assignment",
    project: "Project",
    event: "Event",
    personal: "Personal",
    community: "Group",
    lecture: "Lecture",
    holiday: "Holiday",
    other: "Other",
  },
  fr: {
    deadline: "\u00c9ch\u00e9ance",
    exam: "Examen",
    homework: "Devoir",
    assignment: "Travail",
    project: "Projet",
    event: "\u00c9v\u00e9nement",
    personal: "Personnel",
    community: "Groupe",
    lecture: "Cours",
    holiday: "Vacances",
    other: "Autre",
  },
  hy: {
    deadline: "\u054e\u0565\u0580\u056a\u0576\u0561\u0569\u0565\u0569",
    exam: "\u0554\u0576\u0576\u0578\u0582\u0569\u0575\u0578\u0582\u0576",
    homework: "\u054f\u0576\u0561\u0575\u056b\u0576 \u0561\u0577\u056d\u0561\u057f\u0561\u0576\u0584",
    assignment: "\u0540\u0561\u0576\u0571\u0576\u0561\u0580\u0561\u0580\u0578\u0582\u0569\u0575\u0578\u0582\u0576",
    project: "\u0546\u0561\u056d\u0561\u0563\u056b\u056e",
    event: "\u053b\u0580\u0561\u0564\u0561\u0580\u0562\u0575\u0578\u0582\u0569\u0575\u0578\u0582\u0576",
    personal: "\u0531\u0576\u0571\u0576\u0561\u056f\u0561\u0576",
    community: "\u053d\u0578\u0582\u0574\u0562",
    lecture: "\u0534\u0561\u057d\u0561\u056d\u0578\u057d",
    holiday: "\u054f\u0578\u0576",
    other: "\u0531\u0575\u056c",
  },
};

/**
 * Map raw calendar event_type enum to human-readable label.
 */
export function safeDeadlineType(
  type: string | null | undefined,
  lang: string,
): string {
  if (!type) return DEADLINE_TYPE_LABELS[lang]?.other ?? "Other";
  const dict = DEADLINE_TYPE_LABELS[lang] ?? DEADLINE_TYPE_LABELS["en"];
  return dict[type] ?? dict["other"] ?? "Other";
}

// ─── Language validation ────────────────────────────────────────────────────

const ALLOWED_LANGUAGES = ["en", "fr", "hy"] as const;
export type ValidLanguage = (typeof ALLOWED_LANGUAGES)[number];

/**
 * Validate a language cookie value. Only `en`, `fr`, `hy` are allowed.
 * Everything else falls back to `"en"`.
 */
export function validateLanguage(value: string | undefined): ValidLanguage {
  if (value && (ALLOWED_LANGUAGES as readonly string[]).includes(value)) {
    return value as ValidLanguage;
  }
  return "en";
}

/**
 * Map validated lang to a BCP-47 locale string for Intl APIs.
 */
export function langToLocale(lang: string): string {
  if (lang === "hy") return "hy-AM";
  if (lang === "fr") return "fr-FR";
  return "en-US";
}
