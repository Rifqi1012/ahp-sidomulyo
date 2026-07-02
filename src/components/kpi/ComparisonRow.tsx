"use client";

import { cn } from "@/lib/utils";

// 17 posisi: 9..2 (kiri), 1 (tengah), 1/2..1/9 (kanan).
// value = matrix[i][j] (i = sisi kiri).
const POSITIONS = Array.from({ length: 17 }, (_, idx) => {
  if (idx < 8) return { idx, value: 9 - idx, saaty: 9 - idx, side: "left" as const };
  if (idx === 8) return { idx, value: 1, saaty: 1, side: "center" as const };
  const s = idx - 7; // 2..9
  return { idx, value: 1 / s, saaty: s, side: "right" as const };
});

// 140px (nama kiri) + 17×40px (dot) + 140px (nama kanan).
const GRID = { gridTemplateColumns: "140px repeat(17, 40px) 140px" } as const;

const SAATY_LABEL: Record<number, string> = {
  1: "sama penting dengan",
  2: "sedikit lebih penting dari",
  3: "sedikit lebih penting dari",
  4: "lebih penting dari",
  5: "lebih penting dari",
  6: "jauh lebih penting dari",
  7: "sangat lebih penting dari",
  8: "sangat lebih penting dari",
  9: "mutlak lebih penting dari",
};

export function interpret(
  leftName: string,
  rightName: string,
  value: number,
): string {
  if (Math.abs(value - 1) < 1e-6) return `${leftName} sama penting dengan ${rightName}`;
  if (value > 1)
    return `${leftName} ${SAATY_LABEL[Math.round(value)]} ${rightName}`;
  return `${rightName} ${SAATY_LABEL[Math.round(1 / value)]} ${leftName}`;
}

export function ComparisonRow({
  leftName,
  rightName,
  value,
  onChange,
  disabled,
}: {
  leftName: string;
  rightName: string;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="overflow-x-auto py-3">
      <div className="grid items-center" style={GRID}>
        {/* Baris label angka (permanen, di atas dot). */}
        <div />
        {POSITIONS.map((p) => (
          <div
            key={`l${p.idx}`}
            className="mb-1 text-center text-xs font-medium text-slate-400"
          >
            {p.saaty}
          </div>
        ))}
        <div />

        {/* Baris nama + dot. */}
        <div className="pr-2 text-right text-sm font-semibold text-slate-800">
          {leftName}
        </div>
        {POSITIONS.map((p) => {
          const selected = value != null && Math.abs(value - p.value) < 1e-6;
          return (
            <div
              key={`d${p.idx}`}
              className={cn(
                "flex items-center justify-center",
                p.side === "center" && "border-l border-slate-200",
              )}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(p.value)}
                aria-label={`Nilai ${p.saaty}`}
                className={cn(
                  "h-9 w-9 rounded-full border-2 text-xs transition-colors disabled:opacity-50",
                  selected
                    ? p.side === "left"
                      ? "border-blue-500 bg-blue-500 text-white"
                      : p.side === "right"
                        ? "border-orange-500 bg-orange-500 text-white"
                        : "border-slate-500 bg-slate-500 text-white"
                    : cn(
                        "border-slate-300 bg-white text-slate-500 hover:border-slate-400",
                        p.side === "left" && "hover:bg-blue-50",
                        p.side === "right" && "hover:bg-orange-50",
                        p.side === "center" && "hover:bg-slate-100",
                      ),
                )}
              >
                {p.saaty}
              </button>
            </div>
          );
        })}
        <div className="pl-2 text-left text-sm font-semibold text-slate-800">
          {rightName}
        </div>
      </div>

      {value != null && (
        <p className="mt-3 text-center text-xs italic text-slate-500">
          {interpret(leftName, rightName, value)}
        </p>
      )}
    </div>
  );
}
