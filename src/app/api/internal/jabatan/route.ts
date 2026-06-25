import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ScopeType } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scopeParam = req.nextUrl.searchParams.get("scope");

  // Untuk cabang pusat -> jabatan scope 'pusat' & 'all'.
  // Untuk cabang biasa -> jabatan scope 'cabang' & 'all'.
  let scopeFilter: ScopeType[] | undefined;
  if (scopeParam === "pusat") scopeFilter = ["pusat", "all"];
  else if (scopeParam === "cabang") scopeFilter = ["cabang", "all"];
  else if (scopeParam) {
    return NextResponse.json({ error: "scope tidak valid" }, { status: 400 });
  }

  const jabatan = await prisma.jabatan.findMany({
    where: {
      isActive: true,
      ...(scopeFilter ? { scope: { in: scopeFilter } } : {}),
    },
    select: { id: true, name: true, scope: true, level: true, roleSystem: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ jabatan });
}
