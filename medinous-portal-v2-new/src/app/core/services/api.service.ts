import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map, throwError, timer, switchMap } from 'rxjs';
import { GeographyService } from './geography.service';
import { FamilyService } from './family.service';
import { FamilyMember } from '../models/family.model';
import {
  DashboardSummary, TimelineEvent, Appointment,
  Doctor, BookingSlot, Medication, Payment, PatientDocument,
  GuestPatient, GuestBookingResult, Consultation, Patient
} from '../models/patient.model';
import {
  MOCK_DASHBOARD, MOCK_TIMELINE, MOCK_DOCTORS, MOCK_SLOTS,
  MOCK_MEDICATIONS, MOCK_PAYMENTS, MOCK_DOCUMENTS,
  MOCK_CONSULTATIONS
} from './mock-data';

/**
 * Per-family-member data slice. The real backend filters by patient
 * ID server-side; in mocks we emulate that by indexing into the
 * existing master mock arrays. This keeps each profile distinct on
 * the demo without ballooning mock-data.ts.
 */
interface PatientDataSlice {
  appointments: number[];     // indices into MOCK_DASHBOARD.upcomingAppointments
  medications: number[];      // indices into MOCK_MEDICATIONS
  payments: number[];         // indices into MOCK_PAYMENTS
  documents: number[];        // indices into MOCK_DOCUMENTS
  consultations: number[];    // indices into MOCK_CONSULTATIONS
  timelinePageMultiplier: number; // 0 = none, 1 = full
  vitalsProfile: 'adult' | 'pediatric' | 'geriatric' | 'none';
  alertIndices: number[];     // indices into MOCK_DASHBOARD.alerts
}

const DEFAULT_SLICE: PatientDataSlice = {
  appointments: [0, 1, 2],
  medications: [0, 1, 2, 3],
  payments: Array.from({ length: 12 }, (_, i) => i),
  documents: Array.from({ length: 8 }, (_, i) => i),
  consultations: Array.from({ length: 7 }, (_, i) => i),
  timelinePageMultiplier: 1,
  vitalsProfile: 'adult',
  alertIndices: [0, 1, 2]
};

// Per-patient slicing — keyed by HMS Patient ID.
const PATIENT_SLICES: Record<string, PatientDataSlice> = {
  // Priya — Primary owner, full data
  '12345678': DEFAULT_SLICE,
  // Rohan — Spouse, lighter footprint
  '12345679': {
    appointments: [0],
    medications: [1],
    payments: [0, 5, 6],
    documents: [3, 7],
    consultations: [0, 6],
    timelinePageMultiplier: 0.5,
    vitalsProfile: 'adult',
    alertIndices: [1]
  },
  // Aarav — Child (minor under guardian)
  '12345680': {
    appointments: [1],
    medications: [2],            // Vitamin D only
    payments: [1],
    documents: [],
    consultations: [],
    timelinePageMultiplier: 0.2,
    vitalsProfile: 'pediatric',
    alertIndices: []
  },
  // Meera — Parent (geriatric)
  '12345681': {
    appointments: [2, 0],
    medications: [0, 1, 3],
    payments: [2, 3, 7],
    documents: [2, 3, 6],
    consultations: [2, 5],
    timelinePageMultiplier: 0.7,
    vitalsProfile: 'geriatric',
    alertIndices: [2]
  }
};

const PEDIATRIC_VITALS: typeof MOCK_DASHBOARD.recentVitals = [
  { type: 'heart_rate', value: '96', unit: 'bpm', timestamp: '2026-05-15T09:00:00', status: 'normal' },
  { type: 'temperature', value: '98.6', unit: '°F', timestamp: '2026-05-15T09:00:00', status: 'normal' },
  { type: 'weight', value: '28', unit: 'kg', timestamp: '2026-05-15T09:00:00', status: 'normal' },
  { type: 'oxygen', value: '99', unit: '%', timestamp: '2026-05-15T09:00:00', status: 'normal' }
];

const GERIATRIC_VITALS: typeof MOCK_DASHBOARD.recentVitals = [
  { type: 'blood_pressure', value: '146/90', unit: 'mmHg', timestamp: '2026-05-15T09:00:00', status: 'warning' },
  { type: 'heart_rate', value: '78', unit: 'bpm', timestamp: '2026-05-15T09:00:00', status: 'normal' },
  { type: 'glucose', value: '168', unit: 'mg/dL', timestamp: '2026-05-15T07:00:00', status: 'critical' },
  { type: 'weight', value: '62', unit: 'kg', timestamp: '2026-05-14T08:00:00', status: 'normal' }
];

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly geo = inject(GeographyService);
  private readonly family = inject(FamilyService);
  private readonly useMocks = true; // Toggle for demo

  private get baseUrl(): string {
    return this.geo.config().apiBaseUrl;
  }

  /**
   * The active patient ID. Every mocked API call filters against
   * this. Falls back to the default mock patient when no family
   * context is loaded (e.g. legacy direct dashboard hit during dev).
   */
  private activePatientId(): string {
    return this.family.activeMember()?.patientId ?? MOCK_DASHBOARD.patient.id;
  }

  private slice(): PatientDataSlice {
    return PATIENT_SLICES[this.activePatientId()] ?? DEFAULT_SLICE;
  }

  /** Build the Patient identity record for the active family member. */
  private activePatientIdentity(): Patient {
    const m = this.family.activeMember();
    if (!m) return MOCK_DASHBOARD.patient;
    return {
      id: m.patientId,
      firstName: m.firstName,
      lastName: m.lastName,
      dateOfBirth: m.dateOfBirth,
      gender: m.gender,
      email: MOCK_DASHBOARD.patient.email,
      phone: m.primaryMobile,
      avatarUrl: m.avatarUrl ?? '',
      registrationDate: MOCK_DASHBOARD.patient.registrationDate,
      sponsorName: MOCK_DASHBOARD.patient.sponsorName
    };
  }

  private pick<T>(source: readonly T[], indices: number[]): T[] {
    return indices.map(i => source[i]).filter((x): x is T => x !== undefined);
  }

  private vitalsForSlice(profile: PatientDataSlice['vitalsProfile']) {
    switch (profile) {
      case 'pediatric': return PEDIATRIC_VITALS;
      case 'geriatric': return GERIATRIC_VITALS;
      case 'none':      return [];
      default:          return MOCK_DASHBOARD.recentVitals;
    }
  }

  getDashboard(): Observable<DashboardSummary> {
    if (this.useMocks) {
      const slice = this.slice();
      const dashboard: DashboardSummary = {
        patient: this.activePatientIdentity(),
        upcomingAppointments: this.pick(MOCK_DASHBOARD.upcomingAppointments, slice.appointments),
        activeMedications: this.pick(MOCK_MEDICATIONS, slice.medications),
        recentVitals: this.vitalsForSlice(slice.vitalsProfile),
        alerts: this.pick(MOCK_DASHBOARD.alerts, slice.alertIndices)
      };
      return of(dashboard).pipe(delay(800));
    }
    return this.http.get<DashboardSummary>(
      `${this.baseUrl}/dashboard`,
      { params: { patientId: this.activePatientId() } }
    );
  }

  getConsultations(): Observable<Consultation[]> {
    if (this.useMocks) {
      const slice = this.slice();
      return of(this.pick(MOCK_CONSULTATIONS, slice.consultations)).pipe(delay(500));
    }
    return this.http.get<Consultation[]>(
      `${this.baseUrl}/consultations`,
      { params: { patientId: this.activePatientId() } }
    );
  }

  getConsultationById(id: string): Observable<Consultation | undefined> {
    if (this.useMocks) {
      // Scoped: only return the consultation if it belongs to the
      // active patient's slice (privacy isolation).
      const allowed = new Set(this.pick(MOCK_CONSULTATIONS, this.slice().consultations).map(c => c.id));
      const match = MOCK_CONSULTATIONS.find(c => c.id === id && allowed.has(c.id));
      return of(match).pipe(delay(300));
    }
    return this.http.get<Consultation>(
      `${this.baseUrl}/consultations/${id}`,
      { params: { patientId: this.activePatientId() } }
    );
  }

  getTimeline(page: number, pageSize: number): Observable<TimelineEvent[]> {
    if (this.useMocks) {
      const multiplier = this.slice().timelinePageMultiplier;
      const cap = Math.floor(MOCK_TIMELINE.length * multiplier);
      const scoped = MOCK_TIMELINE.slice(0, cap);
      const start = page * pageSize;
      return of(scoped.slice(start, start + pageSize)).pipe(delay(400));
    }
    return this.http.get<TimelineEvent[]>(`${this.baseUrl}/timeline`, {
      params: { page: page.toString(), size: pageSize.toString(), patientId: this.activePatientId() }
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
      return of(this.pick(MOCK_MEDICATIONS, this.slice().medications)).pipe(delay(500));
    }
    return this.http.get<Medication[]>(
      `${this.baseUrl}/medications`,
      { params: { patientId: this.activePatientId() } }
    );
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
      let payments = this.pick(MOCK_PAYMENTS, this.slice().payments);
      if (status && status !== 'all') {
        payments = payments.filter(p => p.status === status);
      }
      return of(payments).pipe(delay(600));
    }
    return this.http.get<Payment[]>(`${this.baseUrl}/payments`, {
      params: { ...(status ? { status } : {}), patientId: this.activePatientId() }
    });
  }

  getPaymentById(id: string): Observable<Payment | undefined> {
    if (this.useMocks) {
      const allowed = new Set(this.pick(MOCK_PAYMENTS, this.slice().payments).map(p => p.id));
      const match = MOCK_PAYMENTS.find(p => p.id === id && allowed.has(p.id));
      return of(match).pipe(delay(300));
    }
    return this.http.get<Payment>(
      `${this.baseUrl}/payments/${id}`,
      { params: { patientId: this.activePatientId() } }
    );
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
      let docs = this.pick(MOCK_DOCUMENTS, this.slice().documents);
      if (type && type !== 'all') {
        docs = docs.filter(d => d.type === type);
      }
      return of(docs).pipe(delay(500));
    }
    return this.http.get<PatientDocument[]>(`${this.baseUrl}/documents`, {
      params: { ...(type ? { type } : {}), patientId: this.activePatientId() }
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
