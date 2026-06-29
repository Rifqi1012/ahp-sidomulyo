"use server";

import { revalidatePath } from "next/cache";
import type {
  Branch,
  Department,
  Jabatan,
  KpiLevel,
  RoleType,
} from "@prisma/client";

import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-guard";
import type { ActionResult } from "@/app/actions/branch";

export type { ActionResult };

export type JabatanWithRelations = Jabatan & {
  department: Department | null;
  branch: Branch | null;
  activeUserCount: number;
};

export type JabatanFilter = {
  branchId?: number;
  departmentId?: number;
  roleSystem?: RoleType;
  isActive?: boolean;
};

export type JabatanInput = {
  name: string;
  departmentId: number | null;
  branchId: number | null;
  level: KpiLevel | null;
  roleSystem: RoleType;
  description?: string | null;
};

export type JabatanUpdateInput = {
  name: string;
  departmentId: number | null;
  branchId: number | null;
  level: KpiLevel | null;
  description?: string | null;
  isActive: boolean;
};

/** Daftar jabatan + jumlah pemegang aktif, dengan filter opsional. */
export async function getJabatan(
  filter: JabatanFilter = {},
): Promise<JabatanWithRelations[]> {
  const jabatanList = await prisma.jabatan.findMany({
    where: {
      ...(filter.branchId ? { branchId: filter.branchId } : {}),
      ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
      ...(filter.roleSystem ? { roleSystem: filter.roleSystem } : {}),
      ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
    },
    include: { department: true, branch: true },
    orderBy: [{ branchId: "asc" }, { name: "asc" }],
  });

  const grouped = await prisma.user.groupBy({
    by: ["jabatanId"],
    where: { isActive: true, jabatanId: { not: null } },
    _count: { _all: true },
  });
  const countMap = new Map<number, number>(
    grouped
      .filter((g) => g.jabatanId !== null)
      .map((g) => [g.jabatanId as number, g._count._all]),
  );

  return jabatanList.map((j) => ({
    ...j,
    activeUserCount: countMap.get(j.id) ?? 0,
  }));
}

export async function getJabatanById(
  id: number,
): Promise<JabatanWithRelations | null> {
  const j = await prisma.jabatan.findUnique({
    where: { id },
    include: { department: true, branch: true },
  });
  if (!j) return null;
  const count = await prisma.user.count({
    where: { jabatanId: id, isActive: true },
  });
  return { ...j, activeUserCount: count };
}

/** Cek keunikan nama per kombinasi (departemen + cabang). */
async function isDuplicate(
  name: string,
  departmentId: number | null,
  branchId: number | null,
  excludeId?: number,
): Promise<boolean> {
  const dup = await prisma.jabatan.findFirst({
    where: {
      name,
      departmentId: departmentId ?? null,
      branchId: branchId ?? null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return dup !== null;
}

export async function createJabatan(data: JabatanInput): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const name = data.name?.trim() ?? "";
  if (!name) {
    return {
      success: false,
      error: "Nama jabatan wajib diisi.",
      fieldErrors: { name: "Nama jabatan wajib diisi." },
    };
  }

  if (await isDuplicate(name, data.departmentId, data.branchId)) {
    return {
      success: false,
      error: "Jabatan ini sudah ada untuk departemen dan cabang yang dipilih.",
      fieldErrors: {
        name: "Jabatan ini sudah ada untuk departemen dan cabang yang dipilih.",
      },
    };
  }

  await prisma.jabatan.create({
    data: {
      name,
      departmentId: data.departmentId,
      branchId: data.branchId,
      level: data.level,
      roleSystem: data.roleSystem,
      description: data.description?.trim() || null,
      isActive: true,
    },
  });

  revalidatePath("/admin/jabatan");
  return { success: true };
}

export async function updateJabatan(
  id: number,
  data: JabatanUpdateInput,
): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const jabatan = await prisma.jabatan.findUnique({ where: { id } });
  if (!jabatan) {
    return { success: false, error: "Jabatan tidak ditemukan." };
  }

  const name = data.name?.trim() ?? "";
  if (!name) {
    return {
      success: false,
      error: "Nama jabatan wajib diisi.",
      fieldErrors: { name: "Nama jabatan wajib diisi." },
    };
  }

  if (await isDuplicate(name, data.departmentId, data.branchId, id)) {
    return {
      success: false,
      error: "Jabatan ini sudah ada untuk departemen dan cabang yang dipilih.",
      fieldErrors: {
        name: "Jabatan ini sudah ada untuk departemen dan cabang yang dipilih.",
      },
    };
  }

  // roleSystem TIDAK pernah diubah dari sini (diblokir).
  await prisma.jabatan.update({
    where: { id },
    data: {
      name,
      departmentId: data.departmentId,
      branchId: data.branchId,
      level: data.level,
      description: data.description?.trim() || null,
      isActive: data.isActive,
    },
  });

  revalidatePath("/admin/jabatan");
  return { success: true };
}

/** Soft delete. Diblokir jika masih ada user aktif memegang jabatan ini. */
export async function deleteJabatan(id: number): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const jabatan = await prisma.jabatan.findUnique({ where: { id } });
  if (!jabatan) {
    return { success: false, error: "Jabatan tidak ditemukan." };
  }

  const activeUsers = await prisma.user.count({
    where: { jabatanId: id, isActive: true },
  });
  if (activeUsers > 0) {
    return {
      success: false,
      error: `Jabatan masih digunakan oleh ${activeUsers} karyawan aktif.`,
    };
  }

  await prisma.jabatan.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath("/admin/jabatan");
  return { success: true };
}
