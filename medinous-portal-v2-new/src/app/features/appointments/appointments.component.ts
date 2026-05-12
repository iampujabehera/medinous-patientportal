import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
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
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { ApiService } from '../../core/services/api.service';
import { GeographyService } from '../../core/services/geography.service';
import { Doctor, BookingSlot, Appointment } from '../../core/models/patient.model';

type BookingPhase = 'find' | 'detail' | 'success';
type PaymentMethod = 'pay_at_hospital' | 'pay_now';
type SlotPeriod = 'morning' | 'afternoon' | 'evening';

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
    MatDividerModule, MatChipsModule, MatMenuModule, SkeletonCardComponent
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

          <!-- Search + specialty dropdown (same row) -->
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
            <button mat-stroked-button class="spec-btn" [matMenuTriggerFor]="specMenu">
              <mat-icon class="spec-icon">{{ specialtyIcon(selectedSpecialty()) }}</mat-icon>
              <span class="spec-label">{{ selectedSpecialty() === 'all' ? 'All Specialties' : selectedSpecialty() }}</span>
              <mat-icon class="spec-caret">expand_more</mat-icon>
            </button>
            <mat-menu #specMenu="matMenu" class="spec-menu">
              <button mat-menu-item (click)="setSpecialty('all')">
                <mat-icon [class.spec-current]="selectedSpecialty() === 'all'">apps</mat-icon>
                <span>All Specialties</span>
              </button>
              @for (s of specialties(); track s) {
                <button mat-menu-item (click)="setSpecialty(s)">
                  <mat-icon [class.spec-current]="selectedSpecialty() === s">{{ specialtyIcon(s) }}</mat-icon>
                  <span>{{ s }}</span>
                </button>
              }
            </mat-menu>
          </div>

          @if (loadingDoctors()) {
            @for (i of [1,2,3]; track i) {
              <app-skeleton-card [lines]="2" [showAvatar]="true" variant="compact" />
            }
          } @else {
            <div class="doctors-list">
              @for (doc of filteredDoctors(); track doc.id) {
                <div class="doc-row" (click)="selectDoctor(doc)">
                  <div class="doc-avatar"><mat-icon>person</mat-icon></div>
                  <div class="doc-body">
                    <strong class="doc-name">{{ doc.name }}</strong>
                    <span class="doc-specialty">{{ doc.specialty }}</span>
                    <div class="doc-meta">
                      <span class="rating">
                        <mat-icon class="star-icon">star</mat-icon>
                        <strong>{{ doc.rating.toFixed(1) }}</strong>
                        <span class="reviews">({{ reviewCount(doc) }} reviews)</span>
                      </span>
                      <span class="dot-sep">·</span>
                      <span class="avail-pill" [class.today]="nextAvailableLabel(doc).startsWith('Available today')">
                        <mat-icon class="avail-icon">event_available</mat-icon>
                        {{ nextAvailableLabel(doc) }}
                      </span>
                    </div>
                  </div>
                  <div class="doc-fee-col">
                    <strong>{{ formatCurrency(doc.consultationFee) }}</strong>
                    <span>Consultation</span>
                  </div>
                  <mat-icon class="row-chevron">chevron_right</mat-icon>
                </div>
              }
              @if (!filteredDoctors().length) {
                <div class="empty-state">
                  <mat-icon>search_off</mat-icon>
                  <p>
                    @if (searchQuery()) { No doctors match "{{ searchQuery() }}". }
                    @else { No doctors found in this specialty. }
                  </p>
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
        <div class="booking-content">
          <a class="back-link" (click)="goBackToFind()">
            <mat-icon>arrow_back</mat-icon> Back to doctors
          </a>

          <!-- Selected doctor compact card -->
          @if (selectedDoctor(); as doc) {
            <div class="selected-doc-card">
              <div class="doc-avatar"><mat-icon>person</mat-icon></div>
              <div class="doc-body">
                <strong class="doc-name">{{ doc.name }}</strong>
                <span class="doc-specialty">{{ doc.specialty }}</span>
                <span class="rating">
                  <mat-icon class="star-icon">star</mat-icon>
                  <strong>{{ doc.rating.toFixed(1) }}</strong>
                  <span class="reviews">({{ reviewCount(doc) }} reviews)</span>
                </span>
              </div>
              <div class="doc-fee-col">
                <strong>{{ formatCurrency(doc.consultationFee) }}</strong>
                <span>Consultation</span>
              </div>
            </div>
          }

          <!-- Date strip -->
          <section class="section">
            <div class="section-head">
              <span class="head-left">
                <mat-icon>event</mat-icon>
                <h3>Select Date</h3>
              </span>
              <span class="month-label">{{ currentMonthLabel() }}</span>
            </div>
            <div class="date-strip">
              @for (d of dateOptions(); track d.date) {
                <button class="date-pill"
                        [class.active]="selectedDate() === d.date"
                        (click)="selectDate(d.date)">
                  <span class="date-pill-label">{{ d.dayLabel }}</span>
                  <span class="date-pill-num">{{ d.dayNum }}</span>
                </button>
              }
            </div>
          </section>

          <!-- Time slots grouped by period -->
          <section class="section">
            <div class="section-head">
              <span class="head-left">
                <mat-icon>schedule</mat-icon>
                <h3>Available Time</h3>
              </span>
            </div>

            @if (morningSlots().length) {
              <h4 class="period-label">Morning</h4>
              <div class="slots-grid">
                @for (slot of morningSlots(); track slot.id) {
                  <button class="slot-pill"
                          [class.selected]="selectedSlot()?.id === slot.id"
                          [disabled]="!slot.available"
                          (click)="selectSlot(slot)">{{ slot.time }}</button>
                }
              </div>
            }

            @if (afternoonSlots().length) {
              <h4 class="period-label">Afternoon</h4>
              <div class="slots-grid">
                @for (slot of afternoonSlots(); track slot.id) {
                  <button class="slot-pill"
                          [class.selected]="selectedSlot()?.id === slot.id"
                          [disabled]="!slot.available"
                          (click)="selectSlot(slot)">{{ slot.time }}</button>
                }
              </div>
            }

            @if (eveningSlots().length) {
              <h4 class="period-label">Evening</h4>
              <div class="slots-grid">
                @for (slot of eveningSlots(); track slot.id) {
                  <button class="slot-pill"
                          [class.selected]="selectedSlot()?.id === slot.id"
                          [disabled]="!slot.available"
                          (click)="selectSlot(slot)">{{ slot.time }}</button>
                }
              </div>
            }
          </section>

          <!-- Payment Method -->
          <section class="section">
            <div class="section-head">
              <span class="head-left">
                <mat-icon>credit_card</mat-icon>
                <h3>Payment Method</h3>
              </span>
            </div>

            <label class="pay-card" [class.selected]="paymentMethod() === 'pay_at_hospital'">
              <input type="radio" name="pm" value="pay_at_hospital"
                     [checked]="paymentMethod() === 'pay_at_hospital'"
                     (change)="paymentMethod.set('pay_at_hospital')">
              <mat-icon class="pay-icon">local_hospital</mat-icon>
              <div class="pay-text">
                <strong>Pay at Hospital</strong>
                <span>Book now and pay during your visit at the clinic. No upfront payment required.</span>
              </div>
            </label>

            <label class="pay-card" [class.selected]="paymentMethod() === 'pay_now'">
              <input type="radio" name="pm" value="pay_now"
                     [checked]="paymentMethod() === 'pay_now'"
                     (change)="paymentMethod.set('pay_now')">
              <mat-icon class="pay-icon">payment</mat-icon>
              <div class="pay-text">
                <strong>Pay Now</strong>
                <span>Pay securely online now and save time at the clinic.</span>
              </div>
            </label>
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

        <!-- Sticky bottom CTA bar -->
        <div class="sticky-cta">
          <button mat-stroked-button class="cta-back" (click)="goBackToFind()">
            Back
          </button>
          <button mat-flat-button color="primary" class="cta-primary"
                  [disabled]="!selectedSlot() || booking()"
                  (click)="bookAppointment()">
            @if (booking()) {
              <mat-spinner diameter="20" class="cta-spin"></mat-spinner>
              Booking...
            } @else if (paymentMethod() === 'pay_now') {
              Pay {{ formatCurrency(selectedDoctor()?.consultationFee ?? 0) }} & Book
            } @else {
              Book Appointment
            }
          </button>
        </div>
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

    .spec-btn {
      flex-shrink: 0; height: 42px !important;
      border-radius: 22px !important;
      border-color: #d8e3e3 !important; background: white !important;
      color: #1b3a4b !important; font-weight: 500 !important;
      font-size: 13px !important;
      padding: 0 14px !important;
      display: inline-flex !important; align-items: center; gap: 6px;
    }
    .spec-btn .spec-icon {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      color: #0d8a8a;
    }
    .spec-btn .spec-caret {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      color: #888;
    }
    .spec-label { white-space: nowrap; }
    .spec-current { color: #0d8a8a !important; }

    @media (max-width: 600px) {
      .filter-row { flex-direction: column; gap: 8px; }
      .search-wrap, .spec-btn { width: 100%; }
      .spec-btn { justify-content: space-between !important; }
    }

    /* =============================================
       DOCTOR ROW (find phase)
       ============================================= */
    .doctors-list { display: flex; flex-direction: column; gap: 10px; }
    .doc-row {
      display: flex; align-items: center; gap: 14px;
      padding: 14px; border-radius: 12px;
      background: white; border: 1px solid #e8eded;
      cursor: pointer; transition: all 0.18s;
    }
    .doc-row:hover {
      border-color: #80cbc4;
      box-shadow: 0 4px 14px rgba(13,138,138,0.10);
      transform: translateY(-1px);
    }
    .doc-avatar {
      width: 48px; height: 48px; border-radius: 50%;
      background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .doc-avatar mat-icon {
      color: #0d8a8a; font-size: 28px; width: 28px; height: 28px;
    }
    .doc-body {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; gap: 2px;
    }
    .doc-name {
      font-size: 15px; color: #1b3a4b; font-weight: 700;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .doc-specialty { font-size: 13px; color: #0d8a8a; font-weight: 600; }
    .doc-clinic { font-size: 12px; color: #888; }
    .doc-meta {
      display: flex; align-items: center; flex-wrap: wrap;
      gap: 6px; margin-top: 4px; font-size: 12px;
    }
    .rating {
      display: inline-flex; align-items: center; gap: 3px;
      color: #555;
    }
    .rating strong { color: #1b3a4b; }
    .reviews { color: #999; }
    .star-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
      color: #ffb300;
    }
    .dot-sep { color: #ccc; }
    .avail-pill {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 8px; border-radius: 10px;
      background: #f0f7f7; color: #0d8a8a; font-weight: 600; font-size: 11px;
    }
    .avail-pill.today {
      background: #e8f5e9; color: #2e7d32;
    }
    .avail-icon {
      font-size: 14px !important; width: 14px !important; height: 14px !important;
    }
    .doc-fee-col {
      display: flex; flex-direction: column; align-items: flex-end;
      flex-shrink: 0;
    }
    .doc-fee-col strong {
      font-size: 16px; color: #2e7d32; font-weight: 700;
    }
    .doc-fee-col span {
      font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.3px;
    }
    .row-chevron { color: #c0c0c0; flex-shrink: 0; }
    .doc-row:hover .row-chevron { color: #0d8a8a; }

    .empty-state {
      text-align: center; padding: 40px; color: #999;
    }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 8px; }

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

    .selected-doc-card {
      display: flex; align-items: center; gap: 12px;
      padding: 14px; border-radius: 12px;
      background: linear-gradient(135deg, #f8fafa 0%, #eef5f5 100%);
      border: 1px solid #d8e8e8; margin-bottom: 18px;
    }
    .selected-doc-card .doc-name { font-size: 15px; }
    .selected-doc-card .doc-clinic { margin-bottom: 3px; }

    .section { margin-bottom: 22px; }
    .section-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 10px;
    }
    .head-left {
      display: flex; align-items: center; gap: 8px;
    }
    .head-left mat-icon { color: #0d8a8a; font-size: 20px; width: 20px; height: 20px; }
    .head-left h3 {
      margin: 0; font-size: 15px; font-weight: 700; color: #1b3a4b;
    }
    .month-label {
      font-size: 12px; color: #888; font-weight: 500;
    }

    /* Date strip */
    .date-strip {
      display: flex; gap: 8px; overflow-x: auto;
      padding: 2px 2px 6px;
      scrollbar-width: thin;
    }
    .date-strip::-webkit-scrollbar { height: 4px; }
    .date-strip::-webkit-scrollbar-thumb { background: #d8e3e3; border-radius: 2px; }
    .date-pill {
      flex-shrink: 0; min-width: 56px;
      padding: 8px 6px; border-radius: 10px;
      border: 1px solid #e0e8e8; background: white;
      cursor: pointer; transition: all 0.18s;
      display: flex; flex-direction: column; align-items: center; gap: 2px;
    }
    .date-pill:hover { border-color: #80cbc4; }
    .date-pill.active {
      background: #0d8a8a; border-color: #0d8a8a;
      box-shadow: 0 4px 12px rgba(13,138,138,0.30);
    }
    .date-pill-label {
      font-size: 10px; color: #888; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .date-pill.active .date-pill-label { color: rgba(255,255,255,0.85); }
    .date-pill-num {
      font-size: 18px; font-weight: 700; color: #1b3a4b;
    }
    .date-pill.active .date-pill-num { color: white; }

    /* Time slots */
    .period-label {
      font-size: 13px; color: #666; font-weight: 600;
      margin: 14px 0 8px; text-transform: capitalize;
    }
    .slots-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
      gap: 8px;
    }
    .slot-pill {
      padding: 10px; border-radius: 8px;
      border: 1px solid #e0e8e8; background: white;
      font-size: 13px; font-weight: 500; color: #1b3a4b;
      cursor: pointer; transition: all 0.18s;
    }
    .slot-pill:hover:not(:disabled) {
      border-color: #80cbc4; background: #f5fafa;
    }
    .slot-pill.selected {
      background: #0d8a8a; color: white; border-color: #0d8a8a;
      box-shadow: 0 2px 8px rgba(13,138,138,0.30);
    }
    .slot-pill:disabled {
      color: #c0c0c0; background: #fafafa; cursor: not-allowed;
      border-color: #f0f0f0;
    }

    /* Payment cards */
    .pay-card {
      display: flex; align-items: center; gap: 12px;
      padding: 14px; border-radius: 12px;
      border: 2px solid #e0e8e8; background: white;
      margin-bottom: 10px; cursor: pointer; transition: all 0.18s;
    }
    .pay-card:hover { border-color: #80cbc4; }
    .pay-card.selected {
      border-color: #0d8a8a; background: #f0f7f7;
      box-shadow: 0 2px 8px rgba(13,138,138,0.12);
    }
    .pay-card input[type="radio"] {
      accent-color: #0d8a8a; width: 18px; height: 18px; margin: 0; flex-shrink: 0;
    }
    .pay-icon {
      color: #0d8a8a; font-size: 22px; width: 22px; height: 22px; flex-shrink: 0;
    }
    .pay-text { display: flex; flex-direction: column; gap: 2px; }
    .pay-text strong { font-size: 14px; color: #1b3a4b; font-weight: 700; }
    .pay-text span { font-size: 12px; color: #666; line-height: 1.4; }

    .reason-section { margin-bottom: 8px; }

    /* Sticky bottom CTA */
    .sticky-cta {
      position: sticky; bottom: 0; z-index: 20;
      display: flex; gap: 10px;
      padding: 12px 0;
      background: linear-gradient(to bottom, rgba(245,247,250,0) 0%, rgba(245,247,250,0.9) 30%, #f5f7fa 100%);
      margin: 0 -24px; padding-left: 24px; padding-right: 24px;
      border-top: 1px solid #e0e0e0;
    }
    .cta-back {
      flex-shrink: 0;
      padding: 10px 22px !important;
      border-color: #ccc !important; color: #555 !important;
      font-weight: 600 !important;
    }
    .cta-primary {
      flex: 1;
      padding: 12px !important;
      font-size: 15px !important; font-weight: 600 !important;
      background: #0d8a8a !important; color: white !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(13,138,138,0.30) !important;
    }
    .cta-primary:disabled {
      background: #b2dfdb !important; box-shadow: none !important;
    }
    .cta-spin { display: inline-block; vertical-align: middle; margin-right: 6px; }

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
      .doc-row { padding: 12px; gap: 10px; }
      .doc-fee-col strong { font-size: 14px; }
      .slots-grid { grid-template-columns: repeat(3, 1fr); }
      .sticky-cta { margin: 0 -16px; padding-left: 16px; padding-right: 16px; }
      .selected-doc-card { padding: 12px; }
    }
    @media (max-width: 380px) {
      .slots-grid { grid-template-columns: repeat(2, 1fr); }
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

  readonly currentMonthLabel = computed(() => {
    const sel = this.dateOptions().find(d => d.date === this.selectedDate());
    if (!sel) return '';
    return `${sel.monthName} ${sel.year}`;
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

  reviewCount(doctor: Doctor): number {
    // Stable per-doctor review count (80–280).
    const numericPart = parseInt(doctor.id.replace(/\D/g, ''), 10) || 1;
    return 80 + (numericPart * 41) % 200;
  }

  nextAvailableLabel(doctor: Doctor): string {
    // Stable per-doctor offset 0–3 days from today.
    const numericPart = parseInt(doctor.id.replace(/\D/g, ''), 10) || 0;
    const offset = numericPart % 4;
    if (offset === 0) return 'Available today';
    if (offset === 1) return 'Available tomorrow';
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `Available ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
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
