import {
  format,
  formatDistanceToNow,
  differenceInMinutes,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from "date-fns";
import type { ShiftStatus, RequestStatus } from "@/types";

// ─── Date / Time ──────────────────────────────────────────────────────────────

/** Format a UTC ISO string to a local date+time, e.g. "Mon 14 Jul, 09:00" */
export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "EEE d MMM, HH:mm");
}

/** Format a UTC ISO string to local date only, e.g. "14 Jul 2024" */
export function formatDate(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy");
}

/** Format a UTC ISO string to local time only, e.g. "09:00" */
export function formatTime(iso: string): string {
  return format(parseISO(iso), "HH:mm");
}

/** Human-readable relative time, e.g. "3 days ago" */
export function formatRelative(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

/** Duration in hours and minutes, e.g. "7h 30m" */
export function formatDuration(startIso: string, endIso: string): string {
  const mins = differenceInMinutes(parseISO(endIso), parseISO(startIso));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Total hours as a decimal, e.g. 7.5 */
export function durationHours(startIso: string, endIso: string): number {
  const mins = differenceInMinutes(parseISO(endIso), parseISO(startIso));
  return Math.round((mins / 60) * 10) / 10;
}

/** Convert a local datetime-local string (from <input type="datetime-local">) to UTC ISO */
export function localToUtc(localDatetimeStr: string): string {
  const date = new Date(localDatetimeStr);
  return date.toISOString();
}

/** Convert a UTC ISO string to local datetime-local format for <input type="datetime-local"> */
export function utcToLocalInput(iso: string): string {
  const date = parseISO(iso);
  // Format as YYYY-MM-DDTHH:mm in local time
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/** Check if an ISO date is within this week */
export function isThisWeek(iso: string): boolean {
  const date = parseISO(iso);
  const now = new Date();
  return isWithinInterval(date, {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  });
}

/** Check if an ISO date is within this month */
export function isThisMonth(iso: string): boolean {
  const date = parseISO(iso);
  const now = new Date();
  return isWithinInterval(date, {
    start: startOfMonth(now),
    end: endOfMonth(now),
  });
}

// ─── Status Labels ────────────────────────────────────────────────────────────

export function shiftStatusLabel(status: ShiftStatus): string {
  const labels: Record<ShiftStatus, string> = {
    draft: "Draft",
    published: "Published",
    hidden: "Hidden",
    closed_by_weather: "Weather Closed",
    cancelled: "Cancelled",
  };
  return labels[status];
}

export function requestStatusLabel(status: RequestStatus): string {
  const labels: Record<RequestStatus, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
  };
  return labels[status];
}

// ─── Status Colors (Tailwind class strings) ───────────────────────────────────

export function shiftStatusColor(status: ShiftStatus): string {
  const colors: Record<ShiftStatus, string> = {
    draft: "bg-ink-faint/30 text-ink-muted",
    published: "bg-emerald-500/15 text-emerald-400",
    hidden: "bg-yellow-500/15 text-yellow-400",
    closed_by_weather: "bg-sky-500/15 text-sky-400",
    cancelled: "bg-red-500/15 text-red-400",
  };
  return colors[status];
}

export function requestStatusColor(status: RequestStatus): string {
  const colors: Record<RequestStatus, string> = {
    pending: "bg-yellow-500/15 text-yellow-400",
    approved: "bg-emerald-500/15 text-emerald-400",
    rejected: "bg-red-500/15 text-red-400",
    cancelled: "bg-ink-faint/30 text-ink-muted",
  };
  return colors[status];
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

/** Extract a user-friendly error message from a Supabase or generic error */
export function extractErrorMessage(error: unknown): string {
  if (!error) return "An unknown error occurred.";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "An unexpected error occurred.";
}
