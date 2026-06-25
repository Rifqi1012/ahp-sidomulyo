"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type CountdownProps = {
  deadline: Date | string;
  className?: string;
};

function diffParts(target: number, now: number) {
  const ms = target - now;
  if (ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return { ms, days, hours, minutes };
}

export function Countdown({ deadline, className }: CountdownProps) {
  const target = new Date(deadline).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Update tiap menit.
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const parts = diffParts(target, now);

  if (!parts) {
    return (
      <span className={cn("text-sm font-medium text-slate-500", className)}>
        Periode penilaian telah berakhir
      </span>
    );
  }

  // Merah jika sisa kurang dari 24 jam.
  const urgent = parts.ms < 24 * 60 * 60 * 1000;

  return (
    <span
      className={cn(
        "text-sm font-medium",
        urgent ? "text-red-600" : "text-slate-700",
        className,
      )}
    >
      Sisa {parts.days} hari {parts.hours} jam {parts.minutes} menit untuk
      penilaian
    </span>
  );
}
