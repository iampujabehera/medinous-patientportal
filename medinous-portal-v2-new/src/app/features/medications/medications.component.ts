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
type MedFilter = 'all' | 'recent' | RoutinePeriod | 'active' | 'completed';

interface RoutineSlot {
  period: RoutinePeriod;
  icon: string;
  label: string;
  active: boolean;
  dose: string;
}

interface PrescriptionGroup {
  id: string;
  doctor: string;
  specialty: string;
  date: string;
  medications: Medication[];
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
          <p class="sub">Active prescriptions and routine</p>
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
                 [ngModel]="searchQuery()"
                 (ngModelChange)="searchQuery.set($event)"
                 placeholder="Search medication...">
          @if (searchQuery()) {
            <button mat-icon-button class="s-clear" (click)="searchQuery.set('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>
        <button mat-stroked-button class="doc-btn" [matMenuTriggerFor]="docMenu">
          <mat-icon class="doc-icon">medical_services</mat-icon>
          <span class="doc-label">{{ selectedDoctor() === 'all' ? 'All doctors' : selectedDoctor() }}</span>
          <mat-icon class="doc-caret" iconPositionEnd>expand_more</mat-icon>
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

      <!-- Filter chips -->
      <div class="med-filters">
        <button class="filter-chip" [class.active]="activeFilter() === 'all'" (click)="activeFilter.set('all')">
          All
        </button>
        <button class="filter-chip" [class.active]="activeFilter() === 'recent'" (click)="activeFilter.set('recent')">
          <mat-icon>schedule</mat-icon> Recent
        </button>
        <button class="filter-chip" [class.active]="activeFilter() === 'morning'" (click)="activeFilter.set('morning')">
          <mat-icon class="ic-morning">wb_sunny</mat-icon> Morning
        </button>
        <button class="filter-chip" [class.active]="activeFilter() === 'afternoon'" (click)="activeFilter.set('afternoon')">
          <mat-icon class="ic-afternoon">wb_twilight</mat-icon> Afternoon
        </button>
        <button class="filter-chip" [class.active]="activeFilter() === 'evening'" (click)="activeFilter.set('evening')">
          <mat-icon class="ic-evening">brightness_3</mat-icon> Evening
        </button>
        <button class="filter-chip" [class.active]="activeFilter() === 'night'" (click)="activeFilter.set('night')">
          <mat-icon class="ic-night">dark_mode</mat-icon> Night
        </button>
        <button class="filter-chip" [class.active]="activeFilter() === 'active'" (click)="activeFilter.set('active')">
          <span class="dot active-dot"></span> Active
        </button>
        <button class="filter-chip" [class.active]="activeFilter() === 'completed'" (click)="activeFilter.set('completed')">
          <span class="dot done-dot"></span> Completed
        </button>
      </div>

      @if (!loading()) {
        <p class="result-count">
          {{ totalShownMeds() }} medication{{ totalShownMeds() === 1 ? '' : 's' }}
          @if (filteredGroups().length > 1) {
            · {{ filteredGroups().length }} prescriptions
          }
        </p>
      }

      <!-- Loading -->
      @if (loading()) {
        @for (i of [1,2,3]; track i) {
          <app-skeleton-card [lines]="3" [showAvatar]="true" />
        }
      }

      <!-- Empty -->
      @else if (!filteredGroups().length) {
        <div class="empty">
          <mat-icon>medication</mat-icon>
          <h3>No medications found</h3>
          <p>
            @if (searchQuery() || selectedDoctor() !== 'all' || activeFilter() !== 'all') {
              Try clearing the search or filter
            } @else {
              Your active prescriptions will appear here
            }
          </p>
        </div>
      }

      <!-- Prescription groups -->
      @else {
        @for (group of filteredGroups(); track group.id) {
          <section class="rx-group">
            <header class="rx-head">
              <div class="rx-doc">
                <div class="rx-doc-avatar"><mat-icon>medical_services</mat-icon></div>
                <div class="rx-doc-info">
                  <strong>{{ group.doctor }}</strong>
                  <span class="rx-doc-spec">{{ group.specialty }}</span>
                </div>
              </div>
              <div class="rx-date-block">
                <span class="rx-date-label">Prescribed</span>
                <span class="rx-date">{{ formatDate(group.date) }}</span>
              </div>
            </header>

            @for (med of group.medications; track med.id) {
              <article class="med-card">
                <div class="med-head">
                  <div class="med-title-block">
                    <strong class="med-name">{{ med.name }}</strong>
                    <span class="med-dose">{{ med.dosage }}</span>
                  </div>
                  <span class="status-chip"
                        [class.completed]="!isActive(med)">
                    {{ isActive(med) ? 'Active' : 'Completed' }}
                  </span>
                </div>

                <div class="routine-grid">
                  @for (slot of getRoutineSlots(med); track slot.period) {
                    <div class="routine-slot"
                         [class.active]="slot.active"
                         [class]="'rs-' + slot.period + (slot.active ? ' active' : '')">
                      <mat-icon class="rs-icon">{{ slot.icon }}</mat-icon>
                      <span class="rs-label">{{ slot.label }}</span>
                      <span class="rs-value">{{ slot.active ? slot.dose : '-' }}</span>
                    </div>
                  }
                </div>

                <div class="routine-info">
                  <mat-icon>info_outline</mat-icon>
                  <span>{{ getScheduleLine(med) }}</span>
                </div>

                @if (med.instructions) {
                  <div class="med-note">
                    <mat-icon>lightbulb</mat-icon>
                    <span>{{ med.instructions }}</span>
                  </div>
                }
              </article>
            }
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .meds-page {
      max-width: 800px; margin: 0 auto; padding-bottom: 60px;
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

    /* ===== FILTER ROW (search + doctor) ===== */
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
    .invisible { visibility: hidden; }

    /* ===== FILTER CHIPS ===== */
    .med-filters {
      display: flex; gap: 6px;
      overflow-x: auto;
      padding: 4px 2px 8px;
      margin-bottom: 8px;
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
    .filter-chip .ic-morning { color: #f6a821; }
    .filter-chip .ic-afternoon { color: #ef6c00; }
    .filter-chip .ic-evening { color: #5e35b1; }
    .filter-chip .ic-night { color: #3949ab; }
    .filter-chip .dot {
      width: 7px; height: 7px; border-radius: 50%; display: inline-block;
    }
    .filter-chip .active-dot { background: #4caf50; }
    .filter-chip .done-dot { background: #c0c8d0; }
    .filter-chip.active .dot { background: white; }

    .result-count {
      font-size: 12px; color: #98a2ab; margin: 0 4px 14px;
    }

    /* ===== PRESCRIPTION GROUP ===== */
    .rx-group {
      margin-bottom: 18px;
      background: white;
      border: 1px solid #e8eded;
      border-radius: 14px;
      overflow: hidden;
    }
    .rx-head {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; padding: 14px 18px;
      background: linear-gradient(135deg, #f8fafa 0%, #eef5f5 100%);
      border-bottom: 1px solid #e3ecec;
    }
    .rx-doc {
      display: flex; align-items: center; gap: 12px; min-width: 0;
    }
    .rx-doc-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: linear-gradient(135deg, #0d8a8a 0%, #1b3a4b 100%);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .rx-doc-avatar mat-icon {
      color: white; font-size: 20px; width: 20px; height: 20px;
    }
    .rx-doc-info { display: flex; flex-direction: column; min-width: 0; }
    .rx-doc-info strong {
      font-size: 14px; color: #1b3a4b; font-weight: 700;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .rx-doc-spec {
      font-size: 12px; color: #6b7884; font-weight: 500;
    }
    .rx-date-block {
      display: flex; flex-direction: column; align-items: flex-end;
      flex-shrink: 0;
    }
    .rx-date-label {
      font-size: 10px; color: #98a2ab; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .rx-date {
      font-size: 13px; color: #1b3a4b; font-weight: 600;
      margin-top: 2px;
    }

    /* ===== MED CARD ===== */
    .med-card {
      padding: 16px 18px;
      border-bottom: 1px solid #f0f4f4;
    }
    .med-card:last-child { border-bottom: none; }

    .med-head {
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px; margin-bottom: 10px;
    }
    .med-title-block {
      display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
      min-width: 0;
    }
    .med-name {
      font-size: 16px; color: #1b3a4b; font-weight: 700;
    }
    .med-dose {
      font-size: 12px; color: #0d8a8a; font-weight: 700;
      padding: 2px 8px; border-radius: 6px; background: #e8f5f3;
      letter-spacing: 0.2px;
    }
    .status-chip {
      display: inline-flex; align-items: center;
      padding: 3px 10px; border-radius: 10px;
      background: #e6f5e9; color: #2e7d32;
      font-size: 11px; font-weight: 700;
      flex-shrink: 0;
    }
    .status-chip.completed { background: #eceff1; color: #607d8b; }

    /* 4-column routine grid (Morning · Afternoon · Evening · Night) */
    .routine-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      background: white;
      border: 1px solid #e8eded;
      border-radius: 12px;
      overflow: hidden;
      margin: 4px 0 10px;
    }
    .routine-slot {
      display: flex; flex-direction: column; align-items: center;
      gap: 4px; padding: 10px 6px;
      background: white;
      border-right: 1px solid #f0f4f4;
      text-align: center;
    }
    .routine-slot:last-child { border-right: none; }
    .routine-slot .rs-icon {
      font-size: 22px !important; width: 22px !important; height: 22px !important;
      color: #c0c8d0;
    }
    .routine-slot .rs-label {
      font-size: 12px; color: #98a2ab; font-weight: 600;
    }
    .routine-slot .rs-value {
      font-size: 13px; color: #c0c8d0; font-weight: 700;
      margin-top: 2px;
    }
    .routine-slot.active .rs-label { color: #1b3a4b; }
    .routine-slot.active .rs-value { color: #1b3a4b; }

    /* Period-specific active tints */
    .routine-slot.rs-morning.active { background: #ffe9d6; }
    .routine-slot.rs-morning.active .rs-icon { color: #ef6c00; }
    .routine-slot.rs-afternoon.active { background: #fff7d6; }
    .routine-slot.rs-afternoon.active .rs-icon { color: #f9a825; }
    .routine-slot.rs-evening.active { background: #ede7f6; }
    .routine-slot.rs-evening.active .rs-icon { color: #5e35b1; }
    .routine-slot.rs-night.active { background: #e8eaf6; }
    .routine-slot.rs-night.active .rs-icon { color: #3949ab; }

    /* Schedule info line below the grid */
    .routine-info {
      display: flex; align-items: flex-start; gap: 6px;
      padding: 8px 12px;
      background: #f3f5f7;
      border-radius: 8px;
      font-size: 12px; color: #6b7884;
      margin-bottom: 10px;
      line-height: 1.4;
    }
    .routine-info mat-icon {
      font-size: 14px !important; width: 14px !important; height: 14px !important;
      color: #98a2ab;
      margin-top: 1px;
      flex-shrink: 0;
    }

    /* Insight / instruction note */
    .med-note {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 12px;
      background: #fffaf0; border: 1px solid #f0e3c4; border-radius: 8px;
      font-size: 12.5px; color: #6d4d00; line-height: 1.45;
    }
    .med-note mat-icon {
      color: #c79100;
      font-size: 16px !important; width: 16px !important; height: 16px !important;
      flex-shrink: 0; margin-top: 1px;
    }

    /* ===== EMPTY ===== */
    .empty {
      text-align: center; padding: 50px 20px;
      background: white; border: 1px solid #e8eded; border-radius: 14px;
    }
    .empty mat-icon {
      font-size: 44px; width: 44px; height: 44px; color: #d0d8de;
      margin-bottom: 8px;
    }
    .empty h3 { margin: 4px 0 4px; font-size: 15px; color: #1b3a4b; }
    .empty p { margin: 0; font-size: 13px; color: #98a2ab; }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 600px) {
      h1 { font-size: 20px; }
      .filter-row { flex-direction: column; gap: 8px; }
      .search-wrap, .doc-btn { width: 100%; }
      .doc-btn { justify-content: space-between !important; }
      .rx-head { padding: 12px 14px; }
      .med-card { padding: 14px; }
      .med-name { font-size: 15px; }
      .routine-slot { padding: 8px 4px; }
      .routine-slot .rs-icon {
        font-size: 20px !important; width: 20px !important; height: 20px !important;
      }
      .routine-slot .rs-label { font-size: 11px; }
      .routine-slot .rs-value { font-size: 12px; }
      .routine-info { font-size: 11.5px; padding: 7px 10px; }
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

  // Map doctor name → specialty (for the prescription group header).
  private readonly doctorSpecialties: Record<string, string> = {
    'Dr. Rajesh Kumar':    'Cardiology',
    'Dr. Sarah Chen':      'Dermatology',
    'Dr. Ahmed Hassan':    'General Medicine',
    'Dr. Lisa Wong':       'Endocrinology',
    'Dr. Vikram Patel':    'Orthopedics',
    'Dr. Fatima Al-Rashid': 'Cardiology'
  };

  readonly allDoctors = computed<string[]>(() => {
    const set = new Set<string>();
    this.medications().forEach(m => set.add(m.prescribedBy));
    return Array.from(set).sort();
  });

  // Group medications by (doctor + start date) → one prescription per group.
  readonly prescriptionGroups = computed<PrescriptionGroup[]>(() => {
    const groups = new Map<string, PrescriptionGroup>();
    for (const med of this.medications()) {
      const key = `${med.prescribedBy}|${med.startDate}`;
      const existing = groups.get(key);
      if (existing) {
        existing.medications.push(med);
      } else {
        groups.set(key, {
          id: key,
          doctor: med.prescribedBy,
          specialty: this.doctorSpecialties[med.prescribedBy] ?? 'Physician',
          date: med.startDate,
          medications: [med]
        });
      }
    }
    // Newest prescriptions first.
    return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date));
  });

  readonly filteredGroups = computed<PrescriptionGroup[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const doc = this.selectedDoctor();
    const filter = this.activeFilter();

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(today.getDate() - 30);

    return this.prescriptionGroups()
      .filter(g => {
        if (filter === 'recent') {
          return new Date(g.date) >= thirtyDaysAgo;
        }
        return true;
      })
      .map(g => {
        const meds = g.medications.filter(m => {
          if (doc !== 'all' && g.doctor !== doc) return false;
          if (q && !m.name.toLowerCase().includes(q) &&
              !m.dosage.toLowerCase().includes(q)) return false;
          if (filter === 'morning' || filter === 'afternoon' ||
              filter === 'evening' || filter === 'night') {
            if (!this.getTimeBlocksFor(m).includes(filter)) return false;
          }
          if (filter === 'active' && !this.isActive(m)) return false;
          if (filter === 'completed' && this.isActive(m)) return false;
          return true;
        });
        return { ...g, medications: meds };
      })
      .filter(g => g.medications.length > 0);
  });

  readonly totalShownMeds = computed(() =>
    this.filteredGroups().reduce((sum, g) => sum + g.medications.length, 0)
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

  getIntakeInstruction(med: Medication): string {
    const inst = (med.instructions || '').toLowerCase();
    if (inst.includes('with meal') || inst.includes('with food')) return 'With meals';
    if (inst.includes('after meal') || inst.includes('after food')) return 'After food';
    if (inst.includes('before meal') || inst.includes('before food')) return 'Before food';
    if (inst.includes('empty stomach')) return 'Empty stomach';
    if (inst.includes('bedtime') || inst.includes('before sleep')) return 'Before bed';
    return 'Anytime';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  getRoutineSlots(med: Medication): RoutineSlot[] {
    const active = new Set(this.getTimeBlocksFor(med));
    const dose = this.getDoseDescriptor(med);
    const all: RoutinePeriod[] = ['morning', 'afternoon', 'evening', 'night'];
    return all.map(p => ({
      period: p,
      icon: this.periodIcon(p),
      label: this.capitalize(p),
      active: active.has(p),
      dose
    }));
  }

  getScheduleLine(med: Medication): string {
    const active = new Set(this.getTimeBlocksFor(med));
    const pattern = (['morning', 'afternoon', 'evening', 'night'] as RoutinePeriod[])
      .map(p => active.has(p) ? '1' : '0')
      .join(' - ');
    const form = this.detectMedForm(med);
    const intake = this.getIntakeInstruction(med);
    const intakeSuffix = intake === 'Anytime' ? '' : ` · ${intake}`;
    return `${med.frequency} ( ${pattern} ) · ${form} orally${intakeSuffix}`;
  }

  private getDoseDescriptor(med: Medication): string {
    const form = this.detectMedForm(med);
    if (form === 'Tablet') return '1 Tab';
    if (form === 'Capsule') return '1 Cap';
    if (form === 'Syrup') return '1 Dose';
    if (form === 'Drops') return '2 Drops';
    return '1 Dose';
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

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
