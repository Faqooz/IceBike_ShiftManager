"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useIsManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { createShift, getKiosks } from "@/lib/supabase/queries";
import { localToUtc, extractErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { ShiftForm } from "@/components/shared/ShiftForm";
import type { ShiftFormValues, Kiosk } from "@/types";

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function NewShiftPage() {
  const isManager = useIsManager();
  const router = useRouter();
  const supabase = createClient();

  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loadingKiosks, setLoadingKiosks] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    getKiosks(supabase)
      .then(setKiosks)
      .catch((e) => setLoadError(extractErrorMessage(e)))
      .finally(() => setLoadingKiosks(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isManager) {
    return (
      <ErrorState
        title="Access denied"
        message="Only managers can create shifts."
      />
    );
  }

  if (loadingKiosks) return <LoadingState />;
  if (loadError) return <ErrorState message={loadError} />;

  async function handleSubmit(values: ShiftFormValues) {
    setSubmitError(null);
    try {
      let firstShift: any = null;
      const occurrences = Math.max(1, values.occurrences ?? 1);
      const step = values.recurrence === "weekly" ? 7 : 1;

      for (let i = 0; i < occurrences; i++) {
        const day = addDays(values.date, i * step);
        const startLocal = `${day}T${values.start_time}`;
        const endLocal = `${day}T${values.end_time}`;
        const shift = await createShift(
          supabase,
          values.kiosk_id,
          localToUtc(startLocal),
          localToUtc(endLocal),
          values.capacity,
          values.notes
        );
        if (!firstShift) firstShift = shift;
      }

      if (firstShift) router.push(`/shifts/${firstShift.id}`);
    } catch (e) {
      setSubmitError(extractErrorMessage(e));
    }
  }

  return (
    <div>
      <PageHeader
        title="New shift"
        subtitle="Create a draft shift"
      />
      {submitError && (
        <div className="mb-4">
          <InlineAlert message={submitError} />
        </div>
      )}
      <div className="card">
        <ShiftForm
          kiosks={kiosks}
          onSubmit={handleSubmit}
          submitLabel="Create draft shift"
        />
      </div>
    </div>
  );
}