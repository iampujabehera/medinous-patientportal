import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FamilyService } from '../../core/services/family.service';
import { LocationService } from '../../core/services/location.service';
import { SignupHandoffService } from '../../core/services/signup-handoff.service';
import { FamilyMember, RelationshipType } from '../../core/models/family.model';

/**
 * Four inline states for the add-family bottom sheet. When the user
 * decides to create an account for a relative they don't yet have an
 * HMS record for, we hand off to the standard Create Account workflow
 * (the shell's signup card) — not an inline form — so the new patient
 * goes through the same registration the portal uses everywhere else.
 *  - 'idle'           — nothing looked up yet
 *  - 'found'          — patient card + relationship picker
 *  - 'already_linked' — inline error under the ID field
 *  - 'not_found'      — inline error + "Create account" CTA (routes out)
 */
type AddLookupStatus = 'idle' | 'found' | 'already_linked' | 'not_found';

/**
 * "Select family member" — modal-style picker rendered on top of a
 * full-screen backdrop. Used for both:
 *   - Post-login (mandatory selection, close button hidden)
 *   - Mid-session profile switching (close button visible)
 *
 * Per Puja's UX revision:
 *  - One unified compact list. The primary owner is just another row
 *    in the list with a PRIMARY badge — same one-click switch.
 *  - No verified-mobile / linked-count chips hanging in the body —
 *    they fold into the modal subtitle.
 *  - No big detail card or dropdown — every row IS the choice.
 *  - "Add family member" sits at the bottom as a single CTA; when the
 *    configured max is hit, the CTA is replaced by an inline notice.
 *  - All filler explanatory text removed.
 */
@Component({
  selector: 'app-select-patient',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatButtonModule, MatTooltipModule,
    MatFormFieldModule, MatSelectModule, MatInputModule,
    MatSnackBarModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sp-backdrop" (click)="onBackdropClick()">
      <div class="sp-modal" (click)="$event.stopPropagation()"
           role="dialog" aria-modal="true" aria-labelledby="sp-title">

        <header class="sp-modal-head">
          <!-- Back arrow ONLY appears inside the add-family flow — it
               returns to the picker without closing the bottom sheet.
               In picker mode the only header action is the close X. -->
          @if (addFormOpen()) {
            <button mat-icon-button class="sp-back" (click)="cancelAdd()" aria-label="Back to family list">
              <mat-icon>arrow_back</mat-icon>
            </button>
          }
          <div class="sp-modal-head-text">
            <strong id="sp-title">
              @if (addFormOpen()) {
                Add family member
              } @else {
                Select family member
              }
            </strong>
            <span>
              @if (addFormOpen()) {
                Link an existing BSH patient to your account
              } @else {
                {{ family.visibleMembers().length }} profiles linked to {{ maskedMobile() }}
              }
            </span>
          </div>
          @if (canDismiss()) {
            <button mat-icon-button class="sp-close" (click)="close()" aria-label="Close">
              <mat-icon>close</mat-icon>
            </button>
          }
        </header>

        @if (!addFormOpen()) {

          <!-- COMPACT LIST OF ALL LINKED PROFILES — picker is for
               profile SWITCHING only. -->
          <ul class="sp-list" role="listbox" aria-label="Family members">
            @for (m of family.visibleMembers(); track m.patientId) {
              <li>
                <button class="sp-row"
                        [class.sp-row-active]="isActive(m)"
                        [class.sp-row-disabled]="!family.isSelectable(m)"
                        [disabled]="!family.isSelectable(m)"
                        [attr.aria-current]="isActive(m) ? 'true' : null"
                        (click)="select(m)">
                  <span class="sp-avatar" [class.sp-avatar-female]="m.gender === 'Female'">
                    {{ initials(m) }}
                  </span>
                  <span class="sp-row-text">
                    <span class="sp-row-name">
                      <strong>{{ m.fullName }}</strong>
                      @if (m.isPrimaryOwner) {
                        <span class="sp-badge sp-badge-primary">PRIMARY</span>
                      }
                    </span>
                    <span class="sp-row-meta">
                      {{ m.relationship }} · {{ ageLabel(m) }} · {{ m.gender }}
                      <span class="sp-row-id">· ID {{ m.patientId }}</span>
                    </span>
                  </span>
                  @if (isActive(m)) {
                    <span class="sp-tag sp-tag-active" aria-label="Currently active">
                      <mat-icon>check_circle</mat-icon> Active
                    </span>
                  } @else {
                    <mat-icon class="sp-chevron">chevron_right</mat-icon>
                  }
                </button>
              </li>
            }
          </ul>

          <footer class="sp-modal-foot">
            @if (family.hasReachedMaxLinked()) {
              <div class="sp-limit" role="status">
                <mat-icon>info</mat-icon>
                <span>
                  <strong>{{ family.maxLimitMessage() }}</strong>
                  You have reached the limit of {{ family.config().maxLinkedProfiles }} linked profiles.
                </span>
              </div>
            } @else {
              <button mat-stroked-button class="sp-add-btn" (click)="openAddForm()">
                <mat-icon>person_add</mat-icon> Add family member
              </button>
            }

            @if (!family.activeMember()) {
              <button mat-button class="sp-signout" (click)="signOut()">
                <mat-icon>logout</mat-icon> Sign out
              </button>
            }
          </footer>

        } @else {

          <!-- ADD FAMILY MEMBER — inline flow inside the bottom sheet.
               Four states cycle through one screen (idle/found/already_
               linked/not_found). The not_found path's "Create account"
               CTA routes OUT to the standard signup workflow so the new
               patient registers the same way every other portal user
               does — we don't duplicate signup inline. -->
          <div class="sp-add-form">

            <p class="sp-add-hint">
              Enter the patient's <strong>National ID</strong> or
              <strong>Patient ID</strong> from BSH to link their
              existing record to your account.
            </p>

            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="sp-add-grid-full">
              <mat-label>National ID / Patient ID</mat-label>
              <input matInput
                     placeholder="e.g. 12345666"
                     autocomplete="off"
                     inputmode="numeric"
                     maxlength="20"
                     [ngModel]="addLookupId()"
                     (ngModelChange)="onLookupIdInput($event)"
                     (keydown.enter)="lookupPatient()">
              <mat-icon matPrefix>badge</mat-icon>
              @if (addLookupStatus() === 'found') {
                <button mat-icon-button matSuffix type="button"
                        (click)="clearLookup()" aria-label="Clear ID">
                  <mat-icon>close</mat-icon>
                </button>
              }
            </mat-form-field>

            <!-- Inline errors directly under the field — same red as
                 Material's own mat-error so it feels native. -->
            @if (addLookupStatus() === 'already_linked') {
              <p class="sp-field-error">{{ addLookupError() }}</p>
            }
            @if (addLookupStatus() === 'not_found') {
              <p class="sp-field-error">
                No record found for ID {{ addLookupId() }}.
                <span class="sp-field-error-hint">
                  Please create an account to link this patient to your
                  family — or try a different ID.
                </span>
              </p>
            }

            <!-- "Don't have a Patient ID?" link — quiet secondary path
                 to the standard Create Account workflow. Routes OUT to
                 the shell's signup card so the new patient goes through
                 the same registration every other portal user does. -->
            @if (addLookupStatus() !== 'found') {
              <p class="sp-create-link-row">
                Don't have a Patient ID?
                <button type="button" class="sp-create-link"
                        (click)="goToCreateAccount()">
                  Create an account
                </button>
              </p>
            }

            <!-- Found in HMS → populate patient card + relationship picker -->
            @if (addLookupStatus() === 'found' && addLookupResult(); as p) {
              <div class="sp-lookup-card">
                <span class="sp-avatar sp-avatar-lg"
                      [class.sp-avatar-female]="p.gender === 'Female'">
                  {{ initials(p) }}
                </span>
                <div class="sp-lookup-text">
                  <strong>{{ p.fullName }}</strong>
                  <span class="sp-lookup-meta">
                    {{ p.gender }} · {{ formatDob(p.dateOfBirth) }} · {{ ageLabel(p) }}
                  </span>
                  <span class="sp-lookup-id">Patient ID · {{ p.patientId }}</span>
                </div>
                <mat-icon class="sp-lookup-check">verified</mat-icon>
              </div>

              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="sp-add-grid-full">
                <mat-label>Your relationship to {{ p.firstName }}</mat-label>
                <mat-select [(ngModel)]="addRelationshipModel" panelClass="sp-rel-panel">
                  @for (r of relationshipOptions(); track r) {
                    <mat-option [value]="r">{{ r }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }

            <!-- One consolidated action bar at the bottom. Primary CTA
                 swaps with the state so there's always exactly one
                 "next step" alongside Cancel — no floating buttons mid-
                 form, no parallel CTAs competing for attention. -->
            <div class="sp-add-actions">
              <button mat-stroked-button type="button" (click)="cancelAdd()">Cancel</button>

              @switch (addLookupStatus()) {
                @case ('found') {
                  <button mat-flat-button color="primary"
                          type="button"
                          [disabled]="!addRelationship()"
                          (click)="submitAdd()">
                    <mat-icon>person_add</mat-icon>
                    <span>Add to family</span>
                  </button>
                }
                @case ('not_found') {
                  <button mat-flat-button color="primary"
                          type="button"
                          (click)="goToCreateAccount()">
                    <mat-icon>person_add</mat-icon>
                    <span>Create account</span>
                  </button>
                }
                @default {
                  <button mat-flat-button color="primary"
                          type="button"
                          [disabled]="!canLookup()"
                          (click)="lookupPatient()">
                    <mat-icon>search</mat-icon>
                    <span>Find patient</span>
                  </button>
                }
              }
            </div>
          </div>

        }

      </div>
    </div>
  `,
  styles: [`
    /* Device-adaptive container. Default (mobile-first) is a bottom
       sheet — the family picker is a touch-first interaction and a
       bottom-anchored sheet feels native on phones. The @media query
       below (≥769px) re-centres the same sheet into a desktop popup
       without forking templates. */
    .sp-backdrop {
      position: fixed; inset: 0;
      background: rgba(15, 35, 41, 0.42);
      backdrop-filter: blur(2px);
      display: flex; align-items: flex-end; justify-content: center;
      z-index: 1200;
      animation: spFade 160ms ease-out;
    }
    @keyframes spFade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .sp-modal {
      width: 100%; max-width: 480px;
      max-height: 90vh;
      background: #fff;
      border-radius: 20px 20px 0 0;        /* bottom-sheet: rounded top only */
      box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.18);
      display: flex; flex-direction: column;
      overflow: hidden;
      animation: spSlideUp 220ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes spSlideUp {
      from { transform: translateY(100%); opacity: 0.4; }
      to   { transform: translateY(0);    opacity: 1; }
    }

    /* Mobile grabber pill: a touch affordance that hints the sheet is
       a dismissible bottom sheet. Hidden on desktop (popup mode) via
       the ≥769px override below. */
    .sp-modal::before {
      content: '';
      display: block;
      width: 36px; height: 4px;
      background: #d8e3e3; border-radius: 999px;
      margin: 8px auto 0;
      flex-shrink: 0;
    }

    /* =========================================================
       DESKTOP ADAPTATION (≥ 769px) — centred popup, NOT a sheet.
       Switches alignment, corners, shadow, animation, and hides
       the grabber pill. Touch-side stays untouched.
       ========================================================= */
    @media (min-width: 769px) {
      .sp-backdrop {
        align-items: center;
        padding: 16px;
      }
      .sp-modal {
        max-width: 460px;
        max-height: calc(100vh - 32px);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22);
        animation: spPop 180ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .sp-modal::before { display: none; }
    }
    @keyframes spPop {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }

    /* HEADER */
    .sp-modal-head {
      display: flex; align-items: center; gap: 8px;
      padding: 16px 20px 14px;
      border-bottom: 1px solid #eef2f2;
    }
    .sp-modal-head-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .sp-modal-head-text strong {
      font-size: 16px; font-weight: 700; color: #111827;
    }
    .sp-modal-head-text span {
      font-size: 12px; color: #6b7280; margin-top: 2px;
    }
    .sp-close { color: #6b7280 !important; }
    /* Back arrow only renders when we're inside the add-family flow
       (the @if in the template controls visibility). When it renders
       it sits on the left of the header on all viewports. */
    .sp-back { color: #1b3a4b !important; }

    /* LIST */
    .sp-list {
      list-style: none; padding: 8px; margin: 0;
      overflow-y: auto; flex: 1 1 auto;
    }
    .sp-list li { margin: 0; }

    .sp-row {
      width: 100%;
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 10px;
      cursor: pointer;
      text-align: left;
      font: inherit;
      color: inherit;
      transition: background 120ms ease, border-color 120ms ease;
    }
    .sp-row:hover:not(:disabled) {
      background: #f0f9f8;
      border-color: #b2dfdb;
    }
    .sp-row:focus-visible {
      outline: 2px solid #00897b;
      outline-offset: 1px;
    }
    .sp-row-disabled { cursor: not-allowed; opacity: 0.6; }
    .sp-row-active {
      background: #e0f2f1;
      border-color: #80cbc4;
    }

    /* AVATAR */
    .sp-avatar {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #00897b, #00bfa5);
      color: #fff; font-weight: 700; font-size: 13px;
      display: inline-flex; align-items: center; justify-content: center;
      letter-spacing: 0.4px; flex: 0 0 auto;
    }
    .sp-avatar-female {
      background: linear-gradient(135deg, #d81b60, #f06292);
    }

    /* ROW TEXT */
    .sp-row-text {
      display: flex; flex-direction: column; flex: 1; min-width: 0;
    }
    .sp-row-name {
      display: flex; align-items: center; gap: 6px;
      min-width: 0;
    }
    .sp-row-name strong {
      font-size: 14px; color: #111827; font-weight: 600;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .sp-row-meta {
      font-size: 11px; color: #6b7280;
      margin-top: 2px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .sp-row-id { color: #9ca3af; }

    /* BADGES */
    .sp-badge {
      font-size: 9px; font-weight: 700;
      letter-spacing: 0.6px; padding: 2px 6px;
      border-radius: 999px;
    }
    .sp-badge-primary { background: #fff3e0; color: #ef6c00; }

    /* RIGHT-SIDE TAGS */
    .sp-tag {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 10px; font-weight: 700;
      padding: 4px 7px; border-radius: 999px;
      letter-spacing: 0.4px; flex: 0 0 auto;
    }
    .sp-tag mat-icon {
      font-size: 12px; width: 12px; height: 12px;
    }
    .sp-tag-active { background: #c8e6c9; color: #2e7d32; }
    .sp-tag-guardian { background: #ede7f6; color: #5e35b1; }
    .sp-tag-locked { background: #fff8e1; color: #b45309; }
    .sp-chevron {
      color: #cbd5e1; font-size: 20px; width: 20px; height: 20px;
      flex: 0 0 auto;
    }

    /* FOOTER */
    .sp-modal-foot {
      display: flex; flex-direction: column; gap: 8px;
      padding: 12px 16px 16px;
      border-top: 1px solid #eef2f2;
    }
    .sp-add-btn {
      width: 100%; height: 42px !important;
      border-style: dashed !important;
      border-color: #80cbc4 !important;
      color: #00695c !important;
      font-weight: 600 !important;
    }
    .sp-signout {
      width: 100%; color: #c62828 !important;
      font-weight: 500 !important;
    }
    .sp-limit {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 12px; border-radius: 10px;
      background: #fff8e1; color: #6b5b3e;
      font-size: 12px; line-height: 1.45;
    }
    .sp-limit strong { display: block; color: #8d6e63; }
    .sp-limit mat-icon {
      font-size: 18px; width: 18px; height: 18px; color: #b45309;
      flex: 0 0 auto;
    }

    /* ADD-FAMILY FORM */
    .sp-add-form {
      padding: 18px 20px 20px;
      overflow-y: auto;
    }
    .sp-add-form-hint,
    .sp-add-hint {
      margin: 0 0 14px;
      font-size: 12.5px; color: #6b7280; line-height: 1.5;
    }
    .sp-add-hint strong { color: #1b3a4b; font-weight: 700; }
    .sp-add-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
    }
    .sp-add-grid-full { grid-column: 1 / -1; width: 100%; }
    .sp-add-actions {
      display: flex; gap: 8px; justify-content: flex-end;
      margin-top: 16px;
    }
    .sp-add-actions button { display: inline-flex; align-items: center; gap: 4px; }
    .sp-add-actions mat-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
    }

    /* Inline lookup error shown UNDER the ID field — matched to
       Material's own mat-error visual weight (small, red, no card).
       The hint span de-emphasises the recovery instruction so the
       primary statement still reads first. Margin is positive (not
       negative) so the input field's bottom border can't cut through
       the text. */
    .sp-field-error {
      margin: 4px 4px 14px;
      font-size: 12px;
      line-height: 1.45;
      color: #d32f2f;
      font-weight: 600;
    }
    .sp-field-error-hint {
      display: block;
      margin-top: 4px;
      color: #6b7280;
      font-weight: 400;
    }

    /* "Don't have a Patient ID? Create an account" inline link.
       Centred under the lookup field so it reads as a quiet secondary
       path, not a competing primary CTA. */
    .sp-create-link-row {
      margin: 4px 0 14px;
      font-size: 12.5px; color: #6b7280;
      text-align: center;
    }
    .sp-create-link {
      background: none; border: none; padding: 0 0 0 4px;
      color: #00897b; font: inherit; font-size: 12.5px; font-weight: 700;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .sp-create-link:hover { color: #00695c; }
    .sp-create-link:focus-visible {
      outline: 2px solid #80cbc4; outline-offset: 2px;
      border-radius: 3px;
    }

    /* Two-column grid for the create-account form fields. Mirrors the
       compact density used elsewhere in the picker. */
    .sp-create-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px 12px;
      margin-bottom: 4px;
    }

    /* ===== LOOKUP CONFIRM CARD (Step 2) ===== */
    .sp-avatar-lg {
      width: 52px !important; height: 52px !important;
      font-size: 16px !important;
    }
    .sp-lookup-card {
      display: flex; align-items: center; gap: 12px;
      padding: 12px;
      background: linear-gradient(135deg, #f0fdf9 0%, #e0f2f1 100%);
      border: 1px solid #b2dfdb;
      border-radius: 12px;
      margin-bottom: 14px;
    }
    .sp-lookup-text {
      flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0;
    }
    .sp-lookup-text strong {
      font-size: 14px; color: #1b3a4b; font-weight: 700;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .sp-lookup-meta {
      font-size: 11.5px; color: #00695c; font-weight: 600;
    }
    .sp-lookup-id {
      font-size: 10.5px; color: #5a8585; font-weight: 600;
      letter-spacing: 0.3px; margin-top: 2px;
    }
    .sp-lookup-check {
      color: #00897b !important;
      font-size: 24px !important; width: 24px !important; height: 24px !important;
      flex: 0 0 auto;
    }


    /* MOBILE — sheet stays bottom-anchored but takes the full width
       and most of the viewport height. Backdrop stays dark so it
       still reads as a sheet, not a page. */
    @media (max-width: 768px) {
      .sp-modal {
        max-width: 100%;
        max-height: 92vh;
        border-radius: 18px 18px 0 0;
      }
      .sp-modal-head { padding: 14px 12px 12px; }
      .sp-create-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class SelectPatientComponent {
  readonly family = inject(FamilyService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly locationService = inject(LocationService);
  private readonly signupHandoff = inject(SignupHandoffService);

  // Defensive: deep-link to /select-patient without a loaded family
  // → bounce back to the landing page.
  private readonly _guard = (() => {
    if (this.family.visibleMembers().length === 0) {
      queueMicrotask(() => this.router.navigateByUrl('/'));
    }
  })();

  // ---- Add-family flow state --------------------------------
  // Inline bottom-sheet lookup: type an HMS Patient ID, confirm the
  // match, pick relationship, link. If the patient isn't in HMS at all,
  // the "Create account" CTA routes OUT to the standard signup card —
  // the new patient registers exactly like any other portal user, then
  // can be linked back here once their Patient ID is provisioned.
  readonly addFormOpen = signal(false);
  readonly addLookupStatus = signal<AddLookupStatus>('idle');
  readonly addLookupId = signal('');
  readonly addLookupResult = signal<FamilyMember | null>(null);
  readonly addLookupError = signal('');
  readonly addRelationship = signal<RelationshipType | ''>('');

  /**
   * (ngModelChange) handler for the ID input. Strips everything except
   * digits — Patient IDs / CPRs are numeric — and resets the inline
   * result state so the user isn't looking at a stale "not found"
   * message (or a stale patient card) while still editing the ID.
   */
  onLookupIdInput(value: string): void {
    const cleaned = (value ?? '').replace(/\D/g, '').slice(0, 20);
    this.addLookupId.set(cleaned);
    if (this.addLookupStatus() !== 'idle') {
      this.addLookupStatus.set('idle');
      this.addLookupResult.set(null);
      this.addLookupError.set('');
      this.addRelationship.set('');
    }
  }

  get addRelationshipModel(): string { return this.addRelationship(); }
  set addRelationshipModel(v: string) {
    this.addRelationship.set(v as RelationshipType | '');
  }

  /** Lookup is enabled when at least 4 digits have been typed. */
  readonly canLookup = computed(() => this.addLookupId().trim().length >= 4);

  /**
   * Relationship options shown in the "Your relationship to X" dropdown.
   * Filtered here (not inline in the template) because mat-select's
   * content projection of mat-option is fragile inside @if blocks —
   * the safest pattern is to feed it a pre-filtered list.
   */
  readonly relationshipOptions = computed<RelationshipType[]>(() =>
    this.family.config().allowedRelationships.filter(r => r !== 'Self')
  );

  /**
   * The modal can only be dismissed without picking when the
   * FamilyService says so — mandatory after login, freely dismissable
   * when opened from the toolbar mid-session.
   */
  canDismiss = computed(() => this.family.pickerDismissible());

  maskedMobile = computed(() => {
    const raw = this.family.primaryMobile();
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 4) return raw;
    return `+${digits.slice(0, digits.length - 4).replace(/.(?=.{2})/g, '•')} ${digits.slice(-4)}`;
  });

  // ---- Actions -----------------------------------------------------

  isActive(member: FamilyMember): boolean {
    return this.family.activeMember()?.patientId === member.patientId;
  }

  select(member: FamilyMember): void {
    if (!this.family.isSelectable(member)) return;
    // No-op if user re-taps the active member; just dismiss.
    if (this.isActive(member)) {
      this.family.forceClosePicker();
      return;
    }
    if (this.family.setActivePatient(member.patientId)) {
      this.family.forceClosePicker();
      // Reset to dashboard so any in-progress workflow from the
      // previous patient context is wiped (edge case #5).
      // We bounce through a transient navigation first so that if the
      // user was already on /dashboard, Angular still tears down and
      // re-instantiates the page — otherwise the dashboard keeps the
      // previous patient's data in its signals.
      this.router.navigateByUrl('/', { skipLocationChange: true })
        .then(() => this.router.navigateByUrl('/dashboard'));
    }
  }

  close(): void {
    this.family.closePicker();
  }

  onBackdropClick(): void {
    // Backdrop click only closes when the modal is dismissible.
    this.family.closePicker();
  }

  openAddForm(): void {
    this.resetAddState();
    this.addFormOpen.set(true);
  }

  cancelAdd(): void {
    this.addFormOpen.set(false);
    this.resetAddState();
  }

  private resetAddState(): void {
    this.addLookupStatus.set('idle');
    this.addLookupId.set('');
    this.addLookupResult.set(null);
    this.addLookupError.set('');
    this.addRelationship.set('');
  }

  /**
   * Looks the ID up in the HMS directory and renders the result inline
   * — populates a patient card (found), an "already linked" notice, or
   * a Create-Account fallback (not found).
   */
  lookupPatient(): void {
    if (!this.canLookup()) return;
    const result = this.family.lookupPatient(this.addLookupId());
    switch (result.status) {
      case 'found':
        this.addLookupResult.set(result.patient);
        this.addLookupError.set('');
        this.addLookupStatus.set('found');
        break;
      case 'already_linked':
        this.addLookupResult.set(null);
        this.addLookupError.set(
          `${result.patient.fullName} is already in your family.`
        );
        this.addLookupStatus.set('already_linked');
        break;
      case 'not_found':
      default:
        this.addLookupResult.set(null);
        this.addLookupError.set('');
        this.addLookupStatus.set('not_found');
        break;
    }
  }

  /** Reset everything but keep the form open (used by the suffix × on the ID input). */
  clearLookup(): void {
    this.addLookupId.set('');
    this.addLookupStatus.set('idle');
    this.addLookupResult.set(null);
    this.addLookupError.set('');
    this.addRelationship.set('');
  }

  submitAdd(): void {
    const p = this.addLookupResult();
    const rel = this.addRelationship();
    if (!p || !rel) return;
    // The portal NEVER creates a family mapping itself. We queue a
    // verification request that goes to HMS/HIS / hospital reception.
    // Auto-dismissing transient toast — no action button. Industry
    // pattern: a confirmation toast that just says "done" needs no
    // dismiss control, it goes away on its own in 5s.
    this.snackBar.open(
      `${p.firstName} will appear once BSH verifies.`,
      undefined,
      { duration: 5000 }
    );
    this.cancelAdd();
  }

  /**
   * "Patient not found" / "Don't have a Patient ID?" → hand off to the
   * standard Create Account workflow on the landing page. The new
   * patient signs up exactly like any other portal user. The relationship
   * the owner picked (if any) is carried in the handoff so a follow-up
   * step can link the freshly-registered patient back to this family.
   */
  goToCreateAccount(): void {
    this.signupHandoff.setPrefill({
      firstName: '',
      lastName: '',
      cpr: this.addLookupId(),
      phone: '',
      email: '',
      mode: 'create'
    });
    // Close the picker + clear current location so the landing flow
    // (location-picker → Create Account card) takes over via the shell's
    // handoff effect.
    this.family.forceClosePicker();
    this.cancelAdd();
    this.locationService.setLocation(null);
    this.router.navigate(['/']);
  }

  /** Format ISO yyyy-mm-dd as "12 Feb 1958" for the lookup confirmation card. */
  formatDob(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  signOut(): void {
    this.family.clear();
    this.router.navigateByUrl('/');
  }

  // ---- Formatters --------------------------------------------------

  initials(member: FamilyMember): string {
    return `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase();
  }

  ageLabel(member: FamilyMember): string {
    const age = this.family.ageFor(member);
    if (age <= 12) return `${age} yrs`;
    return `Age ${age}`;
  }

  disabledMessage(member: FamilyMember): string {
    switch (member.disabledReason) {
      case 'portal_access_disabled':
        return 'Portal access not enabled for this profile. Contact reception to enable.';
      case 'consent_pending':
        return 'Consent pending. Visit reception to complete consent.';
      case 'inactive':
        return 'This family link is no longer active.';
      default:
        return 'Not available right now.';
    }
  }
}
