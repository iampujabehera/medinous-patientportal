import { Injectable, signal, computed } from '@angular/core';
import { VitalSign } from '../models/patient.model';
import { VitalReadings, readingsToVitals } from '../utils/vitals.util';

// =============================================================================
// VITALS SERVICE — self-reported readings store
// -----------------------------------------------------------------------------
// Holds the vitals the PATIENT records (source='self') from the record-vitals
// form, wherever it is opened (dashboard, appointment confirmation, video
// consult, My Health). Persisted to localStorage so a reading survives
// navigation and refresh — the demo needs "record here, see it in My Health".
//
// The My Health snapshot merges these over the clinic-measured vitals: for
// each metric, whichever reading is newest wins and carries its own source
// chip. No backend — this is the client-side store standing in for the HMIS
// patient-sourced observation endpoint.
// =============================================================================
@Injectable({ providedIn: 'root' })
export class VitalsService {
  private readonly KEY = 'medinous.selfVitals.v1';

  /** All self-reported vitals, newest first. */
  readonly selfVitals = signal<VitalSign[]>(this.load());

  /** Most recent self-reported reading per metric type. */
  readonly latestSelfByType = computed(() => {
    const map = new Map<VitalSign['type'], VitalSign>();
    for (const v of this.selfVitals()) {
      const cur = map.get(v.type);
      if (!cur || v.timestamp > cur.timestamp) map.set(v.type, v);
    }
    return map;
  });

  /**
   * Record a batch of self-reported readings. Each metric replaces any earlier
   * self reading of the same type (only the latest self value is kept), then
   * the store is re-sorted newest-first and persisted.
   * Returns the VitalSign entries that were saved (for showing a snapshot).
   */
  record(readings: VitalReadings, now: Date = new Date()): VitalSign[] {
    const fresh = readingsToVitals(readings, now);
    if (!fresh.length) return [];
    const freshTypes = new Set(fresh.map(v => v.type));
    this.selfVitals.update(list => {
      const kept = list.filter(v => !freshTypes.has(v.type));
      return [...fresh, ...kept].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    });
    this.persist();
    return fresh;
  }

  /**
   * Overlay self-reported vitals onto a clinic-derived list. For each metric,
   * the newer of {clinic value, latest self value} is returned, so My Health
   * shows the freshest reading with the correct source chip. Clinic entries
   * that lack a source are tagged 'clinic' so the chip renders.
   */
  merge(clinicVitals: VitalSign[]): VitalSign[] {
    const self = this.latestSelfByType();
    return clinicVitals.map(cv => {
      const s = self.get(cv.type);
      const clinic: VitalSign = { ...cv, source: cv.source ?? 'clinic' };
      if (s && s.timestamp > clinic.timestamp) return s;
      return clinic;
    });
  }

  clear(): void {
    this.selfVitals.set([]);
    this.persist();
  }

  // ---- persistence ---------------------------------------------------------
  private load(): VitalSign[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) as VitalSign[] : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.selfVitals()));
    } catch {
      /* storage full / unavailable — demo tolerates loss */
    }
  }
}
