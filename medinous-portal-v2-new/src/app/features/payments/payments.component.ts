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
import { RouterLink } from '@angular/router';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
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

interface DepositEvent {
  id: string;
  type: 'added' | 'deducted';
  amount: number;
  appliedTo: string;
  category: 'deposit' | 'consultation' | 'admission' | 'lab' | 'radiology' | 'medication' | 'procedure';
  date: string;
  balanceAfter: number;
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatIconModule, MatButtonModule, MatChipsModule,
    MatButtonToggleModule, MatDividerModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatExpansionModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatTooltipModule, FormsModule, RouterLink,
    SkeletonCardComponent, TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="payments-container" [class.rtl]="i18n.isRtl()">

      <!-- Header -->
      <header class="page-header">
        <div class="page-header-left">
          <h1>{{ 'pay.title' | translate }}</h1>
          <p class="subtitle">Track dues, manage your deposit balance and view transactions</p>
        </div>
        <button mat-flat-button class="header-deposit-btn" (click)="openDepositModal()">
          <mat-icon>account_balance_wallet</mat-icon>
          @if (hasDeposits()) {
            <span class="hdb-label">Deposit · {{ formatCurrency(depositBalance()) }}</span>
            <span class="hdb-add">Add</span>
          } @else {
            <span class="hdb-label">Add Deposit</span>
          }
        </button>
      </header>

      <!-- ============================================ -->
      <!-- 1. PENDING PAYMENTS — same weight as others  -->
      <!-- ============================================ -->
      <section class="section">
        <div class="section-head">
          <div class="section-title">
            <h2>Pending Payments</h2>
            @if (allPendingCharges().length > 0) {
              <span class="count-pill neutral">{{ allPendingCharges().length }}</span>
            }
          </div>
          @if (allPendingCharges().length > 0) {
            <span class="section-aside">Total {{ formatCurrency(totalPendingAll()) }}</span>
          }
        </div>

        @if (allPendingCharges().length === 0) {
          <div class="empty-state friendly">
            <div class="empty-illo">
              <mat-icon>task_alt</mat-icon>
            </div>
            <h3>You're all caught up</h3>
            <p>No pending payments right now. We'll let you know when something is due.</p>
            <button mat-stroked-button color="primary" routerLink="/appointments">
              <mat-icon>event</mat-icon> Book Appointment
            </button>
          </div>
        } @else {
          <div class="pending-list">
            @for (item of allPendingCharges(); track item.id) {
              <mat-card class="pending-card">
                <div class="pending-row">
                  <div class="pc-icon" [ngClass]="'ptype-' + item.category">
                    <mat-icon>{{ getPendingIcon(item.category) }}</mat-icon>
                  </div>
                  <div class="pc-body">
                    <div class="pc-top">
                      <strong class="pc-name">{{ item.name }}</strong>
                      <span class="due-chip" [class]="'due-chip-' + item.dueStatus">
                        {{ dueLabel(item.dueStatus) }}
                      </span>
                    </div>
                    <div class="pc-meta">{{ item.detail }} · {{ item.dueDate | date:'mediumDate' }}</div>
                  </div>
                  <div class="pc-right">
                    <strong class="pc-amount">{{ formatCurrency(item.amount) }}</strong>
                    <button mat-stroked-button color="primary" class="pay-btn"
                            (click)="payCharge(item)">Pay Now</button>
                  </div>
                </div>
              </mat-card>
            }
          </div>

          <button mat-stroked-button class="pay-all-link" (click)="payAll()">
            Pay all pending — {{ formatCurrency(totalPendingAll()) }}
          </button>
        }
      </section>

      <!-- ============================================ -->
      <!-- 2. DEPOSIT BALANCE / WALLET                 -->
      <!-- ============================================ -->
      <section class="section">
        <div class="section-head">
          <div class="section-title">
            <h2>Deposit Balance</h2>
          </div>
          <button mat-button class="demo-toggle" (click)="toggleDepositDemo()">
            {{ hasDeposits() ? 'Show first-time state' : 'Show with sample data' }}
          </button>
        </div>

        @if (!hasDeposits()) {
          <!-- ZERO STATE -->
          <div class="deposit-empty">
            <div class="de-illo">
              <mat-icon>account_balance_wallet</mat-icon>
            </div>
            <h3>No deposit balance yet</h3>
            <p class="de-sub">
              Add a deposit and consultations, scans, admissions and lab work get paid automatically —
              no card swipes at the counter, no waiting in queues.
            </p>

            <div class="de-why">
              <div class="de-why-item">
                <mat-icon>bolt</mat-icon>
                <div>
                  <strong>Skip the cashier</strong>
                  <span>One top-up, used across every visit</span>
                </div>
              </div>
              <div class="de-why-item">
                <mat-icon>verified</mat-icon>
                <div>
                  <strong>Held securely</strong>
                  <span>Linked to your patient ID, never charged twice</span>
                </div>
              </div>
              <div class="de-why-item">
                <mat-icon>currency_exchange</mat-icon>
                <div>
                  <strong>Refundable anytime</strong>
                  <span>Unused balance can be returned on request</span>
                </div>
              </div>
            </div>

            <button mat-flat-button color="primary" class="de-cta" (click)="openDepositModal()">
              <mat-icon>add</mat-icon> Add your first deposit
            </button>
          </div>
        } @else {
          <!-- POPULATED STATE -->
          <div class="deposit-card">
            <div class="dc-header">
              <div class="dc-label">
                <mat-icon>account_balance_wallet</mat-icon>
                <span>Available balance</span>
              </div>
            </div>

            <div class="dc-amount">{{ formatCurrency(depositBalance()) }}</div>
            <div class="dc-summary">
              Deposited {{ formatCurrency(totalDeposited()) }} · Used {{ formatCurrency(totalDeducted()) }}
            </div>

            <div class="dc-divider"></div>

            <div class="dc-section">
              <div class="dc-section-label">Applied to</div>
              <div class="applied-pills">
                @for (target of appliedTargets(); track target) {
                  <span class="applied-pill">
                    <mat-icon>check_circle</mat-icon>
                    {{ target }}
                  </span>
                }
              </div>
            </div>

            @if (recentDeductions().length > 0) {
              <div class="dc-section">
                <div class="dc-section-label">Recent deductions</div>
                <div class="recent-deductions">
                  @for (d of recentDeductions(); track d.id) {
                    <div class="rd-row">
                      <span class="rd-name">{{ d.appliedTo }}</span>
                      <span class="rd-amount">−{{ formatCurrency(d.amount) }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            <div class="dc-explainer">
              <mat-icon>info</mat-icon>
              <span>Held by the hospital and automatically deducted for consultations, scans, admissions and lab work.</span>
            </div>
          </div>

          <!-- DEPOSIT ACTIVITY as accordion -->
          <mat-accordion class="activity-accordion">
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon class="acc-icon">history</mat-icon>
                  Deposit Activity
                </mat-panel-title>
                <mat-panel-description>
                  {{ depositEvents().length }} transactions · Balance {{ formatCurrency(depositBalance()) }}
                </mat-panel-description>
              </mat-expansion-panel-header>

              <ol class="timeline">
                @for (e of depositEvents().slice().reverse(); track e.id) {
                  <li class="tl-item" [class]="'tl-' + e.category + ' tl-type-' + e.type">
                    <div class="tl-icon">
                      <mat-icon>{{ activityIcon(e) }}</mat-icon>
                    </div>
                    <div class="tl-body">
                      <div class="tl-line1">
                        <strong class="tl-amount" [class.add]="e.type === 'added'" [class.deduct]="e.type === 'deducted'">
                          {{ e.type === 'added' ? '+' : '−' }} {{ formatCurrency(e.amount) }}
                        </strong>
                        <span class="tl-action">{{ e.type === 'added' ? 'Added to' : 'Applied to' }}</span>
                        <span class="tl-target">{{ e.appliedTo }}</span>
                      </div>
                      <div class="tl-line2">
                        {{ e.date | date:'mediumDate' }} · Balance after: <strong>{{ formatCurrency(e.balanceAfter) }}</strong>
                      </div>
                    </div>
                  </li>
                }
              </ol>
            </mat-expansion-panel>
          </mat-accordion>
        }
      </section>

      <!-- ============================================ -->
      <!-- 4. PAYMENT HISTORY                          -->
      <!-- ============================================ -->
      <section class="section history-section">
        <div class="section-head">
          <div class="section-title">
            <h2>Payment History</h2>
          </div>
        </div>

        <!-- Search + filters -->
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

          <div class="pay-pills">
            @for (p of timePeriods; track p.days) {
              <button class="pp" [class.active]="selectedPeriod() === p.days"
                      (click)="selectedPeriod.set(p.days)">{{ p.label }}</button>
            }
          </div>
        </div>

        <mat-button-toggle-group [value]="activeFilter()" (change)="onFilterChange($event.value)" class="filter-group">
          <mat-button-toggle value="all">All</mat-button-toggle>
          <mat-button-toggle value="completed">Paid</mat-button-toggle>
          <mat-button-toggle value="pending">Pending</mat-button-toggle>
          <mat-button-toggle value="refunded">Refunds</mat-button-toggle>
        </mat-button-toggle-group>

        @if (!loading()) {
          <p class="pay-count">{{ filteredPayments().length }} records
            @if (selectedPeriod() < 9999) {
              <span>in last {{ getPeriodLabel() }}</span>
            }
          </p>
        }

        @if (loading()) {
          @for (i of [1,2,3]; track i) {
            <app-skeleton-card [lines]="3" />
          }
        } @else if (filteredPayments().length === 0) {
          <div class="empty-state mini">
            <mat-icon>receipt_long</mat-icon>
            <p>{{ 'pay.no_transactions' | translate }}</p>
          </div>
        } @else {
          @for (payment of filteredPayments(); track payment.id) {
            <mat-card class="txn-card">
              <div class="txn-row">
                <div class="payment-icon" [ngClass]="'status-bg-' + payment.status">
                  <mat-icon>{{ getMethodIcon(payment.method) }}</mat-icon>
                </div>
                <div class="txn-info">
                  <strong>{{ payment.description }}</strong>
                  <span class="txn-meta">
                    @if (payment.doctorName) { <span>{{ payment.doctorName }} · </span> }
                    <span>{{ formatMethod(payment.method) }}</span>
                    <span> · {{ payment.date | date:'mediumDate' }}</span>
                  </span>
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
              @if (payment.status === 'completed' || payment.status === 'refunded') {
                <div class="txn-actions">
                  <button mat-stroked-button class="txn-action-btn"
                          [disabled]="generatingReceipt() === payment.id"
                          (click)="generateReceipt(payment)">
                    @if (generatingReceipt() === payment.id) {
                      <mat-spinner diameter="16"></mat-spinner>
                    } @else {
                      <mat-icon>download</mat-icon>
                    }
                    Receipt
                  </button>
                  <button mat-stroked-button class="txn-action-btn">
                    <mat-icon>visibility</mat-icon> View Details
                  </button>
                </div>
              }
            </mat-card>
          }
        }
      </section>
    </div>

    <!-- ============================================ -->
    <!-- ADD DEPOSIT MODAL                           -->
    <!-- ============================================ -->
    @if (showAdvanceForm()) {
      <div class="modal-backdrop" (click)="closeDepositModal()"></div>
      <div class="modal-shell" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div class="modal-title">
            <mat-icon>account_balance_wallet</mat-icon>
            <div>
              <h3>Add Deposit Balance</h3>
              <p>Top up the balance held securely by the hospital for upcoming services.</p>
            </div>
          </div>
          <button mat-icon-button (click)="closeDepositModal()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="modal-body">
          <label class="field-label">Amount</label>
          <mat-form-field appearance="outline" class="full">
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

          <label class="field-label">Apply deposit to</label>
          <mat-form-field appearance="outline" class="full">
            <mat-select [ngModel]="advanceTarget()" (ngModelChange)="advanceTarget.set($event)">
              <mat-option value="general">General Hospital Wallet</mat-option>
              <mat-option value="consultation">Upcoming Consultation</mat-option>
              <mat-option value="admission">Admission</mat-option>
              <mat-option value="surgery">Surgery</mat-option>
              <mat-option value="lab">Lab &amp; Diagnostics</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="how-it-works">
            <div class="hiw-title">
              <mat-icon>tips_and_updates</mat-icon>
              How this works
            </div>
            <ul>
              <li>Your deposit is stored securely against your patient ID.</li>
              <li>Payments for selected services are automatically deducted from this balance.</li>
              <li>Any remaining balance stays in your account and can be used later.</li>
              <li>You can request a refund of any unused balance at any time.</li>
            </ul>
          </div>
        </div>

        <div class="modal-footer">
          <button mat-stroked-button (click)="closeDepositModal()">Cancel</button>
          <button mat-flat-button color="primary"
                  [disabled]="!advanceAmount() || advanceAmount() <= 0"
                  (click)="submitAdvancePayment()">
            Add {{ advanceAmount() ? formatCurrency(advanceAmount()) : 'Deposit' }}
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .payments-container { max-width: 920px; margin: 0 auto; padding-bottom: 40px; }
    .payments-container.rtl { direction: rtl; text-align: right; }

    /* Header */
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
    }
    .page-header-left { flex: 1; min-width: 0; }
    h1 { font-size: 26px; font-weight: 600; color: #1a237e; margin: 0; }
    .subtitle { color: #666; margin: 4px 0 0; font-size: 13px; }

    .header-deposit-btn {
      background: #1a237e !important; color: white !important;
      height: 40px !important; border-radius: 10px !important;
      padding: 0 16px !important; font-size: 13px !important; font-weight: 600 !important;
      display: inline-flex !important; align-items: center; gap: 6px;
      box-shadow: 0 2px 8px rgba(26,35,126,0.18) !important;
    }
    .header-deposit-btn:hover { background: #283593 !important; }
    .header-deposit-btn mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 2px; }
    .hdb-label { white-space: nowrap; }
    .hdb-add {
      background: rgba(255,255,255,0.18);
      padding: 2px 8px; border-radius: 8px;
      font-size: 11px; font-weight: 600; margin-left: 4px;
      text-transform: uppercase; letter-spacing: .04em;
    }

    /* Generic section */
    .section { margin-bottom: 28px; }
    .section-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px; gap: 12px;
    }
    .section-title { display: flex; align-items: center; gap: 10px; }
    .section h2 { font-size: 17px; font-weight: 600; color: #222; margin: 0; }

    .count-pill {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 24px; height: 22px; padding: 0 8px;
      background: #eef0fb; color: #1a237e;
      border-radius: 11px; font-size: 12px; font-weight: 600;
    }
    .count-pill.urgent { background: #ffebee; color: #c62828; }
    .count-pill.neutral { background: #eceff1; color: #455a64; }

    .section-aside { font-size: 13px; color: #777; }
    .section-aside strong { color: #333; font-weight: 600; }

    .demo-toggle {
      font-size: 12px !important; color: #1a237e !important;
      min-width: 0 !important; padding: 0 8px !important;
    }

    /* ===== Pending Payments ===== */
    .pending-list { display: flex; flex-direction: column; gap: 8px; }

    .pending-card {
      padding: 14px 16px; margin: 0 !important;
      border-radius: 12px !important;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
      transition: box-shadow 0.15s;
    }
    .pending-card:hover { box-shadow: 0 2px 10px rgba(0,0,0,0.06) !important; }

    .pending-row { display: flex; align-items: center; gap: 14px; }

    .pc-icon {
      width: 40px; height: 40px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .pc-icon mat-icon { color: white; font-size: 20px; width: 20px; height: 20px; }
    .ptype-medication { background: #7b1fa2; }
    .ptype-lab { background: #00897b; }
    .ptype-radiology { background: #0277bd; }
    .ptype-procedure { background: #e64a19; }
    .ptype-consultation { background: #f57c00; }
    .ptype-admission { background: #5e35b1; }

    .pc-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .pc-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .pc-name { font-size: 14px; color: #222; font-weight: 600; }
    .pc-meta { font-size: 12px; color: #888; }

    .due-chip {
      display: inline-flex; align-items: center;
      padding: 2px 8px;
      border-radius: 10px; font-size: 10px; font-weight: 600;
      text-transform: uppercase; letter-spacing: .04em;
    }
    .due-chip-overdue { background: #fdecea; color: #c62828; }
    .due-chip-due-today { background: #fff3e0; color: #e65100; }
    .due-chip-due-soon { background: #fff8e1; color: #a07000; }
    .due-chip-upcoming { background: #eceff1; color: #546e7a; }

    .pc-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
    .pc-amount { font-size: 15px; font-weight: 700; color: #222; }
    .pay-btn { font-size: 12px !important; padding: 0 14px !important; height: 30px !important; line-height: 30px !important; }

    .pay-all-link {
      margin-top: 10px; width: 100%;
      font-size: 13px !important; font-weight: 500 !important;
      border-radius: 10px !important;
    }

    /* ===== Deposit Balance — Zero State ===== */
    .deposit-empty {
      background: linear-gradient(135deg, #f8f9ff 0%, #eef0fb 100%);
      border: 1px solid #e3e7f5;
      border-radius: 16px;
      padding: 28px 24px;
      text-align: center;
    }
    .de-illo {
      width: 64px; height: 64px; border-radius: 50%;
      background: white; color: #1a237e;
      display: inline-flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 12px rgba(26,35,126,0.12);
      margin-bottom: 14px;
    }
    .de-illo mat-icon { font-size: 30px; width: 30px; height: 30px; }
    .deposit-empty h3 { margin: 0 0 6px; font-size: 18px; color: #1a237e; font-weight: 600; }
    .de-sub { margin: 0 auto 20px; max-width: 460px; color: #555; font-size: 13px; line-height: 1.55; }

    .de-why {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      max-width: 560px; margin: 0 auto 20px;
      text-align: left;
    }
    .de-why-item {
      display: flex; align-items: flex-start; gap: 10px;
      background: white; border-radius: 10px;
      padding: 12px 14px; border: 1px solid #e8eaf6;
    }
    .de-why-item mat-icon {
      color: #1a237e; font-size: 22px; width: 22px; height: 22px;
      flex-shrink: 0; margin-top: 1px;
    }
    .de-why-item strong { display: block; font-size: 13px; color: #222; margin-bottom: 2px; }
    .de-why-item span { font-size: 12px; color: #666; line-height: 1.4; }

    .de-cta {
      border-radius: 10px !important; font-weight: 600 !important;
      padding: 0 22px !important; height: 42px !important;
    }

    /* ===== Deposit Balance Card (populated) ===== */
    .deposit-card {
      background: linear-gradient(135deg, #1a237e 0%, #283593 60%, #3949ab 100%);
      color: white;
      border-radius: 16px;
      padding: 22px;
      box-shadow: 0 6px 24px rgba(26,35,126,0.18);
    }
    .dc-header { margin-bottom: 14px; }
    .dc-label {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; font-weight: 500; opacity: 0.9;
      text-transform: uppercase; letter-spacing: .05em;
    }
    .dc-label mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .dc-amount { font-size: 34px; font-weight: 700; line-height: 1.1; }
    .dc-summary { font-size: 12px; opacity: .8; margin-top: 6px; }

    .dc-divider {
      height: 1px; background: rgba(255,255,255,0.15);
      margin: 18px 0;
    }

    .dc-section { margin-bottom: 14px; }
    .dc-section:last-of-type { margin-bottom: 0; }
    .dc-section-label {
      font-size: 11px; text-transform: uppercase; letter-spacing: .06em;
      opacity: .85; margin-bottom: 8px;
    }

    .applied-pills { display: flex; flex-wrap: wrap; gap: 6px; }
    .applied-pill {
      display: inline-flex; align-items: center; gap: 4px;
      background: rgba(255,255,255,0.14);
      padding: 4px 10px; border-radius: 14px;
      font-size: 12px; font-weight: 500;
    }
    .applied-pill mat-icon { font-size: 13px; width: 13px; height: 13px; opacity: .85; }

    .recent-deductions { display: flex; flex-direction: column; gap: 6px; }
    .rd-row {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 13px;
    }
    .rd-name { opacity: .92; }
    .rd-amount { font-weight: 600; }

    .dc-explainer {
      margin-top: 16px; padding: 10px 12px;
      background: rgba(255,255,255,0.08);
      border-radius: 10px;
      display: flex; gap: 8px; align-items: flex-start;
      font-size: 12px; line-height: 1.45; opacity: .92;
    }
    .dc-explainer mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; }

    /* ===== Deposit Activity Accordion + Timeline ===== */
    .activity-accordion {
      display: block; margin-top: 12px;
    }
    .activity-accordion ::ng-deep .mat-expansion-panel {
      border-radius: 12px !important;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
    }
    .activity-accordion ::ng-deep .mat-expansion-panel-header {
      height: 56px; padding: 0 18px;
    }
    .activity-accordion ::ng-deep .mat-expansion-panel-header-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; font-weight: 600; color: #222;
    }
    .acc-icon { color: #1a237e; font-size: 18px; width: 18px; height: 18px; }
    .activity-accordion ::ng-deep .mat-expansion-panel-header-description {
      font-size: 12px; color: #888; justify-content: flex-end;
    }
    .activity-accordion ::ng-deep .mat-expansion-panel-body { padding: 0 18px 16px; }

    .timeline { list-style: none; margin: 0; padding: 0; position: relative; }
    .timeline::before {
      content: ''; position: absolute; top: 12px; bottom: 12px; left: 19px;
      width: 2px; background: #eceff1;
    }
    .tl-item {
      display: grid;
      grid-template-columns: 40px 1fr;
      gap: 14px; align-items: flex-start;
      padding: 10px 0;
      position: relative;
    }
    .tl-icon {
      width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: #eceff1;
      position: relative; z-index: 1;
      box-shadow: 0 0 0 4px white;
    }
    .tl-icon mat-icon { font-size: 20px; width: 20px; height: 20px; color: white; }

    .tl-type-added .tl-icon { background: #2e7d32; }
    .tl-consultation .tl-icon { background: #1565c0; }
    .tl-admission .tl-icon { background: #ef6c00; }
    .tl-lab .tl-icon { background: #00897b; }
    .tl-radiology .tl-icon { background: #0277bd; }
    .tl-medication .tl-icon { background: #7b1fa2; }
    .tl-procedure .tl-icon { background: #e64a19; }

    .tl-body { min-width: 0; padding-top: 8px; }
    .tl-line1 { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; }
    .tl-amount { font-size: 15px; font-weight: 700; }
    .tl-amount.add { color: #2e7d32; }
    .tl-amount.deduct { color: #c62828; }
    .tl-action { font-size: 13px; color: #555; }
    .tl-target { font-size: 13px; color: #222; font-weight: 500; }
    .tl-line2 { font-size: 12px; color: #888; margin-top: 4px; }
    .tl-line2 strong { color: #333; font-weight: 600; }

    /* ===== Payment History ===== */
    .history-controls {
      display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px;
    }
    .pay-search {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 14px; background: #f3f4f6; border-radius: 24px;
    }
    .ps-icon { color: #999; font-size: 20px; width: 20px; height: 20px; }
    .ps-input {
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 14px; font-family: inherit; color: #333; padding: 8px 0;
    }
    .ps-input::placeholder { color: #aaa; }
    .ps-clear { width: 32px !important; height: 32px !important; line-height: 32px !important; }

    .pay-pills { display: flex; gap: 6px; flex-wrap: wrap; }
    .pp {
      padding: 5px 14px; border-radius: 18px; border: 1.5px solid #ddd;
      background: white; font-size: 12px; font-family: inherit;
      color: #555; cursor: pointer; transition: all 0.15s; font-weight: 500;
    }
    .pp:hover { border-color: #1a237e; color: #1a237e; }
    .pp.active { background: #1a237e; color: white; border-color: #1a237e; }

    .pay-count { font-size: 12px; color: #999; margin: 6px 0 10px; }
    .pay-count span { color: #777; }
    .filter-group { margin-bottom: 8px; }

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
    .status-bg-pending { background: #f57c00; }
    .status-bg-failed { background: #ef5350; }
    .status-bg-refunded { background: #78909c; }

    .txn-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .txn-info strong { font-size: 14px; color: #222; }
    .txn-meta { font-size: 12px; color: #888; }

    .txn-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .txn-amount { font-size: 15px; font-weight: 700; }
    .amount-completed { color: #2e7d32; }
    .amount-pending { color: #f57c00; }
    .amount-failed { color: #ef5350; text-decoration: line-through; }
    .amount-refunded { color: #546e7a; }

    .status-chip { font-size: 10px !important; min-height: 20px !important; text-transform: capitalize; }
    .status-completed { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-pending { background: #fff3e0 !important; color: #f57c00 !important; }
    .status-failed { background: #ffebee !important; color: #d32f2f !important; }
    .status-refunded { background: #eceff1 !important; color: #546e7a !important; }

    .txn-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
    .txn-action-btn { font-size: 12px !important; padding: 0 12px !important; height: 32px !important; line-height: 32px !important; }
    .txn-action-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* ===== Empty States ===== */
    .empty-state {
      background: white; border: 1px dashed #d0d7de; border-radius: 14px;
      padding: 32px 20px; text-align: center; color: #607d8b;
    }
    .empty-state.friendly { padding: 36px 20px; }
    .empty-state h3 { margin: 12px 0 4px; color: #1a237e; font-size: 17px; font-weight: 600; }
    .empty-state p { margin: 0 0 16px; font-size: 13px; }
    .empty-illo {
      width: 56px; height: 56px; border-radius: 50%;
      background: #e8f5e9; color: #2e7d32;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .empty-illo mat-icon { font-size: 30px; width: 30px; height: 30px; }
    .empty-state.mini { padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .empty-state.mini mat-icon { font-size: 32px; width: 32px; height: 32px; color: #b0bec5; }
    .empty-state.mini p { margin: 0; font-size: 13px; }

    /* ===== Add Deposit Modal ===== */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      z-index: 1000; animation: fadeIn 0.18s ease;
    }
    .modal-shell {
      position: fixed; z-index: 1001;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: min(520px, calc(100vw - 32px));
      max-height: calc(100vh - 32px);
      background: white; border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25);
      display: flex; flex-direction: column;
      animation: popIn 0.2s ease;
      overflow: hidden;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes popIn { from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }

    .modal-head {
      padding: 18px 20px; display: flex; align-items: flex-start; gap: 12px;
      border-bottom: 1px solid #eceff1;
    }
    .modal-title { display: flex; gap: 12px; flex: 1; }
    .modal-title > mat-icon {
      flex-shrink: 0; color: #1a237e; font-size: 28px; width: 28px; height: 28px; margin-top: 2px;
    }
    .modal-title h3 { margin: 0 0 2px; font-size: 17px; font-weight: 600; color: #222; }
    .modal-title p { margin: 0; font-size: 12px; color: #777; line-height: 1.4; }

    .modal-body { padding: 16px 20px; overflow-y: auto; }
    .field-label {
      display: block; font-size: 12px; font-weight: 600; color: #555;
      text-transform: uppercase; letter-spacing: .04em;
      margin: 4px 0 6px;
    }
    .full { width: 100%; }

    .quick-amounts { display: flex; gap: 6px; flex-wrap: wrap; margin: -8px 0 14px; }
    .qa-btn {
      padding: 6px 14px; border-radius: 18px; border: 1.5px solid #e0e0e0;
      background: white; color: #555; font-size: 13px; font-family: inherit;
      cursor: pointer; transition: all .15s; font-weight: 500;
    }
    .qa-btn:hover { border-color: #1a237e; color: #1a237e; }
    .qa-btn.active { background: #1a237e; color: white; border-color: #1a237e; }

    .how-it-works {
      background: #f6f8fc; border-radius: 12px; padding: 14px 16px;
      margin-top: 8px;
    }
    .hiw-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 600; color: #1a237e; margin-bottom: 8px;
    }
    .hiw-title mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .how-it-works ul { margin: 0; padding-left: 18px; }
    .how-it-works li { font-size: 12px; color: #455a64; line-height: 1.55; margin-bottom: 4px; }
    .how-it-works li:last-child { margin-bottom: 0; }

    .modal-footer {
      padding: 14px 20px; display: flex; justify-content: flex-end; gap: 10px;
      border-top: 1px solid #eceff1; background: #fafafa;
    }

    /* ===== Responsive ===== */
    @media (max-width: 720px) {
      h1 { font-size: 22px; }
      .deposit-card { padding: 18px; }
      .dc-amount { font-size: 30px; }
      .pending-card {
        grid-template-columns: 40px 1fr;
        grid-template-rows: auto auto;
      }
      .pc-right {
        grid-column: 1 / -1;
        flex-direction: row; justify-content: space-between; align-items: center;
        margin-top: 4px;
      }
      .pay-btn { width: auto !important; }
      .pending-footer { flex-direction: column; align-items: stretch; }
      .pay-all-btn { width: 100%; }
      .total-outstanding { align-items: flex-start; }
      .section-head { flex-direction: column; align-items: flex-start; }
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

  readonly quickAmounts = [200, 500, 1000, 2000];

  readonly timePeriods = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: '3 months', days: 90 },
    { label: '6 months', days: 180 },
    { label: '1 year', days: 365 },
    { label: 'All time', days: 9999 }
  ];

  // -------- PENDING CHARGES (realistic sample) --------
  readonly pendingChargesData = signal<PendingCharge[]>([
    {
      id: 'pc-1', name: 'Cardiology Consultation', detail: 'Dr. Rajesh Kumar',
      amount: 25, category: 'consultation',
      dueDate: '2026-05-10T09:00:00', dueStatus: 'overdue'
    },
    {
      id: 'pc-2', name: 'MRI Brain Scan', detail: 'Radiology — Dr. Ahmed Hassan',
      amount: 120, category: 'radiology',
      dueDate: '2026-05-13T11:00:00', dueStatus: 'due-today'
    },
    {
      id: 'pc-3', name: 'Admission Deposit', detail: 'General Surgery — pre-admission',
      amount: 800, category: 'admission',
      dueDate: '2026-05-16T08:00:00', dueStatus: 'due-soon'
    },
    {
      id: 'pc-4', name: 'Lab Tests (CBC + Lipid Panel)', detail: 'Diagnostic Lab',
      amount: 47, category: 'lab',
      dueDate: '2026-05-20T10:00:00', dueStatus: 'upcoming'
    },
    {
      id: 'pc-5', name: 'Pharmacy — Metformin & Amlodipine', detail: 'Dr. Rajesh Kumar prescription',
      amount: 38, category: 'medication',
      dueDate: '2026-05-09T14:00:00', dueStatus: 'overdue'
    }
  ]);

  readonly allPendingCharges = computed(() => this.pendingChargesData());

  readonly overdueCount = computed(() =>
    this.pendingChargesData().filter(c => c.dueStatus === 'overdue').length
  );

  readonly totalPendingAll = computed(() =>
    this.pendingChargesData().reduce((sum, c) => sum + c.amount, 0)
    + this.payments().filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
  );

  readonly pendingPayments = computed(() =>
    this.payments().filter(p => p.status === 'pending')
  );

  // -------- DEPOSIT BALANCE & ACTIVITY (realistic sample) --------
  readonly depositEvents = signal<DepositEvent[]>([
    {
      id: 'de-1', type: 'added', amount: 1500, appliedTo: 'General Hospital Wallet',
      category: 'deposit', date: '2026-04-20T10:00:00', balanceAfter: 1500
    },
    {
      id: 'de-2', type: 'deducted', amount: 250, appliedTo: 'Cardiology Consultation',
      category: 'consultation', date: '2026-04-22T09:30:00', balanceAfter: 1250
    },
    {
      id: 'de-3', type: 'deducted', amount: 450, appliedTo: 'Admission Deposit — Day Surgery',
      category: 'admission', date: '2026-04-28T14:00:00', balanceAfter: 800
    },
    {
      id: 'de-4', type: 'added', amount: 500, appliedTo: 'Upcoming Admission',
      category: 'deposit', date: '2026-05-05T11:15:00', balanceAfter: 1300
    },
    {
      id: 'de-5', type: 'deducted', amount: 300, appliedTo: 'MRI Brain Scan',
      category: 'radiology', date: '2026-05-07T13:00:00', balanceAfter: 1000
    },
    {
      id: 'de-6', type: 'deducted', amount: 150, appliedTo: 'Dermatology Consultation',
      category: 'consultation', date: '2026-05-09T16:20:00', balanceAfter: 850
    },
    {
      id: 'de-7', type: 'deducted', amount: 100, appliedTo: 'Blood Test — HbA1c',
      category: 'lab', date: '2026-05-11T08:45:00', balanceAfter: 750
    }
  ]);

  readonly hasDeposits = computed(() => this.depositEvents().length > 0);

  readonly depositBalance = computed(() => {
    const events = this.depositEvents();
    return events.length ? events[events.length - 1].balanceAfter : 0;
  });

  readonly totalDeposited = computed(() =>
    this.depositEvents().filter(e => e.type === 'added').reduce((s, e) => s + e.amount, 0)
  );

  readonly totalDeducted = computed(() =>
    this.depositEvents().filter(e => e.type === 'deducted').reduce((s, e) => s + e.amount, 0)
  );

  readonly recentDeductions = computed(() =>
    this.depositEvents()
      .filter(e => e.type === 'deducted')
      .slice(-3)
      .reverse()
  );

  readonly appliedTargets = computed(() => ['Cardiology Consultation', 'Upcoming Admission', 'Lab & Diagnostics']);

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

  dueIcon(status: DueStatus): string {
    return ({
      'overdue': 'error',
      'due-today': 'schedule',
      'due-soon': 'event',
      'upcoming': 'event_available'
    })[status];
  }

  activityIcon(e: DepositEvent): string {
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

  openDepositModal(): void {
    this.advanceAmount.set(0);
    this.advanceTarget.set('general');
    this.showAdvanceForm.set(true);
  }

  closeDepositModal(): void {
    this.showAdvanceForm.set(false);
  }

  /** Demo toggle so stakeholders can flip between empty and populated wallet states. */
  toggleDepositDemo(): void {
    if (this.hasDeposits()) {
      this.depositEvents.set([]);
    } else {
      this.depositEvents.set(this.sampleDepositEvents());
    }
  }

  private sampleDepositEvents(): DepositEvent[] {
    return [
      { id: 'de-1', type: 'added', amount: 1500, appliedTo: 'General Hospital Wallet',
        category: 'deposit', date: '2026-04-20T10:00:00', balanceAfter: 1500 },
      { id: 'de-2', type: 'deducted', amount: 250, appliedTo: 'Cardiology Consultation',
        category: 'consultation', date: '2026-04-22T09:30:00', balanceAfter: 1250 },
      { id: 'de-3', type: 'deducted', amount: 450, appliedTo: 'Admission Deposit — Day Surgery',
        category: 'admission', date: '2026-04-28T14:00:00', balanceAfter: 800 },
      { id: 'de-4', type: 'added', amount: 500, appliedTo: 'Upcoming Admission',
        category: 'deposit', date: '2026-05-05T11:15:00', balanceAfter: 1300 },
      { id: 'de-5', type: 'deducted', amount: 300, appliedTo: 'MRI Brain Scan',
        category: 'radiology', date: '2026-05-07T13:00:00', balanceAfter: 1000 },
      { id: 'de-6', type: 'deducted', amount: 150, appliedTo: 'Dermatology Consultation',
        category: 'consultation', date: '2026-05-09T16:20:00', balanceAfter: 850 },
      { id: 'de-7', type: 'deducted', amount: 100, appliedTo: 'Blood Test — HbA1c',
        category: 'lab', date: '2026-05-11T08:45:00', balanceAfter: 750 }
    ];
  }

  submitAdvancePayment(): void {
    const amount = this.advanceAmount();
    if (!amount || amount <= 0) return;

    const targetLabels: Record<string, string> = {
      general: 'General Hospital Wallet',
      consultation: 'Upcoming Consultation',
      admission: 'Admission',
      surgery: 'Surgery',
      lab: 'Lab & Diagnostics'
    };
    const targetLabel = targetLabels[this.advanceTarget()] ?? 'General Hospital Wallet';

    const newBalance = this.depositBalance() + amount;
    const newEvent: DepositEvent = {
      id: 'de-' + Date.now(),
      type: 'added',
      amount,
      appliedTo: targetLabel,
      category: 'deposit',
      date: new Date().toISOString(),
      balanceAfter: newBalance
    };
    this.depositEvents.update(list => [...list, newEvent]);

    const newPayment: Payment = {
      id: 'pay-adv-' + Date.now(),
      date: new Date().toISOString(),
      amount,
      currency: this.geo.config().currency,
      status: 'completed',
      method: 'card',
      description: 'Deposit Added — ' + targetLabel,
      invoiceNumber: 'DEP-' + Date.now().toString().slice(-6),
      breakdown: [{ label: 'Deposit Balance Top-up', amount }]
    };
    this.payments.update(list => [newPayment, ...list]);

    this.showAdvanceForm.set(false);
    this.advanceAmount.set(0);
    this.advanceTarget.set('general');
    this.snackBar.open(`${this.formatCurrency(amount)} added to deposit balance`, this.i18n.t('common.close'), { duration: 4000 });
  }

  payCharge(item: PendingCharge): void {
    const balance = this.depositBalance();
    if (balance >= item.amount) {
      // Auto-deduct from deposit
      const newBalance = balance - item.amount;
      this.depositEvents.update(list => [...list, {
        id: 'de-' + Date.now(),
        type: 'deducted',
        amount: item.amount,
        appliedTo: item.name,
        category: this.mapCategory(item.category),
        date: new Date().toISOString(),
        balanceAfter: newBalance
      }]);
      this.pendingChargesData.update(list => list.filter(c => c.id !== item.id));
      this.snackBar.open(
        `${this.formatCurrency(item.amount)} paid from your deposit balance`,
        this.i18n.t('common.close'),
        { duration: 4000 }
      );
    } else {
      this.pendingChargesData.update(list => list.filter(c => c.id !== item.id));
      this.snackBar.open(
        `Paid ${this.formatCurrency(item.amount)} for ${item.name}`,
        this.i18n.t('common.close'),
        { duration: 4000 }
      );
    }
  }

  payAll(): void {
    const total = this.totalPendingAll();
    this.snackBar.open(
      `Paying ${this.formatCurrency(total)} — checkout would open here.`,
      this.i18n.t('common.close'),
      { duration: 4000 }
    );
  }

  private mapCategory(c: string): DepositEvent['category'] {
    const valid: DepositEvent['category'][] = ['consultation', 'admission', 'lab', 'radiology', 'medication', 'procedure'];
    return (valid as string[]).includes(c) ? (c as DepositEvent['category']) : 'consultation';
  }

  downloadClaim(paymentId: string): void {
    this.api.downloadInsuranceClaim(paymentId).subscribe({
      next: () => {
        this.snackBar.open('Claim form downloaded', this.i18n.t('common.close'), { duration: 3000 });
      }
    });
  }
}
