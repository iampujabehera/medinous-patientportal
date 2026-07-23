import { Injectable, computed, signal } from '@angular/core';
import {
  FeedbackQuestion,
  FeedbackReportRow,
  FeedbackSource,
  PatientFeedback,
  PatientFeedbackAnswer,
  PatientFeedbackDetailRow
} from '../models/feedback.model';

// =====================================================================
// FEEDBACK_QUESTION_MASTER
// =====================================================================
// Q IDs are deliberately aligned with the hospital's existing master so
// portal-captured rows sit alongside legacy rows in the same report.
// Q8 ("Overall, how would you rate your experience") is the ID the legacy
// Patient FeedBack Report already prints — we reuse it rather than mint a
// new one, so historical trend reporting stays unbroken.
// =====================================================================
const FEEDBACK_QUESTIONS: FeedbackQuestion[] = [
  { questionId: 8,  questionText: 'Overall, how would you rate your experience', answerType: 'scale_5',     sequence: 1, active: true },
  { questionId: 11, questionText: 'What went well',                              answerType: 'multi_select', sequence: 2, active: true },
  { questionId: 12, questionText: 'What could be better',                        answerType: 'multi_select', sequence: 3, active: true },
  { questionId: 15, questionText: 'Additional comments',                         answerType: 'free_text',    sequence: 4, active: true }
];

/** 5-point scale wording used on the report (answerCode keeps the numeric
 *  value for analytics; `answer` is what prints). */
const SCALE_5: Record<number, string> = {
  1: 'Poor', 2: 'Fair', 3: 'Okay', 4: 'Good', 5: 'Excellent'
};

// =====================================================================
// SEED — a legacy row so the report shows history from day one. This
// mirrors the row on the hospital's existing printed report.
// =====================================================================
const SEED_FEEDBACK: PatientFeedback[] = [
  {
    feedbackId: 'FB-LEGACY-0001',
    feedbackType: 'visit',
    patientId: '234272',
    patientName: 'MOHAMMAD ADNAN ABDULATEEF ALDEEI',
    opNumber: '3081802',
    opDate: '2024-05-04T00:00:00',
    doctorName: 'DR. ATTA HANNA ANDRAWES',
    specialty: 'General Medicine',
    consultationType: 'in_person',
    submittedAt: '2024-05-04T12:10:00',
    source: 'front_desk',
    status: 'synced'
  },
  // --- Demo patient's own history, so "My Feedback" has content ---------
  {
    feedbackId: 'FB-20260323-01',
    feedbackType: 'visit',
    patientId: '12345678',
    patientName: 'Fatima Sharma',
    opNumber: '3079420',
    opDate: '2026-03-22T15:30:00',
    doctorName: 'Dr. Samar Al-Homoud',
    specialty: 'Dermatology',
    consultationType: 'telehealth',
    submittedAt: '2026-03-23T09:12:00',
    source: 'patient_portal',
    status: 'synced'
  },
  {
    feedbackId: 'FB-20260219-01',
    feedbackType: 'visit',
    patientId: '12345678',
    patientName: 'Fatima Sharma',
    opNumber: '3074188',
    opDate: '2026-02-18T11:00:00',
    doctorName: 'Dr. Fatimah Al-Huwail',
    specialty: 'Endocrinology',
    consultationType: 'in_person',
    submittedAt: '2026-02-19T18:40:00',
    source: 'patient_portal',
    status: 'synced'
  }
];

const SEED_ANSWERS: PatientFeedbackAnswer[] = [
  { feedbackId: 'FB-LEGACY-0001', questionId: 8, answer: 'Poor', answerCode: '1' },

  { feedbackId: 'FB-20260323-01', questionId: 8,  answer: 'Excellent', answerCode: '5' },
  { feedbackId: 'FB-20260323-01', questionId: 11, answer: 'Clear explanation' },
  { feedbackId: 'FB-20260323-01', questionId: 11, answer: 'Short wait time' },
  { feedbackId: 'FB-20260323-01', questionId: 15, answer: 'The video call was smooth and the doctor explained my treatment plan clearly.' },

  { feedbackId: 'FB-20260219-01', questionId: 8,  answer: 'Okay', answerCode: '3' },
  { feedbackId: 'FB-20260219-01', questionId: 11, answer: 'Professional care' },
  { feedbackId: 'FB-20260219-01', questionId: 12, answer: 'Long wait time' },
  { feedbackId: 'FB-20260219-01', questionId: 12, answer: 'Billing clarity' },
  { feedbackId: 'FB-20260219-01', questionId: 15, answer: 'Care was good but I waited nearly an hour past my appointment time.' }
];

/**
 * Patient feedback store, shaped exactly like the HMIS tables so the
 * portal can post to a real backend with no re-modelling:
 *   POST /hmis/feedback            → header  (PATIENT_FEEDBACK)
 *   POST /hmis/feedback/{id}/answers → detail (PATIENT_FEEDBACK_DETAIL)
 *   GET  /hmis/reports/patient-feedback?from=&to= → the report rows
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly _feedback = signal<PatientFeedback[]>([...SEED_FEEDBACK]);
  private readonly _answers = signal<PatientFeedbackAnswer[]>([...SEED_ANSWERS]);
  private seq = 1;

  readonly questions = FEEDBACK_QUESTIONS;
  readonly feedback = this._feedback.asReadonly();
  readonly answers = this._answers.asReadonly();

  /** Encounters (OP numbers) that already have feedback — drives the
   *  "eligible for feedback" filter so a visit can't be reviewed twice. */
  readonly reviewedOpNumbers = computed(
    () => new Set(this._feedback().map(f => f.opNumber).filter(op => op !== ''))
  );

  questionText(questionId: number): string {
    return this.questions.find(q => q.questionId === questionId)?.questionText ?? `Q${questionId}`;
  }

  /** Word form of a 1–5 rating, as printed on the report. */
  ratingWord(rating: number): string {
    return SCALE_5[rating] ?? '';
  }

  /**
   * Persist one submitted feedback form as a header + N detail rows.
   * Multi-select answers are exploded into one row per selected option so
   * they stay aggregatable in reporting.
   */
  submitFeedback(input: {
    patientId: string;
    patientName: string;
    /** Omit for general (non-visit) feedback. */
    opNumber?: string;
    opDate?: string;
    doctorName?: string;
    doctorId?: string;
    specialty?: string;
    consultationType?: 'in_person' | 'telehealth';
    rating: number;
    positives: string[];
    negatives: string[];
    comments: string;
    source?: FeedbackSource;
  }): PatientFeedback {
    const feedbackId = `FB-${String(Date.now()).slice(-8)}-${this.seq++}`;
    const submittedAt = new Date().toISOString();
    const opNumber = input.opNumber ?? '';

    const header: PatientFeedback = {
      feedbackId,
      // No encounter reference → hospital-level feedback. It is still
      // stored; only the encounter columns are blank.
      feedbackType: opNumber ? 'visit' : 'general',
      patientId: input.patientId,
      patientName: input.patientName,
      opNumber,
      // General feedback has no visit date — fall back to the submission
      // date so date-range filters still return it.
      opDate: input.opDate ?? submittedAt,
      doctorId: input.doctorId,
      doctorName: input.doctorName ?? '',
      specialty: input.specialty ?? '',
      consultationType: input.consultationType,
      submittedAt,
      source: input.source ?? 'patient_portal',
      status: 'submitted'
    };

    const detail: PatientFeedbackAnswer[] = [];

    // Q8 — overall rating (scale_5)
    if (input.rating > 0) {
      detail.push({
        feedbackId,
        questionId: 8,
        answer: this.ratingWord(input.rating),
        answerCode: String(input.rating)
      });
    }
    // Q11 / Q12 — multi-select: ONE ROW PER SELECTED OPTION
    for (const tag of input.positives) {
      detail.push({ feedbackId, questionId: 11, answer: tag });
    }
    for (const tag of input.negatives) {
      detail.push({ feedbackId, questionId: 12, answer: tag });
    }
    // Q15 — free text
    const comments = input.comments.trim();
    if (comments) {
      detail.push({ feedbackId, questionId: 15, answer: comments });
    }

    this._feedback.update(list => [header, ...list]);
    this._answers.update(list => [...list, ...detail]);
    return header;
  }

  /**
   * FULL detail rows — one per answered question, carrying every field the
   * portal stores (superset of the legacy report's 8 columns). Optionally
   * scoped to a patient and/or an OP Date range. Newest submission first.
   *
   * Backs the "My Feedback" report; the legacy-format report uses
   * `reportRows()` which projects only the 8 original columns.
   */
  detailRows(opts: { patientId?: string; from?: string; to?: string } = {}): PatientFeedbackDetailRow[] {
    const answers = this._answers();
    const fromTs = opts.from ? new Date(opts.from).getTime() : -Infinity;
    const toTs = opts.to ? new Date(opts.to).getTime() + 86_399_999 : Infinity;

    return this._feedback()
      .filter(h => !opts.patientId || h.patientId === opts.patientId)
      .filter(h => {
        const ts = new Date(h.opDate).getTime();
        return ts >= fromTs && ts <= toTs;
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .flatMap(h =>
        answers
          .filter(a => a.feedbackId === h.feedbackId)
          .sort((a, b) => a.questionId - b.questionId)
          .map<PatientFeedbackDetailRow>(a => ({
            feedbackId: h.feedbackId,
            feedbackType: h.feedbackType,
            patientId: h.patientId,
            patientName: h.patientName,
            opNumber: h.opNumber,
            opDate: h.opDate,
            doctorName: h.doctorName,
            specialty: h.specialty,
            consultationType: h.consultationType,
            questionId: a.questionId,
            question: this.questionText(a.questionId),
            answer: a.answer,
            answerCode: a.answerCode,
            submittedAt: h.submittedAt,
            source: h.source,
            status: h.status
          }))
      );
  }

  /**
   * GROUPED view — one entry per submitted form, with the encounter shown
   * once and the answers collapsed to one line per question (multi-select
   * options joined). Every active master question is listed, so a skipped
   * question still prints as an explicit blank rather than vanishing.
   *
   * Storage stays normalised (one row per selected option, so answers stay
   * aggregatable); this is purely the readable projection of it.
   */
  groupedRows(opts: { patientId?: string; from?: string; to?: string } = {}): Array<{
    header: PatientFeedback;
    answers: Array<{ questionId: number; question: string; answer: string; answerCode?: string }>;
  }> {
    const all = this._answers();
    const fromTs = opts.from ? new Date(opts.from).getTime() : -Infinity;
    const toTs = opts.to ? new Date(opts.to).getTime() + 86_399_999 : Infinity;

    return this._feedback()
      .filter(h => !opts.patientId || h.patientId === opts.patientId)
      .filter(h => {
        const ts = new Date(h.opDate).getTime();
        return ts >= fromTs && ts <= toTs;
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .map(header => {
        const mine = all.filter(a => a.feedbackId === header.feedbackId);
        const answers = this.questions
          .filter(q => q.active)
          .sort((a, b) => a.sequence - b.sequence)
          .map(q => {
            const hits = mine.filter(a => a.questionId === q.questionId);
            return {
              questionId: q.questionId,
              question: q.questionText,
              // Multi-select → join the selected options onto one line.
              answer: hits.map(h => h.answer).join(', '),
              answerCode: hits.find(h => h.answerCode)?.answerCode
            };
          });
        return { header, answers };
      });
  }

  /**
   * A single patient's own submitted feedback, newest first, with each
   * header's answers grouped by question. Powers the patient-facing
   * "My Feedback" screen (same stored rows, patient-friendly shape).
   */
  myFeedback(patientId: string): Array<{
    header: PatientFeedback;
    rating: number;
    ratingWord: string;
    positives: string[];
    negatives: string[];
    comments: string;
  }> {
    const answers = this._answers();
    return this._feedback()
      .filter(f => f.patientId === patientId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .map(header => {
        const mine = answers.filter(a => a.feedbackId === header.feedbackId);
        const scale = mine.find(a => a.questionId === 8);
        return {
          header,
          rating: Number(scale?.answerCode ?? 0),
          ratingWord: scale?.answer ?? '',
          positives: mine.filter(a => a.questionId === 11).map(a => a.answer),
          negatives: mine.filter(a => a.questionId === 12).map(a => a.answer),
          comments: mine.find(a => a.questionId === 15)?.answer ?? ''
        };
      });
  }

  /**
   * Flatten header ⋈ detail into printable report rows, optionally bounded
   * by OP Date — the same query the hospital's report runs.
   */
  reportRows(from?: string, to?: string): FeedbackReportRow[] {
    const headers = this._feedback();
    const answers = this._answers();
    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() + 86_399_999 : Infinity;

    return headers
      .filter(h => {
        const ts = new Date(h.opDate).getTime();
        return ts >= fromTs && ts <= toTs;
      })
      .sort((a, b) => new Date(b.opDate).getTime() - new Date(a.opDate).getTime())
      .flatMap(h =>
        answers
          .filter(a => a.feedbackId === h.feedbackId)
          .sort((a, b) => a.questionId - b.questionId)
          .map<FeedbackReportRow>(a => ({
            patientId: h.patientId,
            patientName: h.patientName,
            opNumber: h.opNumber,
            opDate: h.opDate,
            doctorName: h.doctorName,
            questionId: a.questionId,
            question: this.questionText(a.questionId),
            answer: a.answer,
            source: h.source
          }))
      );
  }
}
