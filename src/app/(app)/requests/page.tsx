"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth, useIsManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import {
  getRequests,
  approveRequest,
  rejectRequest,
  withdrawRequest,
} from "@/lib/supabase/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { RequestStatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { KioskLabel, TimeRange } from "@/components/shared/KioskLabel";
import { formatRelative, extractErrorMessage } from "@/lib/utils";
import type { ShiftRequestWithDetails } from "@/types";

export default function RequestsPage() {
  const { profile } = useAuth();
  const isManager = useIsManager();
  const supabase = createClient();

  const [requests, setRequests] = useState<ShiftRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  // Reject flow
  const [rejectNote, setRejectNote] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Confirm
  type Action = { type: "approve" | "withdraw"; id: string } | { type: "reject"; id: string };
  const [confirm, setConfirm] = useState<Action | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getRequests(supabase);
      setRequests(r);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  async function executeAction(action: Action) {
    setMutationError(null);
    setMutating(true);
    try {
      if (action.type === "approve") {
        await approveRequest(supabase, action.id);
      } else if (action.type === "reject") {
        await rejectRequest(supabase, action.id, rejectNote);
        setRejectNote("");
        setRejectingId(null);
      } else if (action.type === "withdraw") {
        await withdrawRequest(supabase, action.id);
      }
      await load();
    } catch (e) {
      setMutationError(extractErrorMessage(e));
    } finally {
      setMutating(false);
      setConfirm(null);
    }
  }

  const pending = requests.filter((r) => r.status === "pending");
  const others = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Requests"
        subtitle={isManager ? "All shift requests" : "Your shift requests"}
      />

      {mutationError && <InlineAlert message={mutationError} />}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={load} />
      ) : requests.length === 0 ? (
        <EmptyState
          title="No requests yet"
          description={
            isManager
              ? "Requests will appear here when employees request shifts."
              : "You haven't requested any shifts yet."
          }
          action={
            !isManager ? (
              <Link href="/shifts" className="btn-primary">Browse shifts</Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Pending section */}
          {pending.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-3">
                Pending ({pending.length})
              </h3>
              <div className="space-y-2">
                {pending.map((req) => (
                  <RequestRow
                    key={req.id}
                    req={req}
                    isManager={isManager}
                    myId={profile?.id}
                    mutating={mutating}
                    rejectingId={rejectingId}
                    rejectNote={rejectNote}
                    onRejectNote={setRejectNote}
                    onStartReject={(id) => setRejectingId(id)}
                    onCancelReject={() => { setRejectingId(null); setRejectNote(""); }}
                    onApprove={(id) => setConfirm({ type: "approve", id })}
                    onReject={(id) => setConfirm({ type: "reject", id })}
                    onWithdraw={(id) => setConfirm({ type: "withdraw", id })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other requests */}
          {others.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-3">
                History
              </h3>
              <div className="space-y-2">
                {others.map((req) => (
                  <RequestRow
                    key={req.id}
                    req={req}
                    isManager={isManager}
                    myId={profile?.id}
                    mutating={mutating}
                    rejectingId={null}
                    rejectNote=""
                    onRejectNote={() => {}}
                    onStartReject={() => {}}
                    onCancelReject={() => {}}
                    onApprove={() => {}}
                    onReject={() => {}}
                    onWithdraw={() => {}}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          open={true}
          title={
            confirm.type === "approve"
              ? "Approve request?"
              : confirm.type === "reject"
              ? "Reject request?"
              : "Withdraw request?"
          }
          message={
            confirm.type === "approve"
              ? "This will create an assignment. Only one assignment can exist per shift."
              : confirm.type === "reject"
              ? "The request will be marked as rejected."
              : "Are you sure you want to withdraw your request?"
          }
          dangerous={confirm.type !== "approve"}
          loading={mutating}
          confirmLabel={
            confirm.type === "approve"
              ? "Approve"
              : confirm.type === "reject"
              ? "Reject"
              : "Withdraw"
          }
          onConfirm={() => executeAction(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

interface RequestRowProps {
  req: ShiftRequestWithDetails;
  isManager: boolean;
  myId?: string;
  mutating: boolean;
  rejectingId: string | null;
  rejectNote: string;
  onRejectNote: (v: string) => void;
  onStartReject: (id: string) => void;
  onCancelReject: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onWithdraw: (id: string) => void;
}

function RequestRow({
  req,
  isManager,
  myId,
  mutating,
  rejectingId,
  rejectNote,
  onRejectNote,
  onStartReject,
  onCancelReject,
  onApprove,
  onReject,
  onWithdraw,
}: RequestRowProps) {
  return (
    <div className="card space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          {isManager && (
            <p className="text-sm font-medium text-ink">{req.profiles.full_name}</p>
          )}
          <TimeRange startAt={req.shifts.start_at} endAt={req.shifts.end_at} />
          <KioskLabel cityName={req.shifts.kiosks.city_name} />
          <p className="text-xs text-ink-faint">{formatRelative(req.requested_at)}</p>
          {req.decision_note && (
            <p className="text-xs text-ink-muted">Note: {req.decision_note}</p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <RequestStatusBadge status={req.status} />
          <Link
            href={`/shifts/${req.shift_id}`}
            className="text-xs text-brand-400 hover:text-brand-300"
          >
            View shift →
          </Link>
        </div>
      </div>

      {/* Manager actions for pending */}
      {isManager && req.status === "pending" && (
        <div className="pt-2 border-t border-surface-border">
          {rejectingId === req.id ? (
            <div className="flex gap-2">
              <input
                value={rejectNote}
                onChange={(e) => onRejectNote(e.target.value)}
                placeholder="Rejection reason (optional)"
                className="input-base text-xs flex-1"
              />
              <button
                onClick={() => onReject(req.id)}
                disabled={mutating}
                className="btn-danger text-xs px-3"
              >
                Reject
              </button>
              <button
                onClick={onCancelReject}
                className="btn-ghost text-xs"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => onApprove(req.id)}
                disabled={mutating}
                className="btn-primary text-xs"
              >
                Approve
              </button>
              <button
                onClick={() => onStartReject(req.id)}
                disabled={mutating}
                className="btn-secondary text-xs"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}

      {/* Employee withdraw */}
      {!isManager && req.status === "pending" && req.employee_id === myId && (
        <div className="pt-2 border-t border-surface-border">
          <button
            onClick={() => onWithdraw(req.id)}
            disabled={mutating}
            className="btn-secondary text-xs"
          >
            Withdraw
          </button>
        </div>
      )}
    </div>
  );
}
