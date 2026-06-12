"use server";

import { db } from "@/shared/db/db";
import { users, faculties, programs, semesters, courses, courseEnrollments } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { revalidatePath } from "next/cache";
import { safeParseFormData, onboardingSchema } from "@/shared/validations/validations";
import { createId } from "@paralleldrive/cuid2";
import { invalidateUserCache } from "@/shared/cache/cache";

export async function completeOnboarding(prevState, formData) {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }

  const parsed = safeParseFormData(onboardingSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const data = parsed.data;
  const birthDate = data.birthDate ? new Date(data.birthDate) : null;

  try {
    await db.transaction(async (tx) => {
      // 1. Find or create Faculty
      let facultyId = null;
      if (data.faculty) {
        let fac = await tx.select().from(faculties).where(eq(faculties.name, data.faculty)).limit(1);
        if (fac.length === 0) {
          const newFac = await tx.insert(faculties).values({ name: data.faculty, code: data.faculty.substring(0,3).toUpperCase() }).returning();
          facultyId = newFac[0].id;
        } else {
          facultyId = fac[0].id;
        }
      }

      // 2. Find or create Program
      let programId = null;
      if (data.program && facultyId) {
        let prog = await tx.select().from(programs).where(eq(programs.name, data.program)).limit(1);
        if (prog.length === 0) {
          const newProg = await tx.insert(programs).values({ facultyId, name: data.program }).returning();
          programId = newProg[0].id;
        } else {
          programId = prog[0].id;
        }
      }

      // 3. Find or create active semester
      let sem = await tx.select().from(semesters).where(eq(semesters.isActive, true)).limit(1);
      let semesterId;
      if (sem.length === 0) {
        const newSem = await tx.insert(semesters).values({ name: "Current Semester", year: new Date().getFullYear(), season: "Fall", isActive: true }).returning();
        semesterId = newSem[0].id;
      } else {
        semesterId = sem[0].id;
      }

      // 4. Update User — onboarding only sets the required basics.
      // Optional profile fields (avatar, bio, interests, languages, looking for,
      // relationship status, birth date, gender) are filled later in profile edit,
      // so we only write them if they were actually submitted.
      await tx
        .update(users)
        .set({
          faculty: data.faculty,
          year: data.year,
          studyGroup: data.studyGroup || null,
          ...(data.gender ? { gender: data.gender } : {}),
          ...(data.relationshipStatus ? { relationshipStatus: data.relationshipStatus } : {}),
          ...(birthDate ? { birthDate } : {}),
          ...(data.interests ? { interests: data.interests } : {}),
          ...(data.languages ? { languages: data.languages } : {}),
          ...(data.lookingFor ? { lookingFor: data.lookingFor } : {}),
          onboardingComplete: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, session.userId));

      // 5. Enroll in courses
      if (data.courses) {
        const courseNames = data.courses.split(",").map(c => c.trim()).filter(Boolean);
        for (const cName of courseNames) {
          let courseRes = await tx.select().from(courses).where(eq(courses.name, cName)).limit(1);
          let courseId;
          if (courseRes.length === 0) {
            const newCourse = await tx.insert(courses).values({ 
              facultyId, 
              programId, 
              name: cName, 
              code: cName.replace(/\s+/g, '-').toUpperCase() + "-" + createId().substring(0, 4) 
            }).returning();
            courseId = newCourse[0].id;
          } else {
            courseId = courseRes[0].id;
          }
          
          // Enroll
          await tx.insert(courseEnrollments).values({
            userId: session.userId,
            courseId,
            semesterId,
            role: "student"
          }).onConflictDoNothing(); // safe if unique constraint triggers
        }
      }
    });

    invalidateUserCache(session.userId);
    revalidatePath("/", "layout");
  } catch (error) {
    console.error("Onboarding error:", error);
    return { error: "Failed to save profile. Please try again." };
  }

  redirect("/today");
}
