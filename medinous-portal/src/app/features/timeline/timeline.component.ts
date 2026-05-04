import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { ApiService } from '../../core/services/api.service';
import { TimelineEvent } from '../../core/models/patient.model';

interface TimePeriod { label: string; days: number; }

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatChipsModule,
    MatButtonToggleModule, MatInputModule, MatFormFieldModule,
    MatSelectModule, MatSnackBarModule,
    SkeletonCardComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <!-- ===== TOP SECTION (matches image 1 exactly) ===== -->
      <div class="top-section">
        <div class="top-row">
          <div>
            <h1>Health Timeline</h1>
            <p class="sub">Your complete health history in one place</p>
          </div>
          <button mat-flat-button class="upload-btn" (click)="showUpload.set(true)">
            <mat-icon>cloud_upload</mat-icon> Upload
          </button>
        </div>

        <!-- Search -->
        <div class="search-wrap">
          <mat-icon class="s-icon">search</mat-icon>
          <input class="s-input"
                 [ngModel]="searchQuery()"
                 (ngModelChange)="searchQuery.set($event)"
                 placeholder="Search records...">
          @if (searchQuery()) {
            <button mat-icon-button class="s-clear" (click)="searchQuery.set('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>

        <!-- Time Period Pills -->
        <div class="pills-row">
          @for (p of timePeriods; track p.days) {
            <button class="pill" [class.active]="selectedPeriod() === p.days"
                    (click)="selectedPeriod.set(p.days)">
              {{ p.label }}
            </button>
          }
        </div>

        <!-- Category Toggles -->
        <mat-button-toggle-group [value]="activeFilter()" (change)="activeFilter.set($event.value)" class="cat-group">
          <mat-button-toggle value="all">All</mat-button-toggle>
          <mat-button-toggle value="appointment">Visits</mat-button-toggle>
          <mat-button-toggle value="lab_result">Labs</mat-button-toggle>
          <mat-button-toggle value="prescription">Rx</mat-button-toggle>
          <mat-button-toggle value="imaging">Radiology</mat-button-toggle>
          <mat-button-toggle value="procedure">Procedures</mat-button-toggle>
          <mat-button-toggle value="medical_report">Reports</mat-button-toggle>
          <mat-button-toggle value="vaccination">Vaccines</mat-button-toggle>
        </mat-button-toggle-group>

        @if (!loading()) {
          <p class="count">{{ filteredEvents().length }} records
            @if (selectedPeriod() < 9999) {
              <span>in last {{ getPeriodLabel() }}</span>
            }
          </p>
        }
      </div>

      <!-- ===== UPLOAD PANEL ===== -->
      @if (showUpload()) {
        <mat-card class="upload-card">
          <div class="uc-header">
            <strong>Upload Document</strong>
            <button mat-icon-button (click)="showUpload.set(false)"><mat-icon>close</mat-icon></button>
          </div>
          <div class="uc-drop" (click)="fileInput.click()">
            <mat-icon>cloud_upload</mat-icon>
            <p>Tap to select file</p>
            <span>PDF, JPG, PNG (max 25 MB)</span>
            <input #fileInput type="file" hidden accept=".pdf,.jpg,.jpeg,.png" (change)="onFileSelected($event)">
          </div>
          @if (uploadFileName()) {
            <div class="uc-file">
              <mat-icon>insert_drive_file</mat-icon>
              <span>{{ uploadFileName() }}</span>
              <button mat-icon-button (click)="uploadFileName.set('')"><mat-icon>close</mat-icon></button>
            </div>
          }
          <mat-form-field appearance="outline" class="uc-field">
            <mat-label>Document type</mat-label>
            <mat-select [ngModel]="uploadType()" (ngModelChange)="uploadType.set($event)">
              <mat-option value="lab_result">Lab Report</mat-option>
              <mat-option value="imaging">Radiology</mat-option>
              <mat-option value="prescription">Prescription</mat-option>
              <mat-option value="medical_report">Medical Report</mat-option>
              <mat-option value="procedure">Procedure Report</mat-option>
              <mat-option value="note">Other</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-flat-button color="primary" class="uc-submit"
                  [disabled]="!uploadFileName() || !uploadType()"
                  (click)="submitUpload()">Upload</button>
        </mat-card>
      }

      <!-- ===== CARDS GRID (matches image 2) ===== -->
      @if (loading()) {
        <div class="grid">
          @for (i of [1,2,3,4]; track i) {
            <app-skeleton-card [lines]="4" />
          }
        </div>
      } @else if (!filteredEvents().length) {
        <div class="empty">
          <mat-icon>folder_open</mat-icon>
          <h3>No records found</h3>
          <p>Try a different period or upload a document</p>
        </div>
      } @else {
        <div class="grid">
          @for (event of filteredEvents(); track event.id) {
            <mat-card class="rec-card">
              <!-- Color Banner -->
              <div class="card-banner" [ngClass]="'banner-' + event.type">
                <mat-icon>{{ getEventIcon(event) }}</mat-icon>
              </div>
              <!-- Card Body -->
              <div class="card-body">
                <h3>{{ event.title }}</h3>
                <div class="card-meta">
                  <mat-chip class="type-chip" [ngClass]="'chip-' + event.type">
                    {{ formatType(event.type) }}
                  </mat-chip>
                </div>
                <div class="card-info">
                  <span><mat-icon class="ci">person</mat-icon> {{ event.provider }}</span>
                  <span><mat-icon class="ci">schedule</mat-icon> {{ formatDate(event.date) }}</span>
                </div>
              </div>
              <!-- Actions -->
              <div class="card-actions">
                <button mat-button class="ca-btn view">
                  <mat-icon>visibility</mat-icon> View
                </button>
                <button mat-button class="ca-btn download">
                  <mat-icon>download</mat-icon> Download
                </button>
                <button mat-button class="ca-btn delete" (click)="deleteRecord(event)">
                  <mat-icon>delete</mat-icon> Delete
                </button>
              </div>
            </mat-card>
          }
        </div>
      }

      <!-- Mobile FAB -->
      <button mat-fab class="fab" (click)="showUpload.set(true)">
        <mat-icon>cloud_upload</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .page { max-width: 1000px; margin: 0 auto; padding-bottom: 80px; }

    /* ===== TOP SECTION ===== */
    .top-section { margin-bottom: 24px; }
    .top-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    h1 { font-size: 28px; font-weight: 700; color: #1a237e; margin: 0; }
    .sub { color: #888; font-size: 14px; margin: 4px 0 0; }
    .upload-btn {
      background: #0d8a8a !important; color: white !important;
      font-weight: 600 !important; border-radius: 8px !important;
    }

    /* Search */
    .search-wrap {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px; background: #f0f0f0; border-radius: 28px;
      margin-bottom: 16px;
    }
    .s-icon { color: #999; font-size: 22px; width: 22px; height: 22px; }
    .s-input {
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 15px; font-family: inherit; color: #333;
    }
    .s-input::placeholder { color: #bbb; }
    .s-clear { color: #999; }

    /* Pills */
    .pills-row {
      display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap;
    }
    .pill {
      padding: 6px 18px; border-radius: 22px; border: 1.5px solid #ccc;
      background: white; font-size: 13px; font-family: inherit;
      color: #555; cursor: pointer; transition: all 0.15s; font-weight: 500;
    }
    .pill:hover { border-color: #1a237e; color: #1a237e; }
    .pill.active { background: #1a237e; color: white; border-color: #1a237e; }

    /* Category */
    .cat-group { margin-bottom: 12px; }
    .count { font-size: 13px; color: #aaa; margin: 0; }
    .count span { color: #777; }

    /* ===== UPLOAD ===== */
    .upload-card {
      padding: 20px; margin-bottom: 20px; border: 2px dashed #0d8a8a;
      border-radius: 12px !important; background: #f0fafa;
    }
    .uc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .uc-header strong { font-size: 16px; color: #1b3a4b; }
    .uc-drop {
      text-align: center; padding: 20px; cursor: pointer; border: 1px dashed #b2dfdb;
      border-radius: 10px; background: white; margin-bottom: 12px;
    }
    .uc-drop:hover { background: #e0f2f1; }
    .uc-drop mat-icon { font-size: 32px; width: 32px; height: 32px; color: #0d8a8a; }
    .uc-drop p { margin: 6px 0 2px; font-size: 14px; color: #333; }
    .uc-drop span { font-size: 12px; color: #999; }
    .uc-file {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      background: white; border-radius: 8px; margin-bottom: 12px;
    }
    .uc-file mat-icon { color: #0d8a8a; }
    .uc-file span { flex: 1; font-size: 13px; }
    .uc-field { width: 100%; }
    .uc-submit { width: 100%; }

    /* ===== CARD GRID ===== */
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .rec-card {
      padding: 0; border-radius: 12px !important; overflow: hidden;
      transition: box-shadow 0.2s;
    }
    .rec-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }

    /* Banner */
    .card-banner {
      height: 64px; display: flex; align-items: center; justify-content: center;
    }
    .card-banner mat-icon { font-size: 28px; width: 28px; height: 28px; color: white; }

    .banner-appointment { background: linear-gradient(135deg, #3f51b5, #5c6bc0); }
    .banner-lab_result { background: linear-gradient(135deg, #00897b, #26a69a); }
    .banner-prescription { background: linear-gradient(135deg, #f57c00, #ffb74d); }
    .banner-vaccination { background: linear-gradient(135deg, #7b1fa2, #ab47bc); }
    .banner-note { background: linear-gradient(135deg, #546e7a, #78909c); }
    .banner-imaging { background: linear-gradient(135deg, #0277bd, #29b6f6); }
    .banner-procedure { background: linear-gradient(135deg, #e64a19, #ff8a65); }
    .banner-medical_report { background: linear-gradient(135deg, #2e7d32, #66bb6a); }

    /* Body */
    .card-body { padding: 14px 16px 10px; }
    .card-body h3 {
      font-size: 15px; font-weight: 600; color: #222; margin: 0 0 8px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .card-meta { margin-bottom: 8px; }
    .type-chip {
      font-size: 11px !important; min-height: 22px !important; font-weight: 600 !important;
    }
    .chip-appointment { background: #e8eaf6 !important; color: #3f51b5 !important; }
    .chip-lab_result { background: #e0f2f1 !important; color: #00897b !important; }
    .chip-prescription { background: #fff3e0 !important; color: #f57c00 !important; }
    .chip-vaccination { background: #f3e5f5 !important; color: #7b1fa2 !important; }
    .chip-note { background: #eceff1 !important; color: #546e7a !important; }
    .chip-imaging { background: #e1f5fe !important; color: #0277bd !important; }
    .chip-procedure { background: #fbe9e7 !important; color: #e64a19 !important; }
    .chip-medical_report { background: #e8f5e9 !important; color: #2e7d32 !important; }

    .card-info {
      display: flex; flex-direction: column; gap: 3px;
    }
    .card-info span {
      display: flex; align-items: center; gap: 4px;
      font-size: 13px; color: #888;
    }
    .ci { font-size: 15px; width: 15px; height: 15px; color: #aaa; }

    /* Actions */
    .card-actions {
      display: flex; border-top: 1px solid #f0f0f0; padding: 4px 8px;
    }
    .ca-btn {
      flex: 1; font-size: 12px !important; color: #1976d2 !important; font-weight: 500 !important;
    }
    .ca-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .ca-btn.delete { color: #d32f2f !important; }

    /* Empty */
    .empty { text-align: center; padding: 60px 20px; color: #999; }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; margin-bottom: 8px; }

    /* FAB */
    .fab {
      position: fixed; bottom: 24px; right: 24px; z-index: 50;
      background: #0d8a8a !important; color: white !important;
    }

    @media (min-width: 769px) { .fab { display: none; } }
    @media (max-width: 768px) {
      .upload-btn { display: none; }
      .grid { grid-template-columns: 1fr; }
      h1 { font-size: 22px; }
    }
  `]
})
export class TimelineComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly allEvents = signal<TimelineEvent[]>([]);
  readonly activeFilter = signal('all');
  readonly selectedPeriod = signal(30);
  readonly searchQuery = signal('');
  readonly showUpload = signal(false);
  readonly uploadFileName = signal('');
  readonly uploadType = signal('');

  readonly timePeriods: TimePeriod[] = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: '3 months', days: 90 },
    { label: '6 months', days: 180 },
    { label: '1 year', days: 365 },
    { label: 'All time', days: 9999 }
  ];

  readonly filteredEvents = computed(() => {
    let events = this.allEvents();
    const days = this.selectedPeriod();
    const filter = this.activeFilter();
    const q = this.searchQuery().toLowerCase().trim();

    if (days < 9999) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      events = events.filter(e => e.date >= cutoff.toISOString());
    }
    if (filter !== 'all') {
      events = events.filter(e => e.type === filter);
    }
    if (q) {
      events = events.filter(e =>
        e.title.toLowerCase().includes(q) || e.provider.toLowerCase().includes(q)
      );
    }
    return events;
  });

  ngOnInit(): void {
    this.api.getTimeline(0, 100).subscribe(events => {
      this.allEvents.set(events);
      this.loading.set(false);
    });
  }

  getEventIcon(event: TimelineEvent): string {
    const m: Record<string, string> = {
      appointment: 'event', lab_result: 'science', prescription: 'medication',
      vaccination: 'vaccines', note: 'description', imaging: 'image',
      procedure: 'monitor_heart', medical_report: 'summarize'
    };
    return m[event.type] ?? 'info';
  }

  formatType(type: string): string {
    const m: Record<string, string> = {
      appointment: 'Visit', lab_result: 'Lab Report', prescription: 'Prescription',
      vaccination: 'Vaccine', note: 'Note', imaging: 'Radiology',
      procedure: 'Procedure', medical_report: 'Medical Report'
    };
    return m[type] ?? type;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getPeriodLabel(): string {
    return this.timePeriods.find(p => p.days === this.selectedPeriod())?.label.replace('Last ', '') ?? '';
  }

  onFileSelected(event: Event): void {
    const f = (event.target as HTMLInputElement).files;
    if (f?.length) this.uploadFileName.set(f[0].name);
  }

  submitUpload(): void {
    const name = this.uploadFileName();
    const type = this.uploadType() as TimelineEvent['type'];
    if (!name || !type) return;
    this.allEvents.update(list => [{
      id: 'upload-' + Date.now(), type,
      title: name.replace(/\.[^.]+$/, ''),
      description: '', date: new Date().toISOString(), provider: 'Self-uploaded'
    }, ...list]);
    this.showUpload.set(false);
    this.uploadFileName.set('');
    this.uploadType.set('');
    this.snackBar.open('Document uploaded', 'OK', { duration: 3000 });
  }

  deleteRecord(event: TimelineEvent): void {
    this.allEvents.update(list => list.filter(e => e.id !== event.id));
    this.snackBar.open('Deleted', 'Undo', { duration: 4000 }).onAction().subscribe(() => {
      this.allEvents.update(list => [...list, event].sort((a, b) => b.date.localeCompare(a.date)));
    });
  }
}
