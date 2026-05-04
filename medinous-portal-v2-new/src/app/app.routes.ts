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
        path: 'medications',
        loadChildren: () => import('./features/medications/medications.routes').then(m => m.MEDICATIONS_ROUTES)
      },
      {
        path: 'payments',
        loadChildren: () => import('./features/payments/payments.routes').then(m => m.PAYMENTS_ROUTES)
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
