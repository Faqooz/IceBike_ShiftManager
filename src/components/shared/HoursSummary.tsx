import type { ShiftAssignmentWithDetails } from "@/types";
import { durationHours, formatHours, isThisWeek, isThisMonth, formatDate, formatTime, formatDuration } from "@/lib/utils";
import { KioskLabel } from "@/components/shared/KioskLabel";

interface HoursSummaryProps {
  assignments: ShiftAssignmentWithDetails[];
  showEmployee?: boolean;
}

export function HoursSummary({ assignments, showEmployee = false }: HoursSummaryProps) {
  const weekHours = assignments
    .filter((a) => isThisWeek(a.start_at))
    .reduce((sum, a) => sum + durationHours(a.start_at, a.end_at), 0);

  const monthHours = assignments
    .filter((a) => isThisMonth(a.start_at))
    .reduce((sum, a) => sum + durationHours(a.start_at, a.end_at), 0);

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">This week</p>
          <p className="text-2xl font-bold text-emerald-400">{formatHours(weekHours)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-ink-muted uppercase tracking-wider mb-1">This month</p>
          <p className="text-2xl font-bold text-brand-400">{formatHours(monthHours)}</p>
        </div>
      </div>

      {/* Assignment list */}
      {assignments.length > 0 ? (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div key={a.id} className="card flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                {showEmployee && (
                  <p className="text-sm font-medium text-ink truncate">{a.profiles.full_name}</p>
                )}
                <p className="text-sm text-ink-muted">{formatDate(a.start_at)}</p>
                <p className="text-xs font-mono text-ink-faint">
                  {formatTime(a.start_at)}–{formatTime(a.end_at)}
                </p>
                <KioskLabel cityName={a.shifts.kiosks.city_name} />
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-emerald-400">
                  {formatDuration(a.start_at, a.end_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-faint text-center py-6">No assignments yet.</p>
      )}
    </div>
  );
}
