import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ThHeaderComponent } from './th-header.component';
import { AddressPickerComponent } from './address-picker.component';
import { SlotPickerComponent } from './slot-picker.component';
import { TelehealthService, TELE_CURRENCY } from './telehealth.service';
import { TELE_STYLES } from './telehealth.styles';
import { LabTest, HealthPackage, ServiceAddress, CareSlot, CareItem } from './telehealth.model';

type View = 'discover' | 'cart' | 'address' | 'slot' | 'review' | 'confirmed';

// =====================================================================
// HOME LAB TEST  (spec §9)
//
// A clean, hospital-connected test-booking MVP — NOT a diagnostics
// marketplace. Doctor-recommended tests are surfaced first (the
// continuity-of-care advantage), then common tests / search / packages.
// =====================================================================
@Component({
  selector: 'app-lab-tests',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, ThHeaderComponent, AddressPickerComponent, SlotPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="th-page th-wrap">
      <th-header [title]="headerTitle()" [subtitle]="headerSub()" [back]="backTarget()" [showCareFor]="view() === 'discover'" />

      @if (view() !== 'discover' && view() !== 'confirmed') {
        <div class="th-steps">
          @for (i of [0,1,2,3]; track i) { <div class="th-step-dot" [class.on]="stepIndex() >= i"></div> }
        </div>
      }

      <!-- ============ DISCOVER ============ -->
      @if (view() === 'discover') {
        <!-- Search -->
        <div class="lab-search">
          <mat-icon>search</mat-icon>
          <input class="th-input" [ngModel]="query()" (ngModelChange)="query.set($event)" placeholder="Search a test, e.g. Vitamin D" autocomplete="off" />
        </div>

        <div class="entry-row">
          <button class="entry-chip" (click)="uploadRx()"><mat-icon>upload_file</mat-icon> Upload prescription</button>
          <button class="entry-chip" (click)="fromRx()"><mat-icon>receipt_long</mat-icon> From my prescription</button>
        </div>

        @if (filtered().length && query().trim()) {
          <section class="th-section">
            <div class="th-sec-head"><h2>Search results</h2></div>
            <div class="th-stack">
              @for (t of filtered(); track t.code) { <ng-container [ngTemplateOutlet]="testRow" [ngTemplateOutletContext]="{ t: t }"></ng-container> }
            </div>
          </section>
        } @else {
          <!-- Doctor-recommended -->
          @if (svc.doctorRecommendedTests.length) {
            <section class="th-section">
              <div class="th-sec-head"><div><h2>Recommended by your doctor</h2><p class="th-sec-sub">Ordered at the hospital · clinically relevant</p></div></div>
              <div class="th-stack">
                @for (t of svc.doctorRecommendedTests; track t.code) { <ng-container [ngTemplateOutlet]="testRow" [ngTemplateOutletContext]="{ t: t, rec: true }"></ng-container> }
              </div>
            </section>
          }

          <!-- Packages -->
          <section class="th-section">
            <div class="th-sec-head"><h2>Health packages</h2></div>
            <div class="th-stack">
              @for (p of svc.healthPackages; track p.code) {
                <article class="pkg-card">
                  <div class="pkg-icon"><mat-icon>inventory_2</mat-icon></div>
                  <div class="pkg-body">
                    <strong>{{ p.name }}</strong>
                    <span>{{ p.blurb }}</span>
                    <span class="pkg-price">{{ currency }} {{ p.price }} · {{ p.testCodes.length }} tests</span>
                  </div>
                  <button class="th-btn th-btn-ghost pkg-add" (click)="addPackage(p)">Add</button>
                </article>
              }
            </div>
          </section>

          <!-- Common tests -->
          <section class="th-section">
            <div class="th-sec-head"><h2>Common tests</h2></div>
            <div class="th-stack">
              @for (t of commonTests(); track t.code) { <ng-container [ngTemplateOutlet]="testRow" [ngTemplateOutletContext]="{ t: t }"></ng-container> }
            </div>
          </section>
        }
      }

      <!-- ============ CART ============ -->
      @if (view() === 'cart') {
        @if (cart().length === 0) {
          <div class="th-empty"><mat-icon>science</mat-icon><p>Your test cart is empty.</p>
            <button class="th-btn th-btn-primary" style="margin-top:16px" (click)="view.set('discover')"><mat-icon>add</mat-icon> Add tests</button>
          </div>
        } @else {
          <label class="th-label">Selected tests</label>
          <div class="th-stack">
            @for (t of cartTests(); track t.code) {
              <div class="cart-row">
                <div class="cart-info">
                  <strong>{{ t.name }}</strong>
                  <span class="cart-meta">{{ currency }} {{ t.price }} · {{ t.turnaround }}@if (t.fasting) { · <span class="fast">Fasting</span> }</span>
                  @if (t.doctorRecommended) { <span class="rec-tag"><mat-icon>verified</mat-icon> Recommended by {{ t.recommendedBy }}</span> }
                </div>
                <button class="cart-remove" (click)="remove(t.code)" aria-label="Remove"><mat-icon>delete_outline</mat-icon></button>
              </div>
            }
          </div>

          <button class="th-btn th-btn-ghost th-btn-block" style="margin-top:12px" (click)="view.set('discover')"><mat-icon>add</mat-icon> Add more tests</button>

          @if (anyFasting()) {
            <div class="th-banner banner-amber" style="margin-top:14px">
              <mat-icon>no_food</mat-icon>
              <div class="b-body"><strong>Fasting required</strong><span>One or more tests need 8–10 hours of fasting. Plain water is allowed.</span></div>
            </div>
          }

          <div class="th-card" style="margin-top:14px">
            <div class="th-price-lines">
              @for (l of pricing().lines; track l.label) { <div class="th-price-row"><span>{{ l.label }}</span><span>{{ currency }} {{ l.amount }}</span></div> }
            </div>
            <div class="th-price-total"><strong>Total</strong><span class="tt">{{ currency }} {{ pricing().total }}</span></div>
          </div>
        }
      }

      <!-- ============ ADDRESS ============ -->
      @if (view() === 'address') {
        <p class="lede">Where should we collect the sample?</p>
        <th-address-picker (changed)="onAddress($event)" />
      }

      <!-- ============ SLOT ============ -->
      @if (view() === 'slot') {
        <p class="lede">Pick a collection window</p>
        <th-slot-picker (changed)="onSlot($event)" />
        @if (anyFasting()) {
          <div class="th-banner banner-amber" style="margin-top:14px">
            <mat-icon>no_food</mat-icon>
            <div class="b-body"><strong>Fasting note</strong><span>A morning window is best for fasting tests. Fast 8–10 hours before; plain water is fine.</span></div>
          </div>
        }
      }

      <!-- ============ REVIEW ============ -->
      @if (view() === 'review') {
        <div class="th-card">
          <h3 class="rv-title">Review & pay</h3>
          <div class="rv-row"><span>Tests</span><strong>{{ cart().length }} selected</strong></div>
          <div class="rv-row"><span>Address</span><strong>{{ address()?.label }} · {{ address()?.area }}</strong></div>
          <div class="rv-row"><span>Collection</span><strong>{{ slotDateLabel() }} · {{ slot()?.window }}</strong></div>
          <div class="th-price-lines" style="margin-top:14px">
            @for (l of pricing().lines; track l.label) { <div class="th-price-row"><span>{{ l.label }}</span><span>{{ currency }} {{ l.amount }}</span></div> }
          </div>
          <div class="th-price-total"><strong>Total</strong><span class="tt">{{ currency }} {{ pricing().total }}</span></div>
        </div>

        <label class="th-label" style="margin-top:14px">Payment</label>
        <div class="th-stack">
          <button class="th-option" [class.sel]="payMethod() === 'now'" (click)="payMethod.set('now')">
            <div class="th-option-icon" style="background:#1565c0"><mat-icon>credit_card</mat-icon></div>
            <div class="th-option-body"><strong>Pay now</strong><span>Card ending 4242 · via Payments</span></div>
            @if (payMethod() === 'now') { <mat-icon class="th-option-check">check_circle</mat-icon> }
          </button>
          <button class="th-option" [class.sel]="payMethod() === 'at_collection'" (click)="payMethod.set('at_collection')">
            <div class="th-option-icon" style="background:#00897b"><mat-icon>handshake</mat-icon></div>
            <div class="th-option-body"><strong>Pay at collection</strong><span>Pay the phlebotomist on arrival</span></div>
            @if (payMethod() === 'at_collection') { <mat-icon class="th-option-check">check_circle</mat-icon> }
          </button>
        </div>
      }

      <!-- ============ CONFIRMED ============ -->
      @if (view() === 'confirmed' && booked(); as b) {
        <div class="confirm-hero">
          <div class="ch-check"><mat-icon>check</mat-icon></div>
          <h2>Home collection confirmed</h2>
          <p>Booking reference <strong>{{ b.bookingRef }}</strong></p>
        </div>
        <div class="th-card">
          <div class="rv-row"><span>Tests</span><strong>{{ b.subtitle }}</strong></div>
          <div class="rv-row"><span>Date</span><strong>{{ b.date | date:'fullDate' }}</strong></div>
          <div class="rv-row"><span>Window</span><strong>{{ b.timeLabel }}</strong></div>
          <div class="rv-row"><span>Address</span><strong>{{ b.address?.label }} · {{ b.address?.area }}</strong></div>
        </div>
        <div class="confirm-actions">
          <button class="th-btn th-btn-ghost" (click)="go('/telehealth/prepare/' + b.id)"><mat-icon>checklist</mat-icon> Preparation</button>
          <button class="th-btn th-btn-primary" (click)="go('/telehealth/track/' + b.id)"><mat-icon>timeline</mat-icon> Track collection</button>
        </div>
      }

      <!-- ============ STICKY FOOTER ============ -->
      @if (view() !== 'confirmed') {
        <div class="th-sticky">
          <div class="th-sticky-inner">
            @switch (view()) {
              @case ('discover') {
                @if (cart().length > 0) {
                  <div class="th-sticky-price"><span class="sp-label">{{ cart().length }} test(s)</span><span class="sp-amount">{{ currency }} {{ pricing().total }}</span></div>
                  <button class="th-btn th-btn-primary" style="flex:1" (click)="view.set('cart')"><mat-icon>shopping_cart</mat-icon> Review cart</button>
                }
              }
              @case ('cart') {
                <button class="th-btn th-btn-primary th-btn-block" [disabled]="cart().length === 0" (click)="view.set('address')">Continue to address</button>
              }
              @case ('address') {
                <button class="th-btn th-btn-primary th-btn-block" [disabled]="!address()" (click)="view.set('slot')">Continue</button>
              }
              @case ('slot') {
                <button class="th-btn th-btn-primary th-btn-block" [disabled]="!slot()" (click)="view.set('review')">Review & pay</button>
              }
              @case ('review') {
                <div class="th-sticky-price"><span class="sp-label">Total</span><span class="sp-amount">{{ currency }} {{ pricing().total }}</span></div>
                <button class="th-btn th-btn-primary" style="flex:1" [disabled]="paying()" (click)="pay()">
                  <mat-icon>lock</mat-icon>{{ paying() ? 'Processing…' : (payMethod() === 'at_collection' ? 'Confirm' : 'Pay now') }}
                </button>
              }
            }
          </div>
        </div>
      }
    </div>

    <!-- Reusable test row -->
    <ng-template #testRow let-t="t" let-rec="rec">
      <div class="test-row" [class.rec]="rec">
        <div class="test-info">
          <strong>{{ t.name }}</strong>
          <span class="test-meta">{{ currency }} {{ t.price }} · {{ t.turnaround }}@if (t.fasting) { · <span class="fast">Fasting</span> }</span>
          @if (rec) { <span class="rec-tag"><mat-icon>verified</mat-icon> Recommended by {{ t.recommendedBy }}</span> }
        </div>
        @if (inCart(t.code)) {
          <button class="test-added" (click)="remove(t.code)"><mat-icon>check</mat-icon> Added</button>
        } @else {
          <button class="test-add" (click)="add(t)"><mat-icon>add</mat-icon> Add</button>
        }
      </div>
    </ng-template>
  `,
  styles: [TELE_STYLES, `
    .lede { font-size: 13.5px; color: #607d8b; margin: -4px 0 16px; }
    .lab-search { position: relative; margin-bottom: 12px; }
    .lab-search mat-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #90a4ae; font-size: 20px; width: 20px; height: 20px; }
    .lab-search .th-input { padding-left: 42px; }
    .entry-row { display: flex; gap: 10px; margin-bottom: 20px; }
    .entry-chip { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 12px; border: 1.5px dashed #c5cae9; border-radius: 12px; background: #f6f8fc; color: #1565c0; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .entry-chip mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .test-row { display: flex; align-items: center; gap: 12px; padding: 14px; background: white; border: 1px solid #eceff1; border-radius: 14px; }
    .test-row.rec { border-color: #d0e3ff; background: linear-gradient(135deg,#f3f8ff 0%, #ffffff 60%); }
    .test-info { flex: 1; min-width: 0; }
    .test-info strong { display: block; font-size: 14px; color: #1b3a4b; }
    .test-meta { font-size: 12px; color: #607d8b; }
    .fast { color: #ef6c00; font-weight: 600; }
    .rec-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: #1565c0; font-weight: 600; margin-top: 4px; }
    .rec-tag mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .test-add, .test-added { display: inline-flex; align-items: center; gap: 4px; padding: 8px 14px; border-radius: 20px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; flex-shrink: 0; }
    .test-add { background: #1565c0; color: white; border: none; }
    .test-added { background: #e8f5e9; color: #2e7d32; border: 1px solid #b9e2bd; }
    .test-add mat-icon, .test-added mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .pkg-card { display: flex; align-items: center; gap: 12px; padding: 14px; background: white; border: 1px solid #eceff1; border-radius: 14px; }
    .pkg-icon { width: 42px; height: 42px; border-radius: 12px; background: #f3e5f5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pkg-icon mat-icon { color: #6a1b9a; font-size: 22px; width: 22px; height: 22px; }
    .pkg-body { flex: 1; min-width: 0; }
    .pkg-body strong { display: block; font-size: 14px; color: #1b3a4b; }
    .pkg-body span { display: block; font-size: 12px; color: #607d8b; }
    .pkg-price { color: #6a1b9a !important; font-weight: 600; margin-top: 2px; }
    .pkg-add { height: 38px !important; padding: 0 16px !important; font-size: 13px !important; flex-shrink: 0; }

    .cart-row { display: flex; align-items: center; gap: 12px; padding: 14px; background: white; border: 1px solid #eceff1; border-radius: 14px; }
    .cart-info { flex: 1; min-width: 0; } .cart-info strong { display: block; font-size: 14px; color: #1b3a4b; }
    .cart-remove { background: none; border: none; color: #c62828; cursor: pointer; flex-shrink: 0; }

    .rv-title { margin: 0 0 12px; font-size: 15px; color: #1b3a4b; }
    .rv-row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; font-size: 13.5px; color: #607d8b; border-bottom: 1px solid #f2f4f7; }
    .rv-row strong { color: #1b3a4b; font-weight: 600; text-align: right; }
    .confirm-hero { text-align: center; padding: 24px 0 20px; }
    .ch-check { width: 68px; height: 68px; margin: 0 auto 14px; border-radius: 50%; background: #e8f5e9; display: flex; align-items: center; justify-content: center; }
    .ch-check mat-icon { color: #2e7d32; font-size: 38px; width: 38px; height: 38px; }
    .confirm-hero h2 { margin: 0 0 4px; font-size: 19px; color: #1b3a4b; }
    .confirm-hero p { margin: 0; font-size: 13px; color: #607d8b; } .confirm-hero strong { color: #1565c0; }
    .confirm-actions { display: flex; gap: 10px; margin-top: 14px; } .confirm-actions .th-btn { flex: 1; }
  `]
})
export class LabTestsComponent implements OnInit {
  readonly svc = inject(TelehealthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly currency = TELE_CURRENCY;

  readonly view = signal<View>('discover');
  readonly cart = signal<string[]>([]);
  readonly query = signal('');
  readonly address = signal<ServiceAddress | null>(null);
  readonly slot = signal<CareSlot | null>(null);
  readonly payMethod = signal<'now' | 'at_collection'>('now');
  readonly paying = signal(false);
  readonly booked = signal<CareItem | null>(null);

  ngOnInit(): void {
    const add = this.route.snapshot.queryParamMap.get('add');
    if (add) {
      const codes = add.split(',').map(c => c.trim()).filter(Boolean);
      this.cart.set([...new Set(codes.filter(c => !!this.svc.test(c)))]);
      if (this.cart().length) this.view.set('cart');
    }
  }

  commonTests(): LabTest[] { return this.svc.labTests.filter(t => !t.doctorRecommended); }
  filtered(): LabTest[] {
    const q = this.query().toLowerCase().trim();
    if (!q) return [];
    return this.svc.labTests.filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
  }
  cartTests(): LabTest[] { return this.cart().map(c => this.svc.test(c)).filter((t): t is LabTest => !!t); }
  inCart(code: string): boolean { return this.cart().includes(code); }
  anyFasting(): boolean { return this.cartTests().some(t => t.fasting); }

  add(t: LabTest): void { this.cart.update(c => c.includes(t.code) ? c : [...c, t.code]); }
  remove(code: string): void { this.cart.update(c => c.filter(x => x !== code)); }
  addPackage(p: HealthPackage): void {
    this.cart.update(c => [...new Set([...c, ...p.testCodes])]);
    this.view.set('cart');
  }
  uploadRx(): void { this.add(this.svc.test('CBC')!); this.add(this.svc.test('LIPID')!); this.view.set('cart'); }
  fromRx(): void { this.svc.doctorRecommendedTests.forEach(t => this.add(t)); this.view.set('cart'); }

  pricing() { return this.svc.labPrice(this.cart()); }
  onAddress(a: ServiceAddress | null): void { this.address.set(a); }
  onSlot(s: CareSlot | null): void { this.slot.set(s); }
  slotDateLabel(): string {
    const s = this.slot(); if (!s) return '';
    return this.svc.slotsFor([1, 2, 3, 4]).find(x => x.date === s.date)?.label ?? '';
  }

  private readonly order: View[] = ['cart', 'address', 'slot', 'review'];
  stepIndex(): number { return Math.max(0, this.order.indexOf(this.view())); }

  pay(): void {
    this.paying.set(true);
    setTimeout(() => {
      const { lines, total } = this.svc.labPrice(this.cart());
      const item = this.svc.createLabBooking({
        testCodes: this.cart(), address: this.address()!, slot: this.slot()!,
        priceLines: lines, total,
        paymentState: this.payMethod() === 'at_collection' ? 'pay_at_service' : 'paid'
      });
      this.paying.set(false);
      this.booked.set(item);
      this.view.set('confirmed');
    }, 1200);
  }

  headerTitle(): string {
    return this.view() === 'discover' ? 'Book a home lab test'
      : this.view() === 'cart' ? 'Your test cart'
      : this.view() === 'confirmed' ? 'Confirmed' : 'Home lab test';
  }
  headerSub(): string { return this.view() === 'discover' ? 'Sample collected at home · reports in My Records' : ''; }
  backTarget(): string { return this.view() === 'discover' ? '/telehealth' : '/telehealth/lab-tests'; }
  go(url: string): void { this.router.navigateByUrl(url); }
}
