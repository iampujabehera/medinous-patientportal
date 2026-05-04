import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialogModule } from '@angular/material/dialog';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { ApiService } from '../../core/services/api.service';
import { OfflineStorageService } from '../../core/services/offline-storage.service';
import { Medication } from '../../core/models/patient.model';
import { firstValueFrom } from 'rxjs';

interface MedicationLog {
  id: string;
  medicationId: string;
  timestamp: string;
  taken: boolean;
}

@Component({
  selector: 'app-medications',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatIconModule, MatButtonModule, MatChipsModule,
    MatProgressBarModule, MatSnackBarModule, MatBadgeModule, MatDialogModule,
    SkeletonCardComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="medications-container">
      <div class="meds-header">
        <div>
          <h1>Medication Tracker</h1>
          <p class="subtitle">Track your daily medications and adherence</p>
        </div>
        @if (isOffline()) {
          <mat-chip class="offline-badge">
            <mat-icon>cloud_off</mat-icon> Offline Mode
          </mat-chip>
        }
      </div>

      <!-- Today's Schedule -->
      <section class="section">
        <h2 class="section-title">
          <mat-icon>today</mat-icon> Today's Schedule
        </h2>
        @if (loading()) {
          @for (i of [1,2,3]; track i) {
            <app-skeleton-card [lines]="3" [showAvatar]="true" />
          }
        } @else {
          @for (med of medications(); track med.id) {
            <mat-card class="med-card" [class.taken-today]="isTakenToday(med.id)">
              <div class="med-row">
                <div class="med-pill-icon" [class.taken]="isTakenToday(med.id)">
                  <mat-icon>{{ isTakenToday(med.id) ? 'check_circle' : 'medication' }}</mat-icon>
                </div>
                <div class="med-info">
                  <strong>{{ med.name }}</strong>
                  <span class="med-dosage">{{ med.dosage }} — {{ med.frequency }}</span>
                  @if (med.instructions) {
                    <span class="med-instructions">
                      <mat-icon class="tiny-icon">info</mat-icon>
                      {{ med.instructions }}
                    </span>
                  }
                  <span class="med-prescribed">Prescribed by {{ med.prescribedBy }}</span>
                </div>
                <div class="med-actions">
                  @if (!isTakenToday(med.id)) {
                    <button mat-flat-button color="primary" (click)="logMedication(med, true)">
                      <mat-icon>check</mat-icon> Take
                    </button>
                    <button mat-stroked-button color="warn" (click)="logMedication(med, false)">
                      Skip
                    </button>
                  } @else {
                    <mat-chip class="taken-chip">
                      <mat-icon>check</mat-icon> Taken
                    </mat-chip>
                  }
                </div>
              </div>

              <!-- Adherence -->
              <div class="adherence-section">
                <div class="adherence-header">
                  <span>7-Day Adherence</span>
                  <span class="adherence-pct">{{ getAdherence(med) }}%</span>
                </div>
                <div class="adherence-days">
                  @for (taken of med.taken; track $index) {
                    <div class="day-indicator" [ngClass]="taken ? 'day-taken' : 'day-missed'">
                      <span class="day-label">{{ getDayLabel($index) }}</span>
                      <mat-icon>{{ taken ? 'check_circle' : 'cancel' }}</mat-icon>
                    </div>
                  }
                </div>
                <mat-progress-bar
                  mode="determinate"
                  [value]="getAdherence(med)"
                  [color]="getAdherence(med) >= 80 ? 'primary' : 'warn'" />
              </div>

              <!-- Refill -->
              <div class="refill-section">
                <div class="refill-info">
                  <mat-icon class="tiny-icon">replay</mat-icon>
                  <span>{{ med.refillsRemaining }} refills remaining</span>
                </div>
                @if (med.refillsRemaining <= 2) {
                  <button mat-stroked-button color="warn" class="refill-btn">
                    <mat-icon>shopping_cart</mat-icon> Request Refill
                  </button>
                }
              </div>
            </mat-card>
          }

          @if (!medications().length) {
            <mat-card class="empty-card">
              <mat-icon>medication</mat-icon>
              <h3>No active medications</h3>
              <p>Your active prescriptions will appear here</p>
            </mat-card>
          }
        }
      </section>

      <!-- Summary Stats -->
      @if (!loading()) {
        <section class="section">
          <h2 class="section-title">
            <mat-icon>bar_chart</mat-icon> Adherence Summary
          </h2>
          <div class="stats-grid">
            <mat-card class="stat-card">
              <mat-icon class="stat-icon primary">medication</mat-icon>
              <div class="stat-value">{{ medications().length }}</div>
              <div class="stat-label">Active Medications</div>
            </mat-card>
            <mat-card class="stat-card">
              <mat-icon class="stat-icon success">check_circle</mat-icon>
              <div class="stat-value">{{ overallAdherence() }}%</div>
              <div class="stat-label">Overall Adherence</div>
            </mat-card>
            <mat-card class="stat-card">
              <mat-icon class="stat-icon warn">warning</mat-icon>
              <div class="stat-value">{{ lowRefillCount() }}</div>
              <div class="stat-label">Refills Needed</div>
            </mat-card>
            <mat-card class="stat-card">
              <mat-icon class="stat-icon info">today</mat-icon>
              <div class="stat-value">{{ takenTodayCount() }}/{{ medications().length }}</div>
              <div class="stat-label">Taken Today</div>
            </mat-card>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .medications-container {
      max-width: 900px;
      margin: 0 auto;
    }

    .meds-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    h1 {
      font-size: 28px;
      font-weight: 600;
      color: #1a237e;
      margin: 0;
    }

    .subtitle {
      color: #666;
      margin: 4px 0 0;
    }

    .offline-badge {
      background: #fff3e0 !important;
      color: #f57c00 !important;
    }

    .section {
      margin-bottom: 28px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 0 0 16px;
    }

    .section-title mat-icon {
      color: #3f51b5;
    }

    /* Med Card */
    .med-card {
      padding: 20px;
      margin-bottom: 16px;
      transition: all 0.2s;
      border-left: 4px solid #e0e0e0;
    }

    .med-card.taken-today {
      border-left-color: #4caf50;
      background: #fafff9;
    }

    .med-row {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .med-pill-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #e8eaf6;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .med-pill-icon mat-icon { color: #3f51b5; }
    .med-pill-icon.taken { background: #e8f5e9; }
    .med-pill-icon.taken mat-icon { color: #4caf50; }

    .med-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .med-dosage {
      font-size: 14px;
      color: #555;
    }

    .med-instructions {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #888;
      font-style: italic;
    }

    .med-prescribed {
      font-size: 12px;
      color: #aaa;
    }

    .tiny-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .med-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .taken-chip {
      background: #e8f5e9 !important;
      color: #2e7d32 !important;
    }

    /* Adherence */
    .adherence-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;
    }

    .adherence-header {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #666;
      margin-bottom: 10px;
    }

    .adherence-pct {
      font-weight: 600;
      color: #333;
    }

    .adherence-days {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      justify-content: space-between;
    }

    .day-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .day-label {
      font-size: 11px;
      color: #888;
      text-transform: uppercase;
    }

    .day-taken mat-icon {
      color: #4caf50;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .day-missed mat-icon {
      color: #ef5350;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Refill */
    .refill-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
    }

    .refill-info {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #888;
    }

    .refill-btn {
      font-size: 12px;
    }

    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }

    .stat-card {
      padding: 20px;
      text-align: center;
    }

    .stat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      margin-bottom: 8px;
    }

    .stat-icon.primary { color: #3f51b5; }
    .stat-icon.success { color: #4caf50; }
    .stat-icon.warn { color: #f57c00; }
    .stat-icon.info { color: #0288d1; }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #222;
    }

    .stat-label {
      font-size: 13px;
      color: #888;
    }

    /* Empty */
    .empty-card {
      padding: 40px;
      text-align: center;
      color: #888;
    }

    .empty-card mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    @media (max-width: 600px) {
      .med-row { flex-wrap: wrap; }
      .med-actions { width: 100%; justify-content: flex-end; }
      .adherence-days { flex-wrap: wrap; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class MedicationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly offlineStorage = inject(OfflineStorageService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly medications = signal<Medication[]>([]);
  readonly todayLogs = signal<Map<string, boolean>>(new Map());
  readonly isOffline = signal(!navigator.onLine);

  readonly overallAdherence = computed(() => {
    const meds = this.medications();
    if (!meds.length) return 0;
    const total = meds.reduce((sum, m) => sum + this.getAdherence(m), 0);
    return Math.round(total / meds.length);
  });

  readonly lowRefillCount = computed(() =>
    this.medications().filter(m => m.refillsRemaining <= 2).length
  );

  readonly takenTodayCount = computed(() => this.todayLogs().size);

  private readonly dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  ngOnInit(): void {
    window.addEventListener('online', () => this.isOffline.set(false));
    window.addEventListener('offline', () => this.isOffline.set(true));

    this.loadMedications();
    this.loadTodayLogs();
  }

  private async loadMedications(): Promise<void> {
    if (navigator.onLine) {
      this.api.getMedications().subscribe(async meds => {
        this.medications.set(meds);
        this.loading.set(false);
        // Cache for offline
        for (const med of meds) {
          await firstValueFrom(this.offlineStorage.put('medications', med));
        }
      });
    } else {
      this.offlineStorage.getAll<Medication>('medications').subscribe(meds => {
        this.medications.set(meds);
        this.loading.set(false);
      });
    }
  }

  private loadTodayLogs(): void {
    const todayKey = new Date().toISOString().split('T')[0];
    this.offlineStorage.getAll<MedicationLog>('medication_logs').subscribe(logs => {
      const todayMap = new Map<string, boolean>();
      for (const log of logs) {
        if (log.timestamp.startsWith(todayKey)) {
          todayMap.set(log.medicationId, log.taken);
        }
      }
      this.todayLogs.set(todayMap);
    });
  }

  isTakenToday(medId: string): boolean {
    return this.todayLogs().has(medId);
  }

  async logMedication(med: Medication, taken: boolean): Promise<void> {
    const log: MedicationLog = {
      id: `${med.id}-${Date.now()}`,
      medicationId: med.id,
      timestamp: new Date().toISOString(),
      taken
    };

    await firstValueFrom(this.offlineStorage.put('medication_logs', log));

    // Update local state
    this.todayLogs.update(map => {
      const updated = new Map(map);
      updated.set(med.id, taken);
      return updated;
    });

    // Queue for sync if offline
    if (!navigator.onLine) {
      await firstValueFrom(this.offlineStorage.addToSyncQueue({
        type: 'medication_log', data: log
      }));
    }

    this.snackBar.open(
      taken ? `${med.name} marked as taken` : `${med.name} skipped`,
      'Close',
      { duration: 3000 }
    );
  }

  getAdherence(med: Medication): number {
    if (!med.taken.length) return 0;
    return Math.round((med.taken.filter(Boolean).length / med.taken.length) * 100);
  }

  getDayLabel(index: number): string {
    const today = new Date().getDay();
    const offset = (today - 7 + index) % 7;
    return this.dayNames[(offset + 7) % 7];
  }
}
