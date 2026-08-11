import {
  DashboardSummary, TimelineEvent, Doctor,
  BookingSlot, Medication, Payment, PatientDocument,
  Consultation
} from '../models/patient.model';

export const MOCK_DASHBOARD: DashboardSummary = {
  patient: {
    id: '12345678',
    firstName: 'Fatima',
    lastName: 'Sharma',
    dateOfBirth: '1990-05-15',
    gender: 'Female',
    email: 'fatima.sharma@email.com',
    phone: '+973 3322 4455',
    avatarUrl: '',
    registrationDate: '2018-03-12T09:15:00',
    sponsorName: 'Self-pay · Cash'
  },
  upcomingAppointments: [
    {
      id: 'a-001', doctorName: 'Dr. Walid Al-Habeeb', specialty: 'Cardiology',
      date: '2026-04-15', time: '10:00 AM', status: 'scheduled',
      location: 'Medinous Clinic - Block A', type: 'in_person'
    },
    {
      id: 'a-002', doctorName: 'Dr. Samar Al-Homoud', specialty: 'Dermatology',
      date: '2026-04-18', time: '02:30 PM', status: 'scheduled',
      location: 'Telehealth', type: 'telehealth'
    },
    {
      id: 'a-003', doctorName: 'Dr. Adnan Ezzat', specialty: 'Endocrinology',
      date: '2026-04-22', time: '11:00 AM', status: 'scheduled',
      location: 'Medinous Clinic - Block B', type: 'in_person'
    }
  ],
  activeMedications: [
    {
      id: 'm-001', name: 'Metformin', dosage: '500mg', frequency: 'Twice daily',
      startDate: '2026-01-10', prescribedBy: 'Dr. Walid Al-Habeeb', prescribedBySpecialty: 'Cardiology',
      refillsRemaining: 3, taken: [true, true, false, true, true, true, true],
      instructions: 'Take with meals',
      dispensedQty: 90, dispensedDate: '2026-05-08'
    },
    {
      id: 'm-002', name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily',
      startDate: '2026-02-01', prescribedBy: 'Dr. Walid Al-Habeeb', prescribedBySpecialty: 'Cardiology',
      refillsRemaining: 5, taken: [true, true, true, true, true, false, true],
      instructions: 'Take in the evening',
      dispensedQty: 30, dispensedDate: '2026-05-15'
    },
    {
      id: 'm-003', name: 'Vitamin D3', dosage: '1000 IU', frequency: 'Once daily',
      startDate: '2026-03-01', prescribedBy: 'Dr. Adnan Ezzat', prescribedBySpecialty: 'Endocrinology',
      refillsRemaining: 8, taken: [true, false, true, true, true, true, true],
      instructions: 'Take in the morning with breakfast',
      dispensedQty: 90, dispensedDate: '2026-06-01'
    },
    {
      id: 'm-004', name: 'Calcium + Vitamin K2', dosage: '600mg', frequency: 'Once daily',
      startDate: '2026-03-15', prescribedBy: 'Dr. Adnan Ezzat', prescribedBySpecialty: 'Endocrinology',
      refillsRemaining: 6, taken: [true, true, true, false, true, true, true],
      instructions: 'Take in the afternoon after lunch',
      dispensedQty: 30, dispensedDate: '2026-06-10'
    }
  ],
  recentVitals: [
    { type: 'blood_pressure', value: '128/82', unit: 'mmHg', timestamp: '2026-04-09T09:30:00', status: 'warning' },
    { type: 'heart_rate', value: '72', unit: 'bpm', timestamp: '2026-04-09T09:30:00', status: 'normal' },
    { type: 'temperature', value: '98.4', unit: '°F', timestamp: '2026-04-09T09:30:00', status: 'normal' },
    { type: 'oxygen', value: '97', unit: '%', timestamp: '2026-04-09T09:30:00', status: 'normal' },
    { type: 'weight', value: '65', unit: 'kg', timestamp: '2026-04-08T08:00:00', status: 'normal' },
    { type: 'glucose', value: '142', unit: 'mg/dL', timestamp: '2026-04-09T07:00:00', status: 'warning' }
  ],
  alerts: [
    {
      id: 'al-001', type: 'warning', title: 'Medication Refill Due',
      message: 'Metformin refill needed within 7 days', timestamp: '2026-04-10T08:00:00'
    },
    {
      id: 'al-002', type: 'info', title: 'Lab Results Available',
      message: 'Your HbA1c results from April 5 are ready to view', timestamp: '2026-04-09T14:00:00'
    },
    {
      id: 'al-003', type: 'urgent', title: 'Blood Pressure Elevated',
      message: 'Your last 3 readings show elevated BP. Consider scheduling a follow-up.',
      timestamp: '2026-04-09T10:00:00'
    }
  ]
};

/**
 * Records generated per month, going back 48 months (index 0 = current month).
 * The shape is deliberately irregular — the cluster around index 24–26 reads as
 * a real episode of care (admission + follow-ups) on the density calendar,
 * where a flat line would look synthetic. Totals ~400 records over four years,
 * which is the volume My Records pagination has to hold up against.
 */
const MONTHLY_VOLUME = [
  12, 9, 7, 11, 5, 8, 12, 4, 7, 9, 6, 10,   // last 12 months
  8, 5, 9, 7, 12, 6, 10, 4, 8, 11, 7, 9,    // 1–2 years ago
  31, 22, 14, 6, 4, 9, 7, 5, 12, 8, 6, 10,  // 2–3 years ago (heavy episode)
  8, 3, 7, 4, 9, 6, 5, 8, 5, 7, 3, 6        // 3–4 years ago
];

const GENERATED_TIMELINE: TimelineEvent[] = (() => {
  // 'appointment' is excluded — My Records filters visits out, so generating
  // them would inflate the count without producing a visible record.
  const types: TimelineEvent['type'][] = [
    'lab_result', 'prescription', 'vaccination', 'imaging',
    'procedure', 'medical_report', 'note'
  ];

  const titles: Record<string, string[]> = {
    lab_result: ['Complete Blood Count', 'HbA1c Test', 'Lipid Panel', 'Thyroid Function Test'],
    prescription: ['Metformin Prescribed', 'Amlodipine Renewed', 'Vitamin D3 Added', 'Aspirin Started'],
    vaccination: ['Flu Vaccine', 'COVID-19 Booster', 'Hepatitis B', 'Tetanus Booster'],
    note: ['Diet Plan Updated', 'Exercise Recommendations', 'Referral to Specialist', 'Follow-up Notes'],
    imaging: ['Chest X-Ray', 'ECG Report', 'Ultrasound Abdomen', 'MRI Knee'],
    procedure: ['ECG Procedure', 'Endoscopy', 'Minor Surgery - Wound Closure', 'Biopsy Report'],
    medical_report: ['Discharge Summary', 'Annual Health Report', 'Specialist Referral Report', 'Insurance Medical Report']
  };

  const providers = ['Dr. Walid Al-Habeeb', 'Dr. Samar Al-Homoud', 'Dr. Adnan Ezzat', 'Dr. Fatimah Al-Huwail'];

  const now = new Date();
  const out: TimelineEvent[] = [];
  let seq = 0;

  MONTHLY_VOLUME.forEach((count, monthsAgo) => {
    const anchor = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    // Days available this month — never place a record in the future.
    const lastDay = monthsAgo === 0
      ? now.getDate()
      : new Date(year, month + 1, 0).getDate();

    for (let k = 0; k < count; k++) {
      const type = types[seq % types.length];
      const day = 1 + ((k * 7 + monthsAgo * 3) % Math.max(lastDay, 1));
      const date = new Date(year, month, Math.min(day, lastDay), 9 + (k % 8), (k * 13) % 60);

      out.push({
        id: `tl-${seq}`,
        type,
        title: titles[type][seq % titles[type].length],
        description: `${type.replace('_', ' ')} record from your visit on ${date.toLocaleDateString()}`,
        date: date.toISOString(),
        provider: providers[seq % providers.length]
      });
      seq++;
    }
  });

  // Most recent first — the list, the pager and the date-span header all
  // assume descending order.
  return out.sort((a, b) => b.date.localeCompare(a.date));
})();

// Patient-uploaded personal documents — surfaced under the "Self Documents"
// filter. These have no clinical provider, so they read as "Self-uploaded".
const SELF_DOCUMENTS: TimelineEvent[] = (() => {
  const make = (daysAgo: number, id: string, title: string): TimelineEvent => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return {
      id, type: 'self_document', title,
      description: 'Personal document uploaded by you',
      date: d.toISOString(), provider: 'Self-uploaded'
    };
  };
  return [
    make(2, 'self-id-card', 'National ID Card'),
    make(6, 'self-insurance', 'Health Insurance Card'),
    make(15, 'self-passport', 'Passport Copy')
  ];
})();

// Sorted newest-first so that the page-size cap applied per patient slice
// trims the oldest records, not an arbitrary mix.
export const MOCK_TIMELINE: TimelineEvent[] = [...SELF_DOCUMENTS, ...GENERATED_TIMELINE]
  .sort((a, b) => b.date.localeCompare(a.date));

export const MOCK_DOCTORS: Doctor[] = [
  // ---- Endocrinology ----
  {
    id: 'd-004', name: 'Dr. Fatimah Al-Huwail', specialty: 'Endocrinology', rating: 4.8,
    nextAvailable: '2026-06-09', location: 'GHH Juffair', consultationFee: 25, advanceFee: 25,
    designation: 'Consultant Endocrinologist', experienceYears: 14,
    languages: ['English', 'Mandarin'], videoConsultFee: 20,
    nextHospitalSlot: 'Today, 10:30 AM', nextVideoSlot: 'Today, 01:00 PM',
    treats: ['Diabetes', 'Thyroid Disorders', 'PCOS', 'Hormonal Imbalances']
  },
  {
    id: 'd-003', name: 'Dr. Adnan Ezzat', specialty: 'Endocrinology', rating: 4.7,
    nextAvailable: '2026-06-10', location: 'GHH Juffair', consultationFee: 20, advanceFee: 20,
    designation: 'Senior Consultant Endocrinologist', experienceYears: 12,
    languages: ['English', 'Arabic'], videoConsultFee: 15,
    nextHospitalSlot: 'Tomorrow, 09:30 AM', nextVideoSlot: 'Tomorrow, 02:30 PM',
    treats: ['Diabetes', 'Thyroid Disorders', 'Obesity', 'Insulin Resistance']
  },
  {
    id: 'd-010', name: 'Dr. Selwa Al-Hazzaa', specialty: 'Endocrinology', rating: 4.9,
    nextAvailable: '2026-06-11', location: 'GHH Juffair', consultationFee: 15, advanceFee: 15,
    designation: 'Specialist Endocrinologist', experienceYears: 9,
    languages: ['English', 'Hindi', 'Malayalam'], videoConsultFee: 12,
    nextHospitalSlot: '10 Jun, 11:00 AM', nextVideoSlot: '10 Jun, 04:00 PM',
    treats: ['Diabetes', 'Gestational Diabetes', 'Thyroid', 'PCOS']
  },
  // ---- General Medicine ----
  {
    id: 'd-011', name: 'Dr. Hani Najm', specialty: 'General Medicine', rating: 4.6,
    nextAvailable: '2026-06-09', location: 'GHH Juffair', consultationFee: 12, advanceFee: 12,
    designation: 'Consultant Physician', experienceYears: 10,
    languages: ['English'], videoConsultFee: 8,
    nextHospitalSlot: 'Today, 09:00 AM', nextVideoSlot: 'Today, 12:00 PM',
    treats: ['Cold', 'Fever', 'Cough', 'Infections']
  },
  // ---- Cardiology ----
  {
    id: 'd-001', name: 'Dr. Walid Al-Habeeb', specialty: 'Cardiology', rating: 4.8,
    nextAvailable: '2026-06-09', location: 'GHH Juffair', consultationFee: 25, advanceFee: 25,
    designation: 'Senior Consultant Cardiologist', experienceYears: 18,
    languages: ['English', 'Hindi', 'Arabic'], videoConsultFee: 15,
    nextHospitalSlot: 'Today, 04:30 PM', nextVideoSlot: 'Tomorrow, 11:00 AM',
    treats: ['Heart Disease', 'Hypertension', 'Arrhythmia', 'Chest Pain']
  },
  {
    id: 'd-006', name: 'Dr. Noura Al-Faisal', specialty: 'Cardiology', rating: 4.9,
    nextAvailable: '2026-06-10', location: 'GHH Juffair', consultationFee: 35, advanceFee: 35,
    designation: 'Consultant Cardiologist', experienceYears: 22,
    languages: ['English', 'Arabic', 'French'], videoConsultFee: 20,
    nextHospitalSlot: 'Tomorrow, 09:00 AM', nextVideoSlot: 'Tomorrow, 12:30 PM',
    treats: ['Heart Failure', 'High Blood Pressure', 'Cholesterol', 'Palpitations']
  },
  // ---- Dermatology ----
  {
    id: 'd-002', name: 'Dr. Samar Al-Homoud', specialty: 'Dermatology', rating: 4.9,
    nextAvailable: '2026-06-09', location: 'GHH Juffair', consultationFee: 15, advanceFee: 15,
    designation: 'Consultant Dermatologist', experienceYears: 11,
    languages: ['English', 'Mandarin'], videoConsultFee: 10,
    nextHospitalSlot: 'Today, 02:00 PM', nextVideoSlot: 'Today, 06:30 PM',
    treats: ['Acne', 'Skin Rash', 'Eczema', 'Pigmentation']
  },
  {
    id: 'd-012', name: 'Dr. Reem Al-Dossary', specialty: 'Dermatology', rating: 4.7,
    nextAvailable: '2026-06-10', location: 'GHH Juffair', consultationFee: 17, advanceFee: 17,
    designation: 'Specialist Dermatologist', experienceYears: 8,
    languages: ['English', 'Arabic'], videoConsultFee: 11,
    nextHospitalSlot: 'Tomorrow, 01:30 PM', nextVideoSlot: 'Tomorrow, 05:00 PM',
    treats: ['Hair Fall', 'Acne', 'Skin Allergies', 'Psoriasis']
  },
  // ---- Orthopedics ----
  {
    id: 'd-005', name: 'Dr. Qasim Al-Qasabi', specialty: 'Orthopedics', rating: 4.8,
    nextAvailable: '2026-06-10', location: 'GHH Juffair', consultationFee: 20, advanceFee: 20,
    designation: 'Senior Consultant Orthopedic Surgeon', experienceYears: 20,
    languages: ['English', 'Hindi', 'Gujarati'], videoConsultFee: 12,
    nextHospitalSlot: 'Tomorrow, 11:30 AM', nextVideoSlot: 'Today, 05:00 PM',
    treats: ['Back Pain', 'Knee Pain', 'Joint Pain', 'Fractures']
  },
  {
    id: 'd-013', name: 'Dr. Bandar Al-Mutairi', specialty: 'Orthopedics', rating: 4.7,
    nextAvailable: '2026-06-11', location: 'GHH Juffair', consultationFee: 22, advanceFee: 22,
    designation: 'Consultant Orthopedic Surgeon', experienceYears: 15,
    languages: ['English', 'Hindi'], videoConsultFee: 13,
    nextHospitalSlot: '10 Jun, 10:30 AM', nextVideoSlot: 'Tomorrow, 03:00 PM',
    treats: ['Sports Injuries', 'Joint Pain', 'Arthritis', 'Ligament Tears']
  },
  // ---- Pediatrics ----
  {
    id: 'd-007', name: 'Dr. Latifa Al-Shammari', specialty: 'Pediatrics', rating: 4.9,
    nextAvailable: '2026-06-09', location: 'GHH Juffair', consultationFee: 18, advanceFee: 18,
    designation: 'Consultant Pediatrician', experienceYears: 13,
    languages: ['English', 'Spanish', 'Arabic'], videoConsultFee: 12,
    nextHospitalSlot: 'Today, 03:30 PM', nextVideoSlot: 'Today, 07:00 PM',
    treats: ['Child Fever', 'Vaccination', 'Growth Issues', 'Allergies']
  },
  {
    id: 'd-008', name: 'Dr. Abdullah Al-Rabeeah', specialty: 'Pediatrics', rating: 4.7,
    nextAvailable: '2026-06-10', location: 'GHH Juffair', consultationFee: 16, advanceFee: 16,
    designation: 'Specialist Pediatrician', experienceYears: 9,
    languages: ['English', 'Urdu', 'Arabic'], videoConsultFee: 10,
    nextHospitalSlot: 'Tomorrow, 10:00 AM', nextVideoSlot: 'Tomorrow, 02:30 PM',
    treats: ['Newborn Care', 'Vaccination', 'Child Nutrition', 'Asthma']
  },
  // ---- Gynecology ----
  {
    id: 'd-009', name: 'Dr. Hind Al-Qahtani', specialty: 'Gynecology', rating: 4.8,
    nextAvailable: '2026-06-09', location: 'GHH Juffair', consultationFee: 28, advanceFee: 28,
    designation: 'Consultant Gynecologist', experienceYears: 17,
    languages: ['English', 'Arabic', 'Hindi'], videoConsultFee: 16,
    nextHospitalSlot: 'Today, 11:00 AM', nextVideoSlot: 'Tomorrow, 09:00 AM',
    treats: ['Pregnancy', 'Period Pain', 'PCOS', 'Menopause']
  }
];

export const MOCK_SLOTS: BookingSlot[] = [
  { id: 's-001', date: '2026-04-12', time: '09:00 AM', available: true, doctorId: 'd-001' },
  { id: 's-002', date: '2026-04-12', time: '09:30 AM', available: true, doctorId: 'd-001' },
  { id: 's-003', date: '2026-04-12', time: '10:00 AM', available: false, doctorId: 'd-001' },
  { id: 's-004', date: '2026-04-12', time: '10:30 AM', available: true, doctorId: 'd-001' },
  { id: 's-005', date: '2026-04-12', time: '11:00 AM', available: true, doctorId: 'd-001' },
  { id: 's-006', date: '2026-04-11', time: '02:00 PM', available: true, doctorId: 'd-002' },
  { id: 's-007', date: '2026-04-11', time: '02:30 PM', available: true, doctorId: 'd-002' },
  { id: 's-008', date: '2026-04-11', time: '03:00 PM', available: true, doctorId: 'd-002' },
  { id: 's-009', date: '2026-04-11', time: '09:00 AM', available: true, doctorId: 'd-003' },
  { id: 's-010', date: '2026-04-11', time: '09:30 AM', available: true, doctorId: 'd-003' },
  { id: 's-011', date: '2026-04-11', time: '10:00 AM', available: true, doctorId: 'd-003' },
  { id: 's-012', date: '2026-04-13', time: '11:00 AM', available: true, doctorId: 'd-004' },
  { id: 's-013', date: '2026-04-13', time: '11:30 AM', available: true, doctorId: 'd-004' },
  { id: 's-014', date: '2026-04-12', time: '03:00 PM', available: true, doctorId: 'd-005' },
  { id: 's-015', date: '2026-04-12', time: '03:30 PM', available: true, doctorId: 'd-005' }
];

/**
 * Stopped / completed prescriptions — the Past tab of My Medications.
 * Deliberately contains REPEATS of the same drug across years (Metformin,
 * Atorvastatin, Levothyroxine): the Past list groups by drug, so repeats
 * collapse into one row with a prescription count instead of 20 near-identical
 * rows. Spans 2022–2026 so the year filter has something to filter.
 */
const PAST_MEDICATIONS: Medication[] = (() => {
  const make = (
    id: string, name: string, dosage: string, frequency: string,
    startDate: string, endDate: string,
    prescribedBy: string, prescribedBySpecialty: string,
    instructions?: string
  ): Medication => ({
    id, name, dosage, frequency, startDate, endDate,
    prescribedBy, prescribedBySpecialty, refillsRemaining: 0,
    taken: [], instructions
  });

  const CARD = ['Dr. Walid Al-Habeeb', 'Cardiology'] as const;
  const ENDO = ['Dr. Adnan Ezzat', 'Endocrinology'] as const;
  const GEN  = ['Dr. Samar Al-Homoud', 'Internal Medicine'] as const;
  const ORTH = ['Dr. Fatimah Al-Huwail', 'Orthopaedics'] as const;

  // Dates relative to today, so the "Recent" tab (last 30 days) always has
  // content no matter when the demo is run.
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  return [
    // --- Prescribed in the last 30 days (drives the Recent tab) ---
    make('pm-r01', 'Azithromycin', '500mg', 'Once daily', daysAgo(9), daysAgo(4), ...GEN, 'Complete the full course'),
    make('pm-r02', 'Pantoprazole', '40mg', 'Once daily', daysAgo(18), daysAgo(-12), ...GEN, 'Take before breakfast'),
    make('pm-r03', 'Diclofenac Gel', '1%', 'Twice daily', daysAgo(25), daysAgo(3), ...ORTH, 'Apply to the affected area'),

    // --- Repeat courses of drugs still or recently in use ---
    make('pm-001', 'Metformin', '500mg', 'Twice daily', '2025-07-01', '2025-12-31', ...CARD, 'Take with meals'),
    make('pm-002', 'Metformin', '500mg', 'Twice daily', '2025-01-05', '2025-06-30', ...CARD, 'Take with meals'),
    make('pm-003', 'Metformin', '500mg', 'Once daily',  '2024-08-12', '2024-12-30', ...CARD, 'Take with meals'),
    make('pm-004', 'Atorvastatin', '10mg', 'Once daily', '2025-03-01', '2025-11-20', ...CARD, 'Take at night'),
    make('pm-005', 'Atorvastatin', '10mg', 'Once daily', '2024-04-10', '2024-12-15', ...CARD, 'Take at night'),
    make('pm-006', 'Levothyroxine', '50mcg', 'Once daily', '2024-02-01', '2024-11-30', ...ENDO, 'Take on an empty stomach'),
    make('pm-007', 'Levothyroxine', '25mcg', 'Once daily', '2023-05-15', '2023-12-20', ...ENDO, 'Take on an empty stomach'),

    // --- Short courses ---
    make('pm-008', 'Amoxicillin + Clavulanate', '625mg', 'Three times daily', '2026-02-10', '2026-02-17', ...GEN, 'Complete the full course'),
    make('pm-009', 'Pantoprazole', '40mg', 'Once daily', '2026-01-08', '2026-02-08', ...GEN, 'Take before breakfast'),
    make('pm-010', 'Ibuprofen', '400mg', 'As needed', '2025-11-02', '2025-11-16', ...ORTH, 'Take after food'),
    make('pm-011', 'Prednisolone', '10mg', 'Once daily', '2025-09-05', '2025-09-19', ...GEN, 'Taper as advised'),
    make('pm-012', 'Cetirizine', '10mg', 'Once daily', '2025-06-01', '2025-06-21', ...GEN),
    make('pm-013', 'Azithromycin', '500mg', 'Once daily', '2025-04-12', '2025-04-17', ...GEN, 'Complete the full course'),
    make('pm-014', 'Ferrous Sulphate', '200mg', 'Twice daily', '2024-10-01', '2025-01-31', ...GEN, 'Take with vitamin C'),
    make('pm-015', 'Ranitidine', '150mg', 'Twice daily', '2024-06-14', '2024-08-14', ...GEN),
    make('pm-016', 'Diclofenac Gel', '1%', 'Twice daily', '2024-05-02', '2024-06-02', ...ORTH, 'Apply to the affected area'),
    make('pm-017', 'Cefixime', '200mg', 'Twice daily', '2024-03-08', '2024-03-15', ...GEN, 'Complete the full course'),
    make('pm-018', 'Montelukast', '10mg', 'Once daily', '2023-11-01', '2024-02-28', ...GEN, 'Take at night'),
    make('pm-019', 'Vitamin B12', '1500mcg', 'Once daily', '2023-08-01', '2023-12-31', ...ENDO),
    make('pm-020', 'Paracetamol', '650mg', 'As needed', '2023-06-10', '2023-06-20', ...GEN, 'Maximum 4 doses a day'),
    make('pm-021', 'Omeprazole', '20mg', 'Once daily', '2023-02-01', '2023-05-01', ...GEN, 'Take before breakfast'),
    make('pm-022', 'Calcium Carbonate', '500mg', 'Twice daily', '2022-09-01', '2023-03-01', ...ORTH, 'Take after meals'),
    make('pm-023', 'Tramadol', '50mg', 'As needed', '2022-07-05', '2022-07-25', ...ORTH, 'May cause drowsiness'),
    make('pm-024', 'Cephalexin', '500mg', 'Three times daily', '2022-04-02', '2022-04-09', ...GEN, 'Complete the full course')
  ];
})();

// Active prescriptions first, then the stopped/completed history.
export const MOCK_MEDICATIONS: Medication[] = [
  ...MOCK_DASHBOARD.activeMedications,
  ...PAST_MEDICATIONS
];

export const MOCK_PAYMENTS: Payment[] = [
  {
    id: 'pay-001', date: '2026-05-12T10:30:00', amount: 350, currency: 'AED',
    status: 'completed', method: 'card', description: 'Cardiology Consultation',
    appointmentId: 'a-001', doctorName: 'Dr. Walid Al-Habeeb',
    receiptUrl: '/receipts/pay-001.pdf', invoiceNumber: 'INV-2026-0041',
    breakdown: [
      { label: 'Consultation Fee', amount: 300 },
      { label: 'ECG Test', amount: 50 }
    ],
    insuranceClaim: {
      claimId: 'CLM-8821', provider: 'ADNIC Insurance', policyNumber: 'POL-449921',
      status: 'approved', coveredAmount: 280, patientResponsibility: 70
    }
  },
  {
    id: 'pay-002', date: '2026-05-08T14:00:00', amount: 200, currency: 'AED',
    status: 'completed', method: 'upi', description: 'Dermatology Follow-up',
    appointmentId: 'a-002', doctorName: 'Dr. Samar Al-Homoud',
    receiptUrl: '/receipts/pay-002.pdf', invoiceNumber: 'INV-2026-0038',
    breakdown: [
      { label: 'Consultation Fee', amount: 200 }
    ]
  },
  {
    id: 'pay-003', date: '2026-05-04T09:00:00', amount: 1250, currency: 'AED',
    status: 'completed', method: 'insurance', description: 'Lab Work - Complete Panel',
    doctorName: 'Dr. Adnan Ezzat',
    receiptUrl: '/receipts/pay-003.pdf', invoiceNumber: 'INV-2026-0035',
    breakdown: [
      { label: 'Complete Blood Count', amount: 150 },
      { label: 'HbA1c Test', amount: 200 },
      { label: 'Lipid Panel', amount: 250 },
      { label: 'Thyroid Panel', amount: 300 },
      { label: 'Liver Function', amount: 350 }
    ],
    insuranceClaim: {
      claimId: 'CLM-8790', provider: 'ADNIC Insurance', policyNumber: 'POL-449921',
      status: 'approved', coveredAmount: 1000, patientResponsibility: 250
    }
  },
  {
    id: 'pay-004', date: '2026-04-30T11:00:00', amount: 500, currency: 'AED',
    status: 'pending', method: 'insurance', description: 'Endocrinology Consultation',
    doctorName: 'Dr. Fatimah Al-Huwail', invoiceNumber: 'INV-2026-0030',
    breakdown: [
      { label: 'Consultation Fee', amount: 400 },
      { label: 'Glucose Monitoring Setup', amount: 100 }
    ],
    insuranceClaim: {
      claimId: 'CLM-8812', provider: 'ADNIC Insurance', policyNumber: 'POL-449921',
      status: 'pending', coveredAmount: 400, patientResponsibility: 100
    }
  },
  {
    id: 'pay-005', date: '2026-04-27T16:00:00', amount: 150, currency: 'AED',
    status: 'failed', method: 'card', description: 'Pharmacy - Medication Refill',
    invoiceNumber: 'INV-2026-0025',
    breakdown: [
      { label: 'Metformin 500mg x 60', amount: 80 },
      { label: 'Amlodipine 5mg x 30', amount: 70 }
    ]
  },
  {
    id: 'pay-006', date: '2026-04-24T10:00:00', amount: 800, currency: 'AED',
    status: 'completed', method: 'card', description: 'General Checkup + ECG',
    doctorName: 'Dr. Adnan Ezzat',
    receiptUrl: '/receipts/pay-006.pdf', invoiceNumber: 'INV-2026-0020',
    breakdown: [
      { label: 'Annual Physical', amount: 500 },
      { label: 'ECG', amount: 150 },
      { label: 'Blood Draw', amount: 150 }
    ]
  },
  {
    id: 'pay-007', date: '2026-04-20T13:30:00', amount: 275, currency: 'AED',
    status: 'completed', method: 'bank_transfer', description: 'Orthopedic Consultation',
    doctorName: 'Dr. Qasim Al-Qasabi',
    receiptUrl: '/receipts/pay-007.pdf', invoiceNumber: 'INV-2026-0018',
    breakdown: [
      { label: 'Consultation Fee', amount: 275 }
    ]
  },
  {
    id: 'pay-008', date: '2026-04-16T09:30:00', amount: 2100, currency: 'AED',
    status: 'completed', method: 'insurance', description: 'MRI Knee - Left',
    doctorName: 'Dr. Qasim Al-Qasabi',
    receiptUrl: '/receipts/pay-008.pdf', invoiceNumber: 'INV-2026-0012',
    breakdown: [
      { label: 'MRI Scan', amount: 1800 },
      { label: 'Radiologist Report', amount: 300 }
    ],
    insuranceClaim: {
      claimId: 'CLM-8745', provider: 'ADNIC Insurance', policyNumber: 'POL-449921',
      status: 'approved', coveredAmount: 1800, patientResponsibility: 300
    }
  },
  {
    id: 'pay-009', date: '2026-04-20T10:00:00', amount: 1500, currency: 'AED',
    status: 'completed', method: 'card', description: 'Advance Payment Added — General Hospital Wallet',
    receiptUrl: '/receipts/pay-009.pdf', invoiceNumber: 'ADV-2026-0001',
    breakdown: [
      { label: 'Advance Balance Top-up', amount: 1500 }
    ]
  },
  {
    id: 'pay-010', date: '2026-05-05T11:15:00', amount: 500, currency: 'AED',
    status: 'completed', method: 'card', description: 'Advance Payment Added — Upcoming Admission',
    receiptUrl: '/receipts/pay-010.pdf', invoiceNumber: 'ADV-2026-0002',
    breakdown: [
      { label: 'Advance Balance Top-up', amount: 500 }
    ]
  },
  {
    id: 'pay-011', date: '2026-05-03T10:00:00', amount: 175, currency: 'AED',
    status: 'refunded', method: 'card', description: 'Cancelled Lab Test — Refund',
    doctorName: 'Dr. Adnan Ezzat',
    receiptUrl: '/receipts/pay-011.pdf', invoiceNumber: 'REF-2026-0007',
    breakdown: [
      { label: 'Refund — Vitamin D Panel', amount: 175 }
    ]
  },
  {
    id: 'pay-012', date: '2026-04-22T15:30:00', amount: 90, currency: 'AED',
    status: 'refunded', method: 'card', description: 'Cancelled Consultation — Refund',
    doctorName: 'Dr. Samar Al-Homoud',
    receiptUrl: '/receipts/pay-012.pdf', invoiceNumber: 'REF-2026-0004',
    breakdown: [
      { label: 'Refund — Dermatology Consultation', amount: 90 }
    ]
  }
];

export const MOCK_DOCUMENTS: PatientDocument[] = [
  {
    id: 'doc-001', name: 'Complete Blood Count - April 2026', type: 'lab_report',
    category: 'Hematology', fileType: 'pdf', fileSize: 245000,
    uploadDate: '2026-04-05T14:30:00', uploadedBy: 'Lab System',
    url: '/documents/doc-001.pdf', tags: ['CBC', 'blood', 'routine'],
    linkedAppointmentId: 'a-001'
  },
  {
    id: 'doc-002', name: 'HbA1c Test Results', type: 'lab_report',
    category: 'Endocrinology', fileType: 'pdf', fileSize: 180000,
    uploadDate: '2026-04-05T14:35:00', uploadedBy: 'Lab System',
    url: '/documents/doc-002.pdf', tags: ['HbA1c', 'diabetes', 'glucose']
  },
  {
    id: 'doc-003', name: 'Chest X-Ray Report', type: 'radiology',
    category: 'Radiology', fileType: 'image', fileSize: 3200000,
    uploadDate: '2026-03-20T11:00:00', uploadedBy: 'Dr. Adnan Ezzat',
    url: '/documents/doc-003.jpg', thumbnailUrl: '/documents/doc-003-thumb.jpg',
    tags: ['chest', 'x-ray', 'cardiology']
  },
  {
    id: 'doc-004', name: 'ECG Report - March 2026', type: 'radiology',
    category: 'Cardiology', fileType: 'pdf', fileSize: 520000,
    uploadDate: '2026-03-15T10:45:00', uploadedBy: 'Dr. Walid Al-Habeeb',
    url: '/documents/doc-004.pdf', tags: ['ECG', 'heart', 'cardiology']
  },
  {
    id: 'doc-005', name: 'Metformin Prescription', type: 'prescription',
    category: 'Prescriptions', fileType: 'pdf', fileSize: 95000,
    uploadDate: '2026-01-10T09:00:00', uploadedBy: 'Dr. Walid Al-Habeeb',
    url: '/documents/doc-005.pdf', tags: ['metformin', 'diabetes', 'prescription']
  },
  {
    id: 'doc-006', name: 'Insurance Card - ADNIC', type: 'insurance',
    category: 'Insurance', fileType: 'image', fileSize: 450000,
    uploadDate: '2026-01-01T08:00:00', uploadedBy: 'Patient',
    url: '/documents/doc-006.jpg', tags: ['insurance', 'ADNIC', 'card']
  },
  {
    id: 'doc-007', name: 'MRI Knee Report', type: 'radiology',
    category: 'Radiology', fileType: 'pdf', fileSize: 4800000,
    uploadDate: '2026-02-25T15:00:00', uploadedBy: 'Dr. Qasim Al-Qasabi',
    url: '/documents/doc-007.pdf', tags: ['MRI', 'knee', 'orthopedics']
  },
  {
    id: 'doc-008', name: 'Lipid Panel Results', type: 'lab_report',
    category: 'Biochemistry', fileType: 'pdf', fileSize: 210000,
    uploadDate: '2026-04-02T16:00:00', uploadedBy: 'Lab System',
    url: '/documents/doc-008.pdf', tags: ['lipid', 'cholesterol', 'routine']
  }
];

export const MOCK_CONSULTATIONS: Consultation[] = [
  {
    id: 'con-001',
    opNumber: '3081801',
    date: '2026-04-09T10:30:00',
    doctorName: 'Dr. Walid Al-Habeeb',
    doctorSpecialty: 'Cardiology',
    location: 'GHH Juffair · Block A',
    type: 'in_person',
    chiefComplaint: 'Intermittent chest tightness and palpitations on exertion for the past 2 weeks.',
    diagnosis: [
      { description: 'Essential (primary) hypertension', code: 'I10', type: 'primary' },
      { description: 'Mild left ventricular hypertrophy', code: 'I51.7', type: 'secondary' }
    ],
    investigations: [
      {
        name: 'Electrocardiogram (ECG)', category: 'cardiac', status: 'completed',
        resultDate: '2026-04-09T11:15:00',
        result: {
          summary: 'Sinus rhythm, rate 78 bpm. No acute ischaemic changes. Normal axis. T-wave inversion in lead V1 (non-specific).',
          parameters: [
            { name: 'Heart rate', value: '78', unit: 'bpm', range: '60–100', flag: 'normal' },
            { name: 'PR interval', value: '160', unit: 'ms', range: '120–200', flag: 'normal' },
            { name: 'QRS duration', value: '92', unit: 'ms', range: '<120', flag: 'normal' },
            { name: 'QTc', value: '420', unit: 'ms', range: '<440', flag: 'normal' }
          ]
        }
      },
      {
        name: 'Echocardiogram', category: 'cardiac', status: 'completed',
        resultDate: '2026-04-10T09:00:00',
        result: {
          summary: 'Mild left ventricular hypertrophy with preserved systolic function. No regional wall motion abnormalities. Trivial mitral regurgitation.',
          parameters: [
            { name: 'Ejection Fraction', value: '58', unit: '%', range: '55–70', flag: 'normal' },
            { name: 'LV Mass Index', value: '118', unit: 'g/m²', range: '<115 (male)', flag: 'high' },
            { name: 'LA Diameter', value: '38', unit: 'mm', range: '<40', flag: 'normal' }
          ]
        }
      },
      {
        name: 'Lipid Panel', category: 'lab', status: 'reviewed',
        resultDate: '2026-04-11T08:30:00',
        result: {
          summary: 'Mildly elevated LDL. Continue dietary advice and re-check in 3 months.',
          parameters: [
            { name: 'Total Cholesterol', value: '215', unit: 'mg/dL', range: '<200', flag: 'high' },
            { name: 'HDL', value: '48', unit: 'mg/dL', range: '>40 (male)', flag: 'normal' },
            { name: 'LDL', value: '142', unit: 'mg/dL', range: '<130', flag: 'high' },
            { name: 'Triglycerides', value: '128', unit: 'mg/dL', range: '<150', flag: 'normal' }
          ]
        }
      },
      {
        name: 'HbA1c', category: 'lab', status: 'reviewed',
        resultDate: '2026-04-11T08:30:00',
        result: {
          summary: 'Pre-diabetic range. Lifestyle modification advised; consider repeat in 3 months.',
          parameters: [
            { name: 'HbA1c', value: '6.1', unit: '%', range: '<5.7 (normal)', flag: 'high' }
          ]
        }
      }
    ],
    procedures: [
      { name: 'In-clinic blood pressure monitoring (3 readings)', outcome: 'Mean BP 148/92 mmHg' }
    ],
    medications: [
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '90 days', instructions: 'Take in the morning with water' },
      { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily', duration: '90 days', instructions: 'Take after food' }
    ],
    vitalsRecorded: [
      { label: 'Blood Pressure', value: '148/92', unit: 'mmHg' },
      { label: 'Heart Rate', value: '88', unit: 'bpm' },
      { label: 'Weight', value: '74', unit: 'kg' },
      { label: 'SpO₂', value: '98', unit: '%' }
    ],
    notes: 'Patient advised on DASH diet and 30 min daily aerobic activity. Reduce sodium intake. Follow-up in 4 weeks to reassess BP and discuss titration if needed.',
    followUp: { date: '2026-05-07', reason: 'BP reassessment and medication review' }
  },
  {
    // Same doctor (Dr. Walid Al-Habeeb) on the SAME day as con-001 but a
    // different time / type — exercises REQ 8.6.7 (time distinguishes two
    // eligible appointments with the same doctor on the same day).
    id: 'con-001b',
    opNumber: '3081815',
    date: '2026-04-09T15:45:00',
    doctorName: 'Dr. Walid Al-Habeeb',
    doctorSpecialty: 'Cardiology',
    location: 'Telehealth',
    type: 'telehealth',
    chiefComplaint: 'Same-day teleconsult to review afternoon ambulatory blood-pressure readings.',
    diagnosis: [
      { description: 'Essential (primary) hypertension', code: 'I10', type: 'primary' }
    ],
    investigations: [],
    procedures: [],
    medications: [
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '90 days', instructions: 'Continue as advised' }
    ],
    vitalsRecorded: [
      { label: 'Blood Pressure', value: '138/86', unit: 'mmHg' }
    ],
    notes: 'Afternoon readings improved versus the morning clinic visit. Continue current therapy; no change required.',
    followUp: { date: '2026-05-07', reason: 'BP reassessment and medication review' }
  },
  {
    id: 'con-002',
    opNumber: '3079420',
    date: '2026-03-22T15:30:00',
    doctorName: 'Dr. Samar Al-Homoud',
    doctorSpecialty: 'Dermatology',
    location: 'Telehealth',
    type: 'telehealth',
    chiefComplaint: 'Recurrent itching and red patches on both forearms for 3 weeks. Worsening with stress.',
    diagnosis: [
      { description: 'Atopic dermatitis, mild–moderate, bilateral forearms', code: 'L20.9', type: 'primary' }
    ],
    investigations: [
      { name: 'Skin patch allergy test', category: 'lab', status: 'pending' }
    ],
    procedures: [],
    medications: [
      { name: 'Mometasone furoate cream', dosage: '0.1%', frequency: 'Twice daily', duration: '14 days', instructions: 'Apply thin layer to affected areas' },
      { name: 'Cetirizine', dosage: '10mg', frequency: 'Once daily at night', duration: '14 days', instructions: 'For itching; may cause drowsiness' }
    ],
    vitalsRecorded: [],
    notes: 'Advised to use fragrance-free moisturiser twice daily and avoid hot showers. If no improvement in 2 weeks, return for review.',
    followUp: { date: '2026-04-05', reason: 'Treatment response review' }
  },
  {
    id: 'con-003',
    opNumber: '3074188',
    date: '2026-02-18T11:00:00',
    doctorName: 'Dr. Fatimah Al-Huwail',
    doctorSpecialty: 'Endocrinology',
    location: 'GHH Juffair · Block C',
    type: 'in_person',
    chiefComplaint: 'Quarterly diabetes follow-up. Self-reported fasting glucose has been creeping up.',
    diagnosis: [
      { description: 'Type 2 diabetes mellitus, sub-optimally controlled', code: 'E11.65', type: 'primary' }
    ],
    investigations: [
      {
        name: 'HbA1c', category: 'lab', status: 'reviewed',
        resultDate: '2026-02-15T09:00:00',
        result: {
          summary: 'Slightly above target. Reinforce dietary advice and review in 3 months.',
          parameters: [
            { name: 'HbA1c', value: '7.4', unit: '%', range: '<7.0 (target)', flag: 'high' }
          ]
        }
      },
      {
        name: 'Fasting Plasma Glucose', category: 'lab', status: 'reviewed',
        resultDate: '2026-02-15T09:00:00',
        result: {
          parameters: [
            { name: 'Fasting Glucose', value: '142', unit: 'mg/dL', range: '70–100', flag: 'high' }
          ]
        }
      },
      {
        name: 'Urine Microalbumin', category: 'lab', status: 'reviewed',
        resultDate: '2026-02-15T09:00:00',
        result: {
          summary: 'Within normal limits. No evidence of early nephropathy.',
          parameters: [
            { name: 'Microalbumin', value: '18', unit: 'mg/g Cr', range: '<30', flag: 'normal' }
          ]
        }
      },
      {
        name: 'Diabetic Retinopathy Screening', category: 'other', status: 'completed',
        resultDate: '2026-02-18T12:00:00',
        result: {
          summary: 'No diabetic retinopathy detected in either eye. Repeat in 12 months.',
          parameters: []
        }
      }
    ],
    procedures: [
      { name: 'Diabetic foot examination', outcome: 'Sensation intact, no ulceration' }
    ],
    medications: [
      { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '90 days', instructions: 'Take with meals' },
      { name: 'Vitamin D3', dosage: '1000 IU', frequency: 'Once daily', duration: '90 days' }
    ],
    vitalsRecorded: [
      { label: 'Blood Pressure', value: '132/84', unit: 'mmHg' },
      { label: 'Weight', value: '76', unit: 'kg' },
      { label: 'HbA1c', value: '7.4', unit: '%' }
    ],
    notes: 'HbA1c slightly above target (7.4 vs target <7.0). Reinforced dietary advice — carbohydrate portion control. Continue current dose; reassess at next visit.',
    followUp: { date: '2026-05-18', reason: 'Quarterly HbA1c and medication review' }
  },
  {
    id: 'con-004',
    opNumber: '3069903',
    date: '2026-01-30T09:00:00',
    doctorName: 'Dr. Adnan Ezzat',
    doctorSpecialty: 'Endocrinology',
    location: 'GHH Juffair · Block A',
    type: 'in_person',
    chiefComplaint: 'Annual comprehensive health check-up. No active complaints.',
    diagnosis: [
      { description: 'Adult health check — no abnormalities detected on examination', code: 'Z00.0', type: 'primary' }
    ],
    investigations: [
      { name: 'Complete Blood Count', category: 'lab', status: 'reviewed', resultDate: '2026-01-30T14:00:00' },
      { name: 'Comprehensive Metabolic Panel', category: 'lab', status: 'reviewed', resultDate: '2026-01-30T14:00:00' },
      { name: 'Chest X-Ray', category: 'imaging', status: 'reviewed', resultDate: '2026-01-30T15:30:00' },
      { name: 'Resting ECG', category: 'cardiac', status: 'reviewed', resultDate: '2026-01-30T10:30:00' }
    ],
    procedures: [
      { name: 'General physical examination', outcome: 'Unremarkable' },
      { name: 'Body composition analysis', outcome: 'BMI 24.6 — normal range' }
    ],
    medications: [],
    vitalsRecorded: [
      { label: 'Blood Pressure', value: '124/78', unit: 'mmHg' },
      { label: 'Heart Rate', value: '70', unit: 'bpm' },
      { label: 'Temperature', value: '36.7', unit: '°C' },
      { label: 'SpO₂', value: '99', unit: '%' },
      { label: 'Weight', value: '73', unit: 'kg' }
    ],
    notes: 'Overall in good health. Recommended to continue regular exercise and consider repeating annual check-up in 12 months.',
    followUp: null
  },
  {
    id: 'con-005',
    opNumber: '3061254',
    date: '2025-11-12T14:00:00',
    doctorName: 'Dr. Qasim Al-Qasabi',
    doctorSpecialty: 'Orthopedics',
    location: 'GHH Juffair · Block B',
    type: 'in_person',
    chiefComplaint: 'Left knee pain on stairs and after long walks for the past 6 weeks. No trauma.',
    diagnosis: [
      { description: 'Patellofemoral pain syndrome, left knee', code: 'M22.2', type: 'primary' }
    ],
    investigations: [
      { name: 'MRI Left Knee', category: 'imaging', status: 'reviewed', resultDate: '2025-11-15T10:00:00' },
      { name: 'X-Ray Bilateral Knees (AP/Lateral)', category: 'imaging', status: 'reviewed', resultDate: '2025-11-12T15:00:00' }
    ],
    procedures: [
      { name: 'Special tests: McMurray, Lachman, anterior drawer', outcome: 'All negative' },
      { name: 'Joint range of motion assessment', outcome: 'Full ROM, mild crepitus' }
    ],
    medications: [
      { name: 'Diclofenac sodium', dosage: '50mg', frequency: 'Twice daily after food', duration: '10 days', instructions: 'Stop if any gastric discomfort' },
      { name: 'Diclofenac gel', dosage: '1%', frequency: 'Apply 3 times daily', duration: '14 days' }
    ],
    vitalsRecorded: [
      { label: 'Blood Pressure', value: '130/82', unit: 'mmHg' },
      { label: 'Weight', value: '75', unit: 'kg' }
    ],
    notes: 'Referred to physiotherapy — 6 sessions focusing on quadriceps strengthening. Avoid high-impact activity for 2 weeks. Ice for 15 min after activity.',
    followUp: { date: '2025-12-10', reason: 'Reassessment post physiotherapy' }
  },
  {
    id: 'con-006',
    opNumber: '3052771',
    date: '2025-09-04T16:30:00',
    doctorName: 'Dr. Noura Al-Faisal',
    doctorSpecialty: 'ENT',
    location: 'GHH Juffair · Block A',
    type: 'in_person',
    chiefComplaint: 'Recurrent nasal congestion, facial pressure and headache. Third episode this year.',
    diagnosis: [
      { description: 'Chronic rhinosinusitis with nasal polyps', code: 'J33.0', type: 'primary' }
    ],
    investigations: [
      { name: 'CT Paranasal Sinuses', category: 'imaging', status: 'reviewed', resultDate: '2025-09-06T11:00:00' },
      { name: 'Nasal endoscopy', category: 'other', status: 'completed', resultDate: '2025-09-04T17:00:00' }
    ],
    procedures: [
      { name: 'Nasal endoscopy (in-clinic)', outcome: 'Small polyps in both middle meatuses' }
    ],
    medications: [
      { name: 'Mometasone nasal spray', dosage: '50 mcg/spray, 2 sprays each nostril', frequency: 'Once daily', duration: '60 days' },
      { name: 'Amoxicillin-clavulanate', dosage: '625mg', frequency: 'Three times daily', duration: '10 days', instructions: 'Complete full course' },
      { name: 'Saline nasal rinse', dosage: '—', frequency: 'Twice daily', duration: 'Ongoing' }
    ],
    vitalsRecorded: [
      { label: 'Temperature', value: '37.4', unit: '°C' },
      { label: 'Blood Pressure', value: '126/80', unit: 'mmHg' }
    ],
    notes: 'If symptoms persist beyond 4 weeks despite medical management, consider FESS (functional endoscopic sinus surgery) consultation.',
    followUp: { date: '2025-10-02', reason: 'Sinus response review' }
  },
  {
    id: 'con-007',
    opNumber: '3044096',
    date: '2025-07-21T11:30:00',
    doctorName: 'Dr. Walid Al-Habeeb',
    doctorSpecialty: 'Cardiology',
    location: 'Telehealth',
    type: 'telehealth',
    chiefComplaint: 'Telehealth follow-up after lifestyle changes. Symptoms resolved.',
    diagnosis: [
      { description: 'Essential hypertension — well controlled on therapy', code: 'I10', type: 'primary' }
    ],
    investigations: [
      { name: 'Home BP log review', category: 'other', status: 'reviewed' }
    ],
    procedures: [],
    medications: [
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '180 days', instructions: 'Continue current regimen' }
    ],
    vitalsRecorded: [
      { label: 'Average home BP (2 weeks)', value: '128/82', unit: 'mmHg' }
    ],
    notes: 'Excellent home BP control. Continue medication and lifestyle changes. Annual lipid review due.',
    followUp: { date: '2026-01-21', reason: 'Annual cardiovascular review' }
  }
];
