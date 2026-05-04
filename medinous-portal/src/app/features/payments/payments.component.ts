import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ApiService } from '../../core/services/api.service';
import { GeographyService } from '../../core/services/geography.service';
import { I18nService } from '../../core/services/i18n.service';
import { Payment } from '../../core/models/patient.model';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatIconModule, MatButtonModule, MatChipsModule,
    MatButtonToggleModule, MatDividerModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatExpansionModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, FormsModule,
    SkeletonCardComponent, TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="payments-container" [class.rtl]="i18n.isRtl()">
      <div class="pay-top-row">
        <div>
          <h1>{{ 'pay.title' | translate }}</h1>
          <p class="subtitle">{{ 'pay.subtitle' | translate }}</p>
        </div>

        <!-- Wallet / Advance Payment Button -->
        <div class="wallet-section">
          @if (!showAdvanceForm()) {
            <button mat-flat-button class="wallet-btn" (click)="showAdvanceForm.set(true)">
              <mat-icon>account_balance_wallet</mat-icon> Advance Payment
            </button>
          } @else {
            <mat-card class="wallet-dropdown">
              <div class="wallet-header">
                <mat-icon>account_balance_wallet</mat-icon>
                <strong>Advance Payment</strong>
                <button mat-icon-button (click)="showAdvanceForm.set(false)">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              <mat-form-field appearance="outline" class="wallet-field">
                <mat-label>Amount</mat-label>
                <input matInput type="number" [ngModel]="advanceAmount()" (ngModelChange)="advanceAmount.set($event)" min="1">
                <span matPrefix>{{ currencySymbol() }}&nbsp;</span>
              </mat-form-field>
              <mat-form-field appearance="outline" class="wallet-field">
                <mat-label>Apply to</mat-label>
                <mat-select [ngModel]="advanceTarget()" (ngModelChange)="advanceTarget.set($event)">
                  <mat-option value="general">General Advance</mat-option>
                  @for (p of pendingPayments(); track p.id) {
                    <mat-option [value]="p.id">{{ p.description }} ({{ formatCurrency(p.amount) }})</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <button mat-flat-button color="primary" class="wallet-pay-btn"
                      [disabled]="!advanceAmount() || advanceAmount() <= 0"
                      (click)="submitAdvancePayment()">
                Pay {{ advanceAmount() ? formatCurrency(advanceAmount()) : '' }}
              </button>
            </mat-card>
          }
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid">
        <mat-card class="summary-card">
          <mat-icon class="summary-icon paid">check_circle</mat-icon>
          <div class="summary-value">{{ formatCurrency(totalPaid()) }}</div>
          <div class="summary-label">{{ 'pay.total_paid' | translate }}</div>
        </mat-card>
        <mat-card class="summary-card">
          <mat-icon class="summary-icon pending">hourglass_empty</mat-icon>
          <div class="summary-value">{{ formatCurrency(totalPending()) }}</div>
          <div class="summary-label">{{ 'pay.pending_amount' | translate }}</div>
        </mat-card>
        <mat-card class="summary-card">
          <mat-icon class="summary-icon month">calendar_month</mat-icon>
          <div class="summary-value">{{ formatCurrency(thisMonthTotal()) }}</div>
          <div class="summary-label">{{ 'pay.this_month' | translate }}</div>
        </mat-card>
        <mat-card class="summary-card">
          <mat-icon class="summary-icon count">receipt_long</mat-icon>
          <div class="summary-value">{{ payments().length }}</div>
          <div class="summary-label">{{ 'pay.transactions' | translate }}</div>
        </mat-card>
      </div>

      <!-- Search -->
      <div class="pay-search">
        <mat-icon class="ps-icon">search</mat-icon>
        <input class="ps-input"
               [ngModel]="searchQuery()"
               (ngModelChange)="searchQuery.set($event)"
               placeholder="Search transactions...">
        @if (searchQuery()) {
          <button mat-icon-button (click)="searchQuery.set('')"><mat-icon>close</mat-icon></button>
        }
      </div>

      <!-- Time Period Pills -->
      <div class="pay-pills">
        @for (p of timePeriods; track p.days) {
          <button class="pp" [class.active]="selectedPeriod() === p.days"
                  (click)="selectedPeriod.set(p.days)">{{ p.label }}</button>
        }
      </div>

      <!-- Tabs -->
      <mat-button-toggle-group [value]="activeFilter()" (change)="onFilterChange($event.value)" class="filter-group">
        <mat-button-toggle value="all">All</mat-button-toggle>
        <mat-button-toggle value="completed">Completed</mat-button-toggle>
        <mat-button-toggle value="pending">Pending</mat-button-toggle>
        <mat-button-toggle value="failed">Failed</mat-button-toggle>
      </mat-button-toggle-group>

      @if (!loading()) {
        <p class="pay-count">{{ activeFilter() === 'pending' ? allPendingCharges().length : filteredPayments().length }} records
          @if (selectedPeriod() < 9999) {
            <span>in last {{ getPeriodLabel() }}</span>
          }
        </p>
      }

      <!-- PENDING TAB: scrollable list of all pending charges -->
      @if (activeFilter() === 'pending') {
        <div class="pending-section">
          <!-- Pending summary -->
          <div class="pending-total-bar">
            <span>Total Outstanding</span>
            <strong>{{ formatCurrency(totalPendingAll()) }}</strong>
          </div>

          <div class="pending-scroll-list">
            @for (item of allPendingCharges(); track item.id) {
              <div class="pending-item">
                <div class="pending-item-icon" [ngClass]="'ptype-' + item.category">
                  <mat-icon>{{ getPendingIcon(item.category) }}</mat-icon>
                </div>
                <div class="pending-item-info">
                  <strong>{{ item.name }}</strong>
                  <span class="pending-item-meta">{{ item.detail }}</span>
                </div>
                <div class="pending-item-amount">
                  <strong>{{ formatCurrency(item.amount) }}</strong>
                </div>
              </div>
            }
          </div>

          <!-- Pay All button -->
          <button mat-flat-button color="primary" class="pay-all-btn">
            <mat-icon>payment</mat-icon>
            Pay All ({{ formatCurrency(totalPendingAll()) }})
          </button>
        </div>

      } @else {

        <!-- ALL / COMPLETED / FAILED: transaction list -->
        @if (loading()) {
          @for (i of [1,2,3,4]; track i) {
            <app-skeleton-card [lines]="3" />
          }
        } @else if (filteredPayments().length === 0) {
          <mat-card class="empty-card">
            <mat-icon>receipt_long</mat-icon>
            <h3>{{ 'pay.no_transactions' | translate }}</h3>
          </mat-card>
        } @else {
          @for (payment of filteredPayments(); track payment.id) {
            <mat-card class="txn-card">
              <div class="txn-row">
                <div class="payment-icon" [ngClass]="'status-bg-' + payment.status">
                  <mat-icon>{{ getMethodIcon(payment.method) }}</mat-icon>
                </div>
                <div class="txn-info">
                  <strong>{{ payment.description }}</strong>
                  <span class="txn-date">{{ payment.date | date:'mediumDate' }}</span>
                </div>
                <div class="txn-right">
                  <span class="txn-amount" [ngClass]="'amount-' + payment.status">
                    {{ formatCurrency(payment.amount) }}
                  </span>
                  <mat-chip class="status-chip" [ngClass]="'status-' + payment.status">
                    {{ payment.status }}
                  </mat-chip>
                </div>
              </div>
              @if (payment.status === 'completed') {
                <div class="txn-actions">
                  <button mat-stroked-button
                          [disabled]="generatingReceipt() === payment.id"
                          (click)="generateReceipt(payment)">
                    @if (generatingReceipt() === payment.id) {
                      <mat-spinner diameter="16"></mat-spinner>
                    } @else {
                      <mat-icon>receipt</mat-icon>
                    }
                    Receipt
                  </button>
                </div>
              }
            </mat-card>
          }
        }
      }
    </div>
  `,
  styles: [`
    .payments-container { max-width: 900px; margin: 0 auto; }
    .payments-container.rtl { direction: rtl; text-align: right; }
    h1 { font-size: 28px; font-weight: 600; color: #1a237e; margin: 0; }
    .subtitle { color: #666; margin: 4px 0 24px; }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .summary-card { padding: 20px; text-align: center; }
    .summary-icon { font-size: 32px; width: 32px; height: 32px; margin-bottom: 8px; }
    .summary-icon.paid { color: #4caf50; }
    .summary-icon.pending { color: #f57c00; }
    .summary-icon.month { color: #1976d2; }
    .summary-icon.count { color: #7b1fa2; }
    .summary-value { font-size: 24px; font-weight: 700; color: #222; }
    .summary-label { font-size: 13px; color: #888; margin-top: 4px; }

    /* Top Row */
    .pay-top-row {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px; gap: 16px;
    }

    /* Wallet Button + Dropdown */
    .wallet-section { position: relative; flex-shrink: 0; }
    .wallet-btn {
      background: #1a237e !important; color: white !important;
      font-weight: 600 !important; padding: 10px 20px !important;
      border-radius: 8px !important; font-size: 14px !important;
    }
    .wallet-dropdown {
      position: absolute; top: 0; right: 0; z-index: 10;
      width: 320px; padding: 16px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18) !important;
      border-radius: 12px !important;
    }
    .wallet-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    }
    .wallet-header mat-icon { color: #1a237e; }
    .wallet-header strong { flex: 1; font-size: 15px; color: #333; }
    .wallet-field { width: 100%; }
    .wallet-pay-btn { width: 100%; }

    /* Search */
    .pay-search {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px; background: #f0f0f0; border-radius: 28px;
      margin-bottom: 14px;
    }
    .ps-icon { color: #999; font-size: 22px; width: 22px; height: 22px; }
    .ps-input {
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 15px; font-family: inherit; color: #333;
    }
    .ps-input::placeholder { color: #bbb; }

    /* Time pills */
    .pay-pills {
      display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap;
    }
    .pp {
      padding: 6px 18px; border-radius: 22px; border: 1.5px solid #ccc;
      background: white; font-size: 13px; font-family: inherit;
      color: #555; cursor: pointer; transition: all 0.15s; font-weight: 500;
    }
    .pp:hover { border-color: #1a237e; color: #1a237e; }
    .pp.active { background: #1a237e; color: white; border-color: #1a237e; }

    /* Count */
    .pay-count { font-size: 13px; color: #aaa; margin: 0 0 12px; }
    .pay-count span { color: #777; }

    .filter-group { margin-bottom: 12px; }

    /* Pending Section */
    .pending-section { }

    .pending-total-bar {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 20px; background: #fff3e0; border-radius: 10px;
      margin-bottom: 16px;
    }
    .pending-total-bar span { font-size: 15px; color: #e65100; font-weight: 500; }
    .pending-total-bar strong { font-size: 22px; color: #e65100; }

    .pending-scroll-list {
      max-height: 420px; overflow-y: auto;
      display: flex; flex-direction: column; gap: 8px;
      padding-right: 4px; margin-bottom: 16px;
    }

    .pending-item {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 16px; background: white;
      border-radius: 10px; border: 1px solid #f0f0f0;
      transition: box-shadow 0.15s;
    }
    .pending-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

    .pending-item-icon {
      width: 38px; height: 38px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .pending-item-icon mat-icon { font-size: 20px; width: 20px; height: 20px; color: white; }
    .ptype-medication { background: #7b1fa2; }
    .ptype-lab { background: #00897b; }
    .ptype-radiology { background: #0277bd; }
    .ptype-procedure { background: #e64a19; }
    .ptype-consultation { background: #f57c00; }

    .pending-item-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .pending-item-info strong { font-size: 14px; color: #333; }
    .pending-item-meta { font-size: 12px; color: #999; }

    .pending-item-amount strong { font-size: 16px; color: #e65100; }

    .pay-all-btn {
      width: 100%; padding: 14px !important;
      font-size: 15px !important; font-weight: 600 !important;
      border-radius: 10px !important;
    }

    /* Transaction Cards (All / Completed / Failed) */
    .txn-card {
      padding: 16px; margin-bottom: 10px;
      border-radius: 10px !important;
      transition: box-shadow 0.15s;
    }
    .txn-card:hover { box-shadow: 0 2px 10px rgba(0,0,0,0.06); }

    .txn-row { display: flex; align-items: center; gap: 14px; }

    .payment-icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .payment-icon mat-icon { color: white; font-size: 20px; width: 20px; height: 20px; }
    .status-bg-completed { background: #4caf50; }
    .status-bg-pending { background: #f57c00; }
    .status-bg-failed { background: #ef5350; }
    .status-bg-refunded { background: #78909c; }

    .txn-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .txn-info strong { font-size: 14px; }
    .txn-date { font-size: 12px; color: #999; }

    .txn-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .txn-amount { font-size: 16px; font-weight: 600; }
    .amount-completed { color: #2e7d32; }
    .amount-pending { color: #f57c00; }
    .amount-failed { color: #ef5350; text-decoration: line-through; }

    .status-chip { font-size: 11px !important; min-height: 22px !important; }
    .status-completed { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-pending { background: #fff3e0 !important; color: #f57c00 !important; }
    .status-failed { background: #ffebee !important; color: #d32f2f !important; }

    .txn-actions { display: flex; justify-content: flex-end; margin-top: 10px; }

    .empty-card { padding: 40px; text-align: center; color: #888; }
    .empty-card mat-icon { font-size: 48px; width: 48px; height: 48px; }

    @media (max-width: 600px) {
      .summary-grid { grid-template-columns: repeat(2, 1fr); }
      .pending-scroll-list { max-height: 320px; }
      .wallet-dropdown { width: 280px; right: -40px; }
    }
  `]
})
export class PaymentsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly geo = inject(GeographyService);
  readonly i18n = inject(I18nService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly payments = signal<Payment[]>([]);
  readonly activeFilter = signal('all');
  readonly generatingReceipt = signal<string | null>(null);
  readonly showAdvanceForm = signal(false);
  readonly advanceAmount = signal<number>(0);
  readonly advanceTarget = signal('general');
  readonly searchQuery = signal('');
  readonly selectedPeriod = signal(30);

  readonly timePeriods = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: '3 months', days: 90 },
    { label: '6 months', days: 180 },
    { label: '1 year', days: 365 },
    { label: 'All time', days: 9999 }
  ];

  readonly pendingChargesData: { id: string; name: string; detail: string; amount: number; category: string }[] = [
    { id: 'pc-1', name: 'Metformin 500mg', detail: 'Qty: 60 tablets — Dr. Rajesh Kumar', amount: 8, category: 'medication' },
    { id: 'pc-2', name: 'Amlodipine 5mg', detail: 'Qty: 30 tablets — Dr. Rajesh Kumar', amount: 5, category: 'medication' },
    { id: 'pc-3', name: 'Vitamin D3 1000 IU', detail: 'Qty: 30 capsules — Dr. Ahmed Hassan', amount: 3, category: 'medication' },
    { id: 'pc-4', name: 'Complete Blood Count (CBC)', detail: 'Lab — 10 Apr 2026', amount: 25, category: 'lab' },
    { id: 'pc-5', name: 'HbA1c Test', detail: 'Lab — 10 Apr 2026', amount: 18, category: 'lab' },
    { id: 'pc-6', name: 'Lipid Panel', detail: 'Lab — 10 Apr 2026', amount: 22, category: 'lab' },
    { id: 'pc-7', name: 'Chest X-Ray', detail: 'Radiology — 09 Apr 2026', amount: 45, category: 'radiology' },
    { id: 'pc-8', name: 'ECG', detail: 'Cardiology procedure — 09 Apr 2026', amount: 30, category: 'procedure' },
    { id: 'pc-9', name: 'Consultation — Dr. Rajesh Kumar', detail: 'Cardiology follow-up — 15 Apr 2026', amount: 25, category: 'consultation' },
    { id: 'pc-10', name: 'Thyroid Function Test', detail: 'Lab — 12 Apr 2026', amount: 20, category: 'lab' },
    { id: 'pc-11', name: 'Ultrasound Abdomen', detail: 'Radiology — 14 Apr 2026', amount: 60, category: 'radiology' }
  ];

  readonly allPendingCharges = computed(() => this.pendingChargesData);

  readonly totalPendingAll = computed(() =>
    this.pendingChargesData.reduce((sum, c) => sum + c.amount, 0)
    + this.payments().filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
  );

  readonly pendingPayments = computed(() =>
    this.payments().filter(p => p.status === 'pending')
  );

  currencySymbol(): string {
    const config = this.geo.config();
    return new Intl.NumberFormat(config.locale, { style: 'currency', currency: config.currency })
      .formatToParts(0).find(p => p.type === 'currency')?.value ?? config.currency;
  }

  getPendingIcon(category: string): string {
    const icons: Record<string, string> = {
      medication: 'medication', lab: 'science', radiology: 'image_search',
      procedure: 'monitor_heart', consultation: 'person'
    };
    return icons[category] ?? 'receipt';
  }

  getPeriodLabel(): string {
    return this.timePeriods.find(p => p.days === this.selectedPeriod())?.label.replace('Last ', '') ?? '';
  }

  readonly filteredPayments = computed(() => {
    let list = this.payments();
    const filter = this.activeFilter();
    const days = this.selectedPeriod();
    const q = this.searchQuery().toLowerCase().trim();

    // Time filter
    if (days < 9999) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      list = list.filter(p => p.date >= cutoff.toISOString());
    }

    // Status filter
    if (filter !== 'all') {
      list = list.filter(p => p.status === filter);
    }

    // Search
    if (q) {
      list = list.filter(p =>
        p.description.toLowerCase().includes(q) ||
        (p.doctorName?.toLowerCase().includes(q) ?? false)
      );
    }

    return list;
  });

  readonly totalPaid = computed(() =>
    this.payments().filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)
  );

  readonly totalPending = computed(() =>
    this.payments().filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
  );

  readonly thisMonthTotal = computed(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return this.payments()
      .filter(p => p.date >= monthStart && p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
  });

  ngOnInit(): void {
    this.api.getPayments().subscribe(payments => {
      this.payments.set(payments);
      this.loading.set(false);
    });
  }

  onFilterChange(filter: string): void {
    this.activeFilter.set(filter);
  }

  formatCurrency(amount: number): string {
    const config = this.geo.config();
    return new Intl.NumberFormat(config.locale, {
      style: 'currency', currency: config.currency, minimumFractionDigits: 0
    }).format(amount);
  }

  getMethodIcon(method: string): string {
    const icons: Record<string, string> = {
      card: 'credit_card', upi: 'phone_android', insurance: 'health_and_safety',
      cash: 'payments', bank_transfer: 'account_balance'
    };
    return icons[method] ?? 'payment';
  }

  formatMethod(method: string): string {
    const labels: Record<string, string> = {
      card: 'Credit/Debit Card', upi: 'UPI', insurance: 'Insurance',
      cash: 'Cash', bank_transfer: 'Bank Transfer'
    };
    return labels[method] ?? method;
  }

  generateReceipt(payment: Payment): void {
    this.generatingReceipt.set(payment.id);
    this.api.generateReceipt(payment.id).subscribe({
      next: () => {
        this.generatingReceipt.set(null);
        this.snackBar.open(this.i18n.t('pay.receipt_ready'), this.i18n.t('common.close'), { duration: 4000 });
      },
      error: () => {
        this.generatingReceipt.set(null);
        this.snackBar.open(this.i18n.t('pay.receipt_failed'), this.i18n.t('common.close'), {
          duration: 5000, panelClass: 'error-snackbar'
        });
      }
    });
  }

  submitAdvancePayment(): void {
    const amount = this.advanceAmount();
    if (!amount || amount <= 0) return;
    const newPayment: Payment = {
      id: 'pay-adv-' + Date.now(),
      date: new Date().toISOString(),
      amount,
      currency: this.geo.config().currency,
      status: 'completed',
      method: 'card',
      description: this.advanceTarget() === 'general'
        ? 'Advance Payment'
        : 'Advance - ' + (this.payments().find(p => p.id === this.advanceTarget())?.description ?? ''),
      invoiceNumber: 'INV-ADV-' + Date.now().toString().slice(-6),
      breakdown: [{ label: 'Advance Payment', amount }]
    };
    this.payments.update(list => [newPayment, ...list]);
    this.showAdvanceForm.set(false);
    this.advanceAmount.set(0);
    this.advanceTarget.set('general');
    this.snackBar.open(`Advance payment of ${this.formatCurrency(amount)} recorded`, this.i18n.t('common.close'), { duration: 4000 });
  }

  downloadClaim(paymentId: string): void {
    this.api.downloadInsuranceClaim(paymentId).subscribe({
      next: () => {
        this.snackBar.open('Claim form downloaded', this.i18n.t('common.close'), { duration: 3000 });
      }
    });
  }
}
