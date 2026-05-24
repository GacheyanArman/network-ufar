"use server";

import { cookies, headers } from "next/headers";
import { SignJWT } from "jose";
import { db } from "@/shared/db/db";
import { users, emailVerifications } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { randomInt, randomBytes } from "crypto";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/shared/mail/mail";
import { registerSchema, loginSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema } from "@/shared/validations/validations";
import { checkRateLimitAsync, getRateLimitError } from "@/shared/utils/rate-limit";
import { getAllowedEmailDomains, getInviteCode, getAllowedEmails } from "@/shared/auth/config";

// --- CONFIGURATION ---
const MAX_VERIFICATION_ATTEMPTS = 5;
const OTP_TTL_MINUTES = 10;

// --- UTILITIES ---
function normalizeEmail(value: string | FormDataEntryValue | null) {
  // SECURITY: Always sanitize and normalize input
  return String(value || "").trim().toLowerCase();
}

function isAllowedEmail(email: string) {
  const allowedEmails = getAllowedEmails();
  if (allowedEmails.includes(email.toLowerCase())) {
    return true;
  }
  const domains = getAllowedEmailDomains();
  return domains.some(domain => email.endsWith(`@${domain}`));
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
export async function registerUser(prevState: { error?: string } | undefined, formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const password = formData.get("password")?.toString() || "";
  const fullName = formData.get("fullName")?.toString().trim() || "";
  const inviteCode = formData.get("inviteCode")?.toString().trim() || "";

  // Rate Limiting
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const rl = await checkRateLimitAsync(`register_${ip}`, "register");
  if (!rl.allowed) {
    return { error: getRateLimitError(rl.resetTime ?? Date.now()) };
  }

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

  const serverInviteCode = getInviteCode();
  const isAllowed = isAllowedEmail(validatedData.email) || (serverInviteCode && inviteCode === serverInviteCode);

  if (!isAllowed) {
    return { error: "Access denied. Please use a university email or provide a valid invite code." };
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
        // Prevent account enumeration by simulating a successful flow
        return undefined; // Handled below the try-catch via redirect
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
      await (sendVerificationEmail as Function)({ to: validatedData.email, code: otpCode, fullName: validatedData.fullName });
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


export async function verifyEmailCode(prevState: { error?: string } | undefined, formData: FormData) {
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


export async function loginUser(prevState: { error?: string } | undefined, formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const password = formData.get("password")?.toString() || "";

  // Rate Limiting
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const rl = await checkRateLimitAsync(`login_${ip}`, "login");
  if (!rl.allowed) {
    return { error: getRateLimitError(rl.resetTime ?? Date.now()) };
  }

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
      return { error: "Invalid credentials or unverified account." };
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

const RESET_TTL_MINUTES = 60;
const RESET_TOKEN_BYTES = 32;

export async function requestPasswordReset(prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const email = normalizeEmail(formData.get("email"));

  const validatedFields = forgotPasswordSchema.safeParse({ email });
  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message || "Invalid email" };
  }

  const { db: dbRef } = await import("@/shared/db/db");
  const { users: usersRef, passwordResets } = await import("@/shared/db/schema");

  const [user] = await dbRef.select({ id: usersRef.id, fullName: usersRef.fullName, emailVerified: usersRef.emailVerified })
    .from(usersRef).where(eq(usersRef.email, validatedFields.data.email)).limit(1);

  if (!user || !user.emailVerified) {
    return { success: true };
  }

  const rl = await checkRateLimitAsync(user.id, "requestPasswordReset");
  if (!rl.allowed) {
    return { error: getRateLimitError(rl.resetTime ?? Date.now()) };
  }

  const token = randomBytes(RESET_TOKEN_BYTES).toString("hex");
  const tokenHash = await bcrypt.hash(token, 12);
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

  await dbRef.insert(passwordResets).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  try {
    await (sendPasswordResetEmail as Function)({ to: validatedFields.data.email, token, fullName: user.fullName });
  } catch (mailError) {
    console.error("Password reset email failed:", mailError);
  }

  return { success: true };
}

export async function resetPassword(prevState: { error?: string } | undefined, formData: FormData) {
  const token = String(formData.get("token") || "").trim();
  const password = formData.get("password")?.toString() || "";
  const confirmPassword = formData.get("confirmPassword")?.toString() || "";

  const validatedFields = resetPasswordSchema.safeParse({ token, password, confirmPassword });
  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message || "Invalid data" };
  }

  const { db: dbRef } = await import("@/shared/db/db");
  const { users: usersRef, passwordResets } = await import("@/shared/db/schema");
  const { and: andOp, gt, isNull: isNullOp } = await import("drizzle-orm");

  const candidates = await dbRef.select()
    .from(passwordResets)
    .where(andOp(gt(passwordResets.expiresAt, new Date()), isNullOp(passwordResets.usedAt)))
    .limit(20);

  let matchedRow = null;
  for (const row of candidates) {
    const isMatch = await bcrypt.compare(token, row.tokenHash);
    if (isMatch) {
      matchedRow = row;
      break;
    }
  }

  if (!matchedRow) {
    return { error: "Invalid or expired reset token. Please request a new one." };
  }

  const newPasswordHash = await bcrypt.hash(validatedFields.data.password, 12);

  await dbRef.update(usersRef).set({
    password: newPasswordHash,
    updatedAt: new Date(),
  }).where(eq(usersRef.id, matchedRow.userId));

  await dbRef.update(passwordResets).set({
    usedAt: new Date(),
  }).where(eq(passwordResets.id, matchedRow.id));

  try {
    const { logAudit } = await import("@/features/admin/server/audit");
    await logAudit({ actorId: matchedRow.userId, action: "password_reset", targetType: "user", targetId: matchedRow.userId, details: null });
  } catch {}

  redirect("/login");
}