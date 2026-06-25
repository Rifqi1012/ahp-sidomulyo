import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { generateEmail } from "@/lib/accountService";
import { getSessionUser } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = req.nextUrl.searchParams.get("name")?.trim() ?? "";
  if (!name) {
    return NextResponse.json({ email: "" });
  }

  const email = await generateEmail(name);
  return NextResponse.json({ email });
}
