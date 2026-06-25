/**
 * Mengembalikan URL dashboard default untuk setiap role.
 */
export function getDashboardUrl(role: string): string {
  switch (role) {
    case "admin":
      return "/admin/cabang";
    case "direktur":
      return "/direktur/laporan";
    case "hrd":
      return "/hrd/periode";
    case "kepala_cabang":
      return "/kepala-cabang/penilaian";
    case "kepala_divisi":
      return "/kepala-divisi/penilaian";
    case "karyawan":
      return "/karyawan/hasil-saya";
    default:
      return "/login";
  }
}
