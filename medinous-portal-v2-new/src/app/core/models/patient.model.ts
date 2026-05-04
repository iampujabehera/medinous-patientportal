export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  avatarUrl?: string;
}

export interface VitalSign {
  type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'oxygen' | 'weight' | 'glucose';
  value: string;
  unit: string;
  timestamp: string;
  status: 'normal' | 'warning' | 'critical';
}

export interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  location: string;
  type: 'in_person' | 'telehealth';
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  refillsRemaining: number;
  taken: boolean[];
  instructions?: string;
}

export interface TimelineEvent {
  id: string;
  type: 'appointment' | 'lab_result' | 'prescription' | 'vaccination' | 'note' | 'imaging' | 'procedure' | 'medical_report';
  title: string;
  description: string;
  date: string;
  provider: string;
  details?: Record<string, unknown>;
  attachments?: string[];
}

export interface DashboardSummary {
  patient: Patient;
  upcomingAppointments: Appointment[];
  activeMedications: Medication[];
  recentVitals: VitalSign[];
  alerts: AlertItem[];
}

export interface AlertItem {
  id: string;
  type: 'info' | 'warning' | 'urgent';
  title: string;
  message: string;
  actionUrl?: string;
  timestamp: string;
}

export interface BookingSlot {
  id: string;
  date: string;
  time: string;
  available: boolean;
  doctorId: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  avatarUrl?: string;
  rating: number;
  nextAvailable: string;
  location: string;
  locationId?: string;
  consultationFee: number;
  advanceFee?: number;
}

// Payment & Receipt models
export interface Payment {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  method: 'card' | 'upi' | 'insurance' | 'cash' | 'bank_transfer';
  description: string;
  appointmentId?: string;
  doctorName?: string;
  receiptUrl?: string;
  invoiceNumber: string;
  breakdown: PaymentBreakdown[];
  insuranceClaim?: InsuranceClaim;
}

export interface PaymentBreakdown {
  label: string;
  amount: number;
}

export interface InsuranceClaim {
  claimId: string;
  provider: string;
  policyNumber: string;
  status: 'submitted' | 'approved' | 'rejected' | 'pending';
  coveredAmount: number;
  patientResponsibility: number;
}

// Document models
export interface PatientDocument {
  id: string;
  name: string;
  type: 'lab_report' | 'radiology' | 'prescription' | 'insurance' | 'other';
  category: string;
  fileType: 'pdf' | 'image' | 'dicom';
  fileSize: number;
  uploadDate: string;
  uploadedBy: string;
  url: string;
  thumbnailUrl?: string;
  linkedAppointmentId?: string;
  tags: string[];
}

// Clinic location models
export interface ClinicLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  operatingHours: string;
  specialties: string[];
  isActive: boolean;
}

// Guest booking models
export interface GuestPatient {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth?: string;
  gender?: string;
  idType?: 'national_id' | 'passport' | 'driving_license';
  idNumber?: string;
}

export interface GuestBookingResult {
  appointment: Appointment;
  temporaryPatientId: string;
  registrationToken: string;
}
