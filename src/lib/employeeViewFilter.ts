import type { RoleType } from "@prisma/client";

import { ALL_ROLES } from "@/lib/labels";
import type { EmployeeViewFilter } from "@/app/actions/employee";

type SP = Record<string, string | undefined>;

function num(v?: string) {
  const n = v ? Number(v) : undefined;
  return n && !Number.isNaN(n) ? n : undefined;
}

/** Parse search params menjadi filter Lihat Karyawan. */
export function parseEmployeeViewFilter(sp: SP): EmployeeViewFilter {
  return {
    search: sp.search,
    branchId: num(sp.branchId),
    departmentId: num(sp.departmentId),
    jabatanId: num(sp.jabatanId),
    role:
      sp.role && ALL_ROLES.includes(sp.role as RoleType)
        ? (sp.role as RoleType)
        : undefined,
    isActive:
      sp.status === "active"
        ? true
        : sp.status === "inactive"
          ? false
          : undefined,
    page: num(sp.page) ?? 1,
    sortBy: sp.sortBy as EmployeeViewFilter["sortBy"],
    sortOrder: sp.sortOrder === "desc" ? "desc" : "asc",
  };
}
