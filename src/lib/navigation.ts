import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Network,
  Briefcase,
  Users,
  UserCog,
  Calendar,
  SlidersHorizontal,
  ClipboardList,
  ClipboardCheck,
  FileText,
  Trophy,
  History,
  FileCheck2,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  admin: [
    { label: "Kelola Cabang", href: "/admin/cabang", icon: Building2 },
    { label: "Kelola Departemen", href: "/admin/departemen", icon: Network },
    { label: "Kelola Jabatan", href: "/admin/jabatan", icon: Briefcase },
    { label: "Kelola Karyawan", href: "/admin/karyawan", icon: Users },
    { label: "Manajemen User", href: "/admin/users", icon: UserCog },
  ],
  hrd: [
    { label: "Kelola Periode", href: "/hrd/periode", icon: Calendar },
    { label: "Setup KPI Pengawas", href: "/hrd/kpi/atas", icon: SlidersHorizontal },
    { label: "Setup KPI Pelaksana", href: "/hrd/kpi/bawah", icon: SlidersHorizontal },
    { label: "Atur Penilaian", href: "/hrd/atur-penilaian", icon: ClipboardCheck },
    { label: "Data Karyawan", href: "/hrd/karyawan", icon: Users },
    { label: "Penilaian", href: "/hrd/penilaian", icon: ClipboardList },
    { label: "Laporan", href: "/hrd/laporan", icon: FileText },
    { label: "Peringkat", href: "/hrd/ranking", icon: Trophy },
    { label: "History", href: "/hrd/history", icon: History },
  ],
  direktur: [
    { label: "Laporan Kinerja", href: "/direktur/laporan", icon: FileText },
    { label: "Peringkat", href: "/direktur/ranking", icon: Trophy },
    { label: "History Penilaian", href: "/direktur/history", icon: History },
  ],
  kepala_cabang: [
    { label: "Penilaian", href: "/kepala-cabang/penilaian", icon: ClipboardList },
    { label: "Data Karyawan", href: "/kepala-cabang/karyawan", icon: Users },
    { label: "Laporan", href: "/kepala-cabang/laporan", icon: FileText },
    { label: "Peringkat", href: "/kepala-cabang/ranking", icon: Trophy },
    { label: "Hasil Penilaian Saya", href: "/kepala-cabang/hasil-saya", icon: FileCheck2 },
  ],
  kepala_divisi: [
    { label: "Penilaian", href: "/kepala-divisi/penilaian", icon: ClipboardList },
    { label: "Data Karyawan", href: "/kepala-divisi/karyawan", icon: Users },
    { label: "Laporan", href: "/kepala-divisi/laporan", icon: FileText },
    { label: "Peringkat", href: "/kepala-divisi/ranking", icon: Trophy },
    { label: "Hasil Penilaian Saya", href: "/kepala-divisi/hasil-saya", icon: FileCheck2 },
  ],
  karyawan: [
    { label: "Hasil Penilaian Saya", href: "/karyawan/hasil-saya", icon: FileCheck2 },
  ],
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  direktur: "Direktur",
  hrd: "HRD",
  kepala_cabang: "Kepala Cabang",
  kepala_divisi: "Kepala Divisi",
  karyawan: "Karyawan",
};

export function getNavItems(role: string): NavItem[] {
  return NAV_BY_ROLE[role] ?? [];
}

/** Judul halaman berdasarkan pathname aktif (untuk Header). */
export function getPageTitle(role: string, pathname: string): string {
  const items = getNavItems(role);
  // Pilih match terpanjang agar nested route tetap tepat.
  const match = items
    .filter((item) => pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "Dashboard";
}
