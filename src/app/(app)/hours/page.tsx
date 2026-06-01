"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth, useIsManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import {
  getAssignments,
  getAssignmentsForEmployee,
  getAllProfiles,
} from "@/lib/supabase/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { HoursSummary } from "@/components/shared/HoursSummary";
import { extractErrorMessage, durationHours, formatHours } from "@/lib/utils";
import type { ShiftAssignmentWithDetails, Profile, Kiosk } from "@/types";

type ProfileWithKiosk = Profile & { kiosks: Pick<Kiosk, "id" | "city_name"> | null };

function exportCSV(assignments: ShiftAssignmentWithDetails[]) {
  const rows = [
    ["Employee", "Date", "Weekday", "Start", "End", "Hours"],
    ...assignments.map((a) => {
      const start = new Date(a.start_at);
      const end = new Date(a.end_at);
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const date = start.toLocaleDateString("fi-FI");
      const weekday = days[start.getDay()];
      const startTime = start.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" });
      const endTime = end.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" });
      const hours = ((end.getTime() - start.getTime()) / 3600000).toFixed(2);
      return [a.profiles.full_name, date, weekday, startTime, endTime, hours];
    }),
  ];

  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hours_export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function HoursPage() {
  const { profile } = useAuth();
  const isManager = useIsManager();
  const supabase = createClient();

  const [assignments, setAssignments] = useState<ShiftAssignmentWithDetails[]>([]);
  const [profiles, setProfiles] = useState<ProfileWithKiosk[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      if (isManager) {
        const [a, p] = await Promise.all([
          getAssignments(supabase),
          getAllProfiles(supabase),
        ]);
        setAssignments(a);
        setProfiles(p.filter((p) => p.role === "employee"));
      } else {
        const a = await getAssignmentsForEmployee(supabase, profile.id);
        setAssignments(a);
      }
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [profile, isManager]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={load} />;

  if (!isManager) {
    return (
      <div>
        <PageHeader title="My hours" subtitle="Based on approved assignments" />
        {assignments.length === 0 ? (
          <EmptyState title="No approved assignments yet" />
        ) : (
          <HoursSummary assignments={assignments} />
        )}
      </div>
    );
  }

  // Manager view
  const filteredAssignments =
    selectedEmployee === "all"
      ? assignments
      : assignments.filter((a) => a.employee_id === selectedEmployee);

  // Total hours per employee
  const hoursByEmployee: Record<string, { name: string; hours: number }> = {};
  assignments.forEach((a) => {
    if (!hoursByEmployee[a.employee_id]) {
      hoursByEmployee[a.employee_id] = { name: a.profiles.full_name, hours: 0 };
    }
    hoursByEmployee[a.employee_id].hours += durationHours(a.start_at, a.end_at);
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hours"
        subtitle="All approved assignments"
        action={
          <button
            onClick={() => exportCSV(filteredAssignments)}
            className="btn-primary"
          >
            Export CSV
          </button>
        }
      />

      {/* Summary table */}
      {Object.keys(hoursByEmployee).length > 0 && (
        <div className="card">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-3">
            All-time totals
          </p>
          <div className="divide-y divide-surface-border">
            {Object.entries(hoursByEmployee).map(([id, { name, hours }]) => (
              <div key={id} className="flex items-center justify-between py-2">
                <button
                  onClick={() => setSelectedEmployee(id === selectedEmployee ? "all" : id)}
                  className={`text-sm ${id === selectedEmployee ? "text-brand-400" : "text-ink hover:text-brand-300"} text-left`}
                >
                  {name}
                </button>
                <span className="text-sm font-medium text-emerald-400">
                  {formatHours(hours)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="input-base flex-1"
        >
          <option value="all">All employees</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </select>
        {selectedEmployee !== "all" && (
          <button
            onClick={() => setSelectedEmployee("all")}
            className="btn-ghost text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {filteredAssignments.length === 0 ? (
        <EmptyState title="No assignments found" />
      ) : (
        <HoursSummary
          assignments={filteredAssignments}
          showEmployee={selectedEmployee === "all"}
        />
      )}
    </div>
  );
}