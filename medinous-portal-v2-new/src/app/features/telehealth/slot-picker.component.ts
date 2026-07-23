import { Component, ChangeDetectionStrategy, inject, signal, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TelehealthService } from './telehealth.service';
import { CareSlot } from './telehealth.model';

// =====================================================================
// SLOT PICKER  (spec §8 step 5)
//
// Arrival windows rather than minute-level times for home services.
// Shared by Home Care and Home Lab. Marks the earliest slot and lets
// the patient demo the "no slots available" exception.
// =====================================================================
@Component({
  selector: 'th-slot-picker',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Date pills -->
    <div class="date-row">
      @for (d of days(); track d.date) {
        <button class="date-pill" [class.on]="activeDate() === d.date" (click)="setDate(d.date)">
          <span class="dp-label">{{ d.label }}</span>
        </button>
      }
      <button class="date-pill ghost" (click)="noSlots.set(!noSlots())">
        <span class="dp-label">{{ noSlots() ? 'Show slots' : 'Preview: busy day' }}</span>
      </button>
    </div>

    @if (noSlots()) {
      <div class="th-banner banner-amber">
        <mat-icon>event_busy</mat-icon>
        <div class="b-body">
          <strong>No home-service slots for this date</strong>
          <span>The next available window is tomorrow morning. Choose another date or join the waiting list.</span>
        </div>
      </div>
      <div class="wl-actions">
        <button class="wl-btn" (click)="jumpEarliest()"><mat-icon>bolt</mat-icon> View next available</button>
        <button class="wl-btn" (click)="joinWaitlist()"><mat-icon>notifications</mat-icon> Join waiting list</button>
      </div>
    } @else {
      <div class="window-grid">
        @for (w of windowsForActive(); track w.id) {
          <button class="window" [class.on]="selected()?.id === w.id" (click)="pick(w)">
            <span class="w-time">{{ w.window }}</span>
            @if (w.earliest) { <span class="w-earliest">Earliest available</span> }
          </button>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .date-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 14px; scrollbar-width: none; }
    .date-row::-webkit-scrollbar { display: none; }
    .date-pill { flex-shrink: 0; padding: 10px 16px; border-radius: 12px; border: 1.5px solid #e0e4ea; background: white; font: inherit; cursor: pointer; }
    .date-pill.on { border-color: #1565c0; background: #f3f8ff; }
    .date-pill.ghost { border-style: dashed; color: #90a4ae; }
    .dp-label { font-size: 13px; font-weight: 600; color: #455a64; }
    .date-pill.on .dp-label { color: #1565c0; }
    .window-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .window { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; padding: 14px; border-radius: 14px; border: 1.5px solid #eceff1; background: white; font: inherit; cursor: pointer; transition: all .15s; }
    .window:hover { border-color: #c5cae9; }
    .window.on { border-color: #1565c0; background: #f3f8ff; }
    .w-time { font-size: 14px; font-weight: 600; color: #1b3a4b; }
    .w-earliest { font-size: 10.5px; font-weight: 700; color: #2e7d32; background: #e8f5e9; padding: 2px 8px; border-radius: 8px; }
    .th-banner { display: flex; gap: 12px; padding: 14px; border-radius: 14px; margin-bottom: 12px; }
    .th-banner mat-icon { flex-shrink: 0; }
    .th-banner .b-body strong { display: block; font-size: 14px; margin-bottom: 2px; }
    .th-banner .b-body span { font-size: 13px; line-height: 1.5; }
    .banner-amber { background: #fff8ef; border: 1px solid #ffe0b2; } .banner-amber mat-icon, .banner-amber strong { color: #e65100; } .banner-amber span { color: #6d4c41; }
    .wl-actions { display: flex; gap: 10px; }
    .wl-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 12px; border-radius: 12px; border: 1px solid #d7dcf5; background: white; color: #1a237e; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .wl-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `]
})
export class SlotPickerComponent implements OnInit {
  private readonly svc = inject(TelehealthService);
  readonly changed = output<CareSlot | null>();

  readonly days = signal<{ date: string; label: string; windows: CareSlot[] }[]>([]);
  readonly activeDate = signal<string>('');
  readonly selected = signal<CareSlot | null>(null);
  readonly noSlots = signal(false);

  ngOnInit(): void {
    const d = this.svc.slotsFor([1, 2, 3, 4]);
    this.days.set(d);
    this.activeDate.set(d[0].date);
  }

  setDate(date: string): void {
    this.activeDate.set(date);
    this.noSlots.set(false);
  }
  windowsForActive(): CareSlot[] {
    return this.days().find(d => d.date === this.activeDate())?.windows ?? [];
  }
  pick(w: CareSlot): void { this.selected.set(w); this.changed.emit(w); }
  jumpEarliest(): void {
    this.noSlots.set(false);
    this.setDate(this.days()[0].date);
  }
  joinWaitlist(): void { this.noSlots.set(false); }
}
