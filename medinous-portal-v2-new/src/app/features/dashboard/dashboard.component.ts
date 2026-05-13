import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { ApiService } from '../../core/services/api.service';
import { DashboardSummary, VitalSign, Appointment, Medication, AlertItem } from '../../core/models/patient.model';

interface OngoingActivity {
  id: string;
  theme: 'lab' | 'tests' | 'wallet' | 'followup' | 'refill' | 'video' | 'pending';
  icon: string;
  title: string;
  description: string;
  cta: string;
  route?: string;
  action?: () => void;
}

interface MedTimeSlot {
  label: 'Morning' | 'Afternoon' | 'Evening';
  icon: string;
  meds: Medication[];
}

interface LabCard {
  id: string;
  theme: 'ready' | 'prescribed' | 'pending';
  icon: string;
  title: string;
  description: string;
  actions: { label: string; primary?: boolean; route?: string }[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatIconModule, MatButtonModule, MatChipsModule,
    MatProgressBarModule, MatDividerModule, MatButtonToggleModule,
    MatTooltipModule, MatSnackBarModule,
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

        <!-- ============================================ -->
        <!-- GREETING                                     -->
        <!-- ============================================ -->
        <header class="greeting">
          <h1>Good {{ timeOfDay() }}, {{ d.patient.firstName }}</h1>
          <p class="greeting-sub">Here's your health journey today.</p>
        </header>

        <!-- ============================================ -->
        <!-- 1. ONGOING ACTIVITIES (horizontal scroll)    -->
        <!-- ============================================ -->
        @if (ongoingActivities().length > 0) {
          <section class="section ongoing-section">
            <div class="sec-head">
              <h2>Ongoing Activities</h2>
              <span class="sec-count">{{ ongoingActivities().length }}</span>
            </div>
            <div class="hscroll">
              @for (act of ongoingActivities(); track act.id) {
                <article class="activity-card" [class]="'a-' + act.theme">
                  <div class="a-illo">
                    <mat-icon>{{ act.icon }}</mat-icon>
                  </div>
                  <div class="a-content">
                    <strong>{{ act.title }}</strong>
                    <p>{{ act.description }}</p>
                  </div>
                  <button mat-flat-button class="a-cta" (click)="runActivity(act)">
                    {{ act.cta }}
                  </button>
                </article>
              }
            </div>
          </section>
        }

        <!-- ============================================ -->
        <!-- 2. HEALTH SNAPSHOT (vitals)                  -->
        <!-- ============================================ -->
        <section class="section vitals-section">
          <div class="sec-head">
            <div class="sec-titles">
              <h2>Health Snapshot</h2>
              <p class="sec-sub">Latest recorded vitals</p>
            </div>
            <a class="sec-link" routerLink="/timeline">
              View All Vitals <mat-icon>arrow_forward</mat-icon>
            </a>
          </div>
          <div class="hscroll vitals-scroll">
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
                <span class="v-time">Updated {{ vital.timestamp | date:'mediumDate' }}</span>
              </article>
            }
          </div>
        </section>

        <!-- ============================================ -->
        <!-- 3. UPCOMING APPOINTMENT                      -->
        <!-- ============================================ -->
        @if (nextAppt(); as appt) {
          <section class="section appt-section">
            <div class="sec-head">
              <h2>Upcoming Appointment</h2>
            </div>
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
                <div class="ap-actions">
                  <button mat-icon-button class="ap-icon-btn" matTooltip="Get directions">
                    <mat-icon>directions</mat-icon>
                  </button>
                  <button mat-icon-button class="ap-icon-btn" matTooltip="Add to calendar">
                    <mat-icon>event_available</mat-icon>
                  </button>
                  <button mat-flat-button color="primary" class="ap-manage" (click)="openManage()">
                    Manage Booking
                  </button>
                </div>
              </div>
            </article>
          </section>
        }

        <!-- ============================================ -->
        <!-- 4. MEDICATION REMINDER                       -->
        <!-- ============================================ -->
        <section class="section meds-section">
          <div class="sec-head">
            <h2>Medication Reminder</h2>
            @if (medChecked().size > 0) {
              <span class="streak-chip">
                <mat-icon>local_fire_department</mat-icon>
                {{ medChecked().size }} taken today
              </span>
            }
          </div>

          <mat-button-toggle-group [value]="medsTab()"
                                   (change)="setMedsTab($event.value)"
                                   class="meds-tabs">
            <mat-button-toggle value="ongoing">Ongoing</mat-button-toggle>
            <mat-button-toggle value="all">All Medications</mat-button-toggle>
          </mat-button-toggle-group>

          @if (medsTab() === 'ongoing') {
            @if (medTimeSlots().length === 0) {
              <div class="empty-mini">
                <mat-icon>medication</mat-icon>
                <p>No medications scheduled today.</p>
              </div>
            }
            @for (slot of medTimeSlots(); track slot.label) {
              <div class="time-slot">
                <div class="ts-head">
                  <mat-icon class="ts-icon">{{ slot.icon }}</mat-icon>
                  <span class="ts-label">{{ slot.label }}</span>
                </div>
                @for (med of slot.meds; track med.id) {
                  <article class="med-card" [class.done]="medChecked().has(med.id)">
                    <div class="m-icon"><mat-icon>medication</mat-icon></div>
                    <div class="m-body">
                      <strong>{{ med.name }} {{ med.dosage }}</strong>
                      <span class="m-sub">{{ med.frequency }} · {{ med.instructions ?? '' }}</span>
                    </div>
                    @if (medChecked().has(med.id)) {
                      <span class="m-done">
                        <mat-icon>check_circle</mat-icon>
                        Taken
                      </span>
                    } @else {
                      <button mat-stroked-button class="m-mark"
                              (click)="toggleMedCheck(med.id)">
                        Mark as Taken
                      </button>
                    }
                  </article>
                }
              </div>
            }
          }
        </section>

        <!-- ============================================ -->
        <!-- 5. LAB & REPORTS                             -->
        <!-- ============================================ -->
        <section class="section labs-section">
          <div class="sec-head">
            <div class="sec-titles">
              <h2>Lab &amp; Reports</h2>
              <p class="sec-sub">Recent activity from your care team</p>
            </div>
            <a class="sec-link" routerLink="/timeline">
              View All <mat-icon>arrow_forward</mat-icon>
            </a>
          </div>

          @for (lab of labCards(); track lab.id) {
            <article class="lab-card" [class]="'lc-' + lab.theme">
              <div class="lc-illo">
                <mat-icon>{{ lab.icon }}</mat-icon>
              </div>
              <div class="lc-body">
                <strong>{{ lab.title }}</strong>
                <p>{{ lab.description }}</p>
                <div class="lc-actions">
                  @for (act of lab.actions; track act.label) {
                    @if (act.primary) {
                      <button mat-flat-button color="primary" class="lc-btn"
                              (click)="navigate(act.route)">
                        {{ act.label }}
                      </button>
                    } @else {
                      <button mat-stroked-button class="lc-btn"
                              (click)="navigate(act.route)">
                        {{ act.label }}
                      </button>
                    }
                  }
                </div>
              </div>
            </article>
          }
        </section>

        <!-- ============================================ -->
        <!-- 6. QUICK ACTIONS                             -->
        <!-- ============================================ -->
        <section class="section quick-section">
          <h2>Quick Actions</h2>
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

        <!-- CSAT (subtle bottom feedback) -->
        @if (!feedbackDismissed()) {
          <section class="csat-section">
            <button mat-icon-button class="csat-x" (click)="feedbackDismissed.set(true)">
              <mat-icon>close</mat-icon>
            </button>
            <div class="csat-row">
              <span class="csat-text">How was your experience today?</span>
              <div class="csat-stars">
                @for (s of [1,2,3,4,5]; track s) {
                  <button mat-icon-button class="csat-star" [class.on]="feedbackRating() >= s"
                          (click)="submitFeedback(s)">
                    <mat-icon>{{ feedbackRating() >= s ? 'star' : 'star_border' }}</mat-icon>
                  </button>
                }
              </div>
            </div>
            @if (feedbackRating()) {
              <div class="csat-ty"><mat-icon>check_circle</mat-icon> Thanks for your feedback!</div>
            }
          </section>
        }

        }
      }
    </div>

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
    .dash { max-width: 880px; margin: 0 auto; padding-bottom: 60px; }
    .skeleton-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }

    /* ===== Greeting ===== */
    .greeting { margin-bottom: 22px; }
    .greeting h1 {
      font-size: 24px; font-weight: 600; color: #1a237e; margin: 0;
      letter-spacing: -0.01em;
    }
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
    .sec-count {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 22px; height: 22px; padding: 0 8px;
      background: #eef0fb; color: #1a237e;
      border-radius: 11px; font-size: 12px; font-weight: 600;
    }
    .sec-link {
      display: inline-flex; align-items: center; gap: 4px;
      color: #1a237e; font-size: 13px; font-weight: 500;
      text-decoration: none;
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

    /* ===== Activity cards ===== */
    .activity-card {
      flex-shrink: 0; width: 280px;
      padding: 18px; border-radius: 16px;
      display: flex; flex-direction: column; gap: 12px;
      background: #f6f8fc;
      border: 1px solid transparent;
      transition: box-shadow 0.15s, transform 0.15s;
    }
    .activity-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); transform: translateY(-2px); }
    .a-illo {
      width: 44px; height: 44px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .a-illo mat-icon { color: white; font-size: 22px; width: 22px; height: 22px; }
    .a-content { flex: 1; }
    .a-content strong { display: block; font-size: 14px; color: #1b3a4b; margin-bottom: 4px; }
    .a-content p { font-size: 13px; color: #607d8b; margin: 0; line-height: 1.45; }
    .a-cta {
      align-self: flex-start;
      height: 34px !important; padding: 0 14px !important;
      font-size: 13px !important; font-weight: 600 !important;
      border-radius: 8px !important;
    }
    .a-lab { background: #e0f2f1; }
    .a-lab .a-illo { background: #00897b; }
    .a-lab .a-cta { background: #00897b !important; color: white !important; }
    .a-tests { background: #e3f2fd; }
    .a-tests .a-illo { background: #1565c0; }
    .a-tests .a-cta { background: #1565c0 !important; color: white !important; }
    .a-wallet { background: #eef0fb; }
    .a-wallet .a-illo { background: #3949ab; }
    .a-wallet .a-cta { background: #3949ab !important; color: white !important; }
    .a-followup { background: #fce4ec; }
    .a-followup .a-illo { background: #c2185b; }
    .a-followup .a-cta { background: #c2185b !important; color: white !important; }
    .a-refill { background: #fff3e0; }
    .a-refill .a-illo { background: #e65100; }
    .a-refill .a-cta { background: #e65100 !important; color: white !important; }
    .a-video { background: #e8f5e9; }
    .a-video .a-illo { background: #2e7d32; }
    .a-video .a-cta { background: #2e7d32 !important; color: white !important; }
    .a-pending { background: #fff8e1; }
    .a-pending .a-illo { background: #b07b00; }
    .a-pending .a-cta { background: #b07b00 !important; color: white !important; }

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

    .v-label {
      font-size: 11px; text-transform: uppercase; letter-spacing: .05em;
      color: #607d8b; font-weight: 600;
    }
    .v-value-row { display: flex; align-items: baseline; gap: 4px; }
    .v-value { font-size: 24px; font-weight: 700; color: #1b3a4b; line-height: 1; }
    .v-unit { font-size: 12px; color: #90a4ae; }
    .v-time { font-size: 11px; color: #b0bec5; }

    /* ===== Premium Appointment Card ===== */
    .appt-premium {
      display: flex; gap: 16px; padding: 20px;
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

    .ap-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
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
    .ap-meta {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: #546e7a;
    }
    .ap-meta mat-icon { font-size: 15px; width: 15px; height: 15px; color: #90a4ae; }

    .ap-actions { display: flex; align-items: center; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
    .ap-icon-btn {
      width: 36px !important; height: 36px !important;
      line-height: 36px !important;
      background: white !important;
      border: 1px solid #e3e7f5 !important;
      border-radius: 10px !important;
    }
    .ap-icon-btn mat-icon { color: #1a237e; font-size: 18px; width: 18px; height: 18px; }
    .ap-manage {
      margin-left: auto;
      font-weight: 600 !important; border-radius: 10px !important;
      height: 36px !important; padding: 0 18px !important;
      font-size: 13px !important;
    }

    /* ===== Medications ===== */
    .meds-tabs { margin-bottom: 14px; }
    .streak-chip {
      display: inline-flex; align-items: center; gap: 4px;
      background: #fff3e0; color: #e65100;
      padding: 4px 10px; border-radius: 12px;
      font-size: 12px; font-weight: 600;
    }
    .streak-chip mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .time-slot { margin-bottom: 14px; }
    .time-slot:last-child { margin-bottom: 0; }
    .ts-head {
      display: flex; align-items: center; gap: 6px;
      margin-bottom: 8px;
      font-size: 12px; text-transform: uppercase; letter-spacing: .05em;
      color: #607d8b; font-weight: 600;
    }
    .ts-icon { font-size: 16px; width: 16px; height: 16px; color: #90a4ae; }

    .med-card {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; background: white;
      border-radius: 12px; border: 1px solid #eceff1;
      margin-bottom: 6px;
      transition: all 0.2s;
    }
    .med-card:last-child { margin-bottom: 0; }
    .med-card.done { background: #f1f8f4; border-color: #c8e6c9; opacity: 0.85; }
    .m-icon {
      width: 36px; height: 36px; border-radius: 10px;
      background: #fff3e0; color: #ef6c00;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .med-card.done .m-icon { background: #e8f5e9; color: #2e7d32; }
    .m-icon mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .m-body { flex: 1; min-width: 0; }
    .m-body strong { display: block; font-size: 14px; color: #1b3a4b; }
    .m-sub { font-size: 12px; color: #90a4ae; }
    .m-mark {
      font-size: 12px !important; height: 32px !important;
      padding: 0 14px !important; border-radius: 8px !important;
      color: #1a237e !important; border-color: #c5cae9 !important;
    }
    .m-done {
      display: inline-flex; align-items: center; gap: 4px;
      color: #2e7d32; font-size: 13px; font-weight: 600;
    }
    .m-done mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .empty-mini {
      padding: 24px; background: #fafbfd;
      border-radius: 12px; border: 1px dashed #e0e4ea;
      text-align: center; color: #90a4ae;
    }
    .empty-mini mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .empty-mini p { margin: 6px 0 0; font-size: 13px; }

    /* ===== Lab cards ===== */
    .lab-card {
      display: flex; gap: 14px; padding: 16px 18px;
      border-radius: 14px; margin-bottom: 10px;
      align-items: flex-start;
      border: 1px solid transparent;
    }
    .lab-card:last-child { margin-bottom: 0; }
    .lc-illo {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .lc-illo mat-icon { color: white; font-size: 24px; width: 24px; height: 24px; }
    .lc-body { flex: 1; min-width: 0; }
    .lc-body strong { display: block; font-size: 14px; color: #1b3a4b; margin-bottom: 4px; }
    .lc-body p { font-size: 13px; color: #607d8b; margin: 0 0 10px; line-height: 1.5; }
    .lc-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .lc-btn {
      font-size: 12px !important; padding: 0 14px !important;
      height: 32px !important; line-height: 32px !important;
      border-radius: 8px !important;
    }
    .lc-ready { background: #e0f2f1; border-color: #b2dfdb; }
    .lc-ready .lc-illo { background: #00897b; }
    .lc-prescribed { background: #fff3e0; border-color: #ffe0b2; }
    .lc-prescribed .lc-illo { background: #ef6c00; }
    .lc-pending { background: #f6f8fc; border-color: #e3e7f5; }
    .lc-pending .lc-illo { background: #1565c0; }

    /* ===== Quick Actions ===== */
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

    /* ===== CSAT (subtle) ===== */
    .csat-section {
      margin-top: 24px; padding: 14px 16px;
      background: #fafbfd; border: 1px solid #eceff1;
      border-radius: 12px; position: relative;
    }
    .csat-x { position: absolute; top: 4px; right: 4px; width: 28px !important; height: 28px !important; line-height: 28px !important; }
    .csat-row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    }
    .csat-text { font-size: 13px; color: #455a64; }
    .csat-stars { display: flex; gap: 0; }
    .csat-star { width: 32px !important; height: 32px !important; line-height: 32px !important; color: #cfd8dc; }
    .csat-star.on { color: #ffc107; }
    .csat-ty {
      display: flex; align-items: center; gap: 6px; margin-top: 8px;
      font-size: 13px; color: #2e7d32;
    }
    .csat-ty mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* ===== Side Sheet ===== */
    .sheet-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.42);
      z-index: 1000; animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .side-sheet {
      position: fixed; top: 0; right: 0; bottom: 0;
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

    .mb-action {
      display: flex; align-items: center; gap: 12px;
      padding: 14px; background: white;
      border: 1px solid #eceff1; border-radius: 12px;
      cursor: pointer; text-align: left; font: inherit;
      transition: all 0.15s;
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
      .activity-card { width: 240px; padding: 14px; }
      .vital-card { width: 150px; padding: 12px; }
      .v-value { font-size: 20px; }
      .appt-premium { flex-direction: column; padding: 16px; gap: 12px; }
      .ap-left { flex-direction: row; }
      .ap-actions { gap: 6px; }
      .ap-manage { flex: 1; margin-left: 0; }
      .quick-grid { grid-template-columns: repeat(3, 1fr); }
      .csat-row { flex-direction: column; align-items: flex-start; }

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
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly data = signal<DashboardSummary | null>(null);
  readonly feedbackDismissed = signal(false);
  readonly feedbackRating = signal(0);
  readonly medChecked = signal(new Set<string>());
  readonly medsTab = signal<'ongoing' | 'all'>('ongoing');
  readonly manageOpen = signal(false);

  readonly actionChips = [
    { label: 'Book Appointment', icon: 'event_available', route: '/appointments', color: '#3949ab' },
    { label: 'Medications', icon: 'medication', route: '/medications', color: '#ef6c00' },
    { label: 'Lab Results', icon: 'science', route: '/timeline', color: '#00897b' },
    { label: 'Records', icon: 'folder_shared', route: '/timeline', color: '#5e35b1' },
    { label: 'Payments', icon: 'payments', route: '/payments', color: '#43a047' },
    { label: 'Telehealth', icon: 'videocam', route: '/appointments', color: '#1565c0' }
  ];

  ngOnInit(): void {
    this.api.getDashboard().subscribe(summary => {
      this.data.set(summary);
      this.loading.set(false);
    });
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

  /** Synthesized "Ongoing Activities" cards from dashboard data + plausible defaults. */
  readonly ongoingActivities = computed<OngoingActivity[]>(() => {
    const d = this.data();
    if (!d) return [];
    const list: OngoingActivity[] = [];

    const labAlert = d.alerts.find(a => a.title.toLowerCase().includes('lab'));
    if (labAlert) {
      list.push({
        id: 'oa-lab',
        theme: 'lab',
        icon: 'science',
        title: 'Lab results are ready',
        description: labAlert.message,
        cta: 'View Report',
        route: '/timeline'
      });
    }

    list.push({
      id: 'oa-tests',
      theme: 'tests',
      icon: 'biotech',
      title: 'Tests prescribed',
      description: 'Book your MRI Brain Scan and CBC before May 16.',
      cta: 'Book Now',
      route: '/appointments'
    });

    list.push({
      id: 'oa-wallet',
      theme: 'wallet',
      icon: 'account_balance_wallet',
      title: 'Advance balance available',
      description: 'AED 750 ready to use across your next visits.',
      cta: 'View Balance',
      route: '/payments'
    });

    const refillAlert = d.alerts.find(a => a.title.toLowerCase().includes('refill'));
    if (refillAlert) {
      list.push({
        id: 'oa-refill',
        theme: 'refill',
        icon: 'medication_liquid',
        title: 'Refill needed',
        description: refillAlert.message,
        cta: 'Request Refill',
        route: '/medications'
      });
    }

    const next = d.upcomingAppointments[0];
    if (next?.type === 'telehealth') {
      list.push({
        id: 'oa-video',
        theme: 'video',
        icon: 'videocam',
        title: 'Video consultation scheduled',
        description: `${next.doctorName} on ${this.formatShortDate(next.date)} at ${next.time}.`,
        cta: 'Join Call',
        action: () => this.openManage()
      });
    }

    list.push({
      id: 'oa-followup',
      theme: 'followup',
      icon: 'event_repeat',
      title: 'Follow-up due',
      description: 'Cardiology follow-up recommended after your last visit.',
      cta: 'Schedule',
      route: '/appointments'
    });

    return list;
  });

  readonly medTimeSlots = computed<MedTimeSlot[]>(() => {
    const meds = this.data()?.activeMedications ?? [];
    const morning: Medication[] = [];
    const afternoon: Medication[] = [];
    const evening: Medication[] = [];

    for (const m of meds) {
      const freq = m.frequency.toLowerCase();
      if (freq.includes('twice')) {
        morning.push(m);
        evening.push(m);
      } else if (m.instructions?.toLowerCase().includes('night') || m.instructions?.toLowerCase().includes('evening')) {
        evening.push(m);
      } else if (m.instructions?.toLowerCase().includes('afternoon')) {
        afternoon.push(m);
      } else {
        morning.push(m);
      }
    }

    const slots: MedTimeSlot[] = [];
    if (morning.length) slots.push({ label: 'Morning', icon: 'wb_sunny', meds: morning });
    if (afternoon.length) slots.push({ label: 'Afternoon', icon: 'wb_twilight', meds: afternoon });
    if (evening.length) slots.push({ label: 'Evening', icon: 'nightlight', meds: evening });
    return slots;
  });

  readonly labCards = computed<LabCard[]>(() => {
    const d = this.data();
    if (!d) return [];
    const cards: LabCard[] = [];

    const labAlert = d.alerts.find(a => a.title.toLowerCase().includes('lab'));
    if (labAlert) {
      cards.push({
        id: 'lab-ready',
        theme: 'ready',
        icon: 'science',
        title: 'Lab Results Ready',
        description: labAlert.message,
        actions: [
          { label: 'View Report', primary: true, route: '/timeline' },
          { label: 'Share with Doctor', route: '/timeline' }
        ]
      });
    }

    cards.push({
      id: 'lab-prescribed',
      theme: 'prescribed',
      icon: 'biotech',
      title: 'Tests Prescribed',
      description: 'Your doctor prescribed CBC and Lipid Profile. Settle the fee in advance to skip the counter.',
      actions: [
        { label: 'Book Test', primary: true, route: '/appointments' },
        { label: 'Pay Now', route: '/payments' }
      ]
    });

    cards.push({
      id: 'lab-pending',
      theme: 'pending',
      icon: 'pending_actions',
      title: 'Awaiting Report',
      description: 'Your ECG report from April 9 is being reviewed by the cardiology team.',
      actions: [
        { label: 'Track Status', route: '/timeline' }
      ]
    });

    return cards;
  });

  // ===== Helpers =====
  timeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  doctorInitials(name: string): string {
    return name
      .replace(/Dr\.?\s*/i, '')
      .split(/\s+/)
      .map(s => s.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
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

  private formatShortDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ===== Actions =====
  setMedsTab(tab: 'ongoing' | 'all'): void {
    if (tab === 'all') {
      this.router.navigate(['/medications']);
      return;
    }
    this.medsTab.set(tab);
  }

  toggleMedCheck(medId: string): void {
    this.medChecked.update(set => {
      const next = new Set(set);
      if (next.has(medId)) next.delete(medId);
      else next.add(medId);
      return next;
    });
  }

  runActivity(activity: OngoingActivity): void {
    if (activity.action) {
      activity.action();
      return;
    }
    if (activity.route) {
      this.router.navigate([activity.route]);
    }
  }

  navigate(route: string | undefined): void {
    if (route) this.router.navigate([route]);
  }

  openManage(): void { this.manageOpen.set(true); }
  closeManage(): void { this.manageOpen.set(false); }

  actionPlaceholder(label: string): void {
    this.snackBar.open(`${label} — coming soon in this build`, 'Close', { duration: 3000 });
    this.closeManage();
  }

  submitFeedback(rating: number): void {
    this.feedbackRating.set(rating);
    setTimeout(() => this.feedbackDismissed.set(true), 2000);
  }

  dismissAlert(id: string): void {
    const d = this.data();
    if (!d) return;
    this.data.set({ ...d, alerts: d.alerts.filter(a => a.id !== id) });
  }
}
