import { Routes } from '@angular/router';

// =====================================================================
// TELEHEALTH — ROUTES
//
// Mirrors the information architecture in spec §16. Everything remote-
// care and hospital-at-home lives under /telehealth; deep-links back to
// the existing Records / Medications / Payments modules are used for
// anything already owned by those features.
// =====================================================================
export const TELEHEALTH_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./telehealth-home.component').then(m => m.TelehealthHomeComponent) },
  { path: 'active-care', loadComponent: () => import('./active-care.component').then(m => m.ActiveCareComponent) },

  // Consult a doctor online
  { path: 'consult', loadComponent: () => import('./consult-online.component').then(m => m.ConsultOnlineComponent) },
  { path: 'consult/instant', loadComponent: () => import('./instant-consult.component').then(m => m.InstantConsultComponent) },
  { path: 'consult/video-consult', loadComponent: () => import('./video-consult-demo.component').then(m => m.VideoConsultDemoComponent) },
  { path: 'consult/room/:id', loadComponent: () => import('./video-room.component').then(m => m.VideoRoomComponent) },
  { path: 'consult/outcome/:id', loadComponent: () => import('./consult-outcome.component').then(m => m.ConsultOutcomeComponent) },

  // Care at home + home lab
  { path: 'home-care', loadComponent: () => import('./home-care.component').then(m => m.HomeCareComponent) },
  { path: 'lab-tests', loadComponent: () => import('./lab-tests.component').then(m => m.LabTestsComponent) },

  // Shared service surfaces
  { path: 'prepare/:id', loadComponent: () => import('./preparation.component').then(m => m.PreparationComponent) },
  { path: 'track/:id', loadComponent: () => import('./service-tracking.component').then(m => m.ServiceTrackingComponent) },
  { path: 'help', loadComponent: () => import('./help.component').then(m => m.HelpComponent) },

  { path: '**', redirectTo: '' }
];
