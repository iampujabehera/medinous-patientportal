import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map, throwError, timer, switchMap } from 'rxjs';
import { GeographyService } from './geography.service';
import {
  DashboardSummary, TimelineEvent, Appointment,
  Doctor, BookingSlot, Medication, Payment, PatientDocument,
  GuestPatient, GuestBookingResult, Consultation
} from '../models/patient.model';
import {
  MOCK_DASHBOARD, MOCK_TIMELINE, MOCK_DOCTORS, MOCK_SLOTS,
  MOCK_MEDICATIONS, MOCK_PAYMENTS, MOCK_DOCUMENTS,
  MOCK_CONSULTATIONS
} from './mock-data';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly geo = inject(GeographyService);
  private readonly useMocks = true; // Toggle for demo

  private get baseUrl(): string {
    return this.geo.config().apiBaseUrl;
  }

  getDashboard(): Observable<DashboardSummary> {
    if (this.useMocks) {
      return of(MOCK_DASHBOARD).pipe(delay(800));
    }
    return this.http.get<DashboardSummary>(`${this.baseUrl}/dashboard`);
  }

  getConsultations(): Observable<Consultation[]> {
    if (this.useMocks) {
      return of([...MOCK_CONSULTATIONS]).pipe(delay(500));
    }
    return this.http.get<Consultation[]>(`${this.baseUrl}/consultations`);
  }

  getConsultationById(id: string): Observable<Consultation | undefined> {
    if (this.useMocks) {
      return of(MOCK_CONSULTATIONS.find(c => c.id === id)).pipe(delay(300));
    }
    return this.http.get<Consultation>(`${this.baseUrl}/consultations/${id}`);
  }

  getTimeline(page: number, pageSize: number): Observable<TimelineEvent[]> {
    if (this.useMocks) {
      const start = page * pageSize;
      return of(MOCK_TIMELINE.slice(start, start + pageSize)).pipe(delay(400));
    }
    return this.http.get<TimelineEvent[]>(`${this.baseUrl}/timeline`, {
      params: { page: page.toString(), size: pageSize.toString() }
    });
  }

  getDoctors(specialty?: string): Observable<Doctor[]> {
    if (this.useMocks) {
      const filtered = specialty
        ? MOCK_DOCTORS.filter(d => d.specialty === specialty)
        : MOCK_DOCTORS;
      return of(filtered).pipe(delay(500));
    }
    return this.http.get<Doctor[]>(`${this.baseUrl}/doctors`, {
      params: specialty ? { specialty } : {}
    });
  }

  getAvailableSlots(doctorId: string, date: string): Observable<BookingSlot[]> {
    if (this.useMocks) {
      return of(MOCK_SLOTS.filter(s => s.doctorId === doctorId)).pipe(delay(300));
    }
    return this.http.get<BookingSlot[]>(`${this.baseUrl}/slots`, {
      params: { doctorId, date }
    });
  }

  bookAppointment(slot: BookingSlot, reason: string): Observable<Appointment> {
    if (this.useMocks) {
      const appt: Appointment = {
        id: 'appt-' + Date.now(),
        doctorName: MOCK_DOCTORS.find(d => d.id === slot.doctorId)?.name ?? 'Doctor',
        specialty: MOCK_DOCTORS.find(d => d.id === slot.doctorId)?.specialty ?? '',
        date: slot.date,
        time: slot.time,
        status: 'scheduled',
        location: 'Main Clinic',
        type: 'in_person'
      };
      return of(appt).pipe(delay(600));
    }
    return this.http.post<Appointment>(`${this.baseUrl}/appointments`, { slotId: slot.id, reason });
  }

  getMedications(): Observable<Medication[]> {
    if (this.useMocks) {
      return of(MOCK_MEDICATIONS).pipe(delay(500));
    }
    return this.http.get<Medication[]>(`${this.baseUrl}/medications`);
  }

  getSpecialties(): Observable<string[]> {
    if (this.useMocks) {
      const specialties = [...new Set(MOCK_DOCTORS.map(d => d.specialty))];
      return of(specialties).pipe(delay(200));
    }
    return this.http.get<string[]>(`${this.baseUrl}/specialties`);
  }

  // Payment endpoints
  getPayments(status?: string): Observable<Payment[]> {
    if (this.useMocks) {
      let payments = MOCK_PAYMENTS;
      if (status && status !== 'all') {
        payments = payments.filter(p => p.status === status);
      }
      return of(payments).pipe(delay(600));
    }
    return this.http.get<Payment[]>(`${this.baseUrl}/payments`, {
      params: status ? { status } : {}
    });
  }

  getPaymentById(id: string): Observable<Payment | undefined> {
    if (this.useMocks) {
      return of(MOCK_PAYMENTS.find(p => p.id === id)).pipe(delay(300));
    }
    return this.http.get<Payment>(`${this.baseUrl}/payments/${id}`);
  }

  generateReceipt(paymentId: string): Observable<{ url: string }> {
    if (this.useMocks) {
      const payment = MOCK_PAYMENTS.find(p => p.id === paymentId);
      if (!payment || payment.status === 'failed') {
        return timer(500).pipe(
          switchMap(() => throwError(() => new Error('Cannot generate receipt for failed payment')))
        );
      }
      return of({ url: `/receipts/${paymentId}.pdf` }).pipe(delay(1000));
    }
    return this.http.post<{ url: string }>(`${this.baseUrl}/payments/${paymentId}/receipt`, {});
  }

  downloadInsuranceClaim(paymentId: string): Observable<{ url: string }> {
    if (this.useMocks) {
      return of({ url: `/claims/${paymentId}-claim.pdf` }).pipe(delay(800));
    }
    return this.http.get<{ url: string }>(`${this.baseUrl}/payments/${paymentId}/claim`);
  }

  // Document endpoints
  getDocuments(type?: string): Observable<PatientDocument[]> {
    if (this.useMocks) {
      let docs = MOCK_DOCUMENTS;
      if (type && type !== 'all') {
        docs = docs.filter(d => d.type === type);
      }
      return of(docs).pipe(delay(500));
    }
    return this.http.get<PatientDocument[]>(`${this.baseUrl}/documents`, {
      params: type ? { type } : {}
    });
  }

  uploadDocument(file: File, metadata: Partial<PatientDocument>): Observable<PatientDocument> {
    if (this.useMocks) {
      const doc: PatientDocument = {
        id: 'doc-' + Date.now(),
        name: metadata.name ?? file.name,
        type: metadata.type ?? 'other',
        category: metadata.category ?? 'General',
        fileType: file.type.includes('pdf') ? 'pdf' : 'image',
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
        uploadedBy: 'Patient',
        url: URL.createObjectURL(file),
        tags: metadata.tags ?? [],
        linkedAppointmentId: metadata.linkedAppointmentId
      };
      return of(doc).pipe(delay(1500));
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    return this.http.post<PatientDocument>(`${this.baseUrl}/documents`, formData);
  }

  deleteDocument(id: string): Observable<void> {
    if (this.useMocks) {
      return of(undefined).pipe(delay(500));
    }
    return this.http.delete<void>(`${this.baseUrl}/documents/${id}`);
  }

  // Guest booking endpoints
  bookGuestAppointment(guest: GuestPatient, slot: BookingSlot, reason: string): Observable<GuestBookingResult> {
    if (this.useMocks) {
      const doctor = MOCK_DOCTORS.find(d => d.id === slot.doctorId);
      const result: GuestBookingResult = {
        appointment: {
          id: 'appt-guest-' + Date.now(),
          doctorName: doctor?.name ?? 'Doctor',
          specialty: doctor?.specialty ?? '',
          date: slot.date,
          time: slot.time,
          status: 'scheduled',
          location: doctor?.location ?? 'Main Clinic',
          type: 'in_person'
        },
        temporaryPatientId: 'tmp-' + Date.now(),
        registrationToken: 'reg-' + Math.random().toString(36).substring(2, 10)
      };
      return of(result).pipe(delay(800));
    }
    return this.http.post<GuestBookingResult>(`${this.baseUrl}/guest/appointments`, {
      guest, slotId: slot.id, reason
    });
  }

  getDoctorsByLocation(locationId: string): Observable<Doctor[]> {
    if (this.useMocks) {
      return of(MOCK_DOCTORS).pipe(delay(400));
    }
    return this.http.get<Doctor[]>(`${this.baseUrl}/locations/${locationId}/doctors`);
  }
}
