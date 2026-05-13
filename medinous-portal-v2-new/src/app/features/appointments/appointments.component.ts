import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { ApiService } from '../../core/services/api.service';
import { GeographyService } from '../../core/services/geography.service';
import { Doctor, BookingSlot, Appointment } from '../../core/models/patient.model';

type BookingPhase = 'find' | 'detail' | 'success';
type PaymentMethod = 'pay_at_hospital' | 'pay_now';
type SlotPeriod = 'morning' | 'afternoon' | 'evening';
type ConsultationMode = 'in_person' | 'video';

interface CalendarCell {
  date: string;       // ISO yyyy-mm-dd
  day: number;
  inMonth: boolean;
  isPast: boolean;
}

interface DateOption {
  date: string;       // ISO yyyy-mm-dd
  dayLabel: string;   // TODAY / TOMORROW / MON / TUE...
  dayNum: string;     // 06
  monthName: string;  // May
  year: number;       // 2026
}

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatDividerModule, MatChipsModule, MatMenuModule, MatDialogModule, SkeletonCardComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="booking-shell">

      <!-- ============================================ -->
      <!--  PHASE 1: FIND YOUR DOCTOR                    -->
      <!-- ============================================ -->
      @if (bookingPhase() === 'find') {
        <div class="booking-content">
          <div class="page-head">
            <h1>Find Your Doctor</h1>
            <p class="subtitle">Pick a specialist to book your visit</p>
          </div>

          <!-- Search bar -->
          <div class="filter-row">
            <div class="search-wrap">
              <mat-icon class="s-icon">search</mat-icon>
              <input class="s-input"
                     [ngModel]="searchQuery()"
                     (ngModelChange)="searchQuery.set($event)"
                     placeholder="Search doctor by name...">
              @if (searchQuery()) {
                <button mat-icon-button class="s-clear" (click)="searchQuery.set('')" aria-label="Clear search">
                  <mat-icon>close</mat-icon>
                </button>
              }
            </div>
          </div>

          <!-- Specialty tabs (horizontal scrollable) -->
          <div class="specialty-tabs">
            <button class="spec-tab"
                    [class.active]="selectedSpecialty() === 'all'"
                    (click)="setSpecialty('all')">
              <mat-icon>apps</mat-icon>
              All
            </button>
            @for (s of specialties(); track s) {
              <button class="spec-tab"
                      [class.active]="selectedSpecialty() === s"
                      (click)="setSpecialty(s)">
                <mat-icon>{{ specialtyIcon(s) }}</mat-icon>
                {{ s }}
              </button>
            }
          </div>

          @if (loadingDoctors()) {
            @for (i of [1,2,3]; track i) {
              <app-skeleton-card [lines]="2" [showAvatar]="true" variant="compact" />
            }
          } @else {
            <div class="doctors-list">
              @for (doc of filteredDoctors(); track doc.id) {
                <div class="doc-row" (click)="selectDoctor(doc)">
                  <div class="doc-left">
                    <div class="doc-avatar"><mat-icon>person</mat-icon></div>
                    <button class="view-profile-cta" (click)="openProfile(doc, $event)">
                      View Profile <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                    </button>
                  </div>

                  <div class="doc-body">
                    <strong class="doc-name">{{ doc.name }}</strong>
                    <span class="doc-specialty">
                      <mat-icon class="spec-inline-icon">{{ specialtyIcon(doc.specialty) }}</mat-icon>
                      {{ doc.specialty }}
                    </span>

                    <div class="next-avail-wrap">
                      <span class="next-avail-label">Next available at</span>
                      <div class="avail-chips">
                        <span class="avail-chip in-person">
                          <mat-icon>local_hospital</mat-icon>
                          {{ nextInPersonSlot(doc) }}
                        </span>
                        <span class="avail-chip video">
                          <mat-icon>videocam</mat-icon>
                          {{ nextVideoSlot(doc) }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="doc-right">
                    <strong class="fee-onwards">{{ formatCurrency(videoConsultFee(doc)) }} onwards</strong>
                    <mat-icon class="row-chevron">chevron_right</mat-icon>
                  </div>
                </div>
              }
              @if (!filteredDoctors().length) {
                <div class="empty-state">
                  <mat-icon>search_off</mat-icon>
                  <p>No records</p>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- ============================================ -->
      <!--  PHASE 2: BOOKING DETAIL (date + time + pay)  -->
      <!-- ============================================ -->
      @else if (bookingPhase() === 'detail') {
        <div class="booking-content detail-content">
          <a class="back-link" (click)="goBackToFind()">
            <mat-icon>arrow_back</mat-icon> Back to doctors
          </a>

          <!-- Doctor summary header -->
          @if (selectedDoctor(); as doc) {
            <div class="sticky-doc-header">
              <div class="doc-avatar"><mat-icon>person</mat-icon></div>
              <div class="sdh-body">
                <strong class="doc-name">{{ doc.name }}</strong>
                <span class="sdh-meta">
                  <mat-icon class="spec-inline-icon">{{ specialtyIcon(doc.specialty) }}</mat-icon>
                  {{ doctorDesignation(doc) }} <span class="sdh-sep">|</span> {{ doc.specialty }}
                </span>
              </div>
              <div class="sdh-fee">
                <strong>{{ formatCurrency(currentFee()) }}</strong>
                <span>{{ consultationMode() === 'video' ? 'Video' : 'In-person' }}</span>
              </div>
            </div>
          }

          <!-- Consultation mode tabs -->
          <div class="mode-tabs">
            <button class="mode-tab"
                    [class.active]="consultationMode() === 'in_person'"
                    (click)="setConsultationMode('in_person')">
              <mat-icon>local_hospital</mat-icon>
              Hospital Visit
            </button>
            <button class="mode-tab video"
                    [class.active]="consultationMode() === 'video'"
                    (click)="setConsultationMode('video')">
              <mat-icon>videocam</mat-icon>
              Video Consult
            </button>
          </div>

          <!-- Date selector -->
          <section class="section">
            <div class="section-head">
              <span class="head-left">
                <mat-icon>event</mat-icon>
                <h3>Select Date</h3>
              </span>
              <button class="calendar-btn" (click)="openCalendar()">
                <mat-icon>calendar_month</mat-icon>
                Pick Date
              </button>
            </div>
            <div class="date-strip compact">
              @for (d of dateOptions(); track d.date) {
                <button class="date-pill compact"
                        [class.active]="selectedDate() === d.date"
                        (click)="selectDate(d.date)">
                  <span class="date-pill-num">{{ d.dayNum }}</span>
                  <span class="date-pill-label">{{ d.dayLabel.substring(0, 3) }}</span>
                </button>
              }
            </div>
          </section>

          <!-- Time slots -->
          <section class="section">
            <div class="section-head">
              <span class="head-left">
                <mat-icon>schedule</mat-icon>
                <h3>Available Time</h3>
              </span>
            </div>

            @if (morningSlots().length) {
              <h4 class="period-label">
                <mat-icon class="period-icon morning">wb_sunny</mat-icon>
                Morning
              </h4>
              <div class="slots-grid tight">
                @for (slot of morningSlots(); track slot.id) {
                  <button class="slot-pill"
                          [class.selected]="selectedSlot()?.id === slot.id"
                          [disabled]="!slot.available"
                          (click)="selectSlot(slot)">{{ slot.time }}</button>
                }
              </div>
            }

            @if (afternoonSlots().length) {
              <h4 class="period-label">
                <mat-icon class="period-icon afternoon">wb_twilight</mat-icon>
                Afternoon
              </h4>
              <div class="slots-grid tight">
                @for (slot of afternoonSlots(); track slot.id) {
                  <button class="slot-pill"
                          [class.selected]="selectedSlot()?.id === slot.id"
                          [disabled]="!slot.available"
                          (click)="selectSlot(slot)">{{ slot.time }}</button>
                }
              </div>
            }

            @if (eveningSlots().length) {
              <h4 class="period-label">
                <mat-icon class="period-icon evening">dark_mode</mat-icon>
                Evening
              </h4>
              <div class="slots-grid tight">
                @for (slot of eveningSlots(); track slot.id) {
                  <button class="slot-pill"
                          [class.selected]="selectedSlot()?.id === slot.id"
                          [disabled]="!slot.available"
                          (click)="selectSlot(slot)">{{ slot.time }}</button>
                }
              </div>
            }
          </section>

          <!-- Payment Method (compact) -->
          <section class="section">
            <div class="section-head">
              <span class="head-left">
                <mat-icon>credit_card</mat-icon>
                <h3>Payment Method</h3>
              </span>
            </div>

            <div class="pay-row">
              <label class="pay-card compact" [class.selected]="paymentMethod() === 'pay_at_hospital'">
                <input type="radio" name="pm" value="pay_at_hospital"
                       [checked]="paymentMethod() === 'pay_at_hospital'"
                       (change)="paymentMethod.set('pay_at_hospital')">
                <mat-icon class="pay-icon">local_hospital</mat-icon>
                <div class="pay-text">
                  <strong>Pay at Hospital</strong>
                  <span>Pay during your visit</span>
                </div>
              </label>

              <label class="pay-card compact" [class.selected]="paymentMethod() === 'pay_now'">
                <input type="radio" name="pm" value="pay_now"
                       [checked]="paymentMethod() === 'pay_now'"
                       (change)="paymentMethod.set('pay_now')">
                <mat-icon class="pay-icon">payment</mat-icon>
                <div class="pay-text">
                  <strong>Pay Now</strong>
                  <span>Pay securely online</span>
                </div>
              </label>
            </div>
          </section>

          <!-- Reason (optional) -->
          <section class="section reason-section">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Reason for visit (optional)</mat-label>
              <textarea matInput rows="2"
                        [ngModel]="visitReason()"
                        (ngModelChange)="visitReason.set($event)"
                        placeholder="Briefly describe your symptoms"></textarea>
            </mat-form-field>
          </section>
        </div>

        <!-- Fixed bottom booking bar -->
        <div class="booking-bar">
          <div class="booking-bar-inner">
            <div class="bar-info">
              <strong class="bar-fee">{{ formatCurrency(currentFee()) }}</strong>
              @if (selectedSlot() && selectedDate()) {
                <span class="bar-meta">
                  {{ selectedDate() | date:'d MMM' }} · {{ selectedSlot()?.time }}
                </span>
              } @else {
                <span class="bar-meta hint">Select a time slot</span>
              }
            </div>
            <button mat-flat-button class="confirm-btn"
                    [disabled]="!selectedSlot() || booking()"
                    (click)="openConfirmModal()">
              @if (booking()) {
                <mat-spinner diameter="18" class="cta-spin"></mat-spinner>
              } @else {
                Confirm Appointment <mat-icon iconPositionEnd>arrow_forward</mat-icon>
              }
            </button>
          </div>
        </div>

        <!-- Calendar picker modal/bottom-sheet -->
        @if (calendarOpen()) {
          <div class="cal-backdrop" (click)="closeCalendar()"></div>
          <div class="cal-sheet" role="dialog" aria-modal="true">
            <div class="cal-grabber" aria-hidden="true"></div>
            <div class="cal-head">
              <button mat-icon-button class="cal-nav" (click)="calendarPrev()" aria-label="Previous month">
                <mat-icon>chevron_left</mat-icon>
              </button>
              <strong class="cal-month">{{ calendarMonthLabel() }}</strong>
              <button mat-icon-button class="cal-nav" (click)="calendarNext()" aria-label="Next month">
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
            <div class="cal-weekdays">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>
            <div class="cal-grid">
              @for (cell of calendarDays(); track cell.date) {
                <button class="cal-day"
                        [class.in-month]="cell.inMonth"
                        [class.past]="cell.isPast"
                        [class.selected]="cell.date === selectedDate() && cell.inMonth"
                        [disabled]="cell.isPast"
                        (click)="selectFromCalendar(cell)">
                  {{ cell.day }}
                </button>
              }
            </div>
            <button mat-stroked-button class="cal-close" (click)="closeCalendar()">Close</button>
          </div>
        }

      }

      <!-- ============================================ -->
      <!--  PHASE 3: SUCCESS                              -->
      <!-- ============================================ -->
      @else if (bookingPhase() === 'success') {
        <div class="success-card">
          <mat-icon class="success-icon">check_circle</mat-icon>
          <h2>Appointment Booked!</h2>
          <p class="success-subtitle">
            @if (paymentMethod() === 'pay_now') {
              Payment of <strong>{{ formatCurrency(selectedDoctor()?.consultationFee ?? 0) }}</strong> received successfully.
            } @else {
              Please pay at the hospital reception before your consultation.
            }
          </p>

          <div class="success-summary">
            <div class="summary-row">
              <mat-icon>person</mat-icon>
              <span>{{ bookedAppointment()!.doctorName }}</span>
            </div>
            <div class="summary-row">
              <mat-icon>medical_services</mat-icon>
              <span>{{ bookedAppointment()!.specialty }}</span>
            </div>
            <div class="summary-row">
              <mat-icon>event</mat-icon>
              <span>{{ bookedAppointment()!.date | date:'fullDate' }} at {{ bookedAppointment()!.time }}</span>
            </div>
            <div class="summary-row">
              <mat-icon>location_on</mat-icon>
              <span>{{ selectedDoctor()?.location }}</span>
            </div>
            <mat-divider></mat-divider>
            <div class="summary-row">
              <mat-icon>{{ paymentMethod() === 'pay_now' ? 'check_circle' : 'schedule' }}</mat-icon>
              <span>Consultation Fee</span>
              <strong class="summary-fee">{{ formatCurrency(selectedDoctor()?.consultationFee ?? 0) }}</strong>
            </div>
            <div class="summary-row">
              <mat-icon>{{ paymentMethod() === 'pay_now' ? 'verified' : 'pending' }}</mat-icon>
              <span>Payment</span>
              <strong [class.paid]="paymentMethod() === 'pay_now'" [class.pending]="paymentMethod() === 'pay_at_hospital'">
                {{ paymentMethod() === 'pay_now' ? 'Paid online' : 'Pay at hospital' }}
              </strong>
            </div>
          </div>

          <div class="success-actions">
            <button mat-stroked-button (click)="resetBooking()">Book Another</button>
          </div>
        </div>
      }

      <!-- ============================================ -->
      <!--  DOCTOR PROFILE SHEET (slide-in / bottom)     -->
      <!-- ============================================ -->
      @if (profileOpen()) {
        <div class="profile-backdrop" (click)="closeProfile()"></div>
        <aside class="profile-sheet" role="dialog" aria-modal="true">
          <div class="sheet-grabber" aria-hidden="true"></div>
          <button mat-icon-button class="sheet-close" (click)="closeProfile()" aria-label="Close">
            <mat-icon>close</mat-icon>
          </button>

          @if (profileDoctor(); as doc) {
            <div class="profile-scroll">
              <div class="profile-hero">
                <div class="profile-avatar"><mat-icon>person</mat-icon></div>
                <h2 class="profile-name">{{ doc.name }}</h2>
                <span class="profile-designation">{{ doctorDesignation(doc) }}</span>
                <span class="profile-specialty">
                  <mat-icon class="spec-inline-icon">{{ specialtyIcon(doc.specialty) }}</mat-icon>
                  {{ doc.specialty }}
                </span>
              </div>

              <section class="profile-section">
                <h3>About</h3>
                <p class="profile-about" [class.collapsed]="!profileAboutExpanded()">
                  {{ doctorAbout(doc) }}
                </p>
                <button class="link-btn" (click)="toggleProfileAbout()">
                  {{ profileAboutExpanded() ? 'Read less' : 'Read more' }}
                </button>
              </section>

              <section class="profile-section">
                <h3>Qualifications</h3>
                <p class="profile-quals">{{ doctorEducation(doc) }}</p>
              </section>

              <section class="profile-section">
                <h3>Next available at</h3>
                <div class="avail-chips stacked">
                  <span class="avail-chip in-person">
                    <mat-icon>local_hospital</mat-icon>
                    {{ nextInPersonSlot(doc) }}
                  </span>
                  <span class="avail-chip video">
                    <mat-icon>videocam</mat-icon>
                    {{ nextVideoSlot(doc) }}
                  </span>
                </div>
              </section>
            </div>

            <div class="profile-cta-bar">
              <button mat-flat-button class="cta-primary book-from-profile"
                      (click)="bookFromProfile()">
                Book Appointment <mat-icon iconPositionEnd>arrow_forward</mat-icon>
              </button>
            </div>
          }
        </aside>
      }

      <!-- Booking confirmation dialog (rendered into CDK overlay at <body>) -->
      <ng-template #confirmDialog>
        @if (selectedDoctor(); as doc) {
          <div class="confirm-modal-content">
            <button mat-icon-button class="confirm-close" (click)="closeConfirmModal()" aria-label="Close">
              <mat-icon>close</mat-icon>
            </button>

            <h3 class="confirm-title">Review your booking</h3>
            <p class="confirm-sub">Please confirm the details below before booking.</p>

            <div class="confirm-summary">
              <div class="cs-row">
                <mat-icon>person</mat-icon>
                <div class="cs-text">
                  <strong>{{ doc.name }}</strong>
                  <span>{{ doc.specialty }} · {{ doctorDesignation(doc) }}</span>
                </div>
              </div>

              <div class="cs-row">
                <mat-icon>{{ consultationMode() === 'video' ? 'videocam' : 'local_hospital' }}</mat-icon>
                <div class="cs-text">
                  <strong>{{ consultationMode() === 'video' ? 'Video Consultation' : 'Hospital Visit' }}</strong>
                  <span>{{ doc.location }}</span>
                </div>
              </div>

              <div class="cs-row">
                <mat-icon>event</mat-icon>
                <div class="cs-text">
                  <strong>{{ selectedDate() | date:'fullDate' }}</strong>
                  <span>{{ selectedSlot()?.time }}</span>
                </div>
              </div>

              <div class="cs-row">
                <mat-icon>credit_card</mat-icon>
                <div class="cs-text">
                  <strong>{{ paymentMethod() === 'pay_now' ? 'Pay now (online)' : 'Pay at hospital' }}</strong>
                  <span>Consultation fee</span>
                </div>
                <strong class="cs-fee">{{ formatCurrency(currentFee()) }}</strong>
              </div>

              @if (visitReason().trim()) {
                <div class="cs-row">
                  <mat-icon>notes</mat-icon>
                  <div class="cs-text">
                    <strong>Reason</strong>
                    <span class="cs-reason">{{ visitReason() }}</span>
                  </div>
                </div>
              }
            </div>

            <div class="confirm-actions">
              <button mat-stroked-button class="cs-cancel" (click)="closeConfirmModal()">
                Cancel
              </button>
              <button mat-flat-button class="cs-confirm"
                      [disabled]="booking()"
                      (click)="confirmAndBook()">
                @if (booking()) {
                  <mat-spinner diameter="18" class="cta-spin"></mat-spinner>
                } @else {
                  Confirm &amp; Book <mat-icon iconPositionEnd>check</mat-icon>
                }
              </button>
            </div>
          </div>
        }
      </ng-template>
    </div>
  `,
  styles: [`
    /* =============================================
       SHELL — fills viewport so sticky CTA pins to bottom
       ============================================= */
    .booking-shell {
      max-width: 800px; margin: 0 auto;
      display: flex; flex-direction: column;
      min-height: calc(100vh - 112px);
    }
    .booking-content { flex: 1; padding-bottom: 16px; }

    .page-head { margin-bottom: 16px; }
    h1 { font-size: 26px; font-weight: 700; color: #1b3a4b; margin: 0; }
    .subtitle { color: #666; margin: 4px 0 0; font-size: 14px; }
    .full-width { width: 100%; }

    /* =============================================
       FILTER ROW (search + specialty dropdown)
       ============================================= */
    .filter-row {
      display: flex; gap: 10px; align-items: center;
      margin: 4px 0 16px;
    }
    .search-wrap {
      flex: 1; min-width: 0;
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px; height: 42px; box-sizing: border-box;
      background: white; border: 1px solid #e0e8e8; border-radius: 22px;
      transition: border-color 0.18s, box-shadow 0.18s;
    }
    .search-wrap:focus-within {
      border-color: #0d8a8a;
      box-shadow: 0 0 0 3px rgba(13,138,138,0.10);
    }
    .s-icon { color: #999; font-size: 20px; width: 20px; height: 20px; }
    .s-input {
      flex: 1; min-width: 0;
      border: none; outline: none; background: transparent;
      font-size: 14px; font-family: inherit; color: #333;
    }
    .s-input::placeholder { color: #aaa; }
    .s-clear {
      width: 28px !important; height: 28px !important;
      line-height: 28px !important; color: #999;
    }
    .s-clear mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Specialty tabs (horizontal scrollable) */
    .specialty-tabs {
      display: flex; gap: 8px;
      overflow-x: auto;
      padding: 4px 2px 8px;
      margin-bottom: 12px;
      scrollbar-width: thin;
    }
    .specialty-tabs::-webkit-scrollbar { height: 4px; }
    .specialty-tabs::-webkit-scrollbar-thumb { background: #d8e3e3; border-radius: 2px; }
    .spec-tab {
      flex-shrink: 0;
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 16px; height: 40px;
      border-radius: 22px;
      border: 1.5px solid #e0e8e8; background: white;
      cursor: pointer; transition: all 0.18s;
      font-family: inherit;
      font-size: 13px; font-weight: 700; color: #6b7884;
      white-space: nowrap;
    }
    .spec-tab mat-icon {
      font-size: 19px !important; width: 19px !important; height: 19px !important;
      color: #0d8a8a;
    }
    .spec-tab:hover {
      border-color: #80cbc4; color: #0d8a8a;
      background: #f5fafa;
    }
    .spec-tab.active {
      background: #0d8a8a;
      border-color: #0d8a8a;
      color: white;
      box-shadow: 0 4px 12px rgba(13,138,138,0.30);
    }
    .spec-tab.active mat-icon { color: white; }

    @media (max-width: 600px) {
      .filter-row { width: 100%; }
      .search-wrap { width: 100%; }
      .specialty-tabs { gap: 6px; padding: 4px 0 8px; }
      .spec-tab { padding: 8px 14px; height: 36px; font-size: 12.5px; }
      .spec-tab mat-icon {
        font-size: 17px !important; width: 17px !important; height: 17px !important;
      }
    }

    /* =============================================
       DOCTOR ROW (find phase) — restructured
       ============================================= */
    .doctors-list { display: flex; flex-direction: column; gap: 10px; }
    .doc-row {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 14px; border-radius: 12px;
      background: white; border: 1px solid #eef2f5;
      cursor: pointer; transition: all 0.18s;
    }
    .doc-row:hover {
      border-color: #80cbc4;
      box-shadow: 0 4px 14px rgba(13,138,138,0.08);
      transform: translateY(-1px);
    }

    /* Left column: avatar + view-profile CTA */
    .doc-left {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      flex-shrink: 0;
    }
    .doc-avatar {
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
      display: flex; align-items: center; justify-content: center;
    }
    .doc-avatar mat-icon {
      color: #0d8a8a; font-size: 32px; width: 32px; height: 32px;
    }
    .view-profile-cta {
      display: inline-flex; align-items: center; gap: 2px;
      padding: 4px 8px; border-radius: 14px;
      border: none; background: #eaf4ff; color: #1565c0;
      font-size: 11px; font-weight: 600; cursor: pointer;
      font-family: inherit;
      transition: background 0.15s;
      white-space: nowrap;
    }
    .view-profile-cta:hover { background: #d4e7fb; }
    .view-profile-cta mat-icon {
      font-size: 13px !important; width: 13px !important; height: 13px !important;
    }

    /* Body */
    .doc-body {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; gap: 4px;
    }
    .doc-name {
      font-size: 15px; color: #1b3a4b; font-weight: 700;
      line-height: 1.25;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .doc-specialty {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 12.5px; color: #5a8585; font-weight: 600;
    }
    .spec-inline-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
      color: #5a8585;
    }

    /* Next available section */
    .next-avail-wrap {
      margin-top: 6px;
    }
    .next-avail-label {
      display: block; font-size: 10.5px; color: #98a2ab;
      text-transform: uppercase; letter-spacing: 0.4px;
      font-weight: 700; margin-bottom: 5px;
    }
    .avail-chips {
      display: flex; flex-wrap: wrap; gap: 6px;
    }
    .avail-chips.stacked { flex-direction: column; align-items: flex-start; }
    .avail-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 10px; border-radius: 14px;
      font-size: 11.5px; font-weight: 600;
      white-space: nowrap;
    }
    .avail-chip mat-icon {
      font-size: 13px !important; width: 13px !important; height: 13px !important;
    }
    .avail-chip.in-person {
      background: #e8f5f3; color: #0d8a8a;
    }
    .avail-chip.video {
      background: #ede7f6; color: #5e35b1;
    }

    /* Right column: starting price + chevron */
    .doc-right {
      display: flex; align-items: center; gap: 6px;
      flex-shrink: 0;
    }
    .fee-onwards {
      font-size: 14px; font-weight: 700; color: #1b3a4b;
      white-space: nowrap;
    }

    .row-chevron {
      color: #c8d0d8; flex-shrink: 0;
      font-size: 22px !important; width: 22px !important; height: 22px !important;
    }
    .doc-row:hover .row-chevron { color: #0d8a8a; }

    .empty-state {
      text-align: center; padding: 40px; color: #999;
    }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 8px; }

    /* =============================================
       DOCTOR PROFILE SHEET (slide-in / bottom)
       ============================================= */
    .profile-backdrop {
      position: fixed; inset: 0;
      background: rgba(15, 30, 40, 0.45);
      z-index: 100;
      animation: fadeIn 0.18s ease-out;
    }
    .profile-sheet {
      position: fixed; top: 0; right: 0;
      width: 38vw; min-width: 380px; max-width: 480px;
      height: 100vh; background: white;
      z-index: 101;
      box-shadow: -8px 0 24px rgba(0,0,0,0.10);
      display: flex; flex-direction: column;
      animation: slideInRight 0.25s ease-out;
    }
    .sheet-grabber { display: none; }
    .sheet-close {
      position: absolute; top: 10px; right: 10px;
      width: 36px !important; height: 36px !important;
      color: #6b7884;
      z-index: 1;
    }
    .profile-scroll {
      flex: 1; overflow-y: auto;
      padding: 28px 22px 16px;
    }

    /* Profile hero */
    .profile-hero {
      display: flex; flex-direction: column; align-items: center;
      text-align: center; gap: 4px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f0f4f4;
    }
    .profile-avatar {
      width: 84px; height: 84px; border-radius: 50%;
      background: linear-gradient(135deg, #e0f2f1 0%, #80cbc4 100%);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 8px;
      box-shadow: 0 4px 14px rgba(13,138,138,0.18);
    }
    .profile-avatar mat-icon {
      color: #0d8a8a; font-size: 44px; width: 44px; height: 44px;
    }
    .profile-name {
      margin: 0; font-size: 18px; font-weight: 700; color: #1b3a4b;
    }
    .profile-designation {
      font-size: 12.5px; color: #6b7884; font-weight: 600;
      letter-spacing: 0.3px;
    }
    .profile-specialty {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 12.5px; color: #0d8a8a; font-weight: 600;
      margin-top: 4px;
    }

    /* Profile sections */
    .profile-section {
      padding: 16px 0;
      border-bottom: 1px solid #f0f4f4;
    }
    .profile-section:last-of-type { border-bottom: none; }
    .profile-section h3 {
      margin: 0 0 8px;
      font-size: 11px; color: #98a2ab; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .profile-about, .profile-quals {
      margin: 0;
      font-size: 13px; color: #3a4a55; line-height: 1.55;
    }
    .profile-about.collapsed {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .link-btn {
      background: none; border: none; padding: 6px 0 0;
      font-family: inherit; font-size: 12px; font-weight: 600;
      color: #0d8a8a; cursor: pointer;
    }
    .link-btn:hover { text-decoration: underline; }

    /* Profile bottom CTA */
    .profile-cta-bar {
      padding: 12px 18px;
      border-top: 1px solid #e3ecec;
      background: white;
    }
    .book-from-profile {
      width: 100%;
      height: 44px !important;
      padding: 0 18px !important;
      font-weight: 700 !important;
      font-size: 14px !important;
      border-radius: 10px !important;
      background: #0d8a8a !important; color: white !important;
      box-shadow: 0 4px 14px rgba(13,138,138,0.28) !important;
      display: inline-flex !important; align-items: center; justify-content: center; gap: 6px;
    }
    .book-from-profile mat-icon {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    @keyframes slideInUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    /* Mobile bottom sheet variant */
    @media (max-width: 768px) {
      .profile-sheet {
        top: auto; bottom: 0; left: 0; right: 0;
        width: 100%; min-width: 0; max-width: none;
        height: 88vh;
        border-radius: 18px 18px 0 0;
        animation: slideInUp 0.25s ease-out;
        box-shadow: 0 -8px 24px rgba(0,0,0,0.10);
      }
      .sheet-grabber {
        display: block;
        width: 40px; height: 4px; border-radius: 2px;
        background: #d8e0e6;
        margin: 8px auto 4px;
      }
      .profile-scroll { padding: 12px 18px 16px; }
    }

    /* =============================================
       DETAIL PHASE
       ============================================= */
    .back-link {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 13px; color: #666; cursor: pointer;
      margin-bottom: 12px; font-weight: 500;
    }
    .back-link:hover { color: #0d8a8a; }
    .back-link mat-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
    }

    /* =============================================
       STICKY DOCTOR HEADER (detail phase)
       ============================================= */
    .detail-content { padding-bottom: 96px; }
    .sticky-doc-header {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px;
      background: white;
      border: 1px solid #eef2f5;
      border-radius: 12px;
      margin-bottom: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.04);
    }
    .sticky-doc-header .doc-avatar {
      width: 42px; height: 42px;
    }
    .sticky-doc-header .doc-avatar mat-icon {
      font-size: 24px; width: 24px; height: 24px;
    }
    .sdh-body {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; gap: 2px;
    }
    .sdh-body .doc-name { font-size: 14px; line-height: 1.2; }
    .sdh-meta {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 12px; color: #5a8585; font-weight: 600;
    }
    .sdh-sep { color: #c8d0d8; margin: 0 2px; font-weight: 400; }
    .sdh-fee {
      display: flex; flex-direction: column; align-items: flex-end;
      flex-shrink: 0;
    }
    .sdh-fee strong {
      font-size: 16px; color: #1b3a4b; font-weight: 700;
    }
    .sdh-fee span {
      font-size: 10px; color: #98a2ab; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.3px;
    }

    .doc-designation {
      font-size: 11.5px; color: #6b7884; font-weight: 600;
      letter-spacing: 0.2px;
    }

    /* =============================================
       CONSULTATION MODE TABS
       ============================================= */
    .mode-tabs {
      display: flex; gap: 4px;
      padding: 4px;
      background: #f3f5f7;
      border-radius: 10px;
      margin-bottom: 16px;
    }
    .mode-tab {
      flex: 1;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      padding: 8px 12px;
      border: none; background: transparent;
      border-radius: 7px;
      cursor: pointer; transition: all 0.18s;
      font-family: inherit;
      font-size: 13px; font-weight: 600; color: #6b7884;
    }
    .mode-tab mat-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
    }
    .mode-tab.active {
      background: white; color: #0d8a8a;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }
    .mode-tab.video.active { color: #5e35b1; }

    /* =============================================
       SECTION + DATE
       ============================================= */
    .section { margin-bottom: 18px; }
    .section-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px;
    }
    .head-left {
      display: flex; align-items: center; gap: 8px;
    }
    .head-left mat-icon { color: #0d8a8a; font-size: 18px; width: 18px; height: 18px; }
    .head-left h3 {
      margin: 0; font-size: 14px; font-weight: 700; color: #1b3a4b;
    }

    .calendar-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 5px 10px; border-radius: 14px;
      border: 1px solid #d8e3e3; background: white;
      cursor: pointer; transition: all 0.15s;
      font-family: inherit; font-size: 11.5px; font-weight: 600; color: #0d8a8a;
    }
    .calendar-btn:hover { border-color: #0d8a8a; background: #f0f7f7; }
    .calendar-btn mat-icon {
      font-size: 14px !important; width: 14px !important; height: 14px !important;
      color: #0d8a8a;
    }

    /* Compact date strip */
    .date-strip {
      display: flex; gap: 6px; overflow-x: auto;
      padding: 2px 2px 4px;
      scrollbar-width: thin;
    }
    .date-strip::-webkit-scrollbar { height: 4px; }
    .date-strip::-webkit-scrollbar-thumb { background: #d8e3e3; border-radius: 2px; }
    .date-pill {
      flex-shrink: 0; min-width: 46px;
      padding: 6px 4px; border-radius: 9px;
      border: 1px solid #e8eded; background: white;
      cursor: pointer; transition: all 0.15s;
      display: flex; flex-direction: column; align-items: center; gap: 0;
    }
    .date-pill:hover { border-color: #80cbc4; }
    .date-pill.active {
      background: #0d8a8a; border-color: #0d8a8a;
      box-shadow: 0 3px 10px rgba(13,138,138,0.25);
    }
    .date-pill-num {
      font-size: 16px; font-weight: 700; color: #1b3a4b; line-height: 1.15;
    }
    .date-pill.active .date-pill-num { color: white; }
    .date-pill-label {
      font-size: 9.5px; color: #98a2ab; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .date-pill.active .date-pill-label { color: rgba(255,255,255,0.85); }

    /* =============================================
       TIME SLOTS
       ============================================= */
    .period-label {
      display: flex; align-items: center; gap: 5px;
      font-size: 12px; color: #6b7884; font-weight: 700;
      margin: 12px 0 6px;
      text-transform: capitalize;
    }
    .period-icon {
      font-size: 14px !important; width: 14px !important; height: 14px !important;
    }
    .period-icon.morning { color: #f6a821; }
    .period-icon.afternoon { color: #ef6c00; }
    .period-icon.evening { color: #5c6bc0; }

    .slots-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
      gap: 6px;
    }
    .slot-pill {
      padding: 7px 6px; border-radius: 7px;
      border: 1px solid #e0e8e8; background: white;
      font-size: 12.5px; font-weight: 600; color: #1b3a4b;
      cursor: pointer; transition: all 0.15s;
      font-family: inherit;
      min-height: 34px;
    }
    .slot-pill:hover:not(:disabled) {
      border-color: #80cbc4; background: #f5fafa;
    }
    .slot-pill.selected {
      background: #0d8a8a; color: white; border-color: #0d8a8a;
      box-shadow: 0 2px 6px rgba(13,138,138,0.25);
    }
    .slot-pill:disabled {
      color: #c8d0d8; background: #fafafa; cursor: not-allowed;
      border-color: #f0f0f0; opacity: 0.55;
    }

    /* =============================================
       PAYMENT CARDS (compact side-by-side)
       ============================================= */
    .pay-row { display: flex; gap: 8px; }
    .pay-card {
      flex: 1;
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 10px;
      border: 1.5px solid #e8eded; background: white;
      cursor: pointer; transition: all 0.15s;
    }
    .pay-card:hover { border-color: #80cbc4; }
    .pay-card.selected {
      border-color: #0d8a8a; background: #f5fafa;
      box-shadow: 0 1px 4px rgba(13,138,138,0.10);
    }
    .pay-card input[type="radio"] {
      accent-color: #0d8a8a; width: 16px; height: 16px; margin: 0; flex-shrink: 0;
    }
    .pay-icon {
      color: #0d8a8a; font-size: 20px; width: 20px; height: 20px; flex-shrink: 0;
    }
    .pay-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .pay-text strong { font-size: 12.5px; color: #1b3a4b; font-weight: 700; }
    .pay-text span { font-size: 11px; color: #98a2ab; line-height: 1.3; }

    .reason-section { margin-bottom: 8px; }

    /* =============================================
       STICKY BOOKING BAR (bottom)
       ============================================= */
    .booking-bar {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 40;
      background: white;
      border-top: 1px solid #e3ecec;
      box-shadow: 0 -4px 16px rgba(0,0,0,0.06);
      padding: 12px 24px;
    }
    .booking-bar-inner {
      max-width: 800px; margin: 0 auto;
      display: flex; align-items: center; gap: 12px;
    }
    /* Offset for desktop sidenav (240px wide @ ≥769px from shell.component.ts) */
    @media (min-width: 769px) {
      .booking-bar { left: 240px; }
    }
    .bar-info {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; gap: 1px;
    }
    .bar-fee {
      font-size: 17px; color: #1b3a4b; font-weight: 700; line-height: 1.15;
    }
    .bar-meta {
      font-size: 11.5px; color: #6b7884; font-weight: 600;
    }
    .bar-meta.hint { color: #98a2ab; font-weight: 500; }
    .confirm-btn {
      height: 44px !important;
      padding: 0 18px !important;
      font-size: 13.5px !important; font-weight: 700 !important;
      background: #0d8a8a !important; color: white !important;
      border-radius: 10px !important;
      box-shadow: 0 4px 12px rgba(13,138,138,0.25) !important;
      display: inline-flex !important; align-items: center; gap: 6px;
    }
    .confirm-btn:disabled {
      background: #b2dfdb !important; box-shadow: none !important;
    }
    .confirm-btn mat-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
    }
    .cta-spin { display: inline-block; }

    /* =============================================
       CALENDAR PICKER (modal / bottom-sheet)
       ============================================= */
    .cal-backdrop {
      position: fixed; inset: 0;
      background: rgba(15, 30, 40, 0.45);
      z-index: 110;
      animation: fadeIn 0.18s ease-out;
    }
    .cal-sheet {
      position: fixed;
      top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 320px; max-width: calc(100vw - 24px);
      background: white;
      border-radius: 16px;
      z-index: 111;
      box-shadow: 0 12px 36px rgba(0,0,0,0.18);
      padding: 14px 14px 12px;
      animation: fadeIn 0.18s ease-out;
    }
    .cal-grabber { display: none; }
    .cal-head {
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; margin-bottom: 8px;
    }
    .cal-month {
      flex: 1; text-align: center;
      font-size: 14px; font-weight: 700; color: #1b3a4b;
    }
    .cal-nav {
      width: 32px !important; height: 32px !important;
      color: #6b7884 !important;
    }
    .cal-weekdays {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
      font-size: 10.5px; font-weight: 700; color: #98a2ab;
      text-align: center; margin-bottom: 4px;
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .cal-grid {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
    }
    .cal-day {
      aspect-ratio: 1;
      border: none; background: transparent;
      border-radius: 8px;
      cursor: pointer; transition: all 0.15s;
      font-family: inherit;
      font-size: 13px; font-weight: 600; color: #1b3a4b;
    }
    .cal-day:hover:not(:disabled):not(.selected) {
      background: #f0f7f7; color: #0d8a8a;
    }
    .cal-day.selected {
      background: #0d8a8a; color: white;
      box-shadow: 0 2px 6px rgba(13,138,138,0.25);
    }
    .cal-day:not(.in-month) { color: #d8e0e6; }
    .cal-day.past { color: #d8e0e6; cursor: not-allowed; }
    .cal-day.past:hover { background: transparent; }
    .cal-close {
      width: 100%; margin-top: 10px;
      height: 36px !important;
      border-color: #d8e3e3 !important; color: #6b7884 !important;
      font-size: 12.5px !important;
      border-radius: 8px !important;
    }

    @media (max-width: 600px) {
      .cal-sheet {
        top: auto; bottom: 0; left: 0; right: 0;
        transform: none;
        width: 100%; max-width: none;
        border-radius: 16px 16px 0 0;
        padding: 12px 14px 14px;
        animation: slideInUp 0.22s ease-out;
      }
      .cal-grabber {
        display: block;
        width: 40px; height: 4px; border-radius: 2px;
        background: #d8e0e6; margin: 0 auto 10px;
      }
    }

    /* Booking confirmation dialog styles live in global styles.scss
       because MatDialog renders into the CDK overlay at <body> level. */

    /* =============================================
       SUCCESS PHASE
       ============================================= */
    .success-card {
      max-width: 520px; margin: 32px auto;
      padding: 40px 28px; text-align: center;
      background: white; border-radius: 14px;
      box-shadow: 0 8px 28px rgba(0,0,0,0.08);
    }
    .success-icon {
      font-size: 64px; width: 64px; height: 64px;
      color: #4caf50; margin-bottom: 14px;
    }
    .success-card h2 {
      color: #2e7d32; margin: 0 0 8px;
      font-size: 22px; font-weight: 700;
    }
    .success-subtitle {
      color: #666; margin: 0 0 24px; font-size: 14px; line-height: 1.5;
    }
    .success-summary {
      text-align: left; padding: 18px 20px;
      background: #f8fafa; border-radius: 12px;
      display: flex; flex-direction: column; gap: 12px;
      margin-bottom: 24px;
    }
    .summary-row {
      display: flex; align-items: center; gap: 10px;
      font-size: 14px; color: #1b3a4b;
    }
    .summary-row mat-icon { color: #0d8a8a; font-size: 20px; width: 20px; height: 20px; }
    .summary-row strong { margin-left: auto; }
    .summary-fee { color: #2e7d32 !important; font-weight: 700; }
    .paid { color: #2e7d32; }
    .pending { color: #f57c00; }
    .success-actions { display: flex; justify-content: center; gap: 10px; }

    /* =============================================
       RESPONSIVE
       ============================================= */
    @media (max-width: 600px) {
      h1 { font-size: 22px; }
      .doc-row { padding: 10px; gap: 10px; }
      .doc-left { gap: 6px; }
      .doc-avatar { width: 48px; height: 48px; }
      .doc-avatar mat-icon { font-size: 28px; width: 28px; height: 28px; }
      .view-profile-cta { font-size: 10px; padding: 3px 6px; }
      .avail-chip { font-size: 11px; padding: 3px 8px; }
      .fee-onwards { font-size: 12.5px; }
      .row-chevron { display: none; }
      .slots-grid { grid-template-columns: repeat(3, 1fr); }
      .sticky-doc-header { padding: 8px 10px; }
      .sticky-doc-header .doc-avatar { width: 36px; height: 36px; }
      .sticky-doc-header .doc-avatar mat-icon { font-size: 20px; width: 20px; height: 20px; }
      .sdh-fee strong { font-size: 14px; }
      .mode-tab { font-size: 12px; padding: 7px 8px; }
      .booking-bar { padding: 9px 14px; }
      .bar-fee { font-size: 15.5px; }
      .confirm-btn { height: 40px !important; padding: 0 14px !important; font-size: 12.5px !important; }
      .pay-row { flex-direction: column; gap: 8px; }
    }
    @media (max-width: 480px) {
      .doc-row {
        display: grid;
        grid-template-columns: 64px 1fr;
        grid-template-areas:
          "left body"
          "left right";
        align-items: start;
        gap: 8px 10px;
      }
      .doc-left { grid-area: left; }
      .doc-body { grid-area: body; min-width: 0; }
      .doc-right { grid-area: right; justify-content: flex-end; align-items: center; }
    }
    @media (max-width: 380px) {
      .slots-grid { grid-template-columns: repeat(2, 1fr); }
      .slot-pill { font-size: 12px; padding: 7px 4px; }
    }
  `]
})
export class AppointmentsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly geo = inject(GeographyService);
  private readonly snackBar = inject(MatSnackBar);

  readonly bookingPhase = signal<BookingPhase>('find');
  readonly specialties = signal<string[]>([]);
  readonly selectedSpecialty = signal<string>('all');
  readonly searchQuery = signal<string>('');
  readonly doctors = signal<Doctor[]>([]);
  readonly loadingDoctors = signal(false);
  readonly selectedDoctor = signal<Doctor | null>(null);

  readonly selectedDate = signal<string>('');
  readonly selectedSlot = signal<BookingSlot | null>(null);
  readonly paymentMethod = signal<PaymentMethod>('pay_at_hospital');
  readonly visitReason = signal('');
  readonly booking = signal(false);
  readonly bookedAppointment = signal<Appointment | null>(null);

  // Doctor profile slide-in sheet
  readonly profileOpen = signal(false);
  readonly profileDoctor = signal<Doctor | null>(null);
  readonly profileAboutExpanded = signal(false);

  // Consultation mode + calendar picker
  readonly consultationMode = signal<ConsultationMode>('in_person');
  readonly calendarOpen = signal(false);
  readonly calendarMonth = signal<Date>(new Date());

  // Booking confirmation dialog (MatDialog handles body-level rendering)
  @ViewChild('confirmDialog') confirmDialogTmpl!: TemplateRef<unknown>;
  private readonly dialog = inject(MatDialog);
  private confirmDialogRef?: MatDialogRef<unknown>;

  readonly currentFee = computed(() => {
    const doc = this.selectedDoctor();
    if (!doc) return 0;
    return this.consultationMode() === 'video'
      ? this.videoConsultFee(doc)
      : doc.consultationFee;
  });

  readonly calendarMonthLabel = computed(() =>
    this.calendarMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  );

  readonly calendarDays = computed<CalendarCell[]>(() => {
    const m = this.calendarMonth();
    const year = m.getFullYear();
    const month = m.getMonth();
    const first = new Date(year, month, 1);
    const firstDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells: CalendarCell[] = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push({
        date: this.toIso(d),
        day: d.getDate(),
        inMonth: false,
        isPast: d.getTime() < today.getTime()
      });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      cells.push({
        date: this.toIso(d),
        day: i,
        inMonth: true,
        isPast: d.getTime() < today.getTime()
      });
    }
    while (cells.length < 42) {
      const last = new Date(cells[cells.length - 1].date);
      last.setDate(last.getDate() + 1);
      cells.push({
        date: this.toIso(last),
        day: last.getDate(),
        inMonth: false,
        isPast: false
      });
    }
    return cells;
  });

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Next 14 days from today.
  readonly dateOptions = computed<DateOption[]>(() => {
    const opts: DateOption[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      let label: string;
      if (i === 0) label = 'TODAY';
      else if (i === 1) label = 'TOMORROW';
      else label = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      opts.push({
        date: iso,
        dayLabel: label,
        dayNum: d.getDate().toString().padStart(2, '0'),
        monthName: d.toLocaleDateString('en-US', { month: 'long' }),
        year: d.getFullYear()
      });
    }
    return opts;
  });

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

  specialtyIcon(specialty: string): string {
    const map: Record<string, string> = {
      all: 'apps',
      Cardiology: 'favorite',
      Dermatology: 'face',
      'General Medicine': 'medical_services',
      Endocrinology: 'bloodtype',
      Orthopedics: 'accessibility_new',
      Pediatrics: 'child_care',
      Neurology: 'psychology',
      Radiology: 'image_search'
    };
    return map[specialty] ?? 'medical_services';
  }

  // Slots regenerated whenever doctor or date changes.
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

  ngOnInit(): void {
    this.loadingDoctors.set(true);
    this.api.getSpecialties().subscribe(specs => this.specialties.set(specs));
    this.api.getDoctors().subscribe(docs => {
      this.doctors.set(docs);
      this.loadingDoctors.set(false);
    });
  }

  setSpecialty(spec: string): void {
    this.selectedSpecialty.set(spec);
  }

  selectDoctor(doctor: Doctor): void {
    this.selectedDoctor.set(doctor);
    this.selectedSlot.set(null);
    // Default to today.
    const today = this.dateOptions()[0];
    if (today) this.selectedDate.set(today.date);
    this.bookingPhase.set('detail');
  }

  goBackToFind(): void {
    this.bookingPhase.set('find');
    this.selectedSlot.set(null);
  }

  selectDate(date: string): void {
    this.selectedDate.set(date);
    this.selectedSlot.set(null);
  }

  selectSlot(slot: BookingSlot): void {
    if (!slot.available) return;
    this.selectedSlot.set(slot);
  }

  setConsultationMode(mode: ConsultationMode): void {
    this.consultationMode.set(mode);
    this.selectedSlot.set(null);
  }

  openCalendar(): void {
    const sel = this.selectedDate();
    if (sel) this.calendarMonth.set(new Date(sel));
    this.calendarOpen.set(true);
  }

  closeCalendar(): void {
    this.calendarOpen.set(false);
  }

  calendarPrev(): void {
    const m = new Date(this.calendarMonth());
    m.setMonth(m.getMonth() - 1);
    this.calendarMonth.set(m);
  }

  calendarNext(): void {
    const m = new Date(this.calendarMonth());
    m.setMonth(m.getMonth() + 1);
    this.calendarMonth.set(m);
  }

  selectFromCalendar(cell: CalendarCell): void {
    if (cell.isPast) return;
    this.selectedDate.set(cell.date);
    this.selectedSlot.set(null);
    this.calendarOpen.set(false);
  }

  openConfirmModal(): void {
    if (!this.selectedSlot()) return;
    this.confirmDialogRef = this.dialog.open(this.confirmDialogTmpl, {
      width: '460px',
      maxWidth: '95vw',
      panelClass: 'confirm-dialog-panel',
      backdropClass: 'confirm-dialog-backdrop',
      autoFocus: false
    });
  }

  closeConfirmModal(): void {
    this.confirmDialogRef?.close();
  }

  confirmAndBook(): void {
    this.confirmDialogRef?.close();
    this.bookAppointment();
  }

  bookAppointment(): void {
    const slot = this.selectedSlot();
    if (!slot) return;
    this.booking.set(true);
    this.api.bookAppointment(slot, this.visitReason()).subscribe(appt => {
      this.bookedAppointment.set(appt);
      this.booking.set(false);
      this.bookingPhase.set('success');
      const msg = this.paymentMethod() === 'pay_now'
        ? 'Payment received & appointment booked!'
        : 'Appointment booked! Pay at the hospital reception.';
      this.snackBar.open(msg, 'Close', { duration: 4000 });
    });
  }

  resetBooking(): void {
    this.bookingPhase.set('find');
    this.selectedDoctor.set(null);
    this.selectedSlot.set(null);
    this.selectedDate.set('');
    this.visitReason.set('');
    this.bookedAppointment.set(null);
    this.paymentMethod.set('pay_at_hospital');
  }

  formatCurrency(amount: number): string {
    const config = this.geo.config();
    return new Intl.NumberFormat(config.locale, {
      style: 'currency', currency: config.currency, minimumFractionDigits: 2
    }).format(amount);
  }

  // -------- Doctor profile sheet --------

  openProfile(doctor: Doctor, event?: MouseEvent): void {
    event?.stopPropagation();
    this.profileDoctor.set(doctor);
    this.profileAboutExpanded.set(false);
    this.profileOpen.set(true);
  }

  closeProfile(): void {
    this.profileOpen.set(false);
  }

  bookFromProfile(): void {
    const doc = this.profileDoctor();
    if (!doc) return;
    this.profileOpen.set(false);
    this.selectDoctor(doc);
  }

  toggleProfileAbout(): void {
    this.profileAboutExpanded.update(v => !v);
  }

  // -------- Synthesized doctor data (deterministic from id) --------

  videoConsultFee(doctor: Doctor): number {
    // ~60% of in-person fee, rounded to nearest 5
    return Math.max(5, Math.round((doctor.consultationFee * 0.6) / 5) * 5);
  }

  nextInPersonSlot(doctor: Doctor): string {
    const n = parseInt(doctor.id.replace(/\D/g, ''), 10) || 0;
    const offset = n % 4;                  // 0-3 days
    const hour = 9 + (n % 8);              // 9-16
    const minute = (n % 2) * 30;
    return this.formatSlotLabel(offset, hour, minute);
  }

  nextVideoSlot(doctor: Doctor): string {
    const n = parseInt(doctor.id.replace(/\D/g, ''), 10) || 0;
    const offset = (n + 1) % 4;
    const hour = 13 + (n % 6);             // 13-18
    const minute = ((n + 1) % 2) * 30;
    return this.formatSlotLabel(offset, hour, minute);
  }

  doctorDesignation(doctor: Doctor | null): string {
    if (!doctor) return '';
    const n = parseInt(doctor.id.replace(/\D/g, ''), 10) || 0;
    const labels = ['Consultant', 'Senior Consultant', 'Specialist', 'Surgeon'];
    return labels[n % labels.length];
  }

  doctorAbout(doctor: Doctor | null): string {
    if (!doctor) return '';
    const n = parseInt(doctor.id.replace(/\D/g, ''), 10) || 0;
    const years = 5 + (n % 20);
    const lastName = doctor.name.split(' ').slice(-1)[0];
    return `Dr. ${lastName} is a ${this.doctorDesignation(doctor).toLowerCase()} in ${doctor.specialty} with ${years} years of clinical experience. Known for a patient-centric approach and ongoing involvement in research and continuing medical education.`;
  }

  doctorEducation(doctor: Doctor | null): string {
    if (!doctor) return '';
    const n = parseInt(doctor.id.replace(/\D/g, ''), 10) || 0;
    const programs = [
      'MBBS, MD (Internal Medicine) — King Saud University',
      'MBBS, MS (Surgery) — Arabian Gulf University',
      'MBBS, MD — Royal College of Physicians, UK',
      'MBBS, MD (Cardiology), FRCP — Edinburgh',
      'MBBS, MD — Cairo University · Fellowship — Mayo Clinic'
    ];
    return programs[n % programs.length];
  }

  private formatSlotLabel(daysFromToday: number, h: number, m: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    const time = this.formatTime(h, m);
    if (daysFromToday === 0) return `Today, ${time}`;
    if (daysFromToday === 1) return `Tomorrow, ${time}`;
    return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}, ${time}`;
  }

  // ---- Helpers ----

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
    return baseTimes.map((t, i) => {
      const display = this.formatTime(t.h, t.m);
      return {
        id: `${doctorId}-${date}-${t.h}-${t.m}`,
        date,
        time: display,
        available: this.slotAvailable(doctorId, date, i),
        doctorId
      };
    });
  }

  private formatTime(h: number, m: number): string {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    return `${hr.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  // Deterministic ~75% available — same input always yields same answer.
  private slotAvailable(doctorId: string, date: string, index: number): boolean {
    const s = `${doctorId}-${date}-${index}`;
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 10 > 2;
  }
}
