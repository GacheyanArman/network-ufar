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

    // 1. Strict Validation
    if (!email || !password || !fullName) {
      return { error: "All fields are required!" };
    }

    // 2. UFAR Domain Check
    if (!email.endsWith("@ufar.com") && !email.endsWith("@ufar.am")) {
      return { error: "Only @ufar.com or @ufar.am emails are allowed!" };
    }

    if (password.length < 6) {
      return { error: "Password must be at least 6 characters!" };
    }

    try {
      // 3. Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, email));

      if (existingUser.length > 0) {
        return { error: "This email is already registered!" };
      }

      // 4. Password Hashing
      const hashedPassword = await bcrypt.hash(password, 10);

      // 5. Save to Neon via Drizzle
      await db.insert(users).values({
        email,
        fullName,
        password: hashedPassword,
      });

    } catch (e) {
      console.error("DB Error:", e);
      return { error: "Database connection failed. Check your Neon string." };
    }

    // 6. Redirect
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
    // 1. Ищем юзера в Neon
    const userRecords = await db.select().from(users).where(eq(users.email, email));
    
    if (userRecords.length === 0) {
      return { error: "Invalid email or password." };
    }

    const user = userRecords[0];

    // 2. Проверяем пароль через bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return { error: "Invalid email or password." };
    }

    // 3. Создаем JWT токен (сессию)
    const token = await new SignJWT({ 
      userId: user.id, 
      email: user.email,
      fullName: user.fullName
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d") 
      .sign(getJwtSecretKey());

    // 4. ДОЖИДАЕМСЯ куки в Next.js 16 и сохраняем токен
    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 дней
    });

  } catch (e) {
    console.error("Login Error:", e);
    return { error: "Something went wrong. Try again." };
  }

  // 5. Перенаправляем на главную
  redirect("/");
}