import type { ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Column<T> = {
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: ReactNode;
};

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "Tidak ada data.",
}: DataTableProps<T>) {
  return (
    <Table>
      <TableHeader className="bg-slate-50">
        <TableRow className="hover:bg-slate-50">
          {columns.map((col, i) => (
            <TableHead key={i} className={col.headerClassName}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="py-10 text-center text-sm text-slate-500"
            >
              Memuat data...
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="py-12 text-center text-sm text-slate-500"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((col, colIndex) => (
                <TableCell key={colIndex} className={cn(col.className)}>
                  {col.cell(row, rowIndex)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
