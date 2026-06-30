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
import { MatTooltipModule } from '@angular/material/tooltip';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { ApiService } from '../../core/services/api.service';
import { GeographyService } from '../../core/services/geography.service';
import { Doctor, BookingSlot, Appointment } from '../../core/models/patient.model';

type BookingPhase = 'find' | 'detail' | 'success' | 'manage' | 'cancelled';
type PaymentMethod = 'pay_at_hospital' | 'pay_now';
type SlotPeriod = 'morning' | 'afternoon' | 'evening';
type ConsultationMode = 'in_person' | 'video';
type PayChannel = 'card' | 'apple_pay' | 'google_pay' | 'wallet';

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

// One autocomplete suggestion (condition, specialty or doctor).
interface DropItem {
  key: string;                                   // track-by id
  kind: 'condition' | 'specialty' | 'doctor';
  label: string;                                 // primary text
  specialty: string;                             // specialty it resolves / belongs to
  sub: string;                                   // secondary line, e.g. "Recommended Specialty: …"
  icon: string;                                  // Material icon
}

// The structured dropdown: one highlighted top match + a grid of related ones.
interface SuggestionDropdown {
  top: DropItem | null;
  others: DropItem[];
}

// Everyday condition / symptom → clinical specialty. Patients search in their
// own words; this resolves to the right specialty. Add a row to extend — the
// order also controls how "related" suggestions are surfaced. Case-insensitive.
const CONDITIONS: ReadonlyArray<{ term: string; specialty: string }> = [
  // Endocrinology
  { term: 'Diabetes',            specialty: 'Endocrinology' },
  { term: 'Diabetes Type 2',     specialty: 'Endocrinology' },
  { term: 'Thyroid Problems',    specialty: 'Endocrinology' },
  { term: 'Sugar Levels High',   specialty: 'Endocrinology' },
  { term: 'Hormonal Imbalance',  specialty: 'Endocrinology' },
  { term: 'PCOS',                specialty: 'Endocrinology' },
  // Pediatrics
  { term: 'Diabetes in Children', specialty: 'Pediatrics' },
  { term: 'Child Fever',          specialty: 'Pediatrics' },
  { term: 'Vaccination',          specialty: 'Pediatrics' },
  // General Medicine
  { term: 'Cold',                specialty: 'General Medicine' },
  { term: 'Fever',               specialty: 'General Medicine' },
  { term: 'Cough',               specialty: 'General Medicine' },
  { term: 'Flu',                 specialty: 'General Medicine' },
  // Dermatology
  { term: 'Skin Rash',           specialty: 'Dermatology' },
  { term: 'Acne',                specialty: 'Dermatology' },
  { term: 'Hair Fall',           specialty: 'Dermatology' },
  // Orthopedics
  { term: 'Back Pain',           specialty: 'Orthopedics' },
  { term: 'Knee Pain',           specialty: 'Orthopedics' },
  { term: 'Joint Pain',          specialty: 'Orthopedics' },
  // Cardiology
  { term: 'Chest Pain',          specialty: 'Cardiology' },
  { term: 'Heart Problems',      specialty: 'Cardiology' },
  { term: 'High Blood Pressure', specialty: 'Cardiology' },
  // Gynecology
  { term: 'Pregnancy',           specialty: 'Gynecology' },
  { term: 'Period Pain',         specialty: 'Gynecology' }
];

// Icon per condition specialty (suggestion + banner).
const CONDITION_ICONS: Record<string, string> = {
  Endocrinology: 'bloodtype',
  'General Medicine': 'sick',
  Dermatology: 'face',
  Orthopedics: 'accessibility_new',
  Cardiology: 'favorite',
  Gynecology: 'pregnant_woman',
  Pediatrics: 'child_care'
};

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatDividerModule, MatChipsModule, MatMenuModule, MatDialogModule, MatTooltipModule, SkeletonCardComponent
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

          <!-- Search + smart autocomplete -->
          <div class="filter-row">
            <div class="search-suggest">
              <div class="search-wrap">
                <mat-icon class="s-icon">search</mat-icon>
                <input class="s-input"
                       type="search"
                       name="doctor-search"
                       autocomplete="off"
                       role="combobox"
                       aria-label="Search doctor, specialty, or condition"
                       aria-controls="search-suggestions"
                       [attr.aria-expanded]="suggestionsOpen() && hasSuggestions()"
                       [ngModel]="searchQuery()"
                       (ngModelChange)="onSearchChange($event)"
                       (focus)="onSearchFocus()"
                       (blur)="onSearchBlur()"
                       placeholder="Search doctor, specialty, or condition...">
                @if (searchQuery()) {
                  <button mat-icon-button class="s-clear" (click)="clearSearch()" aria-label="Clear search">
                    <mat-icon>close</mat-icon>
                  </button>
                }
              </div>

              @if (suggestionsOpen() && hasSuggestions()) {
                <div class="suggest-panel" id="search-suggestions" role="listbox">
                  @if (dropdown().top; as top) {
                    <span class="suggest-section">Top Matches</span>
                    <button class="suggest-row top" type="button"
                            (mousedown)="$event.preventDefault()"
                            (click)="selectSuggestion(top)">
                      <span class="sug-ic"><mat-icon>{{ top.icon }}</mat-icon></span>
                      <span class="sug-text">
                        <strong class="sug-label">{{ top.label }}</strong>
                        <span class="sug-sub">{{ top.sub }}</span>
                      </span>
                    </button>
                  }

                  @if (dropdown().others.length) {
                    <span class="suggest-section">Other Suggestions</span>
                    <div class="suggest-grid">
                      @for (item of dropdown().others; track item.key) {
                        <button class="suggest-row" type="button"
                                (mousedown)="$event.preventDefault()"
                                (click)="selectSuggestion(item)">
                          <span class="sug-ic"><mat-icon>{{ item.icon }}</mat-icon></span>
                          <span class="sug-text">
                            <strong class="sug-label">{{ item.label }}</strong>
                            <span class="sug-sub">{{ item.sub }}</span>
                          </span>
                        </button>
                      }
                    </div>
                  }

                  <button class="suggest-seeall" type="button"
                          (mousedown)="$event.preventDefault()"
                          (click)="closeSuggestions()">
                    See all results for "{{ searchQuery() }}"
                    <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- Context banner: condition → recommended specialty + live count -->
          @if (contextLabel(); as ctx) {
            <div class="ctx-banner" role="status">
              <span class="ctx-ic"><mat-icon>medical_services</mat-icon></span>
              <div class="ctx-text">
                <strong>Showing doctors for "{{ ctx }}"</strong>
                @if (recommendedSpecialty(); as rs) {
                  <span class="ctx-sub">Recommended Specialty: {{ rs }}</span>
                }
              </div>
              <span class="ctx-count">
                {{ filteredDoctors().length }} {{ filteredDoctors().length === 1 ? 'doctor' : 'doctors' }} available
                <mat-icon>check_circle</mat-icon>
              </span>
              <button class="ctx-clear" (click)="clearContext()" aria-label="Clear filter">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          }

          <!-- Specialty chips (horizontal scrollable) -->
          <div class="specialty-tabs">
            <button class="spec-tab"
                    [class.active]="isSpecialtyActive('all')"
                    (click)="setSpecialty('all')">
              <mat-icon>public</mat-icon>
              All
            </button>
            @for (s of specialties(); track s) {
              <button class="spec-tab"
                      [class.active]="isSpecialtyActive(s)"
                      (click)="setSpecialty(s)">
                <mat-icon>{{ specialtyIcon(s) }}</mat-icon>
                {{ s }}
              </button>
            }
          </div>

          @if (loadingDoctors()) {
            @for (i of [1,2,3]; track i) {
              <app-skeleton-card [lines]="3" [showAvatar]="true" />
            }
          } @else {
            <div class="doctors-list">
              @for (doc of filteredDoctors(); track doc.id) {
                <div class="doc-card">
                  <!-- Identity -->
                  <div class="dc-main">
                    <div class="doc-avatar"><mat-icon>person</mat-icon></div>
                    <div class="dc-info">
                      <strong class="doc-name">{{ doc.name }}</strong>
                      <span class="doc-designation">{{ doctorDesignation(doc) }}</span>
                      <span class="doc-cred">
                        <mat-icon>workspace_premium</mat-icon>
                        {{ doctorExperience(doc) }} Years Experience
                        <span class="cred-dot">•</span>
                        {{ doctorLanguages(doc) }}
                      </span>
                      @if (doctorTreats(doc); as treats) {
                        <span class="doc-treats">
                          <span class="treats-label">Treats:</span>
                          <span class="treats-list">{{ treats }}</span>
                        </span>
                      }
                      <button class="view-profile-btn" type="button" (click)="openProfile(doc, $event)">
                        View Profile
                      </button>
                    </div>
                  </div>

                  <!-- Next available -->
                  <div class="dc-avail">
                    <span class="avail-head">Next Available</span>
                    <div class="avail-row">
                      <span class="avail-mode">
                        <mat-icon class="m-hosp">local_hospital</mat-icon> Hospital Visit
                      </span>
                      <span class="avail-time">{{ nextInPersonSlot(doc) }}</span>
                    </div>
                    <div class="avail-row">
                      <span class="avail-mode">
                        <mat-icon class="m-vid">videocam</mat-icon> Video Consult
                      </span>
                      <span class="avail-time">{{ nextVideoSlot(doc) }}</span>
                    </div>
                  </div>

                  <!-- Price + book -->
                  <div class="dc-book">
                    <div class="dc-price">
                      <strong>{{ formatCurrency(videoConsultFee(doc)) }}</strong>
                      <span>onwards</span>
                    </div>
                    <button mat-flat-button class="book-btn" (click)="selectDoctor(doc)">
                      Book Appointment
                    </button>
                  </div>
                </div>
              }
              @if (!filteredDoctors().length) {
                <div class="empty-state">
                  <mat-icon>search_off</mat-icon>
                  <p>No doctors found</p>
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
          @if (rescheduling()) {
            <a class="back-link" (click)="cancelRescheduleFlow()">
              <mat-icon>arrow_back</mat-icon> Back to manage
            </a>
            <div class="reschedule-banner reschedule-mode" role="status">
              <mat-icon>event_repeat</mat-icon>
              <div class="rb-text">
                <strong>Rescheduling appointment</strong>
                <span>Pick a new date and time. Your doctor and consultation mode stay the same.</span>
              </div>
            </div>
          } @else {
            <a class="back-link" (click)="goBackToFind()">
              <mat-icon>arrow_back</mat-icon> Back to doctors
            </a>
          }

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

          @if (!rescheduling()) {
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
          }
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
              } @else if (rescheduling()) {
                <span>Confirm New Slot</span>
              } @else {
                <span>Confirm Appointment</span>
              }
              @if (!booking()) {
                <mat-icon iconPositionEnd>{{ rescheduling() ? 'check' : 'arrow_forward' }}</mat-icon>
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
            <button mat-flat-button class="success-primary"
                    (click)="goToManageBooking()">
              <mat-icon>tune</mat-icon>
              Manage Booking
            </button>
            <button mat-stroked-button class="success-secondary" (click)="resetBooking()">
              Book Another
            </button>
          </div>
        </div>
      }

      <!-- ============================================ -->
      <!--  PHASE 4: MANAGE BOOKING                      -->
      <!-- ============================================ -->
      @else if (bookingPhase() === 'manage') {
        <div class="manage-shell">
          <a class="back-link" (click)="backToSuccess()">
            <mat-icon>arrow_back</mat-icon> Back
          </a>

          <div class="manage-head">
            <h1>Manage Booking</h1>
            <p class="subtitle">Reschedule, pay, or cancel your appointment</p>
          </div>

          @if (rescheduleResult(); as rr) {
            <div class="reschedule-banner" role="status">
              <mat-icon>swap_horiz</mat-icon>
              <div class="rb-text">
                <strong>Your appointment has been rescheduled.</strong>
                <span><b>From</b> {{ rr.from }} &nbsp;·&nbsp; <b>To</b> {{ rr.to }}</span>
              </div>
            </div>
          }

          @if (selectedDoctor(); as doc) {
            <div class="manage-card">
              <div class="mc-head">
                <div class="doc-avatar"><mat-icon>person</mat-icon></div>
                <div class="mc-doc-text">
                  <strong>{{ doc.name }}</strong>
                  <span class="sdh-meta">
                    <mat-icon class="spec-inline-icon">{{ specialtyIcon(doc.specialty) }}</mat-icon>
                    {{ doctorDesignation(doc) }} <span class="sdh-sep">|</span> {{ doc.specialty }}
                  </span>
                </div>
                @if (bookingId()) {
                  <span class="booking-id">{{ bookingId() }}</span>
                }
              </div>

              <div class="mc-grid">
                <div class="mc-row">
                  <mat-icon>{{ consultationMode() === 'video' ? 'videocam' : 'local_hospital' }}</mat-icon>
                  <div class="mc-text">
                    <span class="mc-label">Consultation</span>
                    <strong>{{ consultationMode() === 'video' ? 'Video Consultation' : 'Hospital Visit' }}</strong>
                  </div>
                </div>

                <div class="mc-row">
                  <mat-icon>event</mat-icon>
                  <div class="mc-text">
                    <span class="mc-label">Date &amp; Time</span>
                    <strong>{{ bookedAppointment()!.date | date:'mediumDate' }} · {{ bookedAppointment()!.time }}</strong>
                  </div>
                </div>

                <div class="mc-row">
                  <mat-icon>location_on</mat-icon>
                  <div class="mc-text">
                    <span class="mc-label">Location</span>
                    <strong>{{ doc.location }}</strong>
                  </div>
                </div>

                <div class="mc-row">
                  <mat-icon>credit_card</mat-icon>
                  <div class="mc-text">
                    <span class="mc-label">Fee</span>
                    <strong>{{ formatCurrency(currentFee()) }}</strong>
                  </div>
                  <span class="pay-chip"
                        [class.paid]="paymentMethod() === 'pay_now'"
                        [class.pending]="paymentMethod() === 'pay_at_hospital'">
                    <mat-icon>{{ paymentMethod() === 'pay_now' ? 'check_circle' : 'schedule' }}</mat-icon>
                    {{ paymentMethod() === 'pay_now' ? 'Paid online' : 'Pay at hospital' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="manage-actions">
              <button mat-flat-button class="action-primary"
                      (click)="startReschedule()">
                <mat-icon>event_repeat</mat-icon>
                Reschedule Appointment
              </button>

              @if (paymentMethod() === 'pay_at_hospital') {
                <button mat-flat-button class="action-pay"
                        (click)="openPaymentDialog()">
                  <mat-icon>payment</mat-icon>
                  Pay Now
                </button>
              }

              <button mat-stroked-button class="action-cancel"
                      [disabled]="!canCancel()"
                      [matTooltip]="!canCancel() ? 'Cancellation is only available up to 12 hours before the appointment.' : ''"
                      (click)="openCancelDialog()">
                <mat-icon>cancel</mat-icon>
                Cancel Appointment
              </button>

              @if (!canCancel()) {
                <p class="cancel-hint">
                  Cancellation is only available up to 12 hours before the appointment.
                </p>
              }
            </div>

            <div class="manage-help">
              <span>Need help?</span>
              <button class="link-btn" (click)="contactHospital()">Contact Hospital</button>
            </div>
          }
        </div>
      }

      <!-- ============================================ -->
      <!--  PHASE 5: CANCELLED                           -->
      <!-- ============================================ -->
      @else if (bookingPhase() === 'cancelled') {
        <div class="success-card cancelled-card">
          <mat-icon class="success-icon cancelled-icon">cancel</mat-icon>
          <h2>Appointment Cancelled</h2>
          <p class="success-subtitle">
            Your appointment has been cancelled successfully. The slot has been released.
          </p>
          <div class="success-actions">
            <button mat-flat-button class="success-primary" (click)="resetBooking()">
              <mat-icon>add_circle_outline</mat-icon>
              Book Another Appointment
            </button>
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
                  <span>Confirm &amp; Book</span>
                }
                @if (!booking()) {
                  <mat-icon iconPositionEnd>check</mat-icon>
                }
              </button>
            </div>
          </div>
        }
      </ng-template>

      <!-- Cancel appointment confirmation dialog -->
      <ng-template #cancelDialog>
        <div class="confirm-modal-content cancel-dialog-content">
          <button mat-icon-button class="confirm-close" (click)="closeCancelDialog()" aria-label="Close">
            <mat-icon>close</mat-icon>
          </button>
          <div class="cancel-icon-wrap"><mat-icon>error_outline</mat-icon></div>
          <h3 class="confirm-title">Cancel appointment?</h3>
          <p class="confirm-sub">
            This slot will be released and your appointment will be cancelled. This action cannot be undone.
          </p>
          <div class="confirm-actions">
            <button mat-stroked-button class="cs-cancel" (click)="closeCancelDialog()">
              Keep Booking
            </button>
            <button mat-flat-button class="cs-destructive" (click)="confirmCancel()">
              Yes, Cancel
            </button>
          </div>
        </div>
      </ng-template>

      <!-- Pay Now payment-methods dialog -->
      <ng-template #payDialog>
        <div class="confirm-modal-content pay-dialog-content">
          <button mat-icon-button class="confirm-close" (click)="closePaymentDialog()" aria-label="Close">
            <mat-icon>close</mat-icon>
          </button>
          <h3 class="confirm-title">Choose payment method</h3>
          <p class="confirm-sub">
            Pay <strong>{{ formatCurrency(currentFee()) }}</strong> securely. You can complete payment at the hospital instead.
          </p>
          <div class="pay-channels">
            <button class="pay-channel" (click)="payWith('card')">
              <mat-icon>credit_card</mat-icon>
              <span>Card</span>
              <mat-icon class="pc-arrow">chevron_right</mat-icon>
            </button>
            <button class="pay-channel" (click)="payWith('apple_pay')">
              <mat-icon>phone_iphone</mat-icon>
              <span>Apple Pay</span>
              <mat-icon class="pc-arrow">chevron_right</mat-icon>
            </button>
            <button class="pay-channel" (click)="payWith('google_pay')">
              <mat-icon>account_balance_wallet</mat-icon>
              <span>Google Pay</span>
              <mat-icon class="pc-arrow">chevron_right</mat-icon>
            </button>
            <button class="pay-channel" (click)="payWith('wallet')">
              <mat-icon>wallet</mat-icon>
              <span>Hospital Wallet</span>
              <mat-icon class="pc-arrow">chevron_right</mat-icon>
            </button>
          </div>
        </div>
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
    .s-input::-webkit-search-cancel-button { -webkit-appearance: none; }

    /* =============================================
       SEARCH AUTOCOMPLETE PANEL (Top Matches + grid)
       ============================================= */
    .search-suggest { position: relative; flex: 1; min-width: 0; }
    .suggest-panel {
      position: absolute; top: calc(100% + 8px); left: 0; right: 0;
      z-index: 30; padding: 14px;
      display: flex; flex-direction: column; gap: 8px;
      background: #fff; border: 1px solid #e6edee; border-radius: 16px;
      box-shadow: 0 16px 36px rgba(15,30,40,0.14);
      max-height: 70vh; overflow-y: auto;
    }
    .suggest-section {
      font-size: 11px; font-weight: 700; color: #98a2ab;
      text-transform: uppercase; letter-spacing: 0.4px;
      margin: 2px 2px 0;
    }
    .suggest-grid {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
    }
    .suggest-row {
      width: 100%; box-sizing: border-box;
      display: flex; align-items: center; gap: 11px;
      padding: 10px 12px; border: 1px solid transparent; background: transparent;
      border-radius: 11px; cursor: pointer; text-align: left;
      font-family: inherit; transition: background 0.14s, border-color 0.14s;
    }
    .suggest-row:hover { background: #f3faf9; }
    .suggest-row.top {
      background: #eaf6f4; border-color: #cdebe6;
    }
    .suggest-row.top:hover { background: #e2f2ef; }
    .sug-ic {
      width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: #e8f5f3;
    }
    .suggest-row.top .sug-ic { background: #d4ece8; }
    .sug-ic mat-icon {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      color: #0d8a8a;
    }
    .sug-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .sug-label {
      font-size: 13.5px; font-weight: 700; color: #1b3a4b;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sug-sub {
      font-size: 11.5px; color: #8b9aa3; font-weight: 500;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .suggest-seeall {
      display: inline-flex; align-items: center; gap: 6px;
      margin-top: 2px; padding: 10px 12px;
      border: none; border-top: 1px solid #eef2f4; background: transparent;
      border-radius: 0 0 6px 6px; cursor: pointer; text-align: left;
      font-family: inherit; font-size: 12.5px; font-weight: 600; color: #0d8a8a;
    }
    .suggest-seeall:hover { color: #0a6e6e; }
    .suggest-seeall mat-icon {
      margin-left: auto;
      font-size: 16px !important; width: 16px !important; height: 16px !important;
    }

    /* =============================================
       CONTEXT BANNER (condition → specialty + count)
       ============================================= */
    .ctx-banner {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; margin-bottom: 14px;
      border-radius: 12px;
      background: #eaf6ef; border: 1px solid #c2e6cf;
    }
    .ctx-ic {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: #d3ecdb;
    }
    .ctx-ic mat-icon {
      font-size: 19px !important; width: 19px !important; height: 19px !important;
      color: #2e8b57;
    }
    .ctx-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
    .ctx-text strong { font-size: 13.5px; font-weight: 700; color: #1f5132; }
    .ctx-sub { font-size: 12px; color: #4f7a61; font-weight: 500; }
    .ctx-count {
      display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
      padding: 5px 11px; border-radius: 16px;
      background: #fff; border: 1px solid #c2e6cf;
      font-size: 12px; font-weight: 700; color: #2e8b57;
      white-space: nowrap;
    }
    .ctx-count mat-icon {
      font-size: 15px !important; width: 15px !important; height: 15px !important;
      color: #2e8b57;
    }
    .ctx-clear {
      display: inline-flex; align-items: center; flex-shrink: 0;
      border: none; background: transparent; cursor: pointer;
      color: #4f7a61; padding: 2px; border-radius: 50%;
    }
    .ctx-clear:hover { background: rgba(46,139,87,0.14); }
    .ctx-clear mat-icon {
      font-size: 17px !important; width: 17px !important; height: 17px !important; color: inherit;
    }

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
       DOCTOR CARD (find phase) — 3-column layout
       ============================================= */
    .doctors-list { display: flex; flex-direction: column; gap: 12px; }
    .doc-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(190px, 0.7fr) auto;
      align-items: stretch; gap: 18px;
      padding: 18px; border-radius: 14px;
      background: white; border: 1px solid #eef2f5;
      transition: border-color 0.18s, box-shadow 0.18s;
    }
    .doc-card:hover {
      border-color: #cdebe6;
      box-shadow: 0 6px 18px rgba(13,138,138,0.08);
    }

    /* --- Column 1: identity --- */
    .dc-main { display: flex; gap: 14px; min-width: 0; }
    .doc-avatar {
      width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
      display: flex; align-items: center; justify-content: center;
    }
    .doc-avatar mat-icon {
      color: #0d8a8a; font-size: 30px; width: 30px; height: 30px;
    }
    .dc-info { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .doc-name {
      font-size: 15.5px; color: #1b3a4b; font-weight: 700; line-height: 1.25;
    }
    .doc-designation { font-size: 12.5px; color: #5a8585; font-weight: 600; }
    .doc-cred {
      display: flex; align-items: center; flex-wrap: wrap; gap: 4px;
      margin-top: 3px; font-size: 12px; color: #6b7884; font-weight: 600;
    }
    .doc-cred mat-icon {
      font-size: 14px !important; width: 14px !important; height: 14px !important;
      color: #98a2ab;
    }
    .cred-dot { color: #c2cdd4; margin: 0 1px; }
    .doc-treats {
      margin-top: 4px; font-size: 12px; line-height: 1.45;
    }
    .treats-label { color: #98a2ab; font-weight: 600; margin-right: 4px; }
    .treats-list { color: #0d8a8a; font-weight: 600; }
    .view-profile-btn {
      align-self: flex-start; margin-top: 9px;
      padding: 7px 16px; border-radius: 8px;
      border: 1.5px solid #d8e3e3; background: #fff;
      cursor: pointer; font-family: inherit;
      font-size: 12.5px; font-weight: 700; color: #0d8a8a;
      transition: all 0.15s;
    }
    .view-profile-btn:hover { border-color: #0d8a8a; background: #f5fafa; }

    /* --- Column 2: next available --- */
    .dc-avail {
      display: flex; flex-direction: column; gap: 8px;
      padding-left: 18px; border-left: 1px solid #eef2f5;
      justify-content: center;
    }
    .avail-head {
      font-size: 10.5px; color: #98a2ab; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.4px;
    }
    .avail-row {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
    }
    .avail-mode {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 12px; color: #51616b; font-weight: 600; white-space: nowrap;
    }
    .avail-mode mat-icon {
      font-size: 15px !important; width: 15px !important; height: 15px !important;
    }
    .avail-mode .m-hosp { color: #0d8a8a; }
    .avail-mode .m-vid { color: #5e35b1; }
    .avail-time {
      font-size: 12.5px; font-weight: 700; color: #0d8a8a;
      white-space: nowrap; text-align: right;
    }

    /* --- Column 3: price + book --- */
    .dc-book {
      display: flex; flex-direction: column; align-items: flex-end;
      justify-content: center; gap: 12px; flex-shrink: 0;
    }
    .dc-price { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; }
    .dc-price strong { font-size: 19px; font-weight: 700; color: #1b3a4b; }
    .dc-price span {
      font-size: 11px; color: #98a2ab; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .book-btn {
      height: 42px !important; padding: 0 20px !important;
      border-radius: 10px !important;
      background: #0d8a8a !important; color: #fff !important;
      font-weight: 700 !important; font-size: 13px !important;
      box-shadow: 0 4px 12px rgba(13,138,138,0.25) !important;
      white-space: nowrap;
    }

    .empty-state {
      text-align: center; padding: 40px; color: #999;
    }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 8px; }

    /* Shared inline specialty icon + availability chips (detail / profile phases) */
    .spec-inline-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
      color: #5a8585;
    }
    .avail-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .avail-chips.stacked { flex-direction: column; align-items: flex-start; }
    .avail-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 10px; border-radius: 14px;
      font-size: 11.5px; font-weight: 600; white-space: nowrap;
    }
    .avail-chip mat-icon {
      font-size: 13px !important; width: 13px !important; height: 13px !important;
    }
    .avail-chip.in-person { background: #e8f5f3; color: #0d8a8a; }
    .avail-chip.video { background: #ede7f6; color: #5e35b1; }

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
      /* Start below the sticky app toolbar (mat-toolbar = 64px) so the sheet's
         own header + close button aren't hidden behind the global top bar. */
      position: fixed; top: 64px; right: 0;
      width: 38vw; min-width: 380px; max-width: 480px;
      height: calc(100vh - 64px); background: white;
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
    .success-actions {
      display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;
    }
    .success-primary {
      height: 44px !important; padding: 0 22px !important;
      background: #0d8a8a !important; color: white !important;
      font-weight: 700 !important; font-size: 14px !important;
      border-radius: 10px !important;
      box-shadow: 0 4px 14px rgba(13,138,138,0.28) !important;
      display: inline-flex !important; align-items: center; gap: 6px;
    }
    .success-primary mat-icon {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
    }
    .success-secondary {
      height: 44px !important; padding: 0 22px !important;
      border-color: #d8e3e3 !important; color: #6b7884 !important;
      font-weight: 600 !important; font-size: 13.5px !important;
      border-radius: 10px !important;
    }

    .cancelled-card h2 { color: #c62828 !important; }
    .cancelled-icon { color: #ef5350 !important; }

    /* =============================================
       MANAGE BOOKING
       ============================================= */
    .manage-shell {
      max-width: 720px; margin: 0 auto;
      padding-bottom: 24px;
    }
    .manage-head { margin: 4px 0 14px; }
    .manage-head h1 {
      margin: 0; font-size: 22px; font-weight: 700; color: #1b3a4b;
    }
    .manage-head .subtitle {
      margin: 4px 0 0; font-size: 13px; color: #6b7884;
    }

    .reschedule-banner {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px;
      background: #e8f5f3;
      border: 1px solid #b2dfdb;
      border-radius: 10px;
      margin-bottom: 14px;
    }
    .reschedule-banner mat-icon {
      color: #0d8a8a; flex-shrink: 0;
      font-size: 22px !important; width: 22px !important; height: 22px !important;
    }
    .reschedule-banner.reschedule-mode {
      background: #fff8e1; border-color: #ffe082;
      margin-top: 10px;
    }
    .reschedule-banner.reschedule-mode mat-icon { color: #ef6c00; }
    .rb-text {
      display: flex; flex-direction: column; gap: 2px;
      font-size: 13px; color: #1b3a4b;
    }
    .rb-text strong { font-weight: 700; }
    .rb-text span { color: #5a6671; font-size: 12.5px; }
    .rb-text b { font-weight: 700; color: #1b3a4b; }

    .manage-card {
      background: white; border: 1px solid #eef2f5;
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.04);
      margin-bottom: 14px;
    }
    .mc-head {
      display: flex; align-items: center; gap: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f0f4f4;
    }
    .mc-head .doc-avatar {
      width: 44px; height: 44px;
    }
    .mc-head .doc-avatar mat-icon {
      font-size: 26px; width: 26px; height: 26px;
    }
    .mc-doc-text {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; gap: 2px;
    }
    .mc-doc-text strong {
      font-size: 14.5px; color: #1b3a4b; font-weight: 700; line-height: 1.2;
    }
    .booking-id {
      font-size: 10.5px; font-weight: 700; color: #6b7884;
      padding: 4px 8px; border-radius: 6px;
      background: #f3f5f7;
      letter-spacing: 0.3px;
      flex-shrink: 0;
    }

    .mc-grid {
      display: flex; flex-direction: column; gap: 10px;
      padding-top: 12px;
    }
    .mc-row {
      display: flex; align-items: center; gap: 12px;
    }
    .mc-row mat-icon {
      color: #0d8a8a; flex-shrink: 0;
      font-size: 20px !important; width: 20px !important; height: 20px !important;
    }
    .mc-text {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; gap: 1px;
    }
    .mc-label {
      font-size: 10.5px; color: #98a2ab; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.4px;
    }
    .mc-text strong {
      font-size: 13.5px; color: #1b3a4b; font-weight: 700;
    }

    .pay-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 14px;
      font-size: 11.5px; font-weight: 700;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .pay-chip mat-icon {
      font-size: 14px !important; width: 14px !important; height: 14px !important;
    }
    .pay-chip.paid {
      background: #e8f5e9 !important; color: #2e7d32 !important;
    }
    .pay-chip.paid mat-icon { color: #2e7d32 !important; }
    .pay-chip.pending {
      background: #fff3e0 !important; color: #ef6c00 !important;
    }
    .pay-chip.pending mat-icon { color: #ef6c00 !important; }

    .manage-actions {
      display: flex; flex-direction: column; gap: 10px;
      margin-bottom: 16px;
    }
    .action-primary {
      height: 48px !important;
      background: #0d8a8a !important; color: white !important;
      font-weight: 700 !important; font-size: 14px !important;
      border-radius: 12px !important;
      box-shadow: 0 4px 14px rgba(13,138,138,0.25) !important;
      display: inline-flex !important; align-items: center; justify-content: center; gap: 8px;
    }
    .action-primary mat-icon {
      font-size: 20px !important; width: 20px !important; height: 20px !important;
    }
    .action-pay {
      height: 48px !important;
      background: #1565c0 !important; color: white !important;
      font-weight: 700 !important; font-size: 14px !important;
      border-radius: 12px !important;
      box-shadow: 0 4px 14px rgba(21,101,192,0.20) !important;
      display: inline-flex !important; align-items: center; justify-content: center; gap: 8px;
    }
    .action-pay mat-icon {
      font-size: 20px !important; width: 20px !important; height: 20px !important;
    }
    .action-cancel {
      height: 48px !important;
      border: 1.5px solid #ffcdd2 !important;
      color: #c62828 !important;
      font-weight: 700 !important; font-size: 14px !important;
      border-radius: 12px !important;
      background: white !important;
      display: inline-flex !important; align-items: center; justify-content: center; gap: 8px;
    }
    .action-cancel mat-icon {
      font-size: 20px !important; width: 20px !important; height: 20px !important;
      color: #c62828;
    }
    .action-cancel[disabled] {
      border-color: #e8eaec !important; color: #c0c8d0 !important;
      cursor: not-allowed;
    }
    .action-cancel[disabled] mat-icon { color: #c0c8d0; }
    .cancel-hint {
      margin: 0; font-size: 11.5px; color: #98a2ab; text-align: center;
    }

    .manage-help {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 12px;
      font-size: 12.5px; color: #6b7884;
    }
    .manage-help .link-btn {
      background: none; border: none; padding: 0;
      font-family: inherit; font-size: 12.5px; font-weight: 700;
      color: #0d8a8a; cursor: pointer;
    }
    .manage-help .link-btn:hover { text-decoration: underline; }

    /* =============================================
       RESPONSIVE
       ============================================= */
    /* Stack the doctor card into a single column on tablet & mobile */
    @media (max-width: 760px) {
      .doc-card {
        grid-template-columns: 1fr;
        gap: 14px;
      }
      .dc-avail {
        padding-left: 0; padding-top: 14px;
        border-left: none; border-top: 1px solid #eef2f5;
      }
      .dc-book {
        flex-direction: row; align-items: center; justify-content: space-between;
        padding-top: 14px; border-top: 1px solid #eef2f5;
      }
      .dc-price { align-items: flex-start; }
      .book-btn { flex-shrink: 0; }
      .suggest-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 600px) {
      h1 { font-size: 22px; }
      .doc-card { padding: 14px; }
      .doc-avatar { width: 48px; height: 48px; }
      .doc-avatar mat-icon { font-size: 28px; width: 28px; height: 28px; }
      .ctx-banner { flex-wrap: wrap; }
      .ctx-count { order: 3; }
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
    @media (max-width: 380px) {
      .avail-row { flex-wrap: wrap; gap: 2px; }
      .avail-time { width: 100%; text-align: left; }
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
  readonly suggestionsOpen = signal(false);
  // Set when the patient picks a condition suggestion (e.g. "Diabetes"),
  // driving the "Showing doctors for …" banner.
  readonly selectedConditionTerm = signal<string | null>(null);
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
  @ViewChild('cancelDialog') cancelDialogTmpl!: TemplateRef<unknown>;
  @ViewChild('payDialog') payDialogTmpl!: TemplateRef<unknown>;
  private readonly dialog = inject(MatDialog);
  private confirmDialogRef?: MatDialogRef<unknown>;
  private cancelDialogRef?: MatDialogRef<unknown>;
  private payDialogRef?: MatDialogRef<unknown>;

  // Manage booking flow
  readonly rescheduling = signal(false);
  readonly rescheduleResult = signal<{ from: string; to: string } | null>(null);
  readonly bookingId = signal<string>('');

  readonly canCancel = computed(() => {
    const appt = this.bookedAppointment();
    if (!appt) return false;
    if (this.bookingPhase() === 'cancelled') return false;
    const apptMs = this.parseSlotDateTime(appt.date, appt.time);
    const hoursDiff = (apptMs - Date.now()) / 3_600_000;
    return hoursDiff > 12;
  });

  private parseSlotDateTime(dateIso: string, time: string): number {
    const [hourStr, rest] = time.split(':');
    const [minStr, ampm] = rest.split(' ');
    let h = parseInt(hourStr, 10);
    const m = parseInt(minStr, 10);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    const [y, mo, d] = dateIso.split('-').map(Number);
    return new Date(y, mo - 1, d, h, m).getTime();
  }

  private formatBookingSummaryDate(dateIso: string, time: string): string {
    const [y, mo, d] = dateIso.split('-').map(Number);
    const date = new Date(y, mo - 1, d);
    return `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })} • ${time}`;
  }

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

  // The specialty a typed/selected condition recommends (drives the banner
  // sub-line and the highlighted chip). Null when not in "condition mode".
  readonly recommendedSpecialty = computed<string | null>(() => {
    const picked = this.selectedConditionTerm();
    if (picked) {
      return this.conditionSpecialty(picked)
        ?? (this.selectedSpecialty() !== 'all' ? this.selectedSpecialty() : null);
    }
    if (this.selectedSpecialty() === 'all') {
      const q = this.searchQuery().trim();
      if (q) return this.matchConditionForFilter(q)?.specialty ?? null;
    }
    return null;
  });

  // The specialty actually applied to the list: a live condition recommendation
  // wins; otherwise the manually-chosen chip ('all' = no filter).
  readonly effectiveSpecialty = computed<string>(() =>
    this.recommendedSpecialty() ?? this.selectedSpecialty()
  );

  readonly filteredDoctors = computed(() => {
    const eff = this.effectiveSpecialty();
    const q = this.searchQuery().trim().toLowerCase();
    let list = this.doctors();
    if (eff !== 'all') list = list.filter(d => d.specialty === eff);
    if (q) {
      // Free-text that isn't a recognised condition → match name/specialty.
      const cond = this.matchConditionForFilter(q);
      if (!cond) {
        list = list.filter(d =>
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q)
        );
      }
    }
    return list;
  });

  // Structured autocomplete: one highlighted "top match" + a grid of related
  // suggestions (other matching conditions, plus siblings in the same specialty).
  readonly dropdown = computed<SuggestionDropdown>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return { top: null, others: [] };

    const conditionMatches = CONDITIONS.filter(c => c.term.toLowerCase().includes(q));
    const doctorMatches = this.doctors().filter(d => d.name.toLowerCase().includes(q));
    const specialtyMatches = this.specialties().filter(s => s.toLowerCase().includes(q));

    // Prefer an exact / prefix condition for the top slot, else first match.
    const topCondition =
      conditionMatches.find(c => c.term.toLowerCase() === q) ??
      conditionMatches.find(c => c.term.toLowerCase().startsWith(q)) ??
      conditionMatches[0] ?? null;

    let top: DropItem | null = null;
    if (topCondition) top = this.conditionItem(topCondition);
    else if (doctorMatches.length) top = this.doctorItem(doctorMatches[0]);
    else if (specialtyMatches.length) top = this.specialtyItem(specialtyMatches[0]);

    const others: DropItem[] = [];
    if (topCondition) {
      const directRemaining = conditionMatches
        .filter(c => c.term !== topCondition.term)
        .map(c => this.conditionItem(c));
      // Sibling conditions in the recommended specialty, not already shown.
      const shown = new Set([topCondition.term, ...conditionMatches.map(c => c.term)]);
      const related = CONDITIONS
        .filter(c => c.specialty === topCondition.specialty && !shown.has(c.term))
        .map(c => this.conditionItem(c));
      // Interleave direct matches with related siblings (matches the design grid).
      let i = 0, j = 0;
      while (others.length < 4 && (i < directRemaining.length || j < related.length)) {
        if (i < directRemaining.length) others.push(directRemaining[i++]);
        if (others.length < 4 && j < related.length) others.push(related[j++]);
      }
    } else {
      // Name / specialty search: list remaining doctors then specialties.
      for (const d of doctorMatches.slice(top?.kind === 'doctor' ? 1 : 0)) {
        if (others.length >= 4) break;
        others.push(this.doctorItem(d));
      }
      for (const s of specialtyMatches) {
        if (others.length >= 4) break;
        if (top?.kind === 'specialty' && s === top.label) continue;
        others.push(this.specialtyItem(s));
      }
    }
    return { top, others };
  });

  readonly hasSuggestions = computed(() => {
    const d = this.dropdown();
    return !!d.top || d.others.length > 0;
  });

  // Label for the "Showing doctors for …" banner. Selected condition wins;
  // else a typed query that resolves to a condition (while no chip is forced).
  readonly contextLabel = computed<string | null>(() => {
    const picked = this.selectedConditionTerm();
    if (picked) return picked;
    if (this.selectedSpecialty() === 'all') {
      const q = this.searchQuery().trim();
      if (q) {
        const cond = this.matchConditionForFilter(q);
        if (cond) return cond.term;
      }
    }
    return null;
  });

  private conditionItem(c: { term: string; specialty: string }): DropItem {
    return {
      key: 'c-' + c.term, kind: 'condition', label: c.term, specialty: c.specialty,
      sub: 'Recommended Specialty: ' + c.specialty,
      icon: CONDITION_ICONS[c.specialty] ?? 'healing'
    };
  }
  private doctorItem(d: Doctor): DropItem {
    return {
      key: 'd-' + d.id, kind: 'doctor', label: d.name, specialty: d.specialty,
      sub: d.designation ?? d.specialty, icon: 'person'
    };
  }
  private specialtyItem(s: string): DropItem {
    return {
      key: 's-' + s, kind: 'specialty', label: s, specialty: s,
      sub: 'Specialty', icon: this.specialtyIcon(s)
    };
  }

  private conditionSpecialty(term: string): string | null {
    return CONDITIONS.find(c => c.term === term)?.specialty ?? null;
  }

  private matchConditionForFilter(q: string): { term: string; specialty: string } | null {
    return CONDITIONS.find(c => {
      const t = c.term.toLowerCase();
      return q === t || q.includes(t) || (t.includes(q) && q.length >= 3);
    }) ?? null;
  }

  isSpecialtyActive(spec: string): boolean {
    return this.effectiveSpecialty() === spec;
  }

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
    // Tapping a chip is an explicit clinical choice — drop the condition
    // context and any typed query so the filter is unambiguous.
    this.selectedConditionTerm.set(null);
    this.searchQuery.set('');
    this.suggestionsOpen.set(false);
  }

  // ---- Search + autocomplete ----

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    // Editing the text supersedes a previously-picked condition suggestion.
    this.selectedConditionTerm.set(null);
    this.suggestionsOpen.set(true);
  }

  onSearchFocus(): void {
    this.suggestionsOpen.set(true);
  }

  onSearchBlur(): void {
    // Delay so a suggestion click registers before the list closes.
    setTimeout(() => this.suggestionsOpen.set(false), 150);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.selectedConditionTerm.set(null);
  }

  // Clears the condition context entirely (text + chip), from the banner.
  clearContext(): void {
    this.searchQuery.set('');
    this.selectedConditionTerm.set(null);
    this.selectedSpecialty.set('all');
  }

  closeSuggestions(): void {
    this.suggestionsOpen.set(false);
  }

  selectSuggestion(item: DropItem): void {
    this.suggestionsOpen.set(false);
    switch (item.kind) {
      case 'condition':
        // Auto-select the recommended specialty chip + show the context banner.
        this.selectedSpecialty.set(item.specialty);
        this.selectedConditionTerm.set(item.label);
        this.searchQuery.set('');
        break;
      case 'specialty':
        this.selectedSpecialty.set(item.specialty);
        this.selectedConditionTerm.set(null);
        this.searchQuery.set('');
        break;
      case 'doctor':
        // Narrow the list to the chosen doctor by name.
        this.selectedConditionTerm.set(null);
        this.searchQuery.set(item.label);
        break;
    }
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
    if (this.rescheduling()) {
      this.applyReschedule();
    } else {
      this.bookAppointment();
    }
  }

  // -------- Manage Booking flow --------

  goToManageBooking(): void {
    this.rescheduleResult.set(null);
    this.bookingPhase.set('manage');
  }

  backToSuccess(): void {
    this.bookingPhase.set('success');
  }

  startReschedule(): void {
    const appt = this.bookedAppointment();
    if (!appt) return;
    this.rescheduling.set(true);
    this.rescheduleResult.set(null);
    this.selectedDate.set(appt.date);
    this.selectedSlot.set(null);
    this.bookingPhase.set('detail');
  }

  cancelRescheduleFlow(): void {
    this.rescheduling.set(false);
    this.selectedSlot.set(null);
    this.bookingPhase.set('manage');
  }

  private applyReschedule(): void {
    const slot = this.selectedSlot();
    const appt = this.bookedAppointment();
    if (!slot || !appt) return;
    const fromLabel = this.formatBookingSummaryDate(appt.date, appt.time);
    const updated: Appointment = { ...appt, date: slot.date, time: slot.time };
    this.bookedAppointment.set(updated);
    const toLabel = this.formatBookingSummaryDate(updated.date, updated.time);
    this.rescheduleResult.set({ from: fromLabel, to: toLabel });
    this.rescheduling.set(false);
    this.selectedSlot.set(null);
    this.bookingPhase.set('manage');
    this.snackBar.open('Appointment rescheduled successfully', 'Close', { duration: 4000 });
  }

  openCancelDialog(): void {
    if (!this.canCancel()) return;
    this.cancelDialogRef = this.dialog.open(this.cancelDialogTmpl, {
      width: '400px',
      maxWidth: '95vw',
      panelClass: 'confirm-dialog-panel',
      backdropClass: 'confirm-dialog-backdrop',
      autoFocus: false
    });
  }

  closeCancelDialog(): void {
    this.cancelDialogRef?.close();
  }

  confirmCancel(): void {
    this.cancelDialogRef?.close();
    this.bookingPhase.set('cancelled');
    this.snackBar.open('Appointment cancelled', 'Close', { duration: 4000 });
  }

  openPaymentDialog(): void {
    this.payDialogRef = this.dialog.open(this.payDialogTmpl, {
      width: '420px',
      maxWidth: '95vw',
      panelClass: 'confirm-dialog-panel',
      backdropClass: 'confirm-dialog-backdrop',
      autoFocus: false
    });
  }

  closePaymentDialog(): void {
    this.payDialogRef?.close();
  }

  payWith(_channel: PayChannel): void {
    this.payDialogRef?.close();
    this.paymentMethod.set('pay_now');
    this.snackBar.open('Payment completed successfully', 'Close', { duration: 4000 });
  }

  contactHospital(): void {
    this.snackBar.open('Hospital reception: +973 1234 5678', 'Close', { duration: 5000 });
  }

  bookAppointment(): void {
    const slot = this.selectedSlot();
    if (!slot) return;
    this.booking.set(true);
    this.api.bookAppointment(slot, this.visitReason()).subscribe(appt => {
      this.bookedAppointment.set(appt);
      this.bookingId.set('BOOK-' + appt.id.replace(/\D/g, '').slice(-5).padStart(5, '0'));
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
    this.bookingId.set('');
    this.rescheduling.set(false);
    this.rescheduleResult.set(null);
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
    if (doctor.videoConsultFee != null) return doctor.videoConsultFee;
    // ~60% of in-person fee, rounded to nearest 5
    return Math.max(5, Math.round((doctor.consultationFee * 0.6) / 5) * 5);
  }

  // Conditions the doctor commonly treats (shown as the "Treats:" line).
  doctorTreats(doctor: Doctor): string {
    return (doctor.treats ?? []).join(', ');
  }

  nextInPersonSlot(doctor: Doctor): string {
    if (doctor.nextHospitalSlot) return doctor.nextHospitalSlot;
    const n = parseInt(doctor.id.replace(/\D/g, ''), 10) || 0;
    const offset = n % 4;                  // 0-3 days
    const hour = 9 + (n % 8);              // 9-16
    const minute = (n % 2) * 30;
    return this.formatSlotLabel(offset, hour, minute);
  }

  nextVideoSlot(doctor: Doctor): string {
    if (doctor.nextVideoSlot) return doctor.nextVideoSlot;
    const n = parseInt(doctor.id.replace(/\D/g, ''), 10) || 0;
    const offset = (n + 1) % 4;
    const hour = 13 + (n % 6);             // 13-18
    const minute = ((n + 1) % 2) * 30;
    return this.formatSlotLabel(offset, hour, minute);
  }

  // Years of experience — prefers explicit data, falls back to a stable
  // value derived from the doctor id so older mock rows still render.
  doctorExperience(doctor: Doctor): number {
    if (doctor.experienceYears != null) return doctor.experienceYears;
    const n = parseInt(doctor.id.replace(/\D/g, ''), 10) || 0;
    return 5 + (n % 20);
  }

  doctorLanguages(doctor: Doctor): string {
    return (doctor.languages?.length ? doctor.languages : ['English']).join(', ');
  }

  doctorDesignation(doctor: Doctor | null): string {
    if (!doctor) return '';
    if (doctor.designation) return doctor.designation;
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
