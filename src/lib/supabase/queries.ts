import { SupabaseClient } from "@supabase/supabase-js";
import type {
  Profile,
  Kiosk,
  Shift,
  ShiftRequest,
  ShiftAssignment,
  ShiftAuditLog,
  ShiftWithKiosk,
  ShiftRequestWithDetails,
  ShiftAssignmentWithDetails,
  ShiftStatus,
  UserRole,
} from "@/types";

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getCurrentUserProfile(
  supabase: SupabaseClient
): Promise<Profile | null> {
  const { data, error } = await supabase.rpc("current_user_profile");
  if (error) throw error;
  return data as Profile | null;
}

export async function isManager(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_manager");
  if (error) throw error;
  return data as boolean;
}

export async function canAccessKiosk(
  supabase: SupabaseClient,
  kioskId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_access_kiosk", {
    kiosk_id: kioskId,
  });
  if (error) throw error;
  return data as boolean;
}

export async function adminUpdateProfile(
  supabase: SupabaseClient,
  userId: string,
  fullName: string,
  role: UserRole,
  kioskId: string | null
): Promise<Profile> {
  const { data, error } = await supabase.rpc("admin_update_profile", {
    target_user_id: userId,
    new_full_name: fullName,
    new_role: role,
    new_kiosk_id: kioskId,
  });
  if (error) throw error;
  return data as Profile;
}

// ─── Kiosks ───────────────────────────────────────────────────────────────────

export async function getKiosks(supabase: SupabaseClient): Promise<Kiosk[]> {
  const { data, error } = await supabase
    .from("kiosks")
    .select("*")
    .order("city_name");
  if (error) throw error;
  return data as Kiosk[];
}

// ─── Shifts ───────────────────────────────────────────────────────────────────

export async function getShifts(
  supabase: SupabaseClient,
  filters?: { kiosk_id?: string; status?: ShiftStatus }
): Promise<ShiftWithKiosk[]> {
  let query = supabase
    .from("shifts")
    .select("*, kiosks(id, city_name)")
    .order("start_at", { ascending: true });

  if (filters?.kiosk_id) {
    query = query.eq("kiosk_id", filters.kiosk_id);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as ShiftWithKiosk[];
}

export async function getShiftById(
  supabase: SupabaseClient,
  shiftId: string
): Promise<ShiftWithKiosk | null> {
  const { data, error } = await supabase
    .from("shifts")
    .select("*, kiosks(id, city_name)")
    .eq("id", shiftId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as ShiftWithKiosk;
}

export async function createShift(
  supabase: SupabaseClient,
  kioskId: string,
  startAt: string,
  endAt: string,
  capacity: number,
  notes: string
): Promise<Shift> {
  const { data, error } = await supabase.rpc("create_shift", {
    p_kiosk_id: kioskId,
    p_start_at: startAt,
    p_end_at: endAt,
    p_capacity: capacity,
    p_notes: notes,
  });
  if (error) throw error;
  return data as Shift;
}

export async function updateShift(
  supabase: SupabaseClient,
  shiftId: string,
  kioskId: string,
  startAt: string,
  endAt: string,
  capacity: number,
  notes: string
): Promise<Shift> {
  const { data, error } = await supabase.rpc("update_shift", {
    p_shift_id: shiftId,
    p_kiosk_id: kioskId,
    p_start_at: startAt,
    p_end_at: endAt,
    p_capacity: capacity,
    p_notes: notes,
  });
  if (error) throw error;
  return data as Shift;
}

export async function publishShift(
  supabase: SupabaseClient,
  shiftId: string
): Promise<Shift> {
  const { data, error } = await supabase.rpc("publish_shift", {
    p_shift_id: shiftId,
  });
  if (error) throw error;
  return data as Shift;
}

export async function hideShift(
  supabase: SupabaseClient,
  shiftId: string
): Promise<Shift> {
  const { data, error } = await supabase.rpc("hide_shift", {
    p_shift_id: shiftId,
  });
  if (error) throw error;
  return data as Shift;
}

export async function closeShiftForWeather(
  supabase: SupabaseClient,
  shiftId: string
): Promise<Shift> {
  const { data, error } = await supabase.rpc("close_shift_for_weather", {
    p_shift_id: shiftId,
  });
  if (error) throw error;
  return data as Shift;
}

export async function cancelShift(
  supabase: SupabaseClient,
  shiftId: string
): Promise<Shift> {
  const { data, error } = await supabase.rpc("cancel_shift", {
    p_shift_id: shiftId,
  });
  if (error) throw error;
  return data as Shift;
}

export async function deleteShift(
  supabase: SupabaseClient,
  shiftId: string
): Promise<void> {
  const { error } = await supabase.from("shifts").delete().eq("id", shiftId);
  if (error) throw error;
}

// ─── Shift Requests ───────────────────────────────────────────────────────────

export async function getRequests(
  supabase: SupabaseClient
): Promise<ShiftRequestWithDetails[]> {
  const { data, error } = await supabase
    .from("shift_requests")
    .select("*, profiles!employee_id(id, full_name), shifts(*, kiosks(id, city_name))")
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return data as ShiftRequestWithDetails[];
}

export async function getRequestsForShift(
  supabase: SupabaseClient,
  shiftId: string
): Promise<ShiftRequest[]> {
  const { data, error } = await supabase
    .from("shift_requests")
    .select("*")
    .eq("shift_id", shiftId)
    .order("requested_at", { ascending: true });
  if (error) throw error;
  return data as ShiftRequest[];
}

export async function requestShift(
  supabase: SupabaseClient,
  shiftId: string
): Promise<ShiftRequest> {
  const { data, error } = await supabase.rpc("request_shift", {
    p_shift_id: shiftId,
  });
  if (error) throw error;
  return data as ShiftRequest;
}

export async function withdrawRequest(
  supabase: SupabaseClient,
  requestId: string
): Promise<ShiftRequest> {
  const { data, error } = await supabase.rpc("withdraw_request", {
    p_request_id: requestId,
  });
  if (error) throw error;
  return data as ShiftRequest;
}

export async function approveRequest(
  supabase: SupabaseClient,
  requestId: string
): Promise<ShiftAssignment> {
  const { data, error } = await supabase.rpc("approve_request", {
    p_request_id: requestId,
  });
  if (error) throw error;
  return data as ShiftAssignment;
}

export async function rejectRequest(
  supabase: SupabaseClient,
  requestId: string,
  note: string
): Promise<ShiftRequest> {
  const { data, error } = await supabase.rpc("reject_request", {
    p_request_id: requestId,
    p_decision_note: note,
  });
  if (error) throw error;
  return data as ShiftRequest;
}

// ─── Shift Assignments ────────────────────────────────────────────────────────

export async function getAssignments(
  supabase: SupabaseClient
): Promise<ShiftAssignmentWithDetails[]> {
  const { data, error } = await supabase
    .from("shift_assignments")
    .select("*, profiles!employee_id(id, full_name), shifts(*, kiosks(id, city_name))")
    .order("start_at", { ascending: false });
  if (error) throw error;
  return data as ShiftAssignmentWithDetails[];
}

export async function getAssignmentsForEmployee(
  supabase: SupabaseClient,
  employeeId: string
): Promise<ShiftAssignmentWithDetails[]> {
  const { data, error } = await supabase
    .from("shift_assignments")
    .select("*, profiles!employee_id(id, full_name), shifts(*, kiosks(id, city_name))")
    .eq("employee_id", employeeId)
    .order("start_at", { ascending: false });
  if (error) throw error;
  return data as ShiftAssignmentWithDetails[];
}

export async function getAssignmentForShift(
  supabase: SupabaseClient,
  shiftId: string
): Promise<ShiftAssignmentWithDetails | null> {
  const { data, error } = await supabase
    .from("shift_assignments")
    .select("*, profiles!employee_id(id, full_name), shifts(*, kiosks(id, city_name))")
    .eq("shift_id", shiftId)
    .maybeSingle();
  if (error) throw error;
  return data as ShiftAssignmentWithDetails | null;
}

// ─── Profiles (manager queries) ───────────────────────────────────────────────

export async function getAllProfiles(
  supabase: SupabaseClient
): Promise<(Profile & { kiosks: Pick<Kiosk, "id" | "city_name"> | null })[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, kiosks(id, city_name)")
    .order("full_name");
  if (error) throw error;
  return data as (Profile & {
    kiosks: Pick<Kiosk, "id" | "city_name"> | null;
  })[];
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export async function getAuditLog(
  supabase: SupabaseClient
): Promise<ShiftAuditLog[]> {
  const { data, error } = await supabase
    .from("shift_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as ShiftAuditLog[];
}
