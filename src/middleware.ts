import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { getDashboardUrl } from "@/lib/getDashboardUrl";

// Mapping prefix route -> role yang diizinkan.
const roleRoutes: Record<string, string[]> = {
  "/admin": ["admin"],
  "/direktur": ["direktur"],
  "/hrd": ["hrd"],
  "/kepala-cabang": ["kepala_cabang"],
  "/kepala-divisi": ["kepala_divisi"],
  "/karyawan": ["karyawan"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const role = token?.role as string | undefined;

  // 1. Sudah login tapi mengakses /login -> arahkan ke dashboard role.
  if (pathname === "/login") {
    if (token && role) {
      return NextResponse.redirect(new URL(getDashboardUrl(role), req.url));
    }
    return NextResponse.next();
  }

  // 2. Root "/" -> dashboard (jika login) atau login.
  if (pathname === "/") {
    if (token && role) {
      return NextResponse.redirect(new URL(getDashboardUrl(role), req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 3. Halaman unauthorized boleh diakses siapa saja (selama logic lain lolos).
  if (pathname === "/unauthorized") {
    return NextResponse.next();
  }

  // 4. Cek apakah path termasuk route yang diproteksi per-role.
  const matched = Object.entries(roleRoutes).find(([prefix]) =>
    pathname.startsWith(prefix),
  );

  if (matched) {
    // Belum login -> ke /login.
    if (!token || !role) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role tidak sesuai -> unauthorized.
    const allowedRoles = matched[1];
    if (!allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Semua path kecuali _next, api/auth, dan file statis.
  matcher: [
    "/((?!_next/static|_next/image|api/auth|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
