import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";
import {
  buildPeriodName,
  computeDeadline,
  parseDateInput,
} from "@/lib/period";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const start = parseDateInput(params.get("start") ?? "");
  if (!start) {
    return NextResponse.json({ name: "", deadline: null });
  }

  const orderParam = params.get("order");
  const excludeIdParam = params.get("excludeId");

  let order: number;
  if (orderParam) {
    order = Number(orderParam);
  } else {
    // Hitung urutan dalam tahun yang sama (existing + 1).
    const year = start.getUTCFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);
    const excludeId = excludeIdParam ? Number(excludeIdParam) : undefined;
    const count = await prisma.period.count({
      where: {
        startDate: { gte: yearStart, lt: yearEnd },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    order = count + 1;
  }

  return NextResponse.json({
    name: buildPeriodName(start, order),
    deadline: computeDeadline(start).toISOString(),
  });
}
