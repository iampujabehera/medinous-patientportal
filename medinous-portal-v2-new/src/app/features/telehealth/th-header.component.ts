import { Component, ChangeDetectionStrategy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FamilyService } from '../../core/services/family.service';

// =====================================================================
// TELEHEALTH HEADER
//
// Reused on every Telehealth screen: back button, title + subtitle, help
// icon, and the "Care for: <member>" family selector (reuses the portal's
// existing family picker). Keeps the module's chrome consistent.
// =====================================================================
@Component({
  selector: 'th-header',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="th-head">
      <button class="th-back" (click)="goBack()" aria-label="Back">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <div class="th-head-titles">
        <h1>{{ title }}</h1>
        @if (subtitle) { <p>{{ subtitle }}</p> }
      </div>
      <button class="th-help" (click)="openHelp()" aria-label="Help">
        <mat-icon>help_outline</mat-icon>
      </button>
    </div>

    @if (showCareFor) {
      <button class="th-care-for" (click)="switchPatient()">
        <span class="cf-avatar">{{ initials() }}</span>
        Care for: {{ patientName() }}
        <mat-icon>expand_more</mat-icon>
      </button>
    }
  `,
  styles: [`
    .th-head { display: flex; align-items: center; gap: 10px; padding: 4px 0 14px; }
    .th-back, .th-help {
      width: 40px; height: 40px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      background: white; border: 1px solid #eceff1; color: #1a237e;
      cursor: pointer; flex-shrink: 0; transition: all .15s;
    }
    .th-back:hover, .th-help:hover { border-color: #c5cae9; background: #f6f8fc; }
    .th-head-titles { flex: 1; min-width: 0; }
    .th-head-titles h1 { font-size: 20px; font-weight: 700; color: #1a237e; margin: 0; letter-spacing: -.01em; }
    .th-head-titles p { font-size: 13px; color: #607d8b; margin: 2px 0 0; }
    .th-care-for {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: 12px;
      background: #eef0fb; border: 1px solid #d7dcf5;
      color: #1a237e; font: inherit; font-size: 13px; font-weight: 600;
      cursor: pointer; margin-bottom: 18px; transition: all .15s;
    }
    .th-care-for:hover { background: #e3e7f8; }
    .th-care-for mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .th-care-for .cf-avatar {
      width: 24px; height: 24px; border-radius: 50%;
      background: linear-gradient(135deg, #1a237e, #3949ab);
      color: white; font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    @media (max-width: 600px) { .th-head-titles h1 { font-size: 18px; } }
  `]
})
export class ThHeaderComponent {
  private readonly router = inject(Router);
  private readonly family = inject(FamilyService);

  @Input() title = 'Telehealth';
  @Input() subtitle = '';
  /** Where the back button navigates (defaults to Telehealth home). */
  @Input() back = '/telehealth';
  @Input() showCareFor = false;

  patientName(): string {
    return this.family.activeMember()?.fullName ?? 'Aisha Rahman';
  }
  initials(): string {
    const n = this.patientName().split(' ');
    return ((n[0]?.[0] ?? '') + (n[1]?.[0] ?? '')).toUpperCase();
  }

  goBack(): void { this.router.navigateByUrl(this.back); }
  openHelp(): void { this.router.navigateByUrl('/telehealth/help'); }
  switchPatient(): void { this.family.openPicker(true); }
}
