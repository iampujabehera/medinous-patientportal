import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ThHeaderComponent } from './th-header.component';
import { TelehealthService } from './telehealth.service';
import { TELE_STYLES } from './telehealth.styles';
import { CareItem, TrackStep } from './telehealth.model';
import { statusChip } from './care-status.util';

// =====================================================================
// SERVICE TRACKING  (spec §12)
//
// A patient-friendly timeline (not an operations map) for home services
// and lab collections. Each stage explains what the patient must do.
// When a provider is on the way, shows a verified provider card with an
// arrival window + support contact (never a personal phone number).
//
// The "Advance status" button simulates the hospital ops pushing the
// service forward so the whole lifecycle is demoable without a backend.
// =====================================================================
@Component({
  selector: 'app-service-tracking',
  standalone: true,
  imports: [CommonModule, MatIconModule, ThHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (item(); as it) {
      <div class="th-page th-wrap">
        <th-header [title]="trackTitle(it)" [subtitle]="it.subtitle || ''" back="/telehealth/active-care" />

        <!-- Status header -->
        <div class="track-head">
          <span class="th-chip" [class]="statusChip(it).cls"><mat-icon>{{ statusChip(it).icon }}</mat-icon>{{ statusChip(it).label }}</span>
          <span class="track-ref">Ref {{ it.bookingRef }}</span>
        </div>

        <!-- Provider card when assigned -->
        @if (it.provider && showProvider(it)) {
          <div class="th-card prov-card">
            <div class="th-provider">
              <div class="th-prov-avatar">{{ it.provider.initials }}</div>
              <div class="th-prov-body">
                <strong>{{ it.provider.name }}</strong>
                <div class="pr-role">{{ it.provider.role }}@if (it.provider.experienceYears) { · {{ it.provider.experienceYears }} yrs }</div>
                <span class="th-verified"><mat-icon>verified</mat-icon> Verified hospital staff</span>
              </div>
              <button class="prov-call" (click)="go('/telehealth/help')" aria-label="Contact support"><mat-icon>headset_mic</mat-icon></button>
            </div>
            @if (it.status === 'provider_on_the_way') {
              <div class="otw">
                <div class="otw-map"><mat-icon>navigation</mat-icon> Live location (demo)</div>
                <div class="otw-eta"><mat-icon>schedule</mat-icon> Arriving within your {{ it.timeLabel }} window</div>
              </div>
            }
          </div>
        }

        <!-- Provider-late exception (demo) -->
        @if (providerLate()) {
          <div class="th-banner banner-amber">
            <mat-icon>schedule</mat-icon>
            <div class="b-body"><strong>Your provider is running a little late</strong><span>Updated arrival: within 20 minutes. You can contact support or reschedule.</span></div>
          </div>
          <div class="th-grid-2" style="margin-bottom:16px">
            <button class="th-btn th-btn-ghost" (click)="providerLate.set(false)"><mat-icon>schedule</mat-icon> Updated time</button>
            <button class="th-btn th-btn-ghost" (click)="go('/telehealth/help')"><mat-icon>support_agent</mat-icon> Contact support</button>
          </div>
        }

        <!-- Timeline -->
        <div class="timeline">
          @for (s of steps(); track s.key; let last = $last) {
            <div class="tl-step" [class]="'tl-' + s.state">
              <div class="tl-marker">
                <div class="tl-dot"><mat-icon>{{ s.state === 'done' ? 'check' : s.state === 'current' ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon></div>
                @if (!last) { <div class="tl-line"></div> }
              </div>
              <div class="tl-body">
                <strong>{{ s.label }}</strong>
                @if (s.state !== 'upcoming' && s.patientNote) { <p class="tl-note">{{ s.patientNote }}</p> }
              </div>
            </div>
          }
        </div>

        <!-- Report ready → deep-link to Records -->
        @if (it.status === 'completed' && it.type === 'lab_collection') {
          <div class="th-banner banner-teal" style="margin-top:8px">
            <mat-icon>description</mat-icon>
            <div class="b-body"><strong>Your report is ready</strong><span>Open it in My Records — it's saved to your hospital file.</span></div>
          </div>
          <button class="th-btn th-btn-primary th-btn-block" (click)="go('/timeline')"><mat-icon>folder_shared</mat-icon> Open report in My Records</button>
        }
        @if (it.status === 'completed' && it.type === 'home_care') {
          <div class="th-banner banner-teal" style="margin-top:8px">
            <mat-icon>task_alt</mat-icon>
            <div class="b-body"><strong>Service completed</strong><span>Visit documentation is available in My Records.</span></div>
          </div>
          <button class="th-btn th-btn-primary th-btn-block" (click)="go('/timeline')"><mat-icon>folder_shared</mat-icon> View in My Records</button>
        }

        <!-- Demo controls -->
        @if (it.status !== 'completed' && it.status !== 'cancelled') {
          <div class="demo-controls">
            <button class="th-btn th-btn-ghost th-btn-block" (click)="advance()"><mat-icon>skip_next</mat-icon> Advance to next stage (demo)</button>
            @if (!providerLate() && it.status === 'provider_on_the_way') {
              <button class="delay-link" (click)="providerLate.set(true)">Preview: provider running late</button>
            }
          </div>
        }

        <button class="th-btn th-btn-ghost th-btn-block" style="margin-top:10px" (click)="go('/telehealth/help')"><mat-icon>support_agent</mat-icon> Need help?</button>
      </div>
    }
  `,
  styles: [TELE_STYLES, `
    .track-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .track-ref { font-size: 12px; color: #90a4ae; font-weight: 600; }
    .prov-card { padding: 16px; margin-bottom: 16px; }
    .prov-call { width: 40px; height: 40px; border-radius: 12px; background: #eef0fb; border: none; color: #1a237e; cursor: pointer; flex-shrink: 0; }
    .otw { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
    .otw-map { display: flex; align-items: center; justify-content: center; gap: 8px; height: 88px; border-radius: 12px; background: #eef1f6; color: #90a4ae; font-size: 13px; font-weight: 600; }
    .otw-eta { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #455a64; }
    .otw-eta mat-icon, .otw-map mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .timeline { padding: 4px 0 8px; }
    .tl-step { display: flex; gap: 14px; }
    .tl-marker { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
    .tl-dot { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #eceff1; }
    .tl-dot mat-icon { font-size: 20px; width: 20px; height: 20px; color: #b0bec5; }
    .tl-line { width: 2px; flex: 1; min-height: 24px; background: #eceff1; }
    .tl-done .tl-dot { background: #00897b; } .tl-done .tl-dot mat-icon { color: white; }
    .tl-done .tl-line { background: #00897b; }
    .tl-current .tl-dot { background: #1565c0; box-shadow: 0 0 0 4px #e3f0ff; } .tl-current .tl-dot mat-icon { color: white; }
    .tl-body { padding-bottom: 18px; }
    .tl-body strong { font-size: 14px; color: #b0bec5; }
    .tl-done .tl-body strong { color: #1b3a4b; }
    .tl-current .tl-body strong { color: #1565c0; }
    .tl-note { margin: 4px 0 0; font-size: 12.5px; color: #607d8b; line-height: 1.5; }

    .demo-controls { margin-top: 14px; }
    .delay-link { display: block; margin: 10px auto 0; background: none; border: none; color: #90a4ae; font: inherit; font-size: 12px; text-decoration: underline; cursor: pointer; }
  `]
})
export class ServiceTrackingComponent implements OnInit {
  private readonly svc = inject(TelehealthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly statusChip = statusChip;

  readonly item = signal<CareItem | null>(null);
  readonly providerLate = signal(false);

  ngOnInit(): void { this.reload(); }

  private reload(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    const it = this.svc.getItem(id);
    if (!it) { this.router.navigateByUrl('/telehealth'); return; }
    this.item.set(it);
  }

  steps(): TrackStep[] { return this.item() ? this.svc.buildTimeline(this.item()!) : []; }
  showProvider(it: CareItem): boolean {
    return ['provider_assigned', 'provider_on_the_way', 'provider_arrived', 'in_progress', 'completed'].includes(it.status);
  }
  trackTitle(it: CareItem): string { return it.type === 'lab_collection' ? 'Track collection' : 'Track service'; }

  advance(): void {
    const it = this.item();
    if (!it) return;
    this.svc.advanceStatus(it.id);
    this.reload();
  }
  go(url: string): void { this.router.navigateByUrl(url); }
}
