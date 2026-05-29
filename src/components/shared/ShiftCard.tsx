import Link from "next/link";
import type { ShiftWithKiosk } from "@/types";
import { ShiftStatusBadge } from "@/components/ui/StatusBadge";
import { KioskLabel, TimeRange } from "@/components/shared/KioskLabel";

interface ShiftCardProps {
  shift: ShiftWithKiosk;
  pendingCount?: number;
  assignedEmployee?: string | null;
  requestStatus?: "pending" | "approved" | "rejected" | "cancelled" | null;
}

export function ShiftCard({
  shift,
  pendingCount,
  assignedEmployee,
  requestStatus,
}: ShiftCardProps) {
  return (
    <Link href={`/shifts/${shift.id}`} className="block">
      <div className="card hover:border-surface-muted transition-colors duration-150 space-y-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <TimeRange startAt={shift.start_at} endAt={shift.end_at} />
          <ShiftStatusBadge status={shift.status} />
        </div>

        {/* Kiosk */}
        <KioskLabel cityName={shift.kiosks.city_name} />

        {/* Bottom row */}
        <div className="flex items-center justify-between gap-2 text-xs text-ink-faint">
          <span>Capacity: {shift.capacity}</span>
          <div className="flex items-center gap-3">
            {pendingCount !== undefined && pendingCount > 0 && (
              <span className="text-yellow-400">
                {pendingCount} pending
              </span>
            )}
            {assignedEmployee && (
              <span className="text-emerald-400">→ {assignedEmployee}</span>
            )}
            {requestStatus === "pending" && (
              <span className="text-yellow-400">Your request: pending</span>
            )}
            {requestStatus === "approved" && (
              <span className="text-emerald-400">Your request: approved</span>
            )}
          </div>
        </div>

        {shift.notes && (
          <p className="text-xs text-ink-faint border-t border-surface-border pt-2">
            {shift.notes}
          </p>
        )}
      </div>
    </Link>
  );
}
