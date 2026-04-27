"use server";

import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getSession } from "@/lib/session";

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

function isImageFile(file) {
  return file && file.size > 0 && file.type?.startsWith("image/");
}

async function saveProfileImage(file, type) {
  if (!file || file.size === 0) {
    return null;
  }

  if (!isImageFile(file)) {
    fail("Only image files are allowed.");
  }

  if (file.size > 5 * 1024 * 1024) {
    fail("Image is too large. Max size is 5MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const originalName = file.name || "profile-image";
  const safeName = originalName
    .replaceAll(" ", "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");

  const filename = `${type}-${Date.now()}-${safeName}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "profile");

  await mkdir(uploadDir, { recursive: true });

  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  return `/uploads/profile/${filename}`;
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
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!currentUser) {
    redirect("/login");
  }

  const fullName = clean(formData.get("fullName"));
  const usernameRaw = clean(formData.get("username")).replace(/^@/, "");
  const username = usernameRaw ? usernameRaw.toLowerCase() : null;
  const faculty = clean(formData.get("faculty")) || null;
  const bio = clean(formData.get("bio")) || null;

  const avatarFile = formData.get("avatarFile");
  const coverFile = formData.get("coverFile");

  if (!fullName) {
    fail("Full name is required.");
  }

  if (fullName.length < 2 || fullName.length > 80) {
    fail("Full name must be between 2 and 80 characters.");
  }

  if (username && !/^[a-z0-9_]{3,24}$/.test(username)) {
    fail("Username must be 3-24 characters: letters, numbers or underscore only.");
  }

  if (bio && bio.length > 300) {
    fail("Bio must be 300 characters or less.");
  }

  if (username) {
    const existingUsername = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.username, username), ne(users.id, session.userId)))
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
      fullName,
      username,
      faculty,
      bio,
      image: nextImage,
      coverImage: nextCoverImage,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.userId));

  const token = await new SignJWT({
    userId: session.userId,
    email: session.email,
    fullName,
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