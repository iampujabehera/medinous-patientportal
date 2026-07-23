import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../core/services/api.service';
import { FeedbackService } from '../../core/services/feedback.service';

/**
 * MY FEEDBACK — report-format view of the feedback THIS patient submitted.
 *
 * Same row-per-question grain as the hospital's Patient Feedback Report,
 * but printed with the FULL field set the portal now captures. The legacy
 * report only carried 8 columns (patient, OP, doctor, Q ID, question,
 * answer); the portal additionally stores Specialty, Consultation Type,
 * the normalised Answer Code, the Submitted-On timestamp (distinct from
 * the visit date), the capture Source and the HMIS Status — all surfaced
 * here so the extended schema is visible end-to-end.
 *
 * Patient identity sits in the report header rather than being repeated on
 * every row, since every row belongs to the signed-in patient.
 */
@Component({
  selector: 'app-my-feedback',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mf-wrap">

      <!-- Screen-only controls -->
      <div class="mf-toolbar">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>From</mat-label>
          <input matInput type="date" [ngModel]="from()" (ngModelChange)="from.set($event)">
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>To</mat-label>
          <input matInput type="date" [ngModel]="to()" (ngModelChange)="to.set($event)">
        </mat-form-field>
        <span class="mf-count">
          {{ groups().length }} submission{{ groups().length === 1 ? '' : 's' }}
          · {{ rows().length }} stored row{{ rows().length === 1 ? '' : 's' }}
        </span>

        <!-- Grouped = readable. Detailed = the raw HMIS storage grain. -->
        <div class="mf-toggle" role="group" aria-label="Report layout">
          <button type="button" [class.on]="view() === 'grouped'" (click)="view.set('grouped')">Grouped</button>
          <button type="button" [class.on]="view() === 'rows'" (click)="view.set('rows')">Detailed rows</button>
        </div>

        <span class="mf-spacer"></span>
        <a mat-flat-button class="mf-new" routerLink="/dashboard"
           [queryParams]="{ openFeedback: '1' }">
          <mat-icon>rate_review</mat-icon> Give feedback
        </a>
        <button mat-stroked-button (click)="print()">
          <mat-icon>print</mat-icon> Print
        </button>
      </div>

      <!-- Printable sheet -->
      <div class="mf-sheet">
        <header class="mf-letterhead">
          <div class="mf-lh-en">
            <div>{{ org.addr1 }}</div>
            <div>{{ org.addr2 }}</div>
            <div>Tel:{{ org.tel }}</div>
            <div>{{ org.web }}</div>
          </div>
          <div class="mf-lh-logo">
            <img [src]="org.logo" [alt]="org.name">
            <div class="mf-lh-name">{{ org.name }}</div>
          </div>
          <div class="mf-lh-ar" dir="rtl">
            <div>{{ org.addr1Ar }}</div>
            <div>{{ org.addr2Ar }}</div>
            <div>تلفون:{{ org.tel }}</div>
          </div>
        </header>

        <h1 class="mf-title">
          My Feedback Report from {{ from() | date:'dd/MM/yyyy' }} to {{ to() | date:'dd/MM/yyyy' }}
        </h1>

        <!-- Patient identity shown here only for the grouped layout; the
             detailed table carries its own Patient ID / Name columns. -->
        @if (view() === 'grouped') {
          <div class="mf-patient">
            <span><b>Patient ID:</b> {{ patientId() || '—' }}</span>
            <span><b>Patient Name:</b> {{ patientName() || '—' }}</span>
          </div>
        }

        <!-- ============ GROUPED (clean, default) ============ -->
        @if (view() === 'grouped') {
          @for (g of groups(); track g.header.feedbackId) {
            <section class="mf-group">
              <!-- Encounter band: printed ONCE per submission -->
              <header class="mf-group-head">
                <div class="mf-gh-main">
                  @if (g.header.feedbackType === 'general') {
                    <strong>General hospital experience</strong>
                    <span class="mf-gh-sub">No specific visit</span>
                  } @else {
                    <strong>{{ g.header.doctorName }} — {{ g.header.specialty }}</strong>
                    <span class="mf-gh-sub">
                      OP No. {{ g.header.opNumber }} ·
                      {{ g.header.opDate | date:'dd/MM/yyyy' }} ·
                      {{ g.header.consultationType === 'telehealth' ? 'Video Consultation' : 'Hospital Visit' }}
                    </span>
                  }
                </div>
                <div class="mf-gh-meta">
                  <span>Submitted {{ g.header.submittedAt | date:'dd/MM/yyyy HH:mm' }}</span>
                  <span>{{ g.header.source === 'patient_portal' ? 'Portal' : (g.header.source === 'kiosk' ? 'Kiosk' : 'Front Desk') }}
                    · {{ g.header.status === 'synced' ? 'Synced' : 'Submitted' }}</span>
                </div>
              </header>

              <table class="mf-qa">
                <tbody>
                  @for (a of g.answers; track a.questionId) {
                    <tr>
                      <td class="qa-id">{{ a.questionId }}</td>
                      <td class="qa-q">{{ a.question }}</td>
                      <td class="qa-a" [class.blank]="!a.answer">
                        {{ a.answer || '—' }}
                        @if (a.answerCode) { <span class="qa-code">({{ a.answerCode }})</span> }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </section>
          } @empty {
            <div class="mf-box"><p class="mf-empty">No feedback recorded in this date range.</p></div>
          }
        }

        <!-- ============ DETAILED ROWS (HMIS storage grain) ============ -->
        @if (view() === 'rows') {
        <div class="mf-box">
          <table class="mf-table">
            <thead>
              <tr>
                <th class="c-pid">Patient ID</th>
                <th class="c-pname">Patient Name</th>
                <th class="c-op">OP No.</th>
                <th class="c-opd">OP Date</th>
                <th class="c-doc">Doctor Name</th>
                <th class="c-type">Consultation Type</th>
                <th class="c-qid">Q ID</th>
                <th class="c-q">Question</th>
                <th class="c-a">Answer</th>
                <th class="c-sub">Submitted On</th>
              </tr>
            </thead>
            <tbody>
              @for (r of rows(); track r.feedbackId + '-' + r.questionId + '-' + r.answer) {
                <tr>
                  <td>{{ r.patientId }}</td>
                  <td>{{ r.patientName }}</td>
                  <td>{{ r.opNumber || '—' }}</td>
                  <td>{{ r.opDate | date:'dd/MM/yyyy' }}</td>
                  <td>{{ r.doctorName || '—' }}</td>
                  <td>
                    @if (r.feedbackType === 'general') {
                      General experience
                    } @else {
                      {{ r.consultationType === 'telehealth' ? 'Video Consultation' : 'Hospital Visit' }}
                    }
                  </td>
                  <td class="c-qid">{{ r.questionId }}</td>
                  <td class="c-q">{{ r.question }}</td>
                  <td class="c-a">{{ r.answer }}</td>
                  <td>{{ r.submittedAt | date:'dd/MM/yyyy HH:mm' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="10" class="mf-empty">
                    No feedback recorded in this date range.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .mf-wrap { padding: 16px; background: #eceff1; min-height: 100%; }

    .mf-toolbar {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      max-width: 1240px; margin: 0 auto 14px;
    }
    .mf-toolbar mat-form-field { width: 160px; background: #fff; border-radius: 6px; }
    .mf-count { font-size: 12.5px; color: #546e7a; font-weight: 600; }
    .mf-spacer { flex: 1; }
    .mf-new {
      background: #00897b !important; color: #fff !important;
      font-weight: 600 !important; border-radius: 8px !important;
    }
    .mf-new mat-icon { margin-right: 4px; }

    .mf-sheet {
      max-width: 1240px; margin: 0 auto;
      background: #fff; padding: 24px 26px 32px;
      border: 1px solid #cfd8dc; box-shadow: 0 2px 10px rgba(0,0,0,.08);
      font-family: Arial, Helvetica, sans-serif; color: #000;
    }

    .mf-letterhead {
      display: grid; grid-template-columns: 1fr auto 1fr;
      align-items: start; gap: 20px; margin-bottom: 14px;
    }
    .mf-lh-en, .mf-lh-ar { font-size: 12px; font-weight: 700; line-height: 1.5; }
    .mf-lh-ar { text-align: right; }
    .mf-lh-logo { text-align: center; }
    .mf-lh-logo img { height: 48px; object-fit: contain; }
    .mf-lh-name { font-size: 12.5px; font-weight: 700; margin-top: 3px; }

    .mf-title {
      text-align: center; font-size: 15px; font-weight: 700; margin: 4px 0 10px;
    }
    .mf-patient {
      display: flex; gap: 26px; flex-wrap: wrap;
      font-size: 12px; margin-bottom: 8px;
    }

    /* ---------- grouped layout ---------- */
    .mf-toggle { display: inline-flex; border: 1px solid #b0bec5; border-radius: 8px; overflow: hidden; }
    .mf-toggle button {
      border: none; background: #fff; cursor: pointer; font: inherit;
      font-size: 12px; font-weight: 600; color: #546e7a; padding: 7px 14px;
    }
    .mf-toggle button + button { border-left: 1px solid #cfd8dc; }
    .mf-toggle button.on { background: #00897b; color: #fff; }

    .mf-group {
      border: 1px solid #000; border-radius: 7px;
      overflow: hidden; margin-bottom: 14px;
    }
    .mf-group-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; flex-wrap: wrap;
      padding: 9px 12px; background: #f4f7f8;
      border-bottom: 1px solid #000;
    }
    .mf-gh-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .mf-gh-main strong { font-size: 13px; }
    .mf-gh-sub { font-size: 11.5px; color: #37474f; }
    .mf-gh-meta {
      display: flex; flex-direction: column; gap: 2px;
      text-align: right; font-size: 11px; color: #546e7a; white-space: nowrap;
    }

    .mf-qa { width: 100%; border-collapse: collapse; font-size: 12px; }
    .mf-qa td { padding: 7px 12px; vertical-align: top; line-height: 1.4; }
    .mf-qa tr + tr td { border-top: 1px solid #eceff1; }
    .qa-id { width: 42px; text-align: right; color: #78909c; }
    .qa-q { width: 230px; font-weight: 700; }
    .qa-a { font-weight: 400; }
    .qa-a.blank { color: #b0bec5; }
    .qa-code { color: #78909c; font-size: 11px; }

    .mf-box { border: 1px solid #000; border-radius: 7px; overflow: hidden; }
    .mf-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    .mf-table th {
      text-align: left; font-weight: 700; vertical-align: bottom;
      padding: 8px 8px; border-bottom: 1px solid #000; white-space: nowrap;
    }
    .mf-table td { padding: 7px 8px; vertical-align: top; line-height: 1.35; }
    .mf-table tbody tr + tr td { border-top: 1px solid #eceff1; }

    .c-pid { width: 78px; }
    .c-pname { width: 130px; }
    .c-op { width: 72px; }
    .c-opd { width: 82px; }
    .c-doc { width: 150px; }
    .c-type { width: 118px; }
    .c-qid { width: 42px; text-align: right; }
    .c-q { font-weight: 700; min-width: 150px; }
    .c-a { min-width: 140px; }
    .c-sub { width: 112px; }

    .mf-empty { text-align: center; color: #78909c; padding: 40px 10px; }

    @media print {
      .mf-wrap { padding: 0; background: #fff; }
      .mf-toolbar { display: none !important; }
      .mf-sheet { border: none; box-shadow: none; max-width: none; padding: 0; }
    }

    @media (max-width: 1000px) {
      .mf-wrap { padding: 10px; }
      .mf-sheet { padding: 16px 14px 24px; overflow-x: auto; }
      .mf-letterhead { grid-template-columns: 1fr; text-align: center; gap: 8px; }
      .mf-lh-ar { text-align: center; }
      .mf-table { min-width: 1080px; }
    }
  `]
})
export class MyFeedbackComponent {
  private readonly api = inject(ApiService);
  private readonly feedback = inject(FeedbackService);

  /** White-label letterhead slot — tenant config in production. */
  readonly org = {
    name: 'Prince Fahd Bin Sultan Hospital',
    addr1: 'King Khalid Road',
    addr2: 'Tabuk, Saudi Arabia',
    addr1Ar: 'طريق الملك خالد',
    addr2Ar: 'تبوك، المملكة العربية السعودية',
    tel: '1883883',
    web: 'www.pfsh.med.sa',
    logo: 'prince-fahd-hospital.png'
  };

  readonly patientId = signal<string>('');
  readonly patientName = signal<string>('');

  readonly from = signal('2024-01-01');
  readonly to = signal(new Date().toISOString().slice(0, 10));

  /** 'grouped' = readable (encounter once, one line per question).
   *  'rows'    = the raw stored grain, one row per answer. */
  readonly view = signal<'grouped' | 'rows'>('grouped');

  readonly rows = computed(() => {
    const id = this.patientId();
    if (!id) return [];
    return this.feedback.detailRows({ patientId: id, from: this.from(), to: this.to() });
  });

  readonly groups = computed(() => {
    const id = this.patientId();
    if (!id) return [];
    return this.feedback.groupedRows({ patientId: id, from: this.from(), to: this.to() });
  });

  constructor() {
    this.api.getDashboard().subscribe(d => {
      this.patientId.set(d.patient.id);
      this.patientName.set(`${d.patient.firstName} ${d.patient.lastName}`.trim());
    });
  }

  print(): void {
    window.print();
  }
}
