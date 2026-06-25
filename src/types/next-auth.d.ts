import type { RoleType } from "@prisma/client";
import type { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  /**
   * Dikembalikan oleh `authorize` (Credentials provider) dan diteruskan ke
   * callback `jwt`. `id` tetap bertipe string mengikuti base type NextAuth.
   */
  interface User {
    role: RoleType;
    branchId: number | null;
    departmentId: number | null;
    jabatanId: number | null;
  }

  interface Session {
    user: {
      id: number;
      role: RoleType;
      branchId: number | null;
      departmentId: number | null;
      jabatanId: number | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: number;
    role: RoleType;
    branchId: number | null;
    departmentId: number | null;
    jabatanId: number | null;
  }
}
