import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ThHeaderComponent } from './th-header.component';
import { AddressPickerComponent } from './address-picker.component';
import { SlotPickerComponent } from './slot-picker.component';
import { TelehealthService, TELE_CURRENCY } from './telehealth.service';
import { TELE_STYLES } from './telehealth.styles';
import { HomeCareService, ServiceAddress, CareSlot, CareItem } from './telehealth.model';
import { FamilyService } from '../../core/services/family.service';

type View = 'catalogue' | 'patient' | 'service' | 'address' | 'slot' | 'review' | 'confirmed';

// =====================================================================
// CARE AT HOME  (spec §7, §8)
//
// A focused catalogue (5 services) then a transparent booking flow:
// patient → service + intake → address → slot → review & pay →
// confirmation. Deliberately excludes ICU/dialysis/ambulance/etc.
// =====================================================================
@Component({
  selector: 'app-home-care',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, ThHeaderComponent, AddressPickerComponent, SlotPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="th-page th-wrap">
      <th-header [title]="headerTitle()" [subtitle]="headerSub()" [back]="backTarget()" [showCareFor]="view() === 'catalogue'" />

      @if (view() !== 'catalogue' && view() !== 'confirmed') {
        <div class="th-steps">
          @for (i of [0,1,2,3,4]; track i) { <div class="th-step-dot" [class.on]="stepIndex() >= i"></div> }
        </div>
      }

      <!-- ============ CATALOGUE ============ -->
      @if (view() === 'catalogue') {
        <div class="th-banner banner-info">
          <mat-icon>verified_user</mat-icon>
          <div class="b-body"><strong>Hospital-authorised providers</strong><span>Every nurse and therapist is identity-verified and linked to your hospital record.</span></div>
        </div>

        <div class="th-stack">
          @for (s of svc.homeCareServices; track s.key) {
            <article class="svc-card" (click)="chooseService(s)">
              <div class="svc-icon" [style.background]="s.color"><mat-icon>{{ s.icon }}</mat-icon></div>
              <div class="svc-body">
                <strong>{{ s.name }}</strong>
                <span class="svc-desc">{{ s.description }}</span>
                <div class="svc-meta">
                  <span class="sm-price">From {{ currency }} {{ s.startingPrice }}</span>
                  <span><mat-icon>timer</mat-icon>{{ s.duration }}</span>
                  <span><mat-icon>event_available</mat-icon>{{ s.earliestSlot }}</span>
                </div>
                <span class="rx-note" [class]="'rx-' + s.prescriptionRule">
                  <mat-icon>{{ s.prescriptionRule === 'not_required' ? 'check_circle' : 'description' }}</mat-icon>{{ s.prescriptionNote }}
                </span>
              </div>
              <mat-icon class="svc-arrow">chevron_right</mat-icon>
            </article>
          }
        </div>
      }

      <!-- ============ PATIENT ============ -->
      @if (view() === 'patient') {
        <p class="lede">Who is this service for?</p>
        <div class="th-stack">
          @for (m of members(); track m.patientId) {
            <button class="th-option" [class.sel]="patientId() === m.patientId" (click)="patientId.set(m.patientId)">
              <div class="th-option-icon" style="background:linear-gradient(135deg,#1a237e,#3949ab)">{{ initials(m.fullName) }}</div>
              <div class="th-option-body"><strong>{{ m.fullName }}</strong><span>{{ m.relationship }} · {{ age(m) }} yrs</span></div>
              @if (patientId() === m.patientId) { <mat-icon class="th-option-check">check_circle</mat-icon> }
            </button>
          }
          <button class="add-member" (click)="addMember()"><mat-icon>person_add</mat-icon> Add a family member</button>
        </div>
      }

      <!-- ============ SERVICE DETAILS + INTAKE ============ -->
      @if (view() === 'service' && service(); as s) {
        <div class="th-card detail-card">
          <div class="dc-head">
            <div class="svc-icon" [style.background]="s.color"><mat-icon>{{ s.icon }}</mat-icon></div>
            <div><strong>{{ s.name }}</strong><span>{{ s.description }}</span></div>
          </div>
          <div class="dc-facts">
            <div><span>Price from</span><strong>{{ currency }} {{ s.startingPrice }}</strong></div>
            <div><span>Duration</span><strong>{{ s.duration }}</strong></div>
            <div><span>Prescription</span><strong>{{ s.prescriptionRule === 'required' ? 'Required' : s.prescriptionRule === 'recommended' ? 'Recommended' : 'Not needed' }}</strong></div>
          </div>
        </div>

        <label class="th-label" style="margin-top:16px">Tell us what help is needed</label>
        @for (f of s.intake; track f.id) {
          <div class="th-field">
            <label class="th-label">{{ f.label }} @if (f.optional) { <span class="opt">(optional)</span> }</label>
            @switch (f.type) {
              @case ('textarea') { <textarea class="th-textarea" [ngModel]="intake()[f.id] || ''" (ngModelChange)="setIntake(f.id, $event)" [placeholder]="f.placeholder || ''"></textarea> }
              @case ('text')     { <input class="th-input" [ngModel]="intake()[f.id] || ''" (ngModelChange)="setIntake(f.id, $event)" [placeholder]="f.placeholder || ''" /> }
              @case ('date')     { <input type="date" class="th-input" [ngModel]="intake()[f.id] || ''" (ngModelChange)="setIntake(f.id, $event)" /> }
              @case ('choice')   {
                <div class="th-pills">
                  @for (o of f.options; track o) { <button class="th-pill" [class.on]="intake()[f.id] === o" (click)="setIntake(f.id, o)">{{ o }}</button> }
                </div>
              }
              @case ('upload')   {
                <button class="upload-btn" (click)="upload(f.id)"><mat-icon>upload_file</mat-icon>{{ intake()[f.id] ? intake()[f.id] : 'Upload file' }}</button>
              }
            }
          </div>
        }
      }

      <!-- ============ ADDRESS ============ -->
      @if (view() === 'address') {
        <p class="lede">Where should the provider come?</p>
        <th-address-picker (changed)="onAddress($event)" />
      }

      <!-- ============ SLOT ============ -->
      @if (view() === 'slot') {
        <p class="lede">Pick an arrival window</p>
        <th-slot-picker (changed)="onSlot($event)" />
      }

      <!-- ============ REVIEW & PAY ============ -->
      @if (view() === 'review' && service(); as s) {
        <div class="th-card">
          <h3 class="rv-title">Review your booking</h3>
          <div class="rv-row"><span>Patient</span><strong>{{ patientName() }}</strong></div>
          <div class="rv-row"><span>Service</span><strong>{{ s.name }}</strong></div>
          <div class="rv-row"><span>Address</span><strong>{{ address()?.label }} · {{ address()?.area }}</strong></div>
          <div class="rv-row"><span>When</span><strong>{{ slotDateLabel() }} · {{ slot()?.window }}</strong></div>

          <div class="th-price-lines" style="margin-top:14px">
            @for (l of pricing().lines; track l.label) {
              <div class="th-price-row"><span>{{ l.label }}</span><span>{{ currency }} {{ l.amount }}</span></div>
            }
          </div>
          <div class="th-price-total"><strong>Total</strong><span class="tt">{{ currency }} {{ pricing().total }}</span></div>
        </div>

        <div class="th-banner banner-info" style="margin-top:14px">
          <mat-icon>event_repeat</mat-icon>
          <div class="b-body"><strong>Free cancellation</strong><span>Cancel up to 4 hours before the arrival window at no charge.</span></div>
        </div>

        <label class="th-label" style="margin-top:6px">Payment</label>
        <div class="th-stack">
          <button class="th-option" [class.sel]="payMethod() === 'now'" (click)="payMethod.set('now')">
            <div class="th-option-icon" style="background:#1565c0"><mat-icon>credit_card</mat-icon></div>
            <div class="th-option-body"><strong>Pay now</strong><span>Card ending 4242 · via Payments</span></div>
            @if (payMethod() === 'now') { <mat-icon class="th-option-check">check_circle</mat-icon> }
          </button>
          <button class="th-option" [class.sel]="payMethod() === 'at_service'" (click)="payMethod.set('at_service')">
            <div class="th-option-icon" style="background:#00897b"><mat-icon>handshake</mat-icon></div>
            <div class="th-option-body"><strong>Pay at service</strong><span>Pay the provider on arrival</span></div>
            @if (payMethod() === 'at_service') { <mat-icon class="th-option-check">check_circle</mat-icon> }
          </button>
        </div>
      }

      <!-- ============ CONFIRMATION ============ -->
      @if (view() === 'confirmed' && booked(); as b) {
        <div class="confirm-hero">
          <div class="ch-check"><mat-icon>check</mat-icon></div>
          <h2>Your home service is confirmed</h2>
          <p>Booking reference <strong>{{ b.bookingRef }}</strong></p>
        </div>
        <div class="th-card">
          <div class="rv-row"><span>Service</span><strong>{{ b.title }}</strong></div>
          <div class="rv-row"><span>Patient</span><strong>{{ b.patientName }}</strong></div>
          <div class="rv-row"><span>Date</span><strong>{{ b.date | date:'fullDate' }}</strong></div>
          <div class="rv-row"><span>Arrival window</span><strong>{{ b.timeLabel }}</strong></div>
          <div class="rv-row"><span>Address</span><strong>{{ b.address?.label }} · {{ b.address?.area }}</strong></div>
          <div class="rv-row"><span>Payment</span><strong>{{ b.paymentState === 'pay_at_service' ? 'Pay at service' : 'Paid' }}</strong></div>
        </div>
        <div class="th-banner banner-amber" style="margin-top:14px">
          <mat-icon>checklist</mat-icon>
          <div class="b-body"><strong>Preparation</strong><span>{{ b.preparation?.[0]?.text }}</span></div>
        </div>
        <div class="confirm-actions">
          <button class="th-btn th-btn-ghost" (click)="go('/telehealth/prepare/' + b.id)"><mat-icon>checklist</mat-icon> View preparation</button>
          <button class="th-btn th-btn-primary" (click)="go('/telehealth/track/' + b.id)"><mat-icon>timeline</mat-icon> Track service</button>
        </div>
        <button class="th-btn th-btn-ghost th-btn-block" style="margin-top:10px" (click)="go('/telehealth/help')"><mat-icon>support_agent</mat-icon> Need help?</button>
      }

      <!-- ============ STICKY FOOTER ============ -->
      @if (view() !== 'catalogue' && view() !== 'confirmed') {
        <div class="th-sticky">
          <div class="th-sticky-inner">
            @if (view() === 'review') {
              <div class="th-sticky-price"><span class="sp-label">Total</span><span class="sp-amount">{{ currency }} {{ pricing().total }}</span></div>
              <button class="th-btn th-btn-primary" style="flex:1" [disabled]="paying()" (click)="pay()">
                <mat-icon>lock</mat-icon>{{ paying() ? 'Processing…' : (payMethod() === 'at_service' ? 'Confirm booking' : 'Pay now') }}
              </button>
            } @else {
              <button class="th-btn th-btn-primary th-btn-block" [disabled]="!canAdvance()" (click)="advance()">Continue</button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [TELE_STYLES, `
    .lede { font-size: 13.5px; color: #607d8b; margin: -4px 0 16px; }
    .svc-card { display: flex; gap: 14px; align-items: flex-start; padding: 16px; background: white; border: 1px solid #eceff1; border-radius: 16px; cursor: pointer; transition: all .15s; }
    .svc-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.06); border-color: #c5cae9; }
    .svc-icon { width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .svc-icon mat-icon { color: white; font-size: 24px; width: 24px; height: 24px; }
    .svc-body { flex: 1; min-width: 0; }
    .svc-body strong { font-size: 15px; color: #1b3a4b; display: block; }
    .svc-desc { font-size: 12.5px; color: #607d8b; display: block; margin: 2px 0 8px; line-height: 1.45; }
    .svc-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 8px; }
    .svc-meta span { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #546e7a; }
    .svc-meta mat-icon { font-size: 14px; width: 14px; height: 14px; color: #90a4ae; }
    .sm-price { font-weight: 700; color: #1565c0 !important; }
    .rx-note { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; }
    .rx-note mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .rx-required { color: #c62828; } .rx-recommended { color: #ef6c00; } .rx-not_required { color: #2e7d32; }
    .svc-arrow { color: #cfd8dc; flex-shrink: 0; align-self: center; }

    .add-member { display: inline-flex; align-items: center; gap: 8px; padding: 12px 14px; border: 1.5px dashed #c5cae9; border-radius: 12px; background: #f6f8fc; color: #1565c0; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }

    .detail-card { padding: 16px; }
    .dc-head { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
    .dc-head strong { font-size: 15px; color: #1b3a4b; display: block; } .dc-head span { font-size: 12.5px; color: #607d8b; }
    .dc-facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .dc-facts > div { background: #f6f8fc; border-radius: 12px; padding: 10px; text-align: center; }
    .dc-facts span { display: block; font-size: 11px; color: #90a4ae; } .dc-facts strong { font-size: 13px; color: #1b3a4b; }

    .upload-btn { display: inline-flex; align-items: center; gap: 6px; padding: 12px 14px; border: 1.5px dashed #c5cae9; border-radius: 12px; background: #f6f8fc; color: #1565c0; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }

    .rv-title { margin: 0 0 12px; font-size: 15px; color: #1b3a4b; }
    .rv-row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; font-size: 13.5px; color: #607d8b; border-bottom: 1px solid #f2f4f7; }
    .rv-row strong { color: #1b3a4b; font-weight: 600; text-align: right; }

    .confirm-hero { text-align: center; padding: 24px 0 20px; }
    .ch-check { width: 68px; height: 68px; margin: 0 auto 14px; border-radius: 50%; background: #e8f5e9; display: flex; align-items: center; justify-content: center; }
    .ch-check mat-icon { color: #2e7d32; font-size: 38px; width: 38px; height: 38px; }
    .confirm-hero h2 { margin: 0 0 4px; font-size: 19px; color: #1b3a4b; }
    .confirm-hero p { margin: 0; font-size: 13px; color: #607d8b; } .confirm-hero strong { color: #1565c0; }
    .confirm-actions { display: flex; gap: 10px; margin-top: 14px; } .confirm-actions .th-btn { flex: 1; }
    .initials-av { font-weight: 700; color: white; font-size: 13px; }
  `]
})
export class HomeCareComponent implements OnInit {
  readonly svc = inject(TelehealthService);
  private readonly family = inject(FamilyService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);
  readonly currency = TELE_CURRENCY;

  readonly view = signal<View>('catalogue');
  readonly service = signal<HomeCareService | null>(null);
  readonly patientId = signal<string>('');
  readonly intake = signal<Record<string, string>>({});
  readonly address = signal<ServiceAddress | null>(null);
  readonly slot = signal<CareSlot | null>(null);
  readonly payMethod = signal<'now' | 'at_service'>('now');
  readonly paying = signal(false);
  readonly booked = signal<CareItem | null>(null);

  ngOnInit(): void {
    this.patientId.set(this.family.activeMember()?.patientId ?? '12345678');
    const pre = this.route.snapshot.queryParamMap.get('service');
    if (pre) {
      const s = this.svc.homeCareServices.find(x => x.key === pre);
      if (s) { this.service.set(s); this.view.set('patient'); }
    }
  }

  members() { return this.family.selectableMembers(); }
  initials(name: string): string { const p = name.split(' '); return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase(); }
  age(m: { dateOfBirth: string }): number { return this.family.ageFor(m as any); }
  patientName(): string { return this.members().find(m => m.patientId === this.patientId())?.fullName ?? 'Aisha Rahman'; }

  chooseService(s: HomeCareService): void { this.service.set(s); this.view.set('patient'); }
  setIntake(id: string, val: string): void { this.intake.update(m => ({ ...m, [id]: val })); }
  upload(id: string): void { this.setIntake(id, 'Prescription_scan.pdf'); }
  addMember(): void { this.family.openPicker(true); }

  onAddress(a: ServiceAddress | null): void { this.address.set(a); }
  onSlot(s: CareSlot | null): void { this.slot.set(s); }

  pricing() { return this.service() ? this.svc.homeCarePrice(this.service()!) : { lines: [], total: 0 }; }
  slotDateLabel(): string {
    const s = this.slot(); if (!s) return '';
    const d = this.svc.slotsFor([1, 2, 3, 4]).find(x => x.date === s.date);
    return d?.label ?? '';
  }

  // ---- Stepper ----
  private readonly order: View[] = ['patient', 'service', 'address', 'slot', 'review'];
  stepIndex(): number { return Math.max(0, this.order.indexOf(this.view())); }

  canAdvance(): boolean {
    switch (this.view()) {
      case 'patient': return !!this.patientId();
      case 'service': return true; // intake is light-touch; required fields validated softly
      case 'address': return !!this.address();
      case 'slot': return !!this.slot();
      default: return true;
    }
  }
  advance(): void {
    const i = this.order.indexOf(this.view());
    if (i >= 0 && i < this.order.length - 1) this.view.set(this.order[i + 1]);
  }

  pay(): void {
    this.paying.set(true);
    setTimeout(() => {
      const s = this.service()!;
      const { lines, total } = this.svc.homeCarePrice(s);
      const item = this.svc.createHomeCareBooking({
        service: s, address: this.address()!, slot: this.slot()!,
        concern: Object.values(this.intake()).filter(Boolean).join(' · '),
        priceLines: lines, total,
        paymentState: this.payMethod() === 'at_service' ? 'pay_at_service' : 'paid'
      });
      // Reassign to the selected family member if different.
      if (this.patientId()) this.svc.updateItem(item.id, { patientId: this.patientId(), patientName: this.patientName() });
      this.paying.set(false);
      this.booked.set({ ...item, patientId: this.patientId(), patientName: this.patientName() });
      this.view.set('confirmed');
    }, 1200);
  }

  headerTitle(): string {
    return this.view() === 'catalogue' ? 'Book care at home'
      : this.view() === 'confirmed' ? 'Confirmed'
      : this.service()?.name ?? 'Book care at home';
  }
  headerSub(): string { return this.view() === 'catalogue' ? 'Nurse, physiotherapy, wound care, injections, vaccination' : ''; }
  backTarget(): string { return this.view() === 'catalogue' ? '/telehealth' : '/telehealth/home-care'; }
  go(url: string): void { this.router.navigateByUrl(url); }
}
