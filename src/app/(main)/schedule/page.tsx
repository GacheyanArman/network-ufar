import { redirect } from "next/navigation";

// Schedule now lives inside Courses (Schedule tab). Route kept for old links.
export default function SchedulePage() {
  redirect("/courses?tab=schedule");
}
