"use client";

import { useEffect, useState, useCallback } from "react";
import { useIsManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import {
  getAllProfiles,
  getKiosks,
  getAssignments,
  adminUpdateProfile,
} from "@/lib/supabase/queries";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoleBadge } from "@/components/ui/StatusBadge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { durationHours, extractErrorMessage } from "@/lib/utils";
import type { Profile, Kiosk, ShiftAssignmentWithDetails, UserRole, AdminProfileFormValues } from "@/types";

const adminSchema = z.object({
  full_name: z.string().min(1, "Name required"),
  role: z.enum(["employee", "manager"] as const),
  kiosk_id: z.string(),
});

type ProfileWithKiosk = Profile & { kiosks: Pick<Kiosk, "id" | "city_name"> | null };

export default function EmployeesPage() {
  const isManager = useIsManager();
  const supabase = createClient();

  const [profiles, setProfiles] = useState<ProfileWithKiosk[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmSave, setConfirmSave] = useState<AdminProfileFormValues & { userId: string } | null>(null);
  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, k, a] = await Promise.all([
        getAllProfiles(supabase),
        getKiosks(supabase),
        getAssignments(supabase),
      ]);
      setProfiles(p);
      setKiosks(k);
      setAssignments(a);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  async function handleSave(userId: string, values: AdminProfileFormValues) {
    setMutationError(null);
    setMutating(true);
    try {
      await adminUpdateProfile(
        supabase,
        userId,
        values.full_name,
        values.role as UserRole,
        values.kiosk_id || null
      );
      setEditingId(null);
      setConfirmSave(null);
      await load();
    } catch (e) {
      setMutationError(extractErrorMessage(e));
    } finally {
      setMutating(false);
    }
  }

  if (!isManager) {
    return <ErrorState title="Access denied" message="Managers only." />;
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={load} />;

  // Hours by employee
  const hoursByEmployee: Record<string, number> = {};
  assignments.forEach((a) => {
    hoursByEmployee[a.employee_id] =
      (hoursByEmployee[a.employee_id] ?? 0) + durationHours(a.start_at, a.end_at);
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employees"
        subtitle={`${profiles.length} profiles`}
      />

      {mutationError && <InlineAlert message={mutationError} />}

      {profiles.length === 0 ? (
        <EmptyState title="No profiles found" />
      ) : (
        <div className="space-y-2">
          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              kiosks={kiosks}
              totalHours={hoursByEmployee[p.id] ?? 0}
              editing={editingId === p.id}
              mutating={mutating}
              onEdit={() => setEditingId(p.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={(values) => setConfirmSave({ ...values, userId: p.id })}
            />
          ))}
        </div>
      )}

      {confirmSave && (
        <ConfirmDialog
          open={true}
          title="Save profile changes?"
          message={`Update profile for ${confirmSave.full_name}? Role: ${confirmSave.role}. This change takes effect immediately.`}
          loading={mutating}
          confirmLabel="Save"
          onConfirm={() => handleSave(confirmSave.userId, confirmSave)}
          onCancel={() => setConfirmSave(null)}
        />
      )}
    </div>
  );
}

interface ProfileCardProps {
  profile: ProfileWithKiosk;
  kiosks: Kiosk[];
  totalHours: number;
  editing: boolean;
  mutating: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (values: AdminProfileFormValues) => void;
}

function ProfileCard({
  profile,
  kiosks,
  totalHours,
  editing,
  mutating,
  onEdit,
  onCancelEdit,
  onSave,
}: ProfileCardProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminProfileFormValues>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      full_name: profile.full_name,
      role: profile.role,
      kiosk_id: profile.kiosk_id ?? "",
    },
  });

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-ink">{profile.full_name}</p>
            <RoleBadge role={profile.role} />
          </div>
          {profile.kiosks ? (
            <p className="text-xs text-ink-muted">{profile.kiosks.city_name}</p>
          ) : (
            <p className="text-xs text-ink-faint">No kiosk assigned</p>
          )}
          <p className="text-xs text-ink-faint">{totalHours.toFixed(1)}h total</p>
        </div>
        <button
          onClick={editing ? onCancelEdit : onEdit}
          className="btn-ghost text-xs shrink-0"
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {editing && (
        <form
          onSubmit={handleSubmit(onSave)}
          className="space-y-3 pt-3 border-t border-surface-border"
        >
          <div>
            <label className="form-label">Full name</label>
            <input
              {...register("full_name")}
              className="input-base"
              disabled={mutating}
            />
            {errors.full_name && (
              <p className="form-error">{errors.full_name.message}</p>
            )}
          </div>
          <div>
            <label className="form-label">Role</label>
            <select {...register("role")} className="input-base" disabled={mutating}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div>
            <label className="form-label">Kiosk</label>
            <select {...register("kiosk_id")} className="input-base" disabled={mutating}>
              <option value="">None (manager)</option>
              {kiosks.map((k) => (
                <option key={k.id} value={k.id}>{k.city_name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={mutating}
            className="btn-primary w-full"
          >
            {mutating ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}
    </div>
  );
}
