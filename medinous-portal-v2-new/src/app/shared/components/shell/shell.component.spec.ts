import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { ShellComponent } from './shell.component';
import { LocationService } from '../../../core/services/location.service';
import { I18nService } from '../../../core/services/i18n.service';
import { GeographyService } from '../../../core/services/geography.service';

describe('ShellComponent', () => {
  let component: ShellComponent;
  let fixture: ComponentFixture<ShellComponent>;
  let locationService: LocationService;
  let i18nService: I18nService;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [
        ShellComponent,
        NoopAnimationsModule,
        RouterTestingModule
      ]
    }).compileComponents();

    locationService = TestBed.inject(LocationService);
    i18nService = TestBed.inject(I18nService);
    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with landing page visible (no location selected)', () => {
    expect(component.locationService.isLocationSelected()).toBeFalse();
    expect(component.showLocationPicker()).toBeFalse();
    expect(component.showLogin()).toBeFalse();
  });

  it('should show location picker when triggered', () => {
    component.showLocationPicker.set(true);
    expect(component.showLocationPicker()).toBeTrue();
  });

  it('should show login screen after location selection', () => {
    component.onLocationSelected('loc-001');
    expect(component.pendingLocationId()).toBe('loc-001');
    expect(component.showLogin()).toBeTrue();
  });

  it('should get location name by id', () => {
    expect(component.getLocationName('loc-001')).toBe('Bahrain Specialist Hospital - Juffair');
    expect(component.getLocationName('invalid')).toBe('');
  });

  it('should toggle sidenav', () => {
    expect(component.sidenavOpen()).toBeTrue();
    component.toggleSidenav();
    expect(component.sidenavOpen()).toBeFalse();
    component.toggleSidenav();
    expect(component.sidenavOpen()).toBeTrue();
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword()).toBeFalse();
    component.togglePassword();
    expect(component.showPassword()).toBeTrue();
    component.togglePassword();
    expect(component.showPassword()).toBeFalse();
  });

  it('should toggle language between en and ar', () => {
    expect(i18nService.lang()).toBe('en');
    component.toggleLanguage();
    expect(i18nService.lang()).toBe('ar');
    component.toggleLanguage();
    expect(i18nService.lang()).toBe('en');
  });

  it('should have hospital services data', () => {
    expect(component.hospitalServices.length).toBeGreaterThan(0);
    component.hospitalServices.forEach(svc => {
      expect(svc.name).toBeTruthy();
      expect(svc.icon).toBeTruthy();
      expect(svc.color).toBeTruthy();
    });
  });

  it('should have preview doctors data', () => {
    expect(component.previewDoctors.length).toBeGreaterThan(0);
    component.previewDoctors.forEach(doc => {
      expect(doc.name).toBeTruthy();
      expect(doc.dept).toBeTruthy();
    });
  });

  it('should sign in with valid credentials', () => {
    component.onLocationSelected('loc-001');
    component.loginCpr.set('12345678');
    component.loginPassword.set('123');
    component.termsAccepted.set(true);

    component.signIn();

    expect(locationService.isLocationSelected()).toBeTrue();
    expect(locationService.selectedLocation()?.id).toBe('loc-001');
  });

  it('should sign in with any non-empty credentials', () => {
    component.onLocationSelected('loc-002');
    component.loginCpr.set('anyuser');
    component.loginPassword.set('anypass');

    component.signIn();

    expect(locationService.isLocationSelected()).toBeTrue();
  });

  it('should not sign in with empty credentials', () => {
    component.onLocationSelected('loc-001');
    component.loginCpr.set('');
    component.loginPassword.set('');

    component.signIn();

    expect(locationService.isLocationSelected()).toBeFalse();
  });

  it('should login as guest and navigate to guest-booking', () => {
    component.onLocationSelected('loc-001');
    component.loginAsGuest();
    expect(locationService.isLocationSelected()).toBeTrue();
  });

  it('should have correct login initial state', () => {
    expect(component.loginCpr()).toBe('');
    expect(component.loginPassword()).toBe('');
    expect(component.showPassword()).toBeFalse();
    expect(component.termsAccepted()).toBeFalse();
  });
});
