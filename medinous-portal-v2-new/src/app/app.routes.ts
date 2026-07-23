import { Routes } from '@angular/router';
import { ShellComponent } from './shared/components/shell/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
      },
      {
        path: 'timeline',
        loadChildren: () => import('./features/timeline/timeline.routes').then(m => m.TIMELINE_ROUTES)
      },
      {
        path: 'appointments',
        loadChildren: () => import('./features/appointments/appointments.routes').then(m => m.APPOINTMENTS_ROUTES)
      },
      {
        path: 'consultations',
        loadChildren: () => import('./features/consultations/consultations.routes').then(m => m.CONSULTATIONS_ROUTES)
      },
      {
        path: 'medications',
        loadChildren: () => import('./features/medications/medications.routes').then(m => m.MEDICATIONS_ROUTES)
      },
      {
        path: 'telehealth',
        loadChildren: () => import('./features/telehealth/telehealth.routes').then(m => m.TELEHEALTH_ROUTES)
      },
      {
        path: 'payments',
        loadChildren: () => import('./features/payments/payments.routes').then(m => m.PAYMENTS_ROUTES)
      },
      {
        path: 'profile',
        loadChildren: () => import('./features/profile/profile.routes').then(m => m.PROFILE_ROUTES)
      },
      {
        path: 'my-feedback',
        loadChildren: () => import('./features/my-feedback/my-feedback.routes').then(m => m.MY_FEEDBACK_ROUTES)
      },
      {
        // Back-office view: the HMIS Patient Feedback Report (row per
        // question). Not in the patient sidenav — reached directly.
        path: 'feedback-report',
        loadChildren: () => import('./features/feedback-report/feedback-report.routes').then(m => m.FEEDBACK_REPORT_ROUTES)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'guest-booking',
    loadChildren: () => import('./features/guest-booking/guest-booking.routes').then(m => m.GUEST_BOOKING_ROUTES)
  },
  { path: '**', redirectTo: 'dashboard' }
];
