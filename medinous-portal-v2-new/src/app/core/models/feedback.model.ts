// =====================================================================
// PATIENT FEEDBACK — HMIS STORAGE MODEL
//
// Mirrors how the legacy hospital system stores feedback, so anything the
// patient portal captures reconciles 1:1 with the existing "Patient
// FeedBack Report" (Patient ID · Patient Name · OP No. · OP Date · Doctor
// Name · Q ID · Question · Answer).
//
// The legacy report prints ONE ROW PER QUESTION — feedback is not stored
// as a single blob. That drives the classic HMIS header/detail split:
//
//   FEEDBACK_QUESTION_MASTER   → the questions asked (Q ID + text)
//   PATIENT_FEEDBACK           → header: one per submitted form, keyed to
//                                the OUTPATIENT ENCOUNTER (OP No + OP Date)
//   PATIENT_FEEDBACK_DETAIL    → detail: one per (feedback, question, answer)
//
// Keying on the encounter (OP No.) — not just the patient — is what lets
// the hospital attribute a score to a specific doctor, visit and date.
// =====================================================================

/** How an answer is captured; drives normalisation on the way into HMIS. */
export type FeedbackAnswerType = 'scale_5' | 'multi_select' | 'free_text';

/** Where the feedback was collected. Portal rows must stay distinguishable
 *  from kiosk / front-desk rows for reporting. */
export type FeedbackSource = 'patient_portal' | 'kiosk' | 'front_desk';

/**
 * FEEDBACK_QUESTION_MASTER.
 * `questionId` IS the "Q ID" column on the hospital report — keep these
 * aligned with the HMIS master so portal answers merge with legacy data.
 */
export interface FeedbackQuestion {
  questionId: number;
  questionText: string;
  answerType: FeedbackAnswerType;
  sequence: number;
  active: boolean;
}

/**
 * PATIENT_FEEDBACK (header). One row per submitted feedback form.
 * The encounter keys (opNumber + opDate + doctor) are denormalised onto
 * the header because that is what every feedback report filters and
 * groups by.
 */
export interface PatientFeedback {
  feedbackId: string;
  /**
   * 'visit'   → tied to an outpatient encounter (OP No. present).
   * 'general' → hospital-level feedback with NO encounter linkage; the
   *             encounter columns are blank. Still stored — feedback is
   *             never discarded just because it isn't about one visit.
   */
  feedbackType: 'visit' | 'general';
  /** HMS patient identifier — the report's "Patient ID". */
  patientId: string;
  patientName: string;
  /** Outpatient encounter/visit number — the report's "OP No.".
   *  Empty string for general feedback. */
  opNumber: string;
  /** Encounter date (ISO) — the report's "OP Date". For general feedback
   *  this falls back to the submission date so date filters still work. */
  opDate: string;
  doctorId?: string;
  /** Empty string for general feedback. */
  doctorName: string;
  specialty: string;
  /** Absent for general feedback (no consultation to classify). */
  consultationType?: 'in_person' | 'telehealth';
  /** When the patient submitted (distinct from the visit date). */
  submittedAt: string;
  source: FeedbackSource;
  /** 'submitted' locally; 'synced' once HMIS has acknowledged the post. */
  status: 'submitted' | 'synced';
}

/**
 * PATIENT_FEEDBACK_DETAIL. One row per answered question.
 * A multi-select question emits ONE ROW PER SELECTED OPTION — that keeps
 * the data aggregatable ("how many patients said Long wait time?") instead
 * of trapping it in a comma-joined string.
 */
export interface PatientFeedbackAnswer {
  feedbackId: string;
  questionId: number;
  /** Human-readable answer as printed on the report (e.g. "Poor"). */
  answer: string;
  /** Normalised code for analytics (e.g. '1'..'5' on a 5-point scale). */
  answerCode?: string;
}

/**
 * Flattened header ⋈ detail row — exactly the shape the LEGACY Patient
 * Feedback Report prints, one line per question/answer.
 */
export interface FeedbackReportRow {
  patientId: string;
  patientName: string;
  opNumber: string;
  opDate: string;
  doctorName: string;
  questionId: number;
  question: string;
  answer: string;
  source: FeedbackSource;
}

/**
 * FULL detail row — every field the portal now captures, which is a
 * superset of the legacy report's 8 columns. The legacy system only ever
 * stored (patient, OP, doctor, Q ID, question, answer); the portal adds
 * specialty, consultation type, the normalised answer code, the submission
 * timestamp (distinct from the visit date), the capture channel and the
 * HMIS sync status. Reports that need the richer picture read this.
 */
export interface PatientFeedbackDetailRow extends FeedbackReportRow {
  feedbackId: string;
  feedbackType: 'visit' | 'general';
  specialty: string;
  consultationType?: 'in_person' | 'telehealth';
  answerCode?: string;
  submittedAt: string;
  status: 'submitted' | 'synced';
}
