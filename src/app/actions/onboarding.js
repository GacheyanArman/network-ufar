"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function completeOnboarding(prevState, formData) {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }

  const faculty = String(formData.get("faculty") || "").trim();
  const year = String(formData.get("year") || "").trim();
  const studyGroup = String(formData.get("studyGroup") || "").trim();
  const gender = String(formData.get("gender") || "").trim();
  const relationshipStatus = String(formData.get("relationshipStatus") || "").trim();
  const birthDateRaw = String(formData.get("birthDate") || "").trim();
  const interests = String(formData.get("interests") || "").trim();
  const languages = String(formData.get("languages") || "").trim();
  const lookingFor = String(formData.get("lookingFor") || "").trim();

  if (!faculty || !year || !gender || !relationshipStatus || !birthDateRaw) {
    return { error: "Faculty, year, gender, relationship status and birth date are required." };
  }

  const birthDate = birthDateRaw ? new Date(birthDateRaw) : null;

  try {
    await db
      .update(users)
      .set({
        faculty,
        year,
        studyGroup: studyGroup || null,
        gender: gender || null,
        relationshipStatus: relationshipStatus || null,
        birthDate: birthDate || null,
        interests: interests || null,
        languages: languages || null,
        lookingFor: lookingFor || null,
        onboardingComplete: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.userId));

    revalidatePath("/", "layout");
  } catch (error) {
    console.error("Onboarding error:", error);
    return { error: "Failed to save profile. Please try again." };
  }

  redirect("/");
}
