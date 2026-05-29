import type { ShiftStatus, RequestStatus } from "@/types";
import {
  shiftStatusLabel,
  shiftStatusColor,
  requestStatusLabel,
  requestStatusColor,
} from "@/lib/utils";

interface ShiftStatusBadgeProps {
  status: ShiftStatus;
}

export function ShiftStatusBadge({ status }: ShiftStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${shiftStatusColor(status)}`}
    >
      {shiftStatusLabel(status)}
    </span>
  );
}

interface RequestStatusBadgeProps {
  status: RequestStatus;
}

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${requestStatusColor(status)}`}
    >
      {requestStatusLabel(status)}
    </span>
  );
}

interface RoleBadgeProps {
  role: "employee" | "manager";
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const color =
    role === "manager"
      ? "bg-brand-500/15 text-brand-300"
      : "bg-surface-muted/50 text-ink-muted";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}
    >
      {role === "manager" ? "Manager" : "Employee"}
    </span>
  );
}
