import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
      <div class="guest-header">
        <mat-icon class="header-icon">person_add</mat-icon>
        <h1>{{ 'guest.title' | translate }}</h1>
        <p class="subtitle">{{ 'guest.subtitle' | translate }}</p>
      </div>

      @if (!bookingResult()) {
        <mat-stepper [linear]="true" #stepper [selectedIndex]="currentStep()">
          <!-- Step 1: Location -->
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
                      <span class="loc-hours">
                        <mat-icon class="tiny-icon">schedule</mat-icon>
                        {{ loc.operatingHours }}
                      </span>
                      <span class="loc-phone">
                        <mat-icon class="tiny-icon">phone</mat-icon>
                        {{ loc.phone }}
                      </span>
                      <div class="loc-specialties">
                        @for (spec of loc.specialties.slice(0, 3); track spec) {
                          <mat-chip class="spec-chip">{{ spec }}</mat-chip>
                        }
                        @if (loc.specialties.length > 3) {
                          <mat-chip class="spec-chip">+{{ loc.specialties.length - 3 }}</mat-chip>
                        }
                      </div>
                    </div>
                    @if (selectedLocation()?.id === loc.id) {
                      <mat-icon class="check-icon">check_circle</mat-icon>
                    }
                  </mat-card>
                }
              </div>
              <div class="step-actions">
                <button mat-flat-button color="primary"
                        [disabled]="!selectedLocation()"
                        (click)="goToStep(1)">
                  {{ 'appt.continue' | translate }}
                </button>
              </div>
            </div>
          </mat-step>

          <!-- Step 2: Guest Details -->
          <mat-step [completed]="isGuestValid()">
            <ng-template matStepLabel>{{ 'guest.your_details' | translate }}</ng-template>
            <div class="step-content">
              <mat-card class="form-card">
                <div class="form-row">
                  <mat-form-field appearance="outline" class="half-width">
                    <mat-label>{{ 'guest.first_name' | translate }}</mat-label>
                    <input matInput [ngModel]="guest().firstName" (ngModelChange)="updateGuest('firstName', $event)" required>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="half-width">
                    <mat-label>{{ 'guest.last_name' | translate }}</mat-label>
                    <input matInput [ngModel]="guest().lastName" (ngModelChange)="updateGuest('lastName', $event)" required>
                  </mat-form-field>
                </div>
                <div class="form-row">
                  <mat-form-field appearance="outline" class="half-width">
                    <mat-label>{{ 'guest.phone' | translate }}</mat-label>
                    <input matInput type="tel" [ngModel]="guest().phone" (ngModelChange)="updateGuest('phone', $event)" required>
                    <mat-icon matPrefix>phone</mat-icon>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="half-width">
                    <mat-label>{{ 'guest.email' | translate }}</mat-label>
                    <input matInput type="email" [ngModel]="guest().email" (ngModelChange)="updateGuest('email', $event)" required>
                    <mat-icon matPrefix>email</mat-icon>
                  </mat-form-field>
                </div>
                <div class="form-row">
                  <mat-form-field appearance="outline" class="half-width">
                    <mat-label>{{ 'guest.id_type' | translate }}</mat-label>
                    <mat-select [ngModel]="guest().idType" (ngModelChange)="updateGuest('idType', $event)">
                      <mat-option value="national_id">CPR / National ID</mat-option>
                      <mat-option value="passport">Passport</mat-option>
                      <mat-option value="driving_license">Driving License</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="half-width">
                    <mat-label>{{ 'guest.id_number' | translate }}</mat-label>
                    <input matInput [ngModel]="guest().idNumber" (ngModelChange)="updateGuest('idNumber', $event)">
                  </mat-form-field>
                </div>
              </mat-card>
              <div class="step-actions">
                <button mat-stroked-button (click)="goToStep(0)">{{ 'appt.back' | translate }}</button>
                <button mat-flat-button color="primary"
                        [disabled]="!isGuestValid()"
                        (click)="goToStep(2)">
                  {{ 'appt.continue' | translate }}
                </button>
              </div>
            </div>
          </mat-step>

          <!-- Step 3: Choose Doctor & Slot -->
          <mat-step [completed]="!!selectedSlot()">
            <ng-template matStepLabel>{{ 'appt.choose_doctor' | translate }}</ng-template>
            <div class="step-content">
              <mat-form-field appearance="outline" class="full-width">
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
              }

              @if (selectedDoctor()) {
                <h3 style="margin-top: 20px">{{ 'appt.pick_time' | translate }}</h3>
                @if (loadingSlots()) {
                  <app-skeleton-card [lines]="2" />
                } @else {
                  <div class="slots-grid">
                    @for (slot of availableSlots(); track slot.id) {
                      <button mat-stroked-button class="slot-btn"
                              [class.selected]="selectedSlot()?.id === slot.id"
                              [disabled]="!slot.available"
                              (click)="selectedSlot.set(slot)">
                        <mat-icon>schedule</mat-icon> {{ slot.time }}
                      </button>
                    }
                  </div>
                }
              }

              <div class="step-actions">
                <button mat-stroked-button (click)="goToStep(1)">{{ 'appt.back' | translate }}</button>
                <button mat-flat-button color="primary"
                        [disabled]="!selectedSlot()"
                        (click)="goToStep(3)">
                  {{ 'appt.continue' | translate }}
                </button>
              </div>
            </div>
          </mat-step>

          <!-- Step 4: Confirm -->
          <mat-step>
            <ng-template matStepLabel>{{ 'appt.confirm' | translate }}</ng-template>
            <div class="step-content">
              <mat-card class="confirm-card">
                <h3>{{ 'appt.summary' | translate }}</h3>
                <mat-divider></mat-divider>
                <div class="confirm-details">
                  <div class="confirm-row">
                    <mat-icon>local_hospital</mat-icon>
                    <span>{{ selectedLocation()?.name }}</span>
                  </div>
                  <div class="confirm-row">
                    <mat-icon>person</mat-icon>
                    <span>{{ guest().firstName }} {{ guest().lastName }}</span>
                  </div>
                  <div class="confirm-row">
                    <mat-icon>medical_services</mat-icon>
                    <span>{{ selectedDoctor()?.name }} — {{ selectedDoctor()?.specialty }}</span>
                  </div>
                  <div class="confirm-row">
                    <mat-icon>event</mat-icon>
                    <span>{{ selectedSlot()?.date | date:'fullDate' }} at {{ selectedSlot()?.time }}</span>
                  </div>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'appt.reason' | translate }}</mat-label>
                  <textarea matInput rows="3" [ngModel]="visitReason()" (ngModelChange)="visitReason.set($event)"></textarea>
                </mat-form-field>
              </mat-card>

              <div class="step-actions">
                <button mat-stroked-button (click)="goToStep(2)">{{ 'appt.back' | translate }}</button>
                <button mat-flat-button color="primary"
                        [disabled]="booking()"
                        (click)="confirmBooking()">
                  @if (booking()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    {{ 'appt.confirm_booking' | translate }}
                  }
                </button>
              </div>
            </div>
          </mat-step>
        </mat-stepper>
      } @else {
        <!-- Success -->
        <mat-card class="success-card">
          <mat-icon class="success-icon">check_circle</mat-icon>
          <h2>{{ 'appt.booked' | translate }}</h2>
          <div class="confirm-details">
            <div class="confirm-row">
              <mat-icon>person</mat-icon>
              <span>{{ bookingResult()!.appointment.doctorName }}</span>
            </div>
            <div class="confirm-row">
              <mat-icon>event</mat-icon>
              <span>{{ bookingResult()!.appointment.date | date:'fullDate' }} at {{ bookingResult()!.appointment.time }}</span>
            </div>
            <div class="confirm-row">
              <mat-icon>location_on</mat-icon>
              <span>{{ selectedLocation()?.name }}</span>
            </div>
          </div>

          <mat-divider></mat-divider>

          <div class="register-prompt">
            <mat-icon>how_to_reg</mat-icon>
            <p>{{ 'guest.register_prompt' | translate }}</p>
            <div class="register-actions">
              <button mat-flat-button color="primary">
                <mat-icon>person_add</mat-icon>
                {{ 'guest.register' | translate }}
              </button>
              <button mat-stroked-button (click)="resetBooking()">
                {{ 'appt.book_another' | translate }}
              </button>
            </div>
          </div>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .guest-container { max-width: 800px; margin: 0 auto; }
    .guest-container.rtl { direction: rtl; text-align: right; }

    .guest-header { text-align: center; margin-bottom: 32px; }
    .header-icon { font-size: 48px; width: 48px; height: 48px; color: #3f51b5; margin-bottom: 12px; }
    h1 { font-size: 28px; font-weight: 600; color: #1a237e; margin: 0; }
    .subtitle { color: #666; margin: 4px 0 0; }

    .step-content { padding: 20px 0; }
    .full-width { width: 100%; }

    /* Locations */
    .locations-grid { display: flex; flex-direction: column; gap: 12px; }
    .location-card {
      padding: 16px; display: flex; align-items: flex-start; gap: 16px;
      cursor: pointer; border: 2px solid transparent; transition: all 0.2s;
    }
    .location-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .location-card.selected { border-color: #3f51b5; background: #f5f5ff; }

    .loc-icon {
      width: 48px; height: 48px; border-radius: 12px; background: #e8eaf6;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .loc-icon mat-icon { color: #3f51b5; }
    .loc-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .loc-address, .loc-hours, .loc-phone { font-size: 13px; color: #666; display: flex; align-items: center; gap: 4px; }
    .tiny-icon { font-size: 14px; width: 14px; height: 14px; }
    .loc-specialties { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .spec-chip { font-size: 11px !important; min-height: 22px !important; background: #e8eaf6 !important; color: #3f51b5 !important; }
    .check-icon { color: #3f51b5; flex-shrink: 0; }

    /* Form */
    .form-card { padding: 24px; }
    .form-row { display: flex; gap: 16px; }
    .half-width { flex: 1; }

    /* Doctors */
    .doctor-card {
      padding: 16px; display: flex; align-items: center; gap: 14px;
      cursor: pointer; border: 2px solid transparent; transition: all 0.2s; margin-bottom: 8px;
    }
    .doctor-card.selected { border-color: #3f51b5; background: #f5f5ff; }
    .doctor-avatar {
      width: 44px; height: 44px; border-radius: 50%; background: #e8eaf6;
      display: flex; align-items: center; justify-content: center;
    }
    .doctor-avatar mat-icon { color: #3f51b5; }
    .doctor-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .doctor-specialty { font-size: 13px; color: #666; }
    .doctor-rating { font-size: 13px; display: flex; align-items: center; gap: 2px; }
    .star-icon { font-size: 16px; width: 16px; height: 16px; color: #ffc107; }

    /* Slots */
    .slots-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 8px; margin-bottom: 16px;
    }
    .slot-btn { padding: 10px; display: flex; align-items: center; gap: 6px; justify-content: center; }
    .slot-btn.selected { background: #3f51b5 !important; color: white !important; }

    /* Confirm */
    .confirm-card { padding: 24px; }
    .confirm-card h3 { margin: 0 0 16px; }
    .confirm-details { padding: 16px 0; display: flex; flex-direction: column; gap: 12px; }
    .confirm-row { display: flex; align-items: center; gap: 12px; font-size: 15px; }
    .confirm-row mat-icon { color: #3f51b5; }

    /* Success */
    .success-card { padding: 40px; text-align: center; }
    .success-icon { font-size: 64px; width: 64px; height: 64px; color: #4caf50; margin-bottom: 16px; }
    .success-card h2 { color: #2e7d32; margin: 0 0 8px; }
    .success-card .confirm-details { display: inline-flex; text-align: left; }

    .register-prompt { margin-top: 24px; padding-top: 24px; }
    .register-prompt mat-icon { font-size: 32px; width: 32px; height: 32px; color: #3f51b5; }
    .register-prompt p { color: #666; margin: 8px 0 16px; }
    .register-actions { display: flex; gap: 12px; justify-content: center; }

    .step-actions { display: flex; gap: 12px; margin-top: 24px; }

    @media (max-width: 600px) {
      .form-row { flex-direction: column; }
      .slots-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class GuestBookingComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly i18n = inject(I18nService);
  readonly locationService = inject(LocationService);
  private readonly snackBar = inject(MatSnackBar);

  readonly currentStep = signal(0);
  readonly selectedLocation = signal<ClinicLocation | null>(null);
  readonly guest = signal<GuestPatient>({
    firstName: '', lastName: '', phone: '', email: ''
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
  }

  selectLocation(loc: ClinicLocation): void {
    this.selectedLocation.set(loc);
  }

  updateGuest(field: keyof GuestPatient, value: string): void {
    this.guest.update(g => ({ ...g, [field]: value }));
  }

  isGuestValid(): boolean {
    const g = this.guest();
    return !!(g.firstName && g.lastName && g.phone && g.email);
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
}
