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
};

const STEPS = ["faculty", "year", "courses"] as const;

export default function OnboardingClient({
  initialFaculty,
  initialYear,
  initialGroup,
}: Props) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [faculty, setFaculty] = useState(initialFaculty);
  const [year, setYear] = useState(initialYear);
  const [courses, setCourses] = useState("");
  const [studyGroup, setStudyGroup] = useState(initialGroup);

  const [state, formAction, isPending] = useActionState(completeOnboarding, null);

  const totalSteps = STEPS.length;
  const currentKey = STEPS[step];
  const progress = ((step + 1) / totalSteps) * 100;

  const canNext = () => {
    if (currentKey === "faculty") return faculty.length > 0;
    if (currentKey === "year") return year.length > 0;
    if (currentKey === "courses")
      return courses.trim().length > 0 || studyGroup.trim().length > 0;
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
    fd.set("year", year);
    fd.set("courses", courses);
    fd.set("studyGroup", studyGroup);
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
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="courses" value={courses} />
          <input type="hidden" name="studyGroup" value={studyGroup} />

          {currentKey === "faculty" && (
            <StepFaculty faculty={faculty} setFaculty={setFaculty} />
          )}
          {currentKey === "year" && (
            <StepYear year={year} setYear={setYear} />
          )}
          {currentKey === "courses" && (
            <StepCoursesGroup
              courses={courses}
              setCourses={setCourses}
              group={studyGroup}
              setGroup={setStudyGroup}
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
                disabled={isPending || !canNext()}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "none",
                  background:
                    isPending || !canNext()
                      ? "var(--text-muted)"
                      : "var(--french-blue-deep)",
                  color: "white",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  cursor: isPending || !canNext() ? "not-allowed" : "pointer",
                  boxShadow:
                    isPending || !canNext()
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

function StepCoursesGroup({
  courses,
  setCourses,
  group,
  setGroup,
}: {
  courses: string;
  setCourses: (v: string) => void;
  group: string;
  setGroup: (v: string) => void;
}) {
  const { t } = useLanguage();
  const inputStyle: React.CSSProperties = {
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
  };
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
          <UiIcon name="layers" size={20} /> Courses / Group
        </span>
      </h2>
      <p style={{ margin: "0 0 14px", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
        Enter the names or codes of the courses you are taking this semester (comma-separated).
      </p>
      <input
        value={courses}
        onChange={(e) => setCourses(e.target.value)}
        placeholder="e.g. Intro to CS, Math 101, Physics"
        style={inputStyle}
      />
      <p style={{ margin: "14px 0 8px", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
        {t("onboarding.group.hint")}
      </p>
      <input
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        placeholder={t("onboarding.group.placeholder")}
        style={inputStyle}
      />
    </div>
  );
}
