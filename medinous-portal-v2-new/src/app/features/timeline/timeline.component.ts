import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { ApiService } from '../../core/services/api.service';
import { TimelineEvent } from '../../core/models/patient.model';

interface TimePeriod { label: string; short: string; days: number; }
interface CategoryFilter {
  value: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatChipsModule,
    MatMenuModule, MatInputModule, MatFormFieldModule, MatSelectModule,
    MatDialogModule, MatTooltipModule, MatSnackBarModule,
    SkeletonCardComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-head">
        <div>
          <h1>My Records</h1>
          <p class="sub">Your complete health history in one place</p>
        </div>
        <button mat-flat-button class="upload-btn" (click)="showUpload.set(true)">
          <mat-icon>cloud_upload</mat-icon> Upload
        </button>
      </div>

      <!-- Search + Period dropdown row -->
      <div class="filter-row">
        <div class="search-wrap">
          <mat-icon class="s-icon">search</mat-icon>
          <input class="s-input"
                 type="search"
                 name="records-search"
                 autocomplete="off"
                 [ngModel]="searchQuery()"
                 (ngModelChange)="searchQuery.set($event)"
                 placeholder="Search records, providers...">
          @if (searchQuery()) {
            <button mat-icon-button class="s-clear" (click)="searchQuery.set('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>
        <button mat-stroked-button class="period-btn" [matMenuTriggerFor]="periodMenu">
          <mat-icon class="period-icon">event</mat-icon>
          <span class="period-label">{{ getPeriodLabel() }}</span>
          <mat-icon class="period-caret">expand_more</mat-icon>
        </button>
        <mat-menu #periodMenu="matMenu">
          @for (p of timePeriods; track p.days) {
            <button mat-menu-item (click)="selectedPeriod.set(p.days)">
              <mat-icon [class.invisible]="selectedPeriod() !== p.days">check</mat-icon>
              <span>{{ p.label }}</span>
            </button>
          }
        </mat-menu>
      </div>

      <!-- Category filter chips with icons -->
      <div class="cat-chips">
        @for (cat of categories; track cat.value) {
          <button class="cat-chip"
                  [class.active]="activeFilter() === cat.value"
                  (click)="activeFilter.set(cat.value)">
            <mat-icon>{{ cat.icon }}</mat-icon>
            <span>{{ cat.label }}</span>
          </button>
        }
      </div>

      @if (!loading()) {
        <p class="count">
          {{ filteredEvents().length }} record{{ filteredEvents().length === 1 ? '' : 's' }}
          <span class="count-period"> · {{ getPeriodLabel() }}</span>
        </p>
      }

      <!-- Upload panel (unchanged) -->
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
              <mat-option value="self_document">Self Document</mat-option>
              <mat-option value="note">Other</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-flat-button color="primary" class="uc-submit"
                  [disabled]="!uploadFileName() || !uploadType()"
                  (click)="submitUpload()">Upload</button>
        </mat-card>
      }

      <!-- Records list (compact horizontal cards) -->
      @if (loading()) {
        <div class="rec-list">
          @for (i of [1,2,3,4]; track i) {
            <app-skeleton-card [lines]="2" [showAvatar]="true" variant="compact" />
          }
        </div>
      } @else if (!filteredEvents().length) {
        <div class="empty">
          <mat-icon>folder_open</mat-icon>
          <h3>No records found</h3>
          <p>Try a different period, category, or upload a document</p>
        </div>
      } @else {
        <div class="rec-list">
          @for (event of filteredEvents(); track event.id) {
            <div class="rec-row" [ngClass]="'type-' + event.type"
                 [class.highlighted]="event.id === highlightId()"
                 [attr.data-event-id]="event.id">
              <div class="rec-icon" [ngClass]="'icon-' + event.type">
                <mat-icon>{{ getEventIcon(event) }}</mat-icon>
              </div>
              <div class="rec-body">
                <div class="rec-line-1">
                  <strong class="rec-title">{{ event.title }}</strong>
                  <span class="rec-type-chip" [ngClass]="'chip-' + event.type">
                    {{ formatType(event.type) }}
                  </span>
                </div>
                <div class="rec-meta">
                  <span><mat-icon class="meta-icon">person</mat-icon>{{ event.provider }}</span>
                  <span class="meta-dot">·</span>
                  <span><mat-icon class="meta-icon">schedule</mat-icon>{{ formatDate(event.date) }}</span>
                </div>
              </div>
              <div class="rec-actions">
                <button mat-icon-button matTooltip="View" class="ra-btn">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Download" class="ra-btn">
                  <mat-icon>download</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Delete" class="ra-btn ra-delete"
                        (click)="confirmDelete(event)">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Mobile FAB -->
      <button mat-fab class="fab" (click)="showUpload.set(true)">
        <mat-icon>cloud_upload</mat-icon>
      </button>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ng-template #deleteDialog let-data>
      <div class="del-dialog">
        <div class="del-icon-wrap">
          <mat-icon>warning_amber</mat-icon>
        </div>
        <h3>Delete this record?</h3>
        <p><strong>{{ data.title }}</strong> will be permanently removed. This action cannot be undone.</p>
        <div class="del-actions">
          <button mat-stroked-button matDialogClose>Cancel</button>
          <button mat-flat-button class="del-confirm-btn" [matDialogClose]="'confirm'">
            <mat-icon>delete</mat-icon> Delete
          </button>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .page { max-width: 1000px; margin: 0 auto; padding-bottom: 80px; }

    /* ===== HEADER ===== */
    .page-head {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 18px;
    }
    h1 { font-size: 26px; font-weight: 700; color: #1b3a4b; margin: 0; }
    .sub { color: #888; font-size: 14px; margin: 4px 0 0; }
    .upload-btn {
      background: #0d8a8a !important; color: white !important;
      font-weight: 600 !important; border-radius: 8px !important;
      padding: 0 18px !important;
    }

    /* ===== SEARCH + PERIOD DROPDOWN ROW ===== */
    .filter-row {
      display: flex; gap: 10px; align-items: center;
      margin-bottom: 14px;
    }
    .search-wrap {
      flex: 1; min-width: 0;
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px; height: 40px; box-sizing: border-box;
      background: white; border: 1px solid #e0e8e8; border-radius: 22px;
      transition: border-color 0.18s, box-shadow 0.18s;
    }
    .search-wrap:focus-within {
      border-color: #0d8a8a;
      box-shadow: 0 0 0 3px rgba(13,138,138,0.08);
    }
    .s-icon { color: #999; font-size: 20px; width: 20px; height: 20px; }
    .s-input {
      flex: 1; min-width: 0;
      border: none; outline: none; background: transparent;
      font-size: 14px; font-family: inherit; color: #333;
    }
    .s-input::placeholder { color: #aaa; }
    .s-clear {
      width: 28px !important; height: 28px !important;
      line-height: 28px !important; color: #999;
    }
    .s-clear mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .period-btn {
      flex-shrink: 0; height: 40px !important;
      border-radius: 22px !important;
      border-color: #d8e3e3 !important; background: white !important;
      color: #1b3a4b !important; font-weight: 500 !important;
      font-size: 13px !important;
      padding: 0 14px !important;
      display: inline-flex !important; align-items: center; gap: 6px;
    }
    .period-btn .period-icon {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      color: #0d8a8a;
    }
    .period-btn .period-caret {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      color: #888;
    }
    .period-label { white-space: nowrap; }

    .invisible { visibility: hidden; }

    /* ===== CATEGORY CHIPS ===== */
    .cat-chips {
      display: flex; gap: 8px; overflow-x: auto;
      padding: 2px 0 14px;
      scrollbar-width: none;
    }
    .cat-chips::-webkit-scrollbar { display: none; }
    .cat-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: 20px;
      border: 1px solid #d8e3e3; background: white;
      font-size: 13px; font-weight: 500; color: #555;
      cursor: pointer; white-space: nowrap;
      transition: all 0.18s;
      flex-shrink: 0;
      font-family: inherit;
    }
    .cat-chip:hover { border-color: #80cbc4; color: #0d8a8a; }
    .cat-chip mat-icon {
      font-size: 16px; width: 16px; height: 16px;
    }
    .cat-chip.active {
      background: #0d8a8a; color: white; border-color: #0d8a8a;
      box-shadow: 0 2px 6px rgba(13,138,138,0.25);
    }

    .count {
      font-size: 12px; color: #888; margin: 0 0 14px;
    }
    .count-period { color: #aaa; }

    /* ===== UPLOAD PANEL ===== */
    .upload-card {
      padding: 20px; margin-bottom: 18px;
      border: 2px dashed #0d8a8a;
      border-radius: 12px !important; background: #f0fafa;
    }
    .uc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .uc-header strong { font-size: 16px; color: #1b3a4b; }
    .uc-drop {
      text-align: center; padding: 20px; cursor: pointer;
      border: 1px dashed #b2dfdb; border-radius: 10px;
      background: white; margin-bottom: 12px;
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

    /* ===== COMPACT RECORD ROWS ===== */
    .rec-list {
      display: flex; flex-direction: column; gap: 8px;
    }
    .rec-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px;
      background: white; border: 1px solid #e8eded;
      border-radius: 10px; transition: all 0.18s;
    }
    .rec-row:hover {
      border-color: #b2dfdb;
      box-shadow: 0 3px 10px rgba(0,0,0,0.06);
    }

    /* Colored icon circle on the left */
    .rec-icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .rec-icon mat-icon { color: white; font-size: 20px; width: 20px; height: 20px; }
    .icon-appointment { background: linear-gradient(135deg, #3f51b5, #5c6bc0); }
    .icon-lab_result { background: linear-gradient(135deg, #00897b, #26a69a); }
    .icon-prescription { background: linear-gradient(135deg, #f57c00, #ffb74d); }
    .icon-vaccination { background: linear-gradient(135deg, #7b1fa2, #ab47bc); }
    .icon-note { background: linear-gradient(135deg, #546e7a, #78909c); }
    .icon-imaging { background: linear-gradient(135deg, #0277bd, #29b6f6); }
    .icon-procedure { background: linear-gradient(135deg, #e64a19, #ff8a65); }
    .icon-medical_report { background: linear-gradient(135deg, #2e7d32, #66bb6a); }
    .icon-self_document { background: linear-gradient(135deg, #00897b, #4db6ac); }

    .rec-body {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; gap: 3px;
    }
    .rec-line-1 {
      display: flex; align-items: center; gap: 8px; min-width: 0;
    }
    .rec-title {
      font-size: 14px; color: #1b3a4b; font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      flex: 0 1 auto;
    }
    .rec-type-chip {
      font-size: 10px; font-weight: 600;
      padding: 2px 7px; border-radius: 8px;
      flex-shrink: 0; text-transform: uppercase; letter-spacing: 0.3px;
    }
    .chip-appointment { background: #e8eaf6; color: #3f51b5; }
    .chip-lab_result { background: #e0f2f1; color: #00897b; }
    .chip-prescription { background: #fff3e0; color: #f57c00; }
    .chip-vaccination { background: #f3e5f5; color: #7b1fa2; }
    .chip-note { background: #eceff1; color: #546e7a; }
    .chip-imaging { background: #e1f5fe; color: #0277bd; }
    .chip-procedure { background: #fbe9e7; color: #e64a19; }
    .chip-medical_report { background: #e8f5e9; color: #2e7d32; }
    .chip-self_document { background: #e0f2f1; color: #00897b; }

    .rec-meta {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: #888;
      flex-wrap: wrap;
    }
    .rec-meta span { display: inline-flex; align-items: center; gap: 3px; }
    .meta-icon {
      font-size: 13px !important; width: 13px !important; height: 13px !important;
      color: #aaa;
    }
    .meta-dot { color: #ccc; }

    .rec-actions {
      display: flex; gap: 2px; flex-shrink: 0;
    }
    .ra-btn {
      width: 34px !important; height: 34px !important;
      line-height: 34px !important; color: #888 !important;
    }
    .ra-btn:hover { color: #0d8a8a !important; background: #f0f7f7 !important; }
    .ra-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .ra-delete:hover { color: #d32f2f !important; background: #fdecea !important; }

    /* ===== EMPTY ===== */
    .empty { text-align: center; padding: 60px 20px; color: #999; }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; margin-bottom: 8px; }

    /* ===== FAB ===== */
    .fab {
      position: fixed; bottom: 24px; right: 24px; z-index: 50;
      background: #0d8a8a !important; color: white !important;
    }

    /* ===== DELETE DIALOG ===== */
    .del-dialog { padding: 24px; text-align: center; max-width: 360px; }
    .del-icon-wrap {
      width: 56px; height: 56px; border-radius: 50%;
      background: #fff3e0; display: flex; align-items: center; justify-content: center;
      margin: 0 auto 14px;
    }
    .del-icon-wrap mat-icon {
      color: #f57c00; font-size: 32px; width: 32px; height: 32px;
    }
    .del-dialog h3 {
      margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1b3a4b;
    }
    .del-dialog p {
      margin: 0 0 20px; font-size: 14px; color: #555; line-height: 1.5;
    }
    .del-dialog p strong { color: #1b3a4b; }
    .del-actions {
      display: flex; gap: 10px; justify-content: center;
    }
    .del-actions button { min-width: 110px; }
    .del-confirm-btn {
      background: #d32f2f !important; color: white !important;
      font-weight: 600 !important;
    }
    .del-confirm-btn mat-icon {
      font-size: 18px; width: 18px; height: 18px; vertical-align: middle; margin-right: 4px;
    }

    /* ===== Highlighted record (deep-link from dashboard) ===== */
    .rec-row.highlighted {
      animation: pulseHighlight 1.4s ease-in-out 3;
      border-radius: 12px;
      position: relative;
    }
    .rec-row.highlighted::before {
      content: 'JUST UPDATED';
      position: absolute; top: -10px; left: 12px;
      background: #1a237e; color: white;
      font-size: 9px; font-weight: 700;
      padding: 2px 8px; border-radius: 8px;
      letter-spacing: .05em;
    }
    @keyframes pulseHighlight {
      0%   { box-shadow: 0 0 0 0 rgba(26,35,126,0.35); background: white; }
      50%  { box-shadow: 0 0 0 8px rgba(26,35,126,0); background: #f3f5fb; }
      100% { box-shadow: 0 0 0 0 rgba(26,35,126,0); background: white; }
    }

    @media (min-width: 769px) { .fab { display: none; } }
    @media (max-width: 768px) {
      .upload-btn { display: none; }
      h1 { font-size: 22px; }
      .filter-row { gap: 8px; }
      .rec-row { padding: 10px 12px; }
      .rec-title { font-size: 13px; }
    }
  `]
})
export class TimelineComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('deleteDialog', { static: true }) deleteDialogRef!: TemplateRef<unknown>;

  readonly loading = signal(true);
  readonly allEvents = signal<TimelineEvent[]>([]);
  readonly activeFilter = signal('all');
  readonly selectedPeriod = signal(30);
  readonly searchQuery = signal('');
  readonly showUpload = signal(false);
  readonly uploadFileName = signal('');
  readonly uploadType = signal('');
  readonly highlightId = signal<string | null>(null);

  readonly timePeriods: TimePeriod[] = [
    { label: 'Last 7 days',  short: '7 days',  days: 7 },
    { label: 'Last 30 days', short: '30 days', days: 30 },
    { label: 'Last 3 months', short: '3 mo',   days: 90 },
    { label: 'Last 6 months', short: '6 mo',   days: 180 },
    { label: 'Last 1 year',  short: '1 yr',   days: 365 },
    { label: 'All time',     short: 'All',    days: 9999 }
  ];

  readonly categories: CategoryFilter[] = [
    { value: 'all',            label: 'All',         icon: 'apps' },
    { value: 'lab_result',     label: 'Labs',        icon: 'science' },
    { value: 'prescription',   label: 'Rx',          icon: 'medication' },
    { value: 'imaging',        label: 'Radiology',   icon: 'image' },
    { value: 'procedure',      label: 'Procedures',  icon: 'monitor_heart' },
    { value: 'medical_report', label: 'Reports',     icon: 'summarize' },
    { value: 'vaccination',    label: 'Vaccines',    icon: 'vaccines' },
    { value: 'self_document',  label: 'Self Documents', icon: 'folder_shared' }
  ];

  readonly filteredEvents = computed(() => {
    let events = this.allEvents().filter(e => e.type !== 'appointment');
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
    const highlight = this.route.snapshot.queryParamMap.get('highlight');
    // Reset to "All time" + "All categories" so a deep-linked highlight isn't filtered out
    if (highlight) {
      this.selectedPeriod.set(9999);
      this.activeFilter.set('all');
      // Use the search to also narrow visually
      this.searchQuery.set(highlight);
    }

    this.api.getTimeline(0, 100).subscribe(events => {
      this.allEvents.set(events);
      this.loading.set(false);
      if (highlight) {
        // After paint, find the first matching event row and scroll + pulse
        setTimeout(() => this.applyHighlight(highlight), 80);
      }
    });
  }

  private applyHighlight(query: string): void {
    const match = this.filteredEvents()[0];
    if (!match) return;
    this.highlightId.set(match.id);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-event-id="${match.id}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    // Clear the highlight class after the pulse animation finishes (~4.5s)
    setTimeout(() => this.highlightId.set(null), 4500);
  }

  getEventIcon(event: TimelineEvent): string {
    const m: Record<string, string> = {
      appointment: 'event', lab_result: 'science', prescription: 'medication',
      vaccination: 'vaccines', note: 'description', imaging: 'image',
      procedure: 'monitor_heart', medical_report: 'summarize',
      self_document: 'folder_shared'
    };
    return m[event.type] ?? 'info';
  }

  formatType(type: string): string {
    const m: Record<string, string> = {
      appointment: 'Visit', lab_result: 'Lab', prescription: 'Rx',
      vaccination: 'Vaccine', note: 'Note', imaging: 'Radiology',
      procedure: 'Procedure', medical_report: 'Report', self_document: 'Self'
    };
    return m[type] ?? type;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getPeriodLabel(): string {
    return this.timePeriods.find(p => p.days === this.selectedPeriod())?.label ?? '';
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

  confirmDelete(event: TimelineEvent): void {
    const ref = this.dialog.open(this.deleteDialogRef, {
      width: '380px',
      data: event,
      panelClass: 'del-dialog-panel'
    });
    ref.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        this.deleteRecord(event);
      }
    });
  }

  private deleteRecord(event: TimelineEvent): void {
    this.allEvents.update(list => list.filter(e => e.id !== event.id));
    this.snackBar.open('Record deleted', 'Undo', { duration: 4000 }).onAction().subscribe(() => {
      this.allEvents.update(list => [...list, event].sort((a, b) => b.date.localeCompare(a.date)));
    });
  }
}
