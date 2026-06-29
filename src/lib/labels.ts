import type { KpiLevel, RoleType } from "@prisma/client";

import { ROLE_LABELS } from "@/lib/navigation";

export { ROLE_LABELS };

export const ALL_ROLES: RoleType[] = [
  "admin",
  "direktur",
  "hrd",
  "kepala_cabang",
  "kepala_divisi",
  "karyawan",
];

/** Role yang boleh dipilih lewat UI manajemen user (admin dikecualikan). */
export const ASSIGNABLE_ROLES: RoleType[] = ALL_ROLES.filter(
  (r) => r !== "admin",
);

export function roleLabel(role: RoleType | string): string {
  return ROLE_LABELS[role] ?? role;
}

export const LEVEL_BADGE: Record<
  "atas" | "bawah" | "none",
  { label: string; variant: "blue" | "green" | "slate" }
> = {
  atas: { label: "KPI Atas", variant: "blue" },
  bawah: { label: "KPI Bawah", variant: "green" },
  none: { label: "—", variant: "slate" },
};

export function levelBadge(level: KpiLevel | null) {
  if (level === "atas") return LEVEL_BADGE.atas;
  if (level === "bawah") return LEVEL_BADGE.bawah;
  return LEVEL_BADGE.none;
}
