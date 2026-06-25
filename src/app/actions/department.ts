"use server";

import { revalidatePath } from "next/cache";
import type { Branch, Department } from "@prisma/client";

import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-guard";
import type { ActionResult } from "@/app/actions/branch";

export type { ActionResult };

export type DepartmentWithBranch = Department & { branch: Branch };

export type DepartmentInput = {
  branchId: number;
  name: string;
};

export type DepartmentUpdateInput = DepartmentInput & {
  isActive?: boolean;
};

/** Departemen, opsional difilter per cabang. */
export async function getDepartments(
  branchId?: number,
): Promise<DepartmentWithBranch[]> {
  return prisma.department.findMany({
    where: branchId ? { branchId } : undefined,
    include: { branch: true },
    orderBy: [{ branchId: "asc" }, { name: "asc" }],
  });
}

export async function getDepartment(
  id: number,
): Promise<DepartmentWithBranch | null> {
  return prisma.department.findUnique({
    where: { id },
    include: { branch: true },
  });
}

async function validateDepartment(
  data: DepartmentInput,
  excludeId?: number,
): Promise<ActionResult | { name: string }> {
  const name = data.name?.trim() ?? "";
  if (!name) {
    return {
      success: false,
      error: "Nama departemen wajib diisi.",
      fieldErrors: { name: "Nama departemen wajib diisi." },
    };
  }

  if (!data.branchId) {
    return {
      success: false,
      error: "Cabang wajib dipilih.",
      fieldErrors: { branchId: "Cabang wajib dipilih." },
    };
  }

  const branch = await prisma.branch.findUnique({
    where: { id: data.branchId },
  });
  if (!branch) {
    return {
      success: false,
      error: "Cabang tidak ditemukan.",
      fieldErrors: { branchId: "Cabang tidak ditemukan." },
    };
  }

  // Nama unik per cabang.
  const duplicate = await prisma.department.findFirst({
    where: {
      branchId: data.branchId,
      name,
      id: excludeId ? { not: excludeId } : undefined,
    },
  });
  if (duplicate) {
    return {
      success: false,
      error: "Nama departemen sudah ada di cabang ini.",
      fieldErrors: { name: "Nama departemen sudah ada di cabang ini." },
    };
  }

  return { name };
}

export async function createDepartment(
  data: DepartmentInput,
): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const result = await validateDepartment(data);
  if ("success" in result) return result;

  await prisma.department.create({
    data: {
      branchId: data.branchId,
      name: result.name,
      isActive: true,
    },
  });

  revalidatePath("/admin/departemen");
  return { success: true };
}

export async function updateDepartment(
  id: number,
  data: DepartmentUpdateInput,
): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) {
    return { success: false, error: "Departemen tidak ditemukan." };
  }

  const result = await validateDepartment(data, id);
  if ("success" in result) return result;

  await prisma.department.update({
    where: { id },
    data: {
      branchId: data.branchId,
      name: result.name,
      isActive: data.isActive ?? department.isActive,
    },
  });

  revalidatePath("/admin/departemen");
  return { success: true };
}

/** Soft delete (isActive=false). */
export async function deleteDepartment(id: number): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) {
    return { success: false, error: "Departemen tidak ditemukan." };
  }

  await prisma.department.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath("/admin/departemen");
  return { success: true };
}
