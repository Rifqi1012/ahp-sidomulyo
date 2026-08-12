# Sistem Penilaian Kinerja Karyawan — PT Sidomulyo Selaras TBK

Aplikasi web penilaian kinerja karyawan berbasis metode **AHP (Analytical
Hierarchy Process)**. Sistem memungkinkan HRD mengelola periode penilaian,
menyusun struktur KPI beserta bobotnya secara ilmiah melalui perbandingan
berpasangan, menentukan penugasan penilai, lalu menghasilkan skor akhir,
rekapitulasi, dan laporan yang dapat diekspor.

---

## Daftar Isi

1. [Ringkasan](#ringkasan)
2. [Fitur Utama](#fitur-utama)
3. [Teknologi](#teknologi)
4. [Metodologi AHP](#metodologi-ahp)
5. [Peran & Hak Akses](#peran--hak-akses)
6. [Alur Kerja Sistem](#alur-kerja-sistem)
7. [Model Data](#model-data)
8. [Struktur Proyek](#struktur-proyek)
9. [Instalasi & Menjalankan](#instalasi--menjalankan)
10. [Akun Default](#akun-default)
11. [Perintah NPM](#perintah-npm)
12. [Catatan Pengembangan](#catatan-pengembangan)

---

## Ringkasan

Penilaian kinerja tradisional sering kali subjektif karena bobot tiap aspek
ditetapkan secara sembarang. Sistem ini menerapkan **AHP** untuk menurunkan
bobot tiap kriteria dan subkriteria KPI dari perbandingan berpasangan yang
konsistensinya terukur (Consistency Ratio). Skor akhir tiap karyawan dihitung
dari nilai penilai berbobot (misalnya atasan langsung 60% + atasan kedua 40%),
menghasilkan angka pada rentang 1–5 yang objektif dan dapat
dipertanggungjawabkan.

Sistem dibangun sebagai aplikasi **Next.js App Router** dengan otentikasi
berbasis peran, sehingga tiap pengguna hanya melihat menu dan data sesuai
wewenangnya.

---

## Fitur Utama

### Manajemen Master Data (Admin)
- Kelola **Cabang**, **Departemen**, dan **Jabatan** (termasuk level KPI dan
  role sistem tiap jabatan).
- Kelola **Karyawan** dan **User** beserta peran, cabang, departemen, dan
  jabatannya.

### Setup KPI berbasis AHP (HRD) — 2 Langkah
KPI bersifat **global** (berlaku untuk semua periode) dan dikelola dalam dua
langkah:

- **Langkah 1 — Struktur KPI:** CRUD kriteria & subkriteria. Setiap subkriteria
  menampilkan badge bobot AHP-nya (`Bobot: 0.2500`) atau `Belum dihitung`.
- **Langkah 2 — Perbandingan Berpasangan AHP:** input matriks perbandingan
  Saaty (skala 1–9) per kriteria, hitung priority vector + **Consistency
  Ratio**, dan simpan bobot hanya jika konsisten (CR ≤ 0,1). Menyimpan semua
  akan membuat **versi KPI baru** tanpa mengubah data penilaian lama.

Tersedia dua template terpisah: **KPI Pengawas** (untuk Kepala Cabang & Kepala
Divisi) dan **KPI Pelaksana** (untuk Karyawan).

### Kelola Periode (HRD)
- Buat periode penilaian dengan tanggal mulai/selesai dan **deadline
  penilaian**.
- Status periode: `DRAFT` → `ACTIVE` → `CLOSED`. Hanya satu periode aktif pada
  satu waktu; template KPI ditautkan saat periode dibuat.

### Atur Penilaian (HRD)
Penentuan **siapa menilai siapa** dilakukan manual oleh HRD, bukan otomatis
dari peran:
- Maksimal **2 penilai** per orang yang dinilai (penilai dari peran HRD /
  Kepala Cabang / Kepala Divisi).
- **Bobot 60–40 otomatis** dari hierarki jabatan (jabatan lebih tinggi → 60%,
  satu penilai → 100%).
- **Tipe KPI otomatis** dari jabatan yang dinilai (KC/KD → Pengawas, Karyawan →
  Pelaksana).
- Filter cabang/departemen/nama/status; peringatan bila mengubah penugasan yang
  penilaiannya sudah disubmit.

### Proses Penilaian (Penilai: HRD / KC / KD)
- Tiap penilai melihat daftar orang yang **ditugaskan** kepadanya untuk periode
  aktif, lengkap dengan status (Belum/Draft/Selesai) dan hitung mundur
  deadline.
- Form penilaian per subkriteria (skor 1–5), simpan sebagai draft atau submit.
  Setelah submit, skor final otomatis dihitung ulang.

### Hasil, Rekap & Laporan
- **Hasil Penilaian Saya** (KC/KD/Karyawan): rincian skor per penilai pada
  periode aktif.
- **Laporan Kinerja** (HRD/Direktur/KC/KD sesuai cakupan): rekap multi-periode
  per kriteria, dengan **ekspor Excel** (berformat) dan **ekspor PDF massal**
  (ZIP).
- **History**: arsip hasil penilaian yang telah lengkap, dengan filter dan
  paginasi.

---

## Teknologi

| Lapisan | Teknologi |
|---|---|
| Framework | **Next.js 14** (App Router, Server Actions) |
| Bahasa | **TypeScript** |
| Basis data | **MySQL** via **Prisma ORM** |
| Otentikasi | **NextAuth** (Credentials + bcrypt) |
| UI | **Tailwind CSS** + **shadcn/ui** (Radix UI), **lucide-react**, **sonner** |
| Form & Validasi | **react-hook-form** + **zod** |
| Ekspor | **xlsx-js-style** (Excel), **jsPDF** + **jspdf-autotable** (PDF), **jszip** (arsip) |

---

## Metodologi AHP

AHP menurunkan bobot dari matriks perbandingan berpasangan `n × n`.

1. **Matriks perbandingan** — untuk tiap pasangan subkriteria, penilai memilih
   nilai kepentingan skala Saaty **1–9** (nilai `a[i][j]`, dengan
   `a[j][i] = 1/a[i][j]`).
2. **Priority vector** — normalisasi kolom lalu rata-rata baris; hasilnya
   dinormalisasi agar totalnya 1,0 per kriteria (`ahpWeight`).
3. **Konsistensi:**
   - `λmax` dari weighted-sum vector.
   - `CI = (λmax − n) / (n − 1)`.
   - `CR = CI / RI[n]`, dengan Random Index
     `{3:0.58, 4:0.90, 5:1.12, 6:1.24, 7:1.32, 8:1.41, 9:1.45}`.
   - Untuk `n ≤ 2`, `CR = 0`. Matriks dianggap **konsisten** bila `CR ≤ 0,1`.
4. **Bobot global** — `ahpWeight` dinormalisasi lintas seluruh subkriteria
   (kriteria berbobot setara) sehingga total seluruh `globalWeight` = 1,0.
   Bobot inilah yang dipakai untuk skoring.

**Skor satu penilai** = Σ (skor subkriteria × `globalWeight`) → rentang 1–5.

**Skor akhir** = Σ (skor penilai × bobot penilai). Contoh dua penilai:
`(skor₁ × 60% + skor₂ × 40%)`. Dianggap **lengkap** ketika seluruh penilai yang
ditugaskan (Σ bobot = 100%) telah submit.

Implementasi ada di [`src/lib/ahp.ts`](src/lib/ahp.ts) dan perhitungan skor di
[`src/lib/assessmentService.ts`](src/lib/assessmentService.ts).

---

## Peran & Hak Akses

| Peran | Wewenang utama |
|---|---|
| **Admin** | Master data: cabang, departemen, jabatan, karyawan, user. |
| **HRD** | Kelola periode, setup KPI (AHP), atur penilaian, menilai, laporan, history. |
| **Direktur** | Lihat laporan kinerja & history (read-only). |
| **Kepala Cabang** | Menilai orang yang ditugaskan, data karyawan, laporan, hasil sendiri. |
| **Kepala Divisi** | Menilai orang yang ditugaskan, data karyawan, laporan, hasil sendiri. |
| **Karyawan** | Melihat hasil penilaian diri sendiri. |

Menu per peran didefinisikan di [`src/lib/navigation.ts`](src/lib/navigation.ts).

---

## Alur Kerja Sistem

```
Admin           HRD                                   Penilai (HRD/KC/KD)      Karyawan/KC/KD
  │              │                                           │                      │
  ├─ Master data │                                           │                      │
  │              ├─ Setup KPI (AHP, 2 langkah) ── versi KPI  │                      │
  │              ├─ Buat & aktifkan Periode                  │                      │
  │              ├─ Atur Penilaian (siapa menilai siapa)     │                      │
  │              │        └─ bobot 60/40 & tipe KPI otomatis │                      │
  │              │                                           ├─ Isi form penilaian  │
  │              │                                           ├─ Submit ──┐          │
  │              │                                    skor final dihitung ┘          │
  │              ├─ Laporan / History / Rekap ◄───────────────────────────          │
  │              │                                                        └─ Lihat hasil sendiri
```

---

## Model Data

Skema lengkap ada di [`prisma/schema.prisma`](prisma/schema.prisma). Entitas
inti:

- **Branch / Department / Jabatan** — struktur organisasi. `Jabatan` menyimpan
  `level` (atas/bawah) dan `roleSystem`.
- **User** — pengguna dengan `role`, cabang, departemen, jabatan.
- **Period** — periode penilaian; menautkan template KPI Pengawas & Pelaksana.
- **KpiTemplate → KpiCriteria → KpiSubcriteria** — struktur KPI berversi.
  Subkriteria menyimpan `ahpWeight` (dalam kriteria) dan `globalWeight` (untuk
  skoring).
- **AhpComparison** — nilai perbandingan berpasangan per pasangan subkriteria.
- **AssessmentAssignment** — penugasan penilai per (periode, orang dinilai):
  `assessor1/2`, `weight1/2Pct`, `kpiType`. Unik per `(periodId, assesseeId)`.
- **Assessment → AssessmentDetail** — penilaian satu penilai dan skor per
  subkriteria.
- **AssessmentFinalScore** — skor akhir & status kelengkapan per (periode,
  orang dinilai).

---

## Struktur Proyek

```
prisma/
  schema.prisma            # Skema basis data
  seed.ts                  # Data awal (organisasi, akun, template KPI)
src/
  app/
    (dashboard)/           # Halaman per peran (admin, hrd, direktur, kepala-*, karyawan)
    actions/               # Server Actions (assessment, assignment, kpi, report, ...)
    api/                   # Route API (NextAuth)
  components/
    assessment/            # Daftar & form penilaian
    penilaian/             # Atur Penilaian (client + modal)
    kpi/                    # Editor AHP: ComparisonRow, ScaleGuide, AhpResultCard, ...
    laporan/               # Rekap & toolbar ekspor
    hasil-penilaian/       # Tampilan hasil
    layout/ shared/ ui/    # Layout, komponen umum, shadcn/ui
  lib/
    ahp.ts                 # Perhitungan AHP (priority vector, CR)
    assessmentService.ts   # Skor, skor akhir, daftar assessable, slot penilai
    assessorWeights.ts     # Hierarki jabatan & bobot 60/40/100
    navigation.ts          # Menu per peran
    prisma.ts auth-guard.ts # Klien Prisma & guard sesi
    export/                # Excel, PDF, ZIP
```

---

## Instalasi & Menjalankan

### Prasyarat
- **Node.js** 18+
- **MySQL** 8+ berjalan lokal

### Langkah

```bash
# 1. Pasang dependensi
npm install

# 2. Konfigurasi environment
#    Buat file .env (lihat contoh di bawah)

# 3. Terapkan skema ke basis data
npx prisma db push

# 4. Isi data awal (organisasi, akun default, template KPI)
npm run seed

# 5. Jalankan mode pengembangan
npm run dev
# Buka http://localhost:3000
```

### Contoh `.env`

```env
DATABASE_URL="mysql://root:@localhost:3306/sidomulyo_kinerja"
NEXTAUTH_SECRET="ganti-dengan-secret-acak"
NEXTAUTH_URL="http://localhost:3000"
```

> **Catatan:** Proyek ini menggunakan `prisma db push` (tanpa folder
> `migrations`). Untuk mereset basis data gunakan
> `npx prisma db push --force-reset --accept-data-loss` lalu `npm run seed` —
> **jangan** `prisma migrate reset` (akan gagal karena tidak ada migrasi).

---

## Akun Default

Setelah `npm run seed`, tersedia akun berikut (password: **`password`**):

| Peran | Email |
|---|---|
| Direktur | `direktur@sidomulyo.com` |
| Admin | `admin@sidomulyo.com` |
| HRD | `hrd@sidomulyo.com` |

Akun Kepala Cabang, Kepala Divisi, dan Karyawan dibuat melalui menu **Admin →
Manajemen User / Kelola Karyawan**.

---

## Perintah NPM

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server pengembangan |
| `npm run build` | Build produksi |
| `npm start` | Menjalankan hasil build |
| `npm run lint` | ESLint |
| `npm run seed` | Mengisi data awal |
| `npm run db:push` | Terapkan skema Prisma ke DB |
| `npm run db:studio` | Buka Prisma Studio |

---

## Catatan Pengembangan

- **Server Actions** dipakai untuk mutasi data (`"use server"`); halaman
  memakai `export const dynamic = "force-dynamic"` bila butuh data segar.
- **Otorisasi** dijalankan di setiap action lewat `getSessionUser()`; setup KPI
  dan atur penilaian dibatasi peran HRD.
- **Bobot penilai** dihitung terpusat di
  [`src/lib/assessorWeights.ts`](src/lib/assessorWeights.ts) (`computeWeights`)
  sehingga preview di modal dan penyimpanan server memakai logika yang sama.
- Saat penugasan penilai diubah, penilaian lama untuk orang tersebut pada
  periode itu dihapus dan dibuat ulang saat penilai membuka form; HRD diberi
  peringatan bila penilaian sudah **disubmit**.

---

© PT Sidomulyo Selaras TBK — Sistem Penilaian Kinerja berbasis AHP.