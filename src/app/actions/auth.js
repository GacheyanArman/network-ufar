"use server";

import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { db } from "@/lib/db";
import { users, emailVerifications } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { randomInt } from "crypto";
import { sendVerificationEmail } from "@/lib/mail";
import { registerSchema, loginSchema, verifyEmailSchema } from "@/lib/validations";

// --- CONFIGURATION ---
const ALLOWED_GMAILS = new Set([
  "armangacheyan23@gmail.com",
  "grechulka@gmail.com",
  "third@gmail.com",
]);

const MAX_VERIFICATION_ATTEMPTS = 5;
const OTP_TTL_MINUTES = 10;

// --- UTILITIES ---
function normalizeEmail(value) {
  // SECURITY: Always sanitize and normalize input
  return String(value || "").trim().toLowerCase();
}

function isAllowedEmail(email) {
  return email.endsWith("@ufar.com") || email.endsWith("@ufar.am") || ALLOWED_GMAILS.has(email);
}

function generateOTP() {
  return String(randomInt(100000, 999999));
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("CRITICAL ERROR: JWT_SECRET environment variable is missing.");
  return new TextEncoder().encode(secret);
}

// --- ACTIONS ---
export async function registerUser(prevState, formData) {
  const email = normalizeEmail(formData.get("email"));
  const password = formData.get("password")?.toString() || "";
  const fullName = formData.get("fullName")?.toString().trim() || "";

  // Validate with Zod
  const validatedFields = registerSchema.safeParse({
    email,
    password,
    fullName,
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message || "Invalid data" };
  }

  const validatedData = validatedFields.data;

  if (!isAllowedEmail(validatedData.email)) {
    return { error: "Access denied. Only @ufar.com domains or whitelisted accounts allowed." };
  }

  try {
    const [existingUser] = await db.select().from(users).where(eq(users.email, validatedData.email)).limit(1);

    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    const passwordHash = await bcrypt.hash(validatedData.password, 12);
    const codeHash = await bcrypt.hash(otpCode, 10);

    let currentUserId;

    if (existingUser) {
      if (existingUser.emailVerified) {
        return { error: "Account with this email already exists and is verified." };
      }

      // UPSERT LOGIC: Overwrite the unverified user and drop their old OTP codes
      currentUserId = existingUser.id;
      await db.update(users).set({
        fullName: validatedData.fullName,
        password: passwordHash,
        updatedAt: new Date(),
      }).where(eq(users.id, currentUserId));

      await db.delete(emailVerifications).where(eq(emailVerifications.userId, currentUserId));

    } else {
      const [newUser] = await db.insert(users).values({
        email: validatedData.email,
        fullName: validatedData.fullName,
        password: passwordHash,
        emailVerified: false,
      }).returning({ id: users.id });

      currentUserId = newUser.id;
    }

    // Insert new OTP record in the separated table
    await db.insert(emailVerifications).values({
      userId: currentUserId,
      codeHash,
      expiresAt,
    });

    // Dispatch Email
    try {
      await sendVerificationEmail({ to: validatedData.email, code: otpCode, fullName: validatedData.fullName });
    } catch (mailError) {
      console.error("SMTP Delivery Failed:", mailError);
      return { error: "Failed to send verification email. Please try again later." };
    }

  } catch (error) {
    console.error("Database error during registration:", error);
    return { error: "Internal server error." };
  }

  redirect(`/verify-email?email=${encodeURIComponent(validatedData.email)}`);
}


export async function verifyEmailCode(prevState, formData) {
  const email = normalizeEmail(formData.get("email"));
  const code = String(formData.get("code") || "").trim();

  // Validate with Zod
  const validatedFields = verifyEmailSchema.safeParse({ code });

  if (!validatedFields.success || !email) {
    return { error: validatedFields.error?.issues[0]?.message || "Invalid payload. Provide a valid 6-digit code." };
  }

  const validatedCode = validatedFields.data.code;

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return { error: "Account not found." };
    if (user.emailVerified) return { error: "Account is already verified. Proceed to login." };

    const [verification] = await db.select().from(emailVerifications).where(eq(emailVerifications.userId, user.id)).limit(1);

    if (!verification) {
      return { error: "No active verification process found. Register again." };
    }

    // Rate Limiting Enforcement
    if (verification.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await db.delete(emailVerifications).where(eq(emailVerifications.id, verification.id));
      return { error: "Too many failed attempts. You must request a new code." };
    }

    // TTL Enforcement
    if (new Date(verification.expiresAt).getTime() < Date.now()) {
      await db.delete(emailVerifications).where(eq(emailVerifications.id, verification.id));
      return { error: "Verification code expired. Please register again." };
    }

    // Hash check
    const isValid = await bcrypt.compare(validatedCode, verification.codeHash);
    if (!isValid) {
      await db.update(emailVerifications).set({
        attempts: verification.attempts + 1,
      }).where(eq(emailVerifications.id, verification.id));

      return { error: "Incorrect verification code." };
    }

    // SUCCESS: Mark as verified and purge transient OTP data
    await db.update(users).set({
      emailVerified: true,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));

    await db.delete(emailVerifications).where(eq(emailVerifications.userId, user.id));

  } catch (error) {
    console.error("Code Verification Error:", error);
    return { error: "Internal server error during verification." };
  }

  redirect("/login");
}


export async function loginUser(prevState, formData) {
  const email = normalizeEmail(formData.get("email"));
  const password = formData.get("password")?.toString() || "";

  // Validate with Zod
  const validatedFields = loginSchema.safeParse({
    email,
    password,
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message || "Invalid data" };
  }

  const validatedData = validatedFields.data;

  try {
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      password: users.password,
      emailVerified: users.emailVerified,
      fullName: users.fullName,
      onboardingComplete: users.onboardingComplete,
    }).from(users).where(eq(users.email, validatedData.email)).limit(1);

    if (!user) {
      return { error: "Invalid credentials." };
    }

    // Gatekeeper: Prevent unverified users from generating JWTs
    if (!user.emailVerified) {
      return { error: "Your account is not verified. Please complete registration." };
    }

    const isValid = await bcrypt.compare(validatedData.password, user.password);
    if (!isValid) {
      return { error: "Invalid credentials." };
    }

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      fullName: user.fullName
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(getJwtSecret());

    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    if (!user.onboardingComplete) {
      redirect("/onboarding");
    }

  } catch (error) {
    console.error("Authentication Error:", error);
    return { error: "Internal server error during authentication." };
  }

  redirect("/");
}


export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}