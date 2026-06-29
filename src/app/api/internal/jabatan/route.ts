import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const branchIdParam = params.get("branchId");
  const departmentIdParam = params.get("departmentId");
  const branchId = branchIdParam ? Number(branchIdParam) : undefined;
  const departmentId = departmentIdParam ? Number(departmentIdParam) : undefined;

  if (
    (branchIdParam && Number.isNaN(branchId)) ||
    (departmentIdParam && Number.isNaN(departmentId))
  ) {
    return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
  }

  // Jabatan cocok jika:
  //  (branchId = cabang dipilih ATAU branchId null) DAN
  //  (departmentId = dept dipilih ATAU departmentId null).
  const jabatan = await prisma.jabatan.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ branchId: branchId ?? undefined }, { branchId: null }] },
        {
          OR: [
            { departmentId: departmentId ?? undefined },
            { departmentId: null },
          ],
        },
      ],
    },
    include: { department: true, branch: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    jabatan: jabatan.map((j) => ({
      id: j.id,
      name: j.name,
      level: j.level,
      roleSystem: j.roleSystem,
      department: j.department ? { name: j.department.name } : null,
      branch: j.branch ? { name: j.branch.name } : null,
    })),
  });
}
