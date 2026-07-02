/**
 * Utilitas AHP (Analytical Hierarchy Process).
 *
 * Matriks perbandingan dibangkitkan otomatis dari bobot persen:
 *   nilai(i, j) = bobot[i] / bobot[j]
 * Priority Vector dihitung dengan normalisasi kolom + rata-rata baris.
 * Untuk matriks rasio yang konsisten ini, hasilnya setara dengan
 * bobot[i] / Σ bobot.
 */

/**
 * Hitung bobot AHP (priority vector) dari array bobot persen.
 * Total hasil = 1.0. Untuk n = 1 → [1.0].
 */
export function calculateAhpWeights(bobotPersen: number[]): number[] {
  const n = bobotPersen.length;
  if (n === 0) return [];
  if (n === 1) return [1];

  const safe = bobotPersen.map((b) => (Number.isFinite(b) && b > 0 ? b : 0));
  const sum = safe.reduce((a, b) => a + b, 0);

  // Jika semua nol → bagi rata. Jika ada yang nol → proporsional langsung
  // (menghindari pembagian dengan nol pada matriks).
  if (sum <= 0) return Array(n).fill(1 / n);
  if (safe.some((b) => b === 0)) return safe.map((b) => b / sum);

  // Matriks perbandingan berpasangan: m[i][j] = bobot[i] / bobot[j].
  const matrix = safe.map((bi) => safe.map((bj) => bi / bj));

  // Jumlah tiap kolom.
  const colSums = Array.from({ length: n }, (_, j) =>
    matrix.reduce((s, row) => s + row[j], 0),
  );

  // Normalisasi kolom lalu rata-rata tiap baris → priority vector.
  const weights = matrix.map(
    (row) => row.reduce((s, val, j) => s + val / colSums[j], 0) / n,
  );

  // Normalisasi akhir agar total tepat 1.0.
  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / total);
}

/** Random Index (RI) untuk perhitungan Consistency Ratio. */
export const RANDOM_INDEX: Record<number, number> = {
  1: 0,
  2: 0,
  3: 0.58,
  4: 0.9,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49,
};

export type AhpMatrixResult = {
  weights: number[];
  lambdaMax: number;
  ci: number;
  cr: number;
  isConsistent: boolean;
};

/**
 * AHP dari matriks perbandingan berpasangan n×n.
 * Priority vector via normalisasi kolom + rata-rata baris; λmax, CI, CR.
 * n ≤ 2 → CR = 0 (konsisten).
 */
export function calculateAhpFromMatrix(matrix: number[][]): AhpMatrixResult {
  const n = matrix.length;
  if (n === 0)
    return { weights: [], lambdaMax: 0, ci: 0, cr: 0, isConsistent: true };
  if (n === 1)
    return { weights: [1], lambdaMax: 1, ci: 0, cr: 0, isConsistent: true };

  const colSums = Array.from({ length: n }, (_, j) =>
    matrix.reduce((s, row) => s + row[j], 0),
  );
  let weights = matrix.map(
    (row) =>
      row.reduce((s, v, j) => s + (colSums[j] > 0 ? v / colSums[j] : 0), 0) / n,
  );
  const wsum = weights.reduce((a, b) => a + b, 0);
  if (wsum > 0) weights = weights.map((w) => w / wsum);

  const weightedSum = matrix.map((row) =>
    row.reduce((s, v, j) => s + v * weights[j], 0),
  );
  const lambdas = weightedSum.map((ws, i) =>
    weights[i] > 0 ? ws / weights[i] : n,
  );
  const lambdaMax = lambdas.reduce((a, b) => a + b, 0) / n;
  const ci = Math.max(0, (lambdaMax - n) / (n - 1));
  const ri = RANDOM_INDEX[n] ?? 1.49;
  const cr = n <= 2 ? 0 : ri > 0 ? ci / ri : 0;
  return { weights, lambdaMax, ci, cr, isConsistent: cr <= 0.1 };
}

/**
 * Bobot global tiap subkriteria: ahpWeight (per-kriteria) dinormalisasi
 * terhadap total seluruh ahpWeight (kriteria berbobot setara). Total = 1.0.
 * Map subId → globalWeight.
 */
export function calculateGlobalWeights(
  criteria: { subcriteria: { id: number; ahpWeight: number }[] }[],
): Map<number, number> {
  let total = 0;
  for (const c of criteria)
    for (const s of c.subcriteria) total += s.ahpWeight > 0 ? s.ahpWeight : 0;
  const map = new Map<number, number>();
  for (const c of criteria)
    for (const s of c.subcriteria)
      map.set(s.id, total > 0 ? (s.ahpWeight > 0 ? s.ahpWeight : 0) / total : 0);
  return map;
}

export type AhpFromBobotResult = {
  weights: { id: number; ahpWeight: number }[];
  matrix: number[][];
  lambdaMax: number;
  ci: number;
  cr: number;
};

/**
 * Hitung AHP lengkap dari bobot persen subkriteria.
 * - Bangkitkan matriks rasio: matrix[i][j] = bobot[i] / bobot[j]
 * - Priority vector via normalisasi kolom + rata-rata baris (total = 1.0)
 * - λmax, CI, CR (untuk n <= 2 → CR = 0)
 *
 * Karena matriks rasio bersifat konsisten sempurna, λmax ≈ n dan CR ≈ 0.
 */
export function calculateAhpFromBobot(
  subcriteria: { id: number; name: string; bobotPersen: number }[],
): AhpFromBobotResult {
  const n = subcriteria.length;
  if (n === 0) {
    return { weights: [], matrix: [], lambdaMax: 0, ci: 0, cr: 0 };
  }
  if (n === 1) {
    return {
      weights: [{ id: subcriteria[0].id, ahpWeight: 1 }],
      matrix: [[1]],
      lambdaMax: 1,
      ci: 0,
      cr: 0,
    };
  }

  const b = subcriteria.map((s) =>
    Number.isFinite(s.bobotPersen) && s.bobotPersen > 0 ? s.bobotPersen : 0,
  );
  const sum = b.reduce((a, c) => a + c, 0);

  let matrix: number[][];
  let weightsArr: number[];

  if (sum <= 0) {
    matrix = b.map(() => b.map(() => 1));
    weightsArr = Array(n).fill(1 / n);
  } else {
    matrix = b.map((bi) => b.map((bj) => (bj > 0 ? bi / bj : 0)));
    const colSums = Array.from({ length: n }, (_, j) =>
      matrix.reduce((a, row) => a + row[j], 0),
    );
    weightsArr = matrix.map(
      (row) =>
        row.reduce((a, v, j) => a + (colSums[j] > 0 ? v / colSums[j] : 0), 0) / n,
    );
    const wsum = weightsArr.reduce((a, c) => a + c, 0);
    if (wsum > 0) weightsArr = weightsArr.map((w) => w / wsum);
  }

  // λmax dari weighted sum vector.
  let lambdaMax = n;
  if (sum > 0) {
    const weightedSum = matrix.map((row) =>
      row.reduce((a, v, j) => a + v * weightsArr[j], 0),
    );
    const lambdas = weightedSum.map((ws, i) =>
      weightsArr[i] > 0 ? ws / weightsArr[i] : n,
    );
    lambdaMax = lambdas.reduce((a, c) => a + c, 0) / n;
  }

  const ci = Math.max(0, (lambdaMax - n) / (n - 1));
  const cr = n <= 2 ? 0 : RANDOM_INDEX[n] ? Math.max(0, ci / RANDOM_INDEX[n]) : 0;

  return {
    weights: subcriteria.map((s, i) => ({ id: s.id, ahpWeight: weightsArr[i] })),
    matrix,
    lambdaMax,
    ci,
    cr,
  };
}

/**
 * Bobot global tiap subkriteria saat kriteria TIDAK punya bobot:
 * dinormalisasi terhadap total seluruh bobot subkriteria.
 *   globalWeight = bobotPersen_sub / Σ semua bobotPersen subkriteria
 * Total seluruh nilai = 1.0.
 */
export function calculateGlobalAhpWeights(
  subBobots: number[],
): number[] {
  const total = subBobots.reduce((a, b) => a + (b > 0 ? b : 0), 0);
  if (total <= 0) return subBobots.map(() => 0);
  return subBobots.map((b) => (b > 0 ? b : 0) / total);
}

