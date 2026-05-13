import {
  DashboardSummary, TimelineEvent, Doctor,
  BookingSlot, Medication, Payment, PatientDocument
} from '../models/patient.model';

export const MOCK_DASHBOARD: DashboardSummary = {
  patient: {
    id: 'p-001',
    firstName: 'Priya',
    lastName: 'Sharma',
    dateOfBirth: '1990-05-15',
    gender: 'Female',
    email: 'priya.sharma@email.com',
    phone: '+91-9876543210',
    avatarUrl: ''
  },
  upcomingAppointments: [
    {
      id: 'a-001', doctorName: 'Dr. Rajesh Kumar', specialty: 'Cardiology',
      date: '2026-04-15', time: '10:00 AM', status: 'scheduled',
      location: 'Medinous Clinic - Block A', type: 'in_person'
    },
    {
      id: 'a-002', doctorName: 'Dr. Sarah Chen', specialty: 'Dermatology',
      date: '2026-04-18', time: '02:30 PM', status: 'scheduled',
      location: 'Telehealth', type: 'telehealth'
    },
    {
      id: 'a-003', doctorName: 'Dr. Ahmed Hassan', specialty: 'General Medicine',
      date: '2026-04-22', time: '11:00 AM', status: 'scheduled',
      location: 'Medinous Clinic - Block B', type: 'in_person'
    }
  ],
  activeMedications: [
    {
      id: 'm-001', name: 'Metformin', dosage: '500mg', frequency: 'Twice daily',
      startDate: '2026-01-10', prescribedBy: 'Dr. Rajesh Kumar',
      refillsRemaining: 3, taken: [true, true, false, true, true, true, true],
      instructions: 'Take with meals'
    },
    {
      id: 'm-002', name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily',
      startDate: '2026-02-01', prescribedBy: 'Dr. Rajesh Kumar',
      refillsRemaining: 5, taken: [true, true, true, true, true, false, true],
      instructions: 'Take in the morning'
    },
    {
      id: 'm-003', name: 'Vitamin D3', dosage: '1000 IU', frequency: 'Once daily',
      startDate: '2026-03-01', prescribedBy: 'Dr. Ahmed Hassan',
      refillsRemaining: 8, taken: [true, false, true, true, true, true, true]
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

export const MOCK_TIMELINE: TimelineEvent[] = Array.from({ length: 100 }, (_, i) => {
  const types: TimelineEvent['type'][] = ['appointment', 'lab_result', 'prescription', 'vaccination', 'imaging', 'procedure', 'medical_report', 'note'];
  const type = types[i % types.length];
  const daysAgo = i * 3;
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  const titles: Record<string, string[]> = {
    appointment: ['Cardiology Consultation', 'General Checkup', 'Dermatology Follow-up', 'Endocrinology Review'],
    lab_result: ['Complete Blood Count', 'HbA1c Test', 'Lipid Panel', 'Thyroid Function Test'],
    prescription: ['Metformin Prescribed', 'Amlodipine Renewed', 'Vitamin D3 Added', 'Aspirin Started'],
    vaccination: ['Flu Vaccine', 'COVID-19 Booster', 'Hepatitis B', 'Tetanus Booster'],
    note: ['Diet Plan Updated', 'Exercise Recommendations', 'Referral to Specialist', 'Follow-up Notes'],
    imaging: ['Chest X-Ray', 'ECG Report', 'Ultrasound Abdomen', 'MRI Knee'],
    procedure: ['ECG Procedure', 'Endoscopy', 'Minor Surgery - Wound Closure', 'Biopsy Report'],
    medical_report: ['Discharge Summary', 'Annual Health Report', 'Specialist Referral Report', 'Insurance Medical Report']
  };

  const providers = ['Dr. Rajesh Kumar', 'Dr. Sarah Chen', 'Dr. Ahmed Hassan', 'Dr. Lisa Wong'];

  return {
    id: `tl-${i}`,
    type,
    title: titles[type][i % titles[type].length],
    description: `${type.replace('_', ' ')} record from your visit on ${date.toLocaleDateString()}`,
    date: date.toISOString(),
    provider: providers[i % providers.length]
  };
});

export const MOCK_DOCTORS: Doctor[] = [
  { id: 'd-001', name: 'Dr. Rajesh Kumar', specialty: 'Cardiology', rating: 4.8, nextAvailable: '2026-04-15', location: 'BSH Juffair', consultationFee: 25, advanceFee: 25 },
  { id: 'd-002', name: 'Dr. Sarah Chen', specialty: 'Dermatology', rating: 4.9, nextAvailable: '2026-04-15', location: 'BSH Juffair', consultationFee: 15, advanceFee: 15 },
  { id: 'd-003', name: 'Dr. Ahmed Hassan', specialty: 'General Medicine', rating: 4.7, nextAvailable: '2026-04-15', location: 'BSH Juffair', consultationFee: 10, advanceFee: 10 },
  { id: 'd-004', name: 'Dr. Lisa Wong', specialty: 'Endocrinology', rating: 4.6, nextAvailable: '2026-04-16', location: 'BSH Juffair', consultationFee: 30, advanceFee: 30 },
  { id: 'd-005', name: 'Dr. Vikram Patel', specialty: 'Orthopedics', rating: 4.8, nextAvailable: '2026-04-16', location: 'BSH Juffair', consultationFee: 20, advanceFee: 20 },
  { id: 'd-006', name: 'Dr. Fatima Al-Rashid', specialty: 'Cardiology', rating: 4.9, nextAvailable: '2026-04-17', location: 'BSH Juffair', consultationFee: 35, advanceFee: 35 }
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

export const MOCK_MEDICATIONS: Medication[] = MOCK_DASHBOARD.activeMedications;

export const MOCK_PAYMENTS: Payment[] = [
  {
    id: 'pay-001', date: '2026-04-09T10:30:00', amount: 350, currency: 'AED',
    status: 'completed', method: 'card', description: 'Cardiology Consultation',
    appointmentId: 'a-001', doctorName: 'Dr. Rajesh Kumar',
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
    id: 'pay-002', date: '2026-04-05T14:00:00', amount: 200, currency: 'AED',
    status: 'completed', method: 'upi', description: 'Dermatology Follow-up',
    appointmentId: 'a-002', doctorName: 'Dr. Sarah Chen',
    receiptUrl: '/receipts/pay-002.pdf', invoiceNumber: 'INV-2026-0038',
    breakdown: [
      { label: 'Consultation Fee', amount: 200 }
    ]
  },
  {
    id: 'pay-003', date: '2026-04-02T09:00:00', amount: 1250, currency: 'AED',
    status: 'completed', method: 'insurance', description: 'Lab Work - Complete Panel',
    doctorName: 'Dr. Ahmed Hassan',
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
    id: 'pay-004', date: '2026-03-28T11:00:00', amount: 500, currency: 'AED',
    status: 'pending', method: 'insurance', description: 'Endocrinology Consultation',
    doctorName: 'Dr. Lisa Wong', invoiceNumber: 'INV-2026-0030',
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
    id: 'pay-005', date: '2026-03-20T16:00:00', amount: 150, currency: 'AED',
    status: 'failed', method: 'card', description: 'Pharmacy - Medication Refill',
    invoiceNumber: 'INV-2026-0025',
    breakdown: [
      { label: 'Metformin 500mg x 60', amount: 80 },
      { label: 'Amlodipine 5mg x 30', amount: 70 }
    ]
  },
  {
    id: 'pay-006', date: '2026-03-15T10:00:00', amount: 800, currency: 'AED',
    status: 'completed', method: 'card', description: 'General Checkup + ECG',
    doctorName: 'Dr. Ahmed Hassan',
    receiptUrl: '/receipts/pay-006.pdf', invoiceNumber: 'INV-2026-0020',
    breakdown: [
      { label: 'Annual Physical', amount: 500 },
      { label: 'ECG', amount: 150 },
      { label: 'Blood Draw', amount: 150 }
    ]
  },
  {
    id: 'pay-007', date: '2026-03-10T13:30:00', amount: 275, currency: 'AED',
    status: 'completed', method: 'bank_transfer', description: 'Orthopedic Consultation',
    doctorName: 'Dr. Vikram Patel',
    receiptUrl: '/receipts/pay-007.pdf', invoiceNumber: 'INV-2026-0018',
    breakdown: [
      { label: 'Consultation Fee', amount: 275 }
    ]
  },
  {
    id: 'pay-008', date: '2026-02-25T09:30:00', amount: 2100, currency: 'AED',
    status: 'completed', method: 'insurance', description: 'MRI Knee - Left',
    doctorName: 'Dr. Vikram Patel',
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
    doctorName: 'Dr. Ahmed Hassan',
    receiptUrl: '/receipts/pay-011.pdf', invoiceNumber: 'REF-2026-0007',
    breakdown: [
      { label: 'Refund — Vitamin D Panel', amount: 175 }
    ]
  },
  {
    id: 'pay-012', date: '2026-03-22T15:30:00', amount: 90, currency: 'AED',
    status: 'refunded', method: 'card', description: 'Cancelled Consultation — Refund',
    doctorName: 'Dr. Sarah Chen',
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
    uploadDate: '2026-03-20T11:00:00', uploadedBy: 'Dr. Ahmed Hassan',
    url: '/documents/doc-003.jpg', thumbnailUrl: '/documents/doc-003-thumb.jpg',
    tags: ['chest', 'x-ray', 'cardiology']
  },
  {
    id: 'doc-004', name: 'ECG Report - March 2026', type: 'radiology',
    category: 'Cardiology', fileType: 'pdf', fileSize: 520000,
    uploadDate: '2026-03-15T10:45:00', uploadedBy: 'Dr. Rajesh Kumar',
    url: '/documents/doc-004.pdf', tags: ['ECG', 'heart', 'cardiology']
  },
  {
    id: 'doc-005', name: 'Metformin Prescription', type: 'prescription',
    category: 'Prescriptions', fileType: 'pdf', fileSize: 95000,
    uploadDate: '2026-01-10T09:00:00', uploadedBy: 'Dr. Rajesh Kumar',
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
    uploadDate: '2026-02-25T15:00:00', uploadedBy: 'Dr. Vikram Patel',
    url: '/documents/doc-007.pdf', tags: ['MRI', 'knee', 'orthopedics']
  },
  {
    id: 'doc-008', name: 'Lipid Panel Results', type: 'lab_report',
    category: 'Biochemistry', fileType: 'pdf', fileSize: 210000,
    uploadDate: '2026-04-02T16:00:00', uploadedBy: 'Lab System',
    url: '/documents/doc-008.pdf', tags: ['lipid', 'cholesterol', 'routine']
  }
];
