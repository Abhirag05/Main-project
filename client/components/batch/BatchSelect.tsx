"use client";

import { useEffect, useState } from "react";
import { apiClient, MentorBatch } from "@/lib/api";

interface Props {
  value?: number | null;
  onChange?: (batchId: number | null) => void;
  modeFilter?: "LIVE" | "RECORDED" | undefined;
  className?: string;
}

export default function BatchSelect({
  value,
  onChange,
  modeFilter,
  className,
}: Props) {
  const [batches, setBatches] = useState<MentorBatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getMentorBatches();
        if (!mounted) return;
        const withMode = data.map((b: any) => ({
          ...b,
          __inferred_mode:
            b.mode ||
            (b.batch_code?.toUpperCase().includes("RECORDED")
              ? "RECORDED"
              : "LIVE"),
        }));
        const filtered = modeFilter
          ? withMode.filter((b) => b.__inferred_mode === modeFilter)
          : withMode;
        setBatches(filtered);
        // if no value selected, pick first
        if ((value === undefined || value === null) && filtered.length > 0) {
          onChange?.(filtered[0].batch_id);
        }
      } catch (err) {
        console.error("Failed to load batches", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
  }, [modeFilter]);

  return (
    <div className={className}>
      {loading ? (
        <div className="animate-pulse bg-gray-100 rounded px-3 py-2 w-56" />
      ) : (
        <select
          value={value || ""}
          onChange={(e) =>
            onChange?.(e.target.value ? Number(e.target.value) : null)
          }
          className="w-96 px-3 py-2 border border-gray-400 rounded-lg bg-white text-black font-medium"
        >
          <option value="">Select batch</option>
          {batches.map((b: any) => (
            <option key={b.batch_id} value={b.batch_id}>
              {b.batch_code} - {b.course_name} ({b.__inferred_mode})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
