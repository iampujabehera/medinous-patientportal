import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ThHeaderComponent } from './th-header.component';
import { TelehealthService } from './telehealth.service';
import { TELE_STYLES } from './telehealth.styles';
import { CareItem } from './telehealth.model';

// =====================================================================
// CONSULTATION OUTCOME  (spec §6 step 8, §14)
//
// After the video call: summary, advice, prescription, ordered tests
// and follow-up — each rendered as a DIRECT action. This is the
// Medinous advantage: a doctor recommendation becomes a one-tap booking,
// and everything is saved back to the hospital record.
// =====================================================================
@Component({
  selector: 'app-consult-outcome',
  standalone: true,
  imports: [CommonModule, MatIconModule, ThHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (item(); as it) {
      <div class="th-page th-wrap">
        <th-header title="Consultation outcome" [subtitle]="it.subtitle || ''" back="/telehealth" />

        <div class="th-banner banner-teal">
          <mat-icon>check_circle</mat-icon>
          <div class="b-body">
            <strong>Consultation completed</strong>
            <span>with {{ it.provider?.name }} · {{ it.timeLabel }}. Saved to My Records.</span>
          </div>
        </div>

        @if (it.outcome; as o) {
          <!-- Summary -->
          <section class="th-section">
            <div class="th-sec-head"><h2>Doctor's summary</h2></div>
            <div class="th-card"><p class="summary-text">{{ o.summary }}</p></div>
          </section>

          <!-- Advice -->
          @if (o.advice.length) {
            <section class="th-section">
              <div class="th-sec-head"><h2>Advice</h2></div>
              <div class="th-card">
                <ul class="advice-list">
                  @for (a of o.advice; track a) { <li><mat-icon>check</mat-icon>{{ a }}</li> }
                </ul>
              </div>
            </section>
          }

          <!-- Prescription -->
          @if (o.prescriptionIssued) {
            <section class="th-section">
              <div class="th-sec-head"><h2>Prescription</h2></div>
              <div class="th-card">
                @for (m of o.prescriptionItems; track m.name) {
                  <div class="rx-row">
                    <div class="rx-icon"><mat-icon>medication</mat-icon></div>
                    <div class="rx-body">
                      <strong>{{ m.name }}</strong>
                      <span>{{ m.dosage }} · {{ m.frequency }} · {{ m.duration }}</span>
                    </div>
                  </div>
                }
                <button class="th-btn th-btn-ghost th-btn-block" style="margin-top:12px" (click)="go('/medications')">
                  <mat-icon>medication</mat-icon> View medicines in Medications
                </button>
              </div>
            </section>
          }

          <!-- What's next — direct actions (continuity) -->
          <section class="th-section">
            <div class="th-sec-head">
              <div><h2>Recommended next steps</h2><p class="th-sec-sub">One tap — already linked to your record</p></div>
            </div>
            <div class="th-stack">
              @if (o.testsOrdered?.length) {
                <article class="next-card">
                  <div class="nc-icon" style="background:#6a1b9a"><mat-icon>biotech</mat-icon></div>
                  <div class="nc-body">
                    <strong>{{ it.provider?.name }} ordered {{ testNames(o.testsOrdered!) }}</strong>
                    <span>Book home sample collection — tests are pre-added to your cart</span>
                  </div>
                  <button class="th-btn th-btn-primary nc-cta" (click)="bookTests(o.testsOrdered!)">Book at home</button>
                </article>
              }
              @if (o.homeServicesRecommended?.length) {
                <article class="next-card">
                  <div class="nc-icon" style="background:#00897b"><mat-icon>home_health</mat-icon></div>
                  <div class="nc-body">
                    <strong>{{ homeName(o.homeServicesRecommended![0]) }} recommended</strong>
                    <span>Book a home visit at a convenient time</span>
                  </div>
                  <button class="th-btn th-btn-primary nc-cta" (click)="bookHome(o.homeServicesRecommended![0])">Book</button>
                </article>
              }
              @if (o.followUpInDays) {
                <article class="next-card">
                  <div class="nc-icon" style="background:#1565c0"><mat-icon>event_repeat</mat-icon></div>
                  <div class="nc-body">
                    <strong>Follow-up in {{ followUpWeeks(o.followUpInDays) }}</strong>
                    <span>A short video review with {{ it.provider?.name }}</span>
                  </div>
                  <button class="th-btn th-btn-primary nc-cta" (click)="go('/telehealth/consult')">Book</button>
                </article>
              }
              <article class="next-card">
                <div class="nc-icon" style="background:#546e7a"><mat-icon>forum</mat-icon></div>
                <div class="nc-body">
                  <strong>Ask a follow-up question</strong>
                  <span>Free message follow-up for 48 hours</span>
                </div>
                <button class="th-btn th-btn-ghost nc-cta" (click)="askQuestion()">Ask</button>
              </article>
            </div>
          </section>

          <!-- Deep-links -->
          <section class="th-section">
            <div class="deeplinks">
              <button class="deeplink" (click)="go('/timeline')"><mat-icon>folder_shared</mat-icon> Records</button>
              <button class="deeplink" (click)="go('/medications')"><mat-icon>medication</mat-icon> Medications</button>
              <button class="deeplink" (click)="go('/payments')"><mat-icon>payments</mat-icon> Payments</button>
            </div>
          </section>
        }
      </div>
    }
  `,
  styles: [TELE_STYLES, `
    .summary-text { margin: 0; font-size: 14px; color: #37474f; line-height: 1.6; }
    .advice-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .advice-list li { display: flex; align-items: flex-start; gap: 8px; font-size: 13.5px; color: #37474f; }
    .advice-list mat-icon { font-size: 18px; width: 18px; height: 18px; color: #2e7d32; flex-shrink: 0; margin-top: 1px; }
    .rx-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
    .rx-icon { width: 40px; height: 40px; border-radius: 10px; background: #fff3e0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rx-icon mat-icon { color: #ef6c00; font-size: 20px; width: 20px; height: 20px; }
    .rx-body strong { display: block; font-size: 14px; color: #1b3a4b; }
    .rx-body span { font-size: 12.5px; color: #607d8b; }
    .next-card { display: flex; align-items: center; gap: 12px; padding: 14px; background: white; border: 1px solid #eceff1; border-radius: 16px; }
    .nc-icon { width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .nc-icon mat-icon { color: white; font-size: 22px; width: 22px; height: 22px; }
    .nc-body { flex: 1; min-width: 0; }
    .nc-body strong { display: block; font-size: 13.5px; color: #1b3a4b; line-height: 1.35; }
    .nc-body span { font-size: 12px; color: #607d8b; }
    .nc-cta { height: 38px !important; padding: 0 14px !important; font-size: 12.5px !important; flex-shrink: 0; }
    .deeplinks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .deeplink { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 8px; background: white; border: 1px solid #eceff1; border-radius: 14px; color: #1a237e; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
    .deeplink mat-icon { font-size: 22px; width: 22px; height: 22px; color: #1565c0; }
  `]
})
export class ConsultOutcomeComponent implements OnInit {
  private readonly svc = inject(TelehealthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);
  readonly item = signal<CareItem | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    const it = this.svc.getItem(id);
    if (!it) { this.router.navigateByUrl('/telehealth'); return; }
    this.item.set(it);
  }

  testNames(codes: string[]): string {
    return codes.map(c => this.svc.test(c)?.name ?? c).join(' and ');
  }
  homeName(key: CareItem['homeCareKey']): string {
    return key ? this.svc.homeCare(key).name : '';
  }
  followUpWeeks(days: number): string {
    const w = Math.round(days / 7);
    return w <= 1 ? '1 week' : `${w} weeks`;
  }

  go(url: string): void { this.router.navigateByUrl(url); }
  bookTests(codes: string[]): void { this.router.navigate(['/telehealth/lab-tests'], { queryParams: { add: codes.join(',') } }); }
  bookHome(key: NonNullable<CareItem['homeCareKey']>): void { this.router.navigate(['/telehealth/home-care'], { queryParams: { service: key } }); }
  askQuestion(): void { this.snack.open('Your question has been sent to the doctor. They usually reply within a few hours.', 'OK', { duration: 3500 }); }
}
