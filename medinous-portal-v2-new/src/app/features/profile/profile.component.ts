import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Patient } from '../../core/models/patient.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSnackBarModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="profile-container">
      <header class="page-header">
        <div>
          <h1>My Profile</h1>
          <p class="subtitle">Account, contact and registration details</p>
        </div>
      </header>

      @if (patient(); as p) {
        <article class="profile-card">

          <!-- Avatar column -->
          <div class="avatar-col">
            <div class="avatar">
              @if (p.avatarUrl) {
                <img [src]="p.avatarUrl" [alt]="p.firstName + ' ' + p.lastName">
              } @else {
                <mat-icon>person</mat-icon>
              }
            </div>
            <button mat-stroked-button class="upload-btn"
                    (click)="actionPlaceholder('Photo upload')">
              <mat-icon>photo_camera</mat-icon> Change
            </button>
          </div>

          <!-- Info columns -->
          <div class="info-cols">

            <!-- Left column: Account + Contact -->
            <div class="info-col">
              <!-- Account Info -->
              <section class="info-section">
                <h2 class="sec-title">Account Info</h2>
                <div class="kv-list">
                  <div class="kv-row">
                    <span class="kv-key">Patient ID</span>
                    <span class="kv-sep">:</span>
                    <span class="kv-val">{{ p.id }}</span>
                  </div>
                  <div class="kv-row">
                    <span class="kv-key">Patient Name</span>
                    <span class="kv-sep">:</span>
                    <span class="kv-val">{{ p.firstName }} {{ p.lastName }}</span>
                  </div>
                </div>
              </section>

              <!-- Contact Info -->
              <section class="info-section">
                <h2 class="sec-title">Contact Info</h2>
                <div class="kv-list">
                  <!-- Mobile (editable) -->
                  <div class="kv-row">
                    <span class="kv-key">Mobile No</span>
                    <span class="kv-sep">:</span>
                    @if (editingMobile()) {
                      <span class="kv-edit">
                        <input class="kv-input" type="tel"
                               [ngModel]="phoneDraft()" (ngModelChange)="phoneDraft.set($event)"
                               (keyup.enter)="savePhone()"
                               (keyup.escape)="cancelEditMobile()">
                        <button mat-icon-button class="kv-btn kv-save" (click)="savePhone()"
                                aria-label="Save mobile">
                          <mat-icon>check</mat-icon>
                        </button>
                        <button mat-icon-button class="kv-btn kv-cancel" (click)="cancelEditMobile()"
                                aria-label="Cancel">
                          <mat-icon>close</mat-icon>
                        </button>
                      </span>
                    } @else {
                      <span class="kv-val">{{ p.phone }}</span>
                      <button mat-icon-button class="kv-btn kv-edit-btn" (click)="startEditMobile()"
                              aria-label="Edit mobile">
                        <mat-icon>edit</mat-icon>
                      </button>
                    }
                  </div>

                  <!-- Email (editable) -->
                  <div class="kv-row">
                    <span class="kv-key">Email</span>
                    <span class="kv-sep">:</span>
                    @if (editingEmail()) {
                      <span class="kv-edit">
                        <input class="kv-input" type="email"
                               [ngModel]="emailDraft()" (ngModelChange)="emailDraft.set($event)"
                               (keyup.enter)="saveEmail()"
                               (keyup.escape)="cancelEditEmail()">
                        <button mat-icon-button class="kv-btn kv-save" (click)="saveEmail()"
                                aria-label="Save email">
                          <mat-icon>check</mat-icon>
                        </button>
                        <button mat-icon-button class="kv-btn kv-cancel" (click)="cancelEditEmail()"
                                aria-label="Cancel">
                          <mat-icon>close</mat-icon>
                        </button>
                      </span>
                    } @else {
                      <span class="kv-val">{{ p.email }}</span>
                      <button mat-icon-button class="kv-btn kv-edit-btn" (click)="startEditEmail()"
                              aria-label="Edit email">
                        <mat-icon>edit</mat-icon>
                      </button>
                    }
                  </div>
                </div>
              </section>
            </div>

            <!-- Right column: Basic Info -->
            <div class="info-col">
              <section class="info-section">
                <h2 class="sec-title">Basic Info</h2>
                <div class="kv-list">
                  <div class="kv-row">
                    <span class="kv-key">Gender</span>
                    <span class="kv-sep">:</span>
                    <span class="kv-val">{{ p.gender }}</span>
                  </div>
                  <div class="kv-row">
                    <span class="kv-key">Date of Birth &amp; Age</span>
                    <span class="kv-sep">:</span>
                    <span class="kv-val">
                      {{ p.dateOfBirth | date:'dd-MMM-yyyy' }}, {{ age() }}Yrs
                    </span>
                  </div>
                  <div class="kv-row">
                    <span class="kv-key">Registration Date &amp; Time</span>
                    <span class="kv-sep">:</span>
                    <span class="kv-val">
                      @if (p.registrationDate) {
                        {{ p.registrationDate | date:'dd/MM/yyyy HH:mm' }}
                      } @else {
                        —
                      }
                    </span>
                  </div>
                  <div class="kv-row">
                    <span class="kv-key">Sponsor Name</span>
                    <span class="kv-sep">:</span>
                    <span class="kv-val">{{ p.sponsorName || '—' }}</span>
                  </div>
                </div>
              </section>
            </div>

          </div>
        </article>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .profile-container { max-width: 1100px; margin: 0 auto; padding-bottom: 40px; }

    /* Header */
    .page-header { margin-bottom: 18px; }
    h1 { font-size: 24px; font-weight: 600; color: #1a237e; margin: 0; letter-spacing: -0.01em; }
    .subtitle { color: #607d8b; margin: 4px 0 0; font-size: 13px; }

    /* Profile card */
    .profile-card {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 28px;
      padding: 28px 28px;
      background: white;
      border: 1px solid #eceff1;
      border-radius: 14px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }

    /* Avatar column */
    .avatar-col {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
    }
    .avatar {
      width: 140px; height: 140px;
      border-radius: 12px;
      background: #eceff1;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .avatar mat-icon {
      font-size: 88px; width: 88px; height: 88px; color: #b0bec5;
    }
    .upload-btn {
      font-size: 12px !important; height: 32px !important;
      padding: 0 12px !important; border-radius: 8px !important;
      color: #00897b !important; border-color: #b2dfdb !important;
    }
    .upload-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Info columns */
    .info-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 36px;
    }
    .info-col { display: flex; flex-direction: column; gap: 26px; }

    .info-section { display: flex; flex-direction: column; gap: 10px; }
    .sec-title {
      margin: 0 0 8px;
      font-size: 16px; font-weight: 500;
      color: #009688;
      padding-bottom: 8px;
      border-bottom: 1px dashed #cfd8dc;
    }

    .kv-list { display: flex; flex-direction: column; gap: 4px; }
    .kv-row {
      display: grid;
      grid-template-columns: 180px 12px 1fr auto;
      align-items: center;
      gap: 0 8px;
      padding: 6px 0;
      font-size: 14px;
    }
    .kv-key { color: #455a64; font-weight: 400; }
    .kv-sep { color: #455a64; font-weight: 400; text-align: left; }
    .kv-val { color: #1b3a4b; font-weight: 400; }

    .kv-btn {
      width: 30px !important; height: 30px !important; line-height: 30px !important;
      color: #607d8b !important;
    }
    .kv-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .kv-edit-btn:hover { color: #00897b !important; }

    /* Inline edit state */
    .kv-edit {
      grid-column: 3 / span 2;
      display: flex; align-items: center; gap: 6px;
    }
    .kv-input {
      flex: 1; min-width: 0;
      padding: 7px 10px;
      border: 1px solid #cfd8dc; border-radius: 8px;
      font: inherit; font-size: 14px; color: #1b3a4b;
      background: white;
      outline: none;
      transition: border-color 0.15s;
    }
    .kv-input:focus { border-color: #00897b; box-shadow: 0 0 0 3px rgba(0,137,123,0.12); }
    .kv-save { color: #2e7d32 !important; }
    .kv-cancel { color: #c62828 !important; }

    /* ===== Responsive ===== */
    @media (max-width: 900px) {
      .profile-card { grid-template-columns: 1fr; gap: 20px; padding: 22px; }
      .avatar-col { flex-direction: row; gap: 16px; }
      .avatar { width: 88px; height: 88px; }
      .avatar mat-icon { font-size: 56px; width: 56px; height: 56px; }
      .info-cols { grid-template-columns: 1fr; gap: 24px; }
      .kv-row { grid-template-columns: 140px 12px 1fr auto; font-size: 13px; }
    }
    @media (max-width: 520px) {
      h1 { font-size: 20px; }
      .profile-card { padding: 18px; gap: 16px; border-radius: 12px; }
      .avatar-col { flex-direction: column; align-items: center; }
      .kv-row {
        grid-template-columns: 1fr auto;
        grid-template-areas: 'key edit' 'val val';
        gap: 2px 8px;
      }
      .kv-key { grid-area: key; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #607d8b; font-weight: 600; }
      .kv-sep { display: none; }
      .kv-val { grid-area: val; font-size: 14px; }
      .kv-edit-btn { grid-area: edit; }
      .kv-edit { grid-area: val; grid-column: 1 / -1; }
    }
  `]
})
export class ProfileComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly patient = signal<Patient | null>(null);

  readonly editingMobile = signal(false);
  readonly editingEmail = signal(false);
  readonly phoneDraft = signal('');
  readonly emailDraft = signal('');

  ngOnInit(): void {
    this.api.getDashboard().subscribe(s => this.patient.set(s.patient));
  }

  readonly age = computed<number>(() => {
    const p = this.patient();
    if (!p?.dateOfBirth) return 0;
    const dob = new Date(p.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  });

  startEditMobile(): void {
    this.phoneDraft.set(this.patient()?.phone ?? '');
    this.editingMobile.set(true);
  }

  cancelEditMobile(): void {
    this.editingMobile.set(false);
    this.phoneDraft.set('');
  }

  savePhone(): void {
    const next = this.phoneDraft().trim();
    if (!next) { this.cancelEditMobile(); return; }
    this.patient.update(p => p ? { ...p, phone: next } : p);
    this.editingMobile.set(false);
    this.snackBar.open('Mobile number updated', 'Close', { duration: 3000 });
  }

  startEditEmail(): void {
    this.emailDraft.set(this.patient()?.email ?? '');
    this.editingEmail.set(true);
  }

  cancelEditEmail(): void {
    this.editingEmail.set(false);
    this.emailDraft.set('');
  }

  saveEmail(): void {
    const next = this.emailDraft().trim();
    if (!next) { this.cancelEditEmail(); return; }
    if (!next.includes('@')) {
      this.snackBar.open('Please enter a valid email address', 'Close', { duration: 3000 });
      return;
    }
    this.patient.update(p => p ? { ...p, email: next } : p);
    this.editingEmail.set(false);
    this.snackBar.open('Email updated', 'Close', { duration: 3000 });
  }

  actionPlaceholder(label: string): void {
    this.snackBar.open(`${label} — coming soon in this build`, 'Close', { duration: 3000 });
  }
}
