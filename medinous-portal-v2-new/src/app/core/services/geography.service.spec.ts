import { TestBed } from '@angular/core/testing';
import { GeographyService } from './geography.service';
import { GEOGRAPHY_CONFIGS } from '../models/geography.model';

describe('GeographyService', () => {
  let service: GeographyService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeographyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default to Bahrain (BH) geography', () => {
    expect(service.config().code).toBe('BH');
    expect(service.config().currency).toBe('USD');
  });

  it('should switch geography correctly', () => {
    service.setGeography('IN');
    expect(service.config().code).toBe('IN');
    expect(service.config().currency).toBe('INR');
    expect(service.config().locale).toBe('en-IN');
  });

  it('should persist geography to localStorage', () => {
    service.setGeography('US');
    expect(localStorage.getItem('medinous_geo')).toBe('US');
  });

  it('should restore geography from localStorage on initialize', () => {
    localStorage.setItem('medinous_geo', 'GB');
    service.initialize();
    expect(service.config().code).toBe('GB');
    expect(service.config().currency).toBe('GBP');
  });

  it('should ignore invalid geography codes', () => {
    service.setGeography('INVALID');
    expect(service.config().code).toBe('BH'); // stays at default
  });

  it('should list all available regions', () => {
    expect(service.availableRegions.length).toBe(Object.keys(GEOGRAPHY_CONFIGS).length);
  });

  it('should check feature flags correctly', () => {
    // BH has all features enabled
    expect(service.isFeatureEnabled('telehealth')).toBeTrue();
    expect(service.isFeatureEnabled('guestBooking')).toBeTrue();
    expect(service.isFeatureEnabled('insuranceBilling')).toBeTrue();

    // India has insuranceBilling disabled
    service.setGeography('IN');
    expect(service.isFeatureEnabled('insuranceBilling')).toBeFalse();
  });

  it('should format dates using the current locale', () => {
    const testDate = new Date(2026, 3, 15); // April 15, 2026
    const formatted = service.formatDate(testDate);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('should format time using the current locale and format', () => {
    const testDate = new Date(2026, 3, 15, 14, 30);
    const formatted = service.formatTime(testDate);
    expect(formatted).toBeTruthy();
  });

  it('should accept string dates in formatDate', () => {
    const formatted = service.formatDate('2026-04-15');
    expect(formatted).toBeTruthy();
  });

  it('should support bilingual regions', () => {
    expect(service.config().languages).toContain('en');
    expect(service.config().languages).toContain('ar');

    service.setGeography('US');
    expect(service.config().languages).toEqual(['en']);
  });
});
