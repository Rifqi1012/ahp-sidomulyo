export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-sidebar">
          Sistem Penilaian Kinerja
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          PT Sidomulyo Selaras TBK — metode AHP
        </p>
        <div className="mt-6 rounded-lg bg-background p-4 text-sm text-slate-600">
          Setup project berhasil. Lanjutkan dengan implementasi autentikasi dan
          dashboard.
        </div>
      </div>
    </main>
  );
}
