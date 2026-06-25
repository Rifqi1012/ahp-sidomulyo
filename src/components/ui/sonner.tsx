"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group rounded-lg border border-slate-200 bg-white text-slate-900 shadow-md",
          description: "text-slate-500",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-slate-100 text-slate-600",
          success: "[&_[data-icon]]:text-green-600",
          error: "[&_[data-icon]]:text-red-600",
        },
      }}
      {...props}
    />
  );
}
