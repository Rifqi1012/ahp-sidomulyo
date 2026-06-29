import { PrismaClient, KpiType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// KPI definition types
// ---------------------------------------------------------------------------
type SubDef = {
  name: string;
  description: string;
  bobotPersen: number; // bobot subkriteria di dalam kriteria (sum = 100 per kriteria)
};

type CriteriaDef = {
  name: string;
  bobotPersen: number; // bobot kriteria (sum = 100 per template)
  subcriteria: SubDef[];
};

// ---------------------------------------------------------------------------
// KPI ATAS — untuk Kepala Cabang & Kepala Divisi
// ---------------------------------------------------------------------------
const KPI_ATAS: CriteriaDef[] = [
  {
    name: "Perilaku",
    bobotPersen: 25,
    subcriteria: [
      {
        name: "Integritas",
        bobotPersen: 25,
        description:
          "Melaksanakan komitmen yang telah disepakati; Jujur: Berbicara sesuai fakta dan data",
      },
      {
        name: "Kerajinan",
        bobotPersen: 15,
        description:
          "Kehadiran: Hadir Tepat Waktu; Ulet: Selalu mencari solusi untuk capai target",
      },
      {
        name: "Kerjasama",
        bobotPersen: 20,
        description:
          "Proaktif dan komunikatif; Mau mendengar & menghargai pendapat orang lain; Bisa bekerja secara bergotong royong",
      },
      {
        name: "Tanggungjawab",
        bobotPersen: 20,
        description:
          "Tugas & persoalan segera diselesaikan; Turba: Blusukan melihat fakta/lapangan; Melaporkan setiap perkembangan kepada atasan",
      },
      {
        name: "Improvement",
        bobotPersen: 20,
        description:
          "Memberikan ide kreatif untuk perbaikan; Melaksanakan tindakan kreatif untuk perbaikan",
      },
    ],
  },
  {
    name: "Kepemimpinan",
    bobotPersen: 25,
    subcriteria: [
      {
        name: "Kepemimpinan",
        bobotPersen: 100,
        description:
          "Mampu mengarahkan & memotivasi team; Mampu mendelegasikan tugas; Membuat suasana kondusif; Mampu melakukan kaderisasi; Mampu melaksanakan coaching & counseling; Mampu membuat keputusan yang tepat",
      },
    ],
  },
  {
    name: "Target Kerja",
    bobotPersen: 50,
    subcriteria: [
      {
        name: "Target vs Realisasi",
        bobotPersen: 25,
        description: "Memonitor seluruh kegiatan operational",
      },
      {
        name: "Relationship",
        bobotPersen: 25,
        description: "Menjalin komunikasi dengan tokoh agama/masyarakat",
      },
      {
        name: "Koordinasi Internal",
        bobotPersen: 25,
        description: "Melaporkan ketersediaan unit kendaraan",
      },
      {
        name: "Monitoring & Coaching",
        bobotPersen: 25,
        description: "Pelaksanaan monitoring, coaching, counseling",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// KPI BAWAH — untuk Karyawan
// ---------------------------------------------------------------------------
const KPI_BAWAH: CriteriaDef[] = [
  {
    name: "Faktor Efisiensi",
    bobotPersen: 60,
    subcriteria: [
      {
        name: "Penguasaan Pekerjaan",
        bobotPersen: 33.33,
        description: "Penguasaan terhadap pekerjaan",
      },
      {
        name: "Orientasi Mutu",
        bobotPersen: 33.33,
        description:
          "Menyelesaikan tugas dengan memperhatikan semua bidang yang terkait",
      },
      {
        name: "Jumlah Pekerjaan",
        bobotPersen: 33.34,
        description:
          "Kemampuan menyelesaikan tugas dan tanggung jawab yang diberikan atasan",
      },
    ],
  },
  {
    name: "Faktor Kebiasaan Kerja",
    bobotPersen: 40,
    subcriteria: [
      {
        name: "Komunikasi",
        bobotPersen: 20,
        description: "Dapat menyampaikan gagasan secara efektif",
      },
      {
        name: "Inisiatif",
        bobotPersen: 20,
        description: "Aktif dengan berbagai usaha untuk mencapai sasaran",
      },
      {
        name: "Follow Up",
        bobotPersen: 20,
        description: "Dapat memantau hasil-hasil delegasi dan penugasan",
      },
      {
        name: "Team Work",
        bobotPersen: 20,
        description: "Bekerja secara efektif dengan Tim",
      },
      {
        name: "Kehadiran",
        bobotPersen: 20,
        description: "Kehadiran dan ketepatan waktu dalam bekerja",
      },
    ],
  },
];

/**
 * Membuat 1 KpiTemplate beserta kriteria & subkriteria, dengan ahpWeight
 * yang dihitung otomatis dari bobot persen lalu dinormalisasi global agar
 * total seluruh ahpWeight subkriteria = 1.0.
 *
 *   ahpWeightRaw = (bobotSub/100) × (bobotKriteria/100)
 *   ahpWeight    = ahpWeightRaw / Σ(ahpWeightRaw)
 */
async function createKpiTemplate(
  type: KpiType,
  criteriaDefs: CriteriaDef[],
  createdBy: number,
) {
  const totalCriteriaBobot = criteriaDefs.reduce(
    (sum, c) => sum + c.bobotPersen,
    0,
  );

  // total raw weight untuk normalisasi global
  const totalRaw = criteriaDefs.reduce((sum, c) => {
    const subSum = c.subcriteria.reduce(
      (s, sub) => s + (sub.bobotPersen / 100) * (c.bobotPersen / 100),
      0,
    );
    return sum + subSum;
  }, 0);

  const template = await prisma.kpiTemplate.create({
    data: {
      type,
      version: 1,
      isCurrent: true,
      createdBy,
    },
  });

  for (let i = 0; i < criteriaDefs.length; i++) {
    const c = criteriaDefs[i];
    const criteriaAhp = c.bobotPersen / totalCriteriaBobot;

    const criteria = await prisma.kpiCriteria.create({
      data: {
        kpiTemplateId: template.id,
        name: c.name,
        bobotPersen: c.bobotPersen,
        ahpWeight: Number(criteriaAhp.toFixed(6)),
        orderNumber: i + 1,
      },
    });

    for (let j = 0; j < c.subcriteria.length; j++) {
      const sub = c.subcriteria[j];
      const raw = (sub.bobotPersen / 100) * (c.bobotPersen / 100);
      const ahpWeight = raw / totalRaw; // normalisasi global

      await prisma.kpiSubcriteria.create({
        data: {
          kpiCriteriaId: criteria.id,
          name: sub.name,
          description: sub.description,
          bobotPersen: sub.bobotPersen,
          ahpWeight: Number(ahpWeight.toFixed(6)),
          orderNumber: j + 1,
        },
      });
    }
  }

  return template;
}

async function main() {
  console.log("🌱 Seeding database...");

  // -------------------------------------------------------------------------
  // 1. BRANCHES
  // -------------------------------------------------------------------------
  const pusat = await prisma.branch.create({
    data: {
      name: "Kantor Pusat",
      address: "Jakarta",
      isPusat: true,
      isActive: true,
    },
  });

  const cilegon = await prisma.branch.create({
    data: {
      name: "Cabang Cilegon",
      address: "Cilegon",
      isPusat: false,
      isActive: true,
    },
  });

  console.log("✅ Branches created");

  // -------------------------------------------------------------------------
  // 2. DEPARTMENTS
  // -------------------------------------------------------------------------
  const departmentsPusat = [
    "Operational",
    "Board of Directors",
    "Information & Technology",
    "Finance & Accounting",
    "Maintenance",
    "Corporate Secretary",
    "HC & GA",
  ];

  const departmentsCilegon = [
    "Operational",
    "Finance & Accounting",
    "HC & GA",
    "Maintenance",
    "Isotank",
    "Warehouse",
    "HSE",
  ];

  await prisma.department.createMany({
    data: departmentsPusat.map((name) => ({ branchId: pusat.id, name })),
  });

  await prisma.department.createMany({
    data: departmentsCilegon.map((name) => ({ branchId: cilegon.id, name })),
  });

  console.log("✅ Departments created");

  // -------------------------------------------------------------------------
  // 3. JABATAN (terikat departemen & cabang)
  // -------------------------------------------------------------------------
  const allDepts = await prisma.department.findMany();
  const deptId = (branchId: number, name: string): number | null =>
    allDepts.find((d) => d.branchId === branchId && d.name === name)?.id ?? null;

  // Jabatan dasar (id eksplisit 1–8).
  await prisma.jabatan.createMany({
    data: [
      { id: 1, name: "Direktur", level: null, branchId: null, departmentId: null, roleSystem: "direktur" },
      { id: 2, name: "Admin", level: null, branchId: null, departmentId: null, roleSystem: "admin" },
      { id: 3, name: "HRD", level: null, branchId: pusat.id, departmentId: deptId(pusat.id, "HC & GA"), roleSystem: "hrd" },
      { id: 4, name: "Kepala Divisi", level: "atas", branchId: pusat.id, departmentId: null, roleSystem: "kepala_divisi" },
      { id: 5, name: "Karyawan", level: "bawah", branchId: pusat.id, departmentId: null, roleSystem: "karyawan" },
      { id: 6, name: "Kepala Cabang", level: "atas", branchId: null, departmentId: null, roleSystem: "kepala_cabang" },
      { id: 7, name: "Kepala Divisi", level: "atas", branchId: null, departmentId: null, roleSystem: "kepala_divisi" },
      { id: 8, name: "Karyawan", level: "bawah", branchId: pusat.id, departmentId: null, roleSystem: "karyawan" },
    ],
  });

  // Jabatan spesifik (demo) — Pusat.
  await prisma.jabatan.createMany({
    data: [
      { name: "Staff IT", branchId: pusat.id, departmentId: deptId(pusat.id, "Information & Technology"), roleSystem: "karyawan", level: "bawah" },
      { name: "Staff Finance", branchId: pusat.id, departmentId: deptId(pusat.id, "Finance & Accounting"), roleSystem: "karyawan", level: "bawah" },
      { name: "Staff HC & GA", branchId: pusat.id, departmentId: deptId(pusat.id, "HC & GA"), roleSystem: "karyawan", level: "bawah" },
      { name: "Kepala Divisi IT", branchId: pusat.id, departmentId: deptId(pusat.id, "Information & Technology"), roleSystem: "kepala_divisi", level: "atas" },
      { name: "Kepala Divisi Finance", branchId: pusat.id, departmentId: deptId(pusat.id, "Finance & Accounting"), roleSystem: "kepala_divisi", level: "atas" },
    ],
  });

  // Jabatan spesifik (demo) — Cabang Cilegon.
  await prisma.jabatan.createMany({
    data: [
      { name: "Security", branchId: cilegon.id, departmentId: deptId(cilegon.id, "Operational"), roleSystem: "karyawan", level: "bawah" },
      { name: "Mekanik", branchId: cilegon.id, departmentId: deptId(cilegon.id, "Maintenance"), roleSystem: "karyawan", level: "bawah" },
      { name: "Welder", branchId: cilegon.id, departmentId: deptId(cilegon.id, "Maintenance"), roleSystem: "karyawan", level: "bawah" },
      { name: "Staff Warehouse", branchId: cilegon.id, departmentId: deptId(cilegon.id, "Warehouse"), roleSystem: "karyawan", level: "bawah" },
      { name: "Staff HSE", branchId: cilegon.id, departmentId: deptId(cilegon.id, "HSE"), roleSystem: "karyawan", level: "bawah" },
      { name: "Office Boy", branchId: cilegon.id, departmentId: deptId(cilegon.id, "HC & GA"), roleSystem: "karyawan", level: "bawah" },
      { name: "Staff Accounting", branchId: cilegon.id, departmentId: deptId(cilegon.id, "Finance & Accounting"), roleSystem: "karyawan", level: "bawah" },
      { name: "Staff Isotank", branchId: cilegon.id, departmentId: deptId(cilegon.id, "Isotank"), roleSystem: "karyawan", level: "bawah" },
    ],
  });

  console.log("✅ Jabatan created");

  // -------------------------------------------------------------------------
  // 4. USERS (default accounts, password: "password")
  // -------------------------------------------------------------------------
  const passwordHash = await bcrypt.hash("password", 10);

  const direktur = await prisma.user.create({
    data: {
      name: "Direktur Utama",
      email: "direktur@sidomulyo.com",
      password: passwordHash,
      role: "direktur",
      branchId: pusat.id,
      jabatanId: 1,
    },
  });

  await prisma.user.create({
    data: {
      name: "Admin Sistem",
      email: "admin@sidomulyo.com",
      password: passwordHash,
      role: "admin",
      branchId: pusat.id,
      jabatanId: 2,
    },
  });

  const hrd = await prisma.user.create({
    data: {
      name: "Admin HRD",
      email: "hrd@sidomulyo.com",
      password: passwordHash,
      role: "hrd",
      branchId: pusat.id,
      jabatanId: 3,
    },
  });

  console.log("✅ Users created");

  // -------------------------------------------------------------------------
  // 5. KPI TEMPLATES (ahpWeight dihitung & dinormalisasi otomatis)
  // -------------------------------------------------------------------------
  await createKpiTemplate("atas", KPI_ATAS, hrd.id);
  await createKpiTemplate("bawah", KPI_BAWAH, hrd.id);

  console.log("✅ KPI templates (atas & bawah) created with normalized AHP weights");

  console.log("🎉 Seeding selesai!");
  console.log("   Login default — password: \"password\"");
  console.log("   - direktur@sidomulyo.com");
  console.log("   - admin@sidomulyo.com");
  console.log("   - hrd@sidomulyo.com");
  void direktur;
}

main()
  .catch((e) => {
    console.error("❌ Seeding gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
