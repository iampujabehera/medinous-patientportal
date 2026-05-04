import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { MOCK_DOCTORS } from './mock-data';

describe('ApiService', () => {
  let service: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --- Dashboard ---
  it('should return dashboard data from mocks', (done) => {
    service.getDashboard().subscribe(data => {
      expect(data).toBeTruthy();
      expect(data.patient).toBeTruthy();
      expect(data.patient.firstName).toBeTruthy();
      expect(data.recentVitals).toBeTruthy();
      expect(data.upcomingAppointments).toBeTruthy();
      expect(data.activeMedications).toBeTruthy();
      expect(data.alerts).toBeTruthy();
      done();
    });
  });

  // --- Doctors ---
  it('should return all doctors', (done) => {
    service.getDoctors().subscribe(doctors => {
      expect(doctors.length).toBeGreaterThan(0);
      doctors.forEach(doc => {
        expect(doc.id).toBeTruthy();
        expect(doc.name).toBeTruthy();
        expect(doc.specialty).toBeTruthy();
        expect(doc.consultationFee).toBeGreaterThan(0);
      });
      done();
    });
  });

  it('should filter doctors by specialty', (done) => {
    const targetSpecialty = MOCK_DOCTORS[0].specialty;
    service.getDoctors(targetSpecialty).subscribe(doctors => {
      expect(doctors.length).toBeGreaterThan(0);
      doctors.forEach(doc => {
        expect(doc.specialty).toBe(targetSpecialty);
      });
      done();
    });
  });

  // --- Specialties ---
  it('should return unique specialties', (done) => {
    service.getSpecialties().subscribe(specialties => {
      expect(specialties.length).toBeGreaterThan(0);
      const unique = new Set(specialties);
      expect(unique.size).toBe(specialties.length);
      done();
    });
  });

  // --- Slots ---
  it('should return available slots for a doctor', (done) => {
    const doctor = MOCK_DOCTORS[0];
    service.getAvailableSlots(doctor.id, doctor.nextAvailable).subscribe(slots => {
      expect(Array.isArray(slots)).toBeTrue();
      slots.forEach(slot => {
        expect(slot.doctorId).toBe(doctor.id);
        expect(slot.time).toBeTruthy();
      });
      done();
    });
  });

  // --- Book Appointment ---
  it('should book an appointment', (done) => {
    const slot = { id: 'slot-1', date: '2026-04-20', time: '10:00 AM', available: true, doctorId: MOCK_DOCTORS[0].id };
    service.bookAppointment(slot, 'Headache').subscribe(appt => {
      expect(appt).toBeTruthy();
      expect(appt.id).toBeTruthy();
      expect(appt.status).toBe('scheduled');
      expect(appt.time).toBe('10:00 AM');
      done();
    });
  });

  // --- Medications ---
  it('should return medications', (done) => {
    service.getMedications().subscribe(meds => {
      expect(meds.length).toBeGreaterThan(0);
      meds.forEach(med => {
        expect(med.name).toBeTruthy();
        expect(med.dosage).toBeTruthy();
        expect(med.taken).toBeTruthy();
      });
      done();
    });
  });

  // --- Payments ---
  it('should return all payments', (done) => {
    service.getPayments().subscribe(payments => {
      expect(payments.length).toBeGreaterThan(0);
      done();
    });
  });

  it('should filter payments by status', (done) => {
    service.getPayments('completed').subscribe(payments => {
      payments.forEach(p => expect(p.status).toBe('completed'));
      done();
    });
  });

  it('should return all payments when status is "all"', (done) => {
    service.getPayments('all').subscribe(payments => {
      expect(payments.length).toBeGreaterThan(0);
      done();
    });
  });

  it('should get payment by id', (done) => {
    service.getPayments().subscribe(allPayments => {
      const first = allPayments[0];
      service.getPaymentById(first.id).subscribe(payment => {
        expect(payment).toBeTruthy();
        expect(payment?.id).toBe(first.id);
        done();
      });
    });
  });

  it('should return undefined for non-existent payment id', (done) => {
    service.getPaymentById('nonexistent').subscribe(payment => {
      expect(payment).toBeUndefined();
      done();
    });
  });

  // --- Receipts ---
  it('should generate a receipt for a completed payment', (done) => {
    service.getPayments('completed').subscribe(payments => {
      if (payments.length === 0) {
        done();
        return;
      }
      service.generateReceipt(payments[0].id).subscribe(result => {
        expect(result.url).toBeTruthy();
        expect(result.url).toContain(payments[0].id);
        done();
      });
    });
  });

  it('should fail to generate receipt for failed payment', (done) => {
    service.getPayments('failed').subscribe(payments => {
      if (payments.length === 0) {
        done();
        return;
      }
      service.generateReceipt(payments[0].id).subscribe({
        error: (err) => {
          expect(err.message).toContain('Cannot generate receipt');
          done();
        }
      });
    });
  });

  // --- Documents ---
  it('should return documents', (done) => {
    service.getDocuments().subscribe(docs => {
      expect(Array.isArray(docs)).toBeTrue();
      done();
    });
  });

  it('should filter documents by type', (done) => {
    service.getDocuments('lab_report').subscribe(docs => {
      docs.forEach(d => expect(d.type).toBe('lab_report'));
      done();
    });
  });

  it('should delete a document', (done) => {
    service.deleteDocument('doc-1').subscribe(() => {
      // Should complete without error
      expect(true).toBeTrue();
      done();
    });
  });

  // --- Guest Booking ---
  it('should book a guest appointment', (done) => {
    const guest = { firstName: 'Test', lastName: 'Patient', phone: '+973-1234', email: 'test@test.com' };
    const slot = { id: 'slot-1', date: '2026-04-20', time: '10:00 AM', available: true, doctorId: MOCK_DOCTORS[0].id };
    service.bookGuestAppointment(guest, slot, 'Checkup').subscribe(result => {
      expect(result.appointment).toBeTruthy();
      expect(result.temporaryPatientId).toBeTruthy();
      expect(result.registrationToken).toBeTruthy();
      expect(result.appointment.status).toBe('scheduled');
      done();
    });
  });

  // --- Timeline ---
  it('should return paginated timeline events', (done) => {
    service.getTimeline(0, 5).subscribe(events => {
      expect(Array.isArray(events)).toBeTrue();
      expect(events.length).toBeLessThanOrEqual(5);
      done();
    });
  });

  it('should return empty for out-of-range timeline page', (done) => {
    service.getTimeline(999, 5).subscribe(events => {
      expect(events.length).toBe(0);
      done();
    });
  });
});
