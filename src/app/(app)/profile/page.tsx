"use client";

import { useState } from "react";
import { useAuth, useIsManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoleBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/States";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { extractErrorMessage } from "@/lib/utils";
import type { ProfileFormValues } from "@/types";

const schema = z.object({
  full_name: z.string().min(1, "Name is required"),
});

export default function ProfilePage() {
  const { profile, refresh, loading } = useAuth();
  const isManager = useIsManager();
  const supabase = createClient();

  const [editing, setEditing] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: profile?.full_name ?? "" },
  });

  if (loading) return <LoadingState />;
  if (!profile) return null;

  async function onSubmit(values: ProfileFormValues) {
    setMutationError(null);
    setSuccess(false);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: values.full_name })
        .eq("id", profile!.id);
      if (error) throw error;
      await refresh();
      setEditing(false);
      setSuccess(true);
    } catch (e) {
      setMutationError(extractErrorMessage(e));
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Profile" />

      {success && (
        <InlineAlert type="success" message="Profile updated successfully." />
      )}

      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-lg font-medium text-brand-300">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-base font-medium text-ink">{profile.full_name}</p>
            <p className="text-sm text-ink-muted">{profile.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-surface-border">
          <span className="text-sm text-ink-muted">Role</span>
          <RoleBadge role={profile.role} />
        </div>

        {profile.kiosk_id ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Kiosk ID</span>
            <span className="font-mono text-xs text-ink-faint">{profile.kiosk_id}</span>
          </div>
        ) : (
          <p className="text-sm text-ink-faint">No kiosk assigned</p>
        )}

        {isManager && !profile.kiosk_id && (
          <InlineAlert
            type="info"
            message="Managers can have no kiosk assignment — that's fine."
          />
        )}
      </div>

      {/* Edit form */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">
            Edit name
          </p>
          <button
            onClick={() => {
              setEditing((v) => !v);
              reset({ full_name: profile.full_name });
              setMutationError(null);
            }}
            className="btn-ghost text-xs"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {editing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {mutationError && <InlineAlert message={mutationError} />}
            <div>
              <label className="form-label">Full name</label>
              <input
                {...register("full_name")}
                className="input-base"
                disabled={isSubmitting}
              />
              {errors.full_name && (
                <p className="form-error">{errors.full_name.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? "Saving…" : "Save name"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-ink-muted">
            You can update your display name here.
            {!isManager && " Contact your manager to change your role or kiosk assignment."}
          </p>
        )}
      </div>
    </div>
  );
}
