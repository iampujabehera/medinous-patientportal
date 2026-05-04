import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { ApiService } from '../../core/services/api.service';
import { GeographyService } from '../../core/services/geography.service';
import { Doctor, BookingSlot, Appointment } from '../../core/models/patient.model';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatStepperModule,
    MatSelectModule, MatFormFieldModule, MatInputModule, MatChipsModule,
    MatRadioModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatDividerModule, SkeletonCardComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="booking-container">
      <h1>Book Appointment</h1>
      <p class="subtitle">Schedule a visit in just a few steps</p>

      <mat-stepper [linear]="true" #stepper [selectedIndex]="currentStep()">
        <!-- Step 1: Select Specialty & Doctor -->
        <mat-step [completed]="!!selectedDoctor()">
          <ng-template matStepLabel>Choose Doctor</ng-template>
          <div class="step-content">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Select Specialty</mat-label>
              <mat-select [value]="selectedSpecialty()" (selectionChange)="onSpecialtyChange($event.value)">
                @for (spec of specialties(); track spec) {
                  <mat-option [value]="spec">{{ spec }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            @if (loadingDoctors()) {
              @for (i of [1,2,3]; track i) {
                <app-skeleton-card [lines]="2" [showAvatar]="true" variant="compact" />
              }
            } @else {
              <div class="doctors-grid">
                @for (doctor of doctors(); track doctor.id) {
                  <mat-card class="doctor-card"
                            [class.selected]="selectedDoctor()?.id === doctor.id"
                            (click)="selectDoctor(doctor)">
                    <div class="doctor-avatar">
                      <mat-icon>person</mat-icon>
                    </div>
                    <div class="doctor-info">
                      <strong>{{ doctor.name }}</strong>
                      <span class="doctor-specialty">{{ doctor.specialty }}</span>
                    </div>
                    <div class="doctor-fee-col">
                      <span class="fee-amount">{{ formatCurrency(doctor.consultationFee) }}</span>
                      <span class="fee-label">Consultation Fee</span>
                    </div>
                    @if (selectedDoctor()?.id === doctor.id) {
                      <mat-icon class="check-icon">check_circle</mat-icon>
                    }
                  </mat-card>
                }
              </div>
            }

            <div class="step-actions">
              <button mat-flat-button color="primary"
                      [disabled]="!selectedDoctor()"
                      (click)="goToStep(1)">
                Continue
              </button>
            </div>
          </div>
        </mat-step>

        <!-- Step 2: Select Time Slot -->
        <mat-step [completed]="!!selectedSlot()">
          <ng-template matStepLabel>Pick Time</ng-template>
          <div class="step-content">
            @if (selectedDoctor(); as doc) {
              <div class="selected-doc-banner">
                <mat-icon>person</mat-icon>
                <span><strong>{{ doc.name }}</strong> — {{ doc.specialty }}</span>
                <span class="banner-fee">{{ formatCurrency(doc.consultationFee) }}</span>
                <button mat-stroked-button (click)="goToStep(0)">Change</button>
              </div>
            }

            @if (loadingSlots()) {
              <app-skeleton-card [lines]="4" />
            } @else {
              <div class="slots-grid">
                @for (slot of availableSlots(); track slot.id) {
                  <button mat-stroked-button
                          class="slot-btn"
                          [class.selected]="selectedSlot()?.id === slot.id"
                          [disabled]="!slot.available"
                          (click)="selectSlot(slot)">
                    <mat-icon>schedule</mat-icon>
                    {{ slot.time }}
                  </button>
                }
              </div>
              @if (!availableSlots().length) {
                <div class="empty-slots">
                  <mat-icon>event_busy</mat-icon>
                  <p>No available slots for this date. Try another date.</p>
                </div>
              }
            }

            <div class="step-actions">
              <button mat-stroked-button (click)="goToStep(0)">Back</button>
              <button mat-flat-button color="primary"
                      [disabled]="!selectedSlot()"
                      (click)="goToStep(2)">
                Continue
              </button>
            </div>
          </div>
        </mat-step>

        <!-- Step 3: Confirm & Pay -->
        <mat-step [completed]="!!bookedAppointment()">
          <ng-template matStepLabel>Confirm</ng-template>
          <div class="step-content">
            @if (!bookedAppointment()) {
              <!-- Appointment Summary -->
              <mat-card class="confirm-card">
                <h3>Appointment Summary</h3>
                <mat-divider></mat-divider>
                <div class="confirm-details">
                  <div class="confirm-row">
                    <mat-icon>person</mat-icon>
                    <span>{{ selectedDoctor()?.name }} — {{ selectedDoctor()?.specialty }}</span>
                  </div>
                  <div class="confirm-row">
                    <mat-icon>event</mat-icon>
                    <span>{{ selectedSlot()?.date | date:'fullDate' }}</span>
                  </div>
                  <div class="confirm-row">
                    <mat-icon>schedule</mat-icon>
                    <span>{{ selectedSlot()?.time }}</span>
                  </div>
                </div>
              </mat-card>

              <!-- Fee Breakdown Card -->
              <mat-card class="fee-card">
                <div class="fee-card-header">
                  <mat-icon>receipt</mat-icon>
                  <h3>Fee Details</h3>
                </div>
                <mat-divider></mat-divider>
                <div class="fee-breakdown">
                  <div class="fee-row">
                    <span>Consultation Fee</span>
                    <strong>{{ formatCurrency(selectedDoctor()?.consultationFee ?? 0) }}</strong>
                  </div>
                  <div class="fee-row">
                    <span>Advance Fee</span>
                    <strong>{{ formatCurrency(selectedDoctor()?.advanceFee ?? selectedDoctor()?.consultationFee ?? 0) }}</strong>
                  </div>
                  <mat-divider></mat-divider>
                  <div class="fee-row total-row">
                    <span>Total Payable</span>
                    <strong class="total-amount">{{ formatCurrency(selectedDoctor()?.consultationFee ?? 0) }}</strong>
                  </div>
                </div>
              </mat-card>

              <!-- Complaints / Reason -->
              <mat-card class="reason-card">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Enter Complaints / Reason for visit</mat-label>
                  <textarea matInput rows="3"
                            [ngModel]="visitReason()"
                            (ngModelChange)="visitReason.set($event)"
                            placeholder="Describe your symptoms or reason for visit"></textarea>
                </mat-form-field>
              </mat-card>

              <!-- Insurance Card Selection -->
              <mat-card class="insurance-select-card">
                <div class="insurance-select-header">
                  <mat-icon>health_and_safety</mat-icon>
                  <h3>Insurance</h3>
                </div>
                <div class="insurance-options">
                  <button mat-stroked-button
                          class="ins-option"
                          [class.selected]="!useInsurance()"
                          (click)="useInsurance.set(false)">
                    <mat-icon>account_balance_wallet</mat-icon> Self Pay
                  </button>
                  <button mat-stroked-button
                          class="ins-option"
                          [class.selected]="useInsurance()"
                          (click)="useInsurance.set(true)">
                    <mat-icon>health_and_safety</mat-icon> Use Insurance Card
                  </button>
                </div>
                @if (useInsurance()) {
                  <div class="ins-card-display">
                    <mat-icon>credit_card</mat-icon>
                    <div>
                      <strong>ADNIC Insurance</strong>
                      <span>Policy: POL-449921</span>
                    </div>
                    <mat-chip class="ins-active-chip">Active</mat-chip>
                  </div>
                }
              </mat-card>

              <!-- Action Buttons: Book & Pay / Book & Pay Later / Use Insurance -->
              <div class="pay-actions">
                <button mat-stroked-button (click)="goToStep(1)" class="back-btn">
                  Back
                </button>
                <div class="pay-buttons">
                  @if (useInsurance()) {
                    <button mat-flat-button
                            color="primary"
                            class="pay-now-btn"
                            [disabled]="booking()"
                            (click)="confirmBooking('insurance')">
                      @if (booking() && paymentMode() === 'insurance') {
                        <mat-spinner diameter="20"></mat-spinner>
                      } @else {
                        <mat-icon>health_and_safety</mat-icon>
                        Book with Insurance
                      }
                    </button>
                  } @else {
                    <button mat-flat-button
                            color="primary"
                            class="pay-now-btn"
                            [disabled]="booking()"
                            (click)="confirmBooking('pay_now')">
                      @if (booking() && paymentMode() === 'pay_now') {
                        <mat-spinner diameter="20"></mat-spinner>
                      } @else {
                        <mat-icon>payment</mat-icon>
                        Book & Pay
                      }
                    </button>
                    <button mat-stroked-button
                            class="pay-later-btn"
                            [disabled]="booking()"
                            (click)="confirmBooking('pay_later')">
                      @if (booking() && paymentMode() === 'pay_later') {
                        <mat-spinner diameter="20"></mat-spinner>
                      } @else {
                        Book & Pay Later
                      }
                    </button>
                  }
                </div>
              </div>
            } @else {
              <!-- Success State -->
              <mat-card class="success-card">
                <mat-icon class="success-icon">check_circle</mat-icon>
                <h2>Appointment Booked!</h2>
                <p class="success-subtitle">
                  @if (paymentMode() === 'pay_now') {
                    Payment of <strong>{{ formatCurrency(selectedDoctor()?.consultationFee ?? 0) }}</strong> received successfully.
                  } @else if (paymentMode() === 'insurance') {
                    Booked with insurance. Your insurer will be billed directly.
                  } @else {
                    Payment is pending. Please pay at the clinic before your consultation.
                  }
                </p>

                <mat-card class="booked-summary">
                  <div class="confirm-details">
                    <div class="confirm-row">
                      <mat-icon>person</mat-icon>
                      <span>{{ bookedAppointment()!.doctorName }}</span>
                    </div>
                    <div class="confirm-row">
                      <mat-icon>event</mat-icon>
                      <span>{{ bookedAppointment()!.date | date:'fullDate' }} at {{ bookedAppointment()!.time }}</span>
                    </div>
                    <mat-divider></mat-divider>
                    <div class="confirm-row fee-confirm-row">
                      <mat-icon>receipt</mat-icon>
                      <span>Consultation Fee</span>
                      <strong class="booked-fee">{{ formatCurrency(selectedDoctor()?.consultationFee ?? 0) }}</strong>
                    </div>
                    <div class="confirm-row">
                      <mat-icon>{{ paymentMode() === 'pay_now' ? 'check_circle' : paymentMode() === 'insurance' ? 'health_and_safety' : 'schedule' }}</mat-icon>
                      <span>
                        Payment: <strong [class.paid]="paymentMode() === 'pay_now' || paymentMode() === 'insurance'" [class.pending]="paymentMode() === 'pay_later'">
                          {{ paymentMode() === 'pay_now' ? 'Paid' : paymentMode() === 'insurance' ? 'Insurance' : 'Pay at Clinic' }}
                        </strong>
                      </span>
                    </div>
                  </div>
                </mat-card>

                <button mat-flat-button color="primary" (click)="resetBooking()">
                  Book Another
                </button>
              </mat-card>
            }
          </div>
        </mat-step>
      </mat-stepper>
    </div>
  `,
  styles: [`
    .booking-container { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 28px; font-weight: 600; color: #1a237e; margin: 0; }
    .subtitle { color: #666; margin: 4px 0 24px; }
    .step-content { padding: 20px 0; }
    .full-width { width: 100%; }

    /* Doctors */
    .doctors-grid { display: flex; flex-direction: column; gap: 12px; }

    .doctor-card {
      padding: 16px; display: flex; align-items: center; gap: 16px;
      cursor: pointer; transition: all 0.2s; border: 2px solid transparent;
    }
    .doctor-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .doctor-card.selected { border-color: #3f51b5; background: #f5f5ff; }

    .doctor-avatar {
      width: 48px; height: 48px; border-radius: 50%; background: #e8eaf6;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .doctor-avatar mat-icon { color: #3f51b5; }

    .doctor-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .doctor-specialty { font-size: 13px; color: #666; }
    .doctor-meta { display: flex; gap: 12px; font-size: 13px; color: #888; }
    .rating { display: flex; align-items: center; gap: 2px; }
    .star-icon { font-size: 16px; width: 16px; height: 16px; color: #ffc107; }
    .next-available { font-size: 12px; color: #4caf50; }
    .check-icon { color: #3f51b5; }

    /* Doctor Fee Column */
    .doctor-fee-col {
      display: flex; flex-direction: column; align-items: flex-end;
      flex-shrink: 0; padding: 4px 8px;
      background: #f0faf0; border-radius: 8px; border: 1px solid #c8e6c9;
    }
    .fee-amount {
      font-size: 18px; font-weight: 700; color: #2e7d32;
    }
    .fee-label {
      font-size: 11px; color: #66bb6a; white-space: nowrap;
    }

    /* Slots */
    .selected-doc-banner {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; background: #f5f5ff; border-radius: 8px; margin-bottom: 20px;
    }
    .selected-doc-banner mat-icon { color: #3f51b5; }
    .selected-doc-banner span { flex: 1; }
    .banner-fee {
      flex: 0 !important; font-weight: 600; color: #2e7d32;
      background: #e8f5e9; padding: 4px 12px; border-radius: 6px; font-size: 14px;
    }

    .slots-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px; margin-bottom: 20px;
    }
    .slot-btn {
      padding: 12px; display: flex; align-items: center; gap: 6px; justify-content: center;
    }
    .slot-btn.selected { background: #3f51b5 !important; color: white !important; }

    .empty-slots { text-align: center; padding: 40px; color: #888; }
    .empty-slots mat-icon { font-size: 48px; width: 48px; height: 48px; }

    /* Confirm */
    .confirm-card { padding: 24px; margin-bottom: 16px; }
    .confirm-card h3 { margin: 0 0 16px; }
    .confirm-details { padding: 16px 0; display: flex; flex-direction: column; gap: 12px; }
    .confirm-row { display: flex; align-items: center; gap: 12px; font-size: 15px; }
    .confirm-row mat-icon { color: #3f51b5; }

    /* Fee Card */
    .fee-card {
      padding: 24px; margin-bottom: 16px;
      border: 2px solid #e8f5e9; background: #fafff9;
    }
    .fee-card-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
    }
    .fee-card-header mat-icon { color: #2e7d32; }
    .fee-card-header h3 { margin: 0; color: #2e7d32; }

    .fee-breakdown { padding-top: 16px; }
    .fee-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0; font-size: 15px;
    }
    .total-row { padding-top: 16px; }
    .total-amount { font-size: 22px; color: #2e7d32; }

    /* Reason Card */
    .reason-card { padding: 20px; margin-bottom: 16px; }

    /* Insurance Selection */
    .insurance-select-card {
      padding: 20px; margin-bottom: 16px;
      border: 2px solid #e3f2fd; background: #f8fbff;
    }
    .insurance-select-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    }
    .insurance-select-header mat-icon { color: #1976d2; }
    .insurance-select-header h3 { margin: 0; color: #1976d2; font-size: 16px; }
    .insurance-options { display: flex; gap: 10px; margin-bottom: 12px; }
    .ins-option {
      flex: 1; padding: 10px !important; display: flex; align-items: center;
      gap: 6px; justify-content: center; font-size: 13px !important;
    }
    .ins-option.selected {
      background: #1976d2 !important; color: white !important;
      border-color: #1976d2 !important;
    }
    .ins-card-display {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; background: #e3f2fd; border-radius: 8px;
    }
    .ins-card-display mat-icon { color: #1976d2; }
    .ins-card-display div { flex: 1; display: flex; flex-direction: column; }
    .ins-card-display span { font-size: 12px; color: #666; }
    .ins-active-chip { background: #e8f5e9 !important; color: #2e7d32 !important; font-size: 11px !important; }

    /* Pay Actions */
    .pay-actions {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 24px; gap: 12px;
    }
    .pay-buttons {
      display: flex; flex-direction: column; gap: 10px; align-items: stretch;
      min-width: 240px;
    }
    .pay-now-btn {
      padding: 14px 32px !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      letter-spacing: 0.3px;
    }
    .pay-later-btn {
      padding: 12px 32px !important;
      font-size: 14px !important;
      color: #666 !important;
      border-color: #ccc !important;
      background: #f5f5f5 !important;
    }
    .pay-later-btn:hover {
      background: #eee !important;
    }
    .back-btn { align-self: flex-end; }

    /* Success */
    .success-card { padding: 40px; text-align: center; }
    .success-icon { font-size: 64px; width: 64px; height: 64px; color: #4caf50; margin-bottom: 16px; }
    .success-card h2 { color: #2e7d32; margin: 0 0 8px; }
    .success-subtitle { color: #666; margin-bottom: 20px; font-size: 15px; }

    .booked-summary {
      display: inline-block; text-align: left; padding: 20px 24px;
      margin-bottom: 24px; background: #fafafa;
    }
    .booked-summary .confirm-details { padding: 8px 0; }
    .fee-confirm-row strong { margin-left: auto; }
    .booked-fee { color: #2e7d32; font-size: 16px; }
    .paid { color: #2e7d32; }
    .pending { color: #f57c00; }

    .step-actions { display: flex; gap: 12px; margin-top: 24px; }

    @media (max-width: 600px) {
      .slots-grid { grid-template-columns: repeat(2, 1fr); }
      .pay-actions { flex-direction: column; }
      .pay-buttons { width: 100%; }
      .doctor-card { flex-wrap: wrap; }
      .doctor-fee-col { width: 100%; align-items: center; flex-direction: row; justify-content: space-between; }
    }
  `]
})
export class AppointmentsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly geo = inject(GeographyService);
  private readonly snackBar = inject(MatSnackBar);

  readonly currentStep = signal(0);
  readonly specialties = signal<string[]>([]);
  readonly selectedSpecialty = signal<string>('');
  readonly doctors = signal<Doctor[]>([]);
  readonly loadingDoctors = signal(false);
  readonly selectedDoctor = signal<Doctor | null>(null);
  readonly availableSlots = signal<BookingSlot[]>([]);
  readonly loadingSlots = signal(false);
  readonly selectedSlot = signal<BookingSlot | null>(null);
  readonly visitReason = signal('');
  readonly booking = signal(false);
  readonly bookedAppointment = signal<Appointment | null>(null);
  readonly paymentMode = signal<'pay_now' | 'pay_later' | 'insurance'>('pay_now');
  readonly useInsurance = signal(false);

  ngOnInit(): void {
    this.api.getSpecialties().subscribe(specs => {
      this.specialties.set(specs);
    });
    this.api.getDoctors().subscribe(docs => {
      this.doctors.set(docs);
    });
  }

  onSpecialtyChange(specialty: string): void {
    this.selectedSpecialty.set(specialty);
    this.selectedDoctor.set(null);
    this.loadingDoctors.set(true);
    this.api.getDoctors(specialty).subscribe(docs => {
      this.doctors.set(docs);
      this.loadingDoctors.set(false);
    });
  }

  selectDoctor(doctor: Doctor): void {
    this.selectedDoctor.set(doctor);
    this.selectedSlot.set(null);
    this.loadSlots(doctor);
  }

  private loadSlots(doctor: Doctor): void {
    this.loadingSlots.set(true);
    this.api.getAvailableSlots(doctor.id, doctor.nextAvailable).subscribe(slots => {
      this.availableSlots.set(slots.filter(s => s.available));
      this.loadingSlots.set(false);
    });
  }

  selectSlot(slot: BookingSlot): void {
    this.selectedSlot.set(slot);
  }

  goToStep(step: number): void {
    this.currentStep.set(step);
  }

  formatCurrency(amount: number): string {
    const config = this.geo.config();
    return new Intl.NumberFormat(config.locale, {
      style: 'currency', currency: config.currency, minimumFractionDigits: 2
    }).format(amount);
  }

  confirmBooking(mode: 'pay_now' | 'pay_later' | 'insurance'): void {
    const slot = this.selectedSlot();
    if (!slot) return;

    this.paymentMode.set(mode);
    this.booking.set(true);
    this.api.bookAppointment(slot, this.visitReason()).subscribe(appt => {
      this.bookedAppointment.set(appt);
      this.booking.set(false);
      const message = mode === 'pay_now'
        ? 'Appointment booked & payment received!'
        : mode === 'insurance'
        ? 'Appointment booked with insurance!'
        : 'Appointment booked! Payment due at clinic.';
      this.snackBar.open(message, 'Close', {
        duration: 4000,
        panelClass: mode === 'pay_now' ? 'success-snackbar' : ''
      });
    });
  }

  resetBooking(): void {
    this.currentStep.set(0);
    this.selectedDoctor.set(null);
    this.selectedSlot.set(null);
    this.visitReason.set('');
    this.bookedAppointment.set(null);
    this.paymentMode.set('pay_now');
  }
}
