"use server";

import { revalidatePath } from "next/cache";
import type { Branch } from "@prisma/client";

import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-guard";

export type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export type BranchInput = {
  name: string;
  address?: string | null;
};

export type BranchUpdateInput = BranchInput & {
  isActive: boolean;
};

/** Semua cabang, kantor pusat diurutkan paling atas. */
export async function getBranches(): Promise<Branch[]> {
  return prisma.branch.findMany({
    orderBy: [{ isPusat: "desc" }, { name: "asc" }],
  });
}

export async function getBranch(id: number): Promise<Branch | null> {
  return prisma.branch.findUnique({ where: { id } });
}

export async function createBranch(data: BranchInput): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const name = data.name?.trim() ?? "";
  if (!name) {
    return {
      success: false,
      error: "Nama cabang wajib diisi.",
      fieldErrors: { name: "Nama cabang wajib diisi." },
    };
  }

  // Nama unik (case-insensitive di MySQL default collation).
  const existing = await prisma.branch.findFirst({ where: { name } });
  if (existing) {
    return {
      success: false,
      error: "Nama cabang sudah digunakan.",
      fieldErrors: { name: "Nama cabang sudah digunakan." },
    };
  }

  // Cabang baru SELALU bukan pusat.
  await prisma.branch.create({
    data: {
      name,
      address: data.address?.trim() || null,
      isPusat: false,
      isActive: true,
    },
  });

  revalidatePath("/admin/cabang");
  return { success: true };
}

export async function updateBranch(
  id: number,
  data: BranchUpdateInput,
): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const branch = await prisma.branch.findUnique({ where: { id } });
  if (!branch) {
    return { success: false, error: "Cabang tidak ditemukan." };
  }

  const name = data.name?.trim() ?? "";
  if (!name) {
    return {
      success: false,
      error: "Nama cabang wajib diisi.",
      fieldErrors: { name: "Nama cabang wajib diisi." },
    };
  }

  const duplicate = await prisma.branch.findFirst({
    where: { name, id: { not: id } },
  });
  if (duplicate) {
    return {
      success: false,
      error: "Nama cabang sudah digunakan.",
      fieldErrors: { name: "Nama cabang sudah digunakan." },
    };
  }

  // Kantor pusat tidak boleh dinonaktifkan.
  const isActive = branch.isPusat ? true : data.isActive;

  // isPusat TIDAK pernah diubah dari sini (diblokir).
  await prisma.branch.update({
    where: { id },
    data: {
      name,
      address: data.address?.trim() || null,
      isActive,
    },
  });

  revalidatePath("/admin/cabang");
  return { success: true };
}

/** Soft delete (isActive=false). Diblokir untuk kantor pusat. */
export async function deleteBranch(id: number): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const branch = await prisma.branch.findUnique({ where: { id } });
  if (!branch) {
    return { success: false, error: "Cabang tidak ditemukan." };
  }

  if (branch.isPusat) {
    return {
      success: false,
      error: "Kantor pusat tidak dapat dinonaktifkan.",
    };
  }

  await prisma.branch.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath("/admin/cabang");
  return { success: true };
}
