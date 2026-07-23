import { Component, ChangeDetectionStrategy, inject, signal, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TelehealthService } from './telehealth.service';
import { ServiceAddress } from './telehealth.model';

// =====================================================================
// ADDRESS PICKER  (spec §8 step 4)
//
// Shared by Home Care and Home Lab. Saved addresses, current location,
// add-new, pin-on-map placeholder, landmark / building / entry notes,
// and a service-area confirmation (drives the "not in your area"
// exception when the far-out demo address is chosen).
// =====================================================================
@Component({
  selector: 'th-address-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="th-stack">
      @for (a of addresses(); track a.id) {
        <button class="th-option" [class.sel]="selected()?.id === a.id" (click)="pick(a)">
          <div class="th-option-icon" [style.background]="a.inServiceArea ? '#00897b' : '#c62828'">
            <mat-icon>{{ a.label === 'Office' ? 'business' : 'home' }}</mat-icon>
          </div>
          <div class="th-option-body">
            <strong>{{ a.label }}</strong>
            <span>{{ a.line1 }}, {{ a.area }}, {{ a.city }}</span>
          </div>
          @if (selected()?.id === a.id) { <mat-icon class="th-option-check">check_circle</mat-icon> }
        </button>
      }

      <button class="add-address" (click)="addNew()">
        <mat-icon>add_location_alt</mat-icon> Add a new address
      </button>
      <button class="add-address" (click)="useCurrent()">
        <mat-icon>my_location</mat-icon> Use current location
      </button>
    </div>

    @if (adding()) {
      <div class="th-card add-form">
        <div class="map-placeholder"><mat-icon>map</mat-icon> Pin your location on the map</div>
        <div class="th-field"><label class="th-label">Building / villa number</label>
          <input class="th-input" [ngModel]="building()" (ngModelChange)="building.set($event)" placeholder="e.g. Villa 24" /></div>
        <div class="th-field"><label class="th-label">Area</label>
          <input class="th-input" [ngModel]="area()" (ngModelChange)="area.set($event)" placeholder="e.g. Jumeirah 1" /></div>
        <div class="th-field"><label class="th-label">Landmark <span class="opt">(optional)</span></label>
          <input class="th-input" [ngModel]="landmark()" (ngModelChange)="landmark.set($event)" placeholder="e.g. Near Al Wasl Park" /></div>
        <div class="th-field"><label class="th-label">Parking / entry instruction <span class="opt">(optional)</span></label>
          <input class="th-input" [ngModel]="entry()" (ngModelChange)="entry.set($event)" placeholder="e.g. Gate code 4471" /></div>
        <button class="th-btn th-btn-primary th-btn-block" [disabled]="!building() || !area()" (click)="saveNew()">Save address</button>
      </div>
    }

    @if (selected(); as s) {
      @if (s.inServiceArea) {
        <div class="th-banner banner-teal" style="margin-top:14px">
          <mat-icon>check_circle</mat-icon>
          <div class="b-body"><strong>In service area</strong><span>We cover {{ s.area }}. A hospital provider can reach this address.</span></div>
        </div>
      } @else {
        <div class="th-banner banner-red" style="margin-top:14px">
          <mat-icon>wrong_location</mat-icon>
          <div class="b-body"><strong>This service isn't available at this address yet</strong><span>{{ s.area }} is outside our current home-service area. Try another address or choose a hospital visit.</span></div>
        </div>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .th-stack { display: flex; flex-direction: column; gap: 10px; }
    .th-option { display: flex; align-items: center; gap: 12px; padding: 14px; background: white; border: 1.5px solid #eceff1; border-radius: 14px; text-align: left; font: inherit; color: inherit; width: 100%; cursor: pointer; transition: all .15s; }
    .th-option:hover { border-color: #c5cae9; }
    .th-option.sel { border-color: #1565c0; background: #f3f8ff; }
    .th-option-icon { width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .th-option-icon mat-icon { color: white; font-size: 22px; width: 22px; height: 22px; }
    .th-option-body { flex: 1; min-width: 0; }
    .th-option-body strong { display: block; font-size: 14px; color: #1b3a4b; }
    .th-option-body span { font-size: 12px; color: #607d8b; }
    .th-option-check { color: #1565c0; flex-shrink: 0; }
    .add-address { display: inline-flex; align-items: center; gap: 8px; padding: 12px 14px; border: 1.5px dashed #c5cae9; border-radius: 12px; background: #f6f8fc; color: #1565c0; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .add-form { margin-top: 12px; }
    .map-placeholder { display: flex; align-items: center; justify-content: center; gap: 8px; height: 96px; border-radius: 12px; background: #eef1f6; color: #90a4ae; font-size: 13px; font-weight: 600; margin-bottom: 14px; }
    .th-field { margin-bottom: 12px; }
    .th-label { display: block; font-size: 13px; font-weight: 600; color: #455a64; margin-bottom: 6px; }
    .th-label .opt { color: #b0bec5; font-weight: 500; }
    .th-input { width: 100%; box-sizing: border-box; padding: 12px 14px; border: 1px solid #e0e4ea; border-radius: 12px; font: inherit; font-size: 14px; color: #1b3a4b; }
    .th-input:focus { outline: none; border-color: #1565c0; }
    .th-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 46px; padding: 0 20px; border-radius: 12px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
    .th-btn-primary { background: #1565c0; color: white; }
    .th-btn-primary:disabled { background: #cfd8dc; color: #eceff1; cursor: not-allowed; }
    .th-btn-block { width: 100%; }
    .th-card { background: white; border: 1px solid #eceff1; border-radius: 16px; padding: 16px; }
    .th-banner { display: flex; gap: 12px; padding: 14px; border-radius: 14px; }
    .th-banner mat-icon { flex-shrink: 0; }
    .th-banner .b-body strong { display: block; font-size: 14px; margin-bottom: 2px; }
    .th-banner .b-body span { font-size: 13px; line-height: 1.5; }
    .banner-teal { background: #effcfa; border: 1px solid #b2dfdb; } .banner-teal mat-icon, .banner-teal strong { color: #00897b; } .banner-teal span { color: #37474f; }
    .banner-red { background: #fff5f5; border: 1px solid #ffcdd2; } .banner-red mat-icon, .banner-red strong { color: #c62828; } .banner-red span { color: #6d4c41; }
  `]
})
export class AddressPickerComponent {
  private readonly svc = inject(TelehealthService);

  /** Emits whenever a valid, in-area address is selected (null otherwise). */
  readonly changed = output<ServiceAddress | null>();
  /** When true, also offer the out-of-area demo address. */
  readonly showOutOfArea = input(true);

  readonly selected = signal<ServiceAddress | null>(null);
  readonly adding = signal(false);
  readonly extra = signal<ServiceAddress[]>([]);

  building = signal('');
  area = signal('');
  landmark = signal('');
  entry = signal('');

  addresses(): ServiceAddress[] {
    const base = [...this.svc.savedAddresses, ...this.extra()];
    return this.showOutOfArea() ? [...base, this.svc.outOfAreaAddress] : base;
  }

  pick(a: ServiceAddress): void {
    this.selected.set(a);
    this.changed.emit(a.inServiceArea ? a : null);
  }
  addNew(): void { this.adding.set(true); }
  useCurrent(): void {
    // Mock geolocation → resolves to the saved home address.
    this.pick(this.svc.savedAddresses[0]);
  }
  saveNew(): void {
    const a: ServiceAddress = {
      id: 'addr_new_' + Date.now(), label: 'New address',
      line1: this.building(), area: this.area(), city: 'Dubai',
      landmark: this.landmark() || undefined, building: this.building(),
      entryNote: this.entry() || undefined, inServiceArea: true
    };
    this.extra.update(list => [...list, a]);
    this.adding.set(false);
    this.pick(a);
  }
}
