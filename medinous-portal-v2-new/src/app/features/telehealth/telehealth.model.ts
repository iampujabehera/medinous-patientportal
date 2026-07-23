// =====================================================================
// TELEHEALTH — DOMAIN MODELS
//
// The Telehealth module is the patient-facing access point for remote
// hospital care: video consultations, selected home-care services and
// home laboratory sample collection. Everything the patient books here
// becomes an "active care" item that can be prepared for, tracked and
// followed up — always connected back to the hospital record.
//
// No backend yet — all data is client-side mock + localStorage. See
// TelehealthService for the mock catalogues and state store.
// =====================================================================

/** The three kinds of remote care the MVP supports. */
export type TelehealthServiceType =
  | 'video_consult'      // scheduled or instant video consultation
  | 'home_care'          // nurse / physio / wound / injection / vaccination
  | 'lab_collection';    // home blood / sample collection

/** Which home-care service (sub-type of home_care). */
export type HomeCareServiceKey =
  | 'nurse_visit'
  | 'physiotherapy'
  | 'wound_dressing'
  | 'medication_admin'
  | 'vaccination';

/**
 * Lifecycle status shared across every telehealth service. Not every
 * status applies to every type (a video consult never has a
 * "provider_on_the_way"), but keeping one union keeps the Active Care
 * and tracking screens simple.
 */
export type CareStatus =
  | 'request_received'
  | 'confirming'
  | 'confirmed'
  | 'provider_assigning'
  | 'provider_assigned'
  | 'provider_on_the_way'
  | 'provider_arrived'
  | 'in_progress'
  | 'ready_to_join'      // video: join window is open
  | 'completed'
  | 'cancelled'
  | 'payment_failed';

/** High-level bucket used by the Active Care tabs. */
export type CareBucket = 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

export type SupportedTeleLang = 'English' | 'Arabic' | 'Hindi' | 'Malayalam' | 'Tamil' | 'Urdu';

// ---------------------------------------------------------------------
// Catalogue: instant-consult specialties
// ---------------------------------------------------------------------
export interface ConsultSpecialty {
  key: string;
  name: string;
  icon: string;         // Material Symbols name
  color: string;        // icon tile background
  blurb: string;        // one-line plain-language description
  fee: number;          // consultation fee (AED)
}

// ---------------------------------------------------------------------
// Catalogue: home-care services
// ---------------------------------------------------------------------
export interface HomeCareService {
  key: HomeCareServiceKey;
  name: string;
  icon: string;
  color: string;
  description: string;          // plain-language
  startingPrice: number;        // AED
  duration: string;             // typical duration, e.g. "30–45 min"
  earliestSlot: string;         // e.g. "Available today"
  prescriptionRule: 'required' | 'recommended' | 'not_required';
  prescriptionNote: string;     // human phrasing shown on the card
  preparation: PreparationItem[];
  /** Service-specific intake questions (rendered in the booking form). */
  intake: IntakeField[];
}

export interface IntakeField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'choice' | 'date' | 'toggle' | 'upload';
  options?: string[];
  optional?: boolean;
  placeholder?: string;
}

// ---------------------------------------------------------------------
// Catalogue: lab tests + packages
// ---------------------------------------------------------------------
export interface LabTest {
  code: string;
  name: string;
  price: number;                // AED
  turnaround: string;           // report time, e.g. "Same day"
  fasting: boolean;
  fastingNote?: string;
  /** True when this test was ordered by a hospital doctor for this patient. */
  doctorRecommended?: boolean;
  recommendedBy?: string;       // doctor name for the "Recommended by" label
  category: 'blood' | 'metabolic' | 'cardiac' | 'hormone' | 'vitamin' | 'organ';
}

export interface HealthPackage {
  code: string;
  name: string;
  blurb: string;
  price: number;                // AED (bundled)
  testCodes: string[];
  fasting: boolean;
}

// ---------------------------------------------------------------------
// Preparation
// ---------------------------------------------------------------------
export interface PreparationItem {
  id: string;
  text: string;
  done?: boolean;               // patient can tick these off
}

// ---------------------------------------------------------------------
// Provider (hospital-authorised)
// ---------------------------------------------------------------------
export interface TeleProvider {
  name: string;
  role: string;                 // "Phlebotomist", "Registered Nurse", "Physiotherapist"
  specialty?: string;           // for doctors
  experienceYears?: number;
  languages?: SupportedTeleLang[];
  verified: true;               // always hospital-verified in this module
  initials: string;
  arrivalWindow?: string;       // for home services on-the-way
}

// ---------------------------------------------------------------------
// Address
// ---------------------------------------------------------------------
export interface ServiceAddress {
  id: string;
  label: string;                // "Home", "Office"
  line1: string;
  area: string;
  city: string;
  landmark?: string;
  building?: string;
  entryNote?: string;
  inServiceArea: boolean;
}

// ---------------------------------------------------------------------
// Slot (arrival window for home services / minute-level for video)
// ---------------------------------------------------------------------
export interface CareSlot {
  id: string;
  date: string;                 // ISO date
  window: string;               // "8:00–10:00 AM" or "4:00 PM"
  earliest?: boolean;
}

// ---------------------------------------------------------------------
// Timeline step (tracking)
// ---------------------------------------------------------------------
export interface TrackStep {
  key: CareStatus;
  label: string;
  patientNote?: string;         // "Please fast for 8–10 hours…"
  state: 'done' | 'current' | 'upcoming';
  at?: string;                  // timestamp label when reached
}

// ---------------------------------------------------------------------
// Price breakdown
// ---------------------------------------------------------------------
export interface PriceLine {
  label: string;
  amount: number;               // AED; can be negative for discount
}

// ---------------------------------------------------------------------
// Doctor recommendation (hospital-connected — becomes a direct action)
// ---------------------------------------------------------------------
export interface CareRecommendation {
  id: string;
  kind: 'lab_test' | 'home_service' | 'followup' | 'report_ready';
  title: string;                // "Dr. Ahmed recommended an HbA1c test"
  detail: string;
  doctorName: string;
  action: string;               // CTA label
  /** How to fulfil the recommendation. */
  target: 'lab_tests' | 'home_care' | 'video_consult' | 'records';
  /** Test codes / service key pre-loaded into the target flow. */
  payloadTestCodes?: string[];
  payloadServiceKey?: HomeCareServiceKey;
}

// ---------------------------------------------------------------------
// The central record: one booked / active telehealth care item
// ---------------------------------------------------------------------
export interface CareItem {
  id: string;
  type: TelehealthServiceType;
  homeCareKey?: HomeCareServiceKey;
  title: string;                // "Home Blood Sample Collection"
  subtitle?: string;            // specialty / service description
  patientId: string;
  patientName: string;
  status: CareStatus;
  bucket: CareBucket;
  /** When the service is scheduled (ISO date). */
  date: string;
  /** Human time / arrival window. */
  timeLabel: string;
  provider?: TeleProvider;
  address?: ServiceAddress;
  fee: number;                  // total charged (AED)
  paymentState: 'paid' | 'pending' | 'failed' | 'pay_at_service';
  priceLines?: PriceLine[];
  preparation?: PreparationItem[];
  /** Test codes for a lab collection. */
  testCodes?: string[];
  /** Free-text concern / reason. */
  concern?: string;
  language?: SupportedTeleLang;
  bookingRef: string;
  createdAt: string;            // ISO
  /** Outcome payload once a video consult completes. */
  outcome?: CareOutcome;
  /** Doctor recommendations produced by this care item (continuity). */
  producedRecommendationIds?: string[];
}

export interface CareOutcome {
  summary: string;
  advice: string[];
  prescriptionIssued: boolean;
  prescriptionItems?: { name: string; dosage: string; frequency: string; duration: string }[];
  testsOrdered?: string[];      // test codes
  homeServicesRecommended?: HomeCareServiceKey[];
  followUpInDays?: number;
}

// ---------------------------------------------------------------------
// Draft state for the multi-step instant-consult / booking wizards
// (persisted so a refresh mid-flow doesn't lose the patient's work).
// ---------------------------------------------------------------------
export interface ConsultDraft {
  specialtyKey?: string;
  concernText?: string;
  language?: SupportedTeleLang;
  problem?: string;
  duration?: string;
  trend?: 'better' | 'unchanged' | 'worse';
  uploadedNames?: string[];
  patientId?: string;
}
