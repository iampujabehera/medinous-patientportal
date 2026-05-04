import { Injectable, signal, computed } from '@angular/core';

export type SupportedLang = 'en' | 'ar';

const TRANSLATIONS: Record<SupportedLang, Record<string, string>> = {
  en: {
    // Shell & Nav
    'nav.dashboard': 'Dashboard',
    'nav.timeline': 'Health Timeline',
    'nav.appointments': 'Appointments',
    'nav.medications': 'Medications',
    'nav.payments': 'Payments',
    'nav.documents': 'Documents',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.signout': 'Sign Out',

    // Dashboard
    'dashboard.greeting.morning': 'Good morning',
    'dashboard.greeting.afternoon': 'Good afternoon',
    'dashboard.greeting.evening': 'Good evening',
    'dashboard.summary': "Here's your health summary for today",
    'dashboard.vitals': 'Recent Vitals',
    'dashboard.upcoming': 'Upcoming Appointments',
    'dashboard.meds': 'Active Medications',
    'dashboard.quick_actions': 'Quick Actions',
    'dashboard.book_appt': 'Book Appointment',
    'dashboard.log_med': 'Log Medication',
    'dashboard.view_history': 'View History',
    'dashboard.download': 'Download Records',
    'dashboard.alerts': 'Alerts',

    // Vitals
    'vital.blood_pressure': 'Blood Pressure',
    'vital.heart_rate': 'Heart Rate',
    'vital.temperature': 'Temperature',
    'vital.oxygen': 'SpO\u2082',
    'vital.weight': 'Weight',
    'vital.glucose': 'Glucose',

    // Appointments
    'appt.book': 'Book Appointment',
    'appt.schedule_subtitle': 'Schedule a visit in just a few steps',
    'appt.choose_doctor': 'Choose Doctor',
    'appt.pick_time': 'Pick Time',
    'appt.confirm': 'Confirm',
    'appt.select_specialty': 'Select Specialty',
    'appt.next_available': 'Next available',
    'appt.continue': 'Continue',
    'appt.back': 'Back',
    'appt.confirm_booking': 'Confirm Booking',
    'appt.booked': 'Appointment Booked!',
    'appt.book_another': 'Book Another',
    'appt.reason': 'Reason for visit (optional)',
    'appt.summary': 'Appointment Summary',
    'appt.in_person': 'In-Person',
    'appt.telehealth': 'Video',
    'appt.no_slots': 'No available slots for this date.',
    'appt.schedule_now': 'Schedule Now',

    // Medications
    'med.tracker': 'Medication Tracker',
    'med.subtitle': 'Track your daily medications and adherence',
    'med.today': "Today's Schedule",
    'med.take': 'Take',
    'med.skip': 'Skip',
    'med.taken': 'Taken',
    'med.adherence': '7-Day Adherence',
    'med.refills': 'refills remaining',
    'med.request_refill': 'Request Refill',
    'med.summary': 'Adherence Summary',
    'med.active': 'Active Medications',
    'med.overall': 'Overall Adherence',
    'med.refills_needed': 'Refills Needed',
    'med.taken_today': 'Taken Today',
    'med.offline': 'Offline Mode',

    // Payments
    'pay.title': 'Payment History',
    'pay.subtitle': 'View your transactions and download receipts',
    'pay.all': 'All',
    'pay.completed': 'Completed',
    'pay.pending': 'Pending',
    'pay.failed': 'Failed',
    'pay.total_paid': 'Total Paid',
    'pay.pending_amount': 'Pending',
    'pay.this_month': 'This Month',
    'pay.transactions': 'Transactions',
    'pay.receipt': 'Receipt',
    'pay.download_receipt': 'Download Receipt',
    'pay.view_details': 'View Details',
    'pay.invoice': 'Invoice',
    'pay.insurance_claim': 'Insurance Claim',
    'pay.claim_status': 'Claim Status',
    'pay.covered': 'Covered Amount',
    'pay.patient_resp': 'Your Responsibility',
    'pay.breakdown': 'Payment Breakdown',
    'pay.no_transactions': 'No transactions found',
    'pay.generate_receipt': 'Generate Receipt',
    'pay.receipt_ready': 'Receipt downloaded successfully',
    'pay.receipt_failed': 'Failed to generate receipt. Please try again.',
    'pay.reimbursement': 'Insurance Reimbursement',
    'pay.download_claim': 'Download Claim Form',

    // Documents
    'doc.title': 'Documents',
    'doc.subtitle': 'Upload and manage your medical records',
    'doc.upload': 'Upload Document',
    'doc.all': 'All',
    'doc.lab_report': 'Lab Reports',
    'doc.radiology': 'Radiology',
    'doc.prescription': 'Prescriptions',
    'doc.insurance': 'Insurance',
    'doc.other': 'Other',
    'doc.delete': 'Delete',
    'doc.delete_confirm': 'Are you sure you want to delete this document?',
    'doc.deleted': 'Document deleted',
    'doc.uploaded': 'Document uploaded successfully',
    'doc.upload_failed': 'Upload failed. Please try again.',
    'doc.no_documents': 'No documents found',
    'doc.drag_drop': 'Drag & drop files here or click to browse',
    'doc.supported': 'Supported: PDF, JPG, PNG, DICOM (max 25MB)',
    'doc.select_type': 'Document Type',
    'doc.select_category': 'Category',
    'doc.view': 'View',
    'doc.download': 'Download',

    // Guest Booking
    'guest.title': 'Book as Guest',
    'guest.subtitle': 'No account needed - book your appointment instantly',
    'guest.your_details': 'Your Details',
    'guest.first_name': 'First Name',
    'guest.last_name': 'Last Name',
    'guest.phone': 'Phone Number',
    'guest.email': 'Email',
    'guest.dob': 'Date of Birth',
    'guest.gender': 'Gender',
    'guest.id_type': 'ID Type',
    'guest.id_number': 'ID Number',
    'guest.register_prompt': 'Create an account to access all features',
    'guest.register': 'Create Account',
    'guest.continue_guest': 'Continue as Guest',

    // Location
    'location.select': 'Select Location',
    'location.all': 'All Locations',
    'location.change': 'Change Location',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.view_all': 'View All',
    'common.book_new': 'Book New',
  },
  ar: {
    // Shell & Nav
    'nav.dashboard': '\u0644\u0648\u062d\u0629 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a',
    'nav.timeline': '\u0627\u0644\u0633\u062c\u0644 \u0627\u0644\u0635\u062d\u064a',
    'nav.appointments': '\u0627\u0644\u0645\u0648\u0627\u0639\u064a\u062f',
    'nav.medications': '\u0627\u0644\u0623\u062f\u0648\u064a\u0629',
    'nav.payments': '\u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a',
    'nav.documents': '\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a',
    'nav.profile': '\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a',
    'nav.settings': '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a',
    'nav.signout': '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c',

    // Dashboard
    'dashboard.greeting.morning': '\u0635\u0628\u0627\u062d \u0627\u0644\u062e\u064a\u0631',
    'dashboard.greeting.afternoon': '\u0645\u0633\u0627\u0621 \u0627\u0644\u062e\u064a\u0631',
    'dashboard.greeting.evening': '\u0645\u0633\u0627\u0621 \u0627\u0644\u062e\u064a\u0631',
    'dashboard.summary': '\u0645\u0644\u062e\u0635 \u0635\u062d\u062a\u0643 \u0627\u0644\u064a\u0648\u0645',
    'dashboard.vitals': '\u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062a \u0627\u0644\u062d\u064a\u0648\u064a\u0629',
    'dashboard.upcoming': '\u0627\u0644\u0645\u0648\u0627\u0639\u064a\u062f \u0627\u0644\u0642\u0627\u062f\u0645\u0629',
    'dashboard.meds': '\u0627\u0644\u0623\u062f\u0648\u064a\u0629 \u0627\u0644\u0646\u0634\u0637\u0629',
    'dashboard.quick_actions': '\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0633\u0631\u064a\u0639\u0629',
    'dashboard.book_appt': '\u062d\u062c\u0632 \u0645\u0648\u0639\u062f',
    'dashboard.log_med': '\u062a\u0633\u062c\u064a\u0644 \u062f\u0648\u0627\u0621',
    'dashboard.view_history': '\u0639\u0631\u0636 \u0627\u0644\u0633\u062c\u0644',
    'dashboard.download': '\u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0633\u062c\u0644\u0627\u062a',
    'dashboard.alerts': '\u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a',

    // Vitals
    'vital.blood_pressure': '\u0636\u063a\u0637 \u0627\u0644\u062f\u0645',
    'vital.heart_rate': '\u0645\u0639\u062f\u0644 \u0636\u0631\u0628\u0627\u062a \u0627\u0644\u0642\u0644\u0628',
    'vital.temperature': '\u062f\u0631\u062c\u0629 \u0627\u0644\u062d\u0631\u0627\u0631\u0629',
    'vital.oxygen': '\u0627\u0644\u0623\u0643\u0633\u062c\u064a\u0646',
    'vital.weight': '\u0627\u0644\u0648\u0632\u0646',
    'vital.glucose': '\u0627\u0644\u0633\u0643\u0631',

    // Appointments
    'appt.book': '\u062d\u062c\u0632 \u0645\u0648\u0639\u062f',
    'appt.schedule_subtitle': '\u062d\u062f\u062f \u0645\u0648\u0639\u062f\u0643 \u0641\u064a \u062e\u0637\u0648\u0627\u062a \u0628\u0633\u064a\u0637\u0629',
    'appt.choose_doctor': '\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0637\u0628\u064a\u0628',
    'appt.pick_time': '\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0648\u0642\u062a',
    'appt.confirm': '\u062a\u0623\u0643\u064a\u062f',
    'appt.select_specialty': '\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u062a\u062e\u0635\u0635',
    'appt.next_available': '\u0627\u0644\u0645\u0648\u0639\u062f \u0627\u0644\u062a\u0627\u0644\u064a',
    'appt.continue': '\u0645\u062a\u0627\u0628\u0639\u0629',
    'appt.back': '\u0631\u062c\u0648\u0639',
    'appt.confirm_booking': '\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062d\u062c\u0632',
    'appt.booked': '\u062a\u0645 \u062d\u062c\u0632 \u0627\u0644\u0645\u0648\u0639\u062f!',
    'appt.book_another': '\u062d\u062c\u0632 \u0645\u0648\u0639\u062f \u0622\u062e\u0631',
    'appt.reason': '\u0633\u0628\u0628 \u0627\u0644\u0632\u064a\u0627\u0631\u0629 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)',
    'appt.summary': '\u0645\u0644\u062e\u0635 \u0627\u0644\u0645\u0648\u0639\u062f',
    'appt.in_person': '\u062d\u0636\u0648\u0631\u064a',
    'appt.telehealth': '\u0639\u0646 \u0628\u0639\u062f',
    'appt.no_slots': '\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0648\u0627\u0639\u064a\u062f \u0645\u062a\u0627\u062d\u0629',
    'appt.schedule_now': '\u062d\u062c\u0632 \u0627\u0644\u0622\u0646',

    // Medications
    'med.tracker': '\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0623\u062f\u0648\u064a\u0629',
    'med.subtitle': '\u062a\u062a\u0628\u0639 \u0623\u062f\u0648\u064a\u062a\u0643 \u0627\u0644\u064a\u0648\u0645\u064a\u0629',
    'med.today': '\u062c\u062f\u0648\u0644 \u0627\u0644\u064a\u0648\u0645',
    'med.take': '\u062a\u0646\u0627\u0648\u0644',
    'med.skip': '\u062a\u062e\u0637\u064a',
    'med.taken': '\u062a\u0645 \u0627\u0644\u062a\u0646\u0627\u0648\u0644',
    'med.adherence': '\u0627\u0644\u0627\u0644\u062a\u0632\u0627\u0645 - 7 \u0623\u064a\u0627\u0645',
    'med.refills': '\u0625\u0639\u0627\u062f\u0627\u062a \u062a\u0639\u0628\u0626\u0629 \u0645\u062a\u0628\u0642\u064a\u0629',
    'med.request_refill': '\u0637\u0644\u0628 \u0625\u0639\u0627\u062f\u0629 \u062a\u0639\u0628\u0626\u0629',
    'med.summary': '\u0645\u0644\u062e\u0635 \u0627\u0644\u0627\u0644\u062a\u0632\u0627\u0645',
    'med.active': '\u0627\u0644\u0623\u062f\u0648\u064a\u0629 \u0627\u0644\u0646\u0634\u0637\u0629',
    'med.overall': '\u0627\u0644\u0627\u0644\u062a\u0632\u0627\u0645 \u0627\u0644\u0639\u0627\u0645',
    'med.refills_needed': '\u0625\u0639\u0627\u062f\u0627\u062a \u062a\u0639\u0628\u0626\u0629 \u0645\u0637\u0644\u0648\u0628\u0629',
    'med.taken_today': '\u062a\u0645 \u062a\u0646\u0627\u0648\u0644\u0647\u0627 \u0627\u0644\u064a\u0648\u0645',
    'med.offline': '\u0648\u0636\u0639 \u063a\u064a\u0631 \u0645\u062a\u0635\u0644',

    // Payments
    'pay.title': '\u0633\u062c\u0644 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a',
    'pay.subtitle': '\u0639\u0631\u0636 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a \u0648\u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u064a\u0635\u0627\u0644\u0627\u062a',
    'pay.all': '\u0627\u0644\u0643\u0644',
    'pay.completed': '\u0645\u0643\u062a\u0645\u0644\u0629',
    'pay.pending': '\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631',
    'pay.failed': '\u0641\u0627\u0634\u0644\u0629',
    'pay.total_paid': '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u062f\u0641\u0648\u0639',
    'pay.pending_amount': '\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631',
    'pay.this_month': '\u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631',
    'pay.transactions': '\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a',
    'pay.receipt': '\u0625\u064a\u0635\u0627\u0644',
    'pay.download_receipt': '\u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u064a\u0635\u0627\u0644',
    'pay.view_details': '\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644',
    'pay.invoice': '\u0641\u0627\u062a\u0648\u0631\u0629',
    'pay.insurance_claim': '\u0645\u0637\u0627\u0644\u0628\u0629 \u0627\u0644\u062a\u0623\u0645\u064a\u0646',
    'pay.claim_status': '\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629',
    'pay.covered': '\u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u063a\u0637\u0649',
    'pay.patient_resp': '\u0645\u0633\u0624\u0648\u0644\u064a\u062a\u0643',
    'pay.breakdown': '\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062f\u0641\u0639',
    'pay.no_transactions': '\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0639\u0627\u0645\u0644\u0627\u062a',
    'pay.generate_receipt': '\u0625\u0646\u0634\u0627\u0621 \u0625\u064a\u0635\u0627\u0644',
    'pay.receipt_ready': '\u062a\u0645 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u064a\u0635\u0627\u0644 \u0628\u0646\u062c\u0627\u062d',
    'pay.receipt_failed': '\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0625\u064a\u0635\u0627\u0644. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.',
    'pay.reimbursement': '\u062a\u0639\u0648\u064a\u0636 \u0627\u0644\u062a\u0623\u0645\u064a\u0646',
    'pay.download_claim': '\u062a\u062d\u0645\u064a\u0644 \u0646\u0645\u0648\u0630\u062c \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629',

    // Documents
    'doc.title': '\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a',
    'doc.subtitle': '\u0631\u0641\u0639 \u0648\u0625\u062f\u0627\u0631\u0629 \u0633\u062c\u0644\u0627\u062a\u0643 \u0627\u0644\u0637\u0628\u064a\u0629',
    'doc.upload': '\u0631\u0641\u0639 \u0645\u0633\u062a\u0646\u062f',
    'doc.all': '\u0627\u0644\u0643\u0644',
    'doc.lab_report': '\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0645\u062e\u062a\u0628\u0631',
    'doc.radiology': '\u0627\u0644\u0623\u0634\u0639\u0629',
    'doc.prescription': '\u0627\u0644\u0648\u0635\u0641\u0627\u062a',
    'doc.insurance': '\u0627\u0644\u062a\u0623\u0645\u064a\u0646',
    'doc.other': '\u0623\u062e\u0631\u0649',
    'doc.delete': '\u062d\u0630\u0641',
    'doc.delete_confirm': '\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u062a\u0646\u062f\u061f',
    'doc.deleted': '\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0645\u0633\u062a\u0646\u062f',
    'doc.uploaded': '\u062a\u0645 \u0631\u0641\u0639 \u0627\u0644\u0645\u0633\u062a\u0646\u062f \u0628\u0646\u062c\u0627\u062d',
    'doc.upload_failed': '\u0641\u0634\u0644 \u0627\u0644\u0631\u0641\u0639. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.',
    'doc.no_documents': '\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0633\u062a\u0646\u062f\u0627\u062a',
    'doc.drag_drop': '\u0627\u0633\u062d\u0628 \u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0647\u0646\u0627 \u0623\u0648 \u0627\u0646\u0642\u0631 \u0644\u0644\u062a\u0635\u0641\u062d',
    'doc.supported': '\u0645\u062f\u0639\u0648\u0645: PDF\u060c JPG\u060c PNG\u060c DICOM (\u062d\u062f 25 \u0645\u064a\u063a\u0627)',
    'doc.select_type': '\u0646\u0648\u0639 \u0627\u0644\u0645\u0633\u062a\u0646\u062f',
    'doc.select_category': '\u0627\u0644\u0641\u0626\u0629',
    'doc.view': '\u0639\u0631\u0636',
    'doc.download': '\u062a\u062d\u0645\u064a\u0644',

    // Guest Booking
    'guest.title': '\u062d\u062c\u0632 \u0643\u0632\u0627\u0626\u0631',
    'guest.subtitle': '\u0644\u0627 \u062d\u0627\u062c\u0629 \u0644\u062d\u0633\u0627\u0628 - \u0627\u062d\u062c\u0632 \u0645\u0648\u0639\u062f\u0643 \u0641\u0648\u0631\u0627\u064b',
    'guest.your_details': '\u0628\u064a\u0627\u0646\u0627\u062a\u0643',
    'guest.first_name': '\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644',
    'guest.last_name': '\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0629',
    'guest.phone': '\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641',
    'guest.email': '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',
    'guest.dob': '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0645\u064a\u0644\u0627\u062f',
    'guest.gender': '\u0627\u0644\u062c\u0646\u0633',
    'guest.id_type': '\u0646\u0648\u0639 \u0627\u0644\u0647\u0648\u064a\u0629',
    'guest.id_number': '\u0631\u0642\u0645 \u0627\u0644\u0647\u0648\u064a\u0629',
    'guest.register_prompt': '\u0623\u0646\u0634\u0626 \u062d\u0633\u0627\u0628\u0627\u064b \u0644\u0644\u0648\u0635\u0648\u0644 \u0644\u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u064a\u0632\u0627\u062a',
    'guest.register': '\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628',
    'guest.continue_guest': '\u0645\u062a\u0627\u0628\u0639\u0629 \u0643\u0632\u0627\u0626\u0631',

    // Location
    'location.select': '\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0645\u0648\u0642\u0639',
    'location.all': '\u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0648\u0627\u0642\u0639',
    'location.change': '\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0645\u0648\u0642\u0639',

    // Common
    'common.loading': '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...',
    'common.error': '\u062d\u062f\u062b \u062e\u0637\u0623',
    'common.retry': '\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629',
    'common.cancel': '\u0625\u0644\u063a\u0627\u0621',
    'common.save': '\u062d\u0641\u0638',
    'common.close': '\u0625\u063a\u0644\u0627\u0642',
    'common.search': '\u0628\u062d\u062b',
    'common.filter': '\u062a\u0635\u0641\u064a\u0629',
    'common.view_all': '\u0639\u0631\u0636 \u0627\u0644\u0643\u0644',
    'common.book_new': '\u062d\u062c\u0632 \u062c\u062f\u064a\u062f',
  }
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly currentLang = signal<SupportedLang>('en');

  readonly lang = computed(() => this.currentLang());
  readonly isRtl = computed(() => this.currentLang() === 'ar');
  readonly dir = computed(() => this.isRtl() ? 'rtl' : 'ltr');

  setLanguage(lang: SupportedLang): void {
    this.currentLang.set(lang);
    localStorage.setItem('medinous_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = this.dir();
    document.body.style.direction = this.dir();
    document.body.style.textAlign = this.isRtl() ? 'right' : 'left';
  }

  initialize(): void {
    const saved = localStorage.getItem('medinous_lang') as SupportedLang | null;
    if (saved && TRANSLATIONS[saved]) {
      this.setLanguage(saved);
    }
  }

  t(key: string): string {
    return TRANSLATIONS[this.currentLang()][key] ?? TRANSLATIONS['en'][key] ?? key;
  }
}
