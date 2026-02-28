"use client";

import { useEffect, useState } from "react";
import { apiClient, MentorBatch } from "@/lib/api";

interface Props {
  value?: number | null;
  onChange?: (batchId: number | null) => void;
  className?: string;
}

export default function BatchSelect({
  value,
  onChange,
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
        setBatches(data);
        // if no value selected, pick first
        if ((value === undefined || value === null) && data.length > 0) {
          onChange?.(data[0].batch_id);
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
  }, []);

  return (
    <div className={className}>
      {loading ? (
        <div className="animate-pulse bg-secondary rounded px-3 py-2 w-56" />
      ) : (
        <select
          value={value || ""}
          onChange={(e) =>
            onChange?.(e.target.value ? Number(e.target.value) : null)
          }
          className="w-96 px-3 py-2 border border-border rounded-lg bg-card text-black font-medium"
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
