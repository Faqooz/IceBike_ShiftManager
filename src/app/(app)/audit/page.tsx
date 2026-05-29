"use client";

import { useEffect, useState, useCallback } from "react";
import { useIsManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { getAuditLog } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { extractErrorMessage, formatDateTime, formatRelative } from "@/lib/utils";
import type { ShiftAuditLog } from "@/types";

const actionColors: Record<string, string> = {
  create_shift: "text-emerald-400",
  publish_shift: "text-brand-400",
  cancel_shift: "text-red-400",
  hide_shift: "text-yellow-400",
  close_shift_for_weather: "text-sky-400",
  approve_request: "text-emerald-400",
  reject_request: "text-red-400",
  update_shift: "text-ink-muted",
  request_shift: "text-ink-muted",
  withdraw_request: "text-ink-muted",
};

function actionLabel(action: string): string {
  return action.replace(/_/g, " ");
}

export default function AuditPage() {
  const isManager = useIsManager();
  const supabase = createClient();

  const [logs, setLogs] = useState<ShiftAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLog(supabase);
      setLogs(data);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  if (!isManager) {
    return <ErrorState title="Access denied" message="Managers only." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit log"
        subtitle="Last 200 events"
        action={
          <button onClick={load} className="btn-secondary text-sm" disabled={loading}>
            Refresh
          </button>
        }
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={load} />
      ) : logs.length === 0 ? (
        <EmptyState title="No audit events yet" />
      ) : (
        <div className="space-y-1">
          {logs.map((log, i) => (
            <AuditRow key={log.id} log={log} isFirst={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function AuditRow({ log, isFirst }: { log: ShiftAuditLog; isFirst: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const color = actionColors[log.action] ?? "text-ink-muted";

  return (
    <div className={`border-l-2 border-surface-border pl-4 py-2 ${isFirst ? "border-brand-500/50" : ""}`}>
      <div
        className="flex items-start justify-between gap-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="space-y-0.5 min-w-0">
          <span className={`text-sm font-medium capitalize ${color}`}>
            {actionLabel(log.action)}
          </span>
          <div className="flex items-center gap-2 text-xs text-ink-faint">
            <span className="font-mono truncate max-w-[120px]" title={log.actor_id}>
              {log.actor_id.substring(0, 8)}…
            </span>
            {log.shift_id && (
              <span className="font-mono truncate max-w-[100px]" title={log.shift_id}>
                shift {log.shift_id.substring(0, 8)}…
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-ink-faint">{formatRelative(log.created_at)}</p>
          <p className="text-xs text-ink-faint/50">{formatDateTime(log.created_at)}</p>
        </div>
      </div>

      {expanded && log.metadata && (
        <pre className="mt-2 text-xs bg-surface-overlay rounded p-2 text-ink-muted overflow-x-auto">
          {JSON.stringify(log.metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}
