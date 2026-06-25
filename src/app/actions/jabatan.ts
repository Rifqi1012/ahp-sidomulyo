"use server";

import { revalidatePath } from "next/cache";
import type { Jabatan, KpiLevel, ScopeType, RoleType } from "@prisma/client";

import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-guard";
import type { ActionResult } from "@/app/actions/branch";

export type { ActionResult };

export type JabatanWithCount = Jabatan & { activeUserCount: number };

export type JabatanInput = {
  name: string;
  level: KpiLevel | null;
  scope: ScopeType;
  roleSystem: RoleType;
  description?: string | null;
};

export type JabatanUpdateInput = {
  name: string;
  level: KpiLevel | null;
  scope: ScopeType;
  description?: string | null;
  isActive: boolean;
};

/** Daftar jabatan + jumlah pemegang aktif, opsional difilter scope. */
export async function getJabatan(
  scope?: ScopeType,
): Promise<JabatanWithCount[]> {
  const jabatanList = await prisma.jabatan.findMany({
    where: scope ? { scope } : undefined,
    orderBy: [{ scope: "asc" }, { name: "asc" }],
  });

  // Hitung user aktif per jabatan.
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

export async function getJabatanById(id: number): Promise<Jabatan | null> {
  return prisma.jabatan.findUnique({ where: { id } });
}

export async function createJabatan(
  data: JabatanInput,
): Promise<ActionResult> {
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

  await prisma.jabatan.create({
    data: {
      name,
      level: data.level,
      scope: data.scope,
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

  // roleSystem TIDAK pernah diubah dari sini (diblokir).
  await prisma.jabatan.update({
    where: { id },
    data: {
      name,
      level: data.level,
      scope: data.scope,
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
      error: `Tidak dapat menonaktifkan: masih ada ${activeUsers} karyawan aktif dengan jabatan ini.`,
    };
  }

  await prisma.jabatan.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath("/admin/jabatan");
  return { success: true };
}
