// ─────────────────────────────────────────────────────────────
// OutletTimingsModal.tsx
// Drop this file next to AdminDashboardPage.tsx and import it.
//
// Usage inside AdminDashboardPage:
//   {timingsModalOutlet && (
//     <OutletTimingsModal
//       outlet={timingsModalOutlet}
//       onClose={() => setTimingsModalOutlet(null)}
//     />
//   )}
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import {
  apiGetOutletTimings,
  apiSaveOutletTimings,
  apiToggleOutletDay,
  apiCopyTimingsToAllDays,
  OutletDaySchedule,
  OutletTimeSlot,
} from "../services/apiService";

// ── tiny spinner ──────────────────────────────────────────────
const Spinner: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ── types ─────────────────────────────────────────────────────
interface Props {
  outlet: { id: string; name?: string; address?: string };
  onClose: () => void;
}

// Local editable slot
interface EditSlot {
  open_time: string;
  close_time: string;
}

// Local editable day
interface EditDay {
  day_of_week: number;
  day_name: string;
  is_closed: boolean;
  slots: EditSlot[];
}

const DEFAULT_SLOT: EditSlot = { open_time: "11:00", close_time: "23:00" };

// ✅ Postgres TIME columns return "HH:MM:SS" — strip seconds before binding to <input type="time">
const toHHMM = (t: string) => (t || "").slice(0, 5);

// ── component ─────────────────────────────────────────────────
const OutletTimingsModal: React.FC<Props> = ({ outlet, onClose }) => {
  const [schedule, setSchedule] = useState<EditDay[]>([]);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [nextOpen, setNextOpen] = useState<{ day: string; time: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingDay, setTogglingDay] = useState<number | null>(null);
  const [copying, setCopying] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── fetch ─────────────────────────────────────────────────
  const fetchTimings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetOutletTimings(outlet.id);
      setIsOpen(data.is_open);
      setNextOpen(data.next_open);
      // Map API response into local editable state
      setSchedule(
        data.schedule.map((day) => ({
          day_of_week: day.day_of_week,
          day_name: day.day_name,
          is_closed: day.is_closed,
          slots:
            day.slots.length > 0 && !day.is_closed
              ? day.slots.map((s) => ({ open_time: toHHMM(s.open_time), close_time: toHHMM(s.close_time) }))
              : [{ ...DEFAULT_SLOT }],
        }))
      );
    } catch (e) {
      setError("Failed to load timings");
    } finally {
      setLoading(false);
    }
  }, [outlet.id]);

  useEffect(() => { fetchTimings(); }, [fetchTimings]);

  // ── helpers ───────────────────────────────────────────────
  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const updateDay = (dayIndex: number, changes: Partial<EditDay>) => {
    setSchedule((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, ...changes } : d))
    );
  };

  const updateSlot = (dayIndex: number, slotIndex: number, changes: Partial<EditSlot>) => {
    setSchedule((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, slots: d.slots.map((s, si) => (si === slotIndex ? { ...s, ...changes } : s)) }
          : d
      )
    );
  };

  const addSlot = (dayIndex: number) => {
    setSchedule((prev) =>
      prev.map((d, i) =>
        i === dayIndex ? { ...d, slots: [...d.slots, { ...DEFAULT_SLOT }] } : d
      )
    );
  };

  const removeSlot = (dayIndex: number, slotIndex: number) => {
    setSchedule((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, slots: d.slots.filter((_, si) => si !== slotIndex) }
          : d
      )
    );
  };

  // ── toggle day closed instantly ───────────────────────────
  const handleToggleDay = async (dayIndex: number) => {
    const day = schedule[dayIndex];
    const newClosed = !day.is_closed;
    setTogglingDay(day.day_of_week);
    try {
      await apiToggleOutletDay(outlet.id, day.day_of_week, newClosed);
      updateDay(dayIndex, { is_closed: newClosed });
      flash(`${day.day_name} marked as ${newClosed ? "closed" : "open"}`);
    } catch {
      setError("Toggle failed");
    } finally {
      setTogglingDay(null);
    }
  };

  // ── copy to all days ──────────────────────────────────────
  const handleCopyToAll = async (dayIndex: number) => {
    const day = schedule[dayIndex];
    if (!window.confirm(`Copy ${day.day_name}'s hours to ALL 7 days?`)) return;
    setCopying(day.day_of_week);
    try {
      await apiCopyTimingsToAllDays(outlet.id, day.day_of_week);
      await fetchTimings();
      flash(`${day.day_name}'s timings copied to all days`);
    } catch {
      setError("Copy failed");
    } finally {
      setCopying(null);
    }
  };

  // ── save all ──────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = schedule.map((day) => ({
        day_of_week: day.day_of_week,
        is_closed: day.is_closed,
        slots: day.is_closed ? [] : day.slots,
      }));
      const res = await apiSaveOutletTimings(outlet.id, payload);
      if (res.error) throw new Error(res.message || "Save failed");
      await fetchTimings();
      flash("Timings saved successfully ✓");
    } catch (e: any) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ── render ────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-10 rounded-t-xl">
          <div>
            <h2 className="text-lg font-semibold text-white">Outlet Timings</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {outlet.name || "Outlet"}{outlet.address ? ` · ${outlet.address}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* live status badge */}
            {isOpen !== null && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                isOpen ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
              }`}>
                {isOpen ? "● Open Now" : nextOpen ? `Opens ${nextOpen.day} ${nextOpen.time}` : "● Closed"}
              </span>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
          </div>
        </div>

        {/* ── body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner className="w-8 h-8" /></div>
          ) : (
            schedule.map((day, dayIndex) => (
              <DayRow
                key={day.day_of_week}
                day={day}
                dayIndex={dayIndex}
                togglingDay={togglingDay}
                copying={copying}
                onToggle={() => handleToggleDay(dayIndex)}
                onCopyToAll={() => handleCopyToAll(dayIndex)}
                onAddSlot={() => addSlot(dayIndex)}
                onRemoveSlot={(si) => removeSlot(dayIndex, si)}
                onUpdateSlot={(si, changes) => updateSlot(dayIndex, si, changes)}
              />
            ))
          )}
        </div>

        {/* ── footer ── */}
        <div className="px-6 py-4 border-t border-gray-700 sticky bottom-0 bg-gray-900 rounded-b-xl">
          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          {successMsg && <p className="text-green-400 text-sm mb-2">{successMsg}</p>}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2 text-sm rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Spinner className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Timings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── DayRow sub-component ──────────────────────────────────────
interface DayRowProps {
  day: EditDay;
  dayIndex: number;
  togglingDay: number | null;
  copying: number | null;
  onToggle: () => void;
  onCopyToAll: () => void;
  onAddSlot: () => void;
  onRemoveSlot: (slotIndex: number) => void;
  onUpdateSlot: (slotIndex: number, changes: Partial<EditSlot>) => void;
}

const DayRow: React.FC<DayRowProps> = ({
  day, dayIndex, togglingDay, copying,
  onToggle, onCopyToAll, onAddSlot, onRemoveSlot, onUpdateSlot,
}) => {
  const isToday = new Date().getDay() === day.day_of_week;
  const isToggling = togglingDay === day.day_of_week;
  const isCopying = copying === day.day_of_week;

  return (
    <div className={`rounded-lg border ${day.is_closed ? "border-gray-700 bg-gray-800/40" : "border-gray-600 bg-gray-800"}`}>
      {/* day header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${day.is_closed ? "text-gray-500" : "text-white"}`}>
            {day.day_name}
          </span>
          {isToday && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-900 text-cyan-300">TODAY</span>
          )}
          {day.is_closed && (
            <span className="text-xs text-gray-500 italic">Closed</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Copy to all */}
          {!day.is_closed && (
            <button
              onClick={onCopyToAll}
              disabled={isCopying}
              className="text-xs text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
              title="Copy this day's slots to all days"
            >
              {isCopying ? "Copying..." : "⧉ Copy to all"}
            </button>
          )}

          {/* Toggle closed */}
          <button
            onClick={onToggle}
            disabled={isToggling}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              day.is_closed ? "bg-gray-600" : "bg-cyan-600"
            } ${isToggling ? "opacity-50" : ""}`}
            title={day.is_closed ? "Mark as open" : "Mark as closed"}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              day.is_closed ? "translate-x-1" : "translate-x-6"
            }`} />
          </button>
        </div>
      </div>

      {/* slots — only when open */}
      {!day.is_closed && (
        <div className="px-4 pb-3 space-y-2 border-t border-gray-700 pt-3">
          {day.slots.map((slot, slotIndex) => (
            <SlotRow
              key={slotIndex}
              slot={slot}
              canDelete={day.slots.length > 1}
              onDelete={() => onRemoveSlot(slotIndex)}
              onChange={(changes) => onUpdateSlot(slotIndex, changes)}
            />
          ))}

          <button
            onClick={onAddSlot}
            className="mt-1 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            + Add slot
          </button>
        </div>
      )}
    </div>
  );
};

// ── SlotRow sub-component ─────────────────────────────────────
interface SlotRowProps {
  slot: EditSlot;
  canDelete: boolean;
  onDelete: () => void;
  onChange: (changes: Partial<EditSlot>) => void;
}

const SlotRow: React.FC<SlotRowProps> = ({ slot, canDelete, onDelete, onChange }) => {
  const isValid = slot.open_time && slot.close_time && slot.open_time !== slot.close_time;

  return (
    <div className="flex items-center gap-2">
      {/* open time */}
      <div className="flex-1">
        <input
          type="time"
          value={slot.open_time}
          onChange={(e) => onChange({ open_time: e.target.value })}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>

      <span className="text-gray-500 text-sm shrink-0">to</span>

      {/* close time */}
      <div className="flex-1">
        <input
          type="time"
          value={slot.close_time}
          onChange={(e) => onChange({ close_time: e.target.value })}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>

      {/* validation dot */}
      <span className={`w-2 h-2 rounded-full shrink-0 ${isValid ? "bg-green-500" : "bg-red-500"}`} title={isValid ? "Valid" : "Invalid range"} />

      {/* delete */}
      <button
        onClick={onDelete}
        disabled={!canDelete}
        className="text-gray-600 hover:text-red-400 disabled:opacity-20 shrink-0 transition-colors text-lg leading-none"
        title="Remove slot"
      >
        ✕
      </button>
    </div>
  );
};

export default OutletTimingsModal;