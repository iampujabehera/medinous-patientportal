import { TestBed } from '@angular/core/testing';
import { LocationService } from './location.service';

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have no location selected initially', () => {
    expect(service.isLocationSelected()).toBeFalse();
    expect(service.selectedLocation()).toBeNull();
  });

  it('should have active clinic locations', () => {
    expect(service.locations.length).toBeGreaterThan(0);
    service.locations.forEach(loc => {
      expect(loc.isActive).toBeTrue();
    });
  });

  it('should select a location', () => {
    service.setLocation('loc-001');
    expect(service.isLocationSelected()).toBeTrue();
    expect(service.selectedLocation()?.name).toBe('Prince Fahd Bin Sultan Hospital - Juffair');
  });

  it('should persist location to localStorage', () => {
    service.setLocation('loc-002');
    expect(localStorage.getItem('medinous_location')).toBe('loc-002');
  });

  it('should clear location from localStorage when set to null', () => {
    service.setLocation('loc-001');
    service.setLocation(null);
    expect(localStorage.getItem('medinous_location')).toBeNull();
    expect(service.isLocationSelected()).toBeFalse();
  });

  it('should NOT auto-restore location on initialize (by design)', () => {
    localStorage.setItem('medinous_location', 'loc-001');
    service.initialize();
    // Patients must select each session
    expect(service.isLocationSelected()).toBeFalse();
  });

  it('should get location by id', () => {
    const loc = service.getLocationById('loc-003');
    expect(loc).toBeTruthy();
    expect(loc?.name).toBe('PFSH Clinic - Riffa');
    expect(loc?.city).toBe('Riffa');
  });

  it('should return undefined for invalid location id', () => {
    expect(service.getLocationById('invalid')).toBeUndefined();
  });

  it('should filter locations by specialty', () => {
    const cardioLocations = service.getLocationsForSpecialty('Cardiology');
    expect(cardioLocations.length).toBeGreaterThan(0);
    cardioLocations.forEach(loc => {
      expect(loc.specialties).toContain('Cardiology');
    });
  });

  it('should return empty array for non-existent specialty', () => {
    const result = service.getLocationsForSpecialty('NonExistent');
    expect(result).toEqual([]);
  });

  it('should have all required fields on each location', () => {
    service.locations.forEach(loc => {
      expect(loc.id).toBeTruthy();
      expect(loc.name).toBeTruthy();
      expect(loc.address).toBeTruthy();
      expect(loc.city).toBeTruthy();
      expect(loc.phone).toBeTruthy();
      expect(loc.operatingHours).toBeTruthy();
      expect(loc.specialties.length).toBeGreaterThan(0);
    });
  });
});
