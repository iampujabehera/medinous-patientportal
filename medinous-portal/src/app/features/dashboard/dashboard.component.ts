import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { ApiService } from '../../core/services/api.service';
import { GeographyService } from '../../core/services/geography.service';
import { DashboardSummary, VitalSign, AlertItem } from '../../core/models/patient.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatIconModule, MatButtonModule, MatChipsModule,
    MatBadgeModule, MatProgressBarModule, MatDividerModule,
    SkeletonCardComponent, SkeletonLoaderComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard">
      <!-- Greeting Section -->
      <section class="greeting-section">
        @if (loading()) {
          <app-skeleton-loader [count]="2" height="28px" [widths]="['50%', '30%']" />
        } @else {
          <h1 class="greeting">
            Good {{ timeOfDay() }}, {{ data()?.patient?.firstName }}
          </h1>
          <p class="subtitle">Here's your health summary for today</p>
        }
      </section>

      <!-- Alerts Banner -->
      @if (!loading() && data()?.alerts?.length) {
        <section class="alerts-section">
          @for (alert of data()!.alerts; track alert.id) {
            <mat-card class="alert-card" [ngClass]="'alert-' + alert.type">
              <div class="alert-content">
                <mat-icon>{{ getAlertIcon(alert) }}</mat-icon>
                <div class="alert-text">
                  <strong>{{ alert.title }}</strong>
                  <span>{{ alert.message }}</span>
                </div>
                <button mat-icon-button (click)="dismissAlert(alert.id)">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </mat-card>
          }
        </section>
      }

      <!-- CSAT Feedback Prompt (shown if completed appointment exists) -->
      @if (!loading() && !feedbackDismissed() && data()?.upcomingAppointments?.length) {
        <section class="csat-section">
          <mat-card class="csat-card">
            <button mat-icon-button class="csat-close" (click)="feedbackDismissed.set(true)">
              <mat-icon>close</mat-icon>
            </button>
            <div class="csat-content">
              <mat-icon class="csat-icon">rate_review</mat-icon>
              <div class="csat-text">
                <strong>How was your last visit?</strong>
                <span>Quick feedback helps us improve your care</span>
              </div>
              <div class="csat-stars">
                @for (star of [1,2,3,4,5]; track star) {
                  <button mat-icon-button
                          [class.star-active]="feedbackRating() >= star"
                          (click)="submitFeedback(star)">
                    <mat-icon>{{ feedbackRating() >= star ? 'star' : 'star_border' }}</mat-icon>
                  </button>
                }
              </div>
            </div>
            @if (feedbackRating()) {
              <div class="csat-thanks">
                <mat-icon>check_circle</mat-icon>
                Thank you for your feedback!
              </div>
            }
          </mat-card>
        </section>
      }

      <!-- Vitals Grid -->
      <section class="section">
        <h2 class="section-title">
          <mat-icon>monitor_heart</mat-icon> Recent Vitals
        </h2>
        <div class="vitals-grid">
          @if (loading()) {
            @for (i of skeletonVitals; track i) {
              <app-skeleton-card [lines]="2" lineHeight="20px" />
            }
          } @else {
            @for (vital of data()?.recentVitals; track vital.type) {
              <mat-card class="vital-card" [ngClass]="'vital-' + vital.status">
                <div class="vital-icon-wrapper">
                  <mat-icon>{{ getVitalIcon(vital) }}</mat-icon>
                </div>
                <div class="vital-info">
                  <span class="vital-label">{{ getVitalLabel(vital) }}</span>
                  <span class="vital-value">{{ vital.value }}
                    <small>{{ vital.unit }}</small>
                  </span>
                </div>
                <mat-chip [ngClass]="'status-' + vital.status">
                  {{ vital.status }}
                </mat-chip>
              </mat-card>
            }
          }
        </div>
      </section>

      <!-- Two Column Layout -->
      <div class="two-columns">
        <!-- Upcoming Appointments -->
        <section class="section">
          <div class="section-header">
            <h2 class="section-title">
              <mat-icon>event</mat-icon> Upcoming Appointments
            </h2>
            <button mat-stroked-button color="primary" routerLink="/appointments">
              Book New
            </button>
          </div>
          @if (loading()) {
            @for (i of skeletonCards; track i) {
              <app-skeleton-card [lines]="3" [showAvatar]="true" variant="compact" />
            }
          } @else {
            @for (appt of data()?.upcomingAppointments; track appt.id) {
              <mat-card class="appointment-card">
                <div class="appt-row">
                  <div class="appt-icon" [ngClass]="appt.type">
                    <mat-icon>{{ appt.type === 'telehealth' ? 'videocam' : 'local_hospital' }}</mat-icon>
                  </div>
                  <div class="appt-details">
                    <strong>{{ appt.doctorName }}</strong>
                    <span class="appt-specialty">{{ appt.specialty }}</span>
                    <div class="appt-meta">
                      <mat-icon class="small-icon">schedule</mat-icon>
                      {{ appt.date | date:'mediumDate' }} at {{ appt.time }}
                    </div>
                    <div class="appt-meta">
                      <mat-icon class="small-icon">location_on</mat-icon>
                      {{ appt.location }}
                    </div>
                  </div>
                  <mat-chip class="appt-type-chip" [ngClass]="appt.type">
                    {{ appt.type === 'telehealth' ? 'Video' : 'In-Person' }}
                  </mat-chip>
                </div>
              </mat-card>
            }
            @if (!data()?.upcomingAppointments?.length) {
              <mat-card class="empty-card">
                <mat-icon>event_busy</mat-icon>
                <p>No upcoming appointments</p>
                <button mat-flat-button color="primary" routerLink="/appointments">
                  Schedule Now
                </button>
              </mat-card>
            }
          }
        </section>

        <!-- Active Medications -->
        <section class="section">
          <div class="section-header">
            <h2 class="section-title">
              <mat-icon>medication</mat-icon> Active Medications
            </h2>
            <button mat-stroked-button color="primary" routerLink="/medications">
              View All
            </button>
          </div>
          @if (loading()) {
            @for (i of skeletonCards; track i) {
              <app-skeleton-card [lines]="3" variant="compact" />
            }
          } @else {
            @for (med of data()?.activeMedications; track med.id) {
              <mat-card class="med-card">
                <div class="med-header">
                  <div>
                    <strong>{{ med.name }}</strong>
                    <span class="med-dosage">{{ med.dosage }} — {{ med.frequency }}</span>
                  </div>
                  <mat-chip class="refill-chip"
                            [ngClass]="med.refillsRemaining <= 2 ? 'refill-low' : 'refill-ok'">
                    {{ med.refillsRemaining }} refills
                  </mat-chip>
                </div>
                <div class="adherence-row">
                  <span class="adherence-label">7-day adherence</span>
                  <div class="adherence-dots">
                    @for (taken of med.taken; track $index) {
                      <div class="dot" [ngClass]="taken ? 'taken' : 'missed'"></div>
                    }
                  </div>
                  <span class="adherence-pct">
                    {{ getAdherence(med.taken) }}%
                  </span>
                </div>
                <mat-progress-bar
                  mode="determinate"
                  [value]="getAdherence(med.taken)"
                  [color]="getAdherence(med.taken) >= 80 ? 'primary' : 'warn'" />
              </mat-card>
            }
          }
        </section>
      </div>

      <!-- Quick Actions -->
      @if (!loading()) {
        <section class="quick-actions">
          <h2 class="section-title">
            <mat-icon>bolt</mat-icon> Quick Actions
          </h2>
          <div class="actions-grid">
            <button mat-stroked-button routerLink="/appointments" class="action-btn">
              <mat-icon>add_circle</mat-icon> Book Appointment
            </button>
            <button mat-stroked-button routerLink="/medications" class="action-btn">
              <mat-icon>medication</mat-icon> Log Medication
            </button>
            <button mat-stroked-button routerLink="/timeline" class="action-btn">
              <mat-icon>history</mat-icon> View History
            </button>
            <button mat-stroked-button class="action-btn">
              <mat-icon>download</mat-icon> Download Records
            </button>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1200px;
      margin: 0 auto;
    }

    .greeting-section {
      margin-bottom: 24px;
    }

    .greeting {
      font-size: 28px;
      font-weight: 600;
      margin: 0;
      color: #1a237e;
    }

    .subtitle {
      color: #666;
      margin: 4px 0 0;
      font-size: 15px;
    }

    /* Alerts */
    .alerts-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 24px;
    }

    .alert-card {
      padding: 12px 16px;
    }

    .alert-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .alert-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 14px;
    }

    .alert-urgent {
      border-left: 4px solid #d32f2f;
      background: #ffebee;
    }

    .alert-warning {
      border-left: 4px solid #f57c00;
      background: #fff3e0;
    }

    .alert-info {
      border-left: 4px solid #1976d2;
      background: #e3f2fd;
    }

    .alert-urgent mat-icon { color: #d32f2f; }
    .alert-warning mat-icon { color: #f57c00; }
    .alert-info mat-icon { color: #1976d2; }

    /* Section */
    .section {
      margin-bottom: 28px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 16px;
      color: #333;
    }

    .section-title mat-icon {
      color: #3f51b5;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-header .section-title {
      margin: 0;
    }

    /* Vitals */
    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }

    .vital-card {
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: transform 0.2s;
    }

    .vital-card:hover {
      transform: translateY(-2px);
    }

    .vital-icon-wrapper {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e8eaf6;
    }

    .vital-icon-wrapper mat-icon {
      color: #3f51b5;
    }

    .vital-normal .vital-icon-wrapper { background: #e8f5e9; }
    .vital-normal .vital-icon-wrapper mat-icon { color: #2e7d32; }
    .vital-warning .vital-icon-wrapper { background: #fff3e0; }
    .vital-warning .vital-icon-wrapper mat-icon { color: #f57c00; }
    .vital-critical .vital-icon-wrapper { background: #ffebee; }
    .vital-critical .vital-icon-wrapper mat-icon { color: #d32f2f; }

    .vital-info {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .vital-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .vital-value {
      font-size: 22px;
      font-weight: 700;
      color: #222;
    }

    .vital-value small {
      font-size: 12px;
      font-weight: 400;
      color: #888;
    }

    .status-normal { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-warning { background: #fff3e0 !important; color: #f57c00 !important; }
    .status-critical { background: #ffebee !important; color: #d32f2f !important; }

    /* Two Columns */
    .two-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    @media (max-width: 768px) {
      .two-columns { grid-template-columns: 1fr; }
      .vitals-grid { grid-template-columns: repeat(2, 1fr); }
    }

    /* Appointments */
    .appointment-card {
      padding: 16px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: box-shadow 0.2s;
    }

    .appointment-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .appt-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .appt-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .appt-icon.in_person {
      background: #e8eaf6;
      color: #3f51b5;
    }

    .appt-icon.telehealth {
      background: #e0f2f1;
      color: #00897b;
    }

    .appt-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .appt-specialty {
      font-size: 13px;
      color: #666;
    }

    .appt-meta {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #888;
    }

    .small-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .appt-type-chip.telehealth {
      background: #e0f2f1 !important;
      color: #00897b !important;
    }

    .appt-type-chip.in_person {
      background: #e8eaf6 !important;
      color: #3f51b5 !important;
    }

    /* Medications */
    .med-card {
      padding: 16px;
      margin-bottom: 12px;
    }

    .med-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .med-header div {
      display: flex;
      flex-direction: column;
    }

    .med-dosage {
      font-size: 13px;
      color: #666;
    }

    .refill-low { background: #fff3e0 !important; color: #f57c00 !important; }
    .refill-ok { background: #e8f5e9 !important; color: #2e7d32 !important; }

    .adherence-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }

    .adherence-label {
      font-size: 12px;
      color: #888;
    }

    .adherence-dots {
      display: flex;
      gap: 4px;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .dot.taken { background: #4caf50; }
    .dot.missed { background: #ef5350; }

    .adherence-pct {
      font-size: 13px;
      font-weight: 600;
      margin-left: auto;
    }

    /* Quick Actions */
    .quick-actions {
      margin-bottom: 28px;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .action-btn {
      padding: 20px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    /* Empty state */
    .empty-card {
      padding: 32px;
      text-align: center;
      color: #888;
    }

    .empty-card mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
    }

    /* CSAT Feedback */
    .csat-section { margin-bottom: 24px; }
    .csat-card {
      padding: 16px 20px; position: relative;
      border: 1px solid #e8eaf6; background: #fafbff;
    }
    .csat-close { position: absolute; top: 4px; right: 4px; }
    .csat-content { display: flex; align-items: center; gap: 16px; }
    .csat-icon { font-size: 32px; width: 32px; height: 32px; color: #3f51b5; }
    .csat-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .csat-text strong { font-size: 15px; color: #333; }
    .csat-text span { font-size: 13px; color: #888; }
    .csat-stars { display: flex; gap: 2px; }
    .csat-stars button { color: #ccc; }
    .csat-stars .star-active { color: #ffc107 !important; }
    .csat-thanks {
      display: flex; align-items: center; gap: 8px; margin-top: 10px;
      font-size: 14px; color: #4caf50;
    }
    .csat-thanks mat-icon { font-size: 18px; width: 18px; height: 18px; }
    @media (max-width: 600px) { .csat-content { flex-wrap: wrap; } }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly geo = inject(GeographyService);

  readonly loading = signal(true);
  readonly data = signal<DashboardSummary | null>(null);
  readonly feedbackDismissed = signal(false);
  readonly feedbackRating = signal(0);

  readonly skeletonVitals = [1, 2, 3, 4, 5, 6];
  readonly skeletonCards = [1, 2, 3];

  ngOnInit(): void {
    this.api.getDashboard().subscribe(summary => {
      this.data.set(summary);
      this.loading.set(false);
    });
  }

  timeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  getVitalIcon(vital: VitalSign): string {
    const icons: Record<string, string> = {
      blood_pressure: 'speed',
      heart_rate: 'favorite',
      temperature: 'thermostat',
      oxygen: 'air',
      weight: 'monitor_weight',
      glucose: 'water_drop'
    };
    return icons[vital.type] ?? 'info';
  }

  getVitalLabel(vital: VitalSign): string {
    const labels: Record<string, string> = {
      blood_pressure: 'Blood Pressure',
      heart_rate: 'Heart Rate',
      temperature: 'Temperature',
      oxygen: 'SpO₂',
      weight: 'Weight',
      glucose: 'Glucose'
    };
    return labels[vital.type] ?? vital.type;
  }

  getAlertIcon(alert: AlertItem): string {
    const icons: Record<string, string> = {
      urgent: 'error',
      warning: 'warning',
      info: 'info'
    };
    return icons[alert.type] ?? 'info';
  }

  getAdherence(taken: boolean[]): number {
    if (!taken.length) return 0;
    return Math.round((taken.filter(Boolean).length / taken.length) * 100);
  }

  submitFeedback(rating: number): void {
    this.feedbackRating.set(rating);
    setTimeout(() => this.feedbackDismissed.set(true), 2000);
  }

  dismissAlert(id: string): void {
    const current = this.data();
    if (current) {
      this.data.set({
        ...current,
        alerts: current.alerts.filter(a => a.id !== id)
      });
    }
  }
}
