"use client";

import { TimeSlot } from "@/lib/timetableAPI";

interface WeeklyScheduleViewProps {
  timeSlots: TimeSlot[];
  loading: boolean;
  onSlotClick?: (slot: TimeSlot) => void;
  viewMode: "faculty" | "batch";
  title?: string;
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DAY_COLORS: Record<number, { bg: string; border: string; text: string }> =
  {
    1: { bg: "bg-primary/10", border: "border-primary/20", text: "text-primary" },
    2: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
    },
    3: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
    },
    4: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-800",
    },
    5: { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-800" },
    6: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      text: "text-orange-800",
    },
    7: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800" },
  };

// Generate time slots from 7 AM to 9 PM
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

export default function WeeklyScheduleView({
  timeSlots,
  loading,
  onSlotClick,
  viewMode,
  title,
}: WeeklyScheduleViewProps) {
  const safeSlots = Array.isArray(timeSlots) ? timeSlots : [];

  // Group slots by day
  const slotsByDay: Record<number, TimeSlot[]> = {};
  safeSlots.forEach((slot) => {
    if (!slotsByDay[slot.day_of_week]) {
      slotsByDay[slot.day_of_week] = [];
    }
    slotsByDay[slot.day_of_week].push(slot);
  });

  // Sort slots by start time within each day
  Object.keys(slotsByDay).forEach((day) => {
    slotsByDay[parseInt(day)].sort((a, b) =>
      a.start_time.localeCompare(b.start_time),
    );
  });

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours + minutes / 60;
  };

  const getSlotPosition = (slot: TimeSlot): { top: number; height: number } => {
    const startHour = parseTime(slot.start_time);
    const endHour = parseTime(slot.end_time);
    const dayStartHour = 7;
    const hourHeight = 60; // px per hour

    return {
      top: (startHour - dayStartHour) * hourHeight,
      height: (endHour - startHour) * hourHeight,
    };
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-96 bg-secondary rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow overflow-hidden">
      {title && (
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
      )}

      {/* Grid View for larger screens */}
      <div className="hidden lg:block overflow-x-auto">
        <div className="min-w-[1200px] p-4">
          <div className="grid grid-cols-8 gap-1">
            {/* Time column header */}
            <div className="text-center text-xs font-medium text-muted-foreground py-2">
              Time
            </div>
            {/* Day headers */}
            {DAYS.map((day, index) => (
              <div
                key={day}
                className={`text-center py-2 text-sm font-medium ${
                  DAY_COLORS[index + 1].text
                }`}
              >
                {day}
              </div>
            ))}

            {/* Time rows */}
            {HOURS.map((hour) => (
              <div key={hour} className="contents">
                <div className="text-xs text-muted-foreground text-right pr-2 h-[60px] flex items-start justify-end pt-1">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                {DAYS.map((_, dayIndex) => {
                  const dayNumber = dayIndex + 1;
                  const daySlots = slotsByDay[dayNumber] || [];

                  // Find slots that start in this hour
                  const slotsInHour = daySlots.filter((slot) => {
                    const startHour = parseInt(slot.start_time.split(":")[0]);
                    return startHour === hour;
                  });

                  return (
                    <div
                      key={`${hour}-${dayIndex}`}
                      className="relative h-[60px] border-t border-border"
                    >
                      {slotsInHour.map((slot) => {
                        const { height } = getSlotPosition(slot);
                        const colors = DAY_COLORS[dayNumber];

                        return (
                          <div
                            key={slot.id}
                            onClick={() => onSlotClick?.(slot)}
                            className={`absolute inset-x-0.5 ${colors.bg} ${colors.border} border rounded-md p-1 overflow-hidden cursor-pointer hover:shadow-md transition-shadow z-10`}
                            style={{ height: `${height}px` }}
                          >
                            <div
                              className={`text-xs font-medium ${colors.text} truncate`}
                            >
                              {viewMode === "faculty"
                                ? slot.batch_detail?.code
                                : slot.faculty_detail?.full_name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {slot.module_detail?.code}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {slot.start_time.slice(0, 5)}-
                              {slot.end_time.slice(0, 5)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* List View for smaller screens */}
      <div className="lg:hidden">
        {DAYS.map((day, dayIndex) => {
          const dayNumber = dayIndex + 1;
          const daySlots = slotsByDay[dayNumber] || [];
          const colors = DAY_COLORS[dayNumber];

          return (
            <div key={day} className="border-b border-border last:border-b-0">
              <div
                className={`px-4 py-2 ${colors.bg} ${colors.text} font-medium`}
              >
                {day}
              </div>
              {daySlots.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground italic">
                  No classes
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      onClick={() => onSlotClick?.(slot)}
                      className="px-4 py-3 hover:bg-secondary/50 cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-foreground">
                            {slot.module_detail?.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {viewMode === "faculty"
                              ? `Batch: ${slot.batch_detail?.code}`
                              : `Faculty: ${slot.faculty_detail?.full_name}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-foreground">
                            {slot.start_time.slice(0, 5)} -{" "}
                            {slot.end_time.slice(0, 5)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {safeSlots.length === 0 && (
        <div className="p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground/70"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-foreground">
            No schedule found
          </h3>
          <p className="mt-1 text-muted-foreground">
            {viewMode === "faculty"
              ? "This faculty has no assigned classes yet."
              : "This batch has no classes scheduled yet."}
          </p>
        </div>
      )}
    </div>
  );
}
