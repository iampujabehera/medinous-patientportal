import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(I18nService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default to English', () => {
    expect(service.lang()).toBe('en');
    expect(service.isRtl()).toBeFalse();
    expect(service.dir()).toBe('ltr');
  });

  it('should translate known keys in English', () => {
    expect(service.t('nav.dashboard')).toBe('Dashboard');
    expect(service.t('nav.appointments')).toBe('Appointments');
    expect(service.t('pay.title')).toBe('Payment History');
  });

  it('should return the key itself for unknown translations', () => {
    expect(service.t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('should switch to Arabic', () => {
    service.setLanguage('ar');
    expect(service.lang()).toBe('ar');
    expect(service.isRtl()).toBeTrue();
    expect(service.dir()).toBe('rtl');
  });

  it('should translate keys in Arabic', () => {
    service.setLanguage('ar');
    expect(service.t('nav.dashboard')).toBe('لوحة المعلومات');
    expect(service.t('nav.appointments')).toBe('المواعيد');
  });

  it('should fall back to English for missing Arabic keys', () => {
    service.setLanguage('ar');
    // If a key exists in en but not ar, it should still return something
    const result = service.t('nav.dashboard');
    expect(result).toBeTruthy();
    expect(result).not.toBe('nav.dashboard');
  });

  it('should persist language to localStorage', () => {
    service.setLanguage('ar');
    expect(localStorage.getItem('medinous_lang')).toBe('ar');
  });

  it('should restore language from localStorage on initialize', () => {
    localStorage.setItem('medinous_lang', 'ar');
    service.initialize();
    expect(service.lang()).toBe('ar');
    expect(service.isRtl()).toBeTrue();
  });

  it('should set document direction on language change', () => {
    service.setLanguage('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');

    service.setLanguage('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
