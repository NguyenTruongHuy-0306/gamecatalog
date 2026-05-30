"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

interface Props {
  label: string;
  sortKey: string;
  currentSort: string;
  currentDir: "asc" | "desc";
  onSort: (key: string) => void;
}

export function SortableHead({ label, sortKey, currentSort, currentDir, onSort }: Props) {
  const active = currentSort === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground ${active ? "text-foreground" : "text-muted-foreground"}`}
    >
      {label}
      {active ? (
        currentDir === "asc"
          ? <ChevronUp className="h-3.5 w-3.5" />
          : <ChevronDown className="h-3.5 w-3.5" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}
