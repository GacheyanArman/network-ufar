import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-e2e-secret");
  // Ensure we have a secure string to check against, fallback to something unguessable if env is missing
  const validSecret = process.env.E2E_SECRET || "dummy_unguessable_secret_for_tests";

  if (secret !== validSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { tags } = await req.json();

    if (!Array.isArray(tags)) {
      return NextResponse.json(
        { error: "Expected an array of tags" },
        { status: 400 }
      );
    }

    for (const tag of tags) {
      if (typeof tag === "string") {
        // @ts-ignore - Next.js types misaligned or expecting multiple arguments
        revalidateTag(tag);
      }
    }

    return NextResponse.json({ success: true, revalidated: tags });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
