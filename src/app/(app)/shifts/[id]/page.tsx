"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth, useIsManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import {
  getShiftById,
  getRequestsForShift,
  getAssignmentForShift,
  getKiosks,
  updateShift,
  publishShift,
  hideShift,
  closeShiftForWeather,
  cancelShift,
  deleteShift,
  requestShift,
  withdrawRequest,
  approveRequest,
  rejectRequest,
} from "@/lib/supabase/queries";
import { localToUtc, extractErrorMessage, formatRelative } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShiftStatusBadge, RequestStatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { ShiftForm } from "@/components/shared/ShiftForm";
import { KioskLabel, TimeRange } from "@/components/shared/KioskLabel";
import type { ShiftWithKiosk, ShiftRequest, ShiftAssignmentWithDetails, Kiosk } from "@/types";

type ConfirmAction =
  | { type: "publish" }
  | { type: "hide" }
  | { type: "weather" }
  | { type: "cancel" }
  | { type: "delete" }
  | { type: "request" }
  | { type: "withdraw"; requestId: string }
  | { type: "approve"; requestId: string }
  | { type: "reject"; requestId: string };

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const isManager = useIsManager();
  const supabase = createClient();

  const [shift, setShift] = useState<ShiftWithKiosk | null>(null);
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [assignment, setAssignment] = useState<ShiftAssignmentWithDetails | null>(null);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r, a, k] = await Promise.all([
        getShiftById(supabase, id),
        getRequestsForShift(supabase, id),
        getAssignmentForShift(supabase, id),
        isManager ? getKiosks(supabase) : Promise.resolve([]),
      ]);
      if (!s) { setError("Shift not found"); return; }
      setShift(s);
      setRequests(r);
      setAssignment(a);
      setKiosks(k);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id, isManager]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  async function handleEdit(values: import("@/types").ShiftFormValues) {
    if (!shift) return;
    setMutationError(null);
    try {
      const startLocal = `${values.date}T${values.start_time}`;
      const endLocal = `${values.date}T${values.end_time}`;
      await updateShift(
        supabase,
        shift.id,
        values.kiosk_id,
        localToUtc(startLocal),
        localToUtc(endLocal),
        values.capacity,
        values.notes
      );
      setEditMode(false);
      await load();
    } catch (e) {
      setMutationError(extractErrorMessage(e));
    }
  }

  async function executeAction(action: ConfirmAction) {
    setMutationError(null);
    setMutating(true);
    try {
      switch (action.type) {
        case "publish":
          await publishShift(supabase, id);
          break;
        case "hide":
          await hideShift(supabase, id);
          break;
        case "weather":
          await closeShiftForWeather(supabase, id);
          break;
        case "cancel":
          await cancelShift(supabase, id);
          break;
        case "delete":
          await deleteShift(supabase, id);
          router.push("/shifts");
          return;
        case "request":
          await requestShift(supabase, id);
          break;
        case "withdraw":
          await withdrawRequest(supabase, action.requestId);
          break;
        case "approve":
          await approveRequest(supabase, action.requestId);
          break;
        case "reject":
          await rejectRequest(supabase, action.requestId, rejectNote);
          setRejectNote("");
          setRejectingId(null);
          break;
      }
      await load();
    } catch (e) {
      setMutationError(extractErrorMessage(e));
    } finally {
      setMutating(false);
      setConfirm(null);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={load} />;
  if (!shift) return <EmptyState title="Shift not found" />;

  const hasActivity = requests.length > 0 || !!assignment;
  const canEdit = shift.status === "draft" && !hasActivity;
  const editBlocked = shift.status === "draft" && hasActivity;

  // Employee: my request for this shift
  const myRequest = profile
    ? requests.find((r) => r.employee_id === profile.id)
    : null;
  const canRequest =
    !isManager &&
    shift.status === "published" &&
    !myRequest;
  const canWithdraw =
    !isManager && myRequest?.status === "pending";

  const confirmMessages: Record<string, { title: string; message: string; dangerous?: boolean }> = {
    publish: {
      title: "Publish shift?",
      message: "This will make the shift visible to employees at this kiosk.",
    },
    hide: {
      title: "Hide shift?",
      message: "This will hide the shift from employees and cancel any active requests and assignments.",
      dangerous: true,
    },
    weather: {
      title: "Close for weather?",
      message: "This will mark the shift as weather-closed and cancel any active requests and assignments.",
      dangerous: true,
    },
    cancel: {
      title: "Cancel shift?",
      message: "This will permanently cancel the shift and remove any active requests and assignments.",
      dangerous: true,
    },
    delete: {
      title: "Delete shift?",
      message: "This will permanently delete the shift from the system.",
      dangerous: true,
    },
    request: {
      title: "Request this shift?",
      message: "Send a request to your manager for this shift.",
    },
    withdraw: {
      title: "Withdraw request?",
      message: "Are you sure you want to withdraw your request for this shift?",
      dangerous: true,
    },
    approve: {
      title: "Approve request?",
      message: "This will create an assignment for this employee. Only one assignment can exist per shift.",
    },
    reject: {
      title: "Reject request?",
      message: "The employee will be notified that their request was rejected.",
      dangerous: true,
    },
  };

  const confirmInfo = confirm
    ? confirmMessages[confirm.type] ?? { title: "Confirm", message: "Are you sure?" }
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <button onClick={() => router.back()} className="btn-ghost mt-0.5">
          ← Back
        </button>
      </div>

      <PageHeader
        title="Shift detail"
        subtitle={shift.kiosks.city_name}
      />

      {mutationError && <InlineAlert message={mutationError} />}

      {/* Shift info card */}
      <div className="card space-y-3">
        <div className="flex items-start justify-between gap-2">
          <TimeRange startAt={shift.start_at} endAt={shift.end_at} />
          <ShiftStatusBadge status={shift.status} />
        </div>
        <KioskLabel cityName={shift.kiosks.city_name} />
        <div className="flex items-center gap-4 text-xs text-ink-faint">
          <span>Capacity: {shift.capacity}</span>
          {shift.published_at && (
            <span>Published {formatRelative(shift.published_at)}</span>
          )}
        </div>
        {shift.notes && (
          <p className="text-sm text-ink-muted border-t border-surface-border pt-3">
            {shift.notes}
          </p>
        )}
      </div>

      {/* Assignment */}
      {assignment && (
        <div className="card border-emerald-500/20 bg-emerald-500/5">
          <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider mb-1">
            Assigned
          </p>
          <p className="text-sm text-ink">{assignment.profiles.full_name}</p>
        </div>
      )}

      {/* Manager actions */}
      {isManager && (
        <div className="space-y-3">
          {/* Status actions */}
          <div className="card space-y-3">
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">
              Actions
            </p>
            <div className="flex flex-wrap gap-2">
              {shift.status === "draft" && (
                <button
                  onClick={() => setConfirm({ type: "publish" })}
                  disabled={mutating}
                  className="btn-primary"
                >
                  Publish
                </button>
              )}
              {shift.status === "published" && (
                <>
                  <button
                    onClick={() => setConfirm({ type: "hide" })}
                    disabled={mutating}
                    className="btn-secondary"
                  >
                    Hide
                  </button>
                  <button
                    onClick={() => setConfirm({ type: "weather" })}
                    disabled={mutating}
                    className="btn-secondary"
                  >
                    Close for weather
                  </button>
                  <button
                    onClick={() => setConfirm({ type: "cancel" })}
                    disabled={mutating}
                    className="btn-danger"
                  >
                    Cancel shift
                  </button>
                </>
              )}
              <button
                onClick={() => setConfirm({ type: "delete" })}
                disabled={mutating}
                className="btn-danger"
              >
                Delete shift
              </button>
              {(shift.status === "hidden") && (
                <button
                  onClick={() => setConfirm({ type: "cancel" })}
                  disabled={mutating}
                  className="btn-danger"
                >
                  Cancel shift
                </button>
              )}
            </div>
          </div>

          {/* Edit form */}
          {shift.status === "draft" && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">
                  Edit draft
                </p>
                {!editBlocked && (
                  <button
                    onClick={() => setEditMode((v) => !v)}
                    className="btn-ghost text-xs"
                  >
                    {editMode ? "Cancel" : "Edit"}
                  </button>
                )}
              </div>

              {editBlocked && (
                <InlineAlert
                  type="warning"
                  message="This shift has requests or an assignment — editing is blocked."
                />
              )}

              {editMode && canEdit && (
                <>
                  {mutationError && <InlineAlert message={mutationError} />}
                  <ShiftForm
                    kiosks={kiosks}
                    existing={shift}
                    onSubmit={handleEdit}
                    submitLabel="Save changes"
                  />
                </>
              )}

              {!editMode && !editBlocked && (
                <p className="text-xs text-ink-faint">
                  Click Edit to modify this draft shift.
                </p>
              )}
            </div>
          )}

          {/* Requests list */}
          <div className="card">
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-3">
              Requests ({requests.length})
            </p>
            {requests.length === 0 ? (
              <p className="text-sm text-ink-faint">No requests yet.</p>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-3 py-2 border-b border-surface-border last:border-0"
                  >
                    <div>
                      <p className="text-sm text-ink">{req.employee_id}</p>
                      <p className="text-xs text-ink-faint">
                        {formatRelative(req.requested_at)}
                      </p>
                      {req.decision_note && (
                        <p className="text-xs text-ink-muted mt-0.5">
                          Note: {req.decision_note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <RequestStatusBadge status={req.status} />
                      {req.status === "pending" && !assignment && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setConfirm({ type: "approve", requestId: req.id })}
                            disabled={mutating}
                            className="btn-primary text-xs px-2 py-1"
                          >
                            Approve
                          </button>
                          {rejectingId === req.id ? (
                            <div className="flex gap-1">
                              <input
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                placeholder="Reason (optional)"
                                className="input-base text-xs px-2 py-1 w-32"
                              />
                              <button
                                onClick={() => setConfirm({ type: "reject", requestId: req.id })}
                                disabled={mutating}
                                className="btn-danger text-xs px-2 py-1"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => { setRejectingId(null); setRejectNote(""); }}
                                className="btn-ghost text-xs"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRejectingId(req.id)}
                              disabled={mutating}
                              className="btn-secondary text-xs px-2 py-1"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      )}
                      {req.status === "pending" && !!assignment && (
                        <span className="text-xs text-ink-faint">Shift filled</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employee actions */}
      {!isManager && (
        <div className="card space-y-3">
          {myRequest ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink">Your request</p>
                <RequestStatusBadge status={myRequest.status} />
              </div>
              <p className="text-xs text-ink-faint">
                Requested {formatRelative(myRequest.requested_at)}
              </p>
              {myRequest.decision_note && (
                <p className="text-xs text-ink-muted">
                  Manager note: {myRequest.decision_note}
                </p>
              )}
              {canWithdraw && (
                <button
                  onClick={() => setConfirm({ type: "withdraw", requestId: myRequest.id })}
                  disabled={mutating}
                  className="btn-secondary w-full"
                >
                  Withdraw request
                </button>
              )}
            </div>
          ) : canRequest ? (
            <button
              onClick={() => setConfirm({ type: "request" })}
              disabled={mutating}
              className="btn-primary w-full"
            >
              Request this shift
            </button>
          ) : shift.status !== "published" ? (
            <p className="text-sm text-ink-muted text-center py-2">
              This shift is not available.
            </p>
          ) : (
            <p className="text-sm text-ink-muted text-center py-2">
              You cannot request this shift.
            </p>
          )}
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && confirmInfo && (
        <ConfirmDialog
          open={true}
          title={confirmInfo.title}
          message={confirmInfo.message}
          dangerous={confirmInfo.dangerous}
          loading={mutating}
          confirmLabel={confirm.type === "approve" ? "Approve" : confirm.type === "reject" ? "Reject" : "Confirm"}
          onConfirm={() => executeAction(confirm)}
          onCancel={() => { setConfirm(null); }}
        />
      )}
    </div>
  );
}
