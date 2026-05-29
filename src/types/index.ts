// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = "employee" | "manager";
export type ShiftStatus =
  | "draft"
  | "published"
  | "hidden"
  | "closed_by_weather"
  | "cancelled";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface Kiosk {
  id: string;
  city_name: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  kiosk_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  kiosk_id: string;
  start_at: string;
  end_at: string;
  status: ShiftStatus;
  capacity: number;
  notes: string | null;
  created_by: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftRequest {
  id: string;
  shift_id: string;
  employee_id: string;
  status: RequestStatus;
  decision_note: string | null;
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignment {
  id: string;
  shift_id: string;
  request_id: string;
  employee_id: string;
  kiosk_id: string;
  start_at: string;
  end_at: string;
  assigned_by: string;
  assigned_at: string;
  created_at: string;
}

export interface ShiftAuditLog {
  id: string;
  shift_id: string | null;
  actor_id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── Joined / Enriched Types ──────────────────────────────────────────────────

export interface ShiftWithKiosk extends Shift {
  kiosks: Pick<Kiosk, "id" | "city_name">;
}

export interface ShiftRequestWithDetails extends ShiftRequest {
  profiles: Pick<Profile, "id" | "full_name">;
  shifts: ShiftWithKiosk;
}

export interface ShiftAssignmentWithDetails extends ShiftAssignment {
  profiles: Pick<Profile, "id" | "full_name">;
  shifts: ShiftWithKiosk;
}

export interface AuditLogWithActor extends ShiftAuditLog {
  actor: Pick<Profile, "id" | "full_name">;
  shift?: Pick<Shift, "id" | "start_at" | "end_at"> | null;
}

// ─── RPC Return Types (match backend exactly) ─────────────────────────────────

export type RpcShift = Shift;
export type RpcShiftRequest = ShiftRequest;
export type RpcShiftAssignment = ShiftAssignment;
export type RpcProfile = Profile;

// ─── UI / Form Types ──────────────────────────────────────────────────────────

export interface ShiftFormValues {
  kiosk_id: string;
  date: string; // local date string
  start_time: string; // local time string, 15-minute steps
  end_time: string;
  capacity: number;
  notes: string;
  recurrence: "none" | "daily" | "weekly";
  occurrences: number;
}

export interface ProfileFormValues {
  full_name: string;
}

export interface AdminProfileFormValues {
  full_name: string;
  role: UserRole;
  kiosk_id: string;
}
