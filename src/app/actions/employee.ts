"use server";

import { revalidatePath } from "next/cache";
import type { Branch, Department, Jabatan, User } from "@prisma/client";

import prisma from "@/lib/prisma";
import { isAdmin, getSessionUser } from "@/lib/auth-guard";
import type { Prisma, RoleType } from "@prisma/client";
import {
  createEmployeeAccount,
  resetUserPassword,
} from "@/lib/accountService";
import { PROTECTED_ADMIN_EMAIL, EMPLOYEE_PAGE_SIZE } from "@/lib/constants";
import type { ActionResult } from "@/app/actions/branch";

export type { ActionResult };

export type EmployeeWithRelations = User & {
  branch: Branch | null;
  department: Department | null;
  jabatan: Jabatan | null;
};

export type EmployeeFilter = {
  branchId?: number;
  departmentId?: number;
  jabatanId?: number;
  status?: "active" | "inactive";
  page?: number;
};

export type EmployeeListResult = {
  items: EmployeeWithRelations[];
  total: number;
  page: number;
  pageCount: number;
};

export type EmployeeInput = {
  name: string;
  nik?: string | null;
  hireDate?: string | null; // yyyy-mm-dd
  branchId: number;
  departmentId: number;
  jabatanId: number;
};

export type CreateEmployeeResult =
  | { success: true; email: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export async function getEmployees(
  filter: EmployeeFilter = {},
): Promise<EmployeeListResult> {
  const page = Math.max(1, filter.page ?? 1);

  const where = {
    ...(filter.branchId ? { branchId: filter.branchId } : {}),
    ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
    ...(filter.jabatanId ? { jabatanId: filter.jabatanId } : {}),
    ...(filter.status ? { isActive: filter.status === "active" } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { branch: true, department: true, jabatan: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * EMPLOYEE_PAGE_SIZE,
      take: EMPLOYEE_PAGE_SIZE,
    }),
  ]);

  return {
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / EMPLOYEE_PAGE_SIZE)),
  };
}

export async function getEmployee(
  id: number,
): Promise<EmployeeWithRelations | null> {
  return prisma.user.findUnique({
    where: { id },
    include: { branch: true, department: true, jabatan: true },
  });
}

async function validateEmployee(
  data: EmployeeInput,
  excludeId?: number,
): Promise<{ ok: false; result: CreateEmployeeResult } | { ok: true }> {
  const name = data.name?.trim() ?? "";
  if (!name) {
    return {
      ok: false,
      result: {
        success: false,
        error: "Nama lengkap wajib diisi.",
        fieldErrors: { name: "Nama lengkap wajib diisi." },
      },
    };
  }
  if (!data.branchId) {
    return {
      ok: false,
      result: {
        success: false,
        error: "Cabang wajib dipilih.",
        fieldErrors: { branchId: "Cabang wajib dipilih." },
      },
    };
  }
  if (!data.departmentId) {
    return {
      ok: false,
      result: {
        success: false,
        error: "Departemen wajib dipilih.",
        fieldErrors: { departmentId: "Departemen wajib dipilih." },
      },
    };
  }
  if (!data.jabatanId) {
    return {
      ok: false,
      result: {
        success: false,
        error: "Jabatan wajib dipilih.",
        fieldErrors: { jabatanId: "Jabatan wajib dipilih." },
      },
    };
  }

  // NIK unik (jika diisi).
  const nik = data.nik?.trim();
  if (nik) {
    const duplicate = await prisma.user.findFirst({
      where: { nik, id: excludeId ? { not: excludeId } : undefined },
    });
    if (duplicate) {
      return {
        ok: false,
        result: {
          success: false,
          error: "NIK sudah digunakan.",
          fieldErrors: { nik: "NIK sudah digunakan." },
        },
      };
    }
  }

  return { ok: true };
}

export async function createEmployee(
  data: EmployeeInput,
): Promise<CreateEmployeeResult> {
  if (!(await isAdmin())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const validation = await validateEmployee(data);
  if (!validation.ok) return validation.result;

  const user = await createEmployeeAccount({
    name: data.name,
    nik: data.nik,
    hireDate: data.hireDate ? new Date(data.hireDate) : null,
    branchId: data.branchId,
    departmentId: data.departmentId,
    jabatanId: data.jabatanId,
  });

  revalidatePath("/admin/karyawan");
  return { success: true, email: user.email };
}

export type EmployeeUpdateInput = EmployeeInput & { isActive: boolean };

export async function updateEmployee(
  id: number,
  data: EmployeeUpdateInput,
): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const employee = await prisma.user.findUnique({ where: { id } });
  if (!employee) {
    return { success: false, error: "Karyawan tidak ditemukan." };
  }

  const validation = await validateEmployee(data, id);
  if (!validation.ok) {
    const r = validation.result;
    return r.success
      ? { success: true }
      : { success: false, error: r.error, fieldErrors: r.fieldErrors };
  }

  // Jika jabatan berubah, sinkronkan role mengikuti roleSystem jabatan baru.
  let role = employee.role;
  if (data.jabatanId !== employee.jabatanId) {
    const jabatan = await prisma.jabatan.findUnique({
      where: { id: data.jabatanId },
    });
    if (jabatan) role = jabatan.roleSystem;
  }

  // Akun admin utama tidak boleh dinonaktifkan.
  const isActive =
    employee.email === PROTECTED_ADMIN_EMAIL ? true : data.isActive;

  await prisma.user.update({
    where: { id },
    data: {
      name: data.name.trim(),
      nik: data.nik?.trim() || null,
      hireDate: data.hireDate ? new Date(data.hireDate) : null,
      branchId: data.branchId,
      departmentId: data.departmentId,
      jabatanId: data.jabatanId,
      role,
      isActive,
    },
  });

  revalidatePath("/admin/karyawan");
  revalidatePath("/admin/users");
  return { success: true };
}

export async function resetPassword(id: number): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return { success: false, error: "Karyawan tidak ditemukan." };
  }

  await resetUserPassword(id);
  return { success: true };
}

export async function toggleActive(id: number): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return { success: false, error: "Karyawan tidak ditemukan." };
  }
  if (user.email === PROTECTED_ADMIN_EMAIL) {
    return {
      success: false,
      error: "Akun admin utama tidak dapat dinonaktifkan.",
    };
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
  });

  revalidatePath("/admin/karyawan");
  revalidatePath("/admin/users");
  return { success: true };
}

// ---------------------------------------------------------------------------
// READ-ONLY: Lihat Karyawan (HRD / Kepala Cabang / Kepala Divisi)
// ---------------------------------------------------------------------------

export type EmployeeViewFilter = {
  search?: string;
  branchId?: number;
  departmentId?: number;
  jabatanId?: number;
  role?: RoleType;
  isActive?: boolean;
  page?: number;
  sortBy?: "name" | "branch" | "jabatan" | "department" | "status";
  sortOrder?: "asc" | "desc";
};

export type EmployeeViewResult = {
  data: EmployeeWithRelations[];
  total: number;
};

function buildOrderBy(
  sortBy?: string,
  sortOrder?: "asc" | "desc",
): Prisma.UserOrderByWithRelationInput {
  const dir: "asc" | "desc" = sortOrder === "desc" ? "desc" : "asc";
  switch (sortBy) {
    case "branch":
      return { branch: { name: dir } };
    case "jabatan":
      return { jabatan: { name: dir } };
    case "department":
      return { department: { name: dir } };
    case "status":
      return { isActive: dir };
    case "name":
    default:
      return { name: dir };
  }
}

async function queryEmployees(
  where: Prisma.UserWhereInput,
  filter: EmployeeViewFilter,
): Promise<EmployeeViewResult> {
  const page = Math.max(1, filter.page ?? 1);
  const [total, data] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { branch: true, department: true, jabatan: true },
      orderBy: buildOrderBy(filter.sortBy, filter.sortOrder),
      skip: (page - 1) * EMPLOYEE_PAGE_SIZE,
      take: EMPLOYEE_PAGE_SIZE,
    }),
  ]);
  return { data, total };
}

/** HRD: semua karyawan kecuali admin & direktur. */
export async function getEmployeesForHrd(
  filter: EmployeeViewFilter,
): Promise<EmployeeViewResult> {
  const user = await getSessionUser();
  if (user?.role !== "hrd") return { data: [], total: 0 };

  const where: Prisma.UserWhereInput = {
    role: filter.role ? filter.role : { notIn: ["admin", "direktur"] },
    ...(filter.search ? { name: { contains: filter.search } } : {}),
    ...(filter.branchId ? { branchId: filter.branchId } : {}),
    ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
    ...(filter.jabatanId ? { jabatanId: filter.jabatanId } : {}),
    ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
  };
  return queryEmployees(where, filter);
}

/** Kepala Cabang: karyawan di cabang yang sama (KD & Karyawan saja). */
export async function getEmployeesForKc(
  branchId: number,
  filter: EmployeeViewFilter,
): Promise<EmployeeViewResult> {
  const user = await getSessionUser();
  if (user?.role !== "kepala_cabang" || user.branchId !== branchId) {
    return { data: [], total: 0 };
  }

  const where: Prisma.UserWhereInput = {
    branchId,
    role: filter.role ? filter.role : { in: ["kepala_divisi", "karyawan"] },
    ...(filter.search ? { name: { contains: filter.search } } : {}),
    ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
    ...(filter.jabatanId ? { jabatanId: filter.jabatanId } : {}),
    ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
  };
  return queryEmployees(where, filter);
}

/** Kepala Divisi: karyawan di cabang & departemen yang sama. */
export async function getEmployeesForKd(
  branchId: number,
  departmentId: number,
  filter: EmployeeViewFilter,
): Promise<EmployeeViewResult> {
  const user = await getSessionUser();
  if (
    user?.role !== "kepala_divisi" ||
    user.branchId !== branchId ||
    user.departmentId !== departmentId
  ) {
    return { data: [], total: 0 };
  }

  const where: Prisma.UserWhereInput = {
    branchId,
    departmentId,
    role: "karyawan",
    ...(filter.search ? { name: { contains: filter.search } } : {}),
    ...(filter.jabatanId ? { jabatanId: filter.jabatanId } : {}),
    ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
  };
  return queryEmployees(where, filter);
}

/** Detail satu karyawan dengan validasi scope per role. */
export async function getEmployeeDetail(
  id: number,
  requestorRole: string,
  requestorBranchId?: number | null,
  requestorDeptId?: number | null,
): Promise<EmployeeWithRelations | null> {
  const employee = await prisma.user.findUnique({
    where: { id },
    include: { branch: true, department: true, jabatan: true },
  });
  if (!employee) return null;

  if (requestorRole === "hrd") return employee;
  if (requestorRole === "kepala_cabang") {
    return employee.branchId === requestorBranchId ? employee : null;
  }
  if (requestorRole === "kepala_divisi") {
    return employee.branchId === requestorBranchId &&
      employee.departmentId === requestorDeptId
      ? employee
      : null;
  }
  return null;
}
