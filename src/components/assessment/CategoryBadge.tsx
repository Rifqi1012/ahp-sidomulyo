import { Badge } from "@/components/ui/badge";

const MAP: Record<string, "green" | "blue" | "yellow" | "orange" | "red"> = {
  "Sangat Baik": "green",
  Baik: "blue",
  Cukup: "yellow",
  Kurang: "orange",
  "Sangat Kurang": "red",
};

export function CategoryBadge({
  category,
  isComplete = true,
}: {
  category: string | null;
  isComplete?: boolean;
}) {
  if (!isComplete || !category) {
    return <Badge variant="slate">Belum Lengkap</Badge>;
  }
  return <Badge variant={MAP[category] ?? "slate"}>{category}</Badge>;
}
