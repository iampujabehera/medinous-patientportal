import {
  Component, ChangeDetectionStrategy, inject, signal, computed,
  input, output, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { VitalSign } from '../../../core/models/patient.model';
import { VitalsService } from '../../../core/services/vitals.service';
import {
  VitalReadings, EMPTY_READINGS, GLUCOSE_TYPES, WHEN_OPTIONS, hasAnyReading,
  getVitalIcon, getVitalLabel, trendIcon, trendLabel, sourceChipLabel
} from '../../../core/utils/vitals.util';

// =============================================================================
// RECORD VITALS — reusable self-reported readings form
// -----------------------------------------------------------------------------
// One form, four entry points: dashboard upcoming-consult card, appointment
// confirmation, the video-consult flow, and My Health. Writes through
// VitalsService (source='self') so the reading immediately surfaces in the My
// Health snapshot with a "Self · <date>" chip.
//
// variant='sheet'  → device-adaptable overlay (centered dialog on desktop,
//                     bottom sheet on mobile) with its own close control.
// variant='inline' → just the card body, embedded in a host surface (used by
//                     the video-consult confirmed stage).
// =============================================================================
@Component({
  selector: 'app-record-vitals',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (variant() === 'sheet') {
      <div class="rv-overlay" (click)="close()">
        <div class="rv-panel" (click)="$event.stopPropagation()"
             role="dialog" aria-modal="true" aria-label="Record recent readings">
          <div class="rv-panel-head">
            <div>
              <strong>Record recent readings</strong>
              <span>{{ subhead() }}</span>
            </div>
            <button class="rv-x" (click)="close()" aria-label="Close"><mat-icon>close</mat-icon></button>
          </div>
          <ng-container [ngTemplateOutlet]="body"></ng-container>
        </div>
      </div>
    } @else {
      <div class="rv-inline">
        <ng-container [ngTemplateOutlet]="body"></ng-container>
      </div>
    }

    <ng-template #body>
      @if (savedState(); as list) {
        <!-- ===== SAVED: confirmation note + snapshot ===== -->
        <div class="rv-savednote">
          <mat-icon>check_circle</mat-icon>
          <div>
            Saved · Stored as <b>source = patient</b> · entered by {{ patientName() }} · {{ savedAt() }}
            · channel = portal → visible in <b>My Health</b> with the <b>Self-reported</b> chip
            → posted to HMIS as a patient-sourced observation{{ doctorName() ? ' → your doctor sees it in the Patient-reported panel' : '' }}.
            {{ doctorName() ? 'Editable until the doctor joins the call.' : '' }}
          </div>
        </div>

        <div class="rv-snapshot">
          @for (v of list; track v.type) {
            <article class="rv-vcard" [class]="'rv-v-' + v.status">
              <div class="rv-v-top">
                <div class="rv-v-icon" [class]="'rv-vbg-' + v.status"><mat-icon>{{ icon(v) }}</mat-icon></div>
                <span class="rv-v-src"><mat-icon>person</mat-icon>{{ chip(v) }}</span>
              </div>
              <span class="rv-v-label">{{ label(v) }}</span>
              <div class="rv-v-valrow"><span class="rv-v-val">{{ v.value }}</span><span class="rv-v-unit">{{ v.unit }}</span></div>
              <span class="rv-v-status" [class]="'rv-tc-' + v.status"><mat-icon>{{ tIcon(v) }}</mat-icon>{{ tLabel(v) }}</span>
            </article>
          }
        </div>

        <div class="rv-actions">
          <button class="rv-btn ghost" (click)="editAgain()"><mat-icon>edit</mat-icon> Edit</button>
          @if (variant() === 'sheet') {
            <button class="rv-btn" (click)="done()">Done</button>
          }
        </div>
      } @else {
        <!-- ===== FORM ===== -->
        <p class="rv-lead">
          Everything is optional. These will be shared with {{ doctorName() || 'your care team' }}
          and saved to your health record as <b>self-reported</b>.
        </p>

        <div class="rv-grid">
          <label class="rv-field">
            <span>Blood pressure (mmHg)</span>
            <input inputmode="numeric" placeholder="120/80"
                   [ngModel]="r().bp" (ngModelChange)="set('bp', $event)">
          </label>
          <label class="rv-field">
            <span>Blood sugar (mg/dL)</span>
            <input inputmode="numeric" placeholder="140"
                   [ngModel]="r().glucose" (ngModelChange)="set('glucose', $event)">
          </label>
          <label class="rv-field">
            <span>Sugar reading type</span>
            <select [ngModel]="r().glucoseType" (ngModelChange)="set('glucoseType', $event)">
              @for (g of glucoseTypes; track g) { <option [value]="g">{{ g }}</option> }
            </select>
          </label>
          <label class="rv-field">
            <span>Temperature (°C)</span>
            <input inputmode="decimal" placeholder="37"
                   [ngModel]="r().temp" (ngModelChange)="set('temp', $event)">
          </label>
          <label class="rv-field">
            <span>Weight (kg)</span>
            <input inputmode="decimal" placeholder="65"
                   [ngModel]="r().weight" (ngModelChange)="set('weight', $event)">
          </label>
          <label class="rv-field">
            <span>When measured</span>
            <select [ngModel]="r().when" (ngModelChange)="set('when', $event)">
              @for (w of whenOptions; track w) { <option [value]="w">{{ w }}</option> }
            </select>
          </label>
        </div>

        <div class="rv-actions">
          <button class="rv-btn" [disabled]="!canSave()" (click)="save()">Save readings</button>
          @if (variant() === 'sheet') {
            <button class="rv-btn ghost" (click)="skip()">Skip</button>
          }
        </div>
      }
    </ng-template>
  `,
  styles: [`
    :host { display: block; }

    /* ---- sheet chrome (device adaptable) ---- */
    .rv-overlay {
      position: fixed; inset: 0; z-index: 1200;
      background: rgba(15,30,35,.5); backdrop-filter: blur(2px);
      display: flex; align-items: center; justify-content: center; padding: 20px;
      animation: rvFade .16s ease;
    }
    @keyframes rvFade { from { opacity: 0 } to { opacity: 1 } }
    .rv-panel {
      width: 100%; max-width: 680px; max-height: 92vh; overflow-y: auto;
      background: #fff; border-radius: 18px; padding: 18px 20px 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,.3); animation: rvPop .18s ease;
    }
    @keyframes rvPop { from { transform: translateY(10px) scale(.98); opacity: 0 } to { transform: none; opacity: 1 } }
    .rv-panel-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
    .rv-panel-head strong { display: block; font-size: 17px; color: #1b3a4b; }
    .rv-panel-head span { font-size: 12.5px; color: #90a4ae; }
    .rv-x { margin-left: auto; border: none; background: #f0f3f3; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; color: #607d8b; display: flex; align-items: center; justify-content: center; }
    .rv-x:hover { background: #fdecea; color: #d32f2f; }

    .rv-inline { }
    .rv-lead { font-size: 13px; color: #607d8b; line-height: 1.5; margin: 0 0 14px; }
    .rv-lead b { color: #00695c; }

    /* ---- form ---- */
    .rv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
    .rv-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
    .rv-field span { font-size: 12px; font-weight: 600; color: #607d8b; }
    .rv-field input, .rv-field select {
      width: 100%; box-sizing: border-box; padding: 11px 12px;
      border: 1.5px solid #e0e6e6; border-radius: 10px; font: inherit; font-size: 14px; color: #1b3a4b; background: #fff;
    }
    .rv-field input:focus, .rv-field select:focus { outline: none; border-color: #0d8a8a; box-shadow: 0 0 0 3px rgba(13,138,138,.12); }

    .rv-actions { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
    .rv-btn {
      flex: 1; min-width: 120px; padding: 13px; border: none; border-radius: 11px;
      background: #0d8a8a; color: #fff; font: inherit; font-size: 14.5px; font-weight: 600; cursor: pointer;
    }
    .rv-btn:disabled { background: #cfd8dc; cursor: not-allowed; }
    .rv-btn.ghost { background: #fff; color: #0d8a8a; border: 1.5px solid #cfe0e0; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
    .rv-btn.ghost mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* ---- saved note ---- */
    .rv-savednote {
      display: flex; gap: 8px; background: #f0fdfa; border-left: 3px solid #0d8a8a;
      border-radius: 10px; padding: 12px 14px; font-size: 12.5px; color: #0f5c58; line-height: 1.55; margin-bottom: 14px;
    }
    .rv-savednote mat-icon { color: #0d8a8a; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
    .rv-savednote b { color: #00524e; }

    /* ---- saved snapshot cards (mirror My Health) ---- */
    .rv-snapshot { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 4px; }
    .rv-snapshot::-webkit-scrollbar { height: 0; }
    .rv-vcard { flex: 0 0 auto; width: 160px; padding: 14px; border-radius: 14px; background: #fff; border: 1px solid #eceff1; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.05); }
    .rv-v-top { display: flex; align-items: center; justify-content: space-between; }
    .rv-v-icon { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
    .rv-v-icon mat-icon { color: #fff; font-size: 16px; width: 16px; height: 16px; }
    .rv-vbg-normal { background: #43a047; } .rv-vbg-warning { background: #f57c00; } .rv-vbg-critical { background: #d32f2f; }
    .rv-v-src { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 600; color: #5c6bc0; background: #eef0fb; padding: 2px 8px; border-radius: 10px; }
    .rv-v-src mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .rv-v-label { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #607d8b; font-weight: 600; }
    .rv-v-valrow { display: flex; align-items: baseline; gap: 4px; }
    .rv-v-val { font-size: 22px; font-weight: 700; color: #1b3a4b; } .rv-v-unit { font-size: 11px; color: #90a4ae; }
    .rv-v-status { display: inline-flex; align-items: center; gap: 3px; align-self: flex-start; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
    .rv-v-status mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .rv-tc-normal { background: #e8f5e9; color: #2e7d32; } .rv-tc-warning { background: #fff3e0; color: #ef6c00; } .rv-tc-critical { background: #fdecea; color: #c62828; }

    @media (max-width: 600px) {
      .rv-overlay { padding: 0; align-items: flex-end; }
      .rv-panel { max-width: 100%; border-radius: 18px 18px 0 0; max-height: 94vh; padding-bottom: 24px; }
    }
  `]
})
export class RecordVitalsComponent {
  private readonly vitals = inject(VitalsService);

  /** 'sheet' = overlay dialog; 'inline' = embedded card body. */
  readonly variant = input<'sheet' | 'inline'>('sheet');
  /** Doctor this reading will reach — personalises copy; enables consult wording. */
  readonly doctorName = input<string>('');
  readonly patientName = input<string>('Fatima Sharma');
  readonly context = input<string>('');   // e.g. "Before your video consult"

  readonly saved = output<VitalSign[]>();
  readonly closed = output<void>();

  readonly r = signal<VitalReadings>({ ...EMPTY_READINGS });
  readonly savedState = signal<VitalSign[] | null>(null);
  readonly savedAt = signal<string>('');

  readonly glucoseTypes = GLUCOSE_TYPES;
  readonly whenOptions = WHEN_OPTIONS;
  readonly canSave = computed(() => hasAnyReading(this.r()));

  set(key: keyof VitalReadings, val: string): void {
    this.r.update(cur => ({ ...cur, [key]: val }));
  }

  save(): void {
    if (!this.canSave()) return;
    const list = this.vitals.record(this.r());
    if (!list.length) return;
    this.savedState.set(list);
    this.savedAt.set(new Date().toLocaleString('en-GB', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }));
    this.saved.emit(list);
  }

  editAgain(): void { this.savedState.set(null); }
  skip(): void { this.closed.emit(); }
  done(): void { this.closed.emit(); }
  close(): void { this.closed.emit(); }

  subhead(): string {
    return this.context() || (this.doctorName() ? `Shared with ${this.doctorName()}` : 'Saved to My Health');
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { if (this.variant() === 'sheet') this.close(); }

  // expose helpers to template
  icon = (v: VitalSign) => getVitalIcon(v.type);
  label = (v: VitalSign) => getVitalLabel(v.type);
  chip = (v: VitalSign) => sourceChipLabel(v);
  tIcon = (v: VitalSign) => trendIcon(v.status);
  tLabel = (v: VitalSign) => trendLabel(v.status);
}
