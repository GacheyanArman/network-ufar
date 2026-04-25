import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload; // Returns { userId, email, fullName }
  } catch (e) {
    console.error("JWT verification failed:", e);
    return null; // Invalid or expired token
  }
}