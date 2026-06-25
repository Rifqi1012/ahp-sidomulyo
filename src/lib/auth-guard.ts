import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

/** Mengembalikan user session saat ini, atau null jika belum login. */
export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/** True jika user yang sedang login memiliki role admin. */
export async function isAdmin() {
  const user = await getSessionUser();
  return user?.role === "admin";
}

/** True jika user yang sedang login memiliki role hrd. */
export async function isHrd() {
  const user = await getSessionUser();
  return user?.role === "hrd";
}
