import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ThHeaderComponent } from './th-header.component';
import { TelehealthService, TELE_CURRENCY } from './telehealth.service';
import { TELE_STYLES } from './telehealth.styles';
import { CareItem, CareRecommendation } from './telehealth.model';
import { statusChip, primaryActionFor } from './care-status.util';

// =====================================================================
// TELEHEALTH HOME  (spec §5, §17)
//
// The patient's front door to remote care. Card-based, mobile-first.
//   1. Active care (nearest upcoming/active service)
//   2. Get care from home (three choices)
//   3. Recommended for you (hospital-connected → direct actions)
//   4. Recent care (last three completed)
//   5. Need help
// =====================================================================
@Component({
  selector: 'app-telehealth-home',
  standalone: true,
  imports: [CommonModule, MatIconModule, ThHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="th-page th-wrap">
      <th-header
        title="Telehealth"
        subtitle="Consult doctors and receive selected hospital services from home."
        back="/dashboard"
        [showCareFor]="true" />

      <!-- ============ 1. ACTIVE CARE ============ -->
      @if (svc.nearestActive(); as item) {
        <section class="th-section">
          <div class="th-sec-head">
            <h2>Active care</h2>
            <button class="th-sec-link" (click)="go('/telehealth/active-care')">
              View all active care <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>

          <article class="active-card" [class]="'edge-' + statusChip(item).tone">
            <div class="ac-top">
              <div class="ac-icon" [style.background]="typeColor(item)">
                <mat-icon>{{ typeIcon(item) }}</mat-icon>
              </div>
              <div class="ac-info">
                <strong class="ac-title">{{ item.title }}</strong>
                @if (item.subtitle) { <span class="ac-sub">{{ item.subtitle }}</span> }
              </div>
              <span class="th-chip ac-status" [class]="statusChip(item).cls">
                <mat-icon>{{ statusChip(item).icon }}</mat-icon>{{ statusChip(item).label }}
              </span>
            </div>

            <div class="ac-meta-row">
              <span><mat-icon>schedule</mat-icon>{{ item.timeLabel }}</span>
              @if (item.provider) { <span><mat-icon>person</mat-icon>{{ item.provider.name }}</span> }
            </div>

            <div class="ac-actions">
              <button class="th-btn th-btn-primary" (click)="runPrimary(item)">
                <mat-icon>{{ primaryAction(item).icon }}</mat-icon>{{ primaryAction(item).label }}
              </button>
              <button class="th-btn th-btn-ghost" (click)="go('/telehealth/active-care')">Details</button>
            </div>
          </article>
        </section>
      }

      <!-- ============ 2. GET CARE FROM HOME ============ -->
      <section class="th-section">
        <div class="th-sec-head">
          <h2>What would you like help with?</h2>
        </div>
        <div class="th-stack">
          <button class="th-choice" (click)="go('/telehealth/consult')">
            <div class="th-choice-icon" style="background:#1565c0"><mat-icon>videocam</mat-icon></div>
            <div class="th-choice-body">
              <strong>Consult a doctor online</strong>
              <span>Book a video visit or connect to an available doctor now</span>
            </div>
            <mat-icon class="th-choice-arrow">chevron_right</mat-icon>
          </button>

          <button class="th-choice" (click)="go('/telehealth/home-care')">
            <div class="th-choice-icon" style="background:#00897b"><mat-icon>home_health</mat-icon></div>
            <div class="th-choice-body">
              <strong>Book care at home</strong>
              <span>Nurse, physiotherapy, wound dressing, injections, vaccination</span>
            </div>
            <mat-icon class="th-choice-arrow">chevron_right</mat-icon>
          </button>

          <button class="th-choice" (click)="go('/telehealth/lab-tests')">
            <div class="th-choice-icon" style="background:#6a1b9a"><mat-icon>biotech</mat-icon></div>
            <div class="th-choice-body">
              <strong>Book a home lab test</strong>
              <span>Sample collected at home, reports in My Records</span>
            </div>
            <mat-icon class="th-choice-arrow">chevron_right</mat-icon>
          </button>
        </div>
      </section>

      <!-- ============ 3. RECOMMENDED FOR YOU ============ -->
      @if (svc.recommendations().length > 0) {
        <section class="th-section">
          <div class="th-sec-head">
            <div>
              <h2>Recommended for you</h2>
              <p class="th-sec-sub">From your hospital record — one tap to book</p>
            </div>
          </div>
          <div class="th-stack">
            @for (rec of svc.recommendations(); track rec.id) {
              <article class="rec-card">
                <div class="rec-icon" [class]="'ri-' + rec.kind">
                  <mat-icon>{{ recIcon(rec) }}</mat-icon>
                </div>
                <div class="rec-body">
                  <strong>{{ rec.title }}</strong>
                  <span>{{ rec.detail }}</span>
                  <div class="rec-connected">
                    <mat-icon>link</mat-icon> Hospital-connected · {{ rec.doctorName }}
                  </div>
                </div>
                <div class="rec-actions">
                  <button class="th-btn th-btn-primary rec-cta" (click)="runRecommendation(rec)">{{ rec.action }}</button>
                  <button class="rec-dismiss" (click)="svc.dismissRecommendation(rec.id)" aria-label="Dismiss">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </article>
            }
          </div>
        </section>
      }

      <!-- ============ 4. RECENT CARE ============ -->
      @if (svc.recentCompleted().length > 0) {
        <section class="th-section">
          <div class="th-sec-head">
            <h2>Recent care</h2>
            <button class="th-sec-link" (click)="go('/telehealth/active-care')">
              View all <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
          <div class="th-stack">
            @for (item of svc.recentCompleted(); track item.id) {
              <button class="recent-row" (click)="openCompleted(item)">
                <div class="rr-icon" [style.background]="typeColor(item)"><mat-icon>{{ typeIcon(item) }}</mat-icon></div>
                <div class="rr-body">
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.timeLabel }}</span>
                </div>
                <span class="th-chip chip-completed"><mat-icon>check</mat-icon>Completed</span>
              </button>
            }
          </div>
        </section>
      }

      <!-- ============ 5. NEED HELP ============ -->
      <section class="th-section">
        <div class="help-grid">
          <button class="help-tile" (click)="go('/telehealth/help')">
            <mat-icon style="color:#1565c0">support_agent</mat-icon>
            <strong>Contact support</strong>
            <span>Telehealth care team</span>
          </button>
          <button class="help-tile" (click)="go('/telehealth/help')">
            <mat-icon style="color:#00897b">quiz</mat-icon>
            <strong>FAQs</strong>
            <span>Common questions</span>
          </button>
          <a class="help-tile" href="tel:998">
            <mat-icon style="color:#c62828">emergency</mat-icon>
            <strong>Emergency</strong>
            <span>Not for emergencies</span>
          </a>
        </div>

        <button class="reset-demo" (click)="reset()">
          <mat-icon>restart_alt</mat-icon> Reset demo data
        </button>
      </section>
    </div>
  `,
  styles: [TELE_STYLES, `
    /* Active care card */
    .active-card { background: white; border: 1px solid #eceff1; border-left: 4px solid #cfd8dc; border-radius: 16px; padding: 16px; }
    .edge-confirmed { border-left-color: #00897b; }
    .edge-ready { border-left-color: #2e7d32; }
    .edge-progress { border-left-color: #3949ab; }
    .edge-attention { border-left-color: #ef6c00; }
    .ac-top { display: flex; gap: 12px; align-items: center; }
    .ac-icon { width: 44px; height: 44px; border-radius: 13px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .ac-icon mat-icon { color: white; font-size: 22px; width: 22px; height: 22px; }
    .ac-info { flex: 1; min-width: 0; }
    .ac-title { font-size: 15px; color: #1b3a4b; font-weight: 700; display: block; line-height: 1.25; }
    .ac-sub { font-size: 12.5px; color: #607d8b; }
    .ac-status { flex-shrink: 0; align-self: flex-start; }
    .ac-meta-row { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f2f4f7; }
    .ac-meta-row span { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: #546e7a; }
    .ac-meta-row mat-icon { font-size: 15px; width: 15px; height: 15px; color: #90a4ae; }
    .ac-actions { display: flex; gap: 10px; margin-top: 16px; }
    .ac-actions .th-btn { padding: 0 14px; font-size: 13.5px; white-space: nowrap; }
    .ac-actions .th-btn-primary { flex: 2; }
    .ac-actions .th-btn-ghost { flex: 1; }

    /* Recommendation cards */
    .rec-card { display: flex; gap: 12px; padding: 14px; background: linear-gradient(135deg,#f3f8ff 0%, #ffffff 60%); border: 1px solid #d0e3ff; border-radius: 16px; align-items: flex-start; }
    .rec-icon { width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .rec-icon mat-icon { color: white; font-size: 22px; width: 22px; height: 22px; }
    .ri-lab_test { background: #6a1b9a; } .ri-home_service { background: #00897b; } .ri-followup { background: #1565c0; } .ri-report_ready { background: #2e7d32; }
    .rec-body { flex: 1; min-width: 0; }
    .rec-body strong { font-size: 14px; color: #1b3a4b; display: block; line-height: 1.35; }
    .rec-body span { font-size: 12.5px; color: #607d8b; }
    .rec-connected { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #1565c0; font-weight: 600; margin-top: 6px; }
    .rec-connected mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .rec-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
    .rec-cta { height: 38px !important; padding: 0 14px !important; font-size: 12.5px !important; }
    .rec-dismiss { background: none; border: none; color: #b0bec5; cursor: pointer; padding: 2px; }

    /* Recent rows */
    .recent-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: white; border: 1px solid #eceff1; border-radius: 14px; width: 100%; text-align: left; font: inherit; color: inherit; cursor: pointer; transition: all .15s; }
    .recent-row:hover { border-color: #c5cae9; box-shadow: 0 2px 10px rgba(0,0,0,.05); }
    .rr-icon { width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .rr-icon mat-icon { color: white; font-size: 20px; width: 20px; height: 20px; }
    .rr-body { flex: 1; min-width: 0; }
    .rr-body strong { display: block; font-size: 13.5px; color: #1b3a4b; }
    .rr-body span { font-size: 12px; color: #90a4ae; }

    /* Help */
    .help-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .help-tile { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px 8px; background: white; border: 1px solid #eceff1; border-radius: 14px; text-decoration: none; color: inherit; font: inherit; cursor: pointer; transition: all .15s; }
    .help-tile:hover { border-color: #c5cae9; box-shadow: 0 2px 10px rgba(0,0,0,.05); }
    .help-tile mat-icon { font-size: 26px; width: 26px; height: 26px; }
    .help-tile strong { font-size: 13px; color: #1b3a4b; }
    .help-tile span { font-size: 11px; color: #90a4ae; text-align: center; }
    .reset-demo { display: inline-flex; align-items: center; gap: 6px; margin: 18px auto 0; padding: 8px 14px; background: none; border: 1px dashed #cfd8dc; border-radius: 10px; color: #90a4ae; font: inherit; font-size: 12px; cursor: pointer; }
    .reset-demo mat-icon { font-size: 16px; width: 16px; height: 16px; }
  `]
})
export class TelehealthHomeComponent {
  readonly svc = inject(TelehealthService);
  private readonly router = inject(Router);
  readonly currency = TELE_CURRENCY;
  readonly statusChip = statusChip;

  go(url: string): void { this.router.navigateByUrl(url); }

  typeIcon(i: CareItem): string {
    return i.type === 'video_consult' ? 'videocam' : i.type === 'lab_collection' ? 'biotech' : this.svc.homeCare(i.homeCareKey!).icon;
  }
  typeColor(i: CareItem): string {
    return i.type === 'video_consult' ? '#1565c0' : i.type === 'lab_collection' ? '#6a1b9a' : this.svc.homeCare(i.homeCareKey!).color;
  }

  primaryAction(i: CareItem) { return primaryActionFor(i); }
  runPrimary(i: CareItem): void { this.router.navigateByUrl(primaryActionFor(i).route); }

  recIcon(r: CareRecommendation): string {
    return r.kind === 'lab_test' ? 'biotech' : r.kind === 'home_service' ? 'home_health' : r.kind === 'report_ready' ? 'description' : 'event_repeat';
  }

  runRecommendation(r: CareRecommendation): void {
    if (r.target === 'lab_tests') {
      this.router.navigate(['/telehealth/lab-tests'], { queryParams: { add: (r.payloadTestCodes ?? []).join(',') } });
    } else if (r.target === 'home_care') {
      this.router.navigate(['/telehealth/home-care'], { queryParams: { service: r.payloadServiceKey } });
    } else if (r.target === 'video_consult') {
      this.router.navigate(['/telehealth/consult'], { queryParams: { followup: '1' } });
    } else {
      this.router.navigateByUrl('/timeline');
    }
  }

  openCompleted(i: CareItem): void {
    if (i.type === 'video_consult') this.router.navigate(['/telehealth/consult/outcome', i.id]);
    else this.router.navigate(['/telehealth/track', i.id]);
  }

  reset(): void { this.svc.resetDemo(); }
}
