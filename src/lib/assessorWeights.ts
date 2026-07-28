import type { RoleType } from "@prisma/client";

/** Hierarki jabatan penilai: makin kecil = makin tinggi. */
export const ROLE_LEVEL: Record<string, number> = {
  hrd: 1,
  kepala_cabang: 2,
  kepala_divisi: 3,
};

export const ELIGIBLE_ASSESSOR_ROLES: RoleType[] = [
  "hrd",
  "kepala_cabang",
  "kepala_divisi",
];

/**
 * Bobot 60-40 otomatis dari hierarki jabatan penilai.
 * - 1 penilai → { weight1: 100, weight2: null }
 * - 2 penilai → yang levelnya lebih tinggi (atau sama = penilai 1) dapat 60.
 */
export function computeWeights(
  role1: RoleType,
  role2?: RoleType | null,
): { weight1: number; weight2: number | null } {
  if (!role2) return { weight1: 100, weight2: null };
  const l1 = ROLE_LEVEL[role1] ?? 99;
  const l2 = ROLE_LEVEL[role2] ?? 99;
  return l1 <= l2
    ? { weight1: 60, weight2: 40 }
    : { weight1: 40, weight2: 60 };
}
