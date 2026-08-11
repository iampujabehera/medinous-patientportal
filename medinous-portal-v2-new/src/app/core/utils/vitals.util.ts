import { VitalSign } from '../models/patient.model';

// =============================================================================
// VITALS — shared helpers
// -----------------------------------------------------------------------------
// Extracted so the My Health snapshot, the dashboard, and the reusable
// record-vitals form all derive icons, labels, status bands and the
// self-reported → VitalSign conversion the same way. Demo heuristics using
// standard adult reference ranges — not a clinical engine.
// =============================================================================

export type VitalStatus = VitalSign['status'];

/** Derive a status band from the value so the trend chip matches the number. */
export function deriveVitalStatus(type: VitalSign['type'], value: string, unit: string): VitalStatus {
  if (type === 'blood_pressure') {
    const [s, d] = value.split('/').map(n => parseInt(n, 10));
    if (s >= 180 || d >= 120) return 'critical';
    if (s >= 140 || d >= 90) return 'warning';
    return 'normal';
  }
  const n = parseFloat(value);
  if (Number.isNaN(n)) return 'normal';
  switch (type) {
    case 'heart_rate':
      if (n < 50 || n > 120) return 'critical';
      if (n < 60 || n > 100) return 'warning';
      return 'normal';
    case 'oxygen':
      if (n < 90) return 'critical';
      if (n < 95) return 'warning';
      return 'normal';
    case 'glucose':
      if (n >= 200 || n < 54) return 'critical';
      if (n >= 140 || n < 70) return 'warning';
      return 'normal';
    case 'temperature': {
      const f = unit.includes('C') ? (n * 9) / 5 + 32 : n;
      if (f >= 103) return 'critical';
      if (f >= 100.4) return 'warning';
      return 'normal';
    }
    default:
      return 'normal'; // weight has no universal band
  }
}

export function getVitalIcon(type: VitalSign['type']): string {
  const m: Record<string, string> = {
    blood_pressure: 'speed', heart_rate: 'favorite', temperature: 'thermostat',
    oxygen: 'air', weight: 'monitor_weight', glucose: 'water_drop'
  };
  return m[type] ?? 'info';
}

export function getVitalLabel(type: VitalSign['type']): string {
  const m: Record<string, string> = {
    blood_pressure: 'Blood Pressure', heart_rate: 'Heart Rate',
    temperature: 'Temperature', oxygen: 'SpO₂', weight: 'Weight', glucose: 'Glucose'
  };
  return m[type] ?? type;
}

export function trendIcon(status: VitalStatus): string {
  if (status === 'normal') return 'trending_flat';
  if (status === 'warning') return 'trending_up';
  return 'priority_high';
}

export function trendLabel(status: VitalStatus): string {
  if (status === 'normal') return 'Stable';
  if (status === 'warning') return 'Watch';
  return 'Action';
}

// ---- Self-reported readings form -------------------------------------------

/** Raw values captured by the record-vitals form (all optional). */
export interface VitalReadings {
  bp: string;        // "136/86"
  glucose: string;   // "140"
  glucoseType: string; // "Fasting" | "Post-meal" | "Random"
  temp: string;      // "37"  (°C)
  weight: string;    // "59"  (kg)
  when: string;      // "Today" | "Yesterday" | "This week"
}

export const EMPTY_READINGS: VitalReadings = {
  bp: '', glucose: '', glucoseType: 'Fasting', temp: '', weight: '', when: 'Today'
};

export const GLUCOSE_TYPES = ['Fasting', 'Post-meal', 'Random'];
export const WHEN_OPTIONS = ['Today', 'Yesterday', 'This week'];

/** True when the patient has entered at least one measurement. */
export function hasAnyReading(r: VitalReadings): boolean {
  return !!(r.bp || r.glucose || r.temp || r.weight);
}

/**
 * Convert the form readings into source='self' VitalSign entries, one per
 * filled field. `when` is mapped to a plausible timestamp so the "Self · date"
 * chip reads sensibly. `now` is passed in (component context) to keep this pure.
 */
export function readingsToVitals(r: VitalReadings, now: Date): VitalSign[] {
  const ts = whenToTimestamp(r.when, now);
  const out: VitalSign[] = [];
  const add = (type: VitalSign['type'], value: string, unit: string, context?: string) => {
    if (!value.trim()) return;
    out.push({
      type, value: value.trim(), unit, timestamp: ts,
      status: deriveVitalStatus(type, value.trim(), unit),
      source: 'self', context
    });
  };
  add('blood_pressure', r.bp, 'mmHg');
  add('glucose', r.glucose, 'mg/dL', r.glucoseType);
  add('temperature', r.temp, '°C');
  add('weight', r.weight, 'kg');
  return out;
}

function whenToTimestamp(when: string, now: Date): string {
  const d = new Date(now);
  if (when === 'Yesterday') d.setDate(d.getDate() - 1);
  else if (when === 'This week') d.setDate(d.getDate() - 3);
  return d.toISOString();
}

/** "Self · 10 Aug" / "Clinic · 9 Apr" chip text for a vital. */
export function sourceChipLabel(vital: VitalSign): string {
  const who = vital.source === 'self' ? 'Self' : 'Clinic';
  const d = new Date(vital.timestamp);
  const date = Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return date ? `${who} · ${date}` : who;
}
