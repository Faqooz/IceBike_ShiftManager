"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ShiftFormValues, Kiosk, ShiftWithKiosk } from "@/types";
import { utcToLocalInput } from "@/lib/utils";

const schema = z
  .object({
    kiosk_id: z.string().min(1, "Please select a kiosk"),
    date: z.string().min(1, "Date is required"),
      start_time: z.string().min(1, "Start time is required"),
      end_time: z.string().min(1, "End time is required"),
    capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
    notes: z.string(),
  })
  .refine((d) => {
    try {
      const start = new Date(`${d.date}T${d.start_time}`);
      const end = new Date(`${d.date}T${d.end_time}`);
      if (!(end > start)) return false;
      // enforce earliest start 08:00 and latest end 20:00
      const [sh, sm] = d.start_time.split(":").map(Number);
      const [eh, em] = d.end_time.split(":").map(Number);
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      const earliest = 8 * 60; // 08:00
      const latest = 20 * 60; // 20:00
      return startMinutes >= earliest && endMinutes <= latest;
    } catch (e) {
      return false;
    }
  }, {
    message: "Times must be within 08:00–20:00 and end after start",
    path: ["end_time"],
  });

interface ShiftFormProps {
  kiosks: Kiosk[];
  defaultKioskId?: string;
  existing?: ShiftWithKiosk;
  onSubmit: (values: ShiftFormValues) => Promise<void>;
  submitLabel?: string;
  disabled?: boolean;
}

export function ShiftForm({
  kiosks,
  defaultKioskId,
  existing,
  onSubmit,
  submitLabel = "Save shift",
  disabled = false,
}: ShiftFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ShiftFormValues>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? {
          kiosk_id: existing.kiosk_id,
          date: existing.start_at.slice(0, 10),
          start_time: utcToLocalInput(existing.start_at).slice(11),
          end_time: utcToLocalInput(existing.end_at).slice(11),
          capacity: existing.capacity,
          notes: existing.notes ?? "",
          recurrence: "none",
          occurrences: 1,
        }
      : {
          kiosk_id: defaultKioskId ?? "",
          date: "",
          start_time: "",
          end_time: "",
          capacity: 1,
          notes: "",
          recurrence: "none",
          occurrences: 1,
        },
  });

  const busy = isSubmitting || disabled;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Kiosk */}
      <div>
        <label className="form-label">Kiosk / City</label>
        <select {...register("kiosk_id")} className="input-base" disabled={busy}>
          <option value="">Select kiosk…</option>
          {kiosks.map((k) => (
            <option key={k.id} value={k.id}>
              {k.city_name}
            </option>
          ))}
        </select>
        {errors.kiosk_id && (
          <p className="form-error">{errors.kiosk_id.message}</p>
        )}
      </div>

      {/* Start / End */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="form-label">Date</label>
          <input type="date" {...register("date")} className="input-base" disabled={busy} />
          {errors.date && <p className="form-error">{errors.date.message}</p>}
        </div>
        <div>
          <label className="form-label">Start</label>
          <select {...register("start_time")} className="input-base" disabled={busy}>
            <option value="">Select time…</option>
            {generateTimeOptions()}
          </select>
          {errors.start_time && <p className="form-error">{errors.start_time.message}</p>}
        </div>
        <div>
          <label className="form-label">End</label>
          <select {...register("end_time")} className="input-base" disabled={busy}>
            <option value="">Select time…</option>
            {generateTimeOptions()}
          </select>
          {errors.end_time && <p className="form-error">{errors.end_time.message}</p>}
        </div>
      </div>

      {/* Recurrence */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="form-label">Recurrence</label>
          <select {...register("recurrence")} className="input-base" disabled={busy}>
            <option value="none">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div>
          <label className="form-label">Occurrences</label>
          <input type="number" min={1} {...register("occurrences")} className="input-base" disabled={busy} />
        </div>
        <div />
      </div>

      {/* Capacity */}
      <div>
        <label className="form-label">Capacity</label>
        <input
          type="number"
          min={1}
          {...register("capacity")}
          className="input-base"
          disabled={busy}
        />
        {errors.capacity && (
          <p className="form-error">{errors.capacity.message}</p>
        )}
        <p className="text-xs text-ink-faint mt-1">
          Note: exactly one assignment is created per shift in v1.
        </p>
      </div>

      {/* Notes */}
      <div>
        <label className="form-label">Notes (optional)</label>
        <textarea
          rows={3}
          {...register("notes")}
          placeholder="Any notes for this shift…"
          className="input-base resize-none"
          disabled={busy}
        />
      </div>

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
            Saving…
          </span>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}

  function generateTimeOptions() {
    const options = [] as JSX.Element[];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const v = `${hh}:${mm}`;
        options.push(
          <option key={v} value={v}>
            {v}
          </option>
        );
      }
    }
    return options;
  }
