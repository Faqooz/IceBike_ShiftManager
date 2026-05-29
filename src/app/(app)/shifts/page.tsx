"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth, useIsManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import {
  getShifts,
  getRequests,
  getAssignments,
  getKiosks,
} from "@/lib/supabase/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { ShiftCard } from "@/components/shared/ShiftCard";
import { extractErrorMessage } from "@/lib/utils";
import type { ShiftWithKiosk, ShiftRequestWithDetails, ShiftAssignmentWithDetails, Kiosk, ShiftStatus } from "@/types";

const statusOptions: { value: ShiftStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
  { value: "closed_by_weather", label: "Weather closed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function ShiftsPage() {
  const { profile } = useAuth();
  const isManager = useIsManager();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<ShiftWithKiosk[]>([]);
  const [requests, setRequests] = useState<ShiftRequestWithDetails[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignmentWithDetails[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);

  // Filters (manager only)
  const [filterKiosk, setFilterKiosk] = useState("");
  const [filterStatus, setFilterStatus] = useState<ShiftStatus | "">("");

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      if (isManager) {
        const [s, r, a, k] = await Promise.all([
          getShifts(supabase, {
            kiosk_id: filterKiosk || undefined,
            status: (filterStatus as ShiftStatus) || undefined,
          }),
          getRequests(supabase),
          getAssignments(supabase),
          getKiosks(supabase),
        ]);
        setShifts(s);
        setRequests(r);
        setAssignments(a);
        setKiosks(k);
      } else {
        if (!profile.kiosk_id) {
          setShifts([]);
          return;
        }
        const [s, r] = await Promise.all([
          getShifts(supabase, { kiosk_id: profile.kiosk_id, status: "published" }),
          getRequests(supabase),
        ]);
        setShifts(s);
        setRequests(r);
      }
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [profile, isManager, filterKiosk, filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // Build pending count and assigned employee maps
  const pendingCountByShift: Record<string, number> = {};
  const assignedByShift: Record<string, string> = {};
  requests.forEach((r) => {
    if (r.status === "pending") {
      pendingCountByShift[r.shift_id] = (pendingCountByShift[r.shift_id] ?? 0) + 1;
    }
  });
  assignments.forEach((a) => {
    assignedByShift[a.shift_id] = a.profiles.full_name;
  });

  // Employee: map requests by shift
  const myRequestByShift: Record<string, ShiftRequestWithDetails> = {};
  if (!isManager) {
    requests.forEach((r) => { myRequestByShift[r.shift_id] = r; });
  }

  return (
    <div>
      <PageHeader
        title="Shifts"
        subtitle={isManager ? "All kiosk shifts" : "Available shifts at your kiosk"}
        action={
          isManager ? (
            <Link href="/shifts/new" className="btn-primary">
              + New shift
            </Link>
          ) : undefined
        }
      />

      {/* Manager filters */}
      {isManager && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <select
            value={filterKiosk}
            onChange={(e) => setFilterKiosk(e.target.value)}
            className="input-base flex-1 min-w-[140px]"
          >
            <option value="">All kiosks</option>
            {kiosks.map((k) => (
              <option key={k.id} value={k.id}>{k.city_name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ShiftStatus | "")}
            className="input-base flex-1 min-w-[140px]"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={load} />
      ) : shifts.length === 0 ? (
        <EmptyState
          title="No shifts found"
          description={
            isManager
              ? "Create a new shift to get started."
              : "No published shifts at your kiosk right now."
          }
          action={
            isManager ? (
              <Link href="/shifts/new" className="btn-primary">
                Create shift
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {shifts.map((s) => (
            <ShiftCard
              key={s.id}
              shift={s}
              pendingCount={isManager ? pendingCountByShift[s.id] : undefined}
              assignedEmployee={isManager ? assignedByShift[s.id] : undefined}
              requestStatus={!isManager ? myRequestByShift[s.id]?.status ?? null : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
