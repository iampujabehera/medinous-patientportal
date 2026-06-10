import { Injectable, signal, computed } from '@angular/core';
import { ClinicLocation } from '../models/patient.model';

const CLINIC_LOCATIONS: ClinicLocation[] = [
  {
    id: 'loc-001', name: 'Prince Fahd Bin Sultan Hospital - Juffair',
    address: 'Building 2541, Road 2832, Juffair',
    city: 'Manama', phone: '+973-1781-2222', operatingHours: '24/7',
    specialties: ['Cardiology', 'Dermatology', 'General Medicine', 'Endocrinology', 'Orthopedics'], isActive: true
  },
  {
    id: 'loc-002', name: 'PFSH Medical Centre - Seef',
    address: 'Seef District, Al Seef Mall Tower',
    city: 'Manama', phone: '+973-1758-3333', operatingHours: '8:00 AM - 10:00 PM',
    specialties: ['General Medicine', 'Dermatology', 'Orthopedics'], isActive: true
  },
  {
    id: 'loc-003', name: 'PFSH Clinic - Riffa',
    address: 'East Riffa, Avenue 55',
    city: 'Riffa', phone: '+973-1776-4444', operatingHours: '8:00 AM - 8:00 PM',
    specialties: ['General Medicine', 'Cardiology'], isActive: true
  },
  {
    id: 'loc-004', name: 'PFSH Clinic - Muharraq',
    address: 'Sheikh Isa Avenue, Muharraq',
    city: 'Muharraq', phone: '+973-1734-5555', operatingHours: '9:00 AM - 9:00 PM',
    specialties: ['General Medicine', 'Dermatology', 'Endocrinology'], isActive: true
  }
];

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly selectedLocationId = signal<string | null>(null);

  readonly locations = CLINIC_LOCATIONS.filter(l => l.isActive);

  readonly selectedLocation = computed<ClinicLocation | null>(() => {
    const id = this.selectedLocationId();
    return id ? this.locations.find(l => l.id === id) ?? null : null;
  });

  readonly isLocationSelected = computed(() => this.selectedLocationId() !== null);

  setLocation(locationId: string | null): void {
    this.selectedLocationId.set(locationId);
    if (locationId) {
      localStorage.setItem('medinous_location', locationId);
    } else {
      localStorage.removeItem('medinous_location');
    }
  }

  initialize(): void {
    // Don't auto-restore — patients must select their location each session
  }

  getLocationsForSpecialty(specialty: string): ClinicLocation[] {
    return this.locations.filter(l => l.specialties.includes(specialty));
  }

  getLocationById(id: string): ClinicLocation | undefined {
    return this.locations.find(l => l.id === id);
  }
}
