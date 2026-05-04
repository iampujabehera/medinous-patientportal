import { TestBed } from '@angular/core/testing';
import { TranslatePipe } from './translate.pipe';
import { I18nService } from '../../core/services/i18n.service';

describe('TranslatePipe', () => {
  let pipe: TranslatePipe;
  let i18n: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TranslatePipe]
    });
    pipe = TestBed.inject(TranslatePipe);
    i18n = TestBed.inject(I18nService);
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it('should translate English keys', () => {
    expect(pipe.transform('nav.dashboard')).toBe('Dashboard');
    expect(pipe.transform('nav.payments')).toBe('Payments');
  });

  it('should translate Arabic keys when language is Arabic', () => {
    i18n.setLanguage('ar');
    expect(pipe.transform('nav.dashboard')).toBe('لوحة المعلومات');
  });

  it('should return key for unknown translations', () => {
    expect(pipe.transform('unknown.key')).toBe('unknown.key');
  });
});
