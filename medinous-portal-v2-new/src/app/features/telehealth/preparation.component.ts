import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ThHeaderComponent } from './th-header.component';
import { TelehealthService } from './telehealth.service';
import { TELE_STYLES } from './telehealth.styles';
import { CareItem } from './telehealth.model';

// =====================================================================
// SERVICE PREPARATION  (spec §11)
//
// Every scheduled service gets a preparation checklist the patient can
// tick off. For a video consult, also a device check + "join" once the
// window is open. Preparation state persists via the service.
// =====================================================================
@Component({
  selector: 'app-preparation',
  standalone: true,
  imports: [CommonModule, MatIconModule, ThHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (item(); as it) {
      <div class="th-page th-wrap">
        <th-header title="Get ready" [subtitle]="it.title" back="/telehealth/active-care" />

        <div class="prep-hero" [style.background]="heroBg(it)">
          <mat-icon>{{ heroIcon(it) }}</mat-icon>
          <div>
            <strong>{{ it.title }}</strong>
            <span>{{ it.timeLabel }}</span>
          </div>
        </div>

        <div class="prep-progress">
          <div class="pp-bar"><div class="pp-fill" [style.width.%]="progress()"></div></div>
          <span>{{ doneCount() }}/{{ total() }} ready</span>
        </div>

        <label class="th-label">Preparation checklist</label>
        <div class="th-stack">
          @for (p of it.preparation; track p.id) {
            <button class="prep-item" [class.done]="p.done" (click)="toggle(it.id, p.id)">
              <div class="pi-check"><mat-icon>{{ p.done ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon></div>
              <span>{{ p.text }}</span>
            </button>
          }
        </div>

        @if (it.type === 'video_consult') {
          <label class="th-label" style="margin-top:18px">Device check</label>
          <button class="prep-item device" [class.done]="deviceChecked()" (click)="checkDevice()">
            <div class="pi-check"><mat-icon>{{ deviceChecked() ? 'check_circle' : 'videocam' }}</mat-icon></div>
            <span>{{ deviceChecked() ? 'Camera and microphone look good' : 'Tap to check camera & microphone' }}</span>
          </button>

          <div class="th-banner banner-info" style="margin-top:16px">
            <mat-icon>schedule</mat-icon>
            <div class="b-body"><strong>Joining opens 5 minutes before</strong><span>You can join the call once your doctor is ready.</span></div>
          </div>
        }

        <!-- Sticky CTA -->
        <div class="th-sticky">
          <div class="th-sticky-inner">
            @if (it.type === 'video_consult') {
              <button class="th-btn th-btn-primary th-btn-block" (click)="join(it)"><mat-icon>videocam</mat-icon> Join consultation</button>
            } @else {
              <button class="th-btn th-btn-primary th-btn-block" (click)="go('/telehealth/track/' + it.id)"><mat-icon>timeline</mat-icon> Track service</button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [TELE_STYLES, `
    .prep-hero { display: flex; align-items: center; gap: 14px; padding: 18px; border-radius: 16px; margin-bottom: 18px; color: white; }
    .prep-hero mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .prep-hero strong { display: block; font-size: 16px; }
    .prep-hero span { font-size: 13px; opacity: .9; }
    .prep-progress { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
    .pp-bar { flex: 1; height: 8px; border-radius: 4px; background: #eceff1; overflow: hidden; }
    .pp-fill { height: 100%; background: linear-gradient(90deg, #1565c0, #42a5f5); border-radius: 4px; transition: width .3s; }
    .prep-progress span { font-size: 12px; font-weight: 700; color: #607d8b; flex-shrink: 0; }
    .prep-item { display: flex; align-items: center; gap: 12px; padding: 14px; background: white; border: 1.5px solid #eceff1; border-radius: 14px; width: 100%; text-align: left; font: inherit; cursor: pointer; transition: all .15s; }
    .prep-item.done { border-color: #b2dfdb; background: #effcfa; }
    .pi-check mat-icon { font-size: 24px; width: 24px; height: 24px; color: #b0bec5; }
    .prep-item.done .pi-check mat-icon { color: #00897b; }
    .prep-item span { font-size: 13.5px; color: #37474f; }
    .prep-item.done span { color: #00695c; }
    .device .pi-check mat-icon { color: #1565c0; }
  `]
})
export class PreparationComponent implements OnInit {
  private readonly svc = inject(TelehealthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly item = signal<CareItem | null>(null);
  readonly deviceChecked = signal(false);

  ngOnInit(): void { this.reload(); }
  private reload(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    const it = this.svc.getItem(id);
    if (!it) { this.router.navigateByUrl('/telehealth'); return; }
    this.item.set(it);
  }

  total(): number { return this.item()?.preparation?.length ?? 0; }
  doneCount(): number { return this.item()?.preparation?.filter(p => p.done).length ?? 0; }
  progress(): number { return this.total() ? Math.round((this.doneCount() / this.total()) * 100) : 0; }

  toggle(id: string, prepId: string): void { this.svc.togglePrep(id, prepId); this.reload(); }
  checkDevice(): void { this.deviceChecked.set(true); }

  heroIcon(it: CareItem): string {
    return it.type === 'video_consult' ? 'videocam' : it.type === 'lab_collection' ? 'biotech' : this.svc.homeCare(it.homeCareKey!).icon;
  }
  heroBg(it: CareItem): string {
    const c = it.type === 'video_consult' ? '#1565c0' : it.type === 'lab_collection' ? '#6a1b9a' : this.svc.homeCare(it.homeCareKey!).color;
    return `linear-gradient(135deg, ${c}, ${c}cc)`;
  }

  join(it: CareItem): void {
    this.svc.updateItem(it.id, { status: 'ready_to_join' });
    this.router.navigate(['/telehealth/consult/room', it.id]);
  }
  go(url: string): void { this.router.navigateByUrl(url); }
}
