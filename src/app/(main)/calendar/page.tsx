import { redirect } from "next/navigation";

// Calendar now lives inside Courses (Calendar tab). Route kept for old links.
export default function CalendarPage() {
  redirect("/courses?tab=calendar");
}
