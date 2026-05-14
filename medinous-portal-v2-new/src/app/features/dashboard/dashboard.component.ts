import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { ApiService } from '../../core/services/api.service';
import { DashboardSummary, VitalSign, Appointment, AlertItem, Consultation } from '../../core/models/patient.model';

type CareItemKind = 'lab-ready' | 'lab-prescribed' | 'followup';

interface CareItem {
  id: string;
  kind: CareItemKind;
  title: string;            // e.g. "HbA1c results ready"
  detail: string;           // reason or lab subtype
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
    CommonModule, RouterModule,
    MatCardModule, MatIconModule, MatButtonModule, MatChipsModule,
    MatProgressBarModule, MatDividerModule, MatTooltipModule, MatSnackBarModule,
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
          <!-- 1. QUICK ACTIONS (top — primary actions)     -->
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
          <!-- 2. UPCOMING APPOINTMENT (only if exists)     -->
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
          <!-- 3. WHAT'S NEXT (labs + follow-ups merged)    -->
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
                      <span class="cd-dow">{{ item.actionDate | date:'EEE' }}</span>
                    </div>
                    <div class="care-body">
                      <div class="cb-head">
                        <strong class="cb-title">{{ item.title }}</strong>
                        <span class="cb-kind-chip" [class]="'chip-' + item.kind">
                          <mat-icon>{{ kindIcon(item.kind) }}</mat-icon>
                          {{ kindLabel(item.kind) }}
                        </span>
                      </div>
                      <p class="cb-detail">{{ item.detail }}</p>
                      <div class="cb-doctor">
                        <div class="cb-avatar" [class]="'av-' + specialtyTheme(item.doctorSpecialty)">
                          {{ doctorInitials(item.doctorName) }}
                        </div>
                        <div class="cb-doc-info">
                          <strong>{{ item.doctorName }}</strong>
                          <span>{{ item.doctorSpecialty }} · Consulted {{ item.consultationDate | date:'mediumDate' }}</span>
                        </div>
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
          <!-- 5. HEALTH SNAPSHOT (vitals)                  -->
          <!-- ============================================ -->
          <section class="section vitals-section">
            <div class="sec-head">
              <div class="sec-titles">
                <h2>Health Snapshot</h2>
                <p class="sec-sub">Latest recorded vitals</p>
              </div>
              <a class="sec-link" routerLink="/timeline">
                View All <mat-icon>arrow_forward</mat-icon>
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
          <!-- 6. MEDICATIONS LINK CARD (compact)           -->
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
    .dash { max-width: 920px; margin: 0 auto; padding-bottom: 60px; }
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
    .ap-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #546e7a; }
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

    /* ===== What's Next (unified care cards) ===== */
    .care-scroll { padding: 4px 2px 12px; }
    .care-card {
      flex-shrink: 0; width: 320px;
      display: flex; gap: 14px;
      padding: 14px; background: white;
      border: 1px solid #eceff1; border-radius: 16px;
      text-align: left; font: inherit; cursor: pointer; color: inherit;
      transition: all 0.15s;
    }
    .care-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(0,0,0,0.06);
      border-color: #c5cae9;
    }

    /* Calendar tile (left) — colored per kind */
    .care-date-tile {
      width: 64px; flex-shrink: 0;
      display: flex; flex-direction: column; align-items: center;
      padding: 8px 4px 10px;
      border-radius: 12px; border: 1px solid transparent;
    }
    .cd-label {
      font-size: 9px; text-transform: uppercase; letter-spacing: .06em;
      font-weight: 700; padding-bottom: 2px;
    }
    .cd-month { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; font-weight: 700; }
    .cd-day { font-size: 22px; line-height: 1.05; font-weight: 700; }
    .cd-dow { font-size: 9px; text-transform: uppercase; letter-spacing: .04em; font-weight: 600; opacity: .8; }

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
    .care-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
    .cb-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .cb-title { font-size: 14px; color: #1b3a4b; font-weight: 600; line-height: 1.3; }
    .cb-kind-chip {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 8px; border-radius: 10px;
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
      flex-shrink: 0;
    }
    .cb-kind-chip mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .chip-lab-ready { background: #e0f2f1; color: #00695c; }
    .chip-lab-prescribed { background: #fff3e0; color: #e65100; }
    .chip-followup { background: #eef0fb; color: #1a237e; }

    .cb-detail {
      font-size: 12px; color: #607d8b; line-height: 1.45; margin: 0;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }

    .cb-doctor {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px; background: #fafbfd;
      border-radius: 8px; margin-top: 2px;
    }
    .cb-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      color: white; font-weight: 600; font-size: 11px;
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

    .cb-doc-info { display: flex; flex-direction: column; gap: 0; min-width: 0; }
    .cb-doc-info strong { font-size: 12px; color: #1b3a4b; }
    .cb-doc-info span { font-size: 10px; color: #90a4ae; }

    .cb-cta {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 12px; color: #1a237e; font-weight: 600;
      margin-top: 4px;
    }
    .cb-cta mat-icon { font-size: 14px; width: 14px; height: 14px; }

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
      .appt-premium { flex-direction: column; padding: 16px; gap: 12px; }
      .ap-left { flex-direction: row; }
      .ap-actions { gap: 6px; }
      .ap-manage { flex: 1; margin-left: 0; }
      .care-card { width: 280px; }
      .specialty-grid { grid-template-columns: repeat(3, 1fr); }
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
      .specialty-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly data = signal<DashboardSummary | null>(null);
  readonly consultations = signal<Consultation[]>([]);
  readonly feedbackDismissed = signal(false);
  readonly feedbackRating = signal(0);
  readonly manageOpen = signal(false);

  // Order: most-likely tap targets first
  readonly actionChips = [
    { label: 'Book Appointment', icon: 'event_available', route: '/appointments', color: '#3949ab' },
    { label: 'Consultations', icon: 'medical_information', route: '/consultations', color: '#5e35b1' },
    { label: 'Medications', icon: 'medication', route: '/medications', color: '#ef6c00' },
    { label: 'Records', icon: 'folder_shared', route: '/timeline', color: '#00897b' },
    { label: 'Payments', icon: 'payments', route: '/payments', color: '#43a047' },
    { label: 'Telehealth', icon: 'videocam', route: '/appointments', color: '#1565c0' }
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
            title: `${inv.name} — results ready`,
            detail: `Reviewed report from ${inv.resultDate ? new Date(inv.resultDate).toLocaleDateString() : 'recent visit'}`,
            doctorName: c.doctorName,
            doctorSpecialty: c.doctorSpecialty,
            consultationId: c.id,
            consultationDate: c.date,
            actionDate: inv.resultDate ?? c.date,
            category: inv.category,
            tileLabel: 'Result'
          });
        } else if (inv.status === 'pending') {
          prescribed.push({
            id: `${c.id}:${inv.name}:pending`,
            kind: 'lab-prescribed',
            title: `${inv.name} prescribed`,
            detail: 'Book a slot, pay in advance, and walk in.',
            doctorName: c.doctorName,
            doctorSpecialty: c.doctorSpecialty,
            consultationId: c.id,
            consultationDate: c.date,
            actionDate: c.date,
            category: inv.category,
            tileLabel: 'Since'
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
            detail: c.followUp.reason,
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
    return [...ready, ...followups, ...prescribed].slice(0, 6);
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
      // Deep-link to My Records with the lab name as highlight; timeline filters and pulses the row
      this.router.navigate(['/timeline'], { queryParams: { highlight: item.title.replace(' — results ready', '') } });
    } else if (item.kind === 'lab-prescribed') {
      this.router.navigate(['/appointments'], {
        queryParams: { lab: item.title.replace(' prescribed', '') }
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
