import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FeedbackService } from '../../core/services/feedback.service';

/**
 * PATIENT FEEDBACK REPORT
 *
 * Laid out to match the hospital's existing printed report exactly:
 * letterhead (address · logo · Arabic address), a centred title carrying
 * the date range, then a bordered grid with one row per question —
 * Patient ID · Patient Name · OP No. · OP Date · Doctor Name · Q ID ·
 * Question · Answer.
 *
 * Rows come from flattening PATIENT_FEEDBACK (header) against
 * PATIENT_FEEDBACK_DETAIL, so portal-captured feedback prints in the same
 * shape the HMIS already produces.
 */
@Component({
  selector: 'app-feedback-report',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fr-wrap">

      <!-- Screen-only controls; hidden when printing -->
      <div class="fr-toolbar">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>From</mat-label>
          <input matInput type="date" [ngModel]="from()" (ngModelChange)="from.set($event)">
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>To</mat-label>
          <input matInput type="date" [ngModel]="to()" (ngModelChange)="to.set($event)">
        </mat-form-field>
        <span class="fr-count">{{ rows().length }} row{{ rows().length === 1 ? '' : 's' }}</span>
        <span class="fr-spacer"></span>
        <button mat-stroked-button (click)="print()">
          <mat-icon>print</mat-icon> Print
        </button>
      </div>

      <!-- The printable sheet -->
      <div class="fr-sheet">

        <!-- Letterhead: EN address (left) · logo (centre) · AR address (right).
             White-label slot — these come from tenant config in production. -->
        <header class="fr-letterhead">
          <div class="fr-lh-en">
            <div>{{ org.addr1 }}</div>
            <div>{{ org.addr2 }}</div>
            <div>Tel:{{ org.tel }}</div>
            <div>{{ org.email }}</div>
            <div>{{ org.web }}</div>
          </div>
          <div class="fr-lh-logo">
            <mat-icon class="fr-lh-emblem">local_hospital</mat-icon>
            <div class="fr-lh-name">{{ org.name }}</div>
            <div class="fr-lh-name-ar" dir="rtl">{{ org.nameAr }}</div>
          </div>
          <div class="fr-lh-ar" dir="rtl">
            <div>{{ org.addr1Ar }}</div>
            <div>{{ org.addr2Ar }}</div>
            <div>تلفون:{{ org.tel }}</div>
            <div class="fr-lh-web-ar">{{ org.web }}</div>
          </div>
        </header>

        <h1 class="fr-title">
          Patient FeedBack Report from {{ from() | date:'dd/MM/yyyy' }} to {{ to() | date:'dd/MM/yyyy' }}
        </h1>

        <div class="fr-box">
          <table class="fr-table">
            <thead>
              <tr>
                <th class="c-pid">Patient ID</th>
                <th class="c-name">Patient Name</th>
                <th class="c-op">OP No.</th>
                <th class="c-opd">OP Date</th>
                <th class="c-doc">Doctor Name</th>
                <th class="c-qid">Q ID</th>
                <th class="c-q">Question</th>
                <th class="c-a">Answer</th>
              </tr>
            </thead>
            <tbody>
              @for (r of rows(); track r.patientId + r.opNumber + r.questionId + r.answer) {
                <tr>
                  <td>{{ r.patientId }}</td>
                  <td>{{ r.patientName }}</td>
                  <td>{{ r.opNumber || '—' }}</td>
                  <td>{{ r.opDate | date:'dd/MM/yyyy' }}</td>
                  <td>{{ r.doctorName || '—' }}</td>
                  <td class="c-qid">{{ r.questionId }}</td>
                  <td class="c-q">{{ r.question }}</td>
                  <td class="c-a">{{ r.answer }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="fr-empty">No feedback recorded in this date range.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fr-wrap { padding: 16px; background: #eceff1; min-height: 100%; }

    /* ---------- screen-only toolbar ---------- */
    .fr-toolbar {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      max-width: 1100px; margin: 0 auto 14px;
    }
    .fr-toolbar mat-form-field { width: 165px; background: #fff; border-radius: 6px; }
    .fr-count { font-size: 12.5px; color: #546e7a; font-weight: 600; }
    .fr-spacer { flex: 1; }

    /* ---------- the printed sheet ---------- */
    .fr-sheet {
      max-width: 1100px; margin: 0 auto;
      background: #fff; padding: 26px 30px 36px;
      border: 1px solid #cfd8dc;
      box-shadow: 0 2px 10px rgba(0,0,0,.08);
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
    }

    .fr-letterhead {
      display: grid; grid-template-columns: 1fr auto 1fr;
      align-items: start; gap: 20px; margin-bottom: 18px;
    }
    .fr-lh-en, .fr-lh-ar { font-size: 12.5px; font-weight: 700; line-height: 1.55; }
    .fr-lh-ar { text-align: right; }
    .fr-lh-web-ar { direction: ltr; text-align: right; }
    .fr-lh-logo { text-align: center; }
    .fr-lh-logo img { height: 54px; object-fit: contain; display: inline-block; }
    .fr-lh-emblem { color: #0d8a8a; font-size: 44px; width: 44px; height: 44px; }
    .fr-lh-name { font-size: 13px; font-weight: 700; margin-top: 3px; }
    .fr-lh-name-ar { font-size: 11.5px; color: #37474f; }

    .fr-title {
      text-align: center; font-size: 15px; font-weight: 700;
      margin: 6px 0 14px; color: #000;
    }

    /* Rounded outline around the grid, matching the HMIS report */
    .fr-box {
      border: 1px solid #000; border-radius: 7px;
      overflow: hidden; min-height: 300px;
    }
    .fr-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .fr-table th {
      text-align: left; font-weight: 700; vertical-align: bottom;
      padding: 8px 10px; border-bottom: 1px solid #000; white-space: nowrap;
    }
    .fr-table td {
      padding: 7px 10px; vertical-align: top; line-height: 1.35;
    }
    /* No vertical gridlines — the legacy report uses whitespace only. */
    .fr-table tbody tr + tr td { border-top: 1px solid #eceff1; }

    .c-pid  { width: 80px; }
    .c-name { width: 190px; }
    .c-op   { width: 78px; }
    .c-opd  { width: 88px; }
    .c-doc  { width: 175px; }
    .c-qid  { width: 46px; text-align: right; }
    .c-q    { font-weight: 700; }
    .c-a    { width: 130px; }

    .fr-empty { text-align: center; color: #78909c; padding: 40px 10px; }

    /* ---------- print ---------- */
    @media print {
      .fr-wrap { padding: 0; background: #fff; }
      .fr-toolbar { display: none !important; }
      .fr-sheet { border: none; box-shadow: none; max-width: none; padding: 0; }
    }

    @media (max-width: 900px) {
      .fr-wrap { padding: 10px; }
      .fr-sheet { padding: 16px 14px 24px; overflow-x: auto; }
      .fr-letterhead { grid-template-columns: 1fr; text-align: center; gap: 10px; }
      .fr-lh-ar { text-align: center; }
      .fr-lh-web-ar { text-align: center; }
      .fr-box { min-height: 0; }
      .fr-table { min-width: 860px; }
    }
  `]
})
export class FeedbackReportComponent {
  private readonly feedback = inject(FeedbackService);

  /** Letterhead details. White-label slot — served from tenant config in
   *  production; hard-coded here for the demo tenant. */
  readonly org = {
    name: 'Good Health Hospital',
    nameAr: 'مستشفى الصحة الجيدة',
    addr1: 'King Khalid Road',
    addr2: 'Tabuk, Saudi Arabia',
    addr1Ar: 'طريق الملك خالد',
    addr2Ar: 'تبوك، المملكة العربية السعودية',
    tel: '1883883',
    email: 'info@ghh.med.sa',
    web: 'www.ghh.med.sa'
  };

  // Default window mirrors the legacy report's wide default range.
  readonly from = signal('2024-01-01');
  readonly to = signal(new Date().toISOString().slice(0, 10));

  readonly rows = computed(() => this.feedback.reportRows(this.from(), this.to()));

  print(): void {
    window.print();
  }
}
