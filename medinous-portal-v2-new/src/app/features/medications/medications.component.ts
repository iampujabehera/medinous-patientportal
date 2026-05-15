import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { ApiService } from '../../core/services/api.service';
import { OfflineStorageService } from '../../core/services/offline-storage.service';
import { Medication } from '../../core/models/patient.model';
import { firstValueFrom } from 'rxjs';

type RoutinePeriod = 'morning' | 'afternoon' | 'evening' | 'night';
type MedFilter = 'all' | 'recent' | 'active' | 'completed';

interface SessionMed {
  id: string;
  name: string;
  doseLine: string;
  instructions: string;
  isActive: boolean;
}

interface SessionRoutine {
  period: RoutinePeriod;
  icon: string;
  label: string;
  meds: SessionMed[];
}

@Component({
  selector: 'app-medications',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatMenuModule,
    MatChipsModule, MatSnackBarModule, SkeletonCardComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="meds-page">

      <!-- Header -->
      <div class="page-head">
        <div>
          <h1>My Medications</h1>
          <p class="sub">Organised by routine</p>
        </div>
        @if (isOffline()) {
          <span class="offline-pill"><mat-icon>cloud_off</mat-icon> Offline</span>
        }
      </div>

      <!-- Search + Doctor filter -->
      <div class="filter-row">
        <div class="search-wrap">
          <mat-icon class="s-icon">search</mat-icon>
          <input class="s-input"
                 type="search"
                 name="medication-search"
                 autocomplete="off"
                 [ngModel]="searchQuery()"
                 (ngModelChange)="searchQuery.set($event)"
                 placeholder="Search medication...">
          @if (searchQuery()) {
            <button mat-icon-button class="s-clear" (click)="searchQuery.set('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>

        <!-- Desktop: full button with doctor label -->
        <button mat-stroked-button class="doc-btn doc-btn-desktop" [matMenuTriggerFor]="docMenu">
          <mat-icon class="doc-icon">medical_services</mat-icon>
          <span class="doc-label">{{ selectedDoctor() === 'all' ? 'All doctors' : selectedDoctor() }}</span>
          <mat-icon class="doc-caret" iconPositionEnd>expand_more</mat-icon>
        </button>

        <!-- Mobile: icon-only filter button -->
        <button class="doc-btn-mobile"
                [class.has-filter]="selectedDoctor() !== 'all'"
                [matMenuTriggerFor]="docMenu"
                aria-label="Filter by doctor">
          <mat-icon>tune</mat-icon>
          @if (selectedDoctor() !== 'all') { <span class="doc-dot"></span> }
        </button>

        <mat-menu #docMenu="matMenu">
          <button mat-menu-item (click)="selectedDoctor.set('all')">
            <mat-icon [class.invisible]="selectedDoctor() !== 'all'">check</mat-icon>
            <span>All doctors</span>
          </button>
          @for (doc of allDoctors(); track doc) {
            <button mat-menu-item (click)="selectedDoctor.set(doc)">
              <mat-icon [class.invisible]="selectedDoctor() !== doc">check</mat-icon>
              <span>{{ doc }}</span>
            </button>
          }
        </mat-menu>
      </div>

      <!-- Filter chips (no time-period chips — sessions are visible by default) -->
      <div class="med-filters">
        <button class="filter-chip" [class.active]="activeFilter() === 'all'" (click)="activeFilter.set('all')">
          All
        </button>
        <button class="filter-chip" [class.active]="activeFilter() === 'recent'" (click)="activeFilter.set('recent')">
          <mat-icon>schedule</mat-icon> Recent
        </button>
        <button class="filter-chip" [class.active]="activeFilter() === 'active'" (click)="activeFilter.set('active')">
          <span class="dot active-dot"></span> Active
        </button>
        <button class="filter-chip" [class.active]="activeFilter() === 'completed'" (click)="activeFilter.set('completed')">
          <span class="dot done-dot"></span> Completed
        </button>
      </div>

      <!-- Loading -->
      @if (loading()) {
        @for (i of [1,2,3,4]; track i) {
          <app-skeleton-card [lines]="2" [showAvatar]="true" variant="compact" />
        }
      } @else {

        <!-- Today's Routine: 4 collapsible session cards -->
        <section class="routine-section" aria-label="Today's routine">
          @for (s of sessionRoutines(); track s.period) {
            <article class="session-card" [class]="'sc-' + s.period"
                     [class.is-empty]="s.meds.length === 0"
                     [class.is-collapsed]="isCollapsed(s.period)">
              <button class="session-head" type="button"
                      (click)="toggleSession(s.period)"
                      [attr.aria-expanded]="!isCollapsed(s.period) && s.meds.length > 0"
                      [disabled]="s.meds.length === 0">
                <span class="sh-icon" [class]="'sh-icon-' + s.period">
                  <mat-icon>{{ s.icon }}</mat-icon>
                </span>
                <span class="sh-text">
                  <strong>{{ s.label }}</strong>
                  <span class="sh-meta">{{ summaryLine(s) }}</span>
                </span>
                @if (s.meds.length > 0) {
                  <mat-icon class="sh-caret">expand_more</mat-icon>
                }
              </button>

              <div class="session-body">
                @if (s.meds.length > 0) {
                  <ul class="sb-list">
                    @for (m of s.meds; track m.id) {
                      <li class="sb-item">
                        <span class="sb-bullet" [class]="'sb-bullet-' + s.period"></span>
                        <div class="sb-info">
                          <span class="sb-name">{{ m.name }}</span>
                          @if (m.instructions) {
                            <span class="sb-instr">{{ m.instructions }}</span>
                          }
                        </div>
                        <span class="sb-dose">{{ m.doseLine }}</span>
                      </li>
                    }
                  </ul>
                }
              </div>
            </article>
          }
        </section>

        <!-- Footer summary -->
        <p class="result-count">
          {{ totalActiveMeds() }} active medication{{ totalActiveMeds() === 1 ? '' : 's' }}
          @if (selectedDoctor() !== 'all') {
            · {{ selectedDoctor() }}
          }
        </p>
      }
    </div>
  `,
  styles: [`
    .meds-page {
      max-width: 720px; margin: 0 auto; padding-bottom: 60px;
    }

    /* ===== HEADER ===== */
    .page-head {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 14px;
    }
    h1 { font-size: 24px; font-weight: 700; color: #1b3a4b; margin: 0; }
    .sub { color: #888; font-size: 13px; margin: 4px 0 0; }
    .offline-pill {
      display: inline-flex; align-items: center; gap: 4px;
      background: #fff3e0; color: #f57c00;
      padding: 4px 10px; border-radius: 12px;
      font-size: 12px; font-weight: 600;
    }
    .offline-pill mat-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; }

    /* ===== FILTER ROW ===== */
    .filter-row {
      display: flex; gap: 10px; align-items: center;
      margin-bottom: 10px;
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
    .s-icon { color: #5f6b7a; font-size: 20px; width: 20px; height: 20px; }
    .s-input {
      flex: 1; min-width: 0;
      border: none; outline: none; background: transparent;
      font-size: 14px; font-family: inherit; color: #1b3a4b;
    }
    .s-input::placeholder { color: #6b7884; opacity: 1; }
    .s-clear {
      width: 28px !important; height: 28px !important;
      line-height: 28px !important; color: #999;
    }
    .s-clear mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .doc-btn {
      flex-shrink: 0; height: 40px !important;
      border-radius: 22px !important;
      border-color: #d8e3e3 !important; background: white !important;
      color: #1b3a4b !important; font-weight: 500 !important;
      font-size: 13px !important;
      padding: 0 14px !important;
      display: inline-flex !important; align-items: center; gap: 6px;
    }
    .doc-btn .doc-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
      color: #0d8a8a;
    }
    .doc-btn .doc-caret {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      color: #888;
    }
    .doc-label {
      max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .doc-btn-mobile {
      display: none;
      flex-shrink: 0;
      width: 40px; height: 40px; border-radius: 50%;
      background: white; border: 1px solid #d8e3e3;
      align-items: center; justify-content: center;
      cursor: pointer; position: relative;
      color: #1b3a4b;
      transition: border-color 0.15s, background 0.15s;
    }
    .doc-btn-mobile:hover { border-color: #0d8a8a; }
    .doc-btn-mobile.has-filter { background: #e8f5f3; border-color: #0d8a8a; color: #0d8a8a; }
    .doc-btn-mobile mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .doc-btn-mobile .doc-dot {
      position: absolute; top: 6px; right: 6px;
      width: 8px; height: 8px; border-radius: 50%;
      background: #ef6c00; border: 2px solid white;
    }
    .invisible { visibility: hidden; }

    /* ===== FILTER CHIPS ===== */
    .med-filters {
      display: flex; gap: 6px;
      overflow-x: auto;
      padding: 4px 2px 8px;
      margin-bottom: 14px;
      scrollbar-width: thin;
    }
    .med-filters::-webkit-scrollbar { height: 4px; }
    .med-filters::-webkit-scrollbar-thumb { background: #d8e3e3; border-radius: 2px; }
    .filter-chip {
      flex-shrink: 0;
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 12px; height: 32px;
      border-radius: 18px;
      border: 1px solid #e0e8e8; background: white;
      cursor: pointer; transition: all 0.15s;
      font-family: inherit; font-size: 12.5px; font-weight: 600;
      color: #6b7884; white-space: nowrap;
    }
    .filter-chip mat-icon {
      font-size: 15px !important; width: 15px !important; height: 15px !important;
    }
    .filter-chip:hover { border-color: #80cbc4; color: #0d8a8a; }
    .filter-chip.active {
      background: #0d8a8a; border-color: #0d8a8a; color: white;
      box-shadow: 0 2px 6px rgba(13,138,138,0.22);
    }
    .filter-chip.active mat-icon { color: white; }
    .filter-chip .dot {
      width: 7px; height: 7px; border-radius: 50%; display: inline-block;
    }
    .filter-chip .active-dot { background: #4caf50; }
    .filter-chip .done-dot { background: #c0c8d0; }
    .filter-chip.active .dot { background: white; }

    /* ===== TODAY'S ROUTINE — SESSION CARDS ===== */
    .routine-section {
      display: flex; flex-direction: column; gap: 10px;
    }
    .session-card {
      background: white;
      border: 1px solid #eef2f3;
      border-radius: 14px;
      overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .session-card:not(.is-empty):hover {
      border-color: #d8e8e6;
    }

    /* Header row (always visible) */
    .session-head {
      width: 100%;
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px;
      background: transparent; border: none;
      cursor: pointer;
      text-align: left; font-family: inherit;
      transition: background 0.15s;
    }
    .session-head:hover:not(:disabled) { background: #fafcfc; }
    .session-head:disabled { cursor: default; opacity: 0.9; }
    .session-head:focus-visible {
      outline: 2px solid #0d8a8a; outline-offset: -2px;
    }

    .sh-icon {
      flex-shrink: 0;
      width: 38px; height: 38px; border-radius: 12px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .sh-icon mat-icon {
      font-size: 20px !important; width: 20px !important; height: 20px !important;
    }
    .sh-icon-morning   { background: #fff2dc; color: #ef6c00; }
    .sh-icon-afternoon { background: #fff7d6; color: #b07900; }
    .sh-icon-evening   { background: #ede7f6; color: #5e35b1; }
    .sh-icon-night     { background: #e3e7f7; color: #3949ab; }

    .sh-text { display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 2px; }
    .sh-text strong {
      font-size: 15px; color: #1b3a4b; font-weight: 700;
    }
    .sh-meta { font-size: 12.5px; color: #6b7884; }

    .is-empty .sh-text strong { color: #6b7884; font-weight: 600; }
    .is-empty .sh-meta { color: #98a2ab; font-style: italic; }
    .is-empty .sh-icon { opacity: 0.55; }

    .sh-caret {
      flex-shrink: 0; color: #98a2ab;
      transition: transform 0.25s ease;
      font-size: 22px !important; width: 22px !important; height: 22px !important;
    }
    .is-collapsed .sh-caret { transform: rotate(-90deg); }

    /* Body (expandable) */
    .session-body {
      display: grid;
      grid-template-rows: 1fr;
      transition: grid-template-rows 0.28s ease;
    }
    .is-collapsed .session-body { grid-template-rows: 0fr; }
    .session-body > * {
      overflow: hidden;
      min-height: 0;
    }
    .sb-list {
      list-style: none; margin: 0;
      padding: 4px 14px 14px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .sb-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px;
      background: #f9fbfb;
      border-radius: 10px;
    }
    .sb-bullet {
      flex-shrink: 0;
      width: 8px; height: 8px; border-radius: 50%;
      background: #c0c8d0;
    }
    .sb-bullet-morning   { background: #ef6c00; }
    .sb-bullet-afternoon { background: #f9a825; }
    .sb-bullet-evening   { background: #5e35b1; }
    .sb-bullet-night     { background: #3949ab; }
    .sb-info { display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 2px; }
    .sb-name { font-size: 14px; color: #1b3a4b; font-weight: 600; }
    .sb-instr { font-size: 11.5px; color: #98a2ab; line-height: 1.3; }
    .sb-dose {
      flex-shrink: 0;
      font-size: 12px; font-weight: 700; color: #0d8a8a;
      background: #e8f5f3; padding: 4px 10px; border-radius: 8px;
      letter-spacing: 0.2px;
    }

    /* ===== FOOTER COUNT ===== */
    .result-count {
      font-size: 12px; color: #98a2ab; margin: 16px 4px 0;
      text-align: center;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 600px) {
      h1 { font-size: 20px; }
      .doc-btn-desktop { display: none !important; }
      .doc-btn-mobile { display: inline-flex; }
      .filter-row { gap: 8px; }
      .session-head { padding: 11px 12px; gap: 10px; }
      .sh-icon { width: 34px; height: 34px; border-radius: 10px; }
      .sh-icon mat-icon {
        font-size: 18px !important; width: 18px !important; height: 18px !important;
      }
      .sh-text strong { font-size: 14px; }
      .sh-meta { font-size: 12px; }
      .sb-list { padding: 2px 12px 12px; }
      .sb-item { padding: 9px 10px; gap: 10px; }
      .sb-name { font-size: 13.5px; }
      .sb-instr { font-size: 11px; }
      .sb-dose { font-size: 11.5px; padding: 3px 8px; }
      .filter-chip { font-size: 12px; padding: 5px 10px; height: 30px; }
    }
  `]
})
export class MedicationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly offlineStorage = inject(OfflineStorageService);

  readonly loading = signal(true);
  readonly medications = signal<Medication[]>([]);
  readonly searchQuery = signal('');
  readonly selectedDoctor = signal<string>('all');
  readonly activeFilter = signal<MedFilter>('all');
  readonly isOffline = signal(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  // Sessions collapsed by user. Default: all expanded (empty set).
  readonly collapsedSessions = signal<ReadonlySet<RoutinePeriod>>(new Set());

  private readonly periods: RoutinePeriod[] = ['morning', 'afternoon', 'evening', 'night'];

  private readonly periodLabels: Record<RoutinePeriod, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    night: 'Night'
  };

  readonly allDoctors = computed<string[]>(() => {
    const set = new Set<string>();
    this.medications().forEach(m => set.add(m.prescribedBy));
    return Array.from(set).sort();
  });

  /** Meds visible after applying search, doctor, and active-filter (recent/active/completed). */
  private readonly visibleMeds = computed<Medication[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const doc = this.selectedDoctor();
    const filter = this.activeFilter();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(today.getDate() - 30);

    return this.medications().filter(m => {
      if (doc !== 'all' && m.prescribedBy !== doc) return false;
      if (q && !m.name.toLowerCase().includes(q) && !m.dosage.toLowerCase().includes(q)) return false;
      if (filter === 'active' && !this.isActive(m)) return false;
      if (filter === 'completed' && this.isActive(m)) return false;
      if (filter === 'recent' && new Date(m.startDate) < thirtyDaysAgo) return false;
      return true;
    });
  });

  /** Today's Routine: 4 sessions, each with its meds. */
  readonly sessionRoutines = computed<SessionRoutine[]>(() => {
    const meds = this.visibleMeds();
    return this.periods.map(p => ({
      period: p,
      icon: this.periodIcon(p),
      label: this.periodLabels[p],
      meds: meds
        .filter(m => this.getTimeBlocksFor(m).includes(p))
        .map(m => ({
          id: m.id,
          name: m.name,
          doseLine: this.getDoseLine(m),
          instructions: m.instructions ?? '',
          isActive: this.isActive(m)
        }))
    }));
  });

  readonly totalActiveMeds = computed<number>(() =>
    this.visibleMeds().filter(m => this.isActive(m)).length
  );

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.isOffline.set(false));
      window.addEventListener('offline', () => this.isOffline.set(true));
    }
    this.loadMedications();
  }

  private async loadMedications(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.api.getMedications().subscribe(async meds => {
        this.medications.set(meds);
        this.loading.set(false);
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

  // -------- Display helpers --------

  isActive(med: Medication): boolean {
    if (!med.endDate) return true;
    return new Date(med.endDate) >= new Date();
  }

  isCollapsed(p: RoutinePeriod): boolean {
    return this.collapsedSessions().has(p);
  }

  toggleSession(p: RoutinePeriod): void {
    this.collapsedSessions.update(s => {
      const next = new Set(s);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  }

  summaryLine(s: SessionRoutine): string {
    if (s.meds.length === 0) return 'No medication';
    return `${s.meds.length} med${s.meds.length === 1 ? '' : 's'}`;
  }

  private getDoseLine(med: Medication): string {
    const form = this.detectMedForm(med);
    if (form === 'Drops') return '2 Drops';
    if (form === 'Syrup') return '1 Dose';
    if (form === 'Cream') return 'Apply';
    return `1 ${form}`;
  }

  private detectMedForm(med: Medication): string {
    const name = (med.name || '').toLowerCase();
    const dose = (med.dosage || '').toLowerCase();
    if (name.includes('capsule') || dose.includes('capsule') || dose.includes('cap')) return 'Capsule';
    if (name.includes('syrup') || dose.includes('ml')) return 'Syrup';
    if (name.includes('drop')) return 'Drops';
    if (name.includes('cream') || name.includes('ointment')) return 'Cream';
    return 'Tablet';
  }

  private getTimeBlocksFor(med: Medication): RoutinePeriod[] {
    const freq = (med.frequency || '').toLowerCase();
    const inst = (med.instructions || '').toLowerCase();
    if (freq.includes('four') || freq.includes('4 times')) {
      return ['morning', 'afternoon', 'evening', 'night'];
    }
    if (freq.includes('three') || freq.includes('3 times')) {
      return ['morning', 'afternoon', 'evening'];
    }
    if (freq.includes('twice') || freq.includes('two')) {
      return ['morning', 'evening'];
    }
    if (inst.includes('night') || inst.includes('bedtime')) return ['night'];
    if (inst.includes('evening')) return ['evening'];
    if (inst.includes('afternoon')) return ['afternoon'];
    if (inst.includes('morning')) return ['morning'];
    if (inst.includes('with meal')) return ['morning', 'afternoon', 'evening'];
    return ['morning'];
  }

  private periodIcon(p: RoutinePeriod): string {
    const map: Record<RoutinePeriod, string> = {
      morning: 'wb_sunny',
      afternoon: 'wb_twilight',
      evening: 'brightness_3',
      night: 'dark_mode'
    };
    return map[p];
  }
}
