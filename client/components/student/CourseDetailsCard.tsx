"use client";

import React from "react";
import { StudentBatch } from "@/lib/api";

interface Props {
  batch: StudentBatch;
}

export default function CourseDetailsCard({ batch }: Props) {
  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  // Derive mode from batch_code if available (e.g., LIVE/RECORDED in code)
  const mode = batch.batch_code?.toUpperCase().includes("LIVE")
    ? "Live"
    : "Recorded";

  return (
    <div className="bg-card rounded-lg shadow-md p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-foreground">Course Details</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground">
            Course
          </label>
          <p className="text-foreground font-medium">{batch.course_name}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground">
            Batch Code
          </label>
          <p className="text-foreground">{batch.batch_code}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground">
            Class Type
          </label>
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${mode === "Live" ? "bg-green-100 text-green-800" : "bg-primary/10 text-primary"}`}
          >
            {mode}
          </span>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground">
            Duration
          </label>
          <p className="text-foreground">
            {formatDate(batch.start_date)} — {formatDate(batch.end_date)}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground">
            Status
          </label>
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${batch.batch_status === "ACTIVE" ? "bg-green-100 text-green-800" : batch.batch_status === "COMPLETED" ? "bg-primary/10 text-primary" : "bg-red-100 text-red-800"}`}
          >
            {batch.batch_status}
          </span>
        </div>
      </div>
    </div>
  );
}
