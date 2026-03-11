"use client";

import { useRouter } from "next/navigation";
import { REGION_LABELS } from "@/lib/regions";

interface Props {
  currentRegion?: string;
}

export function RegionFilter({ currentRegion }: Props) {
  const router = useRouter();

  const regions: Array<{ value: string; label: string }> = [
    { value: "all", label: "All Regions" },
    ...Object.entries(REGION_LABELS).map(([value, label]) => ({ value, label })),
  ];

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === "all") {
      router.push("/routes");
    } else {
      router.push(`/routes?region=${val}`);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="region-filter" className="text-sm font-medium">
        Region:
      </label>
      <select
        id="region-filter"
        value={currentRegion ?? "all"}
        onChange={handleChange}
        className="text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        {regions.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
    </div>
  );
}
