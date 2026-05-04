import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { ApiService } from '../../core/services/api.service';
import { DashboardSummary, VitalSign, Appointment, Medication } from '../../core/models/patient.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatIconModule, MatButtonModule, MatChipsModule,
    MatProgressBarModule, MatDividerModule,
    SkeletonLoaderComponent, SkeletonCardComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dash">
      @if (loading()) {
        <app-skeleton-loader [count]="2" height="32px" [widths]="['60%', '40%']" />
        <div class="skeleton-chips"><app-skeleton-loader [count]="1" height="36px" [widths]="['100%']" /></div>
        <app-skeleton-card [lines]="4" />
        <div class="skeleton-grid">
          @for (i of [1,2,3]; track i) { <app-skeleton-card [lines]="2" /> }
        </div>
      } @else {

        <!-- ============================== -->
        <!-- 1. SMART CONTEXT BANNER        -->
        <!-- ============================== -->
        <mat-card class="context-banner" [ngClass]="'ctx-' + contextBanner().type">
          <div class="ctx-row">
            <div class="ctx-icon-wrap">
              <mat-icon>{{ contextBanner().icon }}</mat-icon>
            </div>
            <div class="ctx-text">
              <strong>{{ contextBanner().title }}</strong>
              <span>{{ contextBanner().subtitle }}</span>
            </div>
            <button mat-flat-button class="ctx-action" [routerLink]="contextBanner().actionRoute">
              {{ contextBanner().actionLabel }}
            </button>
          </div>
        </mat-card>

        <!-- ============================== -->
        <!-- 2. ACTION CHIPS ROW (GPay)     -->
        <!-- ============================== -->
        <div class="chips-scroll">
          @for (chip of actionChips; track chip.label) {
            <a class="action-chip" [routerLink]="chip.route">
              <mat-icon>{{ chip.icon }}</mat-icon>
              <span>{{ chip.label }}</span>
            </a>
          }
        </div>

        <!-- ============================== -->
        <!-- 3. TODAY CARD                  -->
        <!-- ============================== -->
        <mat-card class="today-card">
          <div class="today-header">
            <mat-icon>today</mat-icon>
            <strong>Today</strong>
            <span class="today-date">{{ todayFormatted }}</span>
          </div>
          <div class="today-items">
            @for (med of data()!.activeMedications; track med.id) {
              <div class="today-item">
                <div class="ti-time">{{ getMedTime(med) }}</div>
                <div class="ti-info">
                  <mat-icon class="ti-icon med-icon">medication</mat-icon>
                  <span>{{ med.name }} {{ med.dosage }}</span>
                </div>
                <button mat-stroked-button class="ti-btn"
                        [class.done]="medChecked().has(med.id)"
                        (click)="toggleMedCheck(med.id)">
                  @if (medChecked().has(med.id)) {
                    <mat-icon>check</mat-icon> Done
                  } @else {
                    Mark
                  }
                </button>
              </div>
            }
            @if (nextAppt(); as appt) {
              <div class="today-item appt-item">
                <div class="ti-time">{{ appt.time }}</div>
                <div class="ti-info">
                  <mat-icon class="ti-icon appt-icon">event</mat-icon>
                  <span>{{ appt.doctorName }} — {{ appt.specialty }}</span>
                </div>
                <button mat-stroked-button class="ti-btn view-btn" routerLink="/appointments">
                  View
                </button>
              </div>
            }
          </div>
          @if (streakDays() > 0) {
            <div class="streak-bar">
              <mat-icon>local_fire_department</mat-icon>
              <span>{{ streakDays() }}-day streak</span>
            </div>
          }
        </mat-card>

        <!-- ============================== -->
        <!-- 4. VITALS (top 3 + trends)     -->
        <!-- ============================== -->
        <div class="vitals-row">
          @for (vital of topVitals(); track vital.type) {
            <mat-card class="vital-card" [ngClass]="'v-' + vital.status">
              <div class="v-icon" [ngClass]="'vbg-' + vital.status">
                <mat-icon>{{ getVitalIcon(vital) }}</mat-icon>
              </div>
              <span class="v-label">{{ getVitalLabel(vital) }}</span>
              <div class="v-value-row">
                <span class="v-value">{{ vital.value }}</span>
                <mat-icon class="v-trend" [ngClass]="'trend-' + vital.status">
                  {{ vital.status === 'normal' ? 'trending_flat' : vital.status === 'warning' ? 'trending_up' : 'trending_up' }}
                </mat-icon>
              </div>
              <span class="v-unit">{{ vital.unit }}</span>
            </mat-card>
          }
          <a class="vital-card see-all-vital" routerLink="/timeline">
            <mat-icon>arrow_forward</mat-icon>
            <span>All Vitals</span>
          </a>
        </div>

        <!-- ============================== -->
        <!-- 5. NEXT APPOINTMENT            -->
        <!-- ============================== -->
        @if (nextAppt(); as appt) {
          <mat-card class="next-appt-card">
            <div class="na-row">
              <div class="na-icon" [ngClass]="appt.type">
                <mat-icon>{{ appt.type === 'telehealth' ? 'videocam' : 'local_hospital' }}</mat-icon>
              </div>
              <div class="na-info">
                <strong>{{ appt.doctorName }}</strong>
                <span class="na-spec">{{ appt.specialty }}</span>
                <span class="na-time">
                  <mat-icon class="sm-icon">schedule</mat-icon>
                  {{ appt.date | date:'mediumDate' }} at {{ appt.time }}
                </span>
              </div>
              <mat-chip class="na-chip" [ngClass]="appt.type">
                {{ appt.type === 'telehealth' ? 'Video' : 'In-Person' }}
              </mat-chip>
            </div>
          </mat-card>
        }

        <!-- ============================== -->
        <!-- 6. WHAT'S NEW                  -->
        <!-- ============================== -->
        <mat-card class="whats-new-card" (click)="dismissWhatsNew()">
          <div class="wn-row">
            <div class="wn-icon">
              <mat-icon>{{ whatsNew().icon }}</mat-icon>
            </div>
            <div class="wn-text">
              <strong>{{ whatsNew().title }}</strong>
              <span>{{ whatsNew().desc }}</span>
            </div>
            <mat-icon class="wn-arrow">arrow_forward</mat-icon>
          </div>
        </mat-card>

        <!-- ============================== -->
        <!-- 7. CSAT (conditional)          -->
        <!-- ============================== -->
        @if (!feedbackDismissed()) {
          <mat-card class="csat-card">
            <button mat-icon-button class="csat-x" (click)="feedbackDismissed.set(true)">
              <mat-icon>close</mat-icon>
            </button>
            <div class="csat-row">
              <mat-icon class="csat-ic">rate_review</mat-icon>
              <div class="csat-text">
                <strong>How was your last visit?</strong>
                <span>Quick tap helps us improve</span>
              </div>
              <div class="csat-stars">
                @for (s of [1,2,3,4,5]; track s) {
                  <button mat-icon-button [class.star-on]="feedbackRating() >= s" (click)="submitFeedback(s)">
                    <mat-icon>{{ feedbackRating() >= s ? 'star' : 'star_border' }}</mat-icon>
                  </button>
                }
              </div>
            </div>
            @if (feedbackRating()) {
              <div class="csat-ty"><mat-icon>check_circle</mat-icon> Thanks for your feedback!</div>
            }
          </mat-card>
        }

      }
    </div>
  `,
  styles: [`
    .dash { max-width: 800px; margin: 0 auto; padding-bottom: 60px; }
    .skeleton-chips { margin: 16px 0; }
    .skeleton-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-top: 16px; }

    /* ===== CONTEXT BANNER ===== */
    .context-banner {
      padding: 16px 20px; border-radius: 14px !important; margin-bottom: 16px;
      border: none;
    }
    .ctx-row { display: flex; align-items: center; gap: 14px; }
    .ctx-icon-wrap {
      width: 46px; height: 46px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .ctx-icon-wrap mat-icon { color: white; font-size: 24px; width: 24px; height: 24px; }
    .ctx-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .ctx-text strong { font-size: 15px; color: #222; }
    .ctx-text span { font-size: 13px; color: #888; }
    .ctx-action {
      flex-shrink: 0; font-weight: 600 !important; border-radius: 8px !important;
      font-size: 13px !important;
    }

    .ctx-appointment { background: #e8eaf6; }
    .ctx-appointment .ctx-icon-wrap { background: #3f51b5; }
    .ctx-appointment .ctx-action { background: #3f51b5 !important; color: white !important; }

    .ctx-payment { background: #fff3e0; }
    .ctx-payment .ctx-icon-wrap { background: #f57c00; }
    .ctx-payment .ctx-action { background: #f57c00 !important; color: white !important; }

    .ctx-lab { background: #e0f2f1; }
    .ctx-lab .ctx-icon-wrap { background: #00897b; }
    .ctx-lab .ctx-action { background: #00897b !important; color: white !important; }

    .ctx-refill { background: #fce4ec; }
    .ctx-refill .ctx-icon-wrap { background: #c62828; }
    .ctx-refill .ctx-action { background: #c62828 !important; color: white !important; }

    .ctx-clear { background: #e8f5e9; }
    .ctx-clear .ctx-icon-wrap { background: #2e7d32; }
    .ctx-clear .ctx-action { background: #2e7d32 !important; color: white !important; }

    /* ===== ACTION CHIPS ===== */
    .chips-scroll {
      display: flex; gap: 10px; overflow-x: auto; padding: 4px 0 16px;
      -webkit-overflow-scrolling: touch; scrollbar-width: none;
    }
    .chips-scroll::-webkit-scrollbar { display: none; }
    .action-chip {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      min-width: 76px; padding: 12px 8px; border-radius: 14px;
      background: white; border: 1px solid #e8e8e8; cursor: pointer;
      text-decoration: none; color: #333; transition: all 0.15s;
    }
    .action-chip:hover { border-color: #0d8a8a; background: #f0fafa; }
    .action-chip mat-icon { font-size: 24px; width: 24px; height: 24px; color: #0d8a8a; }
    .action-chip span { font-size: 11px; font-weight: 500; white-space: nowrap; }

    /* ===== TODAY CARD ===== */
    .today-card {
      padding: 16px 20px; border-radius: 14px !important; margin-bottom: 16px;
      border-left: 4px solid #0d8a8a;
    }
    .today-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    }
    .today-header mat-icon { color: #0d8a8a; }
    .today-header strong { font-size: 16px; color: #1b3a4b; }
    .today-date { margin-left: auto; font-size: 12px; color: #aaa; }

    .today-items { display: flex; flex-direction: column; gap: 8px; }
    .today-item {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 12px; background: #fafafa; border-radius: 10px;
    }
    .today-item.appt-item { background: #f5f5ff; }
    .ti-time { font-size: 12px; color: #888; width: 56px; flex-shrink: 0; font-weight: 500; }
    .ti-info { flex: 1; display: flex; align-items: center; gap: 6px; font-size: 13px; color: #333; }
    .ti-icon { font-size: 18px; width: 18px; height: 18px; }
    .med-icon { color: #f57c00; }
    .appt-icon { color: #3f51b5; }
    .ti-btn {
      font-size: 12px !important; padding: 2px 12px !important;
      min-height: 28px !important; border-radius: 6px !important;
    }
    .ti-btn.done {
      background: #e8f5e9 !important; color: #2e7d32 !important;
      border-color: #c8e6c9 !important;
    }
    .ti-btn.view-btn { color: #3f51b5 !important; border-color: #c5cae9 !important; }

    .streak-bar {
      display: flex; align-items: center; gap: 6px;
      margin-top: 10px; padding-top: 10px; border-top: 1px solid #f0f0f0;
      font-size: 13px; color: #f57c00; font-weight: 600;
    }
    .streak-bar mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* ===== VITALS ===== */
    .vitals-row {
      display: flex; gap: 12px; margin-bottom: 16px; overflow-x: auto;
      -webkit-overflow-scrolling: touch; scrollbar-width: none;
    }
    .vitals-row::-webkit-scrollbar { display: none; }
    .vital-card {
      min-width: 130px; padding: 16px; border-radius: 14px !important;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      text-align: center; flex-shrink: 0;
    }
    .v-icon {
      width: 38px; height: 38px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; margin-bottom: 4px;
    }
    .v-icon mat-icon { font-size: 20px; width: 20px; height: 20px; color: white; }
    .vbg-normal { background: #2e7d32; }
    .vbg-warning { background: #f57c00; }
    .vbg-critical { background: #d32f2f; }
    .v-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.3px; }
    .v-value-row { display: flex; align-items: center; gap: 4px; }
    .v-value { font-size: 22px; font-weight: 700; color: #222; }
    .v-trend { font-size: 18px; width: 18px; height: 18px; }
    .trend-normal { color: #2e7d32; }
    .trend-warning { color: #f57c00; }
    .trend-critical { color: #d32f2f; }
    .v-unit { font-size: 11px; color: #aaa; }
    .see-all-vital {
      min-width: 80px; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 4px;
      cursor: pointer; text-decoration: none; color: #0d8a8a;
      border: 1px dashed #b2dfdb !important;
    }
    .see-all-vital mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .see-all-vital span { font-size: 11px; font-weight: 500; }

    /* ===== NEXT APPOINTMENT ===== */
    .next-appt-card {
      padding: 16px; border-radius: 14px !important; margin-bottom: 16px;
    }
    .na-row { display: flex; align-items: center; gap: 14px; }
    .na-icon {
      width: 42px; height: 42px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .na-icon.in_person { background: #e8eaf6; color: #3f51b5; }
    .na-icon.telehealth { background: #e0f2f1; color: #00897b; }
    .na-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .na-info strong { font-size: 14px; }
    .na-spec { font-size: 12px; color: #888; }
    .na-time { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #aaa; }
    .sm-icon { font-size: 14px; width: 14px; height: 14px; }
    .na-chip { font-size: 11px !important; }
    .na-chip.in_person { background: #e8eaf6 !important; color: #3f51b5 !important; }
    .na-chip.telehealth { background: #e0f2f1 !important; color: #00897b !important; }

    /* ===== WHAT'S NEW ===== */
    .whats-new-card {
      padding: 14px 16px; border-radius: 14px !important; margin-bottom: 16px;
      cursor: pointer; transition: box-shadow 0.15s;
      background: #f8f9ff; border: 1px solid #e8eaf6;
    }
    .whats-new-card:hover { box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
    .wn-row { display: flex; align-items: center; gap: 12px; }
    .wn-icon {
      width: 36px; height: 36px; border-radius: 8px; background: #3f51b5;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .wn-icon mat-icon { color: white; font-size: 18px; width: 18px; height: 18px; }
    .wn-text { flex: 1; display: flex; flex-direction: column; gap: 1px; }
    .wn-text strong { font-size: 13px; color: #333; }
    .wn-text span { font-size: 12px; color: #999; }
    .wn-arrow { color: #ccc; }

    /* ===== CSAT ===== */
    .csat-card {
      padding: 14px 16px; border-radius: 14px !important; position: relative;
      border: 1px solid #e8eaf6; background: #fafbff;
    }
    .csat-x { position: absolute; top: 2px; right: 2px; }
    .csat-row { display: flex; align-items: center; gap: 12px; }
    .csat-ic { font-size: 28px; width: 28px; height: 28px; color: #3f51b5; }
    .csat-text { flex: 1; }
    .csat-text strong { font-size: 14px; color: #333; display: block; }
    .csat-text span { font-size: 12px; color: #999; }
    .csat-stars { display: flex; gap: 0; }
    .csat-stars button { color: #ddd; }
    .csat-stars .star-on { color: #ffc107 !important; }
    .csat-ty {
      display: flex; align-items: center; gap: 6px; margin-top: 8px;
      font-size: 13px; color: #4caf50;
    }
    .csat-ty mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 600px) {
      .vital-card { min-width: 110px; padding: 12px; }
      .v-value { font-size: 18px; }
      .csat-row { flex-wrap: wrap; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly loading = signal(true);
  readonly data = signal<DashboardSummary | null>(null);
  readonly feedbackDismissed = signal(false);
  readonly feedbackRating = signal(0);
  readonly medChecked = signal(new Map<string, boolean>());
  readonly whatsNewIndex = signal(0);

  readonly todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });

  readonly actionChips = [
    { label: 'Book Appt', icon: 'event', route: '/appointments' },
    { label: 'Pay Bill', icon: 'payment', route: '/payments' },
    { label: 'Lab Results', icon: 'science', route: '/timeline' },
    { label: 'Rx', icon: 'medication', route: '/medications' },
    { label: 'Records', icon: 'folder_shared', route: '/timeline' },
    { label: 'Telehealth', icon: 'videocam', route: '/appointments' }
  ];

  readonly whatsNewItems = [
    { icon: 'science', title: 'Lab results ready', desc: 'Your HbA1c results from April 5 are available' },
    { icon: 'campaign', title: 'Flu vaccination available', desc: 'Seasonal flu shots now available at all branches' },
    { icon: 'videocam', title: 'Telehealth appointments', desc: 'Book video consultations from home — now available' },
    { icon: 'local_offer', title: 'Health checkup package', desc: 'Comprehensive checkup at 20% off this month' }
  ];

  ngOnInit(): void {
    this.api.getDashboard().subscribe(summary => {
      this.data.set(summary);
      this.loading.set(false);
    });
  }

  readonly contextBanner = computed(() => {
    const d = this.data();
    if (!d) return { type: 'clear', icon: 'check_circle', title: 'Loading...', subtitle: '', actionLabel: '', actionRoute: '/' };

    const nextAppt = d.upcomingAppointments[0];
    const pendingAlert = d.alerts.find(a => a.type === 'urgent');
    const refillAlert = d.alerts.find(a => a.title.includes('Refill'));
    const labAlert = d.alerts.find(a => a.title.includes('Lab'));

    if (nextAppt) {
      return {
        type: 'appointment',
        icon: 'event',
        title: `Appointment with ${nextAppt.doctorName}`,
        subtitle: `${nextAppt.date} at ${nextAppt.time}`,
        actionLabel: nextAppt.type === 'telehealth' ? 'Join Call' : 'Get Directions',
        actionRoute: '/appointments'
      };
    }
    if (pendingAlert) {
      return {
        type: 'payment',
        icon: 'warning',
        title: pendingAlert.title,
        subtitle: pendingAlert.message,
        actionLabel: 'View',
        actionRoute: '/payments'
      };
    }
    if (labAlert) {
      return {
        type: 'lab',
        icon: 'science',
        title: 'Lab results are ready',
        subtitle: labAlert.message,
        actionLabel: 'View Results',
        actionRoute: '/timeline'
      };
    }
    if (refillAlert) {
      return {
        type: 'refill',
        icon: 'medication',
        title: refillAlert.title,
        subtitle: refillAlert.message,
        actionLabel: 'Request Refill',
        actionRoute: '/medications'
      };
    }
    return {
      type: 'clear',
      icon: 'check_circle',
      title: `All clear, ${d.patient.firstName}`,
      subtitle: 'No urgent items. You\'re all set!',
      actionLabel: 'My Records',
      actionRoute: '/timeline'
    };
  });

  readonly nextAppt = computed<Appointment | null>(() => {
    return this.data()?.upcomingAppointments?.[0] ?? null;
  });

  readonly topVitals = computed<VitalSign[]>(() => {
    const vitals = this.data()?.recentVitals ?? [];
    const priority = ['blood_pressure', 'glucose', 'heart_rate'];
    return priority.map(t => vitals.find(v => v.type === t)).filter(Boolean) as VitalSign[];
  });

  readonly streakDays = computed(() => {
    const meds = this.data()?.activeMedications ?? [];
    if (!meds.length) return 0;
    const allTaken = meds[0].taken;
    let streak = 0;
    for (let i = allTaken.length - 1; i >= 0; i--) {
      if (allTaken[i]) streak++;
      else break;
    }
    return streak;
  });

  whatsNew() {
    return this.whatsNewItems[this.whatsNewIndex() % this.whatsNewItems.length];
  }

  dismissWhatsNew(): void {
    this.whatsNewIndex.update(i => i + 1);
  }

  getMedTime(med: Medication): string {
    if (med.frequency.toLowerCase().includes('twice')) return 'Morning';
    if (med.frequency.toLowerCase().includes('once')) return 'Morning';
    return 'Daily';
  }

  toggleMedCheck(medId: string): void {
    this.medChecked.update(map => {
      const next = new Map(map);
      if (next.has(medId)) next.delete(medId);
      else next.set(medId, true);
      return next;
    });
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
      temperature: 'Temperature', oxygen: 'SpO\u2082', weight: 'Weight', glucose: 'Glucose'
    };
    return m[vital.type] ?? vital.type;
  }

  submitFeedback(rating: number): void {
    this.feedbackRating.set(rating);
    setTimeout(() => this.feedbackDismissed.set(true), 2000);
  }
}
