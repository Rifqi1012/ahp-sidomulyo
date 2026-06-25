# 📄 PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Sistem Penilaian Kinerja Karyawan
## PT Sidomulyo Selaras TBK

**Versi:** 1.0  
**Tanggal:** Juni 2026  
**Author:** Rifqi Muhammad Hamzah (NIM 10122054)  
**Program Studi:** Teknik Informatika — UNIKOM  

---

## 1. RINGKASAN EKSEKUTIF

### 1.1 Latar Belakang
PT Sidomulyo Selaras TBK saat ini menjalankan proses penilaian kinerja 
karyawan secara manual menggunakan formulir fisik. Proses ini memiliki 
beberapa kelemahan:
- Satu jenis KPI digunakan untuk semua jabatan (tidak relevan)
- Proses rekap nilai memakan waktu lama
- Tidak ada transparansi hasil penilaian ke karyawan
- Sulit melakukan analisis historis kinerja

### 1.2 Solusi
Membangun sistem penilaian kinerja berbasis web menggunakan metode 
**Analytical Hierarchy Process (AHP)** yang:
- Menyesuaikan KPI dengan karakteristik jabatan
- Mengotomatisasi perhitungan nilai berbobot
- Menyediakan dashboard analitik untuk monitoring
- Memberikan transparansi hasil ke karyawan

### 1.3 Tech Stack
| Layer | Teknologi |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | MySQL |
| ORM | Prisma ORM |
| CSS | Tailwind CSS + shadcn/ui |
| Auth | NextAuth.js |
| Deploy | VPS |

---

## 2. STAKEHOLDER & USER ROLES

### 2.1 Daftar Role

#### ADMIN
Bertanggung jawab atas pengelolaan data master sistem.
```
Akses:
1. Kelola Cabang (CRUD)
2. Kelola Departemen (CRUD)
3. Kelola Jabatan (CRUD)
4. Kelola Karyawan (CRUD + auto-generate akun)
5. Manajemen User (edit role, reset password, 
   aktif/nonaktif)
```

#### DIREKTUR
Akses read-only untuk monitoring kinerja perusahaan.
```
Akses:
1. History Penilaian Semua Periode
2. Laporan Kinerja (semua cabang, semua periode)
```

#### HRD
Mengelola siklus penilaian dari awal hingga akhir.
```
Akses:
1. Kelola Periode (buat, aktifkan, tutup)
2. Setup KPI (edit bobot kriteria & subkriteria)
3. Menilai Kepala Cabang (semua cabang)
4. Menilai Kepala Divisi Pusat
5. Menilai Kepala Divisi semua cabang
6. Laporan Kinerja
7. Histori Penilaian Semua Periode
```

#### KEPALA CABANG
Menilai bawahan di cabangnya dan melihat hasil penilaian diri sendiri.
```
Akses:
1. Menilai Kepala Divisi (di cabangnya)
2. Menilai Karyawan (semua karyawan di cabangnya)
3. Melihat Hasil Penilaian diri sendiri 
   (hanya periode aktif)
```

#### KEPALA DIVISI
Menilai karyawan di divisinya dan melihat hasil penilaian diri sendiri.
```
Akses:
1. Menilai Karyawan (di divisinya)
2. Melihat Hasil Penilaian diri sendiri
   (hanya periode aktif)
```

#### KARYAWAN
Hanya bisa melihat hasil penilaian diri sendiri.
```
Akses:
1. Melihat Hasil Penilaian diri sendiri
   (hanya periode aktif)
```

---

## 3. DATA MASTER

### 3.1 Cabang
| ID | Nama | Tipe |
|----|------|------|
| 1 | Kantor Pusat | Pusat (is_pusat=true) |
| 2 | Cabang Cilegon | Cabang |
| dst | Ditambah Admin via sistem | Cabang |

**Aturan:**
- Hanya boleh 1 kantor pusat, tidak bisa dihapus
- Admin bisa tambah cabang baru kapan saja

### 3.2 Departemen

**Kantor Pusat:**
Operational, Board of Directors, Information & Technology,
Finance & Accounting, Maintenance, Corporate Secretary, HC & GA

**Cabang Cilegon:**
Operational, Finance & Accounting, HC & GA,
Maintenance, Isotank, Warehouse, HSE

### 3.3 Jabatan
| Nama | Level KPI | Scope | Role Sistem |
|------|-----------|-------|-------------|
| Direktur | — | Pusat | direktur |
| Admin | — | Pusat | admin |
| HRD | — | Pusat | hrd |
| Kepala Divisi | Atas | Pusat | kepala_divisi |
| Karyawan/Divisi | Bawah | Pusat | karyawan |
| Kepala Cabang | Atas | Cabang | kepala_cabang |
| Kepala Divisi | Atas | Cabang | kepala_divisi |
| Karyawan/Divisi | Bawah | Cabang | karyawan |

---

## 4. MATRIKS PENILAIAN

### 4.1 Siapa Menilai Siapa

| Yang Dinilai | Penilai 1 | Bobot | Penilai 2 | Bobot | KPI |
|---|---|:---:|---|:---:|---|
| Kepala Cabang | HRD | 100% | — | — | KPI Atas |
| KD Pusat | HRD | 100% | — | — | KPI Atas |
| KD Cabang | HRD | 60% | Kepala Cabang | 40% | KPI Atas |
| Karyawan | Kepala Cabang | 60% | Kepala Divisi | 40% | KPI Bawah |

### 4.2 Rumus Nilai Akhir

**Penilai Tunggal (100%):**
```
final_score = total_score_penilai
```

**Dua Penilai (60-40):**
```
final_score = (score_penilai1 × 60%) + (score_penilai2 × 40%)

Dihitung OTOMATIS saat kedua penilai submit.
Sebelum keduanya submit → status "Belum Lengkap"
```

### 4.3 Rumus Score per Penilai
```
weighted_score = nilai_input(1-5) 
                 × (bobot_kriteria / 100) 
                 × (bobot_subkriteria / 100)

total_score = Σ semua weighted_score
Skala hasil: 1.00 – 5.00
```

### 4.4 Kategori Nilai Akhir
| Rentang | Kategori |
|---------|----------|
| 4.5 – 5.0 | Sangat Baik |
| 3.5 – 4.4 | Baik |
| 2.5 – 3.4 | Cukup |
| 1.5 – 2.4 | Kurang |
| 1.0 – 1.4 | Sangat Kurang |

---

## 5. STRUKTUR KPI

### 5.1 Sifat KPI
- **Fixed struktur** — tidak bisa tambah/hapus kriteria & subkriteria
- **Editable** — HRD bisa edit nama, deskripsi, dan bobot %
- **Global** — berlaku untuk semua periode
- **Versioning otomatis** — saat diedit, versi lama tersimpan
  Data penilaian lama tetap merujuk ke versi KPI saat penilaian dilakukan
- **Validasi bobot** — total bobot kriteria harus = 100%,
  total bobot subkriteria per kriteria harus = 100%

### 5.2 KPI Atas (untuk KC & KD)

```
A. Perilaku [bobot % — default 25%]
   ├── Integritas      [default 25%]
   │   Indikator: Melaksanakan komitmen yang telah disepakati;
   │              Jujur: Berbicara sesuai fakta dan data
   ├── Kerajinan       [default 15%]
   │   Indikator: Kehadiran: Hadir Tepat Waktu;
   │              Ulet: Selalu mencari solusi untuk capai target
   ├── Kerjasama       [default 20%]
   │   Indikator: Proaktif dan komunikatif;
   │              Mau mendengar & menghargai pendapat orang lain;
   │              Bisa bekerja secara bergotong royong
   ├── Tanggungjawab   [default 20%]
   │   Indikator: Tugas & persoalan segera diselesaikan;
   │              Turba: Blusukan melihat fakta/lapangan;
   │              Melaporkan setiap perkembangan kepada atasan
   └── Improvement     [default 20%]
       Indikator: Memberikan ide kreatif untuk perbaikan;
                  Melaksanakan tindakan kreatif untuk perbaikan

B. Kepemimpinan [bobot % — default 25%]
   └── Kepemimpinan    [default 100%]
       Indikator: Mampu mengarahkan & memotivasi team;
                  Mampu mendelegasikan tugas;
                  Membuat suasana kondusif di dalam team;
                  Mampu melakukan kaderisasi;
                  Mampu melaksanakan coaching & counseling;
                  Mampu membuat keputusan yang tepat

C. Target Kerja [bobot % — default 50%]
   ├── Target vs Realisasi   [default 25%]
   │   Indikator: Memonitor seluruh kegiatan operational
   ├── Relationship          [default 25%]
   │   Indikator: Menjalin komunikasi dengan tokoh agama/masyarakat
   ├── Koordinasi Internal   [default 25%]
   │   Indikator: Melaporkan ketersediaan unit kendaraan
   └── Monitoring & Coaching [default 25%]
       Indikator: Pelaksanaan monitoring, coaching, counseling
```

### 5.3 KPI Bawah (untuk Karyawan)

```
I. Faktor Efisiensi [bobot % — default 60%]
   ├── Penguasaan Pekerjaan [default 33.33%]
   │   Indikator: Penguasaan terhadap pekerjaan
   ├── Orientasi Mutu       [default 33.33%]
   │   Indikator: Menyelesaikan tugas dengan memperhatikan 
   │              semua bidang yang terkait
   └── Jumlah Pekerjaan     [default 33.34%]
       Indikator: Kemampuan menyelesaikan tugas dan 
                  tanggung jawab yang diberikan atasan

II. Faktor Kebiasaan Kerja [bobot % — default 40%]
   ├── Komunikasi [default 20%]
   │   Indikator: Dapat menyampaikan gagasan secara efektif
   ├── Inisiatif  [default 20%]
   │   Indikator: Aktif dengan berbagai usaha untuk mencapai sasaran
   ├── Follow Up  [default 20%]
   │   Indikator: Dapat memantau hasil-hasil delegasi dan penugasan
   ├── Team Work  [default 20%]
   │   Indikator: Bekerja secara efektif dengan Tim
   └── Kehadiran  [default 20%]
       Indikator: Kehadiran dan ketepatan waktu dalam bekerja
```

### 5.4 AHP Otomatis dari Bobot %
```
Matriks AHP dibangkitkan otomatis:
  nilai_sel(i,j) = bobot_i / bobot_j

Contoh (Perilaku 25%, Kepemimpinan 25%, Target 50%):
           Perilaku  Kepemim  Target
Perilaku  [  1        1       0.5  ]
Kepemim   [  1        1       0.5  ]
Target    [  2        2       1    ]

CR = 0 (perfectly consistent)
Bobot AHP = bobot % / 100 (langsung)
```

---

## 6. MANAJEMEN PERIODE

### 6.1 Alur Periode
```
DRAFT → [HRD Aktifkan] → ACTIVE → [HRD Tutup] → CLOSED
```

### 6.2 Aturan Periode
- Hanya 1 periode bisa ACTIVE pada satu waktu
- Deadline penilaian = start_date + 7 hari (otomatis)
- Periode DRAFT: bisa diedit dan dihapus
- Periode ACTIVE: tidak bisa diedit
- Periode CLOSED: read-only, laporan tersedia
- Setelah deadline: semua form penilaian terkunci otomatis

### 6.3 Frekuensi Penilaian
Berdasarkan dokumen KPI: **3x setahun** (Maret, Juli, Desember)

---

## 7. AUTO-GENERATE AKUN KARYAWAN

```
Saat Admin tambah karyawan:
  Input  : Nama = "Budi Santoso"
  Output : email    = budisantoso@sidomulyo.com
           password = password (default)
           role     = otomatis dari jabatan yang dipilih

Jika email sudah ada:
  budisantoso2@sidomulyo.com
  budisantoso3@sidomulyo.com
  dst...
```

---

## 8. TAMPILAN HASIL PENILAIAN

### 8.1 Jika Sudah Lengkap (2 penilai submit)
```
┌─────────────────────────────────────────────┐
│ HASIL PENILAIAN — Budi Santoso              │
│ Karyawan | Finance & Accounting | Cilegon   │
├─────────────────────────────────────────────┤
│ NILAI AKHIR AHP        KATEGORI             │
│   3.84 / 5.00       ✅ Baik                │
├─────────────────────────────────────────────┤
│ RINCIAN PER PENILAI                         │
│                                             │
│ Kepala Cabang (Bobot 60%)                   │
│   Skor Mentah : 4.20                        │
│   Kontribusi  : 4.20 × 60% = 2.52          │
│   [Tabel detail subkriteria]                │
│                                             │
│ Kepala Divisi (Bobot 40%)                   │
│   Skor Mentah : 3.30                        │
│   Kontribusi  : 3.30 × 40% = 1.32          │
│   [Tabel detail subkriteria]                │
│                                             │
│ TOTAL AKHIR: 2.52 + 1.32 = 3.84            │
└─────────────────────────────────────────────┘
```

### 8.2 Jika Belum Lengkap
```
┌─────────────────────────────────────────────┐
│ HASIL PENILAIAN — Budi Santoso              │
├─────────────────────────────────────────────┤
│ NILAI AKHIR            STATUS               │
│   — / 5.00          ⏳ Belum Lengkap       │
├─────────────────────────────────────────────┤
│ STATUS PENILAI:                             │
│ ✅ Kepala Cabang  — Sudah dinilai (4.20)   │
│ ❌ Kepala Divisi  — Belum dinilai          │
└─────────────────────────────────────────────┘
```

### 8.3 Tabel Detail Subkriteria
```
Kriteria        | Subkriteria          | Nilai | Bobot  | Tertimbang
─────────────────────────────────────────────────────────────────────
Faktor Efisiensi| Penguasaan Pekerjaan |   4   | 31.65% |   1.266
                | Orientasi Mutu       |   3   | 13.02% |   0.391
                | Jumlah Pekerjaan     |   3   |  5.31% |   0.159
Faktor Kebiasaan| Komunikasi           |   2   |  7.80% |   0.078
                | Inisiatif            |   4   | 11.10% |   0.222
                | Follow Up            |   2   | 16.60% |   0.166
                | Team Work            |   1   | 21.00% |   0.105
                | Kehadiran            |   5   | 43.50% |   1.088
─────────────────────────────────────────────────────────────────────
                                         TOTAL SKOR:       3.475
```

---

## 9. SKEMA DATABASE

### 9.1 Prisma Schema

```prisma
// Branch — Cabang perusahaan
model Branch {
  id          Int          @id @default(autoincrement())
  name        String       @db.VarChar(100)
  address     String?      @db.Text
  isPusat     Boolean      @default(false) @map("is_pusat")
  isActive    Boolean      @default(true) @map("is_active")
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")

  departments Department[]
  users       User[]

  @@map("branches")
}

// Department — Departemen per cabang
model Department {
  id        Int      @id @default(autoincrement())
  branchId  Int      @map("branch_id")
  name      String   @db.VarChar(100)
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  branch Branch @relation(fields: [branchId], references: [id])
  users  User[]

  @@unique([branchId, name])
  @@map("departments")
}

// Jabatan — Jabatan karyawan
model Jabatan {
  id          Int        @id @default(autoincrement())
  name        String     @db.VarChar(100)
  level       KpiLevel?  // atas | bawah | null (direktur/admin/hrd)
  scope       ScopeType  // pusat | cabang | all
  roleSystem  RoleType   @map("role_system")
  description String?    @db.Text
  isActive    Boolean    @default(true) @map("is_active")
  createdAt   DateTime   @default(now()) @map("created_at")

  users User[]

  @@map("jabatan")
}

// User — Semua akun pengguna
model User {
  id           Int       @id @default(autoincrement())
  name         String    @db.VarChar(150)
  email        String    @unique @db.VarChar(150)
  password     String
  role         RoleType
  branchId     Int?      @map("branch_id")
  departmentId Int?      @map("department_id")
  jabatanId    Int?      @map("jabatan_id")
  nik          String?   @unique @db.VarChar(20)
  hireDate     DateTime? @map("hire_date")
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  branch     Branch?     @relation(fields: [branchId], references: [id])
  department Department? @relation(fields: [departmentId], references: [id])
  jabatan    Jabatan?    @relation(fields: [jabatanId], references: [id])

  periodsCreated    Period[]     @relation("PeriodCreatedBy")
  assessmentsGiven  Assessment[] @relation("AssessorAssessments")
  assessmentsReceived Assessment[] @relation("AssesseeAssessments")
  finalScoresReceived AssessmentFinalScore[]
  kpiVersionsCreated KpiTemplate[]

  @@map("users")
}

// Period — Periode penilaian
model Period {
  id                 Int          @id @default(autoincrement())
  name               String       @db.VarChar(100)
  startDate          DateTime     @map("start_date")
  endDate            DateTime     @map("end_date")
  deadlinePenilaian  DateTime     @map("deadline_penilaian")
  status             PeriodStatus @default(DRAFT)
  createdBy          Int          @map("created_by")
  createdAt          DateTime     @default(now()) @map("created_at")
  updatedAt          DateTime     @updatedAt @map("updated_at")

  creator             User                  @relation("PeriodCreatedBy", fields: [createdBy], references: [id])
  assessments         Assessment[]
  finalScores         AssessmentFinalScore[]
  kpiAtasSnapshot     KpiTemplate?          @relation("PeriodKpiAtas", fields: [kpiAtasSnapshotId], references: [id])
  kpiAtasSnapshotId   Int?                  @map("kpi_atas_snapshot_id")
  kpiBawahSnapshot    KpiTemplate?          @relation("PeriodKpiBawah", fields: [kpiBawahSnapshotId], references: [id])
  kpiBawahSnapshotId  Int?                  @map("kpi_bawah_snapshot_id")

  @@map("periods")
}

// KpiTemplate — Versi KPI (snapshot saat periode dibuat)
model KpiTemplate {
  id          Int      @id @default(autoincrement())
  type        KpiType  // atas | bawah
  version     Int      @default(1)
  isCurrent   Boolean  @default(true) @map("is_current")
  createdBy   Int      @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")

  creator    User         @relation(fields: [createdBy], references: [id])
  criteria   KpiCriteria[]
  assessments Assessment[]
  periodsAsAtas   Period[] @relation("PeriodKpiAtas")
  periodsAsBawah  Period[] @relation("PeriodKpiBawah")

  @@map("kpi_templates")
}

// KpiCriteria — Kriteria utama KPI
model KpiCriteria {
  id             Int         @id @default(autoincrement())
  kpiTemplateId  Int         @map("kpi_template_id")
  name           String      @db.VarChar(150)
  bobotPersen    Decimal     @map("bobot_persen") @db.Decimal(5, 2)
  ahpWeight      Decimal     @map("ahp_weight") @db.Decimal(10, 6)
  orderNumber    Int         @default(1) @map("order_number")
  createdAt      DateTime    @default(now()) @map("created_at")

  template     KpiTemplate    @relation(fields: [kpiTemplateId], references: [id])
  subcriteria  KpiSubcriteria[]

  @@map("kpi_criteria")
}

// KpiSubcriteria — Sub-kriteria KPI
model KpiSubcriteria {
  id             Int      @id @default(autoincrement())
  kpiCriteriaId  Int      @map("kpi_criteria_id")
  name           String   @db.VarChar(255)
  description    String?  @db.Text
  bobotPersen    Decimal  @map("bobot_persen") @db.Decimal(5, 2)
  ahpWeight      Decimal  @map("ahp_weight") @db.Decimal(10, 6)
  orderNumber    Int      @default(1) @map("order_number")
  createdAt      DateTime @default(now()) @map("created_at")

  criteria          KpiCriteria      @relation(fields: [kpiCriteriaId], references: [id])
  assessmentDetails AssessmentDetail[]

  @@map("kpi_subcriteria")
}

// Assessment — Penilaian per penilai
model Assessment {
  id             Int              @id @default(autoincrement())
  periodId       Int              @map("period_id")
  assessorId     Int              @map("assessor_id")
  assesseeId     Int              @map("assessee_id")
  kpiTemplateId  Int              @map("kpi_template_id")
  weightPct      Int              @map("weight_pct") // 100 | 60 | 40
  totalScore     Decimal?         @map("total_score") @db.Decimal(10, 4)
  status         AssessmentStatus @default(DRAFT)
  submittedAt    DateTime?        @map("submitted_at")
  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt @map("updated_at")

  period      Period           @relation(fields: [periodId], references: [id])
  assessor    User             @relation("AssessorAssessments", fields: [assessorId], references: [id])
  assessee    User             @relation("AssesseeAssessments", fields: [assesseeId], references: [id])
  kpiTemplate KpiTemplate      @relation(fields: [kpiTemplateId], references: [id])
  details     AssessmentDetail[]

  @@unique([periodId, assessorId, assesseeId])
  @@map("assessments")
}

// AssessmentDetail — Nilai per subkriteria
model AssessmentDetail {
  id               Int      @id @default(autoincrement())
  assessmentId     Int      @map("assessment_id")
  kpiSubcriteriaId Int      @map("kpi_subcriteria_id")
  score            Int      // 1-5
  weightedScore    Decimal  @map("weighted_score") @db.Decimal(10, 6)
  createdAt        DateTime @default(now()) @map("created_at")

  assessment    Assessment    @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  kpiSubcriteria KpiSubcriteria @relation(fields: [kpiSubcriteriaId], references: [id])

  @@map("assessment_details")
}

// AssessmentFinalScore — Nilai akhir gabungan
model AssessmentFinalScore {
  id           Int      @id @default(autoincrement())
  periodId     Int      @map("period_id")
  assesseeId   Int      @map("assessee_id")
  finalScore   Decimal? @map("final_score") @db.Decimal(10, 4)
  isComplete   Boolean  @default(false) @map("is_complete")
  calculatedAt DateTime? @map("calculated_at")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  period   Period @relation(fields: [periodId], references: [id])
  assessee User   @relation(fields: [assesseeId], references: [id])

  @@unique([periodId, assesseeId])
  @@map("assessment_final_scores")
}

// ─── ENUMS ───────────────────────────────────────────────

enum RoleType {
  admin
  direktur
  hrd
  kepala_cabang
  kepala_divisi
  karyawan
}

enum KpiLevel {
  atas
  bawah
}

enum ScopeType {
  pusat
  cabang
  all
}

enum KpiType {
  atas
  bawah
}

enum PeriodStatus {
  DRAFT
  ACTIVE
  CLOSED
}

enum AssessmentStatus {
  DRAFT
  SUBMITTED
}
```

---

## 10. STRUKTUR APLIKASI NEXT.JS

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          ← sidebar + header
│   │   ├── admin/
│   │   │   ├── cabang/
│   │   │   ├── departemen/
│   │   │   ├── jabatan/
│   │   │   ├── karyawan/
│   │   │   └── users/
│   │   ├── hrd/
│   │   │   ├── periode/
│   │   │   ├── kpi/
│   │   │   │   ├── atas/
│   │   │   │   └── bawah/
│   │   │   ├── penilaian/
│   │   │   ├── laporan/
│   │   │   └── history/
│   │   ├── direktur/
│   │   │   ├── laporan/
│   │   │   └── history/
│   │   ├── kepala-cabang/
│   │   │   ├── penilaian/
│   │   │   └── hasil-saya/
│   │   ├── kepala-divisi/
│   │   │   ├── penilaian/
│   │   │   └── hasil-saya/
│   │   └── karyawan/
│   │       └── hasil-saya/
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       ├── admin/
│       │   ├── branches/
│       │   ├── departments/
│       │   ├── jabatan/
│       │   ├── employees/
│       │   └── users/
│       ├── hrd/
│       │   ├── periods/
│       │   ├── kpi/
│       │   └── assessments/
│       ├── assessments/
│       │   ├── assessable/
│       │   ├── submit/
│       │   └── results/
│       └── internal/
│           ├── departments/
│           └── jabatan/
├── components/
│   ├── ui/                     ← shadcn/ui components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── DashboardLayout.tsx
│   ├── forms/
│   │   ├── AssessmentForm.tsx
│   │   ├── KpiEditForm.tsx
│   │   └── PeriodForm.tsx
│   └── shared/
│       ├── DataTable.tsx
│       ├── StatusBadge.tsx
│       ├── ConfirmDialog.tsx
│       └── EmptyState.tsx
├── lib/
│   ├── prisma.ts               ← Prisma client singleton
│   ├── auth.ts                 ← NextAuth config
│   ├── ahp.ts                  ← AHP calculation logic
│   ├── assessment.ts           ← Assessment business logic
│   └── utils.ts
├── middleware.ts                ← Route protection per role
└── types/
    └── index.ts                ← TypeScript type definitions
```

---

## 11. API ROUTES

### Auth
```
POST /api/auth/[...nextauth]    ← NextAuth handler
GET  /api/auth/session          ← Get current session
```

### Admin
```
GET|POST        /api/admin/branches
PUT|DELETE      /api/admin/branches/[id]
GET|POST        /api/admin/departments
PUT|DELETE      /api/admin/departments/[id]
GET|POST        /api/admin/jabatan
PUT|DELETE      /api/admin/jabatan/[id]
GET|POST        /api/admin/employees
PUT|DELETE      /api/admin/employees/[id]
POST            /api/admin/employees/[id]/reset-password
GET|POST        /api/admin/users
PUT             /api/admin/users/[id]
```

### HRD
```
GET|POST        /api/hrd/periods
PUT|DELETE      /api/hrd/periods/[id]
POST            /api/hrd/periods/[id]/activate
POST            /api/hrd/periods/[id]/close
GET             /api/hrd/kpi/[type]           ← atas | bawah
PUT             /api/hrd/kpi/[type]           ← edit bobot
GET             /api/hrd/assessments/list     ← daftar yang perlu dinilai
POST            /api/hrd/assessments          ← simpan draft
POST            /api/hrd/assessments/[id]/submit
```

### Assessments (semua role yang bisa menilai)
```
GET    /api/assessments/assessable   ← daftar yang bisa dinilai
GET    /api/assessments/[id]
POST   /api/assessments
PUT    /api/assessments/[id]
POST   /api/assessments/[id]/submit
GET    /api/assessments/results/[assesseeId]
GET    /api/assessments/my-results
```

### Internal (untuk dynamic dropdown)
```
GET /api/internal/departments?branchId=1
GET /api/internal/jabatan?scope=pusat
GET /api/internal/email-preview?name=Budi
```

---

## 12. MIDDLEWARE & PROTEKSI ROUTE

```typescript
// middleware.ts
const roleRoutes = {
  '/admin':          ['admin'],
  '/hrd':            ['hrd'],
  '/direktur':       ['direktur'],
  '/kepala-cabang':  ['kepala_cabang'],
  '/kepala-divisi':  ['kepala_divisi'],
  '/karyawan':       ['karyawan'],
}
```

---

## 13. HALAMAN PER ROLE

### Admin
| Path | Halaman |
|------|---------|
| /admin/cabang | Kelola Cabang |
| /admin/departemen | Kelola Departemen |
| /admin/jabatan | Kelola Jabatan |
| /admin/karyawan | Kelola Karyawan |
| /admin/users | Manajemen User |

### HRD
| Path | Halaman |
|------|---------|
| /hrd/periode | Kelola Periode |
| /hrd/kpi/atas | Setup KPI Atas |
| /hrd/kpi/bawah | Setup KPI Bawah |
| /hrd/penilaian | Daftar Penilaian |
| /hrd/penilaian/[assesseeId] | Form Penilaian |
| /hrd/laporan | Laporan Kinerja |
| /hrd/history | History Semua Periode |

### Direktur
| Path | Halaman |
|------|---------|
| /direktur/laporan | Laporan Kinerja |
| /direktur/history | History Semua Periode |

### Kepala Cabang
| Path | Halaman |
|------|---------|
| /kepala-cabang/penilaian | Daftar Penilaian |
| /kepala-cabang/penilaian/[id] | Form Penilaian |
| /kepala-cabang/hasil-saya | Hasil Penilaian Diri |

### Kepala Divisi
| Path | Halaman |
|------|---------|
| /kepala-divisi/penilaian | Daftar Penilaian |
| /kepala-divisi/penilaian/[id] | Form Penilaian |
| /kepala-divisi/hasil-saya | Hasil Penilaian Diri |

### Karyawan
| Path | Halaman |
|------|---------|
| /karyawan/hasil-saya | Hasil Penilaian Diri |

---

## 14. ATURAN BISNIS LENGKAP

| No | Aturan |
|----|--------|
| 1 | Hanya 1 kantor pusat, tidak bisa dihapus |
| 2 | Hanya 1 periode bisa ACTIVE pada satu waktu |
| 3 | Deadline penilaian = start_date + 7 hari (otomatis) |
| 4 | Setelah deadline, semua form penilaian terkunci |
| 5 | KPI struktur fixed, hanya bobot & deskripsi yang bisa diedit |
| 6 | Total bobot kriteria harus = 100% |
| 7 | Total bobot subkriteria per kriteria harus = 100% |
| 8 | Saat KPI diedit, versi lama tersimpan otomatis |
| 9 | Penilaian lama selalu merujuk ke versi KPI saat itu |
| 10 | Auto-generate akun: email = nama@sidomulyo.com |
| 11 | Role ditentukan otomatis dari jabatan yang dipilih |
| 12 | Assessor tidak bisa menilai diri sendiri |
| 13 | HRD nilai KC + KD semua cabang + KD pusat |
| 14 | KC nilai KD + semua karyawan di cabangnya |
| 15 | KD nilai karyawan di divisinya saja |
| 16 | Final score dihitung otomatis saat semua penilai submit |
| 17 | Jika 1 dari 2 penilai belum submit → status "Belum Lengkap" |
| 18 | KC & KD hanya lihat hasil penilaian diri di periode aktif |
| 19 | Karyawan hanya lihat hasil penilaian diri di periode aktif |
| 20 | Akun admin@sidomulyo.com tidak bisa dinonaktifkan via UI |

---

## 15. AKUN DEFAULT SISTEM

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sidomulyo.com | password |
| Direktur | direktur@sidomulyo.com | password |
| HRD | hrd@sidomulyo.com | password |
| KC/KD/Karyawan | nama@sidomulyo.com | password |

---

## 16. NON-FUNCTIONAL REQUIREMENTS

| Aspek | Requirement |
|-------|-------------|
| Performance | Halaman load < 3 detik |
| Security | Password di-hash (bcrypt), CSRF protection |
| Responsive | Mobile-friendly (min 375px) |
| Browser | Chrome, Firefox, Safari (2 versi terakhir) |
| Timezone | Asia/Jakarta (WIB) |
| Language | Bahasa Indonesia |
| Session | Expire setelah 8 jam tidak aktif |
