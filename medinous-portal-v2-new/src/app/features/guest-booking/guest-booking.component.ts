import { Component, ChangeDetectionStrategy, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ApiService } from '../../core/services/api.service';
import { I18nService } from '../../core/services/i18n.service';
import { LocationService } from '../../core/services/location.service';
import { SignupHandoffService } from '../../core/services/signup-handoff.service';
import { Doctor, BookingSlot, GuestPatient, GuestBookingResult, ClinicLocation } from '../../core/models/patient.model';

@Component({
  selector: 'app-guest-booking',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatStepperModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDividerModule,
    SkeletonCardComponent, TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="guest-container" [class.rtl]="i18n.isRtl()">

      <!-- Header — compact, left-aligned -->
      <div class="guest-header">
        <div class="head-icon"><mat-icon>bolt</mat-icon></div>
        <div class="head-text">
          <h1>Quick Booking</h1>
          <p class="subtitle">A quick, easy way to book your appointment</p>
        </div>
      </div>

      @if (!bookingResult()) {
        <mat-stepper [linear]="true" #stepper [selectedIndex]="currentStep()">
          <!-- Step 1: Select Location -->
          <mat-step [completed]="!!selectedLocation()">
            <ng-template matStepLabel>{{ 'location.select' | translate }}</ng-template>
            <div class="step-content">
              <div class="locations-grid">
                @for (loc of locationService.locations; track loc.id) {
                  <mat-card class="location-card"
                            [class.selected]="selectedLocation()?.id === loc.id"
                            (click)="selectLocation(loc)">
                    <div class="loc-icon">
                      <mat-icon>local_hospital</mat-icon>
                    </div>
                    <div class="loc-info">
                      <strong>{{ loc.name }}</strong>
                      <span class="loc-address">{{ loc.address }}, {{ loc.city }}</span>
                      <div class="loc-meta">
                        <span><mat-icon class="tiny-icon">schedule</mat-icon>{{ loc.operatingHours }}</span>
                        <span class="meta-dot">·</span>
                        <span><mat-icon class="tiny-icon">phone</mat-icon>{{ loc.phone }}</span>
                      </div>
                      <div class="loc-specialties">
                        @for (spec of loc.specialties.slice(0, 3); track spec) {
                          <span class="spec-chip">{{ spec }}</span>
                        }
                        @if (loc.specialties.length > 3) {
                          <span class="spec-chip more">+{{ loc.specialties.length - 3 }}</span>
                        }
                      </div>
                    </div>
                    @if (selectedLocation()?.id === loc.id) {
                      <mat-icon class="check-icon">check_circle</mat-icon>
                    }
                  </mat-card>
                }
              </div>
              <div class="step-actions sticky-actions">
                <div class="sticky-actions-inner">
                  <span class="step-spacer"></span>
                  <button mat-flat-button class="cta-primary"
                          [disabled]="!selectedLocation()"
                          (click)="goToStep(1)">
                    {{ 'appt.continue' | translate }} <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </mat-step>

          <!-- Step 2: Choose Doctor & Slot -->
          <mat-step [completed]="!!selectedSlot()">
            <ng-template matStepLabel>{{ 'appt.choose_doctor' | translate }}</ng-template>
            <div class="step-content">
              <mat-form-field appearance="outline" class="full-width compact-field">
                <mat-label>{{ 'appt.select_specialty' | translate }}</mat-label>
                <mat-select [value]="selectedSpecialty()" (selectionChange)="onSpecialtyChange($event.value)">
                  @for (spec of specialties(); track spec) {
                    <mat-option [value]="spec">{{ spec }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              @if (loadingDoctors()) {
                @for (i of [1,2]; track i) {
                  <app-skeleton-card [lines]="2" [showAvatar]="true" variant="compact" />
                }
              } @else {
                <div class="doctors-list">
                  @for (doctor of doctors(); track doctor.id) {
                    <mat-card class="doctor-card"
                              [class.selected]="selectedDoctor()?.id === doctor.id"
                              (click)="selectDoctor(doctor)">
                      <div class="doctor-avatar"><mat-icon>person</mat-icon></div>
                      <div class="doctor-info">
                        <strong>{{ doctor.name }}</strong>
                        <span class="doctor-specialty">{{ doctor.specialty }}</span>
                      </div>
                      @if (selectedDoctor()?.id === doctor.id) {
                        <mat-icon class="check-icon">check_circle</mat-icon>
                      }
                    </mat-card>
                  }
                </div>
              }

              @if (selectedDoctor()) {
                <h3 class="time-head">{{ 'appt.pick_time' | translate }}</h3>
                @if (loadingSlots()) {
                  <app-skeleton-card [lines]="2" />
                } @else {
                  <div class="slots-grid">
                    @for (slot of availableSlots(); track slot.id) {
                      <button class="slot-btn"
                              [class.selected]="selectedSlot()?.id === slot.id"
                              [disabled]="!slot.available"
                              (click)="selectedSlot.set(slot)">
                        {{ slot.time }}
                      </button>
                    }
                  </div>
                }
              }

              <div class="step-actions sticky-actions">
                <div class="sticky-actions-inner">
                  <button mat-stroked-button class="cta-back" (click)="goToStep(0)">
                    {{ 'appt.back' | translate }}
                  </button>
                  <span class="step-spacer"></span>
                  <button mat-flat-button class="cta-primary"
                          [disabled]="!selectedSlot()"
                          (click)="goToStep(2)">
                    {{ 'appt.continue' | translate }} <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </mat-step>

          <!-- Step 3: Enter Details -->
          <mat-step [completed]="isGuestValid()">
            <ng-template matStepLabel>{{ 'guest.your_details' | translate }}</ng-template>
            <div class="step-content">
              <div class="form-card">
                <div class="form-row">
                  <mat-form-field appearance="outline" class="half-width compact-field">
                    <mat-label>{{ 'guest.first_name' | translate }} <span class="req-star">*</span></mat-label>
                    <input matInput maxlength="60"
                           [ngModel]="guest().firstName"
                           (ngModelChange)="updateGuest('firstName', $event)">
                    @if (firstNameError()) {
                      <mat-error>{{ firstNameError() }}</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="half-width compact-field">
                    <mat-label>{{ 'guest.last_name' | translate }} <span class="req-star">*</span></mat-label>
                    <input matInput maxlength="60"
                           [ngModel]="guest().lastName"
                           (ngModelChange)="updateGuest('lastName', $event)">
                    @if (lastNameError()) {
                      <mat-error>{{ lastNameError() }}</mat-error>
                    }
                  </mat-form-field>
                </div>
                <div class="form-row phone-row">
                  <mat-form-field appearance="outline" class="compact-field gb-cc-field">
                    <mat-label>Code <span class="req-star">*</span></mat-label>
                    <mat-select [ngModel]="guestCountryCode()" (ngModelChange)="guestCountryCode.set($event)">
                      @for (cc of countryCodes; track cc.code) {
                        <mat-option [value]="cc.code">{{ cc.code }} · {{ cc.country }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="compact-field gb-phone-field">
                    <mat-label>{{ 'guest.phone' | translate }} <span class="req-star">*</span></mat-label>
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
                <div class="form-row">
                  <mat-form-field appearance="outline" class="full-width compact-field">
                    <mat-label>{{ 'guest.email' | translate }} (optional)</mat-label>
                    <input matInput type="email"
                           [ngModel]="guest().email"
                           (ngModelChange)="updateGuest('email', $event)">
                    <mat-icon matPrefix>email</mat-icon>
                    @if (emailError()) {
                      <mat-error>{{ emailError() }}</mat-error>
                    }
                  </mat-form-field>
                </div>
                <div class="form-row">
                  <mat-form-field appearance="outline" class="half-width compact-field">
                    <mat-label>{{ 'guest.id_type' | translate }} (optional)</mat-label>
                    <mat-select [ngModel]="guest().idType" (ngModelChange)="updateGuest('idType', $event)">
                      <mat-option value="national_id">National ID / Patient ID</mat-option>
                      <mat-option value="passport">Passport</mat-option>
                      <mat-option value="driving_license">Driving License</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="half-width compact-field">
                    <mat-label>{{ 'guest.id_number' | translate }} (optional)</mat-label>
                    <input matInput [ngModel]="guest().idNumber" (ngModelChange)="updateGuest('idNumber', $event)">
                  </mat-form-field>
                </div>
              </div>
              <div class="step-actions sticky-actions">
                <div class="sticky-actions-inner">
                  <button mat-stroked-button class="cta-back" (click)="goToStep(1)">
                    {{ 'appt.back' | translate }}
                  </button>
                  <span class="step-spacer"></span>
                  <button mat-flat-button class="cta-primary"
                          (click)="onContinueDetails()">
                    {{ 'appt.continue' | translate }} <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </mat-step>

          <!-- Step 4: Confirm Booking -->
          <mat-step>
            <ng-template matStepLabel>{{ 'appt.confirm' | translate }}</ng-template>
            <div class="step-content">
              <div class="confirm-card">
                <h3 class="confirm-title">{{ 'appt.summary' | translate }}</h3>

                <!-- Visit block -->
                <div class="confirm-block">
                  <span class="block-label">Visit</span>
                  <div class="confirm-row">
                    <mat-icon>medical_services</mat-icon>
                    <span><strong>{{ selectedDoctor()?.name }}</strong> · {{ selectedDoctor()?.specialty }}</span>
                  </div>
                  <div class="confirm-row">
                    <mat-icon>event</mat-icon>
                    <span>{{ selectedSlot()?.date | date:'fullDate' }} · {{ selectedSlot()?.time }}</span>
                  </div>
                  <div class="confirm-row">
                    <mat-icon>location_on</mat-icon>
                    <span>{{ selectedLocation()?.name }}</span>
                  </div>
                </div>

                <!-- Patient block -->
                <div class="confirm-block">
                  <span class="block-label">Patient</span>
                  <div class="confirm-row">
                    <mat-icon>person</mat-icon>
                    <span>{{ guest().firstName }} {{ guest().lastName }}</span>
                  </div>
                  <div class="confirm-row">
                    <mat-icon>phone</mat-icon>
                    <span>{{ guest().phone }}</span>
                  </div>
                </div>

                <mat-form-field appearance="outline" class="full-width compact-field reason-field">
                  <mat-label>{{ 'appt.reason' | translate }} (optional)</mat-label>
                  <textarea matInput rows="2" [ngModel]="visitReason()" (ngModelChange)="visitReason.set($event)"></textarea>
                </mat-form-field>

                <div class="sms-notice">
                  <mat-icon>sms</mat-icon>
                  <span>SMS confirmation will be sent to <strong>{{ guest().phone }}</strong></span>
                </div>
              </div>

              <div class="step-actions sticky-actions">
                <div class="sticky-actions-inner">
                  <button mat-stroked-button class="cta-back" (click)="goToStep(2)">
                    {{ 'appt.back' | translate }}
                  </button>
                  <span class="step-spacer"></span>
                  <button mat-flat-button class="cta-primary"
                          [disabled]="booking()"
                          (click)="confirmBooking()">
                    @if (booking()) {
                      <mat-spinner diameter="18"></mat-spinner>
                    } @else {
                      <mat-icon>check</mat-icon>
                    }
                    @if (!booking()) {
                      <span>{{ 'appt.confirm_booking' | translate }}</span>
                    }
                  </button>
                </div>
              </div>
            </div>
          </mat-step>
        </mat-stepper>
      } @else {
        <!-- Success — polished, balanced -->
        <div class="success-shell">
          <div class="success-icon-wrap">
            <mat-icon>check_circle</mat-icon>
          </div>
          <h2>You're all set!</h2>
          <p class="success-sub">{{ 'appt.booked' | translate }} — we look forward to seeing you.</p>

          <div class="success-summary">
            <div class="summary-row">
              <mat-icon>medical_services</mat-icon>
              <div>
                <strong>{{ bookingResult()!.appointment.doctorName }}</strong>
                <span>{{ selectedDoctor()?.specialty }}</span>
              </div>
            </div>
            <div class="summary-row">
              <mat-icon>event</mat-icon>
              <div>
                <strong>{{ bookingResult()!.appointment.date | date:'fullDate' }}</strong>
                <span>{{ bookingResult()!.appointment.time }}</span>
              </div>
            </div>
            <div class="summary-row">
              <mat-icon>location_on</mat-icon>
              <div>
                <strong>{{ selectedLocation()?.name }}</strong>
                <span>{{ selectedLocation()?.address }}</span>
              </div>
            </div>
          </div>

          <div class="success-cta">
            <p>Want to track this and more from one place?</p>
            <div class="success-actions">
              <button mat-flat-button class="cta-primary" (click)="goToCreateAccount()">
                <mat-icon>person_add</mat-icon>
                {{ 'guest.register' | translate }}
              </button>
              <button mat-stroked-button class="cta-back" (click)="resetBooking()">
                {{ 'appt.book_another' | translate }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .guest-container { max-width: 760px; margin: 0 auto; padding: 0 0 96px; }
    .guest-container.rtl { direction: rtl; text-align: right; }

    /* ===== HEADER ===== */
    .guest-header {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 10px; padding: 2px;
    }
    .head-icon {
      width: 34px; height: 34px; border-radius: 9px;
      background: linear-gradient(135deg, #0d8a8a 0%, #4db6ac 100%);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(13,138,138,0.20);
    }
    .head-icon mat-icon {
      color: white; font-size: 20px; width: 20px; height: 20px;
    }
    .head-text { display: flex; flex-direction: column; min-width: 0; }
    h1 {
      font-size: 20px; font-weight: 700; color: #1b3a4b; margin: 0;
      line-height: 1.2;
    }
    .subtitle {
      color: #6b7884; font-size: 12.5px; margin: 1px 0 0;
    }

    .step-content { padding: 6px 0 16px; }
    .full-width { width: 100%; }

    /* Required-field asterisk inside mat-label */
    .req-star { color: #d32f2f; font-weight: 600; margin-left: 2px; }

    /* ===== Compact form-field density ===== */
    ::ng-deep .compact-field .mat-mdc-form-field-subscript-wrapper {
      padding: 0 14px !important;
    }
    ::ng-deep .compact-field .mat-mdc-text-field-wrapper {
      padding-top: 0 !important; padding-bottom: 0 !important;
    }

    /* ===== LOCATIONS ===== */
    .locations-grid { display: flex; flex-direction: column; gap: 8px; }
    .location-card {
      padding: 10px 12px; display: flex; align-items: flex-start; gap: 10px;
      cursor: pointer; border: 1px solid #eef2f5 !important;
      border-radius: 10px !important;
      transition: all 0.15s;
      box-shadow: none !important;
    }
    .location-card:hover {
      border-color: #b2dfdb !important;
      background: #fafcfc;
    }
    .location-card.selected {
      border-color: #0d8a8a !important;
      background: #f5fafa;
      box-shadow: 0 1px 4px rgba(13,138,138,0.08) !important;
    }
    .loc-icon {
      width: 36px; height: 36px; border-radius: 9px;
      background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .loc-icon mat-icon {
      color: #0d8a8a; font-size: 20px; width: 20px; height: 20px;
    }
    .loc-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .loc-info strong {
      font-size: 13.5px; color: #1b3a4b; font-weight: 700;
    }
    .loc-address {
      font-size: 11.5px; color: #6b7884;
    }
    .loc-meta {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; color: #98a2ab;
      margin-top: 1px;
    }
    .loc-meta span { display: inline-flex; align-items: center; gap: 3px; }
    .meta-dot { color: #c8d0d8; }
    .tiny-icon { font-size: 12px !important; width: 12px !important; height: 12px !important; }
    .loc-specialties { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .spec-chip {
      display: inline-flex; align-items: center;
      padding: 2px 7px; border-radius: 5px;
      background: #f1f5f5; color: #5a8585;
      font-size: 10px; font-weight: 500;
      letter-spacing: 0.15px;
    }
    .spec-chip.more { background: #f4f6f8; color: #98a2ab; }
    .check-icon {
      color: #0d8a8a !important; flex-shrink: 0;
      font-size: 20px !important; width: 20px !important; height: 20px !important;
    }

    /* ===== DOCTORS ===== */
    .doctors-list { display: flex; flex-direction: column; gap: 6px; }
    .doctor-card {
      padding: 10px 12px; display: flex; align-items: center; gap: 10px;
      cursor: pointer; border: 1px solid #eef2f5 !important;
      border-radius: 10px !important;
      transition: all 0.15s;
      box-shadow: none !important;
    }
    .doctor-card:hover { border-color: #b2dfdb !important; background: #fafcfc; }
    .doctor-card.selected {
      border-color: #0d8a8a !important; background: #f5fafa;
      box-shadow: 0 1px 4px rgba(13,138,138,0.08) !important;
    }
    .doctor-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .doctor-avatar mat-icon { color: #0d8a8a; font-size: 20px; width: 20px; height: 20px; }
    .doctor-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
    .doctor-info strong { font-size: 13.5px; color: #1b3a4b; font-weight: 700; }
    .doctor-specialty { font-size: 11.5px; color: #0d8a8a; font-weight: 500; }

    /* ===== SLOTS ===== */
    .time-head {
      margin: 12px 0 6px; font-size: 13px; font-weight: 700; color: #1b3a4b;
    }
    .slots-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
      gap: 5px; margin-bottom: 4px;
    }
    .slot-btn {
      padding: 7px 6px; border-radius: 7px;
      border: 1px solid #e0e8e8; background: white;
      font-size: 12.5px; font-weight: 500; color: #1b3a4b;
      cursor: pointer; transition: all 0.15s;
      font-family: inherit;
    }
    .slot-btn:hover:not(:disabled) {
      border-color: #80cbc4; background: #f5fafa;
    }
    .slot-btn.selected {
      background: #0d8a8a; color: white; border-color: #0d8a8a;
      box-shadow: 0 2px 6px rgba(13,138,138,0.25);
    }
    .slot-btn:disabled {
      color: #c0c0c0; background: #fafafa; cursor: not-allowed;
    }

    /* ===== FORM CARD ===== */
    .form-card {
      padding: 12px 14px;
      background: white; border: 1px solid #eef2f5;
      border-radius: 10px;
    }
    .form-row { display: flex; gap: 10px; }
    .half-width { flex: 1; min-width: 0; }
    .phone-row { gap: 8px; }
    .gb-cc-field { width: 110px; flex-shrink: 0; }
    .gb-phone-field { flex: 1; min-width: 0; }
    @media (max-width: 480px) {
      .phone-row { flex-direction: column; gap: 0; }
      .gb-cc-field { width: 100%; }
    }

    /* ===== CONFIRM CARD ===== */
    .confirm-card {
      padding: 12px 14px;
      background: white; border: 1px solid #eef2f5;
      border-radius: 10px;
    }
    .confirm-title {
      margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #1b3a4b;
    }
    .confirm-block {
      padding: 8px 0; border-top: 1px solid #f0f4f4;
    }
    .confirm-block:first-of-type { border-top: none; padding-top: 0; }
    .block-label {
      display: block; margin-bottom: 4px;
      font-size: 10px; color: #98a2ab; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .confirm-details { display: flex; flex-direction: column; gap: 6px; }
    .confirm-row {
      display: flex; align-items: center; gap: 9px;
      font-size: 12.5px; color: #1b3a4b; padding: 2px 0;
    }
    .confirm-row mat-icon {
      color: #0d8a8a; font-size: 16px !important; width: 16px !important; height: 16px !important;
      flex-shrink: 0;
    }
    .confirm-row strong { color: #1b3a4b; font-weight: 700; }
    .reason-field { margin-top: 8px; }

    /* SMS notice — softer */
    .sms-notice {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px; margin-top: 8px;
      background: #e8f5f3; border-left: 3px solid #0d8a8a;
      border-radius: 6px;
      font-size: 11.5px; color: #1b3a4b; line-height: 1.45;
    }
    .sms-notice mat-icon {
      color: #0d8a8a; font-size: 14px !important; width: 14px !important; height: 14px !important;
      flex-shrink: 0;
    }
    .sms-notice strong { color: #0d8a8a; font-weight: 700; }

    /* ===== FIXED CTA BAR (always visible) ===== */
    .step-actions { /* outer is the fixed bar shell */ }
    .step-spacer { flex: 1; }
    .sticky-actions {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 50;
      background: white;
      border-top: 1px solid #e3ecec;
      padding: 10px 16px;
      box-shadow: 0 -2px 12px rgba(0,0,0,0.05);
    }
    .sticky-actions-inner {
      max-width: 760px; margin: 0 auto;
      display: flex; gap: 10px; align-items: center;
    }
    .cta-primary {
      padding: 0 18px !important; height: 40px !important;
      background: #0d8a8a !important; color: white !important;
      font-weight: 600 !important; font-size: 14px !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(13,138,138,0.25) !important;
      display: inline-flex !important; align-items: center; gap: 6px;
    }
    .cta-primary:disabled {
      background: #b2dfdb !important; box-shadow: none !important;
    }
    .cta-primary mat-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
    }
    .cta-back {
      padding: 0 16px !important; height: 40px !important;
      border-color: #d8e3e3 !important; color: #6b7884 !important;
      font-weight: 600 !important; font-size: 13px !important;
      border-radius: 8px !important;
    }

    /* ===== SUCCESS SHELL ===== */
    .success-shell {
      max-width: 440px; margin: 12px auto 0;
      padding: 22px 20px;
      background: white; border: 1px solid #eef2f5; border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.04);
    }
    .success-icon-wrap {
      width: 48px; height: 48px; border-radius: 50%;
      background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 10px;
      box-shadow: 0 4px 14px rgba(76,175,80,0.28);
    }
    .success-icon-wrap mat-icon {
      color: white; font-size: 28px !important; width: 28px !important; height: 28px !important;
    }
    .success-shell h2 {
      margin: 0 0 4px; color: #1b3a4b; font-size: 18px; font-weight: 700;
    }
    .success-sub {
      margin: 0 0 14px; color: #6b7884; font-size: 12.5px;
    }
    .success-summary {
      text-align: left;
      padding: 12px;
      background: #f8fafa; border-radius: 9px;
      display: flex; flex-direction: column; gap: 8px;
      margin-bottom: 14px;
    }
    .summary-row {
      display: flex; align-items: flex-start; gap: 10px;
    }
    .summary-row mat-icon {
      color: #0d8a8a; font-size: 16px !important; width: 16px !important; height: 16px !important;
      margin-top: 2px; flex-shrink: 0;
    }
    .summary-row div { display: flex; flex-direction: column; min-width: 0; }
    .summary-row strong { font-size: 12.5px; color: #1b3a4b; font-weight: 700; }
    .summary-row span { font-size: 11.5px; color: #6b7884; }

    .success-cta p {
      margin: 0 0 10px; font-size: 12.5px; color: #6b7884;
    }
    .success-actions {
      display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;
    }

    /* ===== STEPPER OVERRIDES (compact, teal) ===== */
    ::ng-deep .mat-stepper-horizontal { background: transparent; }
    ::ng-deep .mat-step-header { padding: 8px 14px !important; }
    ::ng-deep .mat-step-header .mat-step-icon-selected,
    ::ng-deep .mat-step-header .mat-step-icon-state-edit {
      background-color: #0d8a8a !important;
    }
    ::ng-deep .mat-step-label.mat-step-label-active { color: #0d8a8a; }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 600px) {
      .form-row { flex-direction: column; gap: 0; }
      .slots-grid { grid-template-columns: repeat(3, 1fr); }
      .sticky-actions { padding: 10px 12px; }
      h1 { font-size: 18px; }
      .subtitle { font-size: 12px; }
      .step-content { padding: 6px 0 12px; }
      .success-shell { padding: 20px 16px; }
    }
    @media (max-width: 480px) {
      .guest-container { padding: 0 4px 92px; }
      .form-card { padding: 12px; }
      .form-row { gap: 0; }
      .slot-btn { padding: 9px 5px; font-size: 12px; }
      .slots-grid { gap: 5px; }
      .head-icon { width: 30px; height: 30px; border-radius: 8px; }
      .head-icon mat-icon { font-size: 17px; width: 17px; height: 17px; }
      h1 { font-size: 17px; }
      .req-star { margin-left: 1px; }
      .confirm-card { padding: 12px; }
      .cta-back, .cta-primary { font-size: 13px !important; height: 38px !important; }
      .cta-primary { padding: 0 14px !important; }
    }
    @media (max-width: 380px) {
      .slots-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class GuestBookingComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly i18n = inject(I18nService);
  readonly locationService = inject(LocationService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly signupHandoff = inject(SignupHandoffService);
  private readonly router = inject(Router);

  readonly currentStep = signal(0);
  readonly selectedLocation = signal<ClinicLocation | null>(null);
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

  // Field-level errors (only after Continue is pressed)
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
    if (v.length === 0) return ''; // email is optional
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
  readonly specialties = signal<string[]>([]);
  readonly selectedSpecialty = signal('');
  readonly doctors = signal<Doctor[]>([]);
  readonly loadingDoctors = signal(false);
  readonly selectedDoctor = signal<Doctor | null>(null);
  readonly availableSlots = signal<BookingSlot[]>([]);
  readonly loadingSlots = signal(false);
  readonly selectedSlot = signal<BookingSlot | null>(null);
  readonly visitReason = signal('');
  readonly booking = signal(false);
  readonly bookingResult = signal<GuestBookingResult | null>(null);

  ngOnInit(): void {
    this.api.getSpecialties().subscribe(specs => this.specialties.set(specs));
    const currentLoc = this.locationService.selectedLocation();
    if (currentLoc) {
      this.selectedLocation.set(currentLoc);
    }
  }

  selectLocation(loc: ClinicLocation): void {
    this.selectedLocation.set(loc);
  }

  updateGuest(field: keyof GuestPatient, value: string): void {
    this.guest.update(g => ({ ...g, [field]: value }));
  }

  onPhoneInput(value: string): void {
    const digits = (value || '').replace(/\D/g, '').slice(0, 10);
    this.updateGuest('phone', digits);
  }

  onContinueDetails(): void {
    this.formAttempted.set(true);
    if (this.isGuestValid()) {
      this.goToStep(3);
    }
  }

  onSpecialtyChange(specialty: string): void {
    this.selectedSpecialty.set(specialty);
    this.selectedDoctor.set(null);
    this.selectedSlot.set(null);
    this.loadingDoctors.set(true);
    this.api.getDoctors(specialty).subscribe(docs => {
      this.doctors.set(docs);
      this.loadingDoctors.set(false);
    });
  }

  selectDoctor(doctor: Doctor): void {
    this.selectedDoctor.set(doctor);
    this.selectedSlot.set(null);
    this.loadingSlots.set(true);
    this.api.getAvailableSlots(doctor.id, doctor.nextAvailable).subscribe(slots => {
      this.availableSlots.set(slots.filter(s => s.available));
      this.loadingSlots.set(false);
    });
  }

  goToStep(step: number): void {
    this.currentStep.set(step);
  }

  confirmBooking(): void {
    const slot = this.selectedSlot();
    if (!slot) return;
    this.booking.set(true);
    this.api.bookGuestAppointment(this.guest(), slot, this.visitReason()).subscribe({
      next: (result) => {
        this.bookingResult.set(result);
        this.booking.set(false);
        this.snackBar.open(this.i18n.t('appt.booked'), this.i18n.t('common.close'), { duration: 4000 });
      },
      error: () => {
        this.booking.set(false);
        this.snackBar.open(this.i18n.t('common.error'), this.i18n.t('common.close'), { duration: 4000 });
      }
    });
  }

  resetBooking(): void {
    this.currentStep.set(0);
    this.selectedDoctor.set(null);
    this.selectedSlot.set(null);
    this.visitReason.set('');
    this.bookingResult.set(null);
    this.guest.set({ firstName: '', lastName: '', phone: '', email: '' });
  }

  goToCreateAccount(): void {
    const g = this.guest();
    const phoneDigits = (g.phone || '').replace(/\D/g, '');
    this.signupHandoff.setPrefill({
      firstName: g.firstName,
      lastName: g.lastName,
      cpr: g.idType === 'national_id' ? (g.idNumber || '') : '',
      phone: phoneDigits ? `${this.guestCountryCode()}${phoneDigits}` : '',
      email: g.email
    });
    this.locationService.setLocation(null);
    this.router.navigate(['/']);
  }
}
