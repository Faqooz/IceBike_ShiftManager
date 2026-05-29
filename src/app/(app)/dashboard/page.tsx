"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, useIsManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import {
  getRequests,
  getShifts,
  getAssignmentsForEmployee,
  getAssignments,
  getAllProfiles,
} from "@/lib/supabase/queries";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShiftCard } from "@/components/shared/ShiftCard";
import { formatRelative, extractErrorMessage, durationHours, isThisWeek } from "@/lib/utils";
import type { ShiftWithKiosk, ShiftRequestWithDetails, ShiftAssignmentWithDetails } from "@/types";

function ManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<ShiftWithKiosk[]>([]);
  const [requests, setRequests] = useState<ShiftRequestWithDetails[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignmentWithDetails[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      try {
        const [s, r, a, profiles] = await Promise.all([
          getShifts(supabase),
          getRequests(supabase),
          getAssignments(supabase),
          getAllProfiles(supabase),
        ]);
        setShifts(s);
        setRequests(r);
        setAssignments(a);
        setEmployeeCount(profiles.filter((p) => p.role === "employee").length);
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const publishedShifts = shifts.filter((s) => s.status === "published");
  const upcomingShifts = publishedShifts
    .filter((s) => new Date(s.start_at) > new Date())
    .slice(0, 3);
  const recentRequests = requests.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Manager overview"
        action={
          <Link href="/shifts/new" className="btn-primary">
            + New shift
          </Link>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          label="Pending requests"
          value={pendingRequests.length}
          accent={pendingRequests.length > 0 ? "yellow" : "default"}
        />
        <SummaryCard
          label="Published shifts"
          value={publishedShifts.length}
          accent="green"
        />
        <SummaryCard label="Total shifts" value={shifts.length} />
        <SummaryCard label="Active employees" value={employeeCount} accent="blue" />
      </div>

      {/* Upcoming shifts */}
      {upcomingShifts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wider">
              Upcoming shifts
            </h3>
            <Link href="/shifts" className="text-xs text-brand-400 hover:text-brand-300">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingShifts.map((s) => (
              <ShiftCard key={s.id} shift={s} />
            ))}
          </div>
        </div>
      )}

      {/* Recent requests */}
      {recentRequests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wider">
              Recent requests
            </h3>
            <Link href="/requests" className="text-xs text-brand-400 hover:text-brand-300">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentRequests.map((r) => (
              <div key={r.id} className="card flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">{r.profiles.full_name}</p>
                  <p className="text-xs text-ink-muted">{r.shifts.kiosks.city_name}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${
                    r.status === "pending" ? "text-yellow-400" :
                    r.status === "approved" ? "text-emerald-400" : "text-ink-faint"
                  }`}>
                    {r.status}
                  </p>
                  <p className="text-xs text-ink-faint">{formatRelative(r.requested_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<ShiftWithKiosk[]>([]);
  const [requests, setRequests] = useState<ShiftRequestWithDetails[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignmentWithDetails[]>([]);

  const supabase = createClient();

  useEffect(() => {
    if (!profile) return;
    async function load() {
      try {
        const [s, r, a] = await Promise.all([
          profile!.kiosk_id
            ? getShifts(supabase, { kiosk_id: profile!.kiosk_id, status: "published" })
            : Promise.resolve([]),
          getRequests(supabase),
          getAssignmentsForEmployee(supabase, profile!.id),
        ]);
        setShifts(s);
        setRequests(r);
        setAssignments(a);
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const weekHours = assignments
    .filter((a) => isThisWeek(a.start_at))
    .reduce((sum, a) => sum + durationHours(a.start_at, a.end_at), 0);
  const upcomingShifts = shifts
    .filter((s) => new Date(s.start_at) > new Date())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${profile?.full_name}`} />

      {/* No kiosk warning */}
      {!profile?.kiosk_id && (
        <div className="card border-yellow-500/30 bg-yellow-500/5">
          <p className="text-sm text-yellow-300">
            You're not assigned to a kiosk yet. Contact your manager.
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          label="Pending requests"
          value={pendingRequests.length}
          accent={pendingRequests.length > 0 ? "yellow" : "default"}
        />
        <SummaryCard
          label="Hours this week"
          value={`${weekHours.toFixed(1)}h`}
          accent="green"
        />
      </div>

      {/* Upcoming shifts */}
      {upcomingShifts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wider">
              Available shifts
            </h3>
            <Link href="/shifts" className="text-xs text-brand-400 hover:text-brand-300">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingShifts.map((s) => {
              const req = requests.find((r) => r.shift_id === s.id);
              return (
                <ShiftCard
                  key={s.id}
                  shift={s}
                  requestStatus={req?.status ?? null}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wider">
              Your pending requests
            </h3>
            <Link href="/requests" className="text-xs text-brand-400 hover:text-brand-300">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {pendingRequests.slice(0, 3).map((r) => (
              <div key={r.id} className="card flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink">{r.shifts.kiosks.city_name}</p>
                  <p className="text-xs text-ink-muted">{formatRelative(r.requested_at)}</p>
                </div>
                <span className="text-xs text-yellow-400 font-medium">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const isManager = useIsManager();
  const { loading } = useAuth();

  if (loading) return <LoadingState />;
  return isManager ? <ManagerDashboard /> : <EmployeeDashboard />;
}
