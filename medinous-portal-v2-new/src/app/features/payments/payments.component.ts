import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
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

type SheetMode = 'balance' | 'add' | 'detail' | null;

interface JourneyStep {
  key: string;
  icon: string;
  label: string;
  date?: string;
  state: 'done' | 'current' | 'pending';
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatMenuModule, MatIconModule, MatButtonModule, MatChipsModule,
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
                   type="search"
                   name="payment-search"
                   autocomplete="off"
                   [ngModel]="searchQuery()"
                   (ngModelChange)="searchQuery.set($event)"
                   placeholder="Search transactions, doctor, or service...">
            @if (searchQuery()) {
              <button mat-icon-button class="ps-clear" (click)="searchQuery.set('')">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>

          <!-- Desktop: dropdown with label -->
          <button mat-stroked-button class="time-btn time-btn-desktop" [matMenuTriggerFor]="timeMenu">
            <mat-icon class="tb-icon">event</mat-icon>
            <span class="tb-label">{{ getPeriodLabel() || 'All Time' }}</span>
            <mat-icon class="tb-caret" iconPositionEnd>expand_more</mat-icon>
          </button>

          <!-- Mobile: icon-only filter button -->
          <button class="time-btn-mobile"
                  [class.has-filter]="selectedPeriod() !== 30"
                  [matMenuTriggerFor]="timeMenu"
                  aria-label="Filter by time period">
            <mat-icon>tune</mat-icon>
            @if (selectedPeriod() !== 30) { <span class="time-dot"></span> }
          </button>

          <mat-menu #timeMenu="matMenu" class="time-menu">
            @for (p of timePeriods; track p.days) {
              <button mat-menu-item (click)="selectedPeriod.set(p.days)">
                <mat-icon [class.invisible]="selectedPeriod() !== p.days">check</mat-icon>
                <span>{{ p.label }}</span>
              </button>
            }
          </mat-menu>
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
          <div class="empty-state friendly">
            <div class="es-illo">
              <mat-icon>health_and_safety</mat-icon>
            </div>
            <h3>No recent healthcare payments found</h3>
            <p>Once you book a consultation, lab test or admission, your payments and receipts will show up here.</p>
            <button mat-flat-button color="primary" class="es-cta" routerLink="/appointments">
              <mat-icon>event</mat-icon> Book Appointment
            </button>
          </div>
        } @else {
          @for (row of filteredHistory(); track row.key) {
            <div class="txn-card"
                 [class.is-pending]="row.source === 'pending'"
                 [class.is-due]="row.dueStatus === 'due-soon' || row.dueStatus === 'due-today'"
                 [class.is-overdue]="row.dueStatus === 'overdue'"
                 (click)="openDetailSheet(row)"
                 (keydown.enter)="openDetailSheet(row)"
                 tabindex="0" role="button"
                 [attr.aria-label]="row.name + ', ' + formatCurrency(row.amount) + ', ' + statusLabel(row)">
              <div class="payment-icon" [ngClass]="iconBgClass(row)">
                <mat-icon>{{ rowIcon(row) }}</mat-icon>
              </div>

              <div class="txn-info">
                <strong class="txn-title">{{ row.name }}</strong>
                <span class="txn-meta">
                  @if (row.doctor) { <span class="txn-doc">{{ row.doctor }}</span> }
                  <span class="txn-date">{{ row.date | date:'mediumDate' }}</span>
                </span>
                @if (row.source !== 'pending') {
                  <span class="txn-pm">
                    <mat-icon>{{ payMethodIcon(row) }}</mat-icon>{{ payMethodLabel(row) }}
                  </span>
                }
              </div>

              <div class="txn-right">
                <span class="txn-amount" [ngClass]="'amount-' + row.status">
                  {{ formatCurrency(row.amount) }}
                </span>
                <span class="status-tag" [class]="statusTagClass(row)">
                  {{ statusLabel(row) }}
                </span>
              </div>

              <div class="txn-actions" (click)="$event.stopPropagation()">
                @if (row.source === 'pending') {
                  <button mat-flat-button color="primary" class="txn-pay-btn"
                          (click)="payPendingRow(row)">
                    <mat-icon>bolt</mat-icon> Pay
                  </button>
                } @else if (row.status === 'completed' || row.status === 'refunded') {
                  <button mat-icon-button class="txn-icon-btn"
                          matTooltip="Download receipt"
                          [disabled]="generatingReceipt() === row.rawPayment?.id"
                          (click)="generateReceipt(row.rawPayment!)">
                    @if (generatingReceipt() === row.rawPayment?.id) {
                      <mat-spinner diameter="16"></mat-spinner>
                    } @else {
                      <mat-icon>download</mat-icon>
                    }
                  </button>
                }
              </div>

              <mat-icon class="txn-chevron">chevron_right</mat-icon>
            </div>
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

          <!-- Applied To (derived from real deductions) -->
          @if (appliedTargets().length > 0) {
            <section class="ss-section">
              <div class="ss-section-label">Used for</div>
              <div class="applied-pills">
                @for (target of appliedTargets(); track target) {
                  <span class="applied-pill">
                    <mat-icon>check_circle</mat-icon>
                    {{ target }}
                  </span>
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

        <label class="field-label">Remarks <span class="optional">(optional)</span></label>
        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <textarea matInput rows="3" maxlength="200"
                    placeholder="e.g. Upcoming admission, family member's visit, etc."
                    [ngModel]="advanceRemarks()"
                    (ngModelChange)="advanceRemarks.set($event)"></textarea>
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
                [disabled]="!advanceAmount() || advanceAmount()! <= 0"
                (click)="submitAdvancePayment()">
          Add {{ advanceAmount() ? formatCurrency(advanceAmount()!) : 'Advance Balance' }}
        </button>
      </footer>
    </aside>

    <!-- ============================================ -->
    <!-- PAYMENT DETAILS SIDE / BOTTOM SHEET          -->
    <!-- ============================================ -->
    <aside class="side-sheet detail-sheet" [class.open]="sheetOpen() === 'detail'" aria-label="Payment Details">
      @if (detailRow(); as row) {
        <header class="ss-head detail-head">
          <div class="dh-title">
            <div class="dh-icon" [ngClass]="iconBgClass(row)">
              <mat-icon>{{ rowIcon(row) }}</mat-icon>
            </div>
            <div class="dh-text">
              <h3>{{ row.name }}</h3>
              @if (row.doctor) {
                <p class="ss-head-sub">{{ row.doctor }}</p>
              }
            </div>
          </div>
          <button mat-icon-button class="ss-close" (click)="closeSheet()">
            <mat-icon>close</mat-icon>
          </button>
        </header>

        <div class="ss-body detail-body">

          <!-- Amount block -->
          <section class="detail-amount">
            <div class="da-top">
              <div>
                <div class="da-label">Amount</div>
                <div class="da-value" [ngClass]="'amount-' + row.status">
                  {{ formatCurrency(row.amount) }}
                </div>
              </div>
              <span class="status-tag" [class]="statusTagClass(row)">
                {{ statusLabel(row) }}
              </span>
            </div>
            @if (row.source === 'payment' && row.rawPayment?.invoiceNumber) {
              <div class="da-receipt">
                <mat-icon>receipt</mat-icon>
                Receipt {{ row.rawPayment!.invoiceNumber }}
              </div>
            }
          </section>

          <!-- Payment method block -->
          <section class="ss-section">
            <div class="ss-section-label">Payment</div>
            <div class="pm-block" [class.offline]="isOfflinePayment(row)" [class.pending-block]="row.source === 'pending'">
              <div class="pm-icon">
                <mat-icon>{{ payMethodIcon(row) }}</mat-icon>
              </div>
              <div class="pm-text">
                <strong>{{ payMethodLabel(row) }}</strong>
                @if (payMethodSubLabel(row); as sub) {
                  <span>{{ sub }}</span>
                }
                @if (isOfflinePayment(row)) {
                  <span class="pm-location">
                    <mat-icon>place</mat-icon> {{ getDetailLocation(row) }}
                  </span>
                }
              </div>
            </div>
            <div class="pm-time">
              <mat-icon>schedule</mat-icon>
              {{ row.date | date:'fullDate' }} · {{ row.date | date:'shortTime' }}
            </div>
          </section>

          <!-- Why this payment -->
          <section class="ss-section">
            <div class="ss-section-label">Why this payment</div>
            <p class="context-narrative">{{ getContextNarrative(row) }}</p>
          </section>

          <!-- Healthcare journey -->
          <section class="ss-section">
            <div class="ss-section-label">Healthcare journey</div>
            <ol class="journey">
              @for (s of getJourneySteps(row); track s.key) {
                <li class="j-step" [class]="'j-' + s.state">
                  <div class="j-icon">
                    <mat-icon>{{ s.icon }}</mat-icon>
                  </div>
                  <div class="j-body">
                    <strong>{{ s.label }}</strong>
                    @if (s.date) {
                      <span>{{ s.date | date:'mediumDate' }}</span>
                    }
                  </div>
                </li>
              }
            </ol>
          </section>

          <!-- Payment breakdown -->
          @if (row.rawPayment && row.rawPayment.breakdown.length) {
            <section class="ss-section">
              <div class="ss-section-label">Breakdown</div>
              <div class="bd-list">
                @for (b of row.rawPayment.breakdown; track b.label) {
                  <div class="bd-row">
                    <span>{{ b.label }}</span>
                    <strong>{{ formatCurrency(b.amount) }}</strong>
                  </div>
                }
                <div class="bd-row bd-total">
                  <span>Total</span>
                  <strong>{{ formatCurrency(row.amount) }}</strong>
                </div>
              </div>
            </section>
          }

          <!-- Insurance claim -->
          @if (row.rawPayment?.insuranceClaim) {
            <section class="ss-section">
              <div class="ss-section-label">Insurance claim</div>
              <div class="ins-row">
                <div class="ins-icon"><mat-icon>health_and_safety</mat-icon></div>
                <div class="ins-info">
                  <strong>{{ row.rawPayment!.insuranceClaim!.provider }}</strong>
                  <span>Claim {{ row.rawPayment!.insuranceClaim!.claimId }} · {{ row.rawPayment!.insuranceClaim!.status | titlecase }}</span>
                </div>
                <span class="ins-covered">
                  Covered<br>
                  <strong>{{ formatCurrency(row.rawPayment!.insuranceClaim!.coveredAmount) }}</strong>
                </span>
              </div>
            </section>
          }

        </div>

        <footer class="ss-footer detail-footer">
          @if (row.source === 'pending') {
            <button mat-flat-button color="primary" class="ds-cta"
                    (click)="payPendingRow(row); closeSheet()">
              <mat-icon>payments</mat-icon> Pay {{ formatCurrency(row.amount) }}
            </button>
          } @else if (row.rawPayment && (row.status === 'completed' || row.status === 'refunded')) {
            <button mat-flat-button color="primary" class="ds-cta"
                    [disabled]="generatingReceipt() === row.rawPayment.id"
                    (click)="generateReceipt(row.rawPayment)">
              @if (generatingReceipt() === row.rawPayment.id) {
                <mat-spinner diameter="14"></mat-spinner>
              } @else {
                <mat-icon>download</mat-icon>
              }
              Download Receipt
            </button>
          } @else {
            <button mat-stroked-button (click)="closeSheet()">Close</button>
          }
        </footer>
      }
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

    /* Time period button — desktop full, mobile icon */
    .time-btn {
      flex-shrink: 0; height: 40px !important;
      border-radius: 22px !important;
      border-color: #d8e3e3 !important; background: white !important;
      color: #1a237e !important; font-weight: 500 !important;
      font-size: 13px !important; padding: 0 14px !important;
      display: inline-flex !important; align-items: center; gap: 6px;
    }
    .time-btn .tb-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
      color: #1a237e;
    }
    .time-btn .tb-caret {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      color: #888;
    }
    .tb-label { max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .time-btn-mobile {
      display: none;
      flex-shrink: 0;
      width: 40px; height: 40px; border-radius: 50%;
      background: white; border: 1px solid #d8e3e3;
      align-items: center; justify-content: center;
      cursor: pointer; position: relative; color: #1a237e;
      transition: border-color 0.15s, background 0.15s;
    }
    .time-btn-mobile:hover { border-color: #1a237e; }
    .time-btn-mobile.has-filter { background: #eef0fb; border-color: #1a237e; }
    .time-btn-mobile mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .time-btn-mobile .time-dot {
      position: absolute; top: 6px; right: 6px;
      width: 8px; height: 8px; border-radius: 50%;
      background: #ef6c00; border: 2px solid white;
    }
    .invisible { visibility: hidden; }

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
    /* ===== TRANSACTION CARDS — compact, tappable rows ===== */
    .txn-card {
      display: flex; align-items: center; gap: 14px;
      padding: 12px 16px; margin-bottom: 10px;
      background: white;
      border: 1px solid #eef2f4;
      border-radius: 14px;
      cursor: pointer;
      transition: border-color .15s, box-shadow .15s, transform .12s;
    }
    .txn-card:hover {
      border-color: #cfe6e3;
      box-shadow: 0 6px 18px rgba(13,138,138,0.09);
      transform: translateY(-1px);
    }
    .txn-card:focus-visible { outline: 2px solid #0d8a8a; outline-offset: 2px; }
    /* Urgency accent down the left edge for charges that need paying */
    .txn-card.is-pending { border-left: 3px solid #cfd8dc; }
    .txn-card.is-due { border-left: 3px solid #fb8c00; }
    .txn-card.is-overdue { border-left: 3px solid #e53935; background: #fffafa; }

    .payment-icon {
      width: 42px; height: 42px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .payment-icon mat-icon { color: white; font-size: 21px; width: 21px; height: 21px; }
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
    .txn-title {
      font-size: 14.5px; font-weight: 600; color: #1b3a4b;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .txn-meta { font-size: 12px; color: #6b7884; display: inline-flex; gap: 6px; flex-wrap: wrap; }
    .txn-meta .txn-doc { color: #455a64; }
    .txn-meta .txn-date::before { content: '·'; margin-right: 6px; color: #c0c8d0; }
    .txn-meta .txn-date:first-child::before { content: ''; margin-right: 0; }
    .txn-pm {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11.5px; color: #5e7691; font-weight: 600; margin-top: 1px;
    }
    .txn-pm mat-icon { font-size: 13px; width: 13px; height: 13px; }

    .txn-right {
      text-align: right; display: flex; flex-direction: column;
      align-items: flex-end; gap: 5px; flex-shrink: 0;
    }
    .txn-amount { font-size: 16px; font-weight: 700; color: #1b3a4b; line-height: 1; }
    .amount-completed { color: #2e7d32; }
    .amount-pending { color: #1b3a4b; }
    .amount-failed { color: #ef5350; text-decoration: line-through; }
    .amount-refunded { color: #546e7a; }

    .status-tag {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 10.5px; font-weight: 700;
      padding: 3px 9px; border-radius: 20px;
      text-transform: uppercase; letter-spacing: .04em;
    }
    .status-tag::before {
      content: ''; width: 5px; height: 5px; border-radius: 50%;
      background: currentColor;
    }
    .status-tag.status-completed { background: #e8f5e9; color: #2e7d32; }
    .status-tag.status-refunded { background: #eceff1; color: #546e7a; }
    .status-tag.status-failed { background: #ffebee; color: #c62828; }
    .status-tag.status-pending { background: #eceff1; color: #607d8b; }
    .status-tag.status-due-soon { background: #fff3e0; color: #e65100; }
    .status-tag.status-overdue { background: #fdecea; color: #c62828; }

    .txn-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .txn-pay-btn {
      height: 36px !important; border-radius: 10px !important;
      font-size: 13px !important; font-weight: 600 !important;
      padding: 0 16px !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important;
    }
    .txn-pay-btn mat-icon { font-size: 17px; width: 17px; height: 17px; margin-right: 2px; }
    .txn-icon-btn { color: #607d8b !important; }
    .txn-icon-btn:hover { color: #0d8a8a !important; }
    .txn-icon-btn mat-icon { font-size: 19px; }
    .txn-chevron { color: #b8c4cc; flex-shrink: 0; margin-left: -4px; }

    .empty-state.friendly {
      background: white; border: 1px solid #e8edf2; border-radius: 18px;
      padding: 36px 22px; text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 10px;
    }
    .empty-state.friendly .es-illo {
      width: 64px; height: 64px; border-radius: 50%;
      background: linear-gradient(135deg, #eef0fb 0%, #e1e7f7 100%);
      color: #1a237e;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .empty-state.friendly .es-illo mat-icon {
      font-size: 30px !important; width: 30px !important; height: 30px !important;
    }
    .empty-state.friendly h3 {
      margin: 6px 0 0; font-size: 16px; color: #1a237e; font-weight: 600;
    }
    .empty-state.friendly p {
      margin: 0 auto; max-width: 340px;
      font-size: 13px; color: #6b7884; line-height: 1.55;
    }
    .empty-state.friendly .es-cta {
      margin-top: 10px;
      height: 40px !important; border-radius: 22px !important;
      padding: 0 22px !important; font-weight: 600 !important;
    }
    .empty-state.friendly .es-cta mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* ===== Side Sheet ===== */
    .sheet-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.42);
      z-index: 1000; animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .side-sheet {
      /* Start below the sticky app toolbar (mat-toolbar = 64px) so the sheet's
         own header + close button aren't hidden behind the global top bar. */
      position: fixed; top: 64px; right: 0; bottom: 0;
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
    .field-label .optional {
      text-transform: none; letter-spacing: 0;
      color: #b0bec5; font-weight: 500;
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

    /* ===== Detail sheet — payment details ===== */
    .detail-head { align-items: center; }
    .dh-title { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
    .dh-icon {
      width: 40px; height: 40px; border-radius: 12px;
      display: inline-flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .dh-icon mat-icon { color: white; font-size: 20px; width: 20px; height: 20px; }
    .dh-text { min-width: 0; }
    .dh-text h3 {
      margin: 0; font-size: 15px; font-weight: 700; color: #1a237e;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .detail-body { padding: 18px 20px 24px; }

    .detail-amount {
      background: linear-gradient(135deg, #f6f8fc 0%, #eef0fb 100%);
      border-radius: 14px;
      padding: 16px 18px;
      margin-bottom: 18px;
    }
    .da-top {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
    }
    .da-label {
      font-size: 11px; text-transform: uppercase; letter-spacing: .05em;
      color: #6b7884; font-weight: 600;
    }
    .da-value {
      font-size: 26px; font-weight: 700; color: #1a237e; margin-top: 2px;
      line-height: 1.2;
    }
    .detail-amount .amount-failed { color: #c62828; text-decoration: line-through; }
    .detail-amount .amount-refunded { color: #546e7a; }
    .da-receipt {
      display: inline-flex; align-items: center; gap: 6px;
      margin-top: 10px; font-size: 12px; color: #455a64; font-weight: 600;
      background: white; padding: 4px 10px; border-radius: 10px;
    }
    .da-receipt mat-icon { font-size: 14px; width: 14px; height: 14px; color: #1a237e; }

    .pm-block {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px;
      background: white; border: 1px solid #e8edf2;
      border-radius: 12px;
    }
    .pm-block.offline { background: #fff7e6; border-color: #f5d99a; }
    .pm-block.pending-block { background: #fff3e0; border-color: #f0d8b0; }
    .pm-icon {
      width: 36px; height: 36px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      background: #eef0fb; color: #1a237e; flex-shrink: 0;
    }
    .pm-block.offline .pm-icon { background: #ffe2b6; color: #b07900; }
    .pm-block.pending-block .pm-icon { background: #ffe0b2; color: #e65100; }
    .pm-icon mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .pm-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .pm-text strong { font-size: 14px; color: #1a237e; font-weight: 700; }
    .pm-text span { font-size: 12px; color: #6b7884; line-height: 1.4; }
    .pm-location {
      display: inline-flex !important; align-items: center; gap: 4px;
      margin-top: 4px; color: #b07900 !important;
    }
    .pm-location mat-icon { font-size: 13px !important; width: 13px !important; height: 13px !important; }
    .pm-time {
      display: inline-flex; align-items: center; gap: 6px;
      margin-top: 10px; font-size: 12px; color: #6b7884;
    }
    .pm-time mat-icon { font-size: 14px; width: 14px; height: 14px; color: #98a2ab; }

    .context-narrative {
      margin: 0;
      padding: 12px 14px;
      background: #f4f7fb; border-left: 3px solid #1a237e;
      border-radius: 0 10px 10px 0;
      font-size: 13px; color: #455a64; line-height: 1.55;
    }

    /* Healthcare journey timeline */
    .journey { list-style: none; padding: 0; margin: 0; position: relative; }
    .journey::before {
      content: ''; position: absolute; top: 16px; bottom: 16px; left: 15px;
      width: 2px; background: #e3e7f2;
    }
    .j-step {
      display: grid; grid-template-columns: 32px 1fr;
      gap: 12px; align-items: flex-start;
      padding: 6px 0; position: relative;
    }
    .j-icon {
      width: 32px; height: 32px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      background: #e3e7f2; color: #98a2ab; position: relative; z-index: 1;
      box-shadow: 0 0 0 4px white;
    }
    .j-icon mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .j-step.j-done .j-icon { background: #1a237e; color: white; }
    .j-step.j-current .j-icon {
      background: #fff3e0; color: #e65100;
      box-shadow: 0 0 0 4px white, 0 0 0 6px #ffe0b2;
    }
    .j-step.j-pending .j-icon { background: #e3e7f2; color: #98a2ab; }
    .j-body { padding-top: 5px; display: flex; flex-direction: column; gap: 2px; }
    .j-body strong { font-size: 13px; color: #1a237e; font-weight: 600; }
    .j-step.j-pending .j-body strong { color: #98a2ab; font-weight: 500; }
    .j-step.j-current .j-body strong { color: #e65100; }
    .j-body span { font-size: 11px; color: #98a2ab; }

    /* Breakdown */
    .bd-list { display: flex; flex-direction: column; gap: 6px; }
    .bd-row {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 13px; padding: 9px 12px;
      background: #fafbfd; border-radius: 8px;
    }
    .bd-row span { color: #455a64; }
    .bd-row strong { color: #1a237e; font-weight: 600; }
    .bd-row.bd-total {
      background: #eef0fb; margin-top: 4px;
      padding: 11px 12px;
    }
    .bd-row.bd-total span { font-weight: 700; color: #1a237e; }

    /* Insurance */
    .ins-row {
      display: grid; grid-template-columns: 40px 1fr auto;
      gap: 12px; align-items: center;
      padding: 12px 14px;
      background: white; border: 1px solid #e8edf2; border-radius: 12px;
    }
    .ins-icon {
      width: 40px; height: 40px; border-radius: 50%;
      background: #e8f5e9; color: #2e7d32;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .ins-icon mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .ins-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .ins-info strong { font-size: 13px; color: #1a237e; }
    .ins-info span { font-size: 11.5px; color: #6b7884; }
    .ins-covered { text-align: right; font-size: 11px; color: #6b7884; }
    .ins-covered strong { display: block; font-size: 14px; color: #2e7d32; }

    .detail-footer { background: white; }
    .ds-cta {
      width: 100%; height: 44px !important;
      border-radius: 12px !important; font-weight: 600 !important;
    }
    .ds-cta mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* ===== Mobile responsiveness ===== */
    @media (max-width: 720px) {
      h1 { font-size: 20px; }
      .header-actions { width: 100%; }
      .header-btn { flex: 1; justify-content: center; }
      .hb-amount { display: none; }
      .history-controls { flex-direction: row; gap: 8px; align-items: center; }
      .time-btn-desktop { display: none !important; }
      .time-btn-mobile { display: inline-flex; }
      .txn-card { padding: 11px 12px; gap: 10px; }
      .txn-title { font-size: 13.5px; }
      .txn-amount { font-size: 15px; }
      .txn-pay-btn { padding: 0 12px !important; height: 34px !important; }
      .txn-chevron { display: none; }
      .ins-row { grid-template-columns: 36px 1fr; }
      .ins-covered { grid-column: 1 / -1; text-align: left; padding-top: 4px; border-top: 1px dashed #eceff1; }

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
  readonly advanceAmount = signal<number | null>(null);
  readonly advanceTarget = signal('general'); // kept for spec back-compat; no longer surfaced in UI
  readonly advanceRemarks = signal<string>('');
  readonly searchQuery = signal('');
  readonly selectedPeriod = signal(30);
  readonly sheetOpen = signal<SheetMode>(null);
  readonly detailRow = signal<HistoryRow | null>(null);

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
    { id: 'pc-1', name: 'Cardiology Consultation', detail: 'Dr. Walid Al-Habeeb',
      amount: 25, category: 'consultation',
      dueDate: '2026-05-10T09:00:00', dueStatus: 'overdue' },
    { id: 'pc-2', name: 'MRI Brain Scan', detail: 'Radiology — Dr. Adnan Ezzat',
      amount: 120, category: 'radiology',
      dueDate: '2026-05-13T11:00:00', dueStatus: 'due-today' },
    { id: 'pc-3', name: 'Admission Deposit', detail: 'General Surgery — pre-admission',
      amount: 800, category: 'admission',
      dueDate: '2026-05-16T08:00:00', dueStatus: 'due-soon' },
    { id: 'pc-4', name: 'Lab Tests (CBC + Lipid Panel)', detail: 'Diagnostic Lab',
      amount: 47, category: 'lab',
      dueDate: '2026-05-20T10:00:00', dueStatus: 'upcoming' },
    { id: 'pc-5', name: 'Pharmacy — Metformin & Amlodipine', detail: 'Dr. Walid Al-Habeeb prescription',
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

  readonly advanceEventsDesc = computed(() => this.advancePaymentEvents().slice().reverse());

  /** Services the advance balance has actually been used for — derived from the
   *  deduction ledger (distinct categories), not a hardcoded list. */
  readonly appliedTargets = computed<string[]>(() => {
    const labels: Record<AdvanceEvent['category'], string> = {
      advance: '', consultation: 'Consultations', admission: 'Admissions',
      lab: 'Lab & Diagnostics', radiology: 'Radiology',
      medication: 'Pharmacy', procedure: 'Procedures'
    };
    const seen = new Set<string>();
    for (const e of this.advancePaymentEvents()) {
      if (e.type !== 'deducted') continue;
      const label = labels[e.category];
      if (label) seen.add(label);
    }
    return Array.from(seen);
  });

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
    this.advanceAmount.set(null);
    this.advanceRemarks.set('');
    this.showAdvanceForm.set(true);
    this.sheetOpen.set('add');
  }
  switchToAddSheet(): void { this.openAddAdvanceSheet(); }
  closeSheet(): void {
    this.sheetOpen.set(null);
    this.showAdvanceForm.set(false);
    this.detailRow.set(null);
  }

  openDetailSheet(row: HistoryRow): void {
    this.detailRow.set(row);
    this.sheetOpen.set('detail');
  }

  /** Patient-friendly payment method label. */
  payMethodLabel(row: HistoryRow): string {
    if (row.source === 'pending') return 'Awaiting payment';
    if (row.status === 'refunded') return 'Refunded to original payment method';
    if (row.status === 'failed') return 'Payment failed';
    const method = row.method ?? '';
    if (method === 'cash') return 'Paid at Hospital Reception';
    if (method === 'insurance') return 'Paid via Insurance';
    if (method === 'card') return 'Paid Online · Card';
    if (method === 'upi') return 'Paid Online · UPI';
    if (method === 'bank_transfer') return 'Paid Online · Bank Transfer';
    return 'Paid';
  }

  /** Optional second line beneath the payment method label. */
  payMethodSubLabel(row: HistoryRow): string | null {
    if (row.source === 'pending') return 'You can pay online here or at the hospital counter';
    if (row.status === 'refunded') return 'Funds returned to your original payment method';
    if (row.method === 'cash') return 'Cash or card accepted at the counter';
    if (row.method === 'insurance') return 'Claim approved by your insurance provider';
    return null;
  }

  /** Icon for the payment-method block in details. */
  payMethodIcon(row: HistoryRow): string {
    if (row.source === 'pending') return 'schedule';
    if (row.status === 'refunded') return 'undo';
    if (row.status === 'failed') return 'report';
    return this.getMethodIcon(row.method ?? '');
  }

  isOfflinePayment(row: HistoryRow): boolean {
    return row.source === 'payment' && row.method === 'cash';
  }

  getDetailLocation(_row: HistoryRow): string {
    return 'GHH Juffair · Reception, Block A';
  }

  /** Plain-English context about why this payment exists. */
  getContextNarrative(row: HistoryRow): string {
    const doctor = row.doctor || row.rawPayment?.doctorName || 'your doctor';
    const dateLabel = row.date
      ? new Date(row.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : '';
    const cat = row.category ?? this.inferCategory(row.name);

    if (cat === 'consultation') {
      return `Outpatient consultation with ${doctor} on ${dateLabel}. This payment covers the consultation fee and any in-clinic tests done during that visit.`;
    }
    if (cat === 'lab') {
      return `During your consultation with ${doctor} on ${dateLabel}, ${row.name} was prescribed. This payment corresponds to that diagnostic service.`;
    }
    if (cat === 'radiology') {
      return `${row.name} was ordered by ${doctor} as part of your care plan. This payment covers the scan and the radiologist's report.`;
    }
    if (cat === 'admission') {
      return `Admission deposit for ${row.name}. Any unused balance is automatically reconciled and refunded after discharge.`;
    }
    if (cat === 'medication') {
      return `Pharmacy dispensing for the prescription issued by ${doctor}.`;
    }
    if (cat === 'procedure') {
      return `Procedure performed under the care of ${doctor}. This payment covers the procedure room, consumables and clinical team.`;
    }
    return `Healthcare service on ${dateLabel}.`;
  }

  /** Infer a category when the row doesn't already have one. */
  private inferCategory(name: string): string {
    const n = (name || '').toLowerCase();
    if (n.includes('consult')) return 'consultation';
    if (n.includes('lab') || n.includes('blood') || n.includes('panel') || n.includes('cbc') || n.includes('hba1c') || n.includes('lipid')) return 'lab';
    if (n.includes('mri') || n.includes('ct ') || n.includes('x-ray') || n.includes('scan') || n.includes('ecg') || n.includes('ultrasound')) return 'radiology';
    if (n.includes('admission') || n.includes('surgery') || n.includes('deposit')) return 'admission';
    if (n.includes('pharmacy') || n.includes('medication') || n.includes('refill') || n.includes('metformin') || n.includes('amlodipine')) return 'medication';
    if (n.includes('procedure') || n.includes('endoscopy') || n.includes('biopsy')) return 'procedure';
    return 'consultation';
  }

  /** Build the healthcare journey timeline shown in the details sheet. */
  getJourneySteps(row: HistoryRow): JourneyStep[] {
    const cat = row.category ?? this.inferCategory(row.name);
    const isPaid = row.status === 'completed';
    const isRefunded = row.status === 'refunded';
    const isPending = row.source === 'pending' || row.status === 'pending';
    const isFailed = row.status === 'failed';

    const offsetDate = (days: number): string => {
      const d = new Date(row.date); d.setDate(d.getDate() + days);
      return d.toISOString();
    };
    const finalStep = (): JourneyStep => {
      if (isFailed) return { key: 'paid', icon: 'error', label: 'Payment Failed', date: offsetDate(0), state: 'done' };
      if (isRefunded) return { key: 'paid', icon: 'undo', label: 'Refund Issued', date: offsetDate(0), state: 'done' };
      if (isPaid) return { key: 'paid', icon: 'verified', label: 'Payment Paid', date: offsetDate(0), state: 'done' };
      return { key: 'paid', icon: 'verified', label: 'Awaiting Payment', state: 'pending' };
    };

    if (cat === 'consultation') {
      return [
        { key: 'booked', icon: 'event_available', label: 'Appointment Booked', date: offsetDate(-7), state: 'done' },
        { key: 'consult', icon: 'medical_information', label: 'Consultation Completed', date: offsetDate(0), state: 'done' },
        { key: 'charge', icon: 'receipt_long', label: 'Payment Generated', date: offsetDate(0), state: isPending ? 'current' : 'done' },
        finalStep()
      ];
    }
    if (cat === 'lab' || cat === 'radiology') {
      const ord = cat === 'lab' ? 'Test Prescribed' : 'Scan Ordered';
      const bk = cat === 'lab' ? 'Lab Visit Booked' : 'Scan Slot Booked';
      return [
        { key: 'booked', icon: 'event_available', label: 'Appointment Booked', date: offsetDate(-10), state: 'done' },
        { key: 'consult', icon: 'medical_information', label: 'Consultation Completed', date: offsetDate(-7), state: 'done' },
        { key: 'order', icon: 'science', label: ord, date: offsetDate(-7), state: 'done' },
        { key: 'lab', icon: 'biotech', label: bk, date: offsetDate(-3), state: 'done' },
        { key: 'charge', icon: 'receipt_long', label: 'Payment Generated', date: offsetDate(0), state: isPending ? 'current' : 'done' },
        finalStep()
      ];
    }
    if (cat === 'admission') {
      return [
        { key: 'pre', icon: 'event_available', label: 'Pre-admission Counselling', date: offsetDate(-5), state: 'done' },
        { key: 'charge', icon: 'receipt_long', label: 'Admission Deposit Raised', date: offsetDate(0), state: 'done' },
        finalStep()
      ];
    }
    if (cat === 'medication') {
      return [
        { key: 'consult', icon: 'medical_information', label: 'Consultation Completed', date: offsetDate(-2), state: 'done' },
        { key: 'rx', icon: 'medication', label: 'Prescription Issued', date: offsetDate(-2), state: 'done' },
        { key: 'charge', icon: 'receipt_long', label: 'Pharmacy Charge Raised', date: offsetDate(0), state: isPending ? 'current' : 'done' },
        finalStep()
      ];
    }
    return [
      { key: 'booked', icon: 'event_available', label: 'Appointment Booked', date: offsetDate(-5), state: 'done' },
      { key: 'charge', icon: 'receipt_long', label: 'Payment Generated', date: offsetDate(0), state: isPending ? 'current' : 'done' },
      finalStep()
    ];
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

    const remarks = this.advanceRemarks().trim();
    const appliedTo = remarks || 'Advance Payment';

    const newBalance = this.advanceBalance() + amount;
    const newEvent: AdvanceEvent = {
      id: 'ae-' + Date.now(),
      type: 'added',
      amount,
      appliedTo,
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
      description: remarks ? `Advance Payment Added — ${remarks}` : 'Advance Payment Added',
      invoiceNumber: 'ADV-' + Date.now().toString().slice(-6),
      breakdown: [{ label: 'Advance Balance Top-up', amount }]
    };
    this.payments.update(list => [newPayment, ...list]);

    this.showAdvanceForm.set(false);
    this.advanceAmount.set(null);
    this.advanceRemarks.set('');
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
