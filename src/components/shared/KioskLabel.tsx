import { formatTime, formatDate, formatDuration } from "@/lib/utils";

interface KioskLabelProps {
  cityName: string;
  className?: string;
}

export function KioskLabel({ cityName, className = "" }: KioskLabelProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
      <span className="text-ink-muted text-sm">{cityName}</span>
    </span>
  );
}

interface TimeRangeProps {
  startAt: string;
  endAt: string;
  showDate?: boolean;
  className?: string;
}

export function TimeRange({
  startAt,
  endAt,
  showDate = true,
  className = "",
}: TimeRangeProps) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
      {showDate && (
        <span className="text-ink-muted text-sm">{formatDate(startAt)}</span>
      )}
      <span className="text-ink font-medium font-mono text-sm">
        {formatTime(startAt)}–{formatTime(endAt)}
      </span>
      <span className="text-ink-faint text-xs">
        ({formatDuration(startAt, endAt)})
      </span>
    </span>
  );
}
