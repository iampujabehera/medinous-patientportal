import { Component, ChangeDetectionStrategy, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { ApiService } from '../../core/services/api.service';
import { I18nService } from '../../core/services/i18n.service';
import { LocationService } from '../../core/services/location.service';
import { GeographyService } from '../../core/services/geography.service';
import { SignupHandoffService } from '../../core/services/signup-handoff.service';
import { Doctor, BookingSlot, GuestPatient, GuestBookingResult } from '../../core/models/patient.model';

type SlotPeriod = 'morning' | 'afternoon' | 'evening';
type ConsultationMode = 'in_person' | 'video';

interface DateOption {
  date: string;
  dayLabel: string;
  dayNum: string;
}

@Component({
  selector: 'app-guest-booking',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDividerModule,
    SkeletonCardComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gb-shell" [class.rtl]="i18n.isRtl()">

      <!-- =================================================
           TOP BAR — back arrow + title (always visible)
           ================================================= -->
      <div class="gb-topbar">
        <button mat-icon-button class="gb-back" (click)="onTopBack()"
                [attr.aria-label]="topBackLabel()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="gb-topbar-text">
          <strong>Quick Booking</strong>
          <span>{{ stepHint() }}</span>
        </div>
      </div>

      @if (!bookingResult()) {

        <!-- =================================================
             CUSTOM STEPPER — full labels, mobile-friendly
             ================================================= -->
        <div class="gb-stepper" role="tablist" aria-label="Booking steps">
          @for (s of steps; track s.idx) {
            <div class="gb-step"
                 role="tab"
                 [attr.aria-selected]="currentStep() === s.idx"
                 [class.active]="currentStep() === s.idx"
                 [class.done]="currentStep() > s.idx">
              <span class="gb-step-bubble">
                @if (currentStep() > s.idx) {
                  <mat-icon>check</mat-icon>
                } @else {
                  {{ s.idx + 1 }}
                }
              </span>
              <span class="gb-step-label">{{ s.label }}</span>
            </div>
          }
        </div>

        <!-- =================================================
             STEP CONTENT
             ================================================= -->
        @switch (currentStep()) {

          <!-- ----- STEP 0: pick a doctor ----- -->
          @case (0) {
            <div class="gb-content">
              <!-- Search -->
              <div class="gb-search-wrap">
                <mat-icon class="gb-search-icon">search</mat-icon>
                <input class="gb-search-input"
                       type="search"
                       name="doctor-search"
                       autocomplete="off"
                       placeholder="Search doctor by name..."
                       [ngModel]="searchQuery()"
                       (ngModelChange)="searchQuery.set($event)">
                @if (searchQuery()) {
                  <button mat-icon-button class="gb-search-clear"
                          (click)="searchQuery.set('')" aria-label="Clear search">
                    <mat-icon>close</mat-icon>
                  </button>
                }
              </div>

              <!-- Specialty tabs (horizontal scrollable) -->
              <div class="gb-spec-tabs">
                <button class="gb-spec-tab"
                        [class.active]="selectedSpecialty() === 'all'"
                        (click)="setSpecialty('all')">
                  <mat-icon>apps</mat-icon> All
                </button>
                @for (sp of specialties(); track sp) {
                  <button class="gb-spec-tab"
                          [class.active]="selectedSpecialty() === sp"
                          (click)="setSpecialty(sp)">
                    <mat-icon>{{ specialtyIcon(sp) }}</mat-icon> {{ sp }}
                  </button>
                }
              </div>

              <!-- Doctor list -->
              @if (loadingDoctors()) {
                @for (i of [1,2,3]; track i) {
                  <app-skeleton-card [lines]="2" [showAvatar]="true" variant="compact" />
                }
              } @else if (filteredDoctors().length === 0) {
                <div class="gb-empty">
                  <mat-icon>search_off</mat-icon>
                  <p>No doctors found.</p>
                </div>
              } @else {
                <div class="gb-doctor-list">
                  @for (doc of filteredDoctors(); track doc.id) {
                    <div class="gb-doc-row"
                         [class.selected]="selectedDoctor()?.id === doc.id"
                         (click)="selectDoctor(doc)">
                      <div class="gb-doc-avatar"><mat-icon>person</mat-icon></div>
                      <div class="gb-doc-body">
                        <strong class="gb-doc-name">{{ doc.name }}</strong>
                        <span class="gb-doc-specialty">
                          <mat-icon>{{ specialtyIcon(doc.specialty) }}</mat-icon>
                          {{ doc.specialty }}
                        </span>
                        <div class="gb-next-avail">
                          <span class="gb-next-label">Next available at</span>
                          <div class="gb-next-chips">
                            <span class="gb-next-chip in-person">
                              <mat-icon>local_hospital</mat-icon>
                              {{ nextInPersonSlot(doc) }}
                            </span>
                            <span class="gb-next-chip video">
                              <mat-icon>videocam</mat-icon>
                              {{ nextVideoSlot(doc) }}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div class="gb-doc-right">
                        <strong class="gb-doc-fee">{{ formatCurrency(videoConsultFee(doc)) }} onwards</strong>
                        <mat-icon class="gb-doc-chevron">chevron_right</mat-icon>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- ----- STEP 1: pick date + time + visit-type ----- -->
          @case (1) {
            <div class="gb-content">
              @if (selectedDoctor(); as doc) {
                <!-- Sticky doctor summary -->
                <div class="gb-doc-header">
                  <div class="gb-doc-avatar small"><mat-icon>person</mat-icon></div>
                  <div class="gb-doc-header-body">
                    <strong>{{ doc.name }}</strong>
                    <span>
                      <mat-icon>favorite</mat-icon>
                      {{ doctorDesignation(doc) }} <span class="gb-sep">|</span> {{ doc.specialty }}
                    </span>
                  </div>
                  <div class="gb-doc-header-fee">
                    <strong>{{ formatCurrency(currentFee()) }}</strong>
                    <span>{{ consultationMode() === 'video' ? 'Video' : 'In-person' }}</span>
                  </div>
                </div>

                <!-- Visit-type tabs -->
                <div class="gb-mode-tabs">
                  <button class="gb-mode-tab"
                          [class.active]="consultationMode() === 'in_person'"
                          (click)="setMode('in_person')">
                    <mat-icon>local_hospital</mat-icon> Hospital Visit
                  </button>
                  <button class="gb-mode-tab video"
                          [class.active]="consultationMode() === 'video'"
                          (click)="setMode('video')">
                    <mat-icon>videocam</mat-icon> Video Consult
                  </button>
                </div>

                <!-- Date strip -->
                <section class="gb-section">
                  <div class="gb-section-head">
                    <span class="gb-head-left">
                      <mat-icon>event</mat-icon>
                      <h3>Select Date</h3>
                    </span>
                  </div>
                  <div class="gb-date-strip">
                    @for (d of dateOptions(); track d.date) {
                      <button class="gb-date-pill"
                              [class.active]="selectedDate() === d.date"
                              (click)="selectDate(d.date)">
                        <span class="gb-date-num">{{ d.dayNum }}</span>
                        <span class="gb-date-label">{{ d.dayLabel.substring(0, 3) }}</span>
                      </button>
                    }
                  </div>
                </section>

                <!-- Time slots -->
                <section class="gb-section">
                  <div class="gb-section-head">
                    <span class="gb-head-left">
                      <mat-icon>schedule</mat-icon>
                      <h3>Available Time</h3>
                    </span>
                  </div>

                  @if (morningSlots().length) {
                    <h4 class="gb-period">
                      <mat-icon class="gb-period-icon morning">wb_sunny</mat-icon>
                      Morning
                    </h4>
                    <div class="gb-slots">
                      @for (slot of morningSlots(); track slot.id) {
                        <button class="gb-slot-pill"
                                [class.selected]="selectedSlot()?.id === slot.id"
                                [disabled]="!slot.available"
                                (click)="selectedSlot.set(slot)">{{ slot.time }}</button>
                      }
                    </div>
                  }

                  @if (afternoonSlots().length) {
                    <h4 class="gb-period">
                      <mat-icon class="gb-period-icon afternoon">wb_twilight</mat-icon>
                      Afternoon
                    </h4>
                    <div class="gb-slots">
                      @for (slot of afternoonSlots(); track slot.id) {
                        <button class="gb-slot-pill"
                                [class.selected]="selectedSlot()?.id === slot.id"
                                [disabled]="!slot.available"
                                (click)="selectedSlot.set(slot)">{{ slot.time }}</button>
                      }
                    </div>
                  }

                  @if (eveningSlots().length) {
                    <h4 class="gb-period">
                      <mat-icon class="gb-period-icon evening">dark_mode</mat-icon>
                      Evening
                    </h4>
                    <div class="gb-slots">
                      @for (slot of eveningSlots(); track slot.id) {
                        <button class="gb-slot-pill"
                                [class.selected]="selectedSlot()?.id === slot.id"
                                [disabled]="!slot.available"
                                (click)="selectedSlot.set(slot)">{{ slot.time }}</button>
                      }
                    </div>
                  }
                </section>
              }
            </div>
          }

          <!-- ----- STEP 2: your details ----- -->
          @case (2) {
            <div class="gb-content">
              <div class="gb-form-card">
                <div class="gb-form-row">
                  <mat-form-field appearance="outline" class="gb-half gb-tight">
                    <mat-label>First Name <span class="gb-req">*</span></mat-label>
                    <input matInput maxlength="60"
                           [ngModel]="guest().firstName"
                           (ngModelChange)="updateGuest('firstName', $event)">
                    @if (firstNameError()) {
                      <mat-error>{{ firstNameError() }}</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="gb-half gb-tight">
                    <mat-label>Last Name <span class="gb-req">*</span></mat-label>
                    <input matInput maxlength="60"
                           [ngModel]="guest().lastName"
                           (ngModelChange)="updateGuest('lastName', $event)">
                    @if (lastNameError()) {
                      <mat-error>{{ lastNameError() }}</mat-error>
                    }
                  </mat-form-field>
                </div>

                <div class="gb-form-row gb-phone-row">
                  <mat-form-field appearance="outline" class="gb-tight gb-cc">
                    <mat-label>Code <span class="gb-req">*</span></mat-label>
                    <mat-select [ngModel]="guestCountryCode()" (ngModelChange)="guestCountryCode.set($event)">
                      @for (cc of countryCodes; track cc.code) {
                        <mat-option [value]="cc.code">{{ cc.code }} · {{ cc.country }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="gb-tight gb-phone">
                    <mat-label>Phone Number <span class="gb-req">*</span></mat-label>
                    <input matInput type="tel" inputmode="numeric" maxlength="10"
                           [ngModel]="guest().phone"
                           (ngModelChange)="onPhoneInput($event)">
                    <mat-icon matPrefix>phone</mat-icon>
                    @if (phoneError()) {
                      <mat-error>{{ phoneError() }}</mat-error>
                    } @else {
                      <mat-hint>SMS confirmations sent here</mat-hint>
                    }
                  </mat-form-field>
                </div>

                <div class="gb-form-row">
                  <mat-form-field appearance="outline" class="gb-full gb-tight">
                    <mat-label>Email (optional)</mat-label>
                    <input matInput type="email"
                           [ngModel]="guest().email"
                           (ngModelChange)="updateGuest('email', $event)">
                    <mat-icon matPrefix>email</mat-icon>
                    @if (emailError()) {
                      <mat-error>{{ emailError() }}</mat-error>
                    }
                  </mat-form-field>
                </div>
              </div>
            </div>
          }

          <!-- ----- STEP 3: confirm ----- -->
          @case (3) {
            <div class="gb-content">
              <div class="gb-confirm-card">
                <h3>Summary</h3>

                <div class="gb-confirm-block">
                  <span class="gb-block-label">Visit</span>
                  <div class="gb-confirm-row">
                    <mat-icon>medical_services</mat-icon>
                    <span>
                      <strong>{{ selectedDoctor()?.name }}</strong> · {{ selectedDoctor()?.specialty }}
                    </span>
                  </div>
                  <div class="gb-confirm-row">
                    <mat-icon>event</mat-icon>
                    <span>{{ selectedDate() | date:'fullDate' }} · {{ selectedSlot()?.time }}</span>
                  </div>
                  <div class="gb-confirm-row">
                    <mat-icon>{{ consultationMode() === 'video' ? 'videocam' : 'local_hospital' }}</mat-icon>
                    <span>{{ consultationMode() === 'video' ? 'Video Consultation' : 'Hospital Visit' }} · {{ formatCurrency(currentFee()) }}</span>
                  </div>
                  @if (locationService.selectedLocation(); as loc) {
                    <div class="gb-confirm-row">
                      <mat-icon>location_on</mat-icon>
                      <span>{{ loc.name }}</span>
                    </div>
                  }
                </div>

                <div class="gb-confirm-block">
                  <span class="gb-block-label">Patient</span>
                  <div class="gb-confirm-row">
                    <mat-icon>person</mat-icon>
                    <span>{{ guest().firstName }} {{ guest().lastName }}</span>
                  </div>
                  <div class="gb-confirm-row">
                    <mat-icon>phone</mat-icon>
                    <span>{{ guestCountryCode() }} {{ guest().phone }}</span>
                  </div>
                </div>

                <mat-form-field appearance="outline" class="gb-full gb-tight gb-reason">
                  <mat-label>Reason for visit (optional)</mat-label>
                  <textarea matInput rows="2"
                            [ngModel]="visitReason()"
                            (ngModelChange)="visitReason.set($event)"></textarea>
                </mat-form-field>

                <div class="gb-sms">
                  <mat-icon>sms</mat-icon>
                  <span>SMS confirmation will be sent to <strong>{{ guestCountryCode() }} {{ guest().phone }}</strong></span>
                </div>
              </div>
            </div>
          }
        }

        <!-- =================================================
             STICKY FOOTER — fee + continue/confirm
             ================================================= -->
        <div class="gb-footer">
          <div class="gb-footer-inner">
            @if (currentStep() === 1) {
              <div class="gb-bar-info">
                <strong class="gb-bar-fee">{{ formatCurrency(currentFee()) }}</strong>
                @if (selectedSlot() && selectedDate()) {
                  <span>{{ selectedDate() | date:'d MMM' }} · {{ selectedSlot()?.time }}</span>
                } @else {
                  <span class="hint">Select a time slot</span>
                }
              </div>
            } @else {
              <span class="gb-bar-spacer"></span>
            }

            <button mat-flat-button class="gb-cta"
                    [disabled]="!canContinue() || booking()"
                    (click)="onContinue()">
              <!-- Leading icon/spinner — projects into mat-button's leading slot.
                   Each top-level @if block has a single node so Angular's
                   content projection resolves correctly (NG8011 fix). -->
              @if (booking()) {
                <mat-spinner diameter="18" class="gb-cta-spin"></mat-spinner>
              } @else if (currentStep() === lastStepIdx) {
                <mat-icon>check</mat-icon>
              }
              <span>
                @if (booking()) { Booking… }
                @else if (currentStep() === lastStepIdx) { Confirm Appointment }
                @else { Continue }
              </span>
              @if (!booking() && currentStep() !== lastStepIdx) {
                <mat-icon iconPositionEnd>arrow_forward</mat-icon>
              }
            </button>
          </div>
        </div>

      } @else {

        <!-- =================================================
             SUCCESS — auto-account + set password / sign in
             ================================================= -->
        <div class="gb-success">
          <div class="gb-success-icon"><mat-icon>check_circle</mat-icon></div>
          <h2>You're all set!</h2>
          <p class="gb-success-sub">Appointment booked — we look forward to seeing you.</p>

          <div class="gb-success-summary">
            <div class="gb-summary-row">
              <mat-icon>medical_services</mat-icon>
              <div>
                <strong>{{ bookingResult()!.appointment.doctorName }}</strong>
                <span>{{ selectedDoctor()?.specialty }}</span>
              </div>
            </div>
            <div class="gb-summary-row">
              <mat-icon>event</mat-icon>
              <div>
                <strong>{{ bookingResult()!.appointment.date | date:'fullDate' }}</strong>
                <span>{{ bookingResult()!.appointment.time }}</span>
              </div>
            </div>
            @if (locationService.selectedLocation(); as loc) {
              <div class="gb-summary-row">
                <mat-icon>location_on</mat-icon>
                <div>
                  <strong>{{ loc.name }}</strong>
                  <span>{{ loc.address }}</span>
                </div>
              </div>
            }
          </div>

          <!-- Auto-account card -->
          <div class="gb-account-card">
            <div class="gb-account-head">
              <mat-icon>verified_user</mat-icon>
              <div>
                <strong>We've created your account</strong>
                <span>Linked to {{ guestCountryCode() }} {{ guest().phone }}</span>
              </div>
            </div>

            @if (!passwordSet()) {
              <p class="gb-account-msg">
                Set a password to track this booking, view records, and manage future appointments — all from one place.
              </p>

              <div class="gb-pwd-row">
                <mat-form-field appearance="outline" class="gb-full gb-tight">
                  <mat-label>Create password</mat-label>
                  <input matInput
                         [type]="showPwd() ? 'text' : 'password'"
                         autocomplete="new-password"
                         minlength="6"
                         [ngModel]="newPassword()"
                         (ngModelChange)="newPassword.set($event)">
                  <button mat-icon-button matSuffix type="button"
                          [attr.aria-label]="showPwd() ? 'Hide password' : 'Show password'"
                          (click)="showPwd.set(!showPwd())">
                    <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  <mat-hint>At least 6 characters</mat-hint>
                </mat-form-field>
              </div>

              <div class="gb-account-actions">
                <button mat-flat-button class="gb-cta"
                        [disabled]="newPassword().length < 6"
                        (click)="setPassword()">
                  <mat-icon>lock</mat-icon>
                  <span>Set Password</span>
                </button>
              </div>
            } @else {
              <p class="gb-account-msg success">
                <mat-icon>check_circle</mat-icon>
                Password set. You can sign in any time with {{ guestCountryCode() }} {{ guest().phone }}.
              </p>
              <button mat-flat-button class="gb-cta" (click)="goToSignIn()">
                <mat-icon>login</mat-icon>
                <span>Sign in now</span>
              </button>
            }
          </div>

          <button mat-stroked-button class="gb-cta-secondary gb-book-another"
                  (click)="resetBooking()">
            <mat-icon>add</mat-icon> Book another appointment
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .gb-shell {
      max-width: 760px; margin: 0 auto;
      padding: 0 16px 96px;
    }
    .gb-shell.rtl { direction: rtl; text-align: right; }

    /* ===== TOP BAR ===== */
    .gb-topbar {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 0 12px;
    }
    .gb-back { color: #1b3a4b !important; flex-shrink: 0; }
    .gb-topbar-text { display: flex; flex-direction: column; min-width: 0; }
    .gb-topbar-text strong {
      font-size: 17px; font-weight: 700; color: #1b3a4b; line-height: 1.2;
    }
    .gb-topbar-text span {
      font-size: 12px; color: #6b7884; margin-top: 1px;
    }

    /* ===== STEPPER ===== */
    .gb-stepper {
      display: flex; align-items: flex-start;
      gap: 4px;
      padding: 4px 0 16px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .gb-stepper::-webkit-scrollbar { display: none; }
    .gb-step {
      flex: 1 1 0;
      min-width: 70px;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      position: relative;
    }
    .gb-step::after {
      content: '';
      position: absolute;
      top: 13px;
      left: calc(50% + 16px);
      right: calc(-50% + 16px);
      height: 2px;
      background: #e3ecec;
      z-index: 0;
    }
    .gb-step:last-child::after { display: none; }
    .gb-step.done::after { background: #0d8a8a; }
    .gb-step-bubble {
      width: 28px; height: 28px; border-radius: 50%;
      background: #e3ecec; color: #6b7884;
      display: inline-flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px;
      z-index: 1;
      transition: background 0.18s, color 0.18s;
    }
    .gb-step-bubble mat-icon {
      font-size: 16px; width: 16px; height: 16px;
    }
    .gb-step.active .gb-step-bubble {
      background: #0d8a8a; color: white;
      box-shadow: 0 2px 6px rgba(13,138,138,0.32);
    }
    .gb-step.done .gb-step-bubble {
      background: #0d8a8a; color: white;
    }
    .gb-step-label {
      font-size: 11px; font-weight: 600; color: #6b7884;
      text-align: center; white-space: nowrap;
    }
    .gb-step.active .gb-step-label { color: #0d8a8a; }
    .gb-step.done .gb-step-label { color: #1b3a4b; }

    /* ===== CONTENT ===== */
    .gb-content { padding: 4px 0 16px; }
    .gb-full { width: 100%; }

    /* Tighter form-field density */
    ::ng-deep .gb-tight .mat-mdc-text-field-wrapper {
      padding-top: 0 !important; padding-bottom: 0 !important;
    }
    ::ng-deep .gb-tight .mat-mdc-form-field-subscript-wrapper {
      padding: 0 14px !important;
    }

    .gb-req { color: #d32f2f; font-weight: 600; margin-left: 2px; }

    /* ===== SEARCH ===== */
    .gb-search-wrap {
      position: relative;
      margin-bottom: 10px;
    }
    .gb-search-input {
      width: 100%; padding: 10px 38px 10px 36px;
      border: 1px solid #e3ecec; border-radius: 10px;
      background: white; font: inherit; font-size: 13px;
      box-sizing: border-box;
    }
    .gb-search-input:focus { outline: 2px solid #0d8a8a; outline-offset: -1px; }
    .gb-search-icon {
      position: absolute; left: 10px; top: 50%;
      transform: translateY(-50%); color: #98a2ab;
      font-size: 18px; width: 18px; height: 18px;
    }
    .gb-search-clear {
      position: absolute; right: 4px; top: 50%;
      transform: translateY(-50%);
    }

    /* ===== SPECIALTY TABS ===== */
    .gb-spec-tabs {
      display: flex; gap: 6px;
      overflow-x: auto;
      padding: 2px 0 10px;
      scrollbar-width: thin;
    }
    .gb-spec-tabs::-webkit-scrollbar { height: 4px; }
    .gb-spec-tab {
      flex-shrink: 0;
      display: inline-flex; align-items: center; gap: 5px;
      padding: 8px 14px; border-radius: 22px;
      border: 1px solid #e3ecec; background: white;
      cursor: pointer; transition: all 0.15s;
      font: inherit; font-size: 13px; font-weight: 600; color: #6b7884;
    }
    .gb-spec-tab:hover { border-color: #80cbc4; }
    .gb-spec-tab.active {
      background: #0d8a8a; color: white; border-color: #0d8a8a;
      box-shadow: 0 2px 6px rgba(13,138,138,0.2);
    }
    .gb-spec-tab mat-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
    }

    /* ===== DOCTOR LIST ===== */
    .gb-doctor-list { display: flex; flex-direction: column; gap: 8px; }
    .gb-doc-row {
      display: flex; align-items: stretch; gap: 10px;
      padding: 10px 12px;
      background: white; border: 1px solid #eef2f5; border-radius: 12px;
      cursor: pointer; transition: all 0.15s;
    }
    .gb-doc-row:hover { border-color: #b2dfdb; background: #fafcfc; }
    .gb-doc-row.selected {
      border-color: #0d8a8a; background: #f5fafa;
      box-shadow: 0 1px 4px rgba(13,138,138,0.10);
    }
    .gb-doc-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .gb-doc-avatar mat-icon { color: #0d8a8a; font-size: 22px; width: 22px; height: 22px; }
    .gb-doc-avatar.small { width: 34px; height: 34px; }
    .gb-doc-avatar.small mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .gb-doc-body { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .gb-doc-name { font-size: 13.5px; font-weight: 700; color: #1b3a4b; }
    .gb-doc-specialty {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11.5px; color: #5a8585; font-weight: 600;
    }
    .gb-doc-specialty mat-icon {
      color: #5a8585; font-size: 13px !important; width: 13px !important; height: 13px !important;
    }
    .gb-next-avail {
      display: flex; flex-direction: column; gap: 2px; margin-top: 4px;
    }
    .gb-next-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.3px;
      color: #98a2ab; text-transform: uppercase;
    }
    .gb-next-chips { display: flex; flex-direction: column; gap: 3px; }
    .gb-next-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 8px; border-radius: 5px;
      font-size: 11px; font-weight: 600;
      width: max-content;
    }
    .gb-next-chip mat-icon {
      font-size: 12px !important; width: 12px !important; height: 12px !important;
    }
    .gb-next-chip.in-person { background: #e0f7f5; color: #0d8a8a; }
    .gb-next-chip.video { background: #ede7f6; color: #5e35b1; }

    .gb-doc-right {
      display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between;
      gap: 6px; flex-shrink: 0; min-width: 70px;
    }
    .gb-doc-fee { font-size: 12px; color: #1b3a4b; font-weight: 700; text-align: right; }
    .gb-doc-chevron {
      color: #b2dfdb; font-size: 22px; width: 22px; height: 22px;
    }

    .gb-empty {
      text-align: center; padding: 36px 16px; color: #6b7884;
    }
    .gb-empty mat-icon {
      font-size: 36px; width: 36px; height: 36px; color: #b2c4c4;
    }

    /* ===== STEP 1 — DOCTOR HEADER ===== */
    .gb-doc-header {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px;
      background: white; border: 1px solid #eef2f5; border-radius: 12px;
      margin-bottom: 10px;
    }
    .gb-doc-header-body { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .gb-doc-header-body strong { font-size: 13.5px; color: #1b3a4b; font-weight: 700; }
    .gb-doc-header-body span {
      font-size: 11.5px; color: #5a8585; font-weight: 600;
      display: inline-flex; align-items: center; gap: 4px;
    }
    .gb-doc-header-body span mat-icon {
      font-size: 13px !important; width: 13px !important; height: 13px !important;
      color: #c62828;
    }
    .gb-sep { color: #cbd5d5; margin: 0 2px; }
    .gb-doc-header-fee {
      display: flex; flex-direction: column; align-items: flex-end;
    }
    .gb-doc-header-fee strong { font-size: 14px; color: #1b3a4b; font-weight: 700; }
    .gb-doc-header-fee span {
      font-size: 10px; font-weight: 700; color: #98a2ab;
      letter-spacing: 0.4px; text-transform: uppercase;
    }

    /* ===== VISIT-TYPE TABS ===== */
    .gb-mode-tabs {
      display: flex; gap: 4px;
      padding: 4px; background: #f3f5f7; border-radius: 10px;
      margin-bottom: 14px;
    }
    .gb-mode-tab {
      flex: 1;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      padding: 8px 12px;
      border: none; background: transparent; border-radius: 7px;
      cursor: pointer; transition: all 0.18s;
      font: inherit; font-size: 13px; font-weight: 600; color: #6b7884;
    }
    .gb-mode-tab mat-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
    }
    .gb-mode-tab.active {
      background: white; color: #0d8a8a;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }
    .gb-mode-tab.video.active { color: #5e35b1; }

    /* ===== SECTION + DATE STRIP ===== */
    .gb-section { margin-bottom: 16px; }
    .gb-section-head {
      display: flex; align-items: center; margin-bottom: 8px;
    }
    .gb-head-left { display: flex; align-items: center; gap: 8px; }
    .gb-head-left mat-icon { color: #0d8a8a; font-size: 18px; width: 18px; height: 18px; }
    .gb-head-left h3 {
      margin: 0; font-size: 14px; font-weight: 700; color: #1b3a4b;
    }

    .gb-date-strip {
      display: flex; gap: 6px;
      overflow-x: auto; padding: 2px 2px 4px;
      scrollbar-width: thin;
    }
    .gb-date-strip::-webkit-scrollbar { height: 4px; }
    .gb-date-pill {
      flex-shrink: 0; min-width: 50px;
      padding: 7px 6px; border-radius: 10px;
      border: 1px solid #e8eded; background: white;
      cursor: pointer; transition: all 0.15s;
      display: flex; flex-direction: column; align-items: center; gap: 0;
      font: inherit;
    }
    .gb-date-pill:hover { border-color: #80cbc4; }
    .gb-date-pill.active {
      background: #0d8a8a; border-color: #0d8a8a;
      box-shadow: 0 3px 10px rgba(13,138,138,0.22);
    }
    .gb-date-num {
      font-size: 16px; font-weight: 700; color: #1b3a4b; line-height: 1.15;
    }
    .gb-date-pill.active .gb-date-num { color: white; }
    .gb-date-label {
      font-size: 9.5px; color: #98a2ab; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.4px;
    }
    .gb-date-pill.active .gb-date-label { color: rgba(255,255,255,0.85); }

    /* ===== TIME SLOTS ===== */
    .gb-period {
      display: flex; align-items: center; gap: 5px;
      font-size: 12px; color: #6b7884; font-weight: 700;
      margin: 12px 0 6px;
    }
    .gb-period-icon {
      font-size: 14px !important; width: 14px !important; height: 14px !important;
    }
    .gb-period-icon.morning { color: #f6a821; }
    .gb-period-icon.afternoon { color: #ef6c00; }
    .gb-period-icon.evening { color: #5c6bc0; }
    .gb-slots {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
      gap: 6px;
    }
    .gb-slot-pill {
      padding: 8px 6px; border-radius: 7px;
      border: 1px solid #e0e8e8; background: white;
      font: inherit; font-size: 12.5px; font-weight: 600; color: #1b3a4b;
      cursor: pointer; transition: all 0.15s;
      min-height: 34px;
    }
    .gb-slot-pill:hover:not(:disabled) {
      border-color: #80cbc4; background: #f5fafa;
    }
    .gb-slot-pill.selected {
      background: #0d8a8a; color: white; border-color: #0d8a8a;
      box-shadow: 0 2px 6px rgba(13,138,138,0.25);
    }
    .gb-slot-pill:disabled {
      color: #c8d0d8; background: #fafafa; cursor: not-allowed;
      border-color: #f0f0f0; opacity: 0.55;
    }

    /* ===== FORM CARD ===== */
    .gb-form-card {
      padding: 14px;
      background: white; border: 1px solid #eef2f5; border-radius: 12px;
    }
    .gb-form-row { display: flex; gap: 10px; }
    .gb-half { flex: 1; min-width: 0; }
    .gb-phone-row { gap: 8px; }
    .gb-cc { width: 130px; flex-shrink: 0; }
    .gb-phone { flex: 1; min-width: 0; }

    /* ===== CONFIRM CARD ===== */
    .gb-confirm-card {
      padding: 14px;
      background: white; border: 1px solid #eef2f5; border-radius: 12px;
    }
    .gb-confirm-card h3 {
      margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #1b3a4b;
    }
    .gb-confirm-block {
      padding: 8px 0; border-top: 1px solid #f0f4f4;
    }
    .gb-confirm-block:first-of-type { border-top: none; padding-top: 0; }
    .gb-block-label {
      display: block; margin-bottom: 4px;
      font-size: 10px; color: #98a2ab; font-weight: 700;
      letter-spacing: 0.5px; text-transform: uppercase;
    }
    .gb-confirm-row {
      display: flex; align-items: center; gap: 9px;
      font-size: 12.5px; color: #1b3a4b; padding: 2px 0;
    }
    .gb-confirm-row mat-icon {
      color: #0d8a8a;
      font-size: 16px !important; width: 16px !important; height: 16px !important;
      flex-shrink: 0;
    }
    .gb-confirm-row strong { color: #1b3a4b; font-weight: 700; }
    .gb-reason { margin-top: 8px; }
    .gb-sms {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px; margin-top: 6px;
      background: #e8f5f3; border-left: 3px solid #0d8a8a;
      border-radius: 6px;
      font-size: 11.5px; color: #1b3a4b; line-height: 1.45;
    }
    .gb-sms mat-icon {
      color: #0d8a8a;
      font-size: 14px !important; width: 14px !important; height: 14px !important;
    }

    /* ===== FOOTER ===== */
    .gb-footer {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 50;
      background: white;
      border-top: 1px solid #e3ecec;
      box-shadow: 0 -4px 16px rgba(0,0,0,0.06);
      padding: 12px 16px;
    }
    @media (min-width: 769px) {
      .gb-footer { left: 240px; }
    }
    .gb-footer-inner {
      max-width: 760px; margin: 0 auto;
      display: flex; align-items: center; gap: 10px;
    }
    .gb-bar-info {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; gap: 1px;
    }
    .gb-bar-fee {
      font-size: 17px; color: #1b3a4b; font-weight: 700;
    }
    .gb-bar-info span {
      font-size: 11.5px; color: #6b7884; font-weight: 600;
    }
    .gb-bar-info span.hint { color: #98a2ab; font-weight: 500; }
    .gb-bar-spacer { flex: 1; }
    .gb-cta {
      height: 44px !important; padding: 0 18px !important;
      font-size: 14px !important; font-weight: 700 !important;
      background: #0d8a8a !important; color: white !important;
      border-radius: 10px !important;
      box-shadow: 0 4px 12px rgba(13,138,138,0.25) !important;
      display: inline-flex !important; align-items: center; gap: 6px;
    }
    .gb-cta:disabled {
      background: #b2dfdb !important; box-shadow: none !important;
      color: white !important;
    }
    .gb-cta mat-icon {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
    }
    .gb-cta-spin { margin-right: 4px; }
    .gb-cta-secondary {
      height: 44px !important; padding: 0 16px !important;
      font-size: 13px !important; font-weight: 700 !important;
      border-color: #d8e3e3 !important; color: #1b3a4b !important;
      border-radius: 10px !important;
      display: inline-flex !important; align-items: center; gap: 6px;
    }

    /* ===== SUCCESS ===== */
    .gb-success {
      max-width: 460px; margin: 8px auto 0;
      padding: 22px 18px;
      background: white; border: 1px solid #eef2f5; border-radius: 14px;
      text-align: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.04);
    }
    .gb-success-icon {
      width: 52px; height: 52px; border-radius: 50%;
      background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 10px;
      box-shadow: 0 4px 14px rgba(76,175,80,0.28);
    }
    .gb-success-icon mat-icon {
      color: white; font-size: 30px !important; width: 30px !important; height: 30px !important;
    }
    .gb-success h2 {
      margin: 0 0 4px; color: #1b3a4b; font-size: 19px; font-weight: 700;
    }
    .gb-success-sub {
      margin: 0 0 14px; color: #6b7884; font-size: 12.5px;
    }
    .gb-success-summary {
      text-align: left;
      padding: 12px;
      background: #f8fafa; border-radius: 9px;
      display: flex; flex-direction: column; gap: 8px;
      margin-bottom: 14px;
    }
    .gb-summary-row { display: flex; align-items: flex-start; gap: 10px; }
    .gb-summary-row mat-icon {
      color: #0d8a8a;
      font-size: 16px !important; width: 16px !important; height: 16px !important;
      margin-top: 2px;
    }
    .gb-summary-row div { display: flex; flex-direction: column; min-width: 0; }
    .gb-summary-row strong { font-size: 12.5px; color: #1b3a4b; font-weight: 700; }
    .gb-summary-row span { font-size: 11.5px; color: #6b7884; }

    .gb-account-card {
      padding: 14px;
      background: #f0f7f7;
      border: 1px solid #b2dfdb;
      border-radius: 12px;
      text-align: left;
      margin-bottom: 12px;
    }
    .gb-account-head {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 10px;
    }
    .gb-account-head mat-icon {
      color: #0d8a8a;
      font-size: 22px !important; width: 22px !important; height: 22px !important;
      flex-shrink: 0;
    }
    .gb-account-head div { display: flex; flex-direction: column; min-width: 0; }
    .gb-account-head strong { font-size: 13px; color: #1b3a4b; font-weight: 700; }
    .gb-account-head span { font-size: 11.5px; color: #5a8585; }

    .gb-account-msg {
      margin: 0 0 12px;
      font-size: 12.5px; line-height: 1.45; color: #1b3a4b;
    }
    .gb-account-msg.success {
      display: inline-flex; align-items: center; gap: 6px;
      color: #2e7d32; font-weight: 600;
    }
    .gb-account-msg mat-icon {
      color: #2e7d32;
      font-size: 16px !important; width: 16px !important; height: 16px !important;
    }
    .gb-pwd-row { margin-bottom: 8px; }

    .gb-account-actions {
      display: flex; gap: 8px; flex-wrap: wrap;
    }
    .gb-account-actions .gb-cta,
    .gb-account-actions .gb-cta-secondary { flex: 1; min-width: 140px; }

    .gb-book-another {
      width: 100%;
      justify-content: center !important;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 600px) {
      .gb-shell { padding: 0 12px 96px; }
      .gb-form-row { flex-direction: column; gap: 0; }
      .gb-phone-row { flex-direction: row; gap: 8px; }
      .gb-step-label { font-size: 10.5px; }
      .gb-step { min-width: 64px; }
      .gb-topbar-text strong { font-size: 16px; }
    }
    @media (max-width: 420px) {
      .gb-phone-row { flex-direction: column; gap: 0; }
      .gb-cc { width: 100%; }
      .gb-slots { grid-template-columns: repeat(3, 1fr); }
      .gb-doc-right { min-width: 56px; }
    }
    @media (max-width: 360px) {
      .gb-step-label { font-size: 10px; }
      .gb-step { min-width: 60px; }
      .gb-slots { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class GuestBookingComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly i18n = inject(I18nService);
  readonly locationService = inject(LocationService);
  private readonly geo = inject(GeographyService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly signupHandoff = inject(SignupHandoffService);
  private readonly router = inject(Router);

  // --------------- Step model ---------------
  readonly steps = [
    { idx: 0, label: 'Doctor' },
    { idx: 1, label: 'Date & Time' },
    { idx: 2, label: 'Your Details' },
    { idx: 3, label: 'Confirm' }
  ];
  readonly lastStepIdx = this.steps.length - 1;
  readonly currentStep = signal(0);

  // --------------- Doctor list state ---------------
  readonly searchQuery = signal('');
  readonly specialties = signal<string[]>([]);
  readonly selectedSpecialty = signal<string>('all');
  readonly doctors = signal<Doctor[]>([]);
  readonly loadingDoctors = signal(false);
  readonly selectedDoctor = signal<Doctor | null>(null);

  // --------------- Slot picker state ---------------
  readonly consultationMode = signal<ConsultationMode>('in_person');
  readonly selectedDate = signal<string>(this.todayIso());
  readonly selectedSlot = signal<BookingSlot | null>(null);

  // --------------- Details state ---------------
  readonly guest = signal<GuestPatient>({
    firstName: '', lastName: '', phone: '', email: ''
  });
  readonly guestCountryCode = signal('+973');
  readonly formAttempted = signal(false);

  readonly countryCodes = [
    { code: '+973', country: 'Bahrain' },
    { code: '+91',  country: 'India' },
    { code: '+1',   country: 'USA' },
    { code: '+44',  country: 'UK' },
    { code: '+971', country: 'UAE' },
    { code: '+966', country: 'Saudi Arabia' },
    { code: '+965', country: 'Kuwait' },
    { code: '+974', country: 'Qatar' },
    { code: '+968', country: 'Oman' }
  ];

  // --------------- Confirm + success state ---------------
  readonly visitReason = signal('');
  readonly booking = signal(false);
  readonly bookingResult = signal<GuestBookingResult | null>(null);

  // --------------- Auto-account post-booking ---------------
  readonly newPassword = signal('');
  readonly showPwd = signal(false);
  readonly passwordSet = signal(false);

  ngOnInit(): void {
    this.loadingDoctors.set(true);
    this.api.getSpecialties().subscribe(specs => this.specialties.set(specs));
    this.api.getDoctors().subscribe(docs => {
      this.doctors.set(docs);
      this.loadingDoctors.set(false);
    });
  }

  // --------------- Step navigation ---------------

  stepHint = computed(() => {
    switch (this.currentStep()) {
      case 0: return 'Pick a doctor';
      case 1: return 'Choose date & time';
      case 2: return 'Your details';
      case 3: return 'Review and confirm';
      default: return 'A quick, easy way to book your appointment';
    }
  });

  topBackLabel = computed(() =>
    this.currentStep() === 0 ? 'Leave booking' : 'Back to previous step'
  );

  onTopBack(): void {
    if (this.bookingResult()) {
      // From success: bounce home
      this.router.navigate(['/']);
      return;
    }
    if (this.currentStep() === 0) {
      // From doctor list: leave the flow
      this.router.navigate(['/']);
      return;
    }
    this.currentStep.update(s => Math.max(0, s - 1));
  }

  canContinue = computed(() => {
    switch (this.currentStep()) {
      case 0: return !!this.selectedDoctor();
      case 1: return !!this.selectedSlot() && !!this.selectedDate();
      case 2: return this.isGuestValid();
      case 3: return true;
      default: return false;
    }
  });

  onContinue(): void {
    const step = this.currentStep();
    if (step === 2) {
      this.formAttempted.set(true);
      if (!this.isGuestValid()) return;
    }
    if (step === this.lastStepIdx) {
      this.confirmBooking();
      return;
    }
    if (!this.canContinue()) return;
    this.currentStep.set(step + 1);
  }

  // --------------- Doctor selection ---------------

  setSpecialty(spec: string): void { this.selectedSpecialty.set(spec); }

  selectDoctor(doc: Doctor): void {
    this.selectedDoctor.set(doc);
    this.selectedSlot.set(null);
    // Bump immediately to step 2 — Puja's preference is one-tap flow.
    this.currentStep.set(1);
  }

  readonly filteredDoctors = computed(() => {
    const spec = this.selectedSpecialty();
    const q = this.searchQuery().trim().toLowerCase();
    let list = this.doctors();
    if (spec !== 'all') list = list.filter(d => d.specialty === spec);
    if (q) {
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q)
      );
    }
    return list;
  });

  // --------------- Slot picker ---------------

  setMode(mode: ConsultationMode): void {
    this.consultationMode.set(mode);
    this.selectedSlot.set(null);
  }

  selectDate(date: string): void {
    this.selectedDate.set(date);
    this.selectedSlot.set(null);
  }

  readonly dateOptions = computed<DateOption[]>(() => {
    const opts: DateOption[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = this.toIso(d);
      let label: string;
      if (i === 0) label = 'TODAY';
      else if (i === 1) label = 'TOMORROW';
      else label = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      opts.push({
        date: iso,
        dayLabel: label,
        dayNum: d.getDate().toString().padStart(2, '0')
      });
    }
    return opts;
  });

  readonly currentSlots = computed<BookingSlot[]>(() => {
    const doc = this.selectedDoctor();
    const date = this.selectedDate();
    if (!doc || !date) return [];
    return this.generateSlots(doc.id, date);
  });

  readonly morningSlots = computed(() =>
    this.currentSlots().filter(s => this.periodOf(s.time) === 'morning')
  );
  readonly afternoonSlots = computed(() =>
    this.currentSlots().filter(s => this.periodOf(s.time) === 'afternoon')
  );
  readonly eveningSlots = computed(() =>
    this.currentSlots().filter(s => this.periodOf(s.time) === 'evening')
  );

  readonly currentFee = computed(() => {
    const doc = this.selectedDoctor();
    if (!doc) return 0;
    return this.consultationMode() === 'video'
      ? this.videoConsultFee(doc)
      : doc.consultationFee;
  });

  // --------------- Details validation ---------------

  updateGuest(field: keyof GuestPatient, value: string): void {
    this.guest.update(g => ({ ...g, [field]: value }));
  }

  onPhoneInput(value: string): void {
    const digits = (value || '').replace(/\D/g, '').slice(0, 10);
    this.updateGuest('phone', digits);
  }

  readonly firstNameError = computed(() => {
    if (!this.formAttempted()) return '';
    const v = (this.guest().firstName || '').trim();
    if (v.length === 0) return 'First name is required';
    if (v.length > 60) return 'Maximum 60 characters';
    return '';
  });
  readonly lastNameError = computed(() => {
    if (!this.formAttempted()) return '';
    const v = (this.guest().lastName || '').trim();
    if (v.length === 0) return 'Last name is required';
    if (v.length > 60) return 'Maximum 60 characters';
    return '';
  });
  readonly phoneError = computed(() => {
    if (!this.formAttempted()) return '';
    const v = (this.guest().phone || '').replace(/\D/g, '');
    if (v.length === 0) return 'Mobile number is required';
    if (v.length !== 10) return 'Mobile number must be exactly 10 digits';
    return '';
  });
  readonly emailError = computed(() => {
    if (!this.formAttempted()) return '';
    const v = (this.guest().email || '').trim();
    if (v.length === 0) return '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address';
    return '';
  });

  readonly isGuestValid = computed(() => {
    const g = this.guest();
    const fn = (g.firstName || '').trim();
    const ln = (g.lastName || '').trim();
    const ph = (g.phone || '').replace(/\D/g, '');
    const em = (g.email || '').trim();
    return fn.length > 0 && fn.length <= 60 &&
           ln.length > 0 && ln.length <= 60 &&
           ph.length === 10 &&
           (em.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em));
  });

  // --------------- Booking + success ---------------

  confirmBooking(): void {
    const slot = this.selectedSlot();
    if (!slot) return;
    this.booking.set(true);
    this.api.bookGuestAppointment(this.guest(), slot, this.visitReason()).subscribe({
      next: (result) => {
        this.bookingResult.set(result);
        this.booking.set(false);
        this.snackBar.open('Appointment booked', 'Close', { duration: 4000 });
      },
      error: () => {
        this.booking.set(false);
        this.snackBar.open('Could not book — please try again', 'Close', { duration: 4000 });
      }
    });
  }

  resetBooking(): void {
    this.currentStep.set(0);
    this.selectedDoctor.set(null);
    this.selectedSlot.set(null);
    this.selectedDate.set(this.todayIso());
    this.consultationMode.set('in_person');
    this.visitReason.set('');
    this.bookingResult.set(null);
    this.guest.set({ firstName: '', lastName: '', phone: '', email: '' });
    this.formAttempted.set(false);
    this.newPassword.set('');
    this.showPwd.set(false);
    this.passwordSet.set(false);
  }

  // --------------- Auto-account / sign-in handoff ---------------

  /**
   * After booking, the portal has the patient's name + phone, so we
   * mint a lightweight account for them. Setting a password completes
   * the account so they can sign in straight away.
   */
  setPassword(): void {
    if (this.newPassword().length < 6) return;
    this.passwordSet.set(true);
    // No prefill yet — the handoff to the shell happens only when the
    // user actually taps "Sign in now", so we don't pre-arm it here.
    this.snackBar.open(
      'Password set. You can now sign in.',
      'Close',
      { duration: 4000 }
    );
  }

  goToSignIn(): void {
    this.prefillSignupHandoff('signin');
    // Reset to the landing page; LocationService.setLocation(null)
    // bounces the user through the landing → location-picker step
    // and then the shell's handoff effect lands them on the Sign In card.
    this.locationService.setLocation(null);
    this.router.navigate(['/']);
  }

  private prefillSignupHandoff(mode: 'create' | 'signin' = 'create'): void {
    const g = this.guest();
    const phone = (g.phone || '').replace(/\D/g, '');
    this.signupHandoff.setPrefill({
      firstName: g.firstName,
      lastName: g.lastName,
      cpr: '',
      phone: phone ? `${this.guestCountryCode()}${phone}` : '',
      email: g.email,
      mode
    });
  }

  // --------------- Formatters / synthesized data ---------------

  formatCurrency(amount: number): string {
    const config = this.geo.config();
    return new Intl.NumberFormat(config.locale, {
      style: 'currency', currency: config.currency, minimumFractionDigits: 2
    }).format(amount);
  }

  specialtyIcon(specialty: string): string {
    const map: Record<string, string> = {
      all: 'apps',
      Cardiology: 'favorite',
      Dermatology: 'face',
      'General Medicine': 'medical_services',
      Endocrinology: 'bloodtype',
      Orthopedics: 'accessibility_new',
      ENT: 'hearing',
      Pulmonology: 'air',
      Pediatrics: 'child_care',
      Neurology: 'psychology',
      Radiology: 'image_search'
    };
    return map[specialty] ?? 'medical_services';
  }

  videoConsultFee(doctor: Doctor): number {
    return Math.max(5, Math.round((doctor.consultationFee * 0.6) / 5) * 5);
  }

  nextInPersonSlot(doctor: Doctor): string {
    const n = parseInt(doctor.id.replace(/\D/g, ''), 10) || 0;
    const offset = n % 4;
    const hour = 9 + (n % 8);
    const minute = (n % 2) * 30;
    return this.formatSlotLabel(offset, hour, minute);
  }

  nextVideoSlot(doctor: Doctor): string {
    const n = parseInt(doctor.id.replace(/\D/g, ''), 10) || 0;
    const offset = (n + 1) % 4;
    const hour = 13 + (n % 6);
    const minute = ((n + 1) % 2) * 30;
    return this.formatSlotLabel(offset, hour, minute);
  }

  doctorDesignation(doctor: Doctor | null): string {
    if (!doctor) return '';
    const n = parseInt(doctor.id.replace(/\D/g, ''), 10) || 0;
    const labels = ['Consultant', 'Senior Consultant', 'Specialist', 'Surgeon'];
    return labels[n % labels.length];
  }

  // --------------- Time helpers ---------------

  private todayIso(): string { return this.toIso(new Date()); }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatTime(h: number, m: number): string {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return `${hr.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  private formatSlotLabel(daysFromToday: number, h: number, m: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    const time = this.formatTime(h, m);
    if (daysFromToday === 0) return `Today, ${time}`;
    if (daysFromToday === 1) return `Tomorrow, ${time}`;
    return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}, ${time}`;
  }

  private periodOf(time: string): SlotPeriod {
    const [hm, ampm] = time.split(' ');
    let h = parseInt(hm.split(':')[0], 10);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  private generateSlots(doctorId: string, date: string): BookingSlot[] {
    const baseTimes: Array<{ h: number; m: number }> = [
      { h: 9, m: 0 }, { h: 9, m: 30 }, { h: 10, m: 0 }, { h: 10, m: 30 },
      { h: 11, m: 0 }, { h: 11, m: 30 },
      { h: 13, m: 0 }, { h: 13, m: 30 }, { h: 14, m: 0 }, { h: 14, m: 30 },
      { h: 15, m: 0 }, { h: 15, m: 30 }, { h: 16, m: 0 }, { h: 16, m: 30 },
      { h: 17, m: 0 }, { h: 17, m: 30 }, { h: 18, m: 0 }
    ];
    return baseTimes.map((t, i) => ({
      id: `${doctorId}-${date}-${t.h}-${t.m}`,
      date,
      time: this.formatTime(t.h, t.m),
      available: this.slotAvailable(doctorId, date, i),
      doctorId
    }));
  }

  private slotAvailable(doctorId: string, date: string, index: number): boolean {
    const s = `${doctorId}-${date}-${index}`;
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 10 > 2;
  }
}
