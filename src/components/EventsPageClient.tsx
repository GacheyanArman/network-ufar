"use client";

import { useMemo, useState, useRef } from "react";
import { createEvent, deleteEvent, rsvpToEvent } from "@/app/actions/events";
import { useLanguage } from "@/contexts/LanguageContext";

type FormAction = (formData: FormData) => void | Promise<void>;

const createEventAction = createEvent as unknown as FormAction;
const rsvpToEventAction = rsvpToEvent as unknown as FormAction;
const deleteEventAction = deleteEvent as unknown as FormAction;

const ATTENDEE_PRESETS = [
  { label: "10", value: 10 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "200", value: 200 },
  { label: "No limit", value: 0 },
];

type RsvpStatus = "going" | "interested" | "not_going" | null;

type EventItem = {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  imageUrl: string | null;
  maxAttendees: number | null;
  organizerId: string;
  organizerName: string;
  organizerImage: string | null;
  communityName: string | null;
  createdAt: string | null;
  goingCount: number;
  maybeCount: number;
  notGoingCount: number;
  rsvpStatus: RsvpStatus;
};

type EventsPageClientProps = {
  events: EventItem[];
  currentUserId: string;
};

const copy = {
  en: {
    title: "Events",
    subtitle:
      "Discover what’s happening at UFAR — academic events, clubs, parties, sports, Erasmus, career and student life.",
    search: "Search events...",
    createEvent: "Create Event",
    suggestEvent: "Suggest Event",
    myEvents: "My Events",
    featured: "Featured Events",
    upcoming: "Upcoming Events",
    categories: "Categories",
    going: "Going",
    maybe: "Maybe",
    notGoing: "Not Going",
    save: "Save",
    saved: "Saved",
    addCalendar: "Add to Calendar",
    noEvents: "No events this week. Check back soon or suggest an event.",
    titleField: "Title",
    typeField: "Type",
    descriptionField: "Description",
    locationField: "Location",
    startTimeField: "Start Time",
    endTimeField: "End Time",
    maxAttendeesField: "Max Attendees",
    coverField: "Cover image URL",
    cancel: "Cancel",
    delete: "Delete",
    organizer: "Organizer",
  },
  ru: {
    title: "Events",
    subtitle:
      "Discover what’s happening at UFAR — academic events, clubs, parties, sports, Erasmus, career and student life.",
    search: "Search events...",
    createEvent: "Create Event",
    suggestEvent: "Suggest Event",
    myEvents: "My Events",
    featured: "Featured Events",
    upcoming: "Upcoming Events",
    categories: "Categories",
    going: "Going",
    maybe: "Maybe",
    notGoing: "Not Going",
    save: "Save",
    saved: "Saved",
    addCalendar: "Add to Calendar",
    noEvents: "No events this week. Check back soon or suggest an event.",
    titleField: "Title",
    typeField: "Type",
    descriptionField: "Description",
    locationField: "Location",
    startTimeField: "Start Time",
    endTimeField: "End Time",
    maxAttendeesField: "Max Attendees",
    coverField: "Cover image URL",
    cancel: "Cancel",
    delete: "Delete",
    organizer: "Organizer",
  },
  hy: {
    title: "Events",
    subtitle:
      "Discover what’s happening at UFAR — academic events, clubs, parties, sports, Erasmus, career and student life.",
    search: "Search events...",
    createEvent: "Create Event",
    suggestEvent: "Suggest Event",
    myEvents: "My Events",
    featured: "Featured Events",
    upcoming: "Upcoming Events",
    categories: "Categories",
    going: "Going",
    maybe: "Maybe",
    notGoing: "Not Going",
    save: "Save",
    saved: "Saved",
    addCalendar: "Add to Calendar",
    noEvents: "No events this week. Check back soon or suggest an event.",
    titleField: "Title",
    typeField: "Type",
    descriptionField: "Description",
    locationField: "Location",
    startTimeField: "Start Time",
    endTimeField: "End Time",
    maxAttendeesField: "Max Attendees",
    coverField: "Cover image URL",
    cancel: "Cancel",
    delete: "Delete",
    organizer: "Organizer",
  },
};

const categoryLabels: Record<string, string> = {
  academic: "Academic",
  cultural: "Clubs",
  sports: "Sports",
  party: "Parties",
  workshop: "Workshops",
  other: "Student Life",
};

function formatDate(value: string | null) {
  if (!value) return "Date TBD";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(value));
}

function formatTime(value: string | null) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getCalendarUrl(event: EventItem) {
  const start = event.startTime
    ? new Date(event.startTime).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    : "";
  const end = event.endTime
    ? new Date(event.endTime).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    : start;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description || "",
    location: event.location || "UFAR",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function EventsPageClient({
  events,
  currentUserId,
}: EventsPageClientProps) {
  const { language } = useLanguage();
  const t = copy[language as keyof typeof copy] || copy.en;

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [attendeesValue, setAttendeesValue] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const filteredEvents = useMemo(() => {
    const search = query.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        !search ||
        event.title.toLowerCase().includes(search) ||
        event.description?.toLowerCase().includes(search) ||
        event.location?.toLowerCase().includes(search) ||
        event.organizerName?.toLowerCase().includes(search);

      const matchesCategory = category === "all" || event.eventType === category;

      return matchesSearch && matchesCategory;
    });
  }, [events, query, category]);

  function toggleSave(eventId: string) {
    setSavedIds((previous) => {
      const next = new Set(previous);

      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }

      return next;
    });
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <section className="card" style={{ padding: "24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  margin: "0 0 8px",
                  fontSize: "30px",
                  fontWeight: 950,
                  color: "var(--text-primary)",
                }}
              >
                {t.title}
              </h1>
              <p
                style={{
                  margin: 0,
                  maxWidth: "720px",
                  color: "var(--text-secondary)",
                  fontSize: "15px",
                  lineHeight: 1.5,
                }}
              >
                {t.subtitle}
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                {t.createEvent}
              </button>

              <button type="button" className="btn btn-secondary">
                {t.suggestEvent}
              </button>

              <button type="button" className="btn btn-secondary">
                {t.myEvents}
              </button>
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.search}
              style={{
                width: "100%",
                height: "48px",
                border: "1px solid var(--border-color)",
                borderRadius: "14px",
                padding: "0 16px",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </div>
        </section>

        <section>
          <h2
            style={{
              margin: "0 0 14px",
              fontSize: "20px",
              fontWeight: 900,
              color: "var(--text-primary)",
            }}
          >
            {t.categories}
          </h2>

          <div style={{ display: "flex", gap: "10px", overflowX: "auto" }}>
            {[
              ["all", "All"],
              ["academic", "Academic"],
              ["cultural", "Clubs"],
              ["sports", "Sports"],
              ["party", "Parties"],
              ["workshop", "Workshops"],
              ["other", "Student Life"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "999px",
                  padding: "10px 14px",
                  background: category === value ? "var(--french-blue)" : "#fff",
                  color: category === value ? "#fff" : "var(--text-primary)",
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2
            style={{
              margin: "0 0 14px",
              fontSize: "20px",
              fontWeight: 900,
              color: "var(--text-primary)",
            }}
          >
            {t.featured}
          </h2>

          {filteredEvents.length === 0 ? (
            <div className="card" style={{ padding: "50px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "42px", marginBottom: "12px", opacity: 0.35 }}>
                📅
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "17px",
                  color: "var(--text-secondary)",
                  fontWeight: 800,
                }}
              >
                {t.noEvents}
              </h3>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "16px",
              }}
            >
              {filteredEvents.map((event) => {
                const isSaved = savedIds.has(event.id);
                const isOrganizer = event.organizerId === currentUserId;

                return (
                  <article
                    key={event.id}
                    className="card"
                    style={{ overflow: "hidden" }}
                  >
                    <div
                      style={{
                        height: "150px",
                        background: event.imageUrl
                          ? `url(${event.imageUrl}) center/cover`
                          : "linear-gradient(135deg, var(--french-blue), var(--french-navy))",
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: "12px",
                          top: "12px",
                          background: "rgba(255,255,255,0.92)",
                          color: "#0f172a",
                          borderRadius: "999px",
                          padding: "6px 10px",
                          fontSize: "12px",
                          fontWeight: 900,
                        }}
                      >
                        {categoryLabels[event.eventType] || "Event"}
                      </span>
                    </div>

                    <div style={{ padding: "16px" }}>
                      <div
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "13px",
                          fontWeight: 800,
                          marginBottom: "8px",
                        }}
                      >
                        {formatDate(event.startTime)} · {formatTime(event.startTime)}
                      </div>

                      <h3
                        style={{
                          margin: "0 0 8px",
                          color: "var(--text-primary)",
                          fontSize: "18px",
                          fontWeight: 950,
                        }}
                      >
                        {event.title}
                      </h3>

                      <p
                        style={{
                          margin: "0 0 12px",
                          color: "var(--text-secondary)",
                          fontSize: "14px",
                          lineHeight: 1.45,
                        }}
                      >
                        {event.description || "Join UFAR students for this event."}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          color: "var(--text-secondary)",
                          fontSize: "13px",
                          marginBottom: "14px",
                        }}
                      >
                        <span>📍 {event.location || "UFAR"}</span>
                        <span>👥 {event.goingCount} students going</span>
                        <span>
                          {t.organizer}: {event.organizerName}
                        </span>
                      </div>

                      <form
                        action={rsvpToEventAction}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: "8px",
                          marginBottom: "10px",
                        }}
                      >
                        <input type="hidden" name="eventId" value={event.id} />

                        <button
                          name="status"
                          value="going"
                          className={
                            event.rsvpStatus === "going"
                              ? "btn btn-primary"
                              : "btn btn-secondary"
                          }
                          type="submit"
                          style={{ fontSize: "12px", padding: "8px" }}
                        >
                          {t.going}
                        </button>

                        <button
                          name="status"
                          value="interested"
                          className={
                            event.rsvpStatus === "interested"
                              ? "btn btn-primary"
                              : "btn btn-secondary"
                          }
                          type="submit"
                          style={{ fontSize: "12px", padding: "8px" }}
                        >
                          {t.maybe}
                        </button>

                        <button
                          name="status"
                          value="not_going"
                          className={
                            event.rsvpStatus === "not_going"
                              ? "btn btn-primary"
                              : "btn btn-secondary"
                          }
                          type="submit"
                          style={{ fontSize: "12px", padding: "8px" }}
                        >
                          {t.notGoing}
                        </button>
                      </form>

                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => toggleSave(event.id)}
                          style={{ fontSize: "13px" }}
                        >
                          {isSaved ? `★ ${t.saved}` : `☆ ${t.save}`}
                        </button>

                        <a
                          href={getCalendarUrl(event)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{ fontSize: "13px", textDecoration: "none" }}
                        >
                          {t.addCalendar}
                        </a>

                        {isOrganizer && (
                          <form action={deleteEventAction}>
                            <input type="hidden" name="eventId" value={event.id} />
                            <button
                              type="submit"
                              className="btn btn-secondary"
                              style={{
                                fontSize: "13px",
                                color: "var(--error-color)",
                              }}
                            >
                              {t.delete}
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "18px",
          }}
          onMouseDown={() => setShowCreateModal(false)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "620px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                  fontWeight: 950,
                  color: "var(--text-primary)",
                }}
              >
                {t.createEvent}
              </h2>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn btn-secondary"
              >
                ×
              </button>
            </div>

            <form
              ref={formRef}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmitting) return;
                setIsSubmitting(true);
                try {
                  const fd = new FormData(e.currentTarget);
                  const startDate = fd.get("startDate") as string;
                  const startTimeVal = fd.get("startTimeVal") as string;
                  const endDate = fd.get("endDate") as string;
                  const endTimeVal = fd.get("endTimeVal") as string;

                  if (startDate && startTimeVal) {
                    fd.set("startTime", `${startDate}T${startTimeVal}`);
                  }
                  if (endDate && endTimeVal) {
                    fd.set("endTime", `${endDate}T${endTimeVal}`);
                  }
                  fd.delete("startDate");
                  fd.delete("startTimeVal");
                  fd.delete("endDate");
                  fd.delete("endTimeVal");

                  fd.set("maxAttendees", String(attendeesValue || ""));

                  await createEvent(fd);
                  setShowCreateModal(false);
                  setCoverPreview(null);
                  setAttendeesValue(0);
                  formRef.current?.reset();
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              <label>
                <FieldLabel>{t.titleField}</FieldLabel>
                <FieldInput name="title" required placeholder="Francophonie Night 2026" />
              </label>

              <label>
                <FieldLabel>{t.typeField}</FieldLabel>
                <select name="eventType" required style={fieldStyle}>
                  <option value="academic">Academic</option>
                  <option value="cultural">Clubs / Erasmus</option>
                  <option value="sports">Sports</option>
                  <option value="party">Parties</option>
                  <option value="workshop">Workshops</option>
                  <option value="other">Student Life</option>
                </select>
              </label>

              <label>
                <FieldLabel>{t.descriptionField}</FieldLabel>
                <textarea
                  name="description"
                  rows={4}
                  placeholder="Short event description"
                  style={{ ...fieldStyle, resize: "none" }}
                />
              </label>

              <label>
                <FieldLabel>{t.locationField}</FieldLabel>
                <FieldInput name="location" placeholder="UFAR Hall / Online" />
              </label>

              {/* Start Time — split date + time */}
              <div>
                <FieldLabel>{t.startTimeField}</FieldLabel>
                <div style={{ display: "flex", gap: "10px", marginTop: "7px" }}>
                  <input
                    name="startDate"
                    type="date"
                    required
                    style={{ ...fieldStyle, flex: 1, marginTop: 0 }}
                  />
                  <input
                    name="startTimeVal"
                    type="time"
                    required
                    style={{ ...fieldStyle, flex: 1, marginTop: 0 }}
                  />
                </div>
              </div>

              {/* End Time — split date + time */}
              <div>
                <FieldLabel>{t.endTimeField}</FieldLabel>
                <div style={{ display: "flex", gap: "10px", marginTop: "7px" }}>
                  <input
                    name="endDate"
                    type="date"
                    style={{ ...fieldStyle, flex: 1, marginTop: 0 }}
                  />
                  <input
                    name="endTimeVal"
                    type="time"
                    style={{ ...fieldStyle, flex: 1, marginTop: 0 }}
                  />
                </div>
              </div>

              {/* Cover image — file upload */}
              <div>
                <FieldLabel>{t.coverField}</FieldLabel>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    marginTop: "7px",
                    border: "2px dashed var(--border-color)",
                    borderRadius: "14px",
                    padding: coverPreview ? "0" : "28px 16px",
                    textAlign: "center",
                    cursor: "pointer",
                    overflow: "hidden",
                    position: "relative",
                    background: "var(--bg-secondary, #f8f9fa)",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--french-blue)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                >
                  {coverPreview ? (
                    <div style={{ position: "relative" }}>
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        style={{
                          width: "100%",
                          height: "160px",
                          objectFit: "cover",
                          display: "block",
                          borderRadius: "12px",
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCoverPreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          border: "none",
                          background: "rgba(0,0,0,0.6)",
                          color: "#fff",
                          fontSize: "16px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "28px", opacity: 0.4, marginBottom: "6px" }}>📷</div>
                      <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 700 }}>
                        Click to upload cover image
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", opacity: 0.6, marginTop: "4px" }}>
                        JPG, PNG up to 10MB
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  name="coverFile"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setCoverPreview(url);
                    }
                  }}
                />
              </div>

              {/* Max Attendees — preset buttons */}
              <div>
                <FieldLabel>{t.maxAttendeesField}</FieldLabel>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginTop: "7px",
                  }}
                >
                  {ATTENDEE_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setAttendeesValue(preset.value)}
                      style={{
                        border: "1px solid var(--border-color)",
                        borderRadius: "10px",
                        padding: "8px 14px",
                        fontSize: "13px",
                        fontWeight: 800,
                        cursor: "pointer",
                        background:
                          attendeesValue === preset.value
                            ? "var(--french-blue)"
                            : "transparent",
                        color:
                          attendeesValue === preset.value
                            ? "#fff"
                            : "var(--text-primary)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "8px",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCoverPreview(null);
                    setAttendeesValue(0);
                  }}
                >
                  {t.cancel}
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? "..." : t.createEvent}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border-color)",
  borderRadius: "12px",
  padding: "10px 12px",
  fontSize: "14px",
  outline: "none",
  marginTop: "7px",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "block",
        color: "var(--text-primary)",
        fontSize: "13px",
        fontWeight: 900,
      }}
    >
      {children}
    </span>
  );
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={fieldStyle} />;
}