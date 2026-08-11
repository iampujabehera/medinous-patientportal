import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { RecordVitalsComponent } from '../../shared/components/record-vitals/record-vitals.component';
import { ApiService } from '../../core/services/api.service';
import { VitalsService } from '../../core/services/vitals.service';
import { sourceChipLabel } from '../../core/utils/vitals.util';
import { Consultation, VitalSign } from '../../core/models/patient.model';

interface ConsultationGroup {
  label: string;
  year: number;
  consultations: Consultation[];
}

@Component({
  selector: 'app-consultations',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatIconModule, MatButtonModule, MatChipsModule,
    MatInputModule, MatSnackBarModule,
    FormsModule,
    SkeletonCardComponent, RecordVitalsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cons-container">

      <!-- Header -->
      <header class="page-header">
        <div>
          <h1>My Health</h1>
          <p class="subtitle">Latest vitals and every doctor visit, with the full clinical picture</p>
        </div>
        <div class="header-stats">
          <span class="hs-pill">
            <mat-icon>medical_information</mat-icon>
            {{ consultations().length }} visits
          </span>
        </div>
      </header>

      <!-- ============================================ -->
      <!-- HEALTH SNAPSHOT (vitals)                     -->
      <!-- ============================================ -->
      @if (dashboardVitals().length > 0) {
        <section class="vitals-section">
          <div class="vs-head">
            <div>
              <h2>Health Snapshot</h2>
              <p class="vs-sub">Latest recorded vitals · {{ latestVitalDate() | date:'mediumDate' }}</p>
            </div>
            <button class="vs-record" (click)="openVitals()">
              <mat-icon>add</mat-icon> Record readings
            </button>
          </div>
          <div class="vitals-scroll">
            @for (vital of dashboardVitals(); track vital.type) {
              <article class="vital-card" [class]="'v-' + vital.status">
                <div class="v-top">
                  <div class="v-icon" [class]="'vbg-' + vital.status">
                    <mat-icon>{{ getVitalIcon(vital) }}</mat-icon>
                  </div>
                  <span class="v-trend-chip" [class]="'tc-' + vital.status">
                    <mat-icon>{{ trendIcon(vital) }}</mat-icon>
                    {{ trendLabel(vital) }}
                  </span>
                </div>
                <span class="v-label">{{ getVitalLabel(vital) }}</span>
                <div class="v-value-row">
                  <span class="v-value">{{ vital.value }}</span>
                  <span class="v-unit">{{ vital.unit }}</span>
                </div>
                <!-- Source provenance: self-reported vs clinic-measured -->
                <span class="v-source" [class.src-self]="vital.source === 'self'">
                  <mat-icon>{{ vital.source === 'self' ? 'person' : 'local_hospital' }}</mat-icon>
                  {{ sourceChip(vital) }}
                </span>
              </article>
            }
          </div>
        </section>
      }

      @if (vitalsOpen()) {
        <app-record-vitals variant="sheet" context="Saved to My Health · self-reported"
                           (closed)="vitalsOpen.set(false)" />
      }

      <!-- Specialty pills (quick filter) -->
      @if (specialties().length > 1) {
        <div class="quick-pills">
          <button class="qp" [class.active]="specialtyFilter() === 'all'"
                  (click)="specialtyFilter.set('all')">All</button>
          @for (sp of specialties(); track sp) {
            <button class="qp" [class.active]="specialtyFilter() === sp"
                    (click)="specialtyFilter.set(sp)">{{ sp }}</button>
          }
        </div>
      }

      <!-- Timeline -->
      @if (loading()) {
        @for (i of [1,2,3]; track i) {
          <app-skeleton-card [lines]="3" />
        }
      } @else if (filteredGroups().length === 0) {
        <div class="empty-state">
          <mat-icon>history_edu</mat-icon>
          <h3>No consultations match this specialty</h3>
          <p>Try a different specialty pill above.</p>
          @if (specialtyFilter() !== 'all') {
            <button mat-stroked-button (click)="resetFilters()">Show all</button>
          }
        </div>
      } @else {
        <div class="timeline">
          @for (group of filteredGroups(); track group.label) {
            <section class="tl-group">
              <div class="tl-year">
                <span class="tl-year-label">{{ group.label }}</span>
                <span class="tl-year-count">{{ group.consultations.length }} visit{{ group.consultations.length === 1 ? '' : 's' }}</span>
              </div>

              <div class="tl-items">
                @for (c of group.consultations; track c.id) {
                  <article class="tl-item">
                    <div class="tl-node">
                      <div class="tl-dot" [class]="'dot-' + specialtyTheme(c.doctorSpecialty)"></div>
                    </div>
                    <button class="tl-card" (click)="openDetail(c)">
                      <div class="tl-card-head">
                        <div class="tl-avatar" [class]="'av-' + specialtyTheme(c.doctorSpecialty)">
                          {{ doctorInitials(c.doctorName) }}
                        </div>
                        <div class="tl-card-info">
                          <strong class="tl-doctor">{{ c.doctorName }}</strong>
                          <span class="tl-spec">{{ c.doctorSpecialty }}</span>
                        </div>
                        <div class="tl-meta">
                          <span class="tl-type-chip" [class]="'tc-' + c.type">
                            <mat-icon>{{ c.type === 'telehealth' ? 'videocam' : 'local_hospital' }}</mat-icon>
                            {{ c.type === 'telehealth' ? 'Video' : 'In-person' }}
                          </span>
                          <span class="tl-date">{{ c.date | date:'MMM d, y' }}</span>
                        </div>
                      </div>

                      @if (c.diagnosis.length > 0) {
                        <div class="tl-dx">
                          <mat-icon class="tl-dx-icon">stethoscope</mat-icon>
                          <span>{{ primaryDiagnosis(c) }}</span>
                        </div>
                      }

                      <div class="tl-chips">
                        @if (c.medications.length > 0) {
                          <span class="chip chip-med">
                            <mat-icon>medication</mat-icon>
                            {{ c.medications.length }} medication{{ c.medications.length === 1 ? '' : 's' }}
                          </span>
                        }
                        @if (c.investigations.length > 0) {
                          <span class="chip chip-lab">
                            <mat-icon>science</mat-icon>
                            {{ c.investigations.length }} investigation{{ c.investigations.length === 1 ? '' : 's' }}
                          </span>
                        }
                        @if (c.procedures.length > 0) {
                          <span class="chip chip-proc">
                            <mat-icon>medical_services</mat-icon>
                            {{ c.procedures.length }} procedure{{ c.procedures.length === 1 ? '' : 's' }}
                          </span>
                        }
                        @if (c.followUp) {
                          <span class="chip chip-follow">
                            <mat-icon>event_repeat</mat-icon>
                            Follow-up {{ c.followUp.date | date:'MMM d' }}
                          </span>
                        }
                      </div>

                      <span class="tl-cta">
                        View full visit
                        <mat-icon>arrow_forward</mat-icon>
                      </span>
                    </button>
                  </article>
                }
              </div>
            </section>
          }
        </div>
      }
    </div>

    <!-- ============================================ -->
    <!-- DETAIL SIDE SHEET                            -->
    <!-- ============================================ -->
    @if (selectedId()) {
      <div class="sheet-backdrop" (click)="closeDetail()"></div>
    }
    <aside class="side-sheet" [class.open]="!!selectedId()" aria-label="Consultation details">
      @if (selectedConsultation(); as c) {
        <!-- Sticky header -->
        <header class="ss-head">
          <div class="ss-head-title">
            <div class="ss-avatar" [class]="'av-' + specialtyTheme(c.doctorSpecialty)">
              {{ doctorInitials(c.doctorName) }}
            </div>
            <div class="ss-head-info">
              <h3>{{ c.doctorName }}</h3>
              <p>{{ c.doctorSpecialty }} · {{ c.date | date:'mediumDate' }} · {{ c.date | date:'shortTime' }}</p>
              <p class="ss-loc">
                <mat-icon>{{ c.type === 'telehealth' ? 'videocam' : 'place' }}</mat-icon>
                {{ c.location }}
              </p>
            </div>
          </div>
          <button mat-icon-button class="ss-close" (click)="closeDetail()">
            <mat-icon>close</mat-icon>
          </button>
        </header>

        <div class="ss-body">

          <!-- Vitals recorded -->
          @if (c.vitalsRecorded.length > 0) {
            <section class="d-section">
              <div class="d-sec-head">
                <mat-icon>monitor_heart</mat-icon>
                <h4>Vitals Recorded</h4>
              </div>
              <div class="vitals-grid">
                @for (v of c.vitalsRecorded; track v.label) {
                  <div class="vital-pill">
                    <span class="vp-label">{{ v.label }}</span>
                    <strong class="vp-value">{{ v.value }} <span>{{ v.unit }}</span></strong>
                  </div>
                }
              </div>
            </section>
          }

          <!-- Chief Complaint -->
          <section class="d-section">
            <div class="d-sec-head">
              <mat-icon>contact_support</mat-icon>
              <h4>Chief Complaint</h4>
            </div>
            <p class="d-body-text">{{ c.chiefComplaint }}</p>
          </section>

          <!-- Diagnosis -->
          <section class="d-section">
            <div class="d-sec-head">
              <mat-icon>stethoscope</mat-icon>
              <h4>Diagnosis</h4>
            </div>
            @for (dx of c.diagnosis; track dx.description) {
              <div class="dx-row">
                <span class="dx-marker" [class.primary]="dx.type === 'primary'"></span>
                <div class="dx-body">
                  <div class="dx-top">
                    <span class="dx-type" [class.primary]="dx.type === 'primary'">{{ dx.type === 'primary' ? 'Primary' : 'Secondary' }}</span>
                    @if (dx.code) {
                      <span class="dx-code">{{ dx.code }}</span>
                    }
                  </div>
                  <p>{{ dx.description }}</p>
                </div>
              </div>
            }
          </section>

          <!-- Investigations -->
          @if (c.investigations.length > 0) {
            <section class="d-section">
              <div class="d-sec-head">
                <mat-icon>science</mat-icon>
                <h4>Investigations Requested</h4>
              </div>
              <ul class="inv-list">
                @for (inv of c.investigations; track inv.name) {
                  <li class="inv-row">
                    <div class="inv-icon" [class]="'icat-' + inv.category">
                      <mat-icon>{{ investigationIcon(inv.category) }}</mat-icon>
                    </div>
                    <div class="inv-body">
                      <strong>{{ inv.name }}</strong>
                      @if (inv.resultDate) {
                        <span class="inv-meta">Result {{ inv.resultDate | date:'mediumDate' }}</span>
                      }
                    </div>
                    <span class="inv-status" [class]="'inv-st-' + inv.status">
                      {{ statusLabel(inv.status) }}
                    </span>
                  </li>
                }
              </ul>
            </section>
          }

          <!-- Procedures -->
          @if (c.procedures.length > 0) {
            <section class="d-section">
              <div class="d-sec-head">
                <mat-icon>medical_services</mat-icon>
                <h4>Procedures &amp; Interventions</h4>
              </div>
              <ul class="proc-list">
                @for (p of c.procedures; track p.name) {
                  <li class="proc-row">
                    <mat-icon class="proc-icon">check_circle</mat-icon>
                    <div class="proc-body">
                      <strong>{{ p.name }}</strong>
                      @if (p.outcome) { <span>{{ p.outcome }}</span> }
                    </div>
                  </li>
                }
              </ul>
            </section>
          }

          <!-- Medications -->
          @if (c.medications.length > 0) {
            <section class="d-section">
              <div class="d-sec-head">
                <mat-icon>medication</mat-icon>
                <h4>Medications Prescribed</h4>
              </div>
              <div class="med-list">
                @for (m of c.medications; track m.name) {
                  <div class="med-row">
                    <div class="med-icon"><mat-icon>medication</mat-icon></div>
                    <div class="med-body">
                      <div class="med-top">
                        <strong>{{ m.name }} {{ m.dosage }}</strong>
                        <span class="med-duration">{{ m.duration }}</span>
                      </div>
                      <span class="med-freq">{{ m.frequency }}</span>
                      @if (m.instructions) {
                        <span class="med-instr">
                          <mat-icon>info</mat-icon> {{ m.instructions }}
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>
            </section>
          }

          <!-- Doctor's Notes -->
          @if (c.notes) {
            <section class="d-section">
              <div class="d-sec-head">
                <mat-icon>edit_note</mat-icon>
                <h4>Doctor's Notes</h4>
              </div>
              <p class="d-body-text">{{ c.notes }}</p>
            </section>
          }

          <!-- Follow-up -->
          @if (c.followUp) {
            <section class="d-section follow-up-section">
              <div class="d-sec-head">
                <mat-icon>event_repeat</mat-icon>
                <h4>Follow-up Scheduled</h4>
              </div>
              <div class="follow-card">
                <div class="fu-date">
                  <span>{{ c.followUp.date | date:'MMM' }}</span>
                  <strong>{{ c.followUp.date | date:'d' }}</strong>
                </div>
                <div class="fu-body">
                  <strong>{{ c.followUp.date | date:'fullDate' }}</strong>
                  <span>{{ c.followUp.reason }}</span>
                </div>
              </div>
            </section>
          }
        </div>

        <!-- Sticky footer actions -->
        <footer class="ss-footer">
          <button mat-stroked-button (click)="downloadSummary(c)">
            <mat-icon>download</mat-icon> Download Summary
          </button>
          <button mat-flat-button color="primary" routerLink="/appointments" (click)="closeDetail()">
            <mat-icon>event</mat-icon> Book Follow-up
          </button>
        </footer>
      }
    </aside>
  `,
  styles: [`
    :host { display: block; }
    .cons-container { max-width: 920px; margin: 0 auto; padding-bottom: 40px; }

    /* ===== Header ===== */
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; margin-bottom: 18px; flex-wrap: wrap;
    }
    h1 { font-size: 24px; font-weight: 600; color: #1a237e; margin: 0; }
    .subtitle { color: #607d8b; margin: 4px 0 0; font-size: 13px; }
    .header-stats { display: flex; gap: 8px; }
    .hs-pill {
      display: inline-flex; align-items: center; gap: 6px;
      background: #eef0fb; color: #1a237e;
      padding: 6px 12px; border-radius: 18px;
      font-size: 13px; font-weight: 600;
    }
    .hs-pill mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* ===== Filters ===== */
    .filter-row {
      display: flex; gap: 10px; margin-bottom: 12px; align-items: center;
    }
    .search-box {
      flex: 1; display: flex; align-items: center; gap: 8px;
      padding: 6px 14px; background: #ffffff; border: 1px solid #d0d7de; border-radius: 24px; min-width: 0;
    }
    .sb-icon { color: #5f6b7a; font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .sb-input {
      flex: 1; min-width: 0;
      border: none; outline: none; background: transparent;
      font-size: 14px; font-family: inherit; color: #1b3a4b; padding: 8px 0;
    }
    .sb-input::placeholder { color: #5f6b7a; opacity: 1; }
    .sb-clear { width: 32px !important; height: 32px !important; line-height: 32px !important; flex-shrink: 0; }

    /* ===== Health Snapshot ===== */
    .vitals-section { margin-bottom: 24px; }
    .vs-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    .vs-head h2 { font-size: 16px; font-weight: 600; color: #1b3a4b; margin: 0; }
    .vs-sub { font-size: 12px; color: #90a4ae; margin: 2px 0 0; }
    .vs-record {
      display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
      border: 1.5px solid #cfe0e0; background: #f0fdfa; color: #0d8a8a;
      border-radius: 999px; padding: 7px 13px; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
    }
    .vs-record:hover { background: #e0f2f1; border-color: #80cbc4; }
    .vs-record mat-icon { font-size: 17px; width: 17px; height: 17px; }
    /* Source provenance chip on each vital card */
    .v-source {
      display: inline-flex; align-items: center; gap: 3px; align-self: flex-start;
      font-size: 10px; font-weight: 600; color: #78909c; background: #eceff1;
      padding: 2px 8px; border-radius: 999px;
    }
    .v-source mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .v-source.src-self { color: #5c6bc0; background: #eef0fb; }
    .vitals-scroll {
      display: flex; gap: 12px; overflow-x: auto;
      padding: 4px 2px 8px;
      -webkit-overflow-scrolling: touch; scrollbar-width: none;
    }
    .vitals-scroll::-webkit-scrollbar { display: none; }
    .vital-card {
      flex-shrink: 0; width: 170px;
      padding: 14px; border-radius: 14px;
      background: white; border: 1px solid #eceff1;
      display: flex; flex-direction: column; gap: 8px;
      transition: box-shadow 0.15s;
    }
    .vital-card:hover { box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
    .v-top { display: flex; align-items: center; justify-content: space-between; }
    .v-icon {
      width: 32px; height: 32px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .v-icon mat-icon { color: white; font-size: 16px; width: 16px; height: 16px; }
    .vbg-normal { background: #43a047; }
    .vbg-warning { background: #f57c00; }
    .vbg-critical { background: #d32f2f; }
    .v-trend-chip {
      display: inline-flex; align-items: center; gap: 2px;
      padding: 2px 8px; border-radius: 10px;
      font-size: 10px; font-weight: 600;
    }
    .v-trend-chip mat-icon { font-size: 11px; width: 11px; height: 11px; }
    .tc-normal { background: #e8f5e9; color: #2e7d32; }
    .tc-warning { background: #fff3e0; color: #ef6c00; }
    .tc-critical { background: #fdecea; color: #c62828; }
    .v-label { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #607d8b; font-weight: 600; }
    .v-value-row { display: flex; align-items: baseline; gap: 4px; }
    .v-value { font-size: 22px; font-weight: 700; color: #1b3a4b; line-height: 1; }
    .v-unit { font-size: 11px; color: #90a4ae; }

    .quick-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px; }
    .qp {
      padding: 5px 14px; border-radius: 18px; border: 1.5px solid #ddd;
      background: white; font-size: 12px; font-family: inherit;
      color: #555; cursor: pointer; transition: all 0.15s; font-weight: 500;
    }
    .qp:hover { border-color: #1a237e; color: #1a237e; }
    .qp.active { background: #1a237e; color: white; border-color: #1a237e; }

    /* ===== Timeline ===== */
    .timeline { position: relative; }

    .tl-group { margin-bottom: 24px; }
    .tl-year {
      display: flex; align-items: center; gap: 10px;
      margin: 0 0 14px 8px;
    }
    .tl-year-label {
      font-size: 13px; font-weight: 700; color: #1a237e;
      background: #eef0fb;
      padding: 4px 14px; border-radius: 14px;
      letter-spacing: .03em;
    }
    .tl-year-count { font-size: 12px; color: #90a4ae; }

    .tl-items { position: relative; padding-left: 28px; }
    .tl-items::before {
      content: ''; position: absolute;
      top: 8px; bottom: 8px; left: 10px;
      width: 2px; background: linear-gradient(180deg, #e8eaf6 0%, #eceff1 100%);
    }

    .tl-item { position: relative; padding-bottom: 14px; }
    .tl-item:last-child { padding-bottom: 0; }

    .tl-node {
      position: absolute; left: -28px; top: 18px;
      width: 22px; height: 22px;
      display: flex; align-items: center; justify-content: center;
      background: white; border-radius: 50%;
    }
    .tl-dot {
      width: 12px; height: 12px; border-radius: 50%;
      box-shadow: 0 0 0 3px white, 0 0 0 5px currentColor;
      opacity: 0.85;
    }
    .dot-cardio { color: #c62828; }
    .dot-derm { color: #ad1457; }
    .dot-endo { color: #6a1b9a; }
    .dot-general { color: #2e7d32; }
    .dot-ortho { color: #1565c0; }
    .dot-ent { color: #00897b; }
    .dot-other { color: #455a64; }

    .tl-card {
      display: block; width: 100%; text-align: left;
      background: white; border: 1px solid #eceff1;
      border-radius: 14px; padding: 14px 16px;
      cursor: pointer; transition: all 0.15s;
      font: inherit; color: inherit;
    }
    .tl-card:hover {
      border-color: #c5cae9; transform: translateY(-2px);
      box-shadow: 0 4px 14px rgba(0,0,0,0.06);
    }

    .tl-card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .tl-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      color: white; font-weight: 600; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .av-cardio { background: linear-gradient(135deg, #c62828, #ef5350); }
    .av-derm { background: linear-gradient(135deg, #ad1457, #ec407a); }
    .av-endo { background: linear-gradient(135deg, #6a1b9a, #ab47bc); }
    .av-general { background: linear-gradient(135deg, #2e7d32, #66bb6a); }
    .av-ortho { background: linear-gradient(135deg, #1565c0, #42a5f5); }
    .av-ent { background: linear-gradient(135deg, #00897b, #26a69a); }
    .av-other { background: linear-gradient(135deg, #455a64, #78909c); }

    .tl-card-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .tl-doctor { font-size: 14px; color: #1b3a4b; font-weight: 600; }
    .tl-spec { font-size: 12px; color: #607d8b; }

    .tl-meta {
      display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0;
    }
    .tl-type-chip {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 8px; border-radius: 10px;
      font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em;
    }
    .tl-type-chip mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .tc-in_person { background: #e8eaf6; color: #3949ab; }
    .tc-telehealth { background: #e0f2f1; color: #00897b; }
    .tl-date { font-size: 11px; color: #90a4ae; }

    .tl-dx {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 12px; background: #f6f8fc;
      border-radius: 8px; margin-bottom: 10px;
      font-size: 13px; color: #1b3a4b; font-weight: 500;
    }
    .tl-dx-icon { color: #1a237e; font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }

    .tl-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .chip {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 3px 9px; border-radius: 10px;
      font-size: 11px; font-weight: 600;
    }
    .chip mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .chip-med { background: #fff3e0; color: #e65100; }
    .chip-lab { background: #e0f2f1; color: #00695c; }
    .chip-proc { background: #fce4ec; color: #ad1457; }
    .chip-follow { background: #eef0fb; color: #1a237e; }

    .tl-cta {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 12px; color: #1a237e; font-weight: 600;
    }
    .tl-cta mat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* ===== Empty ===== */
    .empty-state {
      padding: 40px 20px; text-align: center;
      background: #fafbfd; border-radius: 14px; border: 1px dashed #d0d7de;
    }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; color: #b0bec5; }
    .empty-state h3 { margin: 12px 0 4px; color: #1a237e; font-size: 16px; }
    .empty-state p { margin: 0 0 14px; font-size: 13px; color: #607d8b; }

    /* ===== Side sheet ===== */
    .sheet-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.42);
      z-index: 1000; animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .side-sheet {
      /* Start below the sticky app toolbar (mat-toolbar = 64px) so the sheet's
         own header + close button aren't hidden behind the global top bar. */
      position: fixed; top: 64px; right: 0; bottom: 0;
      width: 560px; max-width: 100vw;
      background: white;
      box-shadow: -10px 0 30px rgba(0,0,0,0.18);
      z-index: 1001;
      transform: translateX(100%);
      transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
      display: flex; flex-direction: column;
      visibility: hidden;
    }
    .side-sheet.open { transform: translateX(0); visibility: visible; }

    .ss-head {
      padding: 16px 20px; border-bottom: 1px solid #eceff1;
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-shrink: 0;
      background: linear-gradient(180deg, #f8f9ff 0%, white 100%);
    }
    .ss-head-title { display: flex; gap: 12px; flex: 1; min-width: 0; }
    .ss-avatar {
      width: 48px; height: 48px; border-radius: 50%;
      color: white; font-weight: 600; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .ss-head-info { min-width: 0; }
    .ss-head h3 { margin: 0; font-size: 16px; font-weight: 600; color: #1b3a4b; }
    .ss-head p { margin: 4px 0 0; font-size: 12px; color: #607d8b; }
    .ss-loc {
      display: inline-flex; align-items: center; gap: 4px;
    }
    .ss-loc mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .ss-close { flex-shrink: 0; }

    .ss-body { padding: 18px 20px 6px; overflow-y: auto; flex: 1; }

    .d-section { margin-bottom: 22px; }
    .d-section:last-child { margin-bottom: 0; }
    .d-sec-head {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 10px;
    }
    .d-sec-head mat-icon { color: #1a237e; font-size: 18px; width: 18px; height: 18px; }
    .d-sec-head h4 {
      margin: 0; font-size: 13px; color: #1b3a4b; font-weight: 600;
      text-transform: uppercase; letter-spacing: .04em;
    }
    .d-body-text {
      margin: 0; font-size: 13px; color: #455a64; line-height: 1.6;
      background: #fafbfd; padding: 12px 14px; border-radius: 10px;
    }

    /* Vitals grid */
    .vitals-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
    .vital-pill {
      padding: 10px 12px; background: #fafbfd;
      border-radius: 10px; border: 1px solid #eceff1;
      display: flex; flex-direction: column; gap: 2px;
    }
    .vp-label { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #607d8b; font-weight: 600; }
    .vp-value { font-size: 16px; color: #1b3a4b; font-weight: 700; }
    .vp-value span { font-size: 11px; color: #90a4ae; font-weight: 500; margin-left: 2px; }

    /* Diagnosis */
    .dx-row { display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-start; }
    .dx-row:last-child { margin-bottom: 0; }
    .dx-marker {
      width: 8px; height: 8px; border-radius: 50%;
      background: #cfd8dc; flex-shrink: 0; margin-top: 8px;
    }
    .dx-marker.primary { background: #c62828; }
    .dx-body { flex: 1; }
    .dx-top { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
    .dx-type {
      font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 8px;
      text-transform: uppercase; letter-spacing: .04em;
      background: #eceff1; color: #546e7a;
    }
    .dx-type.primary { background: #fdecea; color: #c62828; }
    .dx-code { font-size: 11px; color: #90a4ae; font-family: monospace; }
    .dx-body p { margin: 0; font-size: 14px; color: #1b3a4b; line-height: 1.4; }

    /* Investigations */
    .inv-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .inv-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; background: white;
      border: 1px solid #eceff1; border-radius: 10px;
    }
    .inv-icon {
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .inv-icon mat-icon { color: white; font-size: 18px; width: 18px; height: 18px; }
    .icat-lab { background: #00897b; }
    .icat-imaging { background: #1565c0; }
    .icat-cardiac { background: #c62828; }
    .icat-other { background: #5e35b1; }
    .inv-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .inv-body strong { font-size: 13px; color: #1b3a4b; }
    .inv-meta { font-size: 11px; color: #90a4ae; }
    .inv-status {
      flex-shrink: 0;
      font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px;
      text-transform: capitalize;
    }
    .inv-st-pending { background: #fff8e1; color: #a07000; }
    .inv-st-completed { background: #e3f2fd; color: #1565c0; }
    .inv-st-reviewed { background: #e8f5e9; color: #2e7d32; }

    /* Procedures */
    .proc-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .proc-row {
      display: flex; gap: 10px; align-items: flex-start;
      padding: 10px 12px; background: #fafbfd;
      border-radius: 10px;
    }
    .proc-icon { color: #2e7d32; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
    .proc-body { display: flex; flex-direction: column; gap: 2px; }
    .proc-body strong { font-size: 13px; color: #1b3a4b; }
    .proc-body span { font-size: 12px; color: #607d8b; }

    /* Medications */
    .med-list { display: flex; flex-direction: column; gap: 8px; }
    .med-row {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 12px 14px; background: white;
      border: 1px solid #eceff1; border-radius: 12px;
    }
    .med-icon {
      width: 36px; height: 36px; border-radius: 10px;
      background: #fff3e0; color: #e65100;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .med-icon mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .med-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .med-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .med-top strong { font-size: 14px; color: #1b3a4b; }
    .med-duration { font-size: 11px; color: #90a4ae; font-weight: 600; flex-shrink: 0; }
    .med-freq { font-size: 12px; color: #455a64; }
    .med-instr {
      display: inline-flex; align-items: center; gap: 4px; margin-top: 2px;
      font-size: 11px; color: #607d8b; font-style: italic;
    }
    .med-instr mat-icon { font-size: 13px; width: 13px; height: 13px; color: #90a4ae; }

    /* Follow-up */
    .follow-up-section { margin-bottom: 0; }
    .follow-card {
      display: flex; align-items: center; gap: 14px;
      padding: 14px; background: linear-gradient(135deg, #eef0fb 0%, #ffffff 100%);
      border: 1px solid #c5cae9; border-radius: 12px;
    }
    .fu-date {
      display: flex; flex-direction: column; align-items: center; gap: 0;
      width: 54px; flex-shrink: 0;
      padding: 6px 0; background: white; border-radius: 10px; border: 1px solid #c5cae9;
    }
    .fu-date span { font-size: 10px; color: #1a237e; text-transform: uppercase; font-weight: 700; letter-spacing: .04em; }
    .fu-date strong { font-size: 22px; color: #1a237e; line-height: 1; }
    .fu-body { display: flex; flex-direction: column; gap: 2px; }
    .fu-body strong { font-size: 13px; color: #1b3a4b; }
    .fu-body span { font-size: 12px; color: #607d8b; }

    /* Sticky footer */
    .ss-footer {
      padding: 14px 20px; display: flex; gap: 10px;
      border-top: 1px solid #eceff1; background: #fafafa;
      flex-shrink: 0;
    }
    .ss-footer button {
      flex: 1;
      font-size: 13px !important; height: 40px !important;
      border-radius: 10px !important;
    }
    .ss-footer button mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    /* ===== Responsive ===== */
    @media (max-width: 720px) {
      h1 { font-size: 20px; }
      .filter-row { flex-direction: column; align-items: stretch; }
      .specialty-select { width: 100%; }
      .tl-meta { align-items: flex-start; }
      .tl-card-head { flex-wrap: wrap; }

      /* Mobile bottom sheet */
      .side-sheet {
        top: auto; right: 0; left: 0; bottom: 0;
        width: 100%; height: 92vh;
        border-radius: 18px 18px 0 0;
        transform: translateY(100%);
      }
      .side-sheet.open { transform: translateY(0); }
    }
  `]
})
export class ConsultationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly vitalsStore = inject(VitalsService);

  readonly vitalsOpen = signal(false);
  openVitals(): void { this.vitalsOpen.set(true); }
  sourceChip(v: VitalSign): string { return sourceChipLabel(v); }

  readonly loading = signal(true);
  readonly consultations = signal<Consultation[]>([]);
  readonly vitals = signal<VitalSign[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly specialtyFilter = signal<string>('all');

  ngOnInit(): void {
    this.api.getConsultations().subscribe(list => {
      this.consultations.set(
        list.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
      this.loading.set(false);
    });
    this.api.getDashboard().subscribe(s => this.vitals.set(s.recentVitals));
  }

  // Health Snapshot = the latest recorded value PER metric, sourced from the
  // actual visit history (consultations are pre-sorted newest-first), so the
  // snapshot can never contradict the "Vitals Recorded" inside the most recent
  // visit. Metrics no visit measured (e.g. fasting glucose — visits track
  // HbA1c instead) fall back to the dashboard's recentVitals so the card still
  // renders. Status is derived from the value itself so the chip always agrees
  // with the number shown, rather than relying on a stale hard-coded flag.
  readonly dashboardVitals = computed<VitalSign[]>(() => {
    const order: VitalSign['type'][] =
      ['blood_pressure', 'glucose', 'heart_rate', 'oxygen', 'temperature', 'weight'];
    const cons = this.consultations();
    const fallback = this.vitals();
    const result: VitalSign[] = [];

    for (const type of order) {
      let vital: VitalSign | null = null;
      // Walk visits newest-first; take the first that recorded this metric.
      for (const c of cons) {
        const rec = c.vitalsRecorded.find(v => this.vitalTypeFromLabel(v.label) === type);
        if (rec) {
          vital = {
            type, value: rec.value, unit: rec.unit ?? '', timestamp: c.date,
            status: this.deriveVitalStatus(type, rec.value, rec.unit ?? '')
          };
          break;
        }
      }
      if (!vital) {
        const fb = fallback.find(v => v.type === type);
        if (fb) vital = fb;
      }
      if (vital) result.push({ ...vital, source: vital.source ?? 'clinic' });
    }
    // Overlay patient self-reported readings: for each metric the newer of
    // {clinic, self} wins and carries its own source chip.
    return this.vitalsStore.merge(result);
  });

  readonly latestVitalDate = computed<string>(() => {
    const v = this.dashboardVitals();
    if (!v.length) return '';
    return v
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
      .timestamp;
  });

  // Map a free-text encounter vital label to a snapshot metric type.
  private vitalTypeFromLabel(label: string): VitalSign['type'] | null {
    const l = label.toLowerCase();
    if (l.includes('blood pressure')) return 'blood_pressure';
    if (l.includes('heart rate') || l.includes('pulse')) return 'heart_rate';
    if (l.includes('temp')) return 'temperature';
    if (l.includes('spo') || l.includes('oxygen')) return 'oxygen';
    if (l.includes('weight')) return 'weight';
    if (l.includes('glucose') || l.includes('sugar')) return 'glucose';
    return null; // e.g. HbA1c — not one of the six snapshot tiles
  }

  // Derive a status band from the value so the trend chip matches the number.
  // Standard adult reference ranges; demo heuristics, not a clinical engine.
  private deriveVitalStatus(type: VitalSign['type'], value: string, unit: string): VitalSign['status'] {
    if (type === 'blood_pressure') {
      const [s, d] = value.split('/').map(n => parseInt(n, 10));
      if (s >= 180 || d >= 120) return 'critical';
      if (s >= 140 || d >= 90) return 'warning';
      return 'normal';
    }
    const n = parseFloat(value);
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

  getVitalIcon(vital: VitalSign): string {
    const m: Record<string, string> = {
      blood_pressure: 'speed', heart_rate: 'favorite', temperature: 'thermostat',
      oxygen: 'air', weight: 'monitor_weight', glucose: 'water_drop'
    };
    return m[vital.type] ?? 'info';
  }

  getVitalLabel(vital: VitalSign): string {
    const m: Record<string, string> = {
      blood_pressure: 'Blood Pressure', heart_rate: 'Heart Rate',
      temperature: 'Temperature', oxygen: 'SpO₂', weight: 'Weight', glucose: 'Glucose'
    };
    return m[vital.type] ?? vital.type;
  }

  trendIcon(vital: VitalSign): string {
    if (vital.status === 'normal') return 'trending_flat';
    if (vital.status === 'warning') return 'trending_up';
    return 'priority_high';
  }

  trendLabel(vital: VitalSign): string {
    if (vital.status === 'normal') return 'Stable';
    if (vital.status === 'warning') return 'Watch';
    return 'Action';
  }

  readonly specialties = computed(() => {
    const set = new Set<string>();
    for (const c of this.consultations()) set.add(c.doctorSpecialty);
    return Array.from(set).sort();
  });

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const sp = this.specialtyFilter();
    return this.consultations().filter(c => {
      if (sp !== 'all' && c.doctorSpecialty !== sp) return false;
      if (!q) return true;
      const hay = (
        c.doctorName + ' ' +
        c.doctorSpecialty + ' ' +
        c.chiefComplaint + ' ' +
        c.diagnosis.map(d => d.description).join(' ')
      ).toLowerCase();
      return hay.includes(q);
    });
  });

  readonly filteredGroups = computed<ConsultationGroup[]>(() => {
    const map = new Map<number, Consultation[]>();
    for (const c of this.filtered()) {
      const year = new Date(c.date).getFullYear();
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(c);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, cons]) => ({
        year,
        label: String(year),
        consultations: cons
      }));
  });

  readonly selectedConsultation = computed<Consultation | undefined>(() => {
    const id = this.selectedId();
    if (!id) return undefined;
    return this.consultations().find(c => c.id === id);
  });

  // ===== Helpers =====
  doctorInitials(name: string): string {
    return name.replace(/Dr\.?\s*/i, '').split(/\s+/).map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase();
  }

  primaryDiagnosis(c: Consultation): string {
    const primary = c.diagnosis.find(d => d.type === 'primary');
    return (primary ?? c.diagnosis[0])?.description ?? '';
  }

  specialtyTheme(specialty: string): string {
    const s = specialty.toLowerCase();
    if (s.includes('cardio')) return 'cardio';
    if (s.includes('derm')) return 'derm';
    if (s.includes('endo')) return 'endo';
    if (s.includes('general')) return 'general';
    if (s.includes('ortho')) return 'ortho';
    if (s.includes('ent') || s.includes('otolaryng')) return 'ent';
    return 'other';
  }

  investigationIcon(category: string): string {
    const m: Record<string, string> = {
      lab: 'science',
      imaging: 'image_search',
      cardiac: 'monitor_heart',
      other: 'assignment'
    };
    return m[category] ?? 'assignment';
  }

  statusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  // ===== Actions =====
  openDetail(c: Consultation): void {
    this.selectedId.set(c.id);
  }

  closeDetail(): void {
    this.selectedId.set(null);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.specialtyFilter.set('all');
  }

  downloadSummary(c: Consultation): void {
    this.snackBar.open(
      `Summary for ${c.doctorName} on ${new Date(c.date).toLocaleDateString()} — download will be available soon`,
      'Close',
      { duration: 3500 }
    );
  }
}
