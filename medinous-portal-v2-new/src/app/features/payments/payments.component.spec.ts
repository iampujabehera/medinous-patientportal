import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PaymentsComponent } from './payments.component';
import { ApiService } from '../../core/services/api.service';
import { of, throwError } from 'rxjs';
import { Payment } from '../../core/models/patient.model';

const MOCK_PAYMENTS: Payment[] = [
  {
    id: 'pay-1', date: new Date().toISOString(), amount: 25,
    currency: 'USD', status: 'completed', method: 'card',
    description: 'Consultation - Dr. Kumar', invoiceNumber: 'INV-001',
    breakdown: [{ label: 'Consultation', amount: 25 }]
  },
  {
    id: 'pay-2', date: new Date().toISOString(), amount: 18,
    currency: 'USD', status: 'pending', method: 'insurance',
    description: 'Lab - HbA1c', invoiceNumber: 'INV-002',
    breakdown: [{ label: 'Lab Test', amount: 18 }]
  },
  {
    id: 'pay-3', date: new Date().toISOString(), amount: 45,
    currency: 'USD', status: 'failed', method: 'card',
    description: 'Radiology - X-Ray', invoiceNumber: 'INV-003',
    breakdown: [{ label: 'X-Ray', amount: 45 }]
  }
];

describe('PaymentsComponent', () => {
  let component: PaymentsComponent;
  let fixture: ComponentFixture<PaymentsComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ApiService', [
      'getPayments', 'generateReceipt', 'downloadInsuranceClaim'
    ]);
    apiSpy.getPayments.and.returnValue(of(MOCK_PAYMENTS));
    apiSpy.generateReceipt.and.returnValue(of({ url: '/receipts/pay-1.pdf' }));
    apiSpy.downloadInsuranceClaim.and.returnValue(of({ url: '/claims/pay-2.pdf' }));

    await TestBed.configureTestingModule({
      imports: [
        PaymentsComponent,
        HttpClientTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: ApiService, useValue: apiSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load payments on init', () => {
    fixture.detectChanges();
    expect(apiSpy.getPayments).toHaveBeenCalled();
    expect(component.payments().length).toBe(3);
    expect(component.loading()).toBeFalse();
  });

  it('should calculate total paid correctly', () => {
    fixture.detectChanges();
    expect(component.totalPaid()).toBe(25); // only completed
  });

  it('should calculate total pending correctly', () => {
    fixture.detectChanges();
    expect(component.totalPending()).toBe(18); // only pending
  });

  it('should calculate this month total', () => {
    fixture.detectChanges();
    // All mock payments are today, so completed ones count
    expect(component.thisMonthTotal()).toBe(25);
  });

  it('should filter by status', () => {
    fixture.detectChanges();
    component.onFilterChange('completed');
    expect(component.filteredPayments().every(p => p.status === 'completed')).toBeTrue();

    component.onFilterChange('pending');
    expect(component.filteredPayments().every(p => p.status === 'pending')).toBeTrue();

    component.onFilterChange('all');
    expect(component.filteredPayments().length).toBe(3);
  });

  it('should filter by search query', () => {
    fixture.detectChanges();
    component.searchQuery.set('kumar');
    expect(component.filteredPayments().length).toBe(1);
    expect(component.filteredPayments()[0].description).toContain('Kumar');
  });

  it('should return empty results for non-matching search', () => {
    fixture.detectChanges();
    component.searchQuery.set('nonexistent');
    expect(component.filteredPayments().length).toBe(0);
  });

  it('should filter by time period', () => {
    fixture.detectChanges();
    component.selectedPeriod.set(7); // last 7 days
    // All mock payments are today, so all should pass
    expect(component.filteredPayments().length).toBe(3);
  });

  it('should return correct method icons', () => {
    expect(component.getMethodIcon('card')).toBe('credit_card');
    expect(component.getMethodIcon('upi')).toBe('phone_android');
    expect(component.getMethodIcon('insurance')).toBe('health_and_safety');
    expect(component.getMethodIcon('cash')).toBe('payments');
    expect(component.getMethodIcon('unknown')).toBe('payment');
  });

  it('should format method labels', () => {
    expect(component.formatMethod('card')).toBe('Credit/Debit Card');
    expect(component.formatMethod('insurance')).toBe('Insurance');
    expect(component.formatMethod('unknown')).toBe('unknown');
  });

  it('should return correct pending icons', () => {
    expect(component.getPendingIcon('medication')).toBe('medication');
    expect(component.getPendingIcon('lab')).toBe('science');
    expect(component.getPendingIcon('radiology')).toBe('image_search');
    expect(component.getPendingIcon('procedure')).toBe('monitor_heart');
    expect(component.getPendingIcon('unknown')).toBe('receipt');
  });

  it('should have pending charges data', () => {
    expect(component.allPendingCharges().length).toBeGreaterThan(0);
    component.allPendingCharges().forEach(charge => {
      expect(charge.id).toBeTruthy();
      expect(charge.name).toBeTruthy();
      expect(charge.amount).toBeGreaterThan(0);
    });
  });

  it('should calculate total pending including charges and payments', () => {
    fixture.detectChanges();
    const chargesTotal = component.allPendingCharges().reduce((s, c) => s + c.amount, 0);
    const pendingPayments = MOCK_PAYMENTS.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
    expect(component.totalPendingAll()).toBe(chargesTotal + pendingPayments);
  });

  it('should generate receipt for completed payment', () => {
    fixture.detectChanges();
    component.generateReceipt(MOCK_PAYMENTS[0]);
    expect(apiSpy.generateReceipt).toHaveBeenCalledWith('pay-1');
    expect(component.generatingReceipt()).toBeNull(); // resets after completion
  });

  it('should handle receipt generation error', () => {
    apiSpy.generateReceipt.and.returnValue(throwError(() => new Error('Failed')));
    fixture.detectChanges();
    component.generateReceipt(MOCK_PAYMENTS[0]);
    expect(component.generatingReceipt()).toBeNull();
  });

  it('should toggle advance payment form', () => {
    expect(component.showAdvanceForm()).toBeFalse();
    component.showAdvanceForm.set(true);
    expect(component.showAdvanceForm()).toBeTrue();
  });

  it('should submit advance payment', () => {
    fixture.detectChanges();
    const initialCount = component.payments().length;

    component.advanceAmount.set(50);
    component.advanceTarget.set('general');
    component.submitAdvancePayment();

    expect(component.payments().length).toBe(initialCount + 1);
    expect(component.payments()[0].description).toContain('Deposit Added');
    expect(component.payments()[0].amount).toBe(50);
    expect(component.payments()[0].status).toBe('completed');
    expect(component.showAdvanceForm()).toBeFalse();
    expect(component.advanceAmount()).toBe(0);
  });

  it('should not submit advance payment with zero amount', () => {
    fixture.detectChanges();
    const initialCount = component.payments().length;
    component.advanceAmount.set(0);
    component.submitAdvancePayment();
    expect(component.payments().length).toBe(initialCount);
  });

  it('should not submit advance payment with negative amount', () => {
    fixture.detectChanges();
    const initialCount = component.payments().length;
    component.advanceAmount.set(-10);
    component.submitAdvancePayment();
    expect(component.payments().length).toBe(initialCount);
  });

  it('should format currency', () => {
    const result = component.formatCurrency(100);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should get period label', () => {
    component.selectedPeriod.set(30);
    expect(component.getPeriodLabel()).toBe('30 days');

    component.selectedPeriod.set(7);
    expect(component.getPeriodLabel()).toBe('7 days');
  });
});
