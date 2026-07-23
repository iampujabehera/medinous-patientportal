import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ThHeaderComponent } from './th-header.component';
import { TelehealthService } from './telehealth.service';
import { TELE_STYLES } from './telehealth.styles';
import { CareItem, CareBucket } from './telehealth.model';
import { statusChip, primaryActionFor } from './care-status.util';

// =====================================================================
// ACTIVE CARE  (spec §10)
//
// Only telehealth + hospital-at-home activities — never the general
// portal appointments list. Tabbed by lifecycle bucket.
// =====================================================================
@Component({
  selector: 'app-active-care',
  standalone: true,
  imports: [CommonModule, MatIconModule, ThHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="th-page th-wrap">
      <th-header title="Active care" subtitle="Your remote and at-home hospital services" [showCareFor]="true" />

      <!-- Tabs -->
      <div class="th-tabs">
        @for (t of tabs; track t.key) {
          <button class="th-tab" [class.on]="tab() === t.key" (click)="tab.set(t.key)">
            {{ t.label }}
            @if (count(t.key) > 0) { <span class="tab-count">{{ count(t.key) }}</span> }
          </button>
        }
      </div>

      @if (list().length === 0) {
        <div class="th-empty">
          <mat-icon>event_available</mat-icon>
          <p>No {{ tabLabel() }} care right now.</p>
          <button class="th-btn th-btn-primary" style="margin-top:16px" (click)="go('/telehealth')">
            <mat-icon>add</mat-icon> Book new care
          </button>
        </div>
      } @else {
        <div class="th-stack">
          @for (item of list(); track item.id) {
            <article class="care-row">
              <div class="cr-head">
                <div class="cr-icon" [style.background]="typeColor(item)"><mat-icon>{{ typeIcon(item) }}</mat-icon></div>
                <div class="cr-info">
                  <strong>{{ item.title }}</strong>
                  <span class="cr-sub">{{ item.subtitle }}</span>
                  <div class="cr-meta">
                    <span><mat-icon>person</mat-icon>{{ item.patientName }}</span>
                    <span><mat-icon>schedule</mat-icon>{{ item.timeLabel }}</span>
                  </div>
                  @if (item.provider) {
                    <div class="cr-meta">
                      <span><mat-icon>badge</mat-icon>{{ item.provider.name }} · {{ item.provider.specialty || item.provider.role }}</span>
                    </div>
                  }
                </div>
                <span class="th-chip" [class]="statusChip(item).cls">
                  <mat-icon>{{ statusChip(item).icon }}</mat-icon>{{ statusChip(item).label }}
                </span>
              </div>

              <div class="cr-actions">
                <button class="th-btn th-btn-primary cr-cta" (click)="runPrimary(item)">
                  <mat-icon>{{ primaryAction(item).icon }}</mat-icon>{{ primaryAction(item).label }}
                </button>
                @if (item.bucket === 'upcoming') {
                  <button class="th-btn th-btn-danger cr-cta" (click)="cancel(item)">Cancel</button>
                }
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [TELE_STYLES, `
    .th-tabs { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 18px; scrollbar-width: none; }
    .th-tabs::-webkit-scrollbar { display: none; }
    .th-tab { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 20px; border: 1.5px solid #e0e4ea; background: white; color: #607d8b; font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; cursor: pointer; transition: all .15s; }
    .th-tab.on { background: #1a237e; border-color: #1a237e; color: white; }
    .tab-count { background: rgba(0,0,0,.08); border-radius: 8px; padding: 0 6px; font-size: 11px; }
    .th-tab.on .tab-count { background: rgba(255,255,255,.25); }

    .care-row { background: white; border: 1px solid #eceff1; border-radius: 16px; padding: 14px; }
    .cr-head { display: flex; gap: 12px; align-items: flex-start; }
    .cr-icon { width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .cr-icon mat-icon { color: white; font-size: 22px; width: 22px; height: 22px; }
    .cr-info { flex: 1; min-width: 0; }
    .cr-info strong { font-size: 14.5px; color: #1b3a4b; display: block; }
    .cr-sub { font-size: 12px; color: #90a4ae; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
    .cr-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 6px; }
    .cr-meta span { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #546e7a; }
    .cr-meta mat-icon { font-size: 14px; width: 14px; height: 14px; color: #90a4ae; }
    .cr-actions { display: flex; gap: 10px; margin-top: 14px; }
    .cr-cta { flex: 1; height: 42px !important; font-size: 13px !important; }
  `]
})
export class ActiveCareComponent {
  readonly svc = inject(TelehealthService);
  private readonly router = inject(Router);
  readonly statusChip = statusChip;

  readonly tabs: { key: CareBucket; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'in_progress', label: 'In progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' }
  ];
  readonly tab = signal<CareBucket>('upcoming');

  list(): CareItem[] { return this.svc.itemsByBucket(this.tab()); }
  count(b: CareBucket): number { return this.svc.itemsByBucket(b).length; }
  tabLabel(): string { return this.tabs.find(t => t.key === this.tab())!.label.toLowerCase(); }

  typeIcon(i: CareItem): string {
    return i.type === 'video_consult' ? 'videocam' : i.type === 'lab_collection' ? 'biotech' : this.svc.homeCare(i.homeCareKey!).icon;
  }
  typeColor(i: CareItem): string {
    return i.type === 'video_consult' ? '#1565c0' : i.type === 'lab_collection' ? '#6a1b9a' : this.svc.homeCare(i.homeCareKey!).color;
  }

  primaryAction(i: CareItem) { return primaryActionFor(i); }
  runPrimary(i: CareItem): void { this.router.navigateByUrl(primaryActionFor(i).route); }
  cancel(i: CareItem): void { this.svc.cancelItem(i.id); this.tab.set('cancelled'); }
  go(url: string): void { this.router.navigateByUrl(url); }
}
