"use server";

import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export async function registerUser(prevState, formData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const fullName = formData.get("fullName");

  if (!email || !password || !fullName) {
    return { error: "All fields are required!" };
  }

  if (!email.endsWith("@ufar.com") && !email.endsWith("@ufar.am")) {
    return { error: "Only @ufar.com or @ufar.am emails are allowed!" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters!" };
  }

  try {
    const existingUser = await db.select().from(users).where(eq(users.email, email));

    if (existingUser.length > 0) {
      return { error: "This email is already registered!" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.insert(users).values({
      email,
      fullName,
      password: hashedPassword,
    });

  } catch (e) {
    console.error("DB Error:", e);
    return { error: "Database connection failed. Check your Neon string." };
  }

  redirect("/login");
}

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
};

export async function loginUser(prevState, formData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return { error: "Email and password are required!" };
  }

  try {
    const userRecords = await db.select().from(users).where(eq(users.email, email));
    
    if (userRecords.length === 0) {
      return { error: "Invalid email or password." };
    }

    const user = userRecords[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return { error: "Invalid email or password." };
    }

    const token = await new SignJWT({ 
      userId: user.id, 
      email: user.email,
      fullName: user.fullName
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

  } catch (e) {
    console.error("Login Error:", e);
    return { error: "Something went wrong. Try again." };
  }

  redirect("/");
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}