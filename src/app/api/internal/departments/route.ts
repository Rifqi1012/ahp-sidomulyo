import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchIdParam = req.nextUrl.searchParams.get("branchId");
  const branchId = branchIdParam ? Number(branchIdParam) : undefined;

  if (branchIdParam && Number.isNaN(branchId)) {
    return NextResponse.json({ error: "branchId tidak valid" }, { status: 400 });
  }

  const departments = await prisma.department.findMany({
    where: {
      isActive: true,
      ...(branchId ? { branchId } : {}),
    },
    select: { id: true, name: true, branchId: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ departments });
}
