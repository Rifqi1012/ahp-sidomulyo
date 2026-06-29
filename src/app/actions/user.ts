"use server";

import { revalidatePath } from "next/cache";
import type { Branch, RoleType, User } from "@prisma/client";

import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-guard";
import { ASSIGNABLE_ROLES } from "@/lib/labels";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/constants";
import type { ActionResult } from "@/app/actions/branch";

export type { ActionResult };

export type UserWithBranch = User & { branch: Branch | null };

export type UserFilter = {
  role?: RoleType;
  branchId?: number;
  status?: "active" | "inactive";
};

export async function getUsers(
  filter: UserFilter = {},
): Promise<UserWithBranch[]> {
  return prisma.user.findMany({
    where: {
      ...(filter.role ? { role: filter.role } : {}),
      ...(filter.branchId ? { branchId: filter.branchId } : {}),
      ...(filter.status ? { isActive: filter.status === "active" } : {}),
    },
    include: { branch: true },
    orderBy: { name: "asc" },
  });
}

export async function getUser(id: number): Promise<UserWithBranch | null> {
  return prisma.user.findUnique({
    where: { id },
    include: { branch: true },
  });
}

export type UserUpdateInput = {
  name: string;
  email: string;
  role: RoleType;
  isActive: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateUser(
  id: number,
  data: UserUpdateInput,
): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return { success: false, error: "User tidak ditemukan." };
  }

  const name = data.name?.trim() ?? "";
  if (!name) {
    return {
      success: false,
      error: "Nama tidak boleh kosong.",
      fieldErrors: { name: "Nama tidak boleh kosong." },
    };
  }
  if (name.length > 150) {
    return {
      success: false,
      error: "Nama maksimal 150 karakter.",
      fieldErrors: { name: "Nama maksimal 150 karakter." },
    };
  }

  const isProtected = user.email === PROTECTED_ADMIN_EMAIL;

  // Akun admin utama: hanya nama yang boleh diubah.
  if (isProtected) {
    await prisma.user.update({ where: { id }, data: { name } });
    revalidatePath("/admin/users");
    revalidatePath("/admin/karyawan");
    return { success: true };
  }

  const email = data.email?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(email)) {
    return {
      success: false,
      error: "Format email tidak valid.",
      fieldErrors: { email: "Format email tidak valid." },
    };
  }
  const existing = await prisma.user.findFirst({
    where: { email, NOT: { id } },
    select: { id: true },
  });
  if (existing) {
    return {
      success: false,
      error: "Email sudah digunakan oleh pengguna lain.",
      fieldErrors: { email: "Email sudah digunakan oleh pengguna lain." },
    };
  }

  // Cegah privilege escalation: role 'admin' tidak boleh di-assign via UI.
  if (!ASSIGNABLE_ROLES.includes(data.role)) {
    return {
      success: false,
      error: "Role tersebut tidak dapat dipilih.",
      fieldErrors: { role: "Role tidak valid." },
    };
  }

  await prisma.user.update({
    where: { id },
    data: { name, email, role: data.role, isActive: data.isActive },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/karyawan");
  return { success: true };
}
