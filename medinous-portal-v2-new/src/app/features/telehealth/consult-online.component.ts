import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ThHeaderComponent } from './th-header.component';
import { TELE_STYLES } from './telehealth.styles';

// =====================================================================
// CONSULT A DOCTOR ONLINE — options  (spec §6)
//
// Two modes:
//   A. Scheduled video consultation → deep-links to the existing
//      Book Appointment journey (video preselected). We do NOT rebuild
//      doctor discovery.
//   B. Speak to an available doctor → the differentiated instant flow.
// =====================================================================
@Component({
  selector: 'app-consult-online',
  standalone: true,
  imports: [CommonModule, MatIconModule, ThHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="th-page th-wrap">
      <th-header title="Consult a doctor online" subtitle="Choose how you'd like to see a doctor" [showCareFor]="true" />

      <div class="th-banner banner-info">
        <mat-icon>info</mat-icon>
        <div class="b-body">
          <strong>Not for emergencies</strong>
          <span>For chest pain, severe breathing difficulty or a medical emergency, call your local emergency services.</span>
        </div>
      </div>

      <!-- A. Instant (the differentiator) -->
      <section class="th-section">
        <article class="mode-card mode-primary">
          <div class="mc-badge">Fastest</div>
          <div class="mc-icon" style="background:linear-gradient(135deg,#1565c0,#42a5f5)"><mat-icon>bolt</mat-icon></div>
          <h3>Speak to an available doctor</h3>
          <p>Get connected to an available doctor for a common, non-emergency concern — usually within minutes.</p>
          <ul class="mc-points">
            <li><mat-icon>schedule</mat-icon> Typical connection: 2–5 minutes</li>
            <li><mat-icon>translate</mat-icon> Matched to your preferred language</li>
            <li><mat-icon>description</mat-icon> Prescription & summary saved to your record</li>
          </ul>
          <button class="th-btn th-btn-primary th-btn-block" (click)="go('/telehealth/consult/instant')">
            <mat-icon>bolt</mat-icon> Consult an available doctor
          </button>
        </article>
      </section>

      <!-- B. Scheduled -->
      <section class="th-section">
        <article class="mode-card">
          <div class="mc-icon" style="background:linear-gradient(135deg,#00897b,#26a69a)"><mat-icon>event</mat-icon></div>
          <h3>Book a scheduled video consultation</h3>
          <p>Choose a specific doctor and a time that suits you. Opens the hospital's booking journey with video preselected.</p>
          <button class="th-btn th-btn-primary th-btn-block" (click)="go('/telehealth/consult/video-consult')">
            <mat-icon>videocam</mat-icon> Book a video consultation
          </button>
          <button class="th-btn th-btn-ghost th-btn-block" (click)="bookScheduled()" style="margin-top:8px">
            <mat-icon>link</mat-icon> Or use the hospital's booking flow
          </button>
        </article>
      </section>
    </div>
  `,
  styles: [TELE_STYLES, `
    .mode-card { position: relative; background: white; border: 1px solid #eceff1; border-radius: 18px; padding: 20px; }
    .mode-primary { border-color: #d0e3ff; background: linear-gradient(135deg,#f3f8ff 0%, #ffffff 55%); }
    .mc-badge { position: absolute; top: 16px; right: 16px; background: #1565c0; color: white; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 10px; }
    .mc-icon { width: 52px; height: 52px; border-radius: 15px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
    .mc-icon mat-icon { color: white; font-size: 28px; width: 28px; height: 28px; }
    .mode-card h3 { margin: 0 0 6px; font-size: 17px; color: #1b3a4b; font-weight: 700; }
    .mode-card p { margin: 0 0 14px; font-size: 13.5px; color: #607d8b; line-height: 1.5; }
    .mc-points { list-style: none; padding: 0; margin: 0 0 16px; display: flex; flex-direction: column; gap: 8px; }
    .mc-points li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #455a64; }
    .mc-points mat-icon { font-size: 18px; width: 18px; height: 18px; color: #1565c0; }
    .mc-note { display: inline-flex; align-items: center; gap: 5px; margin-top: 10px; font-size: 12px; color: #90a4ae; }
    .mc-note mat-icon { font-size: 14px; width: 14px; height: 14px; }
  `]
})
export class ConsultOnlineComponent {
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  go(url: string): void { this.router.navigateByUrl(url); }

  /** Deep-link to the existing Book Appointment journey with video preselected. */
  bookScheduled(): void {
    this.snack.open('Opening the hospital booking journey — video consultation preselected', 'OK', { duration: 3500 });
    this.router.navigate(['/appointments'], { queryParams: { mode: 'video' } });
  }
}
