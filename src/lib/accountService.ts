import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";

import prisma from "@/lib/prisma";
import { DEFAULT_PASSWORD } from "@/lib/constants";

const EMAIL_DOMAIN = "@sidomulyo.com";

/** Mengubah nama menjadi slug email: lowercase + hapus non-alfanumerik. */
function slugifyName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // buang diakritik
    .replace(/[^a-z0-9]/g, "");
  return slug || "user";
}

/**
 * Generate email unik dari nama.
 *   "Budi Santoso" -> "budisantoso@sidomulyo.com"
 * Jika sudah dipakai, tambahkan angka: budisantoso2@sidomulyo.com, dst.
 */
export async function generateEmail(name: string): Promise<string> {
  const base = slugifyName(name);

  let candidate = `${base}${EMAIL_DOMAIN}`;
  let counter = 1;

  // Cari email yang belum dipakai.
  while (await prisma.user.findUnique({ where: { email: candidate } })) {
    counter += 1;
    candidate = `${base}${counter}${EMAIL_DOMAIN}`;
  }

  return candidate;
}

export type CreateEmployeeAccountData = {
  name: string;
  nik?: string | null;
  hireDate?: Date | null;
  branchId: number;
  departmentId: number;
  jabatanId: number;
};

/**
 * Membuat akun karyawan baru:
 * - email di-generate otomatis dari nama
 * - password default "password" (di-hash bcrypt)
 * - role mengikuti roleSystem dari jabatan
 */
export async function createEmployeeAccount(
  data: CreateEmployeeAccountData,
): Promise<User> {
  const jabatan = await prisma.jabatan.findUnique({
    where: { id: data.jabatanId },
  });
  if (!jabatan) {
    throw new Error("Jabatan tidak ditemukan.");
  }

  const email = await generateEmail(data.name);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  return prisma.user.create({
    data: {
      name: data.name.trim(),
      email,
      password: passwordHash,
      role: jabatan.roleSystem,
      branchId: data.branchId,
      departmentId: data.departmentId,
      jabatanId: data.jabatanId,
      nik: data.nik?.trim() || null,
      hireDate: data.hireDate ?? null,
      isActive: true,
    },
  });
}

/** Reset password user ke default "password". */
export async function resetUserPassword(userId: number): Promise<void> {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: passwordHash },
  });
}
