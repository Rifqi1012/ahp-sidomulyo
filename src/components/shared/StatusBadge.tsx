import { Badge } from "@/components/ui/badge";

export type StatusKind = "active" | "inactive" | "pusat" | "cabang";

const STATUS_MAP: Record<
  StatusKind,
  { label: string; variant: "green" | "slate" | "blue" }
> = {
  active: { label: "Aktif", variant: "green" },
  inactive: { label: "Nonaktif", variant: "slate" },
  pusat: { label: "Kantor Pusat", variant: "blue" },
  cabang: { label: "Cabang", variant: "slate" },
};

type StatusBadgeProps = {
  status: StatusKind;
  label?: string;
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = STATUS_MAP[status];
  return <Badge variant={config.variant}>{label ?? config.label}</Badge>;
}
