import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { DashboardComponent } from './dashboard.component';
import { ApiService } from '../../core/services/api.service';
import { of } from 'rxjs';
import { DashboardSummary } from '../../core/models/patient.model';

const MOCK_SUMMARY: DashboardSummary = {
  patient: {
    id: 'p1', firstName: 'Ahmed', lastName: 'Ali',
    dateOfBirth: '1990-01-01', gender: 'male',
    email: 'ahmed@test.com', phone: '+973-1234'
  },
  upcomingAppointments: [
    {
      id: 'a1', doctorName: 'Dr. Kumar', specialty: 'Cardiology',
      date: '2026-04-20', time: '10:00 AM', status: 'scheduled',
      location: 'Main Clinic', type: 'in_person'
    }
  ],
  activeMedications: [
    {
      id: 'm1', name: 'Metformin', dosage: '500mg', frequency: 'Twice daily',
      startDate: '2026-01-01', prescribedBy: 'Dr. Kumar',
      refillsRemaining: 3, taken: [true, true, false, true, true, true, false]
    }
  ],
  recentVitals: [
    { type: 'blood_pressure', value: '120/80', unit: 'mmHg', timestamp: '2026-04-15', status: 'normal' },
    { type: 'heart_rate', value: '72', unit: 'bpm', timestamp: '2026-04-15', status: 'normal' }
  ],
  alerts: [
    { id: 'al1', type: 'warning', title: 'Lab Due', message: 'HbA1c test overdue', timestamp: '2026-04-15' }
  ]
};

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let apiService: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    const apiSpy = jasmine.createSpyObj('ApiService', ['getDashboard', 'getConsultations']);
    apiSpy.getDashboard.and.returnValue(of(MOCK_SUMMARY));
    apiSpy.getConsultations.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [
        DashboardComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
        RouterTestingModule
      ],
      providers: [
        { provide: ApiService, useValue: apiSpy }
      ]
    }).compileComponents();

    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start in loading state', () => {
    expect(component.loading()).toBeTrue();
  });

  it('should load dashboard data on init', () => {
    fixture.detectChanges(); // triggers ngOnInit
    expect(apiService.getDashboard).toHaveBeenCalled();
    expect(component.loading()).toBeFalse();
    expect(component.data()).toEqual(MOCK_SUMMARY);
  });

  it('should display patient name after loading', () => {
    fixture.detectChanges();
    expect(component.data()?.patient.firstName).toBe('Ahmed');
  });

  it('should return correct time of day', () => {
    const result = component.timeOfDay();
    expect(['morning', 'afternoon', 'evening']).toContain(result);
  });

  it('should return correct vital icons', () => {
    expect(component.getVitalIcon({ type: 'blood_pressure', value: '', unit: '', timestamp: '', status: 'normal' })).toBe('speed');
    expect(component.getVitalIcon({ type: 'heart_rate', value: '', unit: '', timestamp: '', status: 'normal' })).toBe('favorite');
    expect(component.getVitalIcon({ type: 'temperature', value: '', unit: '', timestamp: '', status: 'normal' })).toBe('thermostat');
    expect(component.getVitalIcon({ type: 'oxygen', value: '', unit: '', timestamp: '', status: 'normal' })).toBe('air');
    expect(component.getVitalIcon({ type: 'glucose', value: '', unit: '', timestamp: '', status: 'normal' })).toBe('water_drop');
  });

  it('should return correct vital labels', () => {
    expect(component.getVitalLabel({ type: 'blood_pressure', value: '', unit: '', timestamp: '', status: 'normal' })).toBe('Blood Pressure');
    expect(component.getVitalLabel({ type: 'heart_rate', value: '', unit: '', timestamp: '', status: 'normal' })).toBe('Heart Rate');
    expect(component.getVitalLabel({ type: 'oxygen', value: '', unit: '', timestamp: '', status: 'normal' })).toBe('SpO₂');
  });

  it('should return correct alert icons', () => {
    expect(component.getAlertIcon({ id: '1', type: 'urgent', title: '', message: '', timestamp: '' })).toBe('error');
    expect(component.getAlertIcon({ id: '1', type: 'warning', title: '', message: '', timestamp: '' })).toBe('warning');
    expect(component.getAlertIcon({ id: '1', type: 'info', title: '', message: '', timestamp: '' })).toBe('info');
  });

  it('should calculate adherence correctly', () => {
    expect(component.getAdherence([true, true, true, true, true])).toBe(100);
    expect(component.getAdherence([true, false, true, false])).toBe(50);
    expect(component.getAdherence([false, false, false])).toBe(0);
    expect(component.getAdherence([])).toBe(0);
  });

  it('should dismiss an alert', () => {
    fixture.detectChanges();
    expect(component.data()!.alerts.length).toBe(1);

    component.dismissAlert('al1');
    expect(component.data()!.alerts.length).toBe(0);
  });

  it('should submit feedback and set rating', () => {
    component.submitFeedback(4);
    expect(component.feedbackRating()).toBe(4);
  });

  it('should auto-dismiss feedback after rating', fakeAsync(() => {
    component.submitFeedback(5);
    expect(component.feedbackDismissed()).toBeFalse();
    tick(2000);
    expect(component.feedbackDismissed()).toBeTrue();
  }));

  it('should not fail dismissAlert when data is null', () => {
    component.dismissAlert('any-id');
    expect(component.data()).toBeNull();
  });
});
