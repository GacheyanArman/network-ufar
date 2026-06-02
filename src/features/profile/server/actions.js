"use server";

import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/shared/db/db";
import { users } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { profileSchema } from "@/shared/validations/validations";
import { saveUploadFileWithMeta } from "@/shared/storage/upload";

function getJwtSecretKey() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }

  return new TextEncoder().encode(secret);
}

function clean(value) {
  return String(value || "").trim();
}

function fail(message) {
  redirect(`/profile/edit?error=${encodeURIComponent(message)}`);
}

async function saveProfileImage(file, type) {
  if (!file || file.size === 0) {
    return null;
  }

  try {
    const result = await saveUploadFileWithMeta(file, {
      subdir: "profile",
      prefix: type,
      maxSize: 5 * 1024 * 1024,
      allowedMimePrefix: "image/",
      access: "public",
      processImage: true,
    });

    return result?.url ?? null;
  } catch (error) {
    fail(error.message || "Failed to upload image.");
  }
}

export async function updateProfile(formData) {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const [currentUser] = await db
    .select({
      id: users.id,
      email: users.email,
      image: users.image,
      coverImage: users.coverImage,
      gender: users.gender,
      relationshipStatus: users.relationshipStatus,
      birthDate: users.birthDate,
      privacyLevel: users.privacyLevel,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!currentUser) {
    redirect("/login");
  }

  const fullName = clean(formData.get("fullName"));
  const usernameRaw = clean(formData.get("username")).replace(/^@/, "");
  const username = usernameRaw ? usernameRaw.toLowerCase() : "";
  const faculty = clean(formData.get("faculty")) || "";
  const year = clean(formData.get("year")) || "";
  const bio = clean(formData.get("bio")) || "";

  // Safely fallback to database values if not passed in simplified profile form
  const gender = formData.has("gender") ? clean(formData.get("gender")) : (currentUser.gender || "");
  const relationshipStatus = formData.has("relationshipStatus") ? clean(formData.get("relationshipStatus")) : (currentUser.relationshipStatus || "");
  const birthDateRaw = formData.has("birthDate")
    ? clean(formData.get("birthDate"))
    : (currentUser.birthDate ? currentUser.birthDate.toISOString().split("T")[0] : "");
  const privacyLevel = formData.has("privacyLevel") ? clean(formData.get("privacyLevel")) : (currentUser.privacyLevel || "public");

  const avatarFile = formData.get("avatarFile");
  const coverFile = formData.get("coverFile");

  // Validate with Zod
  const validatedFields = profileSchema.safeParse({
    fullName,
    username,
    faculty,
    year,
    bio,
    gender,
    relationshipStatus,
    birthDate: birthDateRaw,
    privacyLevel,
  });

  if (!validatedFields.success) {
    const errorMessage = validatedFields.error.issues[0]?.message || "Invalid data";
    fail(errorMessage);
  }

  const validatedData = validatedFields.data;
  const birthDate = validatedData.birthDate ? new Date(validatedData.birthDate) : null;

  if (validatedData.username) {
    const existingUsername = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.username, validatedData.username), ne(users.id, session.userId)))
      .limit(1);

    if (existingUsername.length > 0) {
      fail("This username is already taken.");
    }
  }

  const uploadedAvatar = await saveProfileImage(avatarFile, "avatar");
  const uploadedCover = await saveProfileImage(coverFile, "cover");

  const nextImage = uploadedAvatar || currentUser.image || null;
  const nextCoverImage = uploadedCover || currentUser.coverImage || null;

  await db
    .update(users)
    .set({
      fullName: validatedData.fullName,
      username: validatedData.username || null,
      faculty: validatedData.faculty || null,
      year: validatedData.year || null,
      bio: validatedData.bio || null,
      gender: validatedData.gender || null,
      relationshipStatus: validatedData.relationshipStatus || null,
      birthDate: birthDate || null,
      privacyLevel: validatedData.privacyLevel || "public",
      image: nextImage,
      coverImage: nextCoverImage,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.userId));

  // Инвалидируем кэш пользователя
  revalidateTag("user");

  const token = await new SignJWT({
    userId: session.userId,
    email: session.email,
    fullName: validatedData.fullName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecretKey());

  const cookieStore = await cookies();

  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/profile/edit");

    redirect("/profile?tab=about&saved=1");
}