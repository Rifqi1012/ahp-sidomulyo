"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";

type BobotInputProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
};

/**
 * Input bobot % yang memperbaiki bug "010":
 * - onFocus: jika nilai 0, kosongkan field (tidak menempel di depan angka baru)
 * - onChange: bersihkan leading zero ("010" → "10"), izinkan desimal, clamp 0–100
 * - onBlur: jika kosong, kembalikan ke 0
 */
export function BobotInput({
  value,
  onChange,
  disabled,
  className,
  id,
}: BobotInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  const display = focused ? draft : String(value);

  function sanitize(raw: string): string {
    // Hanya angka & satu titik desimal.
    let clean = raw.replace(/[^0-9.]/g, "");
    const parts = clean.split(".");
    if (parts.length > 2) clean = `${parts[0]}.${parts.slice(1).join("")}`;
    // Hapus leading zero pada bagian bilangan bulat: "010" → "10".
    clean = clean.replace(/^0+(?=\d)/, "");
    // Clamp maksimum 100.
    if (clean !== "" && clean !== ".") {
      const num = parseFloat(clean);
      if (!Number.isNaN(num) && num > 100) clean = "100";
    }
    return clean;
  }

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={display}
      disabled={disabled}
      className={className}
      onFocus={(e) => {
        setFocused(true);
        setDraft(value === 0 ? "" : String(value));
        // Pilih seluruh isi agar angka baru langsung menimpa.
        requestAnimationFrame(() => e.target.select());
      }}
      onChange={(e) => {
        const clean = sanitize(e.target.value);
        setDraft(clean);
        const num = clean === "" || clean === "." ? 0 : parseFloat(clean);
        onChange(Number.isNaN(num) ? 0 : Math.min(100, Math.max(0, num)));
      }}
      onBlur={() => {
        setFocused(false);
        if (draft === "" || draft === ".") onChange(0);
      }}
    />
  );
}
