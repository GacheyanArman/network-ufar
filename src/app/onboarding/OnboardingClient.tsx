"use client";

import { useState, useActionState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import UiIcon from "@/shared/ui/UiIcon";
import { completeOnboarding } from "@/features/auth/server/onboarding";

function interpolate(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

type Props = {
  initialFaculty: string;
  initialYear: string;
  initialGroup: string;
  initialGender: string;
  initialRelationshipStatus: string;
  initialBirthDate: string;
  initialInterests: string;
  initialLanguages: string;
  initialLookingFor: string;
};

const STEPS = ["faculty", "program", "year", "courses", "group", "interests", "languages", "lookingFor"] as const;

export default function OnboardingClient({
  initialFaculty,
  initialYear,
  initialGroup,
  initialGender,
  initialRelationshipStatus,
  initialBirthDate,
  initialInterests,
  initialLanguages,
  initialLookingFor,
}: Props) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [faculty, setFaculty] = useState(initialFaculty);
  const [program, setProgram] = useState("");
  const [year, setYear] = useState(initialYear);
  const [courses, setCourses] = useState("");
  const [studyGroup, setStudyGroup] = useState(initialGroup);
  const [gender, setGender] = useState(initialGender);
  const [relationshipStatus, setRelationshipStatus] = useState(initialRelationshipStatus);
  const [birthDate, setBirthDate] = useState(initialBirthDate);
  const [interestsSet, setInterestsSet] = useState<Set<string>>(
    new Set(initialInterests ? initialInterests.split(",") : []),
  );
  const [langsSet, setLangsSet] = useState<Set<string>>(
    new Set(initialLanguages ? initialLanguages.split(",") : []),
  );
  const [lookingForSet, setLookingForSet] = useState<Set<string>>(
    new Set(initialLookingFor ? initialLookingFor.split(",") : []),
  );

  const [state, formAction, isPending] = useActionState(completeOnboarding, null);

  const totalSteps = STEPS.length;
  const currentKey = STEPS[step];
  const progress = ((step + 1) / totalSteps) * 100;

  const canNext = () => {
    if (currentKey === "faculty") return faculty.length > 0;
    if (currentKey === "program") return program.length > 0;
    if (currentKey === "year") return year.length > 0;
    if (currentKey === "courses") return courses.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < totalSteps - 1) setStep(step + 1);
  };
  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const fd = new FormData(e.currentTarget);
    fd.set("faculty", faculty);
    fd.set("program", program);
    fd.set("year", year);
    fd.set("courses", courses);
    fd.set("studyGroup", studyGroup);
    fd.set("interests", Array.from(interestsSet).join(","));
    fd.set("languages", Array.from(langsSet).join(","));
    fd.set("lookingFor", Array.from(lookingForSet).join(","));
  };

  const toggleItem = (set: Set<string>, setter: (s: Set<string>) => void, val: string) => {
    const n = new Set(set);
    if (n.has(val)) n.delete(val);
    else n.add(val);
    setter(n);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "linear-gradient(135deg, #eef3ff 0%, #f8fafc 45%, #ffffff 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--french-blue-deep)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              fontWeight: 800,
              margin: "0 auto 14px",
              boxShadow: "0 12px 30px rgba(11, 58, 168, 0.28)",
            }}
          >
            U
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 900,
              color: "var(--text-primary)",
            }}
          >
            {t("onboarding.welcome")}
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              color: "var(--text-secondary)",
              fontSize: "0.92rem",
            }}
          >
            {t("onboarding.subtitle")}
          </p>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 4,
            background: "var(--border-color)",
            borderRadius: 4,
            marginBottom: 24,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "var(--french-blue-deep)",
              borderRadius: 4,
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Step label */}
        <div
          style={{
            fontSize: "0.78rem",
            fontWeight: 800,
            color: "var(--text-secondary)",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          {interpolate(t("onboarding.step"), { n: step + 1, total: totalSteps })}
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          action={formAction}
          style={{
            background: "var(--bg-card)",
            border: "1px solid #e5e7eb",
            borderRadius: 22,
            padding: "28px 26px",
            boxShadow: "0 24px 70px rgba(15, 23, 42, 0.1)",
          }}
        >
          {state?.error && (
            <div
              style={{
                color: "#b42318",
                fontSize: "0.85rem",
                textAlign: "center",
                background: "var(--danger-soft)",
                border: "1px solid #fecdca",
                padding: 10,
                borderRadius: 12,
                marginBottom: 14,
              }}
            >
              {state.error}
            </div>
          )}

          {/* Hidden fields for all data */}
          <input type="hidden" name="faculty" value={faculty} />
          <input type="hidden" name="program" value={program} />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="courses" value={courses} />
          <input type="hidden" name="studyGroup" value={studyGroup} />
          <input type="hidden" name="gender" value={gender} />
          <input type="hidden" name="relationshipStatus" value={relationshipStatus} />
          <input type="hidden" name="birthDate" value={birthDate} />
          <input type="hidden" name="interests" value={Array.from(interestsSet).join(",")} />
          <input type="hidden" name="languages" value={Array.from(langsSet).join(",")} />
          <input type="hidden" name="lookingFor" value={Array.from(lookingForSet).join(",")} />

          {currentKey === "faculty" && (
            <StepFaculty faculty={faculty} setFaculty={setFaculty} />
          )}
          {currentKey === "program" && (
            <StepProgram program={program} setProgram={setProgram} />
          )}
          {currentKey === "year" && (
            <StepYear year={year} setYear={setYear} />
          )}
          {currentKey === "courses" && (
            <StepCourses courses={courses} setCourses={setCourses} />
          )}
          {currentKey === "group" && (
            <StepGroup group={studyGroup} setGroup={setStudyGroup} />
          )}

          {currentKey === "interests" && (
            <StepChips
              title={t("onboarding.interests.title")}
              hint={t("onboarding.interests.hint")}
              items={[
                "technology", "business", "arts", "sports", "music", "science",
                "travel", "cooking", "photography", "gaming", "reading",
                "volunteering", "fashion", "languages2", "cinema",
              ]}
              labelPrefix="onboarding.interests"
              selected={interestsSet}
              onToggle={(v) => toggleItem(interestsSet, setInterestsSet, v)}
            />
          )}
          {currentKey === "languages" && (
            <StepChips
              title={t("onboarding.languages.title")}
              hint={t("onboarding.languages.hint")}
              items={[
                "armenian", "french", "english", "russian", "spanish",
                "german", "italian", "arabic", "persian", "chinese",
              ]}
              labelPrefix="onboarding.languages"
              selected={langsSet}
              onToggle={(v) => toggleItem(langsSet, setLangsSet, v)}
            />
          )}
          {currentKey === "lookingFor" && (
            <StepChips
              title={t("onboarding.lookingFor.title")}
              hint={t("onboarding.lookingFor.hint")}
              items={[
                "friends", "studyGroups", "internships", "erasmus",
                "materials", "clubs", "mentorship", "networking",
              ]}
              labelPrefix="onboarding.lookingFor"
              selected={lookingForSet}
              onToggle={(v) => toggleItem(lookingForSet, setLookingForSet, v)}
            />
          )}

          {/* Navigation */}
          <div
            style={{
              display: "flex",
              justifyContent: step > 0 ? "space-between" : "flex-end",
              marginTop: 22,
              gap: 8,
            }}
          >
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  padding: "12px 20px",
                  borderRadius: 12,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                {t("onboarding.back")}
              </button>
            )}
            {step < totalSteps - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canNext()}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: canNext() ? "var(--french-blue-deep)" : "var(--text-muted)",
                  color: "white",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  cursor: canNext() ? "pointer" : "not-allowed",
                  boxShadow: canNext()
                    ? "0 8px 24px rgba(11, 58, 168, 0.24)"
                    : "none",
                }}
              >
                {t("onboarding.next")}
              </button>
            ) : (
              <button
                type="submit"
                disabled={isPending}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: isPending ? "var(--text-muted)" : "var(--french-blue-deep)",
                  color: "white",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  cursor: isPending ? "not-allowed" : "pointer",
                  boxShadow: isPending
                    ? "none"
                    : "0 8px 24px rgba(11, 58, 168, 0.24)",
                }}
              >
                {isPending ? t("onboarding.saving") : t("onboarding.finish")}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

function StepFaculty({
  faculty,
  setFaculty,
}: {
  faculty: string;
  setFaculty: (v: string) => void;
}) {
  const { t } = useLanguage();
  const options = [
    "management", "marketing", "finance", "computerScience",
    "law", "internationalRelations", "languages", "economics", "other",
  ];
  return (
    <div>
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: "1.15rem",
          fontWeight: 900,
          color: "var(--text-primary)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <UiIcon name="graduation" size={20} /> {t("onboarding.faculty.title")}
        </span>
      </h2>
      <p style={{ margin: "0 0 14px", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
        {t("onboarding.faculty.placeholder")}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 6,
        }}
      >
        {options.map((opt) => {
          const active = faculty === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setFaculty(opt)}
              style={{
                borderRadius: 10,
                padding: "10px 12px",
                border: `1px solid ${active ? "var(--french-blue-deep)" : "var(--border-color)"}`,
                background: active ? "var(--french-blue-soft)" : "var(--bg-card)",
                color: active ? "var(--french-blue-deep)" : "var(--text-primary)",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.85rem",
                textAlign: "left",
              }}
            >
              {t(`onboarding.faculty.${opt}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepProgram({
  program,
  setProgram,
}: {
  program: string;
  setProgram: (v: string) => void;
}) {
  const { t } = useLanguage();
  const options = ["Bachelor", "Master", "PhD", "Exchange"];
  return (
    <div>
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: "1.15rem",
          fontWeight: 900,
          color: "var(--text-primary)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <UiIcon name="book" size={20} /> Program / Degree
        </span>
      </h2>
      <p style={{ margin: "0 0 14px", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
        Select your degree level.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 6,
        }}
      >
        {options.map((opt) => {
          const active = program === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setProgram(opt)}
              style={{
                borderRadius: 10,
                padding: "10px 12px",
                border: `1px solid ${active ? "var(--french-blue-deep)" : "var(--border-color)"}`,
                background: active ? "var(--french-blue-soft)" : "var(--bg-card)",
                color: active ? "var(--french-blue-deep)" : "var(--text-primary)",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.85rem",
                textAlign: "left",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepYear({
  year,
  setYear,
}: {
  year: string;
  setYear: (v: string) => void;
}) {
  const { t } = useLanguage();
  const options = ["y1", "y2", "y3", "y4", "master", "phd"];
  return (
    <div>
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: "1.15rem",
          fontWeight: 900,
          color: "var(--text-primary)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <UiIcon name="calendar" size={20} /> {t("onboarding.year.title")}
        </span>
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 6,
          marginTop: 14,
        }}
      >
        {options.map((opt) => {
          const active = year === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setYear(opt)}
              style={{
                borderRadius: 10,
                padding: "12px 10px",
                border: `1px solid ${active ? "var(--french-blue-deep)" : "var(--border-color)"}`,
                background: active ? "var(--french-blue-soft)" : "var(--bg-card)",
                color: active ? "var(--french-blue-deep)" : "var(--text-primary)",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.85rem",
                textAlign: "center",
              }}
            >
              {t(`onboarding.year.${opt}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepCourses({
  courses,
  setCourses,
}: {
  courses: string;
  setCourses: (v: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <div>
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: "1.15rem",
          fontWeight: 900,
          color: "var(--text-primary)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <UiIcon name="layers" size={20} /> Enrolled Courses
        </span>
      </h2>
      <p style={{ margin: "0 0 14px", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
        Enter the names or codes of the courses you are taking this semester (comma-separated).
      </p>
      <input
        value={courses}
        onChange={(e) => setCourses(e.target.value)}
        placeholder="e.g. Intro to CS, Math 101, Physics"
        style={{
          width: "100%",
          height: 46,
          boxSizing: "border-box",
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          padding: "0 14px",
          fontSize: "0.95rem",
          outline: "none",
          background: "var(--bg-soft)",
          color: "var(--text-primary)",
        }}
      />
    </div>
  );
}

function StepGroup({
  group,
  setGroup,
}: {
  group: string;
  setGroup: (v: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <div>
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: "1.15rem",
          fontWeight: 900,
          color: "var(--text-primary)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <UiIcon name="users" size={20} /> {t("onboarding.group.title")}
        </span>
      </h2>
      <p style={{ margin: "0 0 14px", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
        {t("onboarding.group.hint")}
      </p>
      <input
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        placeholder={t("onboarding.group.placeholder")}
        style={{
          width: "100%",
          height: 46,
          boxSizing: "border-box",
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          padding: "0 14px",
          fontSize: "0.95rem",
          outline: "none",
          background: "var(--bg-soft)",
          color: "var(--text-primary)",
        }}
      />
    </div>
  );
}

function StepGender({
  gender,
  setGender,
}: {
  gender: string;
  setGender: (v: string) => void;
}) {
  const { t } = useLanguage();
  const options = ["male", "female", "other", "prefer_not_to_say"];
  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: "1.15rem", fontWeight: 900, color: "var(--text-primary)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <UiIcon name="user" size={20} /> {t("onboarding.gender.title")}
        </span>
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 14 }}>
        {options.map((opt) => {
          const active = gender === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setGender(opt)}
              style={{
                borderRadius: 10,
                padding: "12px 10px",
                border: `1px solid ${active ? "var(--french-blue-deep)" : "var(--border-color)"}`,
                background: active ? "var(--french-blue-soft)" : "var(--bg-card)",
                color: active ? "var(--french-blue-deep)" : "var(--text-primary)",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.85rem",
                textAlign: "center",
              }}
            >
              {t(`profile.genderOptions.${opt}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepBirthDate({
  value,
  setValue,
}: {
  value: string;
  setValue: (v: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: "1.15rem", fontWeight: 900, color: "var(--text-primary)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <UiIcon name="calendar" size={20} /> {t("onboarding.birthDate.title")}
        </span>
      </h2>
      <p style={{ margin: "0 0 14px", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
        {t("onboarding.birthDate.hint")}
      </p>
      <input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        max={new Date().toISOString().split("T")[0]}
        required
        style={{
          width: "100%",
          height: 46,
          boxSizing: "border-box",
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          padding: "0 14px",
          fontSize: "0.95rem",
          outline: "none",
          background: "var(--bg-soft)",
          color: "var(--text-primary)",
        }}
      />
    </div>
  );
}

function StepChips({
  title,
  hint,
  items,
  labelPrefix,
  selected,
  onToggle,
}: {
  title: string;
  hint: string;
  items: string[];
  labelPrefix: string;
  selected: Set<string>;
  onToggle: (val: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <div>
      <h2
        style={{
          margin: "0 0 4px",
          fontSize: "1.15rem",
          fontWeight: 900,
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h2>
      <p style={{ margin: "0 0 14px", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
        {hint}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((item) => {
          const active = selected.has(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              style={{
                borderRadius: 999,
                padding: "8px 14px",
                border: `1px solid ${active ? "var(--french-blue-deep)" : "var(--border-color)"}`,
                background: active ? "var(--french-blue-soft)" : "var(--bg-card)",
                color: active ? "var(--french-blue-deep)" : "var(--text-primary)",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              {t(`${labelPrefix}.${item}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
