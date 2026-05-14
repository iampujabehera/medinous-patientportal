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
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { ApiService } from '../../core/services/api.service';
import { GeographyService } from '../../core/services/geography.service';
import { I18nService } from '../../core/services/i18n.service';
import { Payment } from '../../core/models/patient.model';

type DueStatus = 'overdue' | 'due-today' | 'due-soon' | 'upcoming';

interface PendingCharge {
  id: string;
  name: string;
  detail: string;
  amount: number;
  category: string;
  dueDate: string;
  dueStatus: DueStatus;
}

interface AdvanceEvent {
  id: string;
  type: 'added' | 'deducted';
  amount: number;
  appliedTo: string;
  category: 'advance' | 'consultation' | 'admission' | 'lab' | 'radiology' | 'medication' | 'procedure';
  date: string;
  balanceAfter: number;
}

interface HistoryRow {
  key: string;
  name: string;
  doctor: string;
  date: string;
  amount: number;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  source: 'pending' | 'payment';
  // pending fields
  category?: string;
  dueStatus?: DueStatus;
  rawPending?: PendingCharge;
  // payment fields
  method?: string;
  rawPayment?: Payment;
}

type SheetMode = 'balance' | 'add' | null;

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatIconModule, MatButtonModule, MatChipsModule,
    MatButtonToggleModule, MatDividerModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatExpansionModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatTooltipModule, FormsModule,
    SkeletonCardComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="payments-container" [class.rtl]="i18n.isRtl()">

      <!-- ============================================ -->
      <!-- HEADER                                       -->
      <!-- ============================================ -->
      <header class="page-header">
        <div class="page-header-left">
          <h1>Payment History</h1>
          <p class="subtitle">Track payments, advance balance, and receipts</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button class="header-btn primary" (click)="openAddAdvanceSheet()">
            <mat-icon>add</mat-icon>
            <span>Advance Payment</span>
          </button>
          <button mat-stroked-button class="header-btn" (click)="openBalanceSheet()">
            <mat-icon>account_balance_wallet</mat-icon>
            <span>Advance Balance</span>
            <span class="hb-amount">{{ formatCurrency(advanceBalance()) }}</span>
          </button>
        </div>
      </header>

      <!-- ============================================ -->
      <!-- PAYMENT HISTORY (primary content)            -->
      <!-- ============================================ -->
      <section class="section history-section">

        <!-- Search + Time Filter -->
        <div class="history-controls">
          <div class="pay-search">
            <mat-icon class="ps-icon">search</mat-icon>
            <input class="ps-input"
                   [ngModel]="searchQuery()"
                   (ngModelChange)="searchQuery.set($event)"
                   placeholder="Search transactions, doctor, or service...">
            @if (searchQuery()) {
              <button mat-icon-button class="ps-clear" (click)="searchQuery.set('')">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>

          <mat-form-field appearance="outline" class="time-select" subscriptSizing="dynamic">
            <mat-select [ngModel]="selectedPeriod()" (ngModelChange)="selectedPeriod.set($event)">
              @for (p of timePeriods; track p.days) {
                <mat-option [value]="p.days">{{ p.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Status Tabs -->
        <mat-button-toggle-group [value]="activeFilter()" (change)="onFilterChange($event.value)" class="filter-group">
          <mat-button-toggle value="all">All</mat-button-toggle>
          <mat-button-toggle value="completed">Paid</mat-button-toggle>
          <mat-button-toggle value="pending">
            Pending
            @if (pendingCount() > 0) {
              <span class="tab-count">{{ pendingCount() }}</span>
            }
          </mat-button-toggle>
          <mat-button-toggle value="refunded">Refunds</mat-button-toggle>
        </mat-button-toggle-group>

        @if (!loading()) {
          <p class="pay-count">{{ filteredHistory().length }} records
            @if (selectedPeriod() < 9999) {
              <span>in last {{ getPeriodLabel() }}</span>
            }
          </p>
        }

        @if (loading()) {
          @for (i of [1,2,3]; track i) {
            <app-skeleton-card [lines]="3" />
          }
        } @else if (filteredHistory().length === 0) {
          <div class="empty-state mini">
            <mat-icon>receipt_long</mat-icon>
            <p>No transactions to show.</p>
          </div>
        } @else {
          @for (row of filteredHistory(); track row.key) {
            <mat-card class="txn-card">
              <div class="txn-row">
                <div class="payment-icon" [ngClass]="iconBgClass(row)">
                  <mat-icon>{{ rowIcon(row) }}</mat-icon>
                </div>
                <div class="txn-info">
                  <strong>{{ row.name }}</strong>
                  <span class="txn-meta">
                    @if (row.doctor) { <span>{{ row.doctor }}</span> }
                    @if (row.method) { <span> · {{ formatMethod(row.method) }}</span> }
                    <span> · {{ row.date | date:'mediumDate' }}</span>
                  </span>
                </div>
                <div class="txn-right">
                  <span class="txn-amount" [ngClass]="'amount-' + row.status">
                    {{ formatCurrency(row.amount) }}
                  </span>
                  <span class="status-tag" [class]="statusTagClass(row)">
                    {{ statusLabel(row) }}
                  </span>
                </div>
              </div>
              <div class="txn-actions">
                @if (row.source === 'pending') {
                  <button mat-flat-button color="primary" class="txn-action-btn"
                          (click)="payPendingRow(row)">
                    <mat-icon>payments</mat-icon> Pay
                  </button>
                  <button mat-stroked-button class="txn-action-btn">
                    <mat-icon>visibility</mat-icon> Details
                  </button>
                } @else if (row.status === 'completed' || row.status === 'refunded') {
                  <button mat-stroked-button class="txn-action-btn"
                          [disabled]="generatingReceipt() === row.rawPayment?.id"
                          (click)="generateReceipt(row.rawPayment!)">
                    @if (generatingReceipt() === row.rawPayment?.id) {
                      <mat-spinner diameter="14"></mat-spinner>
                    } @else {
                      <mat-icon>download</mat-icon>
                    }
                    Receipt
                  </button>
                  <button mat-stroked-button class="txn-action-btn">
                    <mat-icon>visibility</mat-icon> Details
                  </button>
                }
              </div>
            </mat-card>
          }
        }
      </section>
    </div>

    <!-- ============================================ -->
    <!-- SIDE SHEET BACKDROP                          -->
    <!-- ============================================ -->
    @if (sheetOpen()) {
      <div class="sheet-backdrop" (click)="closeSheet()"></div>
    }

    <!-- ============================================ -->
    <!-- ADVANCE BALANCE SIDE SHEET                   -->
    <!-- ============================================ -->
    <aside class="side-sheet" [class.open]="sheetOpen() === 'balance'" aria-label="Advance Balance">
      <header class="ss-head">
        <div class="ss-head-title">
          <mat-icon>account_balance_wallet</mat-icon>
          <h3>Advance Balance</h3>
        </div>
        <button mat-icon-button class="ss-close" (click)="closeSheet()">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <div class="ss-body">
        @if (!hasAdvance()) {
          <div class="ss-empty">
            <div class="ss-empty-illo"><mat-icon>account_balance_wallet</mat-icon></div>
            <h4>No advance balance yet</h4>
            <p>
              Add an advance payment and consultations, scans and admissions get paid automatically —
              no need to settle at the counter.
            </p>
            <ul class="ss-why">
              <li><mat-icon>bolt</mat-icon> Skip the cashier on every visit</li>
              <li><mat-icon>verified</mat-icon> Linked securely to your patient ID</li>
              <li><mat-icon>currency_exchange</mat-icon> Refundable anytime</li>
            </ul>
            <button mat-flat-button color="primary" class="ss-cta" (click)="switchToAddSheet()">
              <mat-icon>add</mat-icon> Add Advance Balance
            </button>
          </div>
        } @else {
          <!-- Current balance -->
          <section class="ss-section ss-balance-block">
            <div class="ss-amount-label">Available</div>
            <div class="ss-amount">{{ formatCurrency(advanceBalance()) }}</div>
            <div class="ss-amount-split">
              <div>
                <span>Deposited</span>
                <strong>{{ formatCurrency(totalDeposited()) }}</strong>
              </div>
              <div>
                <span>Used</span>
                <strong>{{ formatCurrency(totalDeducted()) }}</strong>
              </div>
            </div>
            <button mat-flat-button color="primary" class="ss-add-more" (click)="switchToAddSheet()">
              <mat-icon>add</mat-icon> Add Advance Balance
            </button>
          </section>

          <!-- Applied To -->
          <section class="ss-section">
            <div class="ss-section-label">Applied to</div>
            <div class="applied-pills">
              @for (target of appliedTargets(); track target) {
                <span class="applied-pill">
                  <mat-icon>check_circle</mat-icon>
                  {{ target }}
                </span>
              }
            </div>
          </section>

          <!-- Recent Deductions -->
          @if (recentDeductions().length > 0) {
            <section class="ss-section">
              <div class="ss-section-label">Recent deductions</div>
              <div class="recent-deductions">
                @for (d of recentDeductions(); track d.id) {
                  <div class="rd-row">
                    <span class="rd-name">{{ d.appliedTo }}</span>
                    <span class="rd-amount">−{{ formatCurrency(d.amount) }}</span>
                  </div>
                }
              </div>
            </section>
          }

          <!-- Activity Timeline -->
          <section class="ss-section">
            <div class="ss-section-label">Advance Payment Activity</div>
            <ol class="timeline">
              @for (e of advanceEventsDesc(); track e.id) {
                <li class="tl-item" [class]="'tl-' + e.category + ' tl-type-' + e.type">
                  <div class="tl-icon">
                    <mat-icon>{{ activityIcon(e) }}</mat-icon>
                  </div>
                  <div class="tl-body">
                    <div class="tl-line1">
                      <strong class="tl-amount" [class.add]="e.type === 'added'" [class.deduct]="e.type === 'deducted'">
                        {{ e.type === 'added' ? '+' : '−' }} {{ formatCurrency(e.amount) }}
                      </strong>
                      <span class="tl-target">{{ e.appliedTo }}</span>
                    </div>
                    <div class="tl-line2">
                      {{ e.date | date:'mediumDate' }} · Balance: <strong>{{ formatCurrency(e.balanceAfter) }}</strong>
                    </div>
                  </div>
                </li>
              }
            </ol>
          </section>

          <!-- Demo toggle for showcase -->
          <button mat-button class="ss-demo-toggle" (click)="toggleAdvanceDemo()">
            Show first-time state
          </button>
        }
      </div>
    </aside>

    <!-- ============================================ -->
    <!-- ADD ADVANCE BALANCE SIDE SHEET               -->
    <!-- ============================================ -->
    <aside class="side-sheet" [class.open]="sheetOpen() === 'add'" aria-label="Add Advance Balance">
      <header class="ss-head">
        <div class="ss-head-title">
          <mat-icon>add_card</mat-icon>
          <div>
            <h3>Add Advance Balance</h3>
            <p class="ss-head-sub">Securely held and used automatically for selected hospital services.</p>
          </div>
        </div>
        <button mat-icon-button class="ss-close" (click)="closeSheet()">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <div class="ss-body">
        <label class="field-label">Amount</label>
        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <input matInput type="number" min="1"
                 [ngModel]="advanceAmount()" (ngModelChange)="advanceAmount.set($event)"
                 placeholder="0">
          <span matPrefix>{{ currencySymbol() }}&nbsp;</span>
        </mat-form-field>

        <div class="quick-amounts">
          @for (amt of quickAmounts; track amt) {
            <button class="qa-btn" [class.active]="advanceAmount() === amt"
                    (click)="advanceAmount.set(amt)">
              {{ formatCurrency(amt) }}
            </button>
          }
        </div>

        <label class="field-label">Apply advance to</label>
        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-select [ngModel]="advanceTarget()" (ngModelChange)="advanceTarget.set($event)">
            <mat-option value="general">General Hospital Wallet</mat-option>
            <mat-option value="consultation">Upcoming Consultation</mat-option>
            <mat-option value="admission">Admission</mat-option>
            <mat-option value="surgery">Surgery</mat-option>
            <mat-option value="lab">Diagnostics</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="how-it-works">
          <div class="hiw-title">
            <mat-icon>tips_and_updates</mat-icon>
            How this works
          </div>
          <ul>
            <li>Advance balance is securely linked to your patient account.</li>
            <li>Applicable hospital charges deduct automatically.</li>
            <li>Remaining balance stays available for future use.</li>
            <li>Unused balance can be refunded on request.</li>
          </ul>
        </div>
      </div>

      <footer class="ss-footer">
        <button mat-stroked-button (click)="closeSheet()">Cancel</button>
        <button mat-flat-button color="primary"
                [disabled]="!advanceAmount() || advanceAmount() <= 0"
                (click)="submitAdvancePayment()">
          Add {{ advanceAmount() ? formatCurrency(advanceAmount()) : 'Advance Balance' }}
        </button>
      </footer>
    </aside>
  `,
  styles: [`
    :host { display: block; }
    .payments-container { max-width: 920px; margin: 0 auto; padding-bottom: 40px; }
    .payments-container.rtl { direction: rtl; text-align: right; }

    /* ===== Header ===== */
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; margin-bottom: 16px; flex-wrap: wrap;
    }
    .page-header-left { flex: 1; min-width: 0; }
    h1 { font-size: 24px; font-weight: 600; color: #1a237e; margin: 0; }
    .subtitle { color: #666; margin: 4px 0 0; font-size: 13px; }

    .header-actions {
      display: flex; gap: 8px; flex-wrap: wrap;
    }
    .header-btn {
      display: inline-flex !important; align-items: center; gap: 6px;
      height: 38px !important; border-radius: 10px !important;
      font-size: 13px !important; font-weight: 500 !important;
      padding: 0 14px !important;
      color: #1a237e !important; border-color: #c5cae9 !important;
    }
    .header-btn:hover { background: #eef0fb !important; }
    .header-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .header-btn.primary {
      background: #1a237e !important; color: white !important;
      border-color: #1a237e !important;
    }
    .header-btn.primary:hover { background: #283593 !important; }
    .hb-amount {
      margin-left: 6px; font-weight: 600;
      padding: 1px 8px; border-radius: 8px;
      background: #eef0fb; color: #1a237e;
      font-size: 12px;
    }

    /* ===== Section ===== */
    .section { margin-bottom: 22px; }
    h2 { font-size: 16px; font-weight: 600; color: #222; margin: 0 0 12px; }

    /* ===== Payment History controls ===== */
    .history-controls {
      display: flex; gap: 10px; margin-bottom: 12px; align-items: center;
    }
    .pay-search {
      flex: 1;
      display: flex; align-items: center; gap: 8px;
      padding: 6px 14px; background: #f3f4f6; border-radius: 24px;
      min-width: 0;
    }
    .ps-icon { color: #999; font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .ps-input {
      flex: 1; min-width: 0;
      border: none; outline: none; background: transparent;
      font-size: 14px; font-family: inherit; color: #333; padding: 8px 0;
    }
    .ps-input::placeholder { color: #aaa; }
    .ps-clear { width: 32px !important; height: 32px !important; line-height: 32px !important; flex-shrink: 0; }

    .time-select {
      width: 160px; flex-shrink: 0;
    }
    .time-select ::ng-deep .mat-mdc-text-field-wrapper { background: white; }
    .time-select ::ng-deep .mat-mdc-form-field-infix { min-height: 40px; padding-top: 10px !important; padding-bottom: 10px !important; }

    /* ===== Status Tabs ===== */
    .filter-group { margin-bottom: 8px; }
    .tab-count {
      margin-left: 6px;
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 20px; height: 18px; padding: 0 6px;
      background: #fff3e0; color: #e65100;
      border-radius: 9px; font-size: 11px; font-weight: 700;
    }

    .pay-count { font-size: 12px; color: #999; margin: 6px 0 10px; }
    .pay-count span { color: #777; }

    /* ===== Transaction Cards ===== */
    .txn-card {
      padding: 14px 16px; margin-bottom: 8px;
      border-radius: 12px !important;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
      transition: box-shadow 0.15s;
    }
    .txn-card:hover { box-shadow: 0 2px 10px rgba(0,0,0,0.06) !important; }

    .txn-row { display: flex; align-items: center; gap: 14px; }
    .payment-icon {
      width: 40px; height: 40px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .payment-icon mat-icon { color: white; font-size: 20px; width: 20px; height: 20px; }
    .status-bg-completed { background: #43a047; }
    .status-bg-pending { background: #90a4ae; }
    .status-bg-failed { background: #ef5350; }
    .status-bg-refunded { background: #78909c; }
    .ptype-medication { background: #7b1fa2; }
    .ptype-lab { background: #00897b; }
    .ptype-radiology { background: #0277bd; }
    .ptype-procedure { background: #e64a19; }
    .ptype-consultation { background: #f57c00; }
    .ptype-admission { background: #5e35b1; }

    .txn-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .txn-info strong { font-size: 14px; color: #222; }
    .txn-meta { font-size: 12px; color: #888; }

    .txn-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
    .txn-amount { font-size: 15px; font-weight: 700; }
    .amount-completed { color: #2e7d32; }
    .amount-pending { color: #455a64; }
    .amount-failed { color: #ef5350; text-decoration: line-through; }
    .amount-refunded { color: #546e7a; }

    .status-tag {
      display: inline-block;
      font-size: 11px; font-weight: 600;
      padding: 2px 8px; border-radius: 10px;
      text-transform: capitalize; letter-spacing: .02em;
    }
    .status-tag.status-completed { background: #e8f5e9; color: #2e7d32; }
    .status-tag.status-refunded { background: #eceff1; color: #546e7a; }
    .status-tag.status-failed { background: #ffebee; color: #c62828; }
    .status-tag.status-pending { background: #eceff1; color: #546e7a; }
    .status-tag.status-due-soon { background: #fff3e0; color: #e65100; }
    .status-tag.status-overdue { background: #fdecea; color: #c62828; }

    .txn-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
    .txn-action-btn { font-size: 12px !important; padding: 0 12px !important; height: 30px !important; line-height: 30px !important; }
    .txn-action-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .empty-state.mini {
      background: white; border: 1px dashed #d0d7de; border-radius: 12px;
      padding: 24px; text-align: center; color: #607d8b;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .empty-state.mini mat-icon { font-size: 28px; width: 28px; height: 28px; color: #b0bec5; }
    .empty-state.mini p { margin: 0; font-size: 13px; }

    /* ===== Side Sheet ===== */
    .sheet-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.42);
      z-index: 1000; animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .side-sheet {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: 460px; max-width: 100vw;
      background: white;
      box-shadow: -10px 0 30px rgba(0,0,0,0.18);
      z-index: 1001;
      transform: translateX(100%);
      transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
      display: flex; flex-direction: column;
      visibility: hidden;
    }
    .side-sheet.open { transform: translateX(0); visibility: visible; }

    .ss-head {
      padding: 16px 20px; border-bottom: 1px solid #eceff1;
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
      flex-shrink: 0;
    }
    .ss-head-title { display: flex; align-items: flex-start; gap: 10px; flex: 1; }
    .ss-head-title > mat-icon { color: #1a237e; font-size: 24px; width: 24px; height: 24px; margin-top: 2px; }
    .ss-head h3 { margin: 0; font-size: 16px; font-weight: 600; color: #222; }
    .ss-head-sub { margin: 4px 0 0; font-size: 12px; color: #777; line-height: 1.45; }
    .ss-close { flex-shrink: 0; }

    .ss-body { padding: 18px 20px; overflow-y: auto; flex: 1; }

    .ss-section { margin-bottom: 20px; }
    .ss-section:last-of-type { margin-bottom: 0; }
    .ss-section-label {
      font-size: 11px; text-transform: uppercase; letter-spacing: .06em;
      color: #607d8b; margin-bottom: 10px; font-weight: 600;
    }

    .ss-balance-block {
      background: linear-gradient(135deg, #1a237e 0%, #283593 60%, #3949ab 100%);
      color: white; padding: 18px; border-radius: 14px;
      margin-bottom: 18px;
    }
    .ss-amount-label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; opacity: .9; }
    .ss-amount { font-size: 30px; font-weight: 700; margin-top: 4px; }
    .ss-amount-split {
      display: flex; gap: 24px; margin-top: 14px;
      padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.15);
    }
    .ss-amount-split > div { display: flex; flex-direction: column; gap: 2px; }
    .ss-amount-split span { font-size: 11px; opacity: .85; text-transform: uppercase; letter-spacing: .04em; }
    .ss-amount-split strong { font-size: 15px; font-weight: 600; }

    .ss-add-more {
      margin-top: 14px; width: 100%;
      background: rgba(255,255,255,0.16) !important;
      color: white !important;
      border: 1px solid rgba(255,255,255,0.25) !important;
      border-radius: 8px !important; height: 38px !important;
      font-weight: 600 !important;
    }
    .ss-add-more:hover { background: rgba(255,255,255,0.24) !important; }
    .ss-add-more mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .applied-pills { display: flex; flex-wrap: wrap; gap: 6px; }
    .applied-pill {
      display: inline-flex; align-items: center; gap: 4px;
      background: #eef0fb; color: #1a237e;
      padding: 4px 10px; border-radius: 14px;
      font-size: 12px; font-weight: 500;
    }
    .applied-pill mat-icon { font-size: 13px; width: 13px; height: 13px; }

    .recent-deductions { display: flex; flex-direction: column; gap: 8px; }
    .rd-row {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 13px; padding: 8px 12px;
      background: #fafbfd; border-radius: 8px;
    }
    .rd-name { color: #455a64; }
    .rd-amount { font-weight: 600; color: #c62828; }

    /* Timeline inside side sheet */
    .timeline { list-style: none; margin: 0; padding: 0; position: relative; }
    .timeline::before {
      content: ''; position: absolute; top: 12px; bottom: 12px; left: 17px;
      width: 2px; background: #eceff1;
    }
    .tl-item {
      display: grid; grid-template-columns: 36px 1fr;
      gap: 12px; align-items: flex-start;
      padding: 8px 0; position: relative;
    }
    .tl-icon {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: #eceff1; position: relative; z-index: 1;
      box-shadow: 0 0 0 4px white;
    }
    .tl-icon mat-icon { font-size: 18px; width: 18px; height: 18px; color: white; }
    .tl-type-added .tl-icon { background: #2e7d32; }
    .tl-consultation .tl-icon { background: #1565c0; }
    .tl-admission .tl-icon { background: #ef6c00; }
    .tl-lab .tl-icon { background: #00897b; }
    .tl-radiology .tl-icon { background: #0277bd; }
    .tl-medication .tl-icon { background: #7b1fa2; }
    .tl-procedure .tl-icon { background: #e64a19; }

    .tl-body { min-width: 0; padding-top: 6px; }
    .tl-line1 { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; }
    .tl-amount { font-size: 14px; font-weight: 700; }
    .tl-amount.add { color: #2e7d32; }
    .tl-amount.deduct { color: #c62828; }
    .tl-target { font-size: 13px; color: #333; font-weight: 500; }
    .tl-line2 { font-size: 11px; color: #888; margin-top: 3px; }
    .tl-line2 strong { color: #333; font-weight: 600; }

    /* Side sheet zero state */
    .ss-empty { text-align: center; padding: 20px 4px; }
    .ss-empty-illo {
      width: 64px; height: 64px; border-radius: 50%;
      background: #eef0fb; color: #1a237e;
      display: inline-flex; align-items: center; justify-content: center;
      margin-bottom: 14px;
    }
    .ss-empty-illo mat-icon { font-size: 30px; width: 30px; height: 30px; }
    .ss-empty h4 { margin: 0 0 6px; font-size: 17px; color: #1a237e; font-weight: 600; }
    .ss-empty p { margin: 0 auto 18px; font-size: 13px; color: #555; line-height: 1.55; max-width: 320px; }

    .ss-why { list-style: none; padding: 0; margin: 0 0 20px; text-align: left; }
    .ss-why li {
      display: flex; align-items: center; gap: 10px;
      font-size: 13px; color: #455a64; padding: 8px 12px;
      background: #fafbfd; border-radius: 10px; margin-bottom: 6px;
    }
    .ss-why li mat-icon { color: #1a237e; font-size: 18px; width: 18px; height: 18px; }
    .ss-cta {
      width: 100%; height: 42px !important;
      border-radius: 10px !important; font-weight: 600 !important;
    }
    .ss-cta mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .ss-demo-toggle {
      display: block; margin: 16px auto 0;
      font-size: 12px !important; color: #607d8b !important;
    }

    /* Add Advance Sheet form */
    .field-label {
      display: block; font-size: 12px; font-weight: 600; color: #555;
      text-transform: uppercase; letter-spacing: .04em;
      margin: 8px 0 6px;
    }
    .full { width: 100%; }
    .quick-amounts { display: flex; gap: 6px; flex-wrap: wrap; margin: 4px 0 14px; }
    .qa-btn {
      padding: 6px 14px; border-radius: 18px; border: 1.5px solid #e0e0e0;
      background: white; color: #555; font-size: 13px; font-family: inherit;
      cursor: pointer; transition: all .15s; font-weight: 500;
    }
    .qa-btn:hover { border-color: #1a237e; color: #1a237e; }
    .qa-btn.active { background: #1a237e; color: white; border-color: #1a237e; }

    .how-it-works {
      background: #f6f8fc; border-radius: 12px; padding: 14px 16px;
      margin-top: 12px;
    }
    .hiw-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 600; color: #1a237e; margin-bottom: 8px;
    }
    .hiw-title mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .how-it-works ul { margin: 0; padding-left: 18px; }
    .how-it-works li { font-size: 12px; color: #455a64; line-height: 1.55; margin-bottom: 4px; }
    .how-it-works li:last-child { margin-bottom: 0; }

    .ss-footer {
      padding: 14px 20px; display: flex; justify-content: flex-end; gap: 10px;
      border-top: 1px solid #eceff1; background: #fafafa;
      flex-shrink: 0;
    }

    /* ===== Mobile responsiveness ===== */
    @media (max-width: 720px) {
      h1 { font-size: 20px; }
      .header-actions { width: 100%; }
      .header-btn { flex: 1; justify-content: center; }
      .hb-amount { display: none; }
      .history-controls { flex-direction: column; align-items: stretch; }
      .time-select { width: 100%; }
      .txn-actions { flex-wrap: wrap; }

      /* Mobile bottom sheet */
      .side-sheet {
        top: auto; right: 0; left: 0; bottom: 0;
        width: 100%; height: 92vh;
        border-radius: 18px 18px 0 0;
        transform: translateY(100%);
      }
      .side-sheet.open { transform: translateY(0); }
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
  readonly sheetOpen = signal<SheetMode>(null);

  readonly quickAmounts = [200, 500, 1000, 2000];

  readonly timePeriods = [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: '3 Months', days: 90 },
    { label: '6 Months', days: 180 },
    { label: '1 Year', days: 365 },
    { label: 'All Time', days: 9999 }
  ];

  // -------- Pending charges (sample) --------
  readonly pendingChargesData = signal<PendingCharge[]>([
    { id: 'pc-1', name: 'Cardiology Consultation', detail: 'Dr. Rajesh Kumar',
      amount: 25, category: 'consultation',
      dueDate: '2026-05-10T09:00:00', dueStatus: 'overdue' },
    { id: 'pc-2', name: 'MRI Brain Scan', detail: 'Radiology — Dr. Ahmed Hassan',
      amount: 120, category: 'radiology',
      dueDate: '2026-05-13T11:00:00', dueStatus: 'due-today' },
    { id: 'pc-3', name: 'Admission Deposit', detail: 'General Surgery — pre-admission',
      amount: 800, category: 'admission',
      dueDate: '2026-05-16T08:00:00', dueStatus: 'due-soon' },
    { id: 'pc-4', name: 'Lab Tests (CBC + Lipid Panel)', detail: 'Diagnostic Lab',
      amount: 47, category: 'lab',
      dueDate: '2026-05-20T10:00:00', dueStatus: 'upcoming' },
    { id: 'pc-5', name: 'Pharmacy — Metformin & Amlodipine', detail: 'Dr. Rajesh Kumar prescription',
      amount: 38, category: 'medication',
      dueDate: '2026-05-09T14:00:00', dueStatus: 'overdue' }
  ]);

  readonly allPendingCharges = computed(() => this.pendingChargesData());

  readonly pendingCount = computed(() =>
    this.pendingChargesData().length + this.payments().filter(p => p.status === 'pending').length
  );

  readonly totalPendingAll = computed(() =>
    this.pendingChargesData().reduce((sum, c) => sum + c.amount, 0)
    + this.payments().filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
  );

  readonly pendingPayments = computed(() =>
    this.payments().filter(p => p.status === 'pending')
  );

  // -------- Advance balance & activity (sample) --------
  readonly advancePaymentEvents = signal<AdvanceEvent[]>([
    { id: 'ae-1', type: 'added', amount: 1500, appliedTo: 'General Hospital Wallet',
      category: 'advance', date: '2026-04-20T10:00:00', balanceAfter: 1500 },
    { id: 'ae-2', type: 'deducted', amount: 250, appliedTo: 'Cardiology Consultation',
      category: 'consultation', date: '2026-04-22T09:30:00', balanceAfter: 1250 },
    { id: 'ae-3', type: 'deducted', amount: 450, appliedTo: 'Admission Deposit — Day Surgery',
      category: 'admission', date: '2026-04-28T14:00:00', balanceAfter: 800 },
    { id: 'ae-4', type: 'added', amount: 500, appliedTo: 'Upcoming Admission',
      category: 'advance', date: '2026-05-05T11:15:00', balanceAfter: 1300 },
    { id: 'ae-5', type: 'deducted', amount: 300, appliedTo: 'MRI Brain Scan',
      category: 'radiology', date: '2026-05-07T13:00:00', balanceAfter: 1000 },
    { id: 'ae-6', type: 'deducted', amount: 150, appliedTo: 'Dermatology Consultation',
      category: 'consultation', date: '2026-05-09T16:20:00', balanceAfter: 850 },
    { id: 'ae-7', type: 'deducted', amount: 100, appliedTo: 'Blood Test — HbA1c',
      category: 'lab', date: '2026-05-11T08:45:00', balanceAfter: 750 }
  ]);

  /** Backwards-compat alias retained for any existing references. */
  readonly depositEvents = this.advancePaymentEvents;

  readonly hasAdvance = computed(() => this.advancePaymentEvents().length > 0);

  readonly advanceBalance = computed(() => {
    const events = this.advancePaymentEvents();
    return events.length ? events[events.length - 1].balanceAfter : 0;
  });

  /** Backwards-compat alias. */
  readonly depositBalance = this.advanceBalance;

  readonly totalDeposited = computed(() =>
    this.advancePaymentEvents().filter(e => e.type === 'added').reduce((s, e) => s + e.amount, 0)
  );

  readonly totalDeducted = computed(() =>
    this.advancePaymentEvents().filter(e => e.type === 'deducted').reduce((s, e) => s + e.amount, 0)
  );

  readonly recentDeductions = computed(() =>
    this.advancePaymentEvents()
      .filter(e => e.type === 'deducted')
      .slice(-3)
      .reverse()
  );

  readonly advanceEventsDesc = computed(() => this.advancePaymentEvents().slice().reverse());

  readonly appliedTargets = computed(() =>
    ['Cardiology Consultation', 'Upcoming Admission', 'Lab & Diagnostics']
  );

  // -------- Misc --------
  currencySymbol(): string {
    const config = this.geo.config();
    return new Intl.NumberFormat(config.locale, { style: 'currency', currency: config.currency })
      .formatToParts(0).find(p => p.type === 'currency')?.value ?? config.currency;
  }

  getPendingIcon(category: string): string {
    const icons: Record<string, string> = {
      medication: 'medication', lab: 'science', radiology: 'image_search',
      procedure: 'monitor_heart', consultation: 'person', admission: 'local_hospital'
    };
    return icons[category] ?? 'receipt';
  }

  dueLabel(status: DueStatus): string {
    return ({
      'overdue': 'Overdue',
      'due-today': 'Due today',
      'due-soon': 'Due soon',
      'upcoming': 'Upcoming'
    })[status];
  }

  activityIcon(e: AdvanceEvent): string {
    if (e.type === 'added') return 'add';
    const icons: Record<string, string> = {
      consultation: 'person', admission: 'local_hospital',
      lab: 'science', radiology: 'image_search',
      medication: 'medication', procedure: 'monitor_heart'
    };
    return icons[e.category] ?? 'remove';
  }

  getPeriodLabel(): string {
    return this.timePeriods.find(p => p.days === this.selectedPeriod())?.label.replace('Last ', '') ?? '';
  }

  // -------- Merged history rows (pending + payments) --------
  readonly historyRows = computed<HistoryRow[]>(() => {
    const pending: HistoryRow[] = this.pendingChargesData().map(p => ({
      key: 'pending:' + p.id,
      name: p.name,
      doctor: p.detail,
      date: p.dueDate,
      amount: p.amount,
      status: 'pending',
      source: 'pending',
      category: p.category,
      dueStatus: p.dueStatus,
      rawPending: p
    }));
    const paid: HistoryRow[] = this.payments().map(p => ({
      key: 'pay:' + p.id,
      name: p.description,
      doctor: p.doctorName ?? '',
      date: p.date,
      amount: p.amount,
      status: p.status,
      source: 'payment',
      method: p.method,
      rawPayment: p
    }));
    return [...pending, ...paid].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  readonly filteredHistory = computed<HistoryRow[]>(() => {
    let list = this.historyRows();
    const filter = this.activeFilter();
    const days = this.selectedPeriod();
    const q = this.searchQuery().toLowerCase().trim();

    // Time filter: applies to all rows
    if (days < 9999) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffIso = cutoff.toISOString();
      list = list.filter(r => r.source === 'pending' ? true : r.date >= cutoffIso);
    }

    if (filter !== 'all') {
      list = list.filter(r => r.status === filter);
    }

    if (q) {
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.doctor?.toLowerCase().includes(q) ?? false)
      );
    }
    return list;
  });

  readonly filteredPayments = computed(() => {
    let list = this.payments();
    const filter = this.activeFilter();
    const days = this.selectedPeriod();
    const q = this.searchQuery().toLowerCase().trim();

    if (days < 9999) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      list = list.filter(p => p.date >= cutoff.toISOString());
    }
    if (filter !== 'all') {
      list = list.filter(p => p.status === filter);
    }
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

  // -------- Lifecycle --------
  ngOnInit(): void {
    this.api.getPayments().subscribe(payments => {
      this.payments.set(payments);
      this.loading.set(false);
    });
  }

  // -------- Row helpers (template-friendly) --------
  iconBgClass(row: HistoryRow): string {
    if (row.source === 'pending') return 'ptype-' + (row.category ?? 'consultation');
    return 'status-bg-' + row.status;
  }

  rowIcon(row: HistoryRow): string {
    if (row.source === 'pending') return this.getPendingIcon(row.category ?? '');
    return this.getMethodIcon(row.method ?? '');
  }

  statusLabel(row: HistoryRow): string {
    if (row.source === 'pending') {
      return this.dueLabel(row.dueStatus ?? 'upcoming');
    }
    return row.status;
  }

  statusTagClass(row: HistoryRow): string {
    if (row.source === 'pending') {
      if (row.dueStatus === 'overdue') return 'status-overdue';
      if (row.dueStatus === 'due-today' || row.dueStatus === 'due-soon') return 'status-due-soon';
      return 'status-pending';
    }
    return 'status-' + row.status;
  }

  // -------- Filter/tab handlers --------
  onFilterChange(filter: string): void {
    this.activeFilter.set(filter);
  }

  // -------- Currency / methods --------
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
      card: 'Card', upi: 'UPI', insurance: 'Insurance',
      cash: 'Cash', bank_transfer: 'Bank Transfer'
    };
    return labels[method] ?? method;
  }

  // -------- Receipt --------
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

  // -------- Side sheet handlers --------
  openBalanceSheet(): void { this.sheetOpen.set('balance'); }
  openAddAdvanceSheet(): void {
    this.advanceAmount.set(0);
    this.advanceTarget.set('general');
    this.showAdvanceForm.set(true);
    this.sheetOpen.set('add');
  }
  switchToAddSheet(): void { this.openAddAdvanceSheet(); }
  closeSheet(): void {
    this.sheetOpen.set(null);
    this.showAdvanceForm.set(false);
  }

  /** Demo toggle so stakeholders can flip between empty and populated wallet states. */
  toggleAdvanceDemo(): void {
    if (this.hasAdvance()) {
      this.advancePaymentEvents.set([]);
    } else {
      this.advancePaymentEvents.set(this.sampleAdvanceEvents());
    }
  }

  private sampleAdvanceEvents(): AdvanceEvent[] {
    return [
      { id: 'ae-1', type: 'added', amount: 1500, appliedTo: 'General Hospital Wallet',
        category: 'advance', date: '2026-04-20T10:00:00', balanceAfter: 1500 },
      { id: 'ae-2', type: 'deducted', amount: 250, appliedTo: 'Cardiology Consultation',
        category: 'consultation', date: '2026-04-22T09:30:00', balanceAfter: 1250 },
      { id: 'ae-3', type: 'deducted', amount: 450, appliedTo: 'Admission Deposit — Day Surgery',
        category: 'admission', date: '2026-04-28T14:00:00', balanceAfter: 800 },
      { id: 'ae-4', type: 'added', amount: 500, appliedTo: 'Upcoming Admission',
        category: 'advance', date: '2026-05-05T11:15:00', balanceAfter: 1300 },
      { id: 'ae-5', type: 'deducted', amount: 300, appliedTo: 'MRI Brain Scan',
        category: 'radiology', date: '2026-05-07T13:00:00', balanceAfter: 1000 },
      { id: 'ae-6', type: 'deducted', amount: 150, appliedTo: 'Dermatology Consultation',
        category: 'consultation', date: '2026-05-09T16:20:00', balanceAfter: 850 },
      { id: 'ae-7', type: 'deducted', amount: 100, appliedTo: 'Blood Test — HbA1c',
        category: 'lab', date: '2026-05-11T08:45:00', balanceAfter: 750 }
    ];
  }

  // -------- Submit / pay actions --------
  submitAdvancePayment(): void {
    const amount = this.advanceAmount();
    if (!amount || amount <= 0) return;

    const targetLabels: Record<string, string> = {
      general: 'General Hospital Wallet',
      consultation: 'Upcoming Consultation',
      admission: 'Admission',
      surgery: 'Surgery',
      lab: 'Diagnostics'
    };
    const targetLabel = targetLabels[this.advanceTarget()] ?? 'General Hospital Wallet';

    const newBalance = this.advanceBalance() + amount;
    const newEvent: AdvanceEvent = {
      id: 'ae-' + Date.now(),
      type: 'added',
      amount,
      appliedTo: targetLabel,
      category: 'advance',
      date: new Date().toISOString(),
      balanceAfter: newBalance
    };
    this.advancePaymentEvents.update(list => [...list, newEvent]);

    const newPayment: Payment = {
      id: 'pay-adv-' + Date.now(),
      date: new Date().toISOString(),
      amount,
      currency: this.geo.config().currency,
      status: 'completed',
      method: 'card',
      description: 'Advance Payment Added — ' + targetLabel,
      invoiceNumber: 'ADV-' + Date.now().toString().slice(-6),
      breakdown: [{ label: 'Advance Balance Top-up', amount }]
    };
    this.payments.update(list => [newPayment, ...list]);

    this.showAdvanceForm.set(false);
    this.advanceAmount.set(0);
    this.advanceTarget.set('general');
    this.sheetOpen.set('balance');
    this.snackBar.open(
      `${this.formatCurrency(amount)} added to advance balance`,
      this.i18n.t('common.close'),
      { duration: 4000 }
    );
  }

  payPendingRow(row: HistoryRow): void {
    if (row.source !== 'pending' || !row.rawPending) return;
    const item = row.rawPending;
    const balance = this.advanceBalance();
    if (balance >= item.amount) {
      const newBalance = balance - item.amount;
      this.advancePaymentEvents.update(list => [...list, {
        id: 'ae-' + Date.now(),
        type: 'deducted',
        amount: item.amount,
        appliedTo: item.name,
        category: this.mapCategory(item.category),
        date: new Date().toISOString(),
        balanceAfter: newBalance
      }]);
      this.pendingChargesData.update(list => list.filter(c => c.id !== item.id));
      this.snackBar.open(
        `${this.formatCurrency(item.amount)} paid from your advance balance`,
        this.i18n.t('common.close'), { duration: 4000 }
      );
    } else {
      this.pendingChargesData.update(list => list.filter(c => c.id !== item.id));
      this.snackBar.open(
        `Paid ${this.formatCurrency(item.amount)} for ${item.name}`,
        this.i18n.t('common.close'), { duration: 4000 }
      );
    }
  }

  private mapCategory(c: string): AdvanceEvent['category'] {
    const valid: AdvanceEvent['category'][] = ['consultation', 'admission', 'lab', 'radiology', 'medication', 'procedure'];
    return (valid as string[]).includes(c) ? (c as AdvanceEvent['category']) : 'consultation';
  }

  downloadClaim(paymentId: string): void {
    this.api.downloadInsuranceClaim(paymentId).subscribe({
      next: () => {
        this.snackBar.open('Claim form downloaded', this.i18n.t('common.close'), { duration: 3000 });
      }
    });
  }
}
