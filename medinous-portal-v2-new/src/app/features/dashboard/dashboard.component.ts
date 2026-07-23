import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, signal, computed, effect, ViewChild, TemplateRef, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { ApiService } from '../../core/services/api.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { DashboardSummary, VitalSign, Appointment, AlertItem, Consultation, ConsultationInvestigation } from '../../core/models/patient.model';

type CareItemKind = 'lab-ready' | 'lab-prescribed' | 'followup';

interface CareItem {
  id: string;
  kind: CareItemKind;
  title: string;            // e.g. "HbA1c results ready"
  doctorName: string;
  doctorSpecialty: string;
  consultationId: string;
  consultationDate: string;
  /** Date driving the calendar tile (result date / follow-up date / consultation date as fallback). */
  actionDate: string;
  /** Lab category for icon color (undefined for follow-ups). */
  category?: 'lab' | 'imaging' | 'cardiac' | 'other';
  /** What the calendar tile labels itself as ("Result", "Follow-up", "Since"). */
  tileLabel: string;
  /** Exact investigation name (for labs) — used to look up the report. */
  labName?: string;
}

interface ReportContext {
  consultation: Consultation;
  investigation: ConsultationInvestigation;
}

interface SpecialtyTile {
  name: string;
  icon: string;
  color: string;
  doctors: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatChipsModule,
    MatProgressBarModule, MatDividerModule, MatTooltipModule, MatSnackBarModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    SkeletonLoaderComponent, SkeletonCardComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dash">
      @if (loading()) {
        <app-skeleton-loader [count]="2" height="28px" [widths]="['50%', '70%']" />
        <div class="skeleton-grid">
          @for (i of [1,2,3]; track i) { <app-skeleton-card [lines]="3" /> }
        </div>
        <app-skeleton-card [lines]="4" />
      } @else {
        @if (data(); as d) {

          <!-- Greeting -->
          <header class="greeting">
            <h1>Good {{ timeOfDay() }}, {{ d.patient.firstName }}</h1>
            <p class="greeting-sub">Here's your health journey today.</p>
          </header>

          <!-- ============================================ -->
          <!-- 1. UPCOMING APPOINTMENT (top if exists)      -->
          <!-- ============================================ -->
          @if (nextAppt(); as appt) {
            <section class="section appt-section">
              <h2>Upcoming Appointment</h2>
              <article class="appt-premium">
                <div class="ap-left">
                  <div class="ap-avatar">{{ doctorInitials(appt.doctorName) }}</div>
                  <span class="ap-status" [class]="'aps-' + apptWhen(appt)">
                    {{ apptWhenLabel(appt) }}
                  </span>
                </div>
                <div class="ap-body">
                  <div class="ap-name-row">
                    <strong class="ap-name">{{ appt.doctorName }}</strong>
                    <span class="ap-type-chip" [class]="'apt-' + appt.type">
                      <mat-icon>{{ appt.type === 'telehealth' ? 'videocam' : 'local_hospital' }}</mat-icon>
                      {{ appt.type === 'telehealth' ? 'Video Consultation' : 'In-person' }}
                    </span>
                  </div>
                  <span class="ap-spec">{{ appt.specialty }}</span>
                  <div class="ap-meta">
                    <mat-icon>schedule</mat-icon>
                    <span>{{ appt.date | date:'fullDate' }} · {{ appt.time }}</span>
                  </div>
                  <div class="ap-meta">
                    <mat-icon>place</mat-icon>
                    <span>{{ appt.location }}</span>
                  </div>
                </div>
                <div class="ap-top-actions">
                  <button mat-flat-button color="primary" class="ap-manage" (click)="openManage()">
                    Manage Booking
                  </button>
                </div>
              </article>
            </section>
          }

          <!-- ============================================ -->
          <!-- 2. QUICK ACTIONS                             -->
          <!-- ============================================ -->
          <section class="section quick-section">
            <h2 class="visually-bold">Quick Actions</h2>
            <div class="quick-grid">
              @for (chip of actionChips; track chip.label) {
                <a class="quick-pill" [routerLink]="chip.route">
                  <div class="qp-icon" [style.background]="chip.color">
                    <mat-icon>{{ chip.icon }}</mat-icon>
                  </div>
                  <span>{{ chip.label }}</span>
                </a>
              }
            </div>
          </section>

          <!-- ============================================ -->
          <!-- 3. WHAT'S NEXT (concise — labs + follow-ups) -->
          <!-- ============================================ -->
          @if (careItems().length > 0) {
            <section class="section whats-next-section">
              <div class="sec-head">
                <div class="sec-titles">
                  <h2>What's Next</h2>
                  <p class="sec-sub">Open results, requested tests and upcoming follow-ups</p>
                </div>
                <a class="sec-link" routerLink="/consultations">
                  See all <mat-icon>arrow_forward</mat-icon>
                </a>
              </div>

              <div class="hscroll care-scroll">
                @for (item of careItems(); track item.id) {
                  <button class="care-card" [class]="'kind-' + item.kind" (click)="runCareItem(item)">
                    <div class="care-date-tile" [class]="'tile-' + item.kind">
                      <span class="cd-label">{{ item.tileLabel }}</span>
                      <span class="cd-month">{{ item.actionDate | date:'MMM' }}</span>
                      <strong class="cd-day">{{ item.actionDate | date:'d' }}</strong>
                    </div>
                    <div class="care-body">
                      <strong class="cb-title">{{ item.title }}</strong>
                      <div class="cb-doctor-row">
                        <div class="cb-avatar" [class]="'av-' + specialtyTheme(item.doctorSpecialty)">
                          {{ doctorInitials(item.doctorName) }}
                        </div>
                        <span class="cb-doc-text">
                          {{ item.doctorName }} · {{ item.consultationDate | date:'MMM d' }}
                        </span>
                      </div>
                      <span class="cb-cta">
                        {{ kindCta(item.kind) }}
                        <mat-icon>arrow_forward</mat-icon>
                      </span>
                    </div>
                  </button>
                }
              </div>
            </section>
          }

          <!-- ============================================ -->
          <!-- 4. NEED HELP BANNER                          -->
          <!-- ============================================ -->
          <a class="help-banner" [href]="'tel:' + hospitalPhoneRaw" aria-label="Call hospital">
            <div class="hb-illo">
              <mat-icon>support_agent</mat-icon>
            </div>
            <div class="hb-body">
              <strong>Need help?</strong>
              <span>Talk to our care team · available 24/7 · {{ hospitalPhone }}</span>
            </div>
            <span class="hb-cta">
              <mat-icon>call</mat-icon>
              Call Now
            </span>
          </a>

          <!-- ============================================ -->
          <!-- 5. MEDICATIONS LINK CARD (compact)           -->
          <!-- ============================================ -->
          <a class="meds-link-card" routerLink="/medications">
            <div class="ml-illo">
              <mat-icon>medication</mat-icon>
            </div>
            <div class="ml-body">
              <strong>Your Medications</strong>
              <span>
                {{ d.activeMedications.length }} active prescription{{ d.activeMedications.length === 1 ? '' : 's' }}
                @if (medsTakenToday() > 0) {
                  · {{ medsTakenToday() }} taken today
                }
              </span>
            </div>
            <div class="ml-progress">
              <div class="ml-bar" [style.width.%]="medsAdherence()"></div>
              <span class="ml-adh">{{ medsAdherence() }}%</span>
            </div>
            <mat-icon class="ml-arrow">arrow_forward</mat-icon>
          </a>

          <!-- ============================================ -->
          <!-- 7. CONSULT BY SPECIALTY                      -->
          <!-- ============================================ -->
          <section class="section specialty-section">
            <div class="sec-head">
              <div class="sec-titles">
                <h2>Consult a Doctor</h2>
                <p class="sec-sub">Choose a specialty to find the right doctor</p>
              </div>
              <a class="sec-link" routerLink="/appointments">
                All doctors <mat-icon>arrow_forward</mat-icon>
              </a>
            </div>
            <div class="specialty-grid">
              @for (sp of specialtyTiles; track sp.name) {
                <a class="specialty-tile" [routerLink]="['/appointments']"
                   [queryParams]="{ specialty: sp.name }">
                  <div class="sp-icon" [style.background]="sp.color">
                    <mat-icon>{{ sp.icon }}</mat-icon>
                  </div>
                  <strong class="sp-name">{{ sp.name }}</strong>
                  <span class="sp-meta">{{ sp.doctors }} doctor{{ sp.doctors === 1 ? '' : 's' }}</span>
                </a>
              }
            </div>
          </section>

        }
      }

      <!-- ============================================ -->
      <!-- STICKY CSAT STRIP (bottom)                   -->
      <!-- ============================================ -->
      @if (!feedbackDismissed()) {
        <div class="csat-strip" role="region" aria-label="Quick feedback">
          <div class="csat-inner">
            <span class="csat-text">How was your experience today?</span>
            <div class="csat-stars">
              @for (s of [1,2,3,4,5]; track s) {
                <button mat-icon-button class="csat-star" [class.on]="feedbackRating() >= s"
                        (click)="startFeedback(s)" [attr.aria-label]="s + ' star'">
                  <mat-icon>{{ feedbackRating() >= s ? 'star' : 'star_border' }}</mat-icon>
                </button>
              }
            </div>
            <button mat-icon-button class="csat-x" (click)="feedbackDismissed.set(true)"
                    aria-label="Dismiss feedback">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>
      }
    </div>

    <!-- ============================================ -->
    <!-- FEEDBACK FORM (rendered via CDK overlay)     -->
    <!-- Wrapped in <ng-template> so we can teleport  -->
    <!-- it to body level via Overlay + TemplatePortal-->
    <!-- (escapes <mat-sidenav-content>'s transform   -->
    <!-- containing block, which traps position:fixed -->
    <!-- and breaks the dialog on desktop + mobile).  -->
    <!-- ============================================ -->
    <ng-template #feedbackFormTpl>
    <div class="feedback-form" role="dialog" aria-modal="true">
      <header class="ff-head">
        <div class="ff-head-text">
          <h3>How was your overall experience at the hospital?</h3>
          <p>Your feedback helps us improve care for everyone.</p>
        </div>
        <button mat-icon-button class="ff-close" (click)="closeFeedbackForm()" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <div class="ff-body">
        <!-- Rating -->
        <label class="ff-label">Your rating</label>
        <div class="ff-stars">
          @for (s of [1,2,3,4,5]; track s) {
            <button mat-icon-button class="ff-star" [class.on]="feedbackRating() >= s"
                    (click)="feedbackRating.set(s)" [attr.aria-label]="s + ' star'">
              <mat-icon>{{ feedbackRating() >= s ? 'star' : 'star_border' }}</mat-icon>
            </button>
          }
          <span class="ff-rating-label">{{ ratingWord(feedbackRating()) }}</span>
        </div>

        <!-- What this feedback is about — the visit being reviewed.
             REQ 8.6.5 lists every eligible appointment; 8.6.6 shows the
             identifying details (doctor, specialty, date, time, type);
             8.6.7 always surfaces the time so two visits with the same
             doctor on the same day stay distinguishable; 8.6.8 selecting
             a row targets the feedback at that appointment. -->
        <label class="ff-label">Which visit is this feedback for?</label>
        <mat-form-field appearance="outline" class="ff-full" subscriptSizing="dynamic">
          <mat-select [ngModel]="ffVisit()" (ngModelChange)="ffVisit.set($event)"
                      panelClass="ff-visit-panel" placeholder="Select a visit">
            <mat-select-trigger>{{ selectedVisitLabel() }}</mat-select-trigger>

            <mat-option value="general">General hospital experience</mat-option>

            @for (c of eligibleFeedbackAppointments(); track c.id) {
              <mat-option [value]="c.id">
                <span class="ff-opt-name">{{ c.doctorName }}</span>
                <span class="ff-opt-meta">
                  {{ c.doctorSpecialty }} · {{ c.date | date:'d MMM yyyy' }} ·
                  {{ c.date | date:'h:mm a' }} · {{ feedbackTypeLabel(c.type) }}
                </span>
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- What went well -->
        <label class="ff-label">What went well?</label>
        <div class="ff-tag-grid">
          @for (tag of positiveTags; track tag) {
            <button class="ff-tag" [class.on]="ffPositives().has(tag)"
                    (click)="togglePositive(tag)">{{ tag }}</button>
          }
        </div>

        <!-- What could be better -->
        <label class="ff-label">What could be better?</label>
        <div class="ff-tag-grid">
          @for (tag of negativeTags; track tag) {
            <button class="ff-tag" [class.on]="ffNegatives().has(tag)"
                    (click)="toggleNegative(tag)">{{ tag }}</button>
          }
        </div>

        <!-- Comments -->
        <label class="ff-label">Any specific comments? <span class="ff-optional">(optional)</span></label>
        <textarea class="ff-textarea" rows="3" placeholder="Tell us more — anonymous and confidential"
                  [ngModel]="ffComments()" (ngModelChange)="ffComments.set($event)"></textarea>
      </div>

      <footer class="ff-footer">
        <button mat-stroked-button (click)="closeFeedbackForm()">Cancel</button>
        <button mat-flat-button color="primary"
                [disabled]="!feedbackRating()"
                (click)="submitFullFeedback()">
          Submit Feedback
        </button>
      </footer>
    </div>
    </ng-template>

    <!-- ============================================ -->
    <!-- LAB REPORT SIDE SHEET                        -->
    <!-- ============================================ -->
    @if (reportContext()) {
      <div class="sheet-backdrop" (click)="closeReport()"></div>
    }
    <aside class="side-sheet report-sheet" [class.open]="!!reportContext()" aria-label="Lab report">
      @if (reportContext(); as ctx) {
        <header class="ss-head">
          <div class="ss-head-title">
            <mat-icon>{{ ctx.investigation.category === 'imaging' ? 'image_search' : (ctx.investigation.category === 'cardiac' ? 'monitor_heart' : 'science') }}</mat-icon>
            <div class="ss-head-info">
              <h3>{{ ctx.investigation.name }}</h3>
              <p>Result {{ ctx.investigation.resultDate | date:'mediumDate' }}</p>
            </div>
          </div>
          <button mat-icon-button class="ss-close" (click)="closeReport()">
            <mat-icon>close</mat-icon>
          </button>
        </header>

        <div class="ss-body">
          <!-- Source consultation block -->
          <button class="report-source" (click)="goToConsultation(ctx.consultation.id)">
            <div class="rs-avatar" [class]="'av-' + specialtyTheme(ctx.consultation.doctorSpecialty)">
              {{ doctorInitials(ctx.consultation.doctorName) }}
            </div>
            <div class="rs-text">
              <strong>{{ ctx.consultation.doctorName }}</strong>
              <span>{{ ctx.consultation.doctorSpecialty }} · Requested at consultation on {{ ctx.consultation.date | date:'mediumDate' }}</span>
            </div>
            <mat-icon class="rs-arrow">arrow_forward</mat-icon>
          </button>

          <!-- Summary -->
          @if (ctx.investigation.result?.summary) {
            <section class="report-block">
              <div class="rb-head">
                <mat-icon>summarize</mat-icon>
                <h4>Summary</h4>
              </div>
              <p class="rb-text">{{ ctx.investigation.result?.summary }}</p>
            </section>
          }

          <!-- Result parameters -->
          @if ((ctx.investigation.result?.parameters?.length ?? 0) > 0) {
            <section class="report-block">
              <div class="rb-head">
                <mat-icon>biotech</mat-icon>
                <h4>Results</h4>
              </div>
              <div class="param-table">
                <div class="pt-row pt-head">
                  <span>Parameter</span>
                  <span>Value</span>
                  <span>Reference</span>
                </div>
                @for (p of ctx.investigation.result?.parameters; track p.name) {
                  <div class="pt-row">
                    <span class="pt-name">{{ p.name }}</span>
                    <span class="pt-value">
                      <strong [class]="'flag-' + p.flag">{{ p.value }}</strong>
                      @if (p.unit) { <small>{{ p.unit }}</small> }
                      @if (p.flag !== 'normal') {
                        <span class="flag-chip" [class]="'flag-chip-' + p.flag">{{ flagLabel(p.flag) }}</span>
                      }
                    </span>
                    <span class="pt-range">{{ p.range }}</span>
                  </div>
                }
              </div>
            </section>
          } @else if (!ctx.investigation.result?.summary) {
            <section class="report-block">
              <p class="rb-text">A detailed report is being prepared. Check back shortly.</p>
            </section>
          }
        </div>

        <footer class="ss-footer">
          <button mat-stroked-button (click)="actionPlaceholder('Downloading PDF')">
            <mat-icon>download</mat-icon> Download PDF
          </button>
          <button mat-flat-button color="primary" (click)="openInRecords(ctx.investigation.name)">
            <mat-icon>folder_open</mat-icon> Open in My Records
          </button>
        </footer>
      }
    </aside>

    <!-- ============================================ -->
    <!-- MANAGE BOOKING SIDE SHEET                    -->
    <!-- ============================================ -->
    @if (manageOpen()) {
      <div class="sheet-backdrop" (click)="closeManage()"></div>
    }
    <aside class="side-sheet" [class.open]="manageOpen()" aria-label="Manage Booking">
      @if (nextAppt(); as appt) {
        <header class="ss-head">
          <div class="ss-head-title">
            <mat-icon>event</mat-icon>
            <div>
              <h3>Manage Booking</h3>
              <p>{{ appt.doctorName }} · {{ appt.date | date:'mediumDate' }} at {{ appt.time }}</p>
            </div>
          </div>
          <button mat-icon-button class="ss-close" (click)="closeManage()">
            <mat-icon>close</mat-icon>
          </button>
        </header>

        <div class="ss-body">
          @if (appt.type === 'telehealth') {
            <button class="mb-action mb-primary" (click)="actionPlaceholder('Joining video call')">
              <div class="mb-icon mb-bg-teal"><mat-icon>videocam</mat-icon></div>
              <div class="mb-text">
                <strong>Join Video Consultation</strong>
                <span>Link opens 10 minutes before the appointment</span>
              </div>
              <mat-icon class="mb-arrow">chevron_right</mat-icon>
            </button>
          }
          <button class="mb-action" (click)="actionPlaceholder('Opening details')">
            <div class="mb-icon mb-bg-indigo"><mat-icon>info</mat-icon></div>
            <div class="mb-text">
              <strong>View Appointment Details</strong>
              <span>Doctor, location, fee, preparation notes</span>
            </div>
            <mat-icon class="mb-arrow">chevron_right</mat-icon>
          </button>
          <button class="mb-action" (click)="actionPlaceholder('Reschedule flow')">
            <div class="mb-icon mb-bg-amber"><mat-icon>event_repeat</mat-icon></div>
            <div class="mb-text">
              <strong>Reschedule</strong>
              <span>Pick a new date or time</span>
            </div>
            <mat-icon class="mb-arrow">chevron_right</mat-icon>
          </button>
          <button class="mb-action" (click)="navigate('/payments')">
            <div class="mb-icon mb-bg-green"><mat-icon>payments</mat-icon></div>
            <div class="mb-text">
              <strong>Pay Consultation Fee</strong>
              <span>Settle in advance to skip the counter</span>
            </div>
            <mat-icon class="mb-arrow">chevron_right</mat-icon>
          </button>
          <button class="mb-action mb-danger" (click)="actionPlaceholder('Cancel flow')">
            <div class="mb-icon mb-bg-red"><mat-icon>cancel</mat-icon></div>
            <div class="mb-text">
              <strong>Cancel Booking</strong>
              <span>Free cancellation up to 4 hours before</span>
            </div>
            <mat-icon class="mb-arrow">chevron_right</mat-icon>
          </button>
        </div>
      }
    </aside>
  `,
  styles: [`
    :host { display: block; }
    .dash {
      max-width: 920px; margin: 0 auto;
      /* leave room for the sticky CSAT strip + safe-area */
      padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
    }
    .skeleton-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }

    /* ===== Greeting ===== */
    .greeting { margin-bottom: 20px; }
    .greeting h1 { font-size: 24px; font-weight: 600; color: #1a237e; margin: 0; letter-spacing: -0.01em; }
    .greeting-sub { color: #607d8b; margin: 4px 0 0; font-size: 14px; }

    /* ===== Section ===== */
    .section { margin-bottom: 28px; }
    .sec-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px; gap: 12px;
    }
    .sec-titles { flex: 1; min-width: 0; }
    .section h2 { font-size: 16px; font-weight: 600; color: #1b3a4b; margin: 0; }
    .sec-sub { font-size: 12px; color: #888; margin: 2px 0 0; }
    .sec-link {
      display: inline-flex; align-items: center; gap: 4px;
      color: #1a237e; font-size: 13px; font-weight: 500; text-decoration: none;
    }
    .sec-link mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .sec-link:hover { color: #283593; }

    /* ===== Horizontal scrollers ===== */
    .hscroll {
      display: flex; gap: 12px; overflow-x: auto;
      padding: 4px 2px 8px;
      -webkit-overflow-scrolling: touch; scrollbar-width: none;
    }
    .hscroll::-webkit-scrollbar { display: none; }

    /* ===== Quick Actions (top) ===== */
    .quick-section h2 { margin-bottom: 12px; }
    .quick-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 10px;
    }
    .quick-pill {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 16px 8px; background: white;
      border: 1px solid #eceff1; border-radius: 14px;
      text-decoration: none; color: #1b3a4b;
      cursor: pointer; transition: all 0.15s;
    }
    .quick-pill:hover {
      border-color: #c5cae9; box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      transform: translateY(-1px);
    }
    .qp-icon {
      width: 40px; height: 40px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .qp-icon mat-icon { color: white; font-size: 20px; width: 20px; height: 20px; }
    .quick-pill span { font-size: 12px; font-weight: 500; text-align: center; }

    /* ===== Premium Appointment Card ===== */
    .appt-premium {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: flex-start;
      gap: 16px; padding: 20px;
      background: linear-gradient(135deg, #f8f9ff 0%, #eef0fb 100%);
      border: 1px solid #e3e7f5;
      border-radius: 16px;
    }
    .ap-left { display: flex; flex-direction: column; align-items: center; gap: 10px; flex-shrink: 0; }
    .ap-avatar {
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, #1a237e, #3949ab);
      color: white; font-weight: 600; font-size: 18px;
      display: flex; align-items: center; justify-content: center;
    }
    .ap-status {
      font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 10px;
      text-transform: uppercase; letter-spacing: .04em;
    }
    .aps-today { background: #fff3e0; color: #e65100; }
    .aps-tomorrow { background: #e8f5e9; color: #2e7d32; }
    .aps-upcoming { background: #e8eaf6; color: #3949ab; }
    .ap-body { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
    .ap-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .ap-name { font-size: 16px; color: #1b3a4b; font-weight: 600; }
    .ap-type-chip {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 10px;
    }
    .ap-type-chip mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .apt-in_person { background: #e8eaf6; color: #3949ab; }
    .apt-telehealth { background: #e0f2f1; color: #00897b; }
    .ap-spec { font-size: 13px; color: #607d8b; margin-bottom: 4px; }
    .ap-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #546e7a; }
    .ap-meta mat-icon { font-size: 15px; width: 15px; height: 15px; color: #90a4ae; }

    /* Top-right action cluster — calendar icon + Manage Booking */
    .ap-top-actions {
      display: flex; align-items: center; gap: 8px;
      flex-shrink: 0;
    }
    .ap-icon-btn {
      width: 36px !important; height: 36px !important;
      line-height: 36px !important;
      background: white !important;
      border: 1px solid #e3e7f5 !important;
      border-radius: 10px !important;
    }
    .ap-icon-btn mat-icon { color: #1a237e; font-size: 18px; width: 18px; height: 18px; }
    .ap-manage {
      font-weight: 600 !important; border-radius: 10px !important;
      height: 36px !important; padding: 0 18px !important;
      font-size: 13px !important;
    }

    /* ===== What's Next (concise unified cards) ===== */
    .care-scroll { padding: 4px 2px 12px; }
    .care-card {
      flex-shrink: 0; width: 240px;
      display: flex; gap: 12px;
      padding: 12px; background: white;
      border: 1px solid #eceff1; border-radius: 14px;
      text-align: left; font: inherit; cursor: pointer; color: inherit;
      transition: all 0.15s;
    }
    .care-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 14px rgba(0,0,0,0.06);
      border-color: #c5cae9;
    }

    /* Calendar tile (left) — colored per kind */
    .care-date-tile {
      width: 56px; flex-shrink: 0;
      display: flex; flex-direction: column; align-items: center;
      padding: 6px 4px 8px;
      border-radius: 10px; border: 1px solid transparent;
    }
    .cd-label {
      font-size: 8px; text-transform: uppercase; letter-spacing: .06em;
      font-weight: 700; padding-bottom: 2px;
    }
    .cd-month { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; font-weight: 700; }
    .cd-day { font-size: 20px; line-height: 1.05; font-weight: 700; }

    .tile-lab-ready {
      background: linear-gradient(180deg, #e0f2f1 0%, #f0fdfb 100%);
      border-color: #b2dfdb;
      color: #00695c;
    }
    .tile-lab-prescribed {
      background: linear-gradient(180deg, #fff3e0 0%, #fffaf0 100%);
      border-color: #ffe0b2;
      color: #e65100;
    }
    .tile-followup {
      background: linear-gradient(180deg, #eef0fb 0%, #f8f9ff 100%);
      border-color: #c5cae9;
      color: #1a237e;
    }

    /* Body */
    .care-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; justify-content: space-between; }
    .cb-title {
      font-size: 13px; color: #1b3a4b; font-weight: 600; line-height: 1.3;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .cb-doctor-row {
      display: flex; align-items: center; gap: 6px;
      min-width: 0;
    }
    .cb-avatar {
      width: 22px; height: 22px; border-radius: 50%;
      color: white; font-weight: 700; font-size: 9px;
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
    .cb-doc-text {
      font-size: 11px; color: #607d8b;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .cb-cta {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 11px; color: #1a237e; font-weight: 600;
    }
    .cb-cta mat-icon { font-size: 13px; width: 13px; height: 13px; }

    /* ===== Vital cards ===== */
    .vitals-scroll { padding: 4px 2px 12px; }
    .vital-card {
      flex-shrink: 0; width: 180px;
      padding: 16px; border-radius: 14px;
      background: white; border: 1px solid #eceff1;
      display: flex; flex-direction: column; gap: 8px;
      transition: box-shadow 0.15s;
    }
    .vital-card:hover { box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
    .v-top { display: flex; align-items: center; justify-content: space-between; }
    .v-icon {
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .v-icon mat-icon { color: white; font-size: 18px; width: 18px; height: 18px; }
    .vbg-normal { background: #43a047; }
    .vbg-warning { background: #f57c00; }
    .vbg-critical { background: #d32f2f; }
    .v-trend-chip {
      display: inline-flex; align-items: center; gap: 2px;
      padding: 2px 8px; border-radius: 10px;
      font-size: 11px; font-weight: 600;
    }
    .v-trend-chip mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .tc-normal { background: #e8f5e9; color: #2e7d32; }
    .tc-warning { background: #fff3e0; color: #ef6c00; }
    .tc-critical { background: #fdecea; color: #c62828; }
    .v-label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #607d8b; font-weight: 600; }
    .v-value-row { display: flex; align-items: baseline; gap: 4px; }
    .v-value { font-size: 24px; font-weight: 700; color: #1b3a4b; line-height: 1; }
    .v-unit { font-size: 12px; color: #90a4ae; }
    .v-time { font-size: 11px; color: #b0bec5; }

    /* ===== Medications link card ===== */
    /* ===== Need Help banner ===== */
    .help-banner {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 18px; margin-bottom: 24px;
      background: linear-gradient(135deg, #e0f2f1 0%, #ffffff 100%);
      border: 1px solid #b2dfdb; border-radius: 14px;
      text-decoration: none; color: inherit;
      transition: all 0.15s;
    }
    .help-banner:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(0,137,123,0.12);
    }
    .hb-illo {
      width: 44px; height: 44px; border-radius: 12px;
      background: linear-gradient(135deg, #00897b, #26a69a);
      color: white;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .hb-illo mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .hb-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .hb-body strong { font-size: 14px; color: #00695c; font-weight: 700; }
    .hb-body span { font-size: 12px; color: #455a64; }
    .hb-cta {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 10px;
      background: #00897b; color: white;
      font-size: 13px; font-weight: 600;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0,137,123,0.25);
    }
    .hb-cta mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .help-banner:hover .hb-cta { background: #00796b; }

    .meds-link-card {
      display: flex; align-items: center; gap: 14px;
      padding: 16px 18px; margin-bottom: 28px;
      background: linear-gradient(135deg, #fff8f0 0%, #ffffff 100%);
      border: 1px solid #ffe0b2; border-radius: 14px;
      text-decoration: none; color: inherit;
      cursor: pointer; transition: all 0.15s;
    }
    .meds-link-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(0,0,0,0.06);
    }
    .ml-illo {
      width: 44px; height: 44px; border-radius: 12px;
      background: linear-gradient(135deg, #ef6c00, #f57c00);
      color: white;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .ml-illo mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .ml-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .ml-body strong { font-size: 14px; color: #1b3a4b; }
    .ml-body span { font-size: 12px; color: #607d8b; }
    .ml-progress {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      width: 70px; flex-shrink: 0;
    }
    .ml-progress {
      position: relative;
      width: 70px; height: 6px; background: #fff3e0;
      border-radius: 3px; overflow: hidden;
    }
    .ml-bar {
      position: absolute; left: 0; top: 0; bottom: 0;
      background: linear-gradient(90deg, #ef6c00, #f57c00);
      border-radius: 3px;
      transition: width 0.3s ease;
    }
    .ml-adh {
      position: absolute; top: -18px; right: 0;
      font-size: 11px; font-weight: 700; color: #ef6c00;
    }
    .ml-arrow { color: #90a4ae; flex-shrink: 0; }

    /* ===== Consult by Specialty ===== */
    .specialty-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
      gap: 10px;
    }
    .specialty-tile {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 18px 10px;
      background: white; border: 1px solid #eceff1; border-radius: 14px;
      text-decoration: none; color: inherit;
      cursor: pointer; transition: all 0.15s;
    }
    .specialty-tile:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 14px rgba(0,0,0,0.06);
      border-color: #c5cae9;
    }
    .sp-icon {
      width: 48px; height: 48px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
    }
    .sp-icon mat-icon { color: white; font-size: 24px; width: 24px; height: 24px; }
    .sp-name { font-size: 13px; color: #1b3a4b; text-align: center; }
    .sp-meta { font-size: 11px; color: #90a4ae; }

    /* ===== Sticky CSAT strip (bottom) ===== */
    .csat-strip {
      position: fixed; bottom: 0; left: 0; right: 0;
      z-index: 50;
      padding: 10px 16px env(safe-area-inset-bottom, 10px);
      pointer-events: none; /* let inner element handle clicks */
    }
    .csat-inner {
      pointer-events: auto;
      max-width: 920px; margin: 0 auto;
      display: flex; align-items: center; gap: 10px;
      padding: 8px 14px;
      background: white;
      border: 1px solid #e3e7f5;
      border-radius: 14px;
      box-shadow: 0 6px 24px rgba(26, 35, 126, 0.08);
    }
    .csat-text { flex: 1; font-size: 13px; color: #1b3a4b; font-weight: 500; min-width: 0; }
    .csat-stars { display: flex; gap: 0; flex-shrink: 0; }
    .csat-star {
      width: 32px !important; height: 32px !important; line-height: 32px !important;
      color: #cfd8dc !important;
    }
    .csat-star.on { color: #ffc107 !important; }
    .csat-star mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .csat-x {
      width: 28px !important; height: 28px !important; line-height: 28px !important;
      flex-shrink: 0; color: #90a4ae !important;
    }
    .csat-x mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* ===== Feedback Form =====
       Rendered into the CDK overlay container at body level — overlay
       handles positioning (centred + 12px from top) and backdrop. We only
       need to style the dialog box itself. Mobile full-screen override
       lives in styles.scss on .feedback-form-panel (sibling rule). */
    .feedback-form {
      width: min(560px, calc(100vw - 24px));
      max-height: calc(100vh - 24px);
      background: white;
      border-radius: 18px;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
      display: flex; flex-direction: column;
      animation: feedback-slide-in 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    @keyframes feedback-slide-in {
      from { transform: translateY(-16px); opacity: 0; }
      to   { transform: translateY(0); opacity: 1; }
    }

    .ff-head {
      padding: 18px 20px 14px;
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
      border-bottom: 1px solid #eceff1;
      flex-shrink: 0;
    }
    .ff-head-text { flex: 1; min-width: 0; }
    .ff-head h3 {
      margin: 0; font-size: 17px; font-weight: 600; color: #1b3a4b;
      line-height: 1.3;
    }
    .ff-head p { margin: 4px 0 0; font-size: 13px; color: #607d8b; }
    .ff-close { flex-shrink: 0; }

    .ff-body {
      padding: 16px 20px 4px;
      overflow-y: auto;
      flex: 1;
      display: flex; flex-direction: column; gap: 6px;
    }

    .ff-label {
      display: block;
      font-size: 12px; font-weight: 600; color: #455a64;
      text-transform: uppercase; letter-spacing: .04em;
      margin: 12px 0 6px;
    }
    .ff-optional {
      text-transform: none; letter-spacing: 0;
      color: #b0bec5; font-weight: 500;
    }
    .ff-full { width: 100%; }
    .ff-full ::ng-deep .mat-mdc-text-field-wrapper { background: white; }
    .ff-full ::ng-deep .mat-mdc-form-field-infix {
      min-height: 40px; padding-top: 10px !important; padding-bottom: 10px !important;
    }

    .ff-stars {
      display: flex; align-items: center; gap: 4px;
      margin: 2px 0 4px;
    }
    .ff-star {
      width: 40px !important; height: 40px !important; line-height: 40px !important;
      color: #cfd8dc !important;
    }
    .ff-star.on { color: #ffc107 !important; }
    .ff-star mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .ff-rating-label {
      margin-left: 8px; font-size: 13px; color: #607d8b; font-weight: 600;
    }

    .ff-tag-grid {
      display: flex; flex-wrap: wrap; gap: 6px;
      margin-bottom: 4px;
    }
    .ff-tag {
      padding: 6px 12px; border-radius: 18px;
      border: 1.5px solid #e0e4ea; background: white;
      color: #455a64; font-size: 12px; font-family: inherit; font-weight: 500;
      cursor: pointer; transition: all 0.15s;
    }
    .ff-tag:hover { border-color: #c5cae9; color: #1a237e; }
    .ff-tag.on { background: #eef0fb; border-color: #1a237e; color: #1a237e; font-weight: 600; }

    .ff-textarea {
      width: 100%; box-sizing: border-box;
      padding: 10px 12px;
      border: 1px solid #e0e4ea; border-radius: 10px;
      font: inherit; font-size: 13px; color: #1b3a4b;
      background: white; resize: vertical;
      min-height: 64px;
    }
    .ff-textarea:focus { outline: none; border-color: #1a237e; }
    .ff-textarea::placeholder { color: #b0bec5; }

    .ff-footer {
      padding: 14px 20px;
      display: flex; gap: 10px; justify-content: flex-end;
      border-top: 1px solid #eceff1;
      background: #fafafa;
      flex-shrink: 0;
    }
    .ff-footer button {
      height: 40px !important;
      font-size: 13px !important; font-weight: 600 !important;
      border-radius: 10px !important;
      padding: 0 18px !important;
    }

    /* ===== Side Sheet ===== */
    .sheet-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.42);
      z-index: 1000; animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .side-sheet {
      /* Start below the sticky app toolbar (mat-toolbar = 64px) so the sheet's
         own header + close button aren't hidden behind the global top bar. */
      position: fixed; top: 64px; right: 0; bottom: 0;
      width: 460px; max-width: 100vw;
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
    }
    .ss-head-title { display: flex; align-items: flex-start; gap: 12px; flex: 1; }
    .ss-head-title > mat-icon { color: #1a237e; font-size: 24px; width: 24px; height: 24px; margin-top: 2px; }
    .ss-head h3 { margin: 0; font-size: 16px; font-weight: 600; color: #222; }
    .ss-head p { margin: 4px 0 0; font-size: 12px; color: #777; }
    .ss-close { flex-shrink: 0; }
    .ss-body { padding: 16px 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 8px; }

    /* Report sheet */
    .report-sheet .ss-body { padding: 18px 20px 6px; gap: 16px; }
    .report-sheet .ss-head { background: linear-gradient(180deg, #f8f9ff 0%, white 100%); }

    .report-source {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; background: #fafbfd;
      border: 1px solid #eceff1; border-radius: 12px;
      text-align: left; font: inherit; cursor: pointer; color: inherit;
      transition: all 0.15s;
    }
    .report-source:hover { border-color: #c5cae9; background: #f3f5fb; }
    .rs-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      color: white; font-weight: 600; font-size: 13px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .rs-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .rs-text strong { font-size: 13px; color: #1b3a4b; }
    .rs-text span { font-size: 11px; color: #90a4ae; }
    .rs-arrow { color: #90a4ae; flex-shrink: 0; }

    .report-block { display: flex; flex-direction: column; gap: 8px; }
    .rb-head { display: flex; align-items: center; gap: 8px; }
    .rb-head mat-icon { color: #1a237e; font-size: 18px; width: 18px; height: 18px; }
    .rb-head h4 {
      margin: 0; font-size: 13px; color: #1b3a4b; font-weight: 600;
      text-transform: uppercase; letter-spacing: .04em;
    }
    .rb-text {
      margin: 0; font-size: 13px; color: #455a64; line-height: 1.55;
      background: #fafbfd; padding: 12px 14px; border-radius: 10px;
    }

    .param-table { display: flex; flex-direction: column; gap: 0; border: 1px solid #eceff1; border-radius: 10px; overflow: hidden; }
    .pt-row {
      display: grid; grid-template-columns: 1.2fr 1fr 1fr;
      gap: 10px; padding: 10px 12px;
      font-size: 13px; align-items: center;
      border-bottom: 1px solid #eceff1;
    }
    .pt-row:last-child { border-bottom: none; }
    .pt-row.pt-head {
      background: #f6f8fc;
      font-size: 10px; text-transform: uppercase; letter-spacing: .05em;
      color: #607d8b; font-weight: 700;
    }
    .pt-name { color: #1b3a4b; font-weight: 500; }
    .pt-value { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .pt-value strong { font-size: 14px; }
    .pt-value small { font-size: 11px; color: #90a4ae; }
    .pt-range { color: #90a4ae; font-size: 12px; }

    .flag-normal { color: #2e7d32; }
    .flag-high { color: #ef6c00; }
    .flag-low { color: #1565c0; }
    .flag-critical { color: #c62828; }

    .flag-chip {
      display: inline-flex; align-items: center;
      padding: 1px 7px; border-radius: 8px;
      font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
    }
    .flag-chip-high { background: #fff3e0; color: #ef6c00; }
    .flag-chip-low { background: #e3f2fd; color: #1565c0; }
    .flag-chip-critical { background: #fdecea; color: #c62828; }

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

    .mb-action {
      display: flex; align-items: center; gap: 12px;
      padding: 14px; background: white;
      border: 1px solid #eceff1; border-radius: 12px;
      cursor: pointer; text-align: left; font: inherit; transition: all 0.15s;
    }
    .mb-action:hover { border-color: #c5cae9; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    .mb-action.mb-primary { background: linear-gradient(135deg, #e0f2f1 0%, #ffffff 100%); border-color: #b2dfdb; }
    .mb-action.mb-danger:hover { border-color: #ffcdd2; }
    .mb-icon {
      width: 38px; height: 38px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .mb-icon mat-icon { color: white; font-size: 20px; width: 20px; height: 20px; }
    .mb-bg-teal { background: #00897b; }
    .mb-bg-indigo { background: #3949ab; }
    .mb-bg-amber { background: #ef6c00; }
    .mb-bg-green { background: #2e7d32; }
    .mb-bg-red { background: #c62828; }
    .mb-text { flex: 1; min-width: 0; }
    .mb-text strong { display: block; font-size: 14px; color: #1b3a4b; }
    .mb-text span { font-size: 12px; color: #90a4ae; }
    .mb-arrow { color: #cfd8dc; flex-shrink: 0; }

    /* ===== Responsive ===== */
    @media (max-width: 720px) {
      .greeting h1 { font-size: 20px; }
      .quick-grid { grid-template-columns: repeat(3, 1fr); }
      /* On phones: avatar + body stack normally on row 1, then a
         full-width action row underneath with Manage Booking stretched */
      .appt-premium {
        grid-template-columns: auto 1fr;
        grid-template-areas:
          'left body'
          'actions actions';
        padding: 16px; gap: 12px;
      }
      .ap-left { grid-area: left; }
      .ap-body { grid-area: body; }
      .ap-top-actions { grid-area: actions; justify-content: stretch; }
      .ap-manage { flex: 1; }
      .care-card { width: 280px; }
      .specialty-grid { grid-template-columns: repeat(3, 1fr); }
      .help-banner { padding: 12px 14px; }
      .hb-body span { font-size: 11px; }
      .hb-cta { padding: 7px 12px; font-size: 12px; }

      /* CSAT strip — mobile */
      .csat-strip { padding: 8px 10px env(safe-area-inset-bottom, 8px); }
      .csat-inner { padding: 6px 10px; gap: 6px; border-radius: 12px; }
      .csat-text { font-size: 12px; }
      .csat-star { width: 30px !important; height: 30px !important; line-height: 30px !important; }
      .csat-star mat-icon { font-size: 18px; width: 18px; height: 18px; }

      /* Feedback form mobile sizing now lives on .feedback-form-panel
         in styles.scss (overlay-pane class, applied at body level). */

      /* Mobile bottom sheet */
      .side-sheet {
        top: auto; right: 0; left: 0; bottom: 0;
        width: 100%; height: 88vh;
        border-radius: 18px 18px 0 0;
        transform: translateY(100%);
      }
      .side-sheet.open { transform: translateY(0); }
    }
    @media (max-width: 480px) {
      .skeleton-grid { grid-template-columns: 1fr 1fr; }
      .quick-grid { grid-template-columns: repeat(3, 1fr); }
      .specialty-grid { grid-template-columns: repeat(2, 1fr); }
      .csat-text { font-size: 11px; }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly feedbackService = inject(FeedbackService);

  @ViewChild('feedbackFormTpl', { static: true })
  private readonly feedbackFormTpl!: TemplateRef<unknown>;
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private feedbackOverlayRef: OverlayRef | null = null;

  constructor() {
    // The dashboard renders inside <mat-sidenav-content>, whose CSS transform
    // turns position:fixed descendants into containing-block-relative
    // positioning AND creates an isolated stacking context — both of which
    // break the dialog on desktop (header clipped above the viewport) and
    // mobile (header trapped behind the sticky toolbar). Solution: render
    // the dialog at body level via CDK Overlay so it truly escapes the
    // shell's containing block.
    effect(() => {
      if (this.feedbackFormOpen()) {
        this.openFeedbackOverlay();
      } else {
        this.closeFeedbackOverlay();
      }
    });
  }

  ngOnDestroy(): void {
    this.closeFeedbackOverlay();
  }

  private openFeedbackOverlay(): void {
    if (this.feedbackOverlayRef || !this.feedbackFormTpl) return;
    this.feedbackOverlayRef = this.overlay.create({
      positionStrategy: this.overlay.position()
        .global()
        .centerHorizontally()
        .top('12px'),
      hasBackdrop: true,
      backdropClass: 'feedback-form-backdrop',
      panelClass: 'feedback-form-panel',
      scrollStrategy: this.overlay.scrollStrategies.block(),
    });
    this.feedbackOverlayRef.backdropClick().subscribe(() => this.closeFeedbackForm());
    this.feedbackOverlayRef.attach(
      new TemplatePortal(this.feedbackFormTpl, this.viewContainerRef)
    );
  }

  private closeFeedbackOverlay(): void {
    if (this.feedbackOverlayRef) {
      this.feedbackOverlayRef.detach();
      this.feedbackOverlayRef.dispose();
      this.feedbackOverlayRef = null;
    }
  }

  readonly loading = signal(true);
  readonly data = signal<DashboardSummary | null>(null);
  readonly consultations = signal<Consultation[]>([]);
  readonly feedbackDismissed = signal(false);
  readonly feedbackRating = signal(0);
  readonly feedbackFormOpen = signal(false);
  readonly manageOpen = signal(false);
  readonly reportContext = signal<ReportContext | null>(null);

  // Feedback form fields
  readonly ffVisit = signal<string>('general');
  readonly ffPositives = signal<Set<string>>(new Set());
  readonly ffNegatives = signal<Set<string>>(new Set());
  readonly ffComments = signal<string>('');
  // Appointment ids that already have feedback submitted this session —
  // they're filtered out of the eligible list (REQ 8.6.5 / 8.6.9).
  readonly submittedFeedbackIds = signal<Set<string>>(new Set());

  readonly positiveTags = [
    'Friendly staff', 'Clean facility', 'Short wait time',
    'Clear explanation', 'Easy booking', 'Professional care'
  ];
  readonly negativeTags = [
    'Long wait time', 'Billing clarity', 'Parking',
    'Communication', 'Facility upkeep', 'Booking availability'
  ];

  // Order: most-likely tap targets first
  // Hospital contact (PFSH primary line). For multi-location white-label
  // this would come from the GeographyService / tenant config.
  readonly hospitalPhone = '+973 1781 2000';
  readonly hospitalPhoneRaw = '+97317812000';

  readonly actionChips = [
    { label: 'Book Appointment', icon: 'event_available', route: '/appointments', color: '#3949ab' },
    { label: 'My Health', icon: 'health_and_safety', route: '/consultations', color: '#5e35b1' },
    { label: 'Medications', icon: 'medication', route: '/medications', color: '#ef6c00' },
    { label: 'Records', icon: 'folder_shared', route: '/timeline', color: '#00897b' },
    { label: 'Payments', icon: 'payments', route: '/payments', color: '#43a047' },
    { label: 'Telehealth', icon: 'videocam', route: '/telehealth', color: '#1565c0' }
  ];

  readonly specialtyTiles: SpecialtyTile[] = [
    { name: 'Cardiology', icon: 'favorite', color: '#c62828', doctors: 2 },
    { name: 'Dermatology', icon: 'spa', color: '#ad1457', doctors: 1 },
    { name: 'General Medicine', icon: 'medical_services', color: '#2e7d32', doctors: 1 },
    { name: 'Endocrinology', icon: 'water_drop', color: '#6a1b9a', doctors: 1 },
    { name: 'Orthopedics', icon: 'accessibility_new', color: '#1565c0', doctors: 1 },
    { name: 'ENT', icon: 'hearing', color: '#00897b', doctors: 1 },
    { name: 'Pediatrics', icon: 'child_care', color: '#ef6c00', doctors: 0 },
    { name: 'Pulmonology', icon: 'air', color: '#0277bd', doctors: 0 }
  ];

  ngOnInit(): void {
    this.api.getDashboard().subscribe(summary => {
      this.data.set(summary);
      this.loading.set(false);
    });
    this.api.getConsultations().subscribe(list => {
      this.consultations.set(list);
    });
    // Allow other surfaces (e.g. the user menu) to open the feedback form
    // by navigating here with ?openFeedback=1
    if (this.route.snapshot.queryParamMap.get('openFeedback') === '1') {
      this.feedbackDismissed.set(false);
      this.feedbackFormOpen.set(true);
    }
  }

  // ===== Computed UI state =====
  readonly nextAppt = computed<Appointment | null>(() =>
    this.data()?.upcomingAppointments?.[0] ?? null
  );

  readonly dashboardVitals = computed<VitalSign[]>(() => {
    const vitals = this.data()?.recentVitals ?? [];
    const order = ['blood_pressure', 'glucose', 'heart_rate', 'oxygen', 'temperature', 'weight'];
    return order
      .map(t => vitals.find(v => v.type === t))
      .filter((v): v is VitalSign => !!v);
  });

  /** Unified "what's next" feed: lab results ready + prescribed labs + upcoming follow-ups. */
  readonly careItems = computed<CareItem[]>(() => {
    const cons = this.consultations();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ready: CareItem[] = [];
    const prescribed: CareItem[] = [];
    const followups: CareItem[] = [];

    const sorted = cons.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const c of sorted) {
      // Investigations
      for (const inv of c.investigations) {
        if (inv.status === 'completed') {
          ready.push({
            id: `${c.id}:${inv.name}:ready`,
            kind: 'lab-ready',
            title: `${inv.name} — ready`,
            doctorName: c.doctorName,
            doctorSpecialty: c.doctorSpecialty,
            consultationId: c.id,
            consultationDate: c.date,
            actionDate: inv.resultDate ?? c.date,
            category: inv.category,
            tileLabel: 'Result',
            labName: inv.name
          });
        } else if (inv.status === 'pending') {
          prescribed.push({
            id: `${c.id}:${inv.name}:pending`,
            kind: 'lab-prescribed',
            title: `${inv.name} prescribed`,
            doctorName: c.doctorName,
            doctorSpecialty: c.doctorSpecialty,
            consultationId: c.id,
            consultationDate: c.date,
            actionDate: c.date,
            category: inv.category,
            tileLabel: 'Since',
            labName: inv.name
          });
        }
      }
      // Follow-up
      if (c.followUp) {
        const fuDate = new Date(c.followUp.date);
        if (fuDate >= today) {
          followups.push({
            id: c.id + ':followup',
            kind: 'followup',
            title: `${c.doctorSpecialty} follow-up`,
            doctorName: c.doctorName,
            doctorSpecialty: c.doctorSpecialty,
            consultationId: c.id,
            consultationDate: c.date,
            actionDate: c.followUp.date,
            tileLabel: 'Follow-up'
          });
        }
      }
    }

    // Priority: ready (act now) → follow-ups (chronological) → prescribed (least urgent)
    followups.sort((a, b) => new Date(a.actionDate).getTime() - new Date(b.actionDate).getTime());
    // Cap to 3 to reduce visual choice overload
    return [...ready, ...followups, ...prescribed].slice(0, 3);
  });

  readonly medsTakenToday = computed(() => {
    const meds = this.data()?.activeMedications ?? [];
    let taken = 0;
    for (const m of meds) {
      const last = m.taken[m.taken.length - 1];
      if (last) taken++;
    }
    return taken;
  });

  readonly medsAdherence = computed(() => {
    const meds = this.data()?.activeMedications ?? [];
    if (!meds.length) return 0;
    let total = 0;
    let taken = 0;
    for (const m of meds) {
      total += m.taken.length;
      taken += m.taken.filter(Boolean).length;
    }
    return total ? Math.round((taken / total) * 100) : 0;
  });

  // ===== Helpers =====
  timeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  doctorInitials(name: string): string {
    return name.replace(/Dr\.?\s*/i, '').split(/\s+/).map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase();
  }

  apptWhen(appt: Appointment): 'today' | 'tomorrow' | 'upcoming' {
    const d = new Date(appt.date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return 'today';
    if (d.toDateString() === tomorrow.toDateString()) return 'tomorrow';
    return 'upcoming';
  }

  apptWhenLabel(appt: Appointment): string {
    return ({ today: 'Today', tomorrow: 'Tomorrow', upcoming: 'Upcoming' })[this.apptWhen(appt)];
  }

  specialtyTheme(specialty: string): string {
    const s = specialty.toLowerCase();
    if (s.includes('cardio')) return 'cardio';
    if (s.includes('derm')) return 'derm';
    if (s.includes('endo')) return 'endo';
    if (s.includes('general')) return 'general';
    if (s.includes('ortho')) return 'ortho';
    if (s.includes('ent')) return 'ent';
    return 'other';
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

  getAlertIcon(alert: AlertItem): string {
    if (alert.type === 'urgent') return 'error';
    if (alert.type === 'warning') return 'warning';
    return 'info';
  }

  getAdherence(taken: boolean[]): number {
    if (!taken?.length) return 0;
    return Math.round((taken.filter(Boolean).length / taken.length) * 100);
  }

  kindIcon(kind: CareItemKind): string {
    return ({ 'lab-ready': 'description', 'lab-prescribed': 'science', 'followup': 'event_repeat' })[kind];
  }

  kindLabel(kind: CareItemKind): string {
    return ({ 'lab-ready': 'Result Ready', 'lab-prescribed': 'Requested', 'followup': 'Follow-up' })[kind];
  }

  kindCta(kind: CareItemKind): string {
    return ({ 'lab-ready': 'View Report', 'lab-prescribed': 'Book Test', 'followup': 'Book Visit' })[kind];
  }

  // ===== Actions =====
  navigate(route: string): void {
    this.router.navigate([route]);
  }

  runCareItem(item: CareItem): void {
    if (item.kind === 'lab-ready') {
      // Open the report directly on the dashboard
      this.openReport(item);
    } else if (item.kind === 'lab-prescribed') {
      this.router.navigate(['/appointments'], {
        queryParams: { lab: item.labName }
      });
    } else {
      this.router.navigate(['/appointments'], {
        queryParams: {
          followUp: '1',
          doctor: item.doctorName,
          specialty: item.doctorSpecialty,
          date: item.actionDate
        }
      });
    }
  }

  openReport(item: CareItem): void {
    if (!item.labName) return;
    const consultation = this.consultations().find(c => c.id === item.consultationId);
    if (!consultation) return;
    const investigation = consultation.investigations.find(i => i.name === item.labName);
    if (!investigation) return;
    this.reportContext.set({ consultation, investigation });
  }

  closeReport(): void {
    this.reportContext.set(null);
  }

  goToConsultation(consultationId: string): void {
    this.router.navigate(['/consultations'], { queryParams: { id: consultationId } });
    this.closeReport();
  }

  openInRecords(labName: string): void {
    this.router.navigate(['/timeline'], { queryParams: { highlight: labName } });
    this.closeReport();
  }

  flagLabel(flag: string): string {
    return ({ high: 'High', low: 'Low', critical: 'Critical', normal: 'Normal' } as Record<string, string>)[flag] ?? flag;
  }

  openManage(): void { this.manageOpen.set(true); }
  closeManage(): void { this.manageOpen.set(false); }

  actionPlaceholder(label: string): void {
    this.snackBar.open(`${label} — coming soon in this build`, 'Close', { duration: 3000 });
    this.closeManage();
  }

  /** Called from the sticky strip — sets rating and opens the full feedback form. */
  startFeedback(rating: number): void {
    this.submitFeedback(rating);
    this.feedbackFormOpen.set(true);
  }

  /** Sets the rating. Kept as a public method for spec/back-compat. */
  submitFeedback(rating: number): void {
    this.feedbackRating.set(rating);
  }

  closeFeedbackForm(): void {
    this.feedbackFormOpen.set(false);
  }

  togglePositive(tag: string): void {
    this.ffPositives.update(s => {
      const next = new Set(s);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }

  toggleNegative(tag: string): void {
    this.ffNegatives.update(s => {
      const next = new Set(s);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }

  submitFullFeedback(): void {
    const visitId = this.ffVisit();
    const appt = visitId === 'general'
      ? null
      : this.consultations().find(c => c.id === visitId) ?? null;

    // REQ 8.6.9 — associate the feedback with the selected appointment in
    // HMIS. Written as a header row keyed to the OUTPATIENT ENCOUNTER
    // (OP No. + OP Date + doctor) plus one detail row per question, which
    // is exactly how the hospital's Patient Feedback Report reads it.
    // ALWAYS persist. When no visit was chosen ("General hospital
    // experience") the encounter fields are simply omitted and the row is
    // stored as hospital-level feedback — we never discard a submission.
    const patient = this.data()?.patient;
    this.feedbackService.submitFeedback({
      patientId: patient?.id ?? '',
      patientName: `${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim(),
      opNumber: appt?.opNumber ?? appt?.id,
      opDate: appt?.date,
      doctorName: appt?.doctorName,
      specialty: appt?.doctorSpecialty,
      consultationType: appt?.type,
      rating: this.feedbackRating(),
      positives: Array.from(this.ffPositives()),
      negatives: Array.from(this.ffNegatives()),
      comments: this.ffComments(),
      source: 'patient_portal'
    });

    if (appt) {
      this.submittedFeedbackIds.update(s => {
        const next = new Set(s);
        next.add(appt.id);
        return next;
      });
    }

    const ctx = appt
      ? `for your ${this.feedbackTypeLabel(appt.type).toLowerCase()} with ${appt.doctorName}`
      : 'about your hospital experience';
    this.snackBar.open(
      `Thanks for your feedback (${this.feedbackRating()}★) ${ctx}`,
      'Close',
      { duration: 4000 }
    );

    this.feedbackFormOpen.set(false);
    this.feedbackDismissed.set(true);
    // Reset form so re-opening starts fresh next time
    this.feedbackRating.set(0);
    this.ffPositives.set(new Set());
    this.ffNegatives.set(new Set());
    this.ffComments.set('');
    this.ffVisit.set('general');
  }

  ratingWord(rating: number): string {
    if (!rating) return 'Tap a star';
    return ({ 1: 'Poor', 2: 'Fair', 3: 'Okay', 4: 'Good', 5: 'Excellent' } as Record<number, string>)[rating] ?? '';
  }

  /**
   * REQ 8.6.5 — every appointment eligible for feedback. Eligible = a
   * past (completed) visit the patient has not already reviewed. Past
   * visits come from the consultation history; once feedback is submitted
   * for one (REQ 8.6.9) its id lands in `submittedFeedbackIds` and it
   * drops off this list. Sorted most-recent first.
   */
  readonly eligibleFeedbackAppointments = computed(() => {
    const reviewedOps = this.feedbackService.reviewedOpNumbers();
    return this.consultations()
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter(c => !this.submittedFeedbackIds().has(c.id))
      .filter(c => !reviewedOps.has(c.opNumber ?? c.id));
  });

  /** Human label for the consultation type (REQ 8.6.6). */
  feedbackTypeLabel(type: Consultation['type']): string {
    return type === 'telehealth' ? 'Video Consultation' : 'Hospital Visit';
  }

  /**
   * Single-line label for the closed dropdown. Keeps doctor + date + time
   * visible (REQ 8.6.6 / 8.6.7) without wrapping the collapsed field.
   */
  readonly selectedVisitLabel = computed(() => {
    const id = this.ffVisit();
    if (id === 'general') return 'General hospital experience';
    const c = this.consultations().find(x => x.id === id);
    if (!c) return 'Select a visit';
    const d = new Date(c.date);
    const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${c.doctorName} · ${date}, ${time}`;
  });

  dismissAlert(id: string): void {
    const d = this.data();
    if (!d) return;
    this.data.set({ ...d, alerts: d.alerts.filter(a => a.id !== id) });
  }
}
