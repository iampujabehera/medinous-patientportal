import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { AppointmentsComponent } from './appointments.component';
import { ApiService } from '../../core/services/api.service';
import { of } from 'rxjs';
import { Doctor, BookingSlot, Appointment } from '../../core/models/patient.model';

const MOCK_SPECIALTIES = ['Cardiology', 'Dermatology', 'General Medicine'];

const MOCK_DOCTORS: Doctor[] = [
  {
    id: 'doc-1', name: 'Dr. Kumar', specialty: 'Cardiology',
    rating: 4.8, nextAvailable: '2026-04-20', location: 'Juffair',
    consultationFee: 25, advanceFee: 25
  },
  {
    id: 'doc-2', name: 'Dr. Chen', specialty: 'Dermatology',
    rating: 4.5, nextAvailable: '2026-04-21', location: 'Seef',
    consultationFee: 30
  }
];

const MOCK_SLOTS: BookingSlot[] = [
  { id: 'slot-1', date: '2026-04-20', time: '09:00 AM', available: true, doctorId: 'doc-1' },
  { id: 'slot-2', date: '2026-04-20', time: '10:00 AM', available: true, doctorId: 'doc-1' },
  { id: 'slot-3', date: '2026-04-20', time: '11:00 AM', available: false, doctorId: 'doc-1' }
];

const MOCK_APPOINTMENT: Appointment = {
  id: 'appt-1', doctorName: 'Dr. Kumar', specialty: 'Cardiology',
  date: '2026-04-20', time: '09:00 AM', status: 'scheduled',
  location: 'Juffair', type: 'in_person'
};

describe('AppointmentsComponent', () => {
  let component: AppointmentsComponent;
  let fixture: ComponentFixture<AppointmentsComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ApiService', [
      'getSpecialties', 'getDoctors', 'getAvailableSlots', 'bookAppointment'
    ]);
    apiSpy.getSpecialties.and.returnValue(of(MOCK_SPECIALTIES));
    apiSpy.getDoctors.and.returnValue(of(MOCK_DOCTORS));
    apiSpy.getAvailableSlots.and.returnValue(of(MOCK_SLOTS.filter(s => s.available)));
    apiSpy.bookAppointment.and.returnValue(of(MOCK_APPOINTMENT));

    await TestBed.configureTestingModule({
      imports: [
        AppointmentsComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
        RouterTestingModule
      ],
      providers: [
        { provide: ApiService, useValue: apiSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppointmentsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start at step 0', () => {
    expect(component.currentStep()).toBe(0);
  });

  it('should load specialties and doctors on init', () => {
    fixture.detectChanges();
    expect(apiSpy.getSpecialties).toHaveBeenCalled();
    expect(apiSpy.getDoctors).toHaveBeenCalled();
    expect(component.specialties().length).toBe(3);
    expect(component.doctors().length).toBe(2);
  });

  it('should filter doctors when specialty changes', () => {
    fixture.detectChanges();
    apiSpy.getDoctors.and.returnValue(of([MOCK_DOCTORS[0]]));

    component.onSpecialtyChange('Cardiology');
    expect(component.selectedSpecialty()).toBe('Cardiology');
    expect(component.selectedDoctor()).toBeNull(); // resets selection
    expect(apiSpy.getDoctors).toHaveBeenCalledWith('Cardiology');
  });

  it('should select a doctor and load slots', () => {
    fixture.detectChanges();
    component.selectDoctor(MOCK_DOCTORS[0]);

    expect(component.selectedDoctor()?.id).toBe('doc-1');
    expect(component.selectedSlot()).toBeNull(); // resets slot
    expect(apiSpy.getAvailableSlots).toHaveBeenCalledWith('doc-1', '2026-04-20');
  });

  it('should filter out unavailable slots', () => {
    fixture.detectChanges();
    component.selectDoctor(MOCK_DOCTORS[0]);
    // Only available slots should be set
    expect(component.availableSlots().every(s => s.available)).toBeTrue();
  });

  it('should select a slot', () => {
    component.selectSlot(MOCK_SLOTS[0]);
    expect(component.selectedSlot()?.id).toBe('slot-1');
  });

  it('should navigate between steps', () => {
    component.goToStep(1);
    expect(component.currentStep()).toBe(1);
    component.goToStep(2);
    expect(component.currentStep()).toBe(2);
    component.goToStep(0);
    expect(component.currentStep()).toBe(0);
  });

  it('should format currency using geography config', () => {
    const result = component.formatCurrency(25);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should book with pay_now mode', () => {
    fixture.detectChanges();
    component.selectDoctor(MOCK_DOCTORS[0]);
    component.selectSlot(MOCK_SLOTS[0]);
    component.visitReason.set('Chest pain');

    component.confirmBooking('pay_now');

    expect(component.paymentMode()).toBe('pay_now');
    expect(component.bookedAppointment()).toEqual(MOCK_APPOINTMENT);
    expect(component.booking()).toBeFalse();
  });

  it('should book with pay_later mode', () => {
    fixture.detectChanges();
    component.selectSlot(MOCK_SLOTS[0]);
    component.confirmBooking('pay_later');
    expect(component.paymentMode()).toBe('pay_later');
  });

  it('should book with insurance mode', () => {
    fixture.detectChanges();
    component.selectSlot(MOCK_SLOTS[0]);
    component.confirmBooking('insurance');
    expect(component.paymentMode()).toBe('insurance');
  });

  it('should not book when no slot is selected', () => {
    component.confirmBooking('pay_now');
    expect(apiSpy.bookAppointment).not.toHaveBeenCalled();
  });

  it('should reset booking state', () => {
    component.selectDoctor(MOCK_DOCTORS[0]);
    component.selectSlot(MOCK_SLOTS[0]);
    component.visitReason.set('test');
    component.goToStep(2);

    component.resetBooking();

    expect(component.currentStep()).toBe(0);
    expect(component.selectedDoctor()).toBeNull();
    expect(component.selectedSlot()).toBeNull();
    expect(component.visitReason()).toBe('');
    expect(component.bookedAppointment()).toBeNull();
    expect(component.paymentMode()).toBe('pay_now');
  });

  it('should toggle insurance mode', () => {
    expect(component.useInsurance()).toBeFalse();
    component.useInsurance.set(true);
    expect(component.useInsurance()).toBeTrue();
  });
});
