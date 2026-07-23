import { Component, ChangeDetectionStrategy, HostListener, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { ApiService } from '../../core/services/api.service';
import { OfflineStorageService } from '../../core/services/offline-storage.service';
import { Medication } from '../../core/models/patient.model';
import { firstValueFrom } from 'rxjs';

type RoutinePeriod = 'morning' | 'afternoon' | 'evening' | 'night';
type MedTab = 'active' | 'completed';
type SupplyStatus = 'ok' | 'low' | 'critical' | 'out';

/** Predicted pharmacy supply for one medication, derived from the billed
 *  receipt (dispensed qty + date) against the prescribed daily dose. */
interface SupplyInfo {
  daysLeft: number;
  status: SupplyStatus;
  label: string;        // e.g. "1 day left", "Out of stock"
  runOutLabel: string;  // e.g. "Runs out 22 Jun"
}

interface SessionMed {
  id: string;
  name: string;
  doseLine: string;
  instructions: string;
  isActive: boolean;
  supply: SupplyInfo | null;
}

/** One drug in the Past list, with every prescription of it in that year. */
interface PastGroup {
  key: string;
  name: string;
  dosage: string;
  /** Status of the most recent prescription in the group. */
  isActive: boolean;
  prescribedBy: string;
  spanLabel: string;
  lastEnd: string;
  items: {
    id: string;
    frequency: string;
    instructions: string;
    prescribedBy: string;
    rangeLabel: string;
  }[];
}

interface SessionRoutine {
  period: RoutinePeriod;
  icon: string;
  label: string;
  meds: SessionMed[];
}

@Component({
  selector: 'app-medications',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatMenuModule,
    MatChipsModule, MatSnackBarModule, MatTooltipModule, SkeletonCardComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="meds-page">

      <!-- Header -->
      <div class="page-head">
        <div>
          <h1>My Medications</h1>
          <p class="sub">Organised by routine</p>
        </div>
        @if (isOffline()) {
          <span class="offline-pill"><mat-icon>cloud_off</mat-icon> Offline</span>
        }
      </div>

      <!-- Search + Doctor filter -->
      <div class="filter-row">
        <div class="search-wrap">
          <mat-icon class="s-icon">search</mat-icon>
          <input class="s-input"
                 type="search"
                 name="medication-search"
                 autocomplete="off"
                 [ngModel]="searchQuery()"
                 (ngModelChange)="searchQuery.set($event)"
                 placeholder="Search medication...">
          @if (searchQuery()) {
            <button mat-icon-button class="s-clear" (click)="searchQuery.set('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>

        <!-- Desktop: full button with doctor label -->
        <button mat-stroked-button class="doc-btn doc-btn-desktop" [matMenuTriggerFor]="docMenu">
          <mat-icon class="doc-icon">medical_services</mat-icon>
          <span class="doc-label">{{ selectedDoctor() === 'all' ? 'All doctors' : selectedDoctor() }}</span>
          <mat-icon class="doc-caret" iconPositionEnd>expand_more</mat-icon>
        </button>

        <!-- Mobile: icon-only filter button -->
        <button class="doc-btn-mobile"
                [class.has-filter]="selectedDoctor() !== 'all'"
                [matMenuTriggerFor]="docMenu"
                aria-label="Filter by doctor">
          <mat-icon>tune</mat-icon>
          @if (selectedDoctor() !== 'all') { <span class="doc-dot"></span> }
        </button>

        <mat-menu #docMenu="matMenu">
          <button mat-menu-item (click)="selectedDoctor.set('all')">
            <mat-icon [class.invisible]="selectedDoctor() !== 'all'">check</mat-icon>
            <span>All doctors</span>
          </button>
          @for (doc of allDoctors(); track doc.name) {
            <button mat-menu-item (click)="selectedDoctor.set(doc.name)">
              <mat-icon [class.invisible]="selectedDoctor() !== doc.name">check</mat-icon>
              <span class="doc-option">
                <span class="doc-option-name">{{ doc.name }}</span>
                @if (doc.specialty) {
                  <span class="doc-option-specialty">{{ doc.specialty }}</span>
                }
              </span>
            </button>
          }
        </mat-menu>
      </div>

      <!-- ===== Status tabs + date filter =====
           Two status tabs. The date filter applies to Completed only: Active is
           never date-filtered (a live script must always show), so on Active the
           control is shown disabled rather than removed, keeping the toolbar
           steady across tab switches. On Completed it windows the archive by
           6 / 9 / 12 months or a custom range (max 1 year). -->
      <div class="med-tabs" role="tablist">
        <button class="med-tab" role="tab" [class.on]="tab() === 'active'"
                [attr.aria-selected]="tab() === 'active'" (click)="setTab('active')">
          <span class="dot active-dot"></span>
          Active
          @if (!loading()) { <span class="mt-count">{{ activeMeds().length }}</span> }
        </button>
        <button class="med-tab" role="tab" [class.on]="tab() === 'completed'"
                [attr.aria-selected]="tab() === 'completed'" (click)="setTab('completed')">
          <span class="dot done-dot"></span>
          Completed
        </button>

        <!-- Filter 2 of 2: date. (Filter 1, doctor, sits in the search row.) -->
        @if (tab() === 'completed') {
          <button class="year-btn" [matMenuTriggerFor]="rangeMenu">
            <mat-icon>calendar_today</mat-icon>
            <span>{{ completedRangeLabel() }}</span>
            <mat-icon class="yb-caret">expand_more</mat-icon>
          </button>
          <mat-menu #rangeMenu="matMenu">
            @for (p of completedRangePresets; track p.days) {
              <button mat-menu-item (click)="setCompletedRange(p.days)">
                <mat-icon [class.invisible]="isCompletedCustom() || completedRangeDays() !== p.days">check</mat-icon>
                <span>{{ p.label }}</span>
              </button>
            }
            <button mat-menu-item (click)="openRangePicker()">
              <mat-icon [class.invisible]="!isCompletedCustom()">check</mat-icon>
              <span>Custom range…</span>
            </button>
          </mat-menu>

          <!-- Custom range popover, anchored under the filter button -->
          @if (rangePickerOpen()) {
            <div class="cr-backdrop" (click)="cancelRangePicker()"></div>
            <div class="cr-panel" role="dialog" aria-modal="true" aria-label="Custom date range">
              <div class="cr-head">
                <mat-icon>date_range</mat-icon>
                <strong>Custom range</strong>
              </div>
              <div class="cr-fields">
                <label class="cr-field">
                  <span>From</span>
                  <input type="date" [max]="today"
                         [ngModel]="crFrom()" (ngModelChange)="crFrom.set($event)">
                </label>
                <label class="cr-field">
                  <span>To</span>
                  <input type="date" [min]="crFrom()" [max]="today"
                         [ngModel]="crTo()" (ngModelChange)="crTo.set($event)">
                </label>
              </div>
              @if (crError()) {
                <p class="cr-err">{{ crError() }}</p>
              }
              <div class="cr-actions">
                <button mat-button type="button" (click)="cancelRangePicker()">Cancel</button>
                <button mat-flat-button type="button" class="cr-apply"
                        [disabled]="!!crError() || !crFrom() || !crTo()"
                        (click)="applyRangePicker()">Apply</button>
              </div>
            </div>
          }
        } @else {
          <button class="year-btn is-off" disabled
                  matTooltip="Active medications are always shown, whenever they were prescribed">
            <mat-icon>calendar_today</mat-icon>
            <span>All active</span>
          </button>
        }
      </div>

      <!-- Loading -->
      @if (loading()) {
        @for (i of [1,2,3,4]; track i) {
          <app-skeleton-card [lines]="2" [showAvatar]="true" variant="compact" />
        }
      } @else if (tab() === 'active') {

        <!-- Refill reminder banner — names the meds + how urgent, no click needed -->
        @if (refillNeeded().length) {
          <div class="refill-banner" [class.lapsed]="hasLapsed()" role="status">
            <span class="rb-ic">
              <mat-icon>{{ hasLapsed() ? 'error_outline' : 'inventory_2' }}</mat-icon>
            </span>
            <div class="rb-text">
              <strong>
                {{ refillNeeded().length }} medication{{ refillNeeded().length === 1 ? '' : 's' }} to refill
              </strong>
              <span class="rb-meds">{{ refillBannerLine() }}</span>
            </div>
            <button class="rb-action" (click)="refillAll()">Refill all</button>
          </div>
        }

        <!-- Today's Routine: 4 collapsible session cards -->
        <section class="routine-section" aria-label="Today's routine">
          @for (s of sessionRoutines(); track s.period) {
            <article class="session-card" [class]="'sc-' + s.period"
                     [class.is-empty]="s.meds.length === 0"
                     [class.is-collapsed]="isCollapsed(s.period)">
              <button class="session-head" type="button"
                      (click)="toggleSession(s.period)"
                      [attr.aria-expanded]="!isCollapsed(s.period) && s.meds.length > 0"
                      [disabled]="s.meds.length === 0">
                <span class="sh-icon" [class]="'sh-icon-' + s.period">
                  <mat-icon>{{ s.icon }}</mat-icon>
                </span>
                <span class="sh-text">
                  <strong>{{ s.label }}</strong>
                  <span class="sh-meta">{{ summaryLine(s) }}</span>
                </span>
                @if (s.meds.length > 0) {
                  <mat-icon class="sh-caret">expand_more</mat-icon>
                }
              </button>

              <div class="session-body">
                @if (s.meds.length > 0) {
                  <ul class="sb-list">
                    @for (m of s.meds; track m.id) {
                      <li class="sb-item"
                          [class.needs-refill]="m.supply && m.supply.status !== 'ok'">
                        <span class="sb-bullet" [class]="'sb-bullet-' + s.period"></span>
                        <div class="sb-info">
                          <span class="sb-name">{{ m.name }}</span>
                          @if (m.instructions) {
                            <span class="sb-instr">{{ m.instructions }}</span>
                          }
                          @if (m.supply && m.supply.status !== 'ok') {
                            <span class="sb-supply" [class]="'supply-' + m.supply.status">
                              <mat-icon>{{ m.supply.status === 'out' ? 'error_outline' : 'inventory_2' }}</mat-icon>
                              {{ m.supply.label }}
                            </span>
                          }
                        </div>
                        <div class="sb-right">
                          <span class="sb-dose">{{ m.doseLine }}</span>
                          @if (m.supply && m.supply.status !== 'ok') {
                            <button class="sb-refill" (click)="refill(m.name)">
                              <mat-icon>refresh</mat-icon> Refill
                            </button>
                          }
                        </div>
                      </li>
                    }
                  </ul>
                }
              </div>
            </article>
          }
        </section>

        @if (!activeMeds().length) {
          <div class="empty-state">
            <mat-icon>medication</mat-icon>
            <h3>No active medications</h3>
            <p>Nothing to take right now. Past prescriptions are under the Completed tab.</p>
          </div>
        }

      } @else {

        <!-- ===== COMPLETED: grouped by drug, paginated =====
             Grouped because a repeat prescription would otherwise print the
             same drug 20 times; the group row IS the drug's history, which is
             what answers "when was this prescribed to me?". -->
        @if (!pagedGroups().length) {
          <div class="empty-state">
            <mat-icon>history</mat-icon>
            <h3>No completed medications in this period</h3>
            <p>Try a wider range from the date filter above.</p>
          </div>
        } @else {
          <ul class="past-list">
            @for (g of pagedGroups(); track g.key) {
              <li class="past-item">
                <button class="pi-head" type="button" (click)="toggleGroup(g.key)"
                        [attr.aria-expanded]="isGroupOpen(g.key)">
                  <div class="pi-main">
                    <div class="pi-line-1">
                      <strong>{{ g.name }}</strong>
                      <span class="pi-dose">{{ g.dosage }}</span>
                      <span class="pi-status" [class.on]="g.isActive">
                        {{ g.isActive ? 'Active' : 'Completed' }}
                      </span>
                    </div>
                    <div class="pi-meta">
                      <span><mat-icon>person</mat-icon>{{ g.prescribedBy }}</span>
                      <span class="pi-dot">·</span>
                      <span>{{ g.spanLabel }}</span>
                    </div>
                  </div>
                  <div class="pi-right">
                    @if (g.items.length > 1) {
                      <span class="pi-count">{{ g.items.length }} prescriptions</span>
                    }
                    <mat-icon class="pi-caret" [class.open]="isGroupOpen(g.key)">expand_more</mat-icon>
                  </div>
                </button>

                @if (isGroupOpen(g.key)) {
                  <ul class="pi-history">
                    @for (it of g.items; track it.id) {
                      <li>
                        <span class="ph-date">{{ it.rangeLabel }}</span>
                        <span class="ph-detail">{{ it.frequency }}@if (it.instructions) { · {{ it.instructions }} }</span>
                        <span class="ph-doc">{{ it.prescribedBy }}</span>
                      </li>
                    }
                  </ul>
                }
              </li>
            }
          </ul>

          <!-- Pagination — 15 rows max per page. These lists are archives, so
               they page; Active is a task list and never does. -->
          @if (totalPages() > 1) {
            <div class="pager">
              <button class="pg-arrow" [disabled]="pastPage() === 1"
                      aria-label="Newer" (click)="goToPast(pastPage() - 1)">
                <mat-icon>chevron_left</mat-icon><span>Newer</span>
              </button>
              <span class="pg-pos">Page {{ pastPage() }} of {{ totalPages() }}</span>
              <button class="pg-arrow" [disabled]="pastPage() === totalPages()"
                      aria-label="Older" (click)="goToPast(pastPage() + 1)">
                <span>Older</span><mat-icon>chevron_right</mat-icon>
              </button>
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    .meds-page {
      max-width: 720px; margin: 0 auto; padding-bottom: 60px;
    }

    /* ===== HEADER ===== */
    .page-head {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 14px;
    }
    h1 { font-size: 24px; font-weight: 700; color: #1b3a4b; margin: 0; }
    .sub { color: #888; font-size: 13px; margin: 4px 0 0; }
    .offline-pill {
      display: inline-flex; align-items: center; gap: 4px;
      background: #fff3e0; color: #f57c00;
      padding: 4px 10px; border-radius: 12px;
      font-size: 12px; font-weight: 600;
    }
    .offline-pill mat-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; }

    /* ===== FILTER ROW ===== */
    .filter-row {
      display: flex; gap: 10px; align-items: center;
      margin-bottom: 10px;
    }
    .search-wrap {
      flex: 1; min-width: 0;
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px; height: 40px; box-sizing: border-box;
      background: white; border: 1px solid #e0e8e8; border-radius: 22px;
      transition: border-color 0.18s, box-shadow 0.18s;
    }
    .search-wrap:focus-within {
      border-color: #0d8a8a;
      box-shadow: 0 0 0 3px rgba(13,138,138,0.08);
    }
    .s-icon { color: #5f6b7a; font-size: 20px; width: 20px; height: 20px; }
    .s-input {
      flex: 1; min-width: 0;
      border: none; outline: none; background: transparent;
      font-size: 14px; font-family: inherit; color: #1b3a4b;
    }
    .s-input::placeholder { color: #6b7884; opacity: 1; }
    .s-clear {
      width: 28px !important; height: 28px !important;
      line-height: 28px !important; color: #999;
    }
    .s-clear mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .doc-btn {
      flex-shrink: 0; height: 40px !important;
      border-radius: 22px !important;
      border-color: #d8e3e3 !important; background: white !important;
      color: #1b3a4b !important; font-weight: 500 !important;
      font-size: 13px !important;
      padding: 0 14px !important;
      display: inline-flex !important; align-items: center; gap: 6px;
    }
    .doc-btn .doc-icon {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
      color: #0d8a8a;
    }
    .doc-btn .doc-caret {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      color: #888;
    }
    .doc-label {
      max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .doc-btn-mobile {
      display: none;
      flex-shrink: 0;
      width: 40px; height: 40px; border-radius: 50%;
      background: white; border: 1px solid #d8e3e3;
      align-items: center; justify-content: center;
      cursor: pointer; position: relative;
      color: #1b3a4b;
      transition: border-color 0.15s, background 0.15s;
    }
    .doc-btn-mobile:hover { border-color: #0d8a8a; }
    .doc-btn-mobile.has-filter { background: #e8f5f3; border-color: #0d8a8a; color: #0d8a8a; }
    .doc-btn-mobile mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .doc-btn-mobile .doc-dot {
      position: absolute; top: 6px; right: 6px;
      width: 8px; height: 8px; border-radius: 50%;
      background: #ef6c00; border: 2px solid white;
    }
    .invisible { visibility: hidden; }

    /* Doctor menu option: name on top, specialty muted underneath so the
       patient sees which condition the doctor was consulted for. */
    .doc-option {
      display: inline-flex; flex-direction: column; align-items: flex-start;
      line-height: 1.25; gap: 1px;
    }
    .doc-option-name { font-weight: 600; color: #1b3a4b; }
    .doc-option-specialty { font-size: 12px; color: #0d8a8a; font-weight: 500; }

    /* ===== FILTER CHIPS ===== */
    /* ===== STATUS TABS + YEAR FILTER ===== */
    .med-tabs {
      display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
      position: relative;            /* anchors the custom-range popover */
    }
    .med-tab {
      display: inline-flex; align-items: center; gap: 6px;
      height: 38px; padding: 0 16px; border-radius: 999px;
      border: 1.5px solid #e0e6e6; background: #fff;
      font: inherit; font-size: 13.5px; font-weight: 600; color: #5b6b6b;
      cursor: pointer; transition: all .14s;
    }
    .med-tab:hover { border-color: #80cbc4; color: #0d8a8a; }
    .med-tab.on {
      background: #0d8a8a; border-color: #0d8a8a; color: #fff;
    }
    .med-tab mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .med-tab .dot { width: 8px; height: 8px; border-radius: 50%; background: #4caf50; }
    .med-tab.on .dot { background: #fff; }
    .mt-count {
      font-size: 11.5px; font-weight: 700; padding: 1px 7px; border-radius: 999px;
      background: #eef4f4; color: #0d8a8a;
    }
    .med-tab.on .mt-count { background: rgba(255,255,255,.22); color: #fff; }

    .year-btn {
      display: inline-flex; align-items: center; gap: 5px; margin-left: auto;
      height: 38px; padding: 0 12px; border-radius: 999px;
      border: 1.5px solid #d8e3e3; background: #f7fbfb;
      font: inherit; font-size: 13px; font-weight: 700; color: #00695c;
      cursor: pointer;
    }
    .year-btn:hover:not([disabled]) { background: #e0f2f1; border-color: #80cbc4; }
    .year-btn.is-off { background: #f5f7f7; border-color: #eceff1; color: #b0bec5; cursor: default; }
    .year-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .yb-caret { opacity: .6; }

    /* ---------- Active-tab custom date-range popover ---------- */
    .cr-backdrop { position: fixed; inset: 0; z-index: 40; }
    .cr-panel {
      position: absolute; top: calc(100% + 8px); right: 0; z-index: 41;
      width: 300px; max-width: calc(100vw - 32px);
      background: #fff; border: 1px solid #d8e3e3; border-radius: 14px;
      box-shadow: 0 12px 32px rgba(0,0,0,.16);
      padding: 14px; animation: crPop 140ms cubic-bezier(.16,1,.3,1);
    }
    @keyframes crPop {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .cr-head { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
    .cr-head mat-icon { color: #0d8a8a; font-size: 18px; width: 18px; height: 18px; }
    .cr-head strong { font-size: 13.5px; color: #1b3a4b; }
    .cr-fields { display: flex; flex-direction: column; gap: 10px; }
    .cr-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #607d8b; font-weight: 600; }
    .cr-field input {
      height: 38px; padding: 0 10px; border: 1.5px solid #d8e3e3; border-radius: 9px;
      font: inherit; font-size: 13px; color: #1b3a4b; background: #fff;
    }
    .cr-field input:focus { outline: none; border-color: #0d8a8a; }
    .cr-err { margin: 10px 0 0; font-size: 12px; color: #d32f2f; font-weight: 600; line-height: 1.4; }
    .cr-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
    .cr-apply { background: #0d8a8a !important; color: #fff !important; }

    /* ===== PAST MEDICATIONS ===== */
    .past-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .past-item {
      background: #fff; border: 1px solid #e9eeee; border-radius: 12px; overflow: hidden;
    }
    .pi-head {
      display: flex; align-items: center; gap: 12px; width: 100%;
      padding: 12px 14px; border: none; background: transparent;
      font: inherit; text-align: left; cursor: pointer;
    }
    .pi-head:hover { background: #fafcfc; }
    .pi-main { flex: 1; min-width: 0; }
    .pi-line-1 { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .pi-line-1 strong { font-size: 14.5px; color: #1b3a4b; }
    .pi-dose { font-size: 12.5px; color: #78909c; }
    .pi-status.on { background: #e8f5e9; color: #2e7d32; }
    .pi-status {
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
      padding: 2px 8px; border-radius: 6px; background: #eceff1; color: #78909c;
    }
    .pi-meta {
      display: flex; align-items: center; gap: 5px; margin-top: 3px;
      font-size: 12px; color: #8a9a9a;
    }
    .pi-meta mat-icon { font-size: 13px; width: 13px; height: 13px; vertical-align: -2px; margin-right: 2px; }
    .pi-dot { color: #cfd8dc; }
    .pi-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .pi-count {
      font-size: 11px; font-weight: 700; color: #0d8a8a;
      background: #e0f2f1; padding: 3px 9px; border-radius: 999px; white-space: nowrap;
    }
    .pi-caret { color: #b0bec5; transition: transform .16s; }
    .pi-caret.open { transform: rotate(180deg); }

    .pi-history {
      list-style: none; margin: 0; padding: 4px 14px 12px 14px;
      border-top: 1px dashed #eef2f2;
    }
    .pi-history li {
      display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline;
      padding: 8px 0; border-bottom: 1px solid #f4f7f7;
    }
    .pi-history li:last-child { border-bottom: none; }
    .ph-date { font-size: 12.5px; font-weight: 700; color: #1b3a4b; min-width: 165px; }
    .ph-detail { font-size: 12.5px; color: #607d8b; flex: 1; min-width: 0; }
    .ph-doc { font-size: 11.5px; color: #a5b0b0; }

    /* ===== PAGER (Past only) ===== */
    .pager {
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px; margin-top: 16px;
    }
    .pg-arrow {
      display: inline-flex; align-items: center; justify-content: center; gap: 4px;
      min-height: 44px; padding: 0 16px;
      border: 1.5px solid #d8e3e3; border-radius: 12px; background: #fff;
      font: inherit; font-size: 13.5px; font-weight: 700; color: #00695c; cursor: pointer;
    }
    .pg-arrow:hover:not([disabled]) { background: #e0f2f1; border-color: #80cbc4; }
    .pg-arrow[disabled] { color: #b0bec5; border-color: #eceff1; cursor: default; }
    .pg-arrow mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .pg-pos { font-size: 13px; font-weight: 700; color: #1b3a4b; }

    .empty-state {
      text-align: center; padding: 44px 20px; color: #90a4ae;
    }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; color: #cfd8dc; }
    .empty-state h3 { margin: 10px 0 4px; font-size: 15px; color: #607d8b; }
    .empty-state p { margin: 0; font-size: 13px; }

    @media (max-width: 600px) {
      .pg-arrow span { display: none; }
      .pg-arrow { flex: 0 0 56px; padding: 0; min-height: 48px; }
      .ph-date { min-width: 100%; }
    }

    /* ===== TODAY'S ROUTINE — SESSION CARDS ===== */
    .routine-section {
      display: flex; flex-direction: column; gap: 10px;
    }
    .session-card {
      background: white;
      border: 1px solid #eef2f3;
      border-radius: 14px;
      overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .session-card:not(.is-empty):hover {
      border-color: #d8e8e6;
    }

    /* Header row (always visible) */
    .session-head {
      width: 100%;
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px;
      background: transparent; border: none;
      cursor: pointer;
      text-align: left; font-family: inherit;
      transition: background 0.15s;
    }
    .session-head:hover:not(:disabled) { background: #fafcfc; }
    .session-head:disabled { cursor: default; opacity: 0.9; }
    .session-head:focus-visible {
      outline: 2px solid #0d8a8a; outline-offset: -2px;
    }

    .sh-icon {
      flex-shrink: 0;
      width: 38px; height: 38px; border-radius: 12px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .sh-icon mat-icon {
      font-size: 20px !important; width: 20px !important; height: 20px !important;
    }
    .sh-icon-morning   { background: #fff2dc; color: #ef6c00; }
    .sh-icon-afternoon { background: #fff7d6; color: #b07900; }
    .sh-icon-evening   { background: #ede7f6; color: #5e35b1; }
    .sh-icon-night     { background: #e3e7f7; color: #3949ab; }

    .sh-text { display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 2px; }
    .sh-text strong {
      font-size: 15px; color: #1b3a4b; font-weight: 700;
    }
    .sh-meta { font-size: 12.5px; color: #6b7884; }

    .is-empty .sh-text strong { color: #6b7884; font-weight: 600; }
    .is-empty .sh-meta { color: #98a2ab; font-style: italic; }
    .is-empty .sh-icon { opacity: 0.55; }

    .sh-caret {
      flex-shrink: 0; color: #98a2ab;
      transition: transform 0.25s ease;
      font-size: 22px !important; width: 22px !important; height: 22px !important;
    }
    .is-collapsed .sh-caret { transform: rotate(-90deg); }

    /* Body (expandable) */
    .session-body {
      display: grid;
      grid-template-rows: 1fr;
      transition: grid-template-rows 0.28s ease;
    }
    .is-collapsed .session-body { grid-template-rows: 0fr; }
    .session-body > * {
      overflow: hidden;
      min-height: 0;
    }
    .sb-list {
      list-style: none; margin: 0;
      padding: 4px 14px 14px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .sb-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px;
      background: #f9fbfb;
      border-radius: 10px;
    }
    .sb-bullet {
      flex-shrink: 0;
      width: 8px; height: 8px; border-radius: 50%;
      background: #c0c8d0;
    }
    .sb-bullet-morning   { background: #ef6c00; }
    .sb-bullet-afternoon { background: #f9a825; }
    .sb-bullet-evening   { background: #5e35b1; }
    .sb-bullet-night     { background: #3949ab; }
    .sb-info { display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 2px; }
    .sb-name { font-size: 14px; color: #1b3a4b; font-weight: 600; }
    .sb-instr { font-size: 11.5px; color: #98a2ab; line-height: 1.3; }
    .sb-right {
      flex-shrink: 0;
      display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
    }
    .sb-dose {
      flex-shrink: 0;
      font-size: 12px; font-weight: 700; color: #0d8a8a;
      background: #e8f5f3; padding: 4px 10px; border-radius: 8px;
      letter-spacing: 0.2px;
    }

    /* Per-med supply badge (days left) */
    .sb-supply {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11.5px; font-weight: 700; line-height: 1;
      padding: 3px 8px; border-radius: 7px; margin-top: 2px;
      width: fit-content;
    }
    .sb-supply mat-icon {
      font-size: 13px !important; width: 13px !important; height: 13px !important;
    }
    .supply-low      { background: #fff4e0; color: #c66a00; }
    .supply-critical { background: #fdeceb; color: #d23b30; }
    .supply-out      { background: #fdeceb; color: #b71c1c; }

    .sb-item.needs-refill { background: #fffaf3; }

    /* One-tap refill on the med row */
    .sb-refill {
      display: inline-flex; align-items: center; gap: 3px;
      border: 1px solid #f0b46a; background: white; color: #c66a00;
      font-family: inherit; font-size: 11.5px; font-weight: 700;
      padding: 4px 10px; border-radius: 14px; cursor: pointer;
      white-space: nowrap; transition: all 0.15s;
    }
    .sb-refill:hover { background: #c66a00; border-color: #c66a00; color: white; }
    .sb-refill mat-icon {
      font-size: 14px !important; width: 14px !important; height: 14px !important;
    }

    /* ===== REFILL REMINDER BANNER ===== */
    .refill-banner {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; margin-bottom: 12px;
      background: linear-gradient(135deg, #fff6e9, #fff1de);
      border: 1px solid #f3d6a8; border-radius: 14px;
    }
    .rb-ic {
      flex-shrink: 0;
      width: 38px; height: 38px; border-radius: 11px;
      display: inline-flex; align-items: center; justify-content: center;
      background: #ffe6c2; color: #c66a00;
    }
    .rb-ic mat-icon { font-size: 20px !important; width: 20px !important; height: 20px !important; }
    .rb-text { display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 2px; }
    .rb-text strong { font-size: 14px; color: #8a4b00; font-weight: 700; }
    .rb-meds { font-size: 12.5px; color: #a9762f; font-weight: 600; }
    .rb-action {
      flex-shrink: 0;
      border: none; background: #c66a00; color: white;
      font-family: inherit; font-size: 12.5px; font-weight: 700;
      padding: 8px 14px; border-radius: 10px; cursor: pointer;
      transition: background 0.15s;
    }
    .rb-action:hover { background: #a85900; }

    /* Lapsed variant — at least one med has already run out */
    .refill-banner.lapsed {
      background: linear-gradient(135deg, #fdeceb, #fce4e2);
      border-color: #f3b6b0;
    }
    .refill-banner.lapsed .rb-ic { background: #f8cec9; color: #c0392b; }
    .refill-banner.lapsed .rb-text strong { color: #a32820; }
    .refill-banner.lapsed .rb-meds { color: #c0564c; }
    .refill-banner.lapsed .rb-action { background: #c0392b; }
    .refill-banner.lapsed .rb-action:hover { background: #9e2c20; }

    /* ===== FOOTER COUNT ===== */
    .result-count {
      font-size: 12px; color: #98a2ab; margin: 16px 4px 0;
      text-align: center;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 600px) {
      h1 { font-size: 20px; }
      .doc-btn-desktop { display: none !important; }
      .doc-btn-mobile { display: inline-flex; }
      .filter-row { gap: 8px; }
      .session-head { padding: 11px 12px; gap: 10px; }
      .sh-icon { width: 34px; height: 34px; border-radius: 10px; }
      .sh-icon mat-icon {
        font-size: 18px !important; width: 18px !important; height: 18px !important;
      }
      .sh-text strong { font-size: 14px; }
      .sh-meta { font-size: 12px; }
      .sb-list { padding: 2px 12px 12px; }
      .sb-item { padding: 9px 10px; gap: 10px; }
      .sb-name { font-size: 13.5px; }
      .sb-instr { font-size: 11px; }
      .sb-dose { font-size: 11.5px; padding: 3px 8px; }
    }
  `]
})
export class MedicationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly offlineStorage = inject(OfflineStorageService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly medications = signal<Medication[]>([]);
  readonly searchQuery = signal('');
  readonly selectedDoctor = signal<string>('all');

  // ---- Status tabs (Active is the default surface) ----------------
  readonly tab = signal<MedTab>('active');
  readonly pastPage = signal(1);
  /** 15 rows max per page, however wide the date range gets. */
  readonly PAGE_SIZE = 15;

  // ---- Completed-tab date range -----------------------------------
  // Windows the completed archive by when each script ended. Presets plus a
  // custom range; the custom span is capped at one year (MAX_RANGE_DAYS).
  // Active is never date-filtered — a live script must show whenever it was
  // prescribed — so this state applies to the Completed tab only.
  readonly completedRangePresets = [
    { days: 180, label: 'Last 6 months' },
    { days: 270, label: 'Last 9 months' },
    { days: 365, label: 'Last 1 year' }
  ];
  readonly COMPLETED_CUSTOM = -1;
  readonly MAX_RANGE_DAYS = 366;
  /** Default: last 6 months. */
  readonly completedRangeDays = signal<number>(180);
  readonly isCompletedCustom = computed(() => this.completedRangeDays() === this.COMPLETED_CUSTOM);
  readonly today = new Date().toISOString().slice(0, 10);

  /** Committed custom range (empty unless a custom range is active). */
  readonly completedFrom = signal('');
  readonly completedTo = signal('');
  /** Draft values bound to the picker inputs. */
  readonly crFrom = signal('');
  readonly crTo = signal('');
  readonly rangePickerOpen = signal(false);

  /** Label on the date-filter button. */
  readonly completedRangeLabel = computed<string>(() => {
    if (this.isCompletedCustom()) {
      const fmt = (iso: string) => {
        const d = new Date(iso);
        return Number.isNaN(d.getTime())
          ? iso
          : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      };
      return `${fmt(this.completedFrom())} – ${fmt(this.completedTo())}`;
    }
    return this.completedRangePresets.find(p => p.days === this.completedRangeDays())?.label ?? 'Last 6 months';
  });

  /** Validation for the draft custom range (empty = valid). */
  readonly crError = computed<string>(() => {
    const from = this.crFrom();
    const to = this.crTo();
    if (!from || !to) return '';
    if (from > to) return 'The "From" date must be on or before the "To" date.';
    if (to > this.today) return 'The "To" date cannot be in the future.';
    const spanDays = (Date.parse(to) - Date.parse(from)) / 86_400_000;
    if (spanDays > this.MAX_RANGE_DAYS) {
      return 'You can select up to 1 year at a time. Shorten the range and try again.';
    }
    return '';
  });
  private readonly openGroups = signal<ReadonlySet<string>>(new Set());
  readonly isOffline = signal(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  // Sessions collapsed by user. Default: all expanded (empty set).
  readonly collapsedSessions = signal<ReadonlySet<RoutinePeriod>>(new Set());

  private readonly periods: RoutinePeriod[] = ['morning', 'afternoon', 'evening', 'night'];

  private readonly periodLabels: Record<RoutinePeriod, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    night: 'Night'
  };

  /** Unique prescribers with their specialty, for the doctor filter menu.
   *  Specialty is shown under the name so the patient can tell which
   *  condition each doctor was consulted for (e.g. Cardiology vs Endocrinology). */
  readonly allDoctors = computed<{ name: string; specialty: string }[]>(() => {
    const map = new Map<string, string>();
    this.medications().forEach(m => {
      if (!map.has(m.prescribedBy)) map.set(m.prescribedBy, m.prescribedBySpecialty ?? '');
    });
    return Array.from(map, ([name, specialty]) => ({ name, specialty }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  /** Meds visible after applying search and doctor only — status is the tab. */
  private readonly visibleMeds = computed<Medication[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const doc = this.selectedDoctor();

    return this.medications().filter(m => {
      if (doc !== 'all' && m.prescribedBy !== doc) return false;
      if (q && !m.name.toLowerCase().includes(q) && !m.dosage.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  /**
   * Everything currently being taken, whatever year it was prescribed in — the
   * Active tab is never date-filtered by design (a live script must always
   * show). Feeds the routine sessions, refill banner and count. Search + doctor
   * already applied via visibleMeds.
   */
  readonly activeMeds = computed<Medication[]>(() =>
    this.visibleMeds().filter(m => this.isActive(m))
  );

  /** Stopped / completed prescriptions — the archive. */
  private readonly pastMeds = computed<Medication[]>(() =>
    this.visibleMeds().filter(m => !this.isActive(m))
  );

  /** Completed prescriptions within the selected date range, keyed off when
   *  each script ended (falling back to its start date). */
  private readonly rangedPastMeds = computed<Medication[]>(() => {
    const meds = this.pastMeds();
    const dateOf = (m: Medication) => (m.endDate ?? m.startDate).slice(0, 10);
    if (this.isCompletedCustom()) {
      const from = this.completedFrom();
      const to = this.completedTo();
      return meds.filter(m => {
        const d = dateOf(m);
        return (!from || d >= from) && (!to || d <= to);
      });
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.completedRangeDays());
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    return meds.filter(m => dateOf(m) >= cutoffIso);
  });

  /**
   * Rows for the Completed tab, grouped by drug + strength. A repeat course
   * produces one row carrying the whole span and a count, expandable into the
   * individual prescriptions — otherwise the same drug prints 20 times.
   */
  readonly pastGroups = computed<PastGroup[]>(() => {
    const source = this.rangedPastMeds();

    const map = new Map<string, Medication[]>();
    for (const m of source) {
      const key = `${m.name}|${m.dosage}`;
      const bucket = map.get(key);
      if (bucket) bucket.push(m);
      else map.set(key, [m]);
    }

    return [...map.entries()]
      .map(([key, meds]) => {
        const sorted = [...meds].sort((a, b) =>
          (b.endDate ?? b.startDate).localeCompare(a.endDate ?? a.startDate));
        const earliest = sorted[sorted.length - 1];
        const latest = sorted[0];
        return {
          key,
          name: latest.name,
          dosage: latest.dosage,
          isActive: this.isActive(latest),
          prescribedBy: latest.prescribedBy,
          spanLabel: this.rangeLabel(earliest.startDate, latest.endDate),
          lastEnd: latest.endDate ?? latest.startDate,
          items: sorted.map(m => ({
            id: m.id,
            frequency: m.frequency,
            instructions: m.instructions ?? '',
            prescribedBy: m.prescribedBy,
            rangeLabel: this.rangeLabel(m.startDate, m.endDate)
          }))
        };
      })
      .sort((a, b) => b.lastEnd.localeCompare(a.lastEnd));
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.pastGroups().length / this.PAGE_SIZE))
  );

  /** Clamped on read, so a filter change that shrinks the list can never
   *  strand the patient on an empty page. */
  readonly pagedGroups = computed<PastGroup[]>(() => {
    const page = Math.min(this.pastPage(), this.totalPages());
    const start = (page - 1) * this.PAGE_SIZE;
    return this.pastGroups().slice(start, start + this.PAGE_SIZE);
  });

  /** Today's Routine: 4 sessions, each with its meds. Active only. */
  readonly sessionRoutines = computed<SessionRoutine[]>(() => {
    const meds = this.activeMeds();
    return this.periods.map(p => ({
      period: p,
      icon: this.periodIcon(p),
      label: this.periodLabels[p],
      meds: meds
        .filter(m => this.getTimeBlocksFor(m).includes(p))
        .map(m => ({
          id: m.id,
          name: m.name,
          doseLine: this.getDoseLine(m),
          instructions: m.instructions ?? '',
          isActive: this.isActive(m),
          supply: this.supplyInfo(m)
        }))
    }));
  });

  readonly totalActiveMeds = computed<number>(() => this.activeMeds().length);

  // ---- Tab / paging behaviour -------------------------------------
  setTab(t: MedTab): void {
    this.tab.set(t);
    this.pastPage.set(1);
  }

  // ---- Completed-tab date-range behaviour --------------------------
  /** Pick a preset window; clears any committed custom range. */
  setCompletedRange(days: number): void {
    this.completedRangeDays.set(days);
    this.completedFrom.set('');
    this.completedTo.set('');
    this.pastPage.set(1);
  }

  /** Open the custom-range popover, seeding the draft from the committed range
   *  or a sensible default (last 6 months) so it never opens empty. */
  openRangePicker(): void {
    if (this.completedFrom() && this.completedTo()) {
      this.crFrom.set(this.completedFrom());
      this.crTo.set(this.completedTo());
    } else {
      const start = new Date();
      start.setDate(start.getDate() - 180);
      this.crFrom.set(start.toISOString().slice(0, 10));
      this.crTo.set(this.today);
    }
    this.rangePickerOpen.set(true);
  }

  cancelRangePicker(): void {
    this.rangePickerOpen.set(false);
  }

  applyRangePicker(): void {
    if (this.crError() || !this.crFrom() || !this.crTo()) return;
    this.completedFrom.set(this.crFrom());
    this.completedTo.set(this.crTo());
    this.completedRangeDays.set(this.COMPLETED_CUSTOM);
    this.rangePickerOpen.set(false);
    this.pastPage.set(1);
  }

  @HostListener('document:keydown.escape')
  onEscapeRangePicker(): void {
    if (this.rangePickerOpen()) this.cancelRangePicker();
  }

  goToPast(target: number): void {
    this.pastPage.set(Math.min(Math.max(1, target), this.totalPages()));
  }

  isGroupOpen(key: string): boolean {
    return this.openGroups().has(key);
  }

  toggleGroup(key: string): void {
    this.openGroups.update(s => {
      const next = new Set(s);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  /** "12 Feb 2024 – 08 Aug 2024", or "Since 12 Feb 2024" when still open. */
  private rangeLabel(start: string, end?: string): string {
    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return end ? `${fmt(start)} – ${fmt(end)}` : `Since ${fmt(start)}`;
  }

  /** Active meds predicted to run out soon (low / critical / out), de-duped —
   *  drives the "running low" reminder banner. */
  readonly refillNeeded = computed<{ med: Medication; supply: SupplyInfo }[]>(() =>
    this.activeMeds()
      .map(m => ({ med: m, supply: this.supplyInfo(m) }))
      .filter((x): x is { med: Medication; supply: SupplyInfo } =>
        x.supply !== null && x.supply.status !== 'ok')
      .sort((a, b) => a.supply.daysLeft - b.supply.daysLeft)
  );

  /** Names the low meds with their status, most urgent first — so the banner
   *  answers "which ones, and how bad" without the patient opening anything. */
  readonly refillBannerLine = computed<string>(() => {
    const items = this.refillNeeded();
    const named = items.slice(0, 2)
      .map(x => `${x.med.name} — ${x.supply.label.toLowerCase()}`);
    let line = named.join('   ·   ');
    if (items.length > 2) line += `   ·   +${items.length - 2} more`;
    return line;
  });

  /** True when at least one med has already run out (the dangerous case). */
  readonly hasLapsed = computed<boolean>(() =>
    this.refillNeeded().some(x => x.supply.status === 'out')
  );

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.isOffline.set(false));
      window.addEventListener('offline', () => this.isOffline.set(true));
    }
    this.loadMedications();
  }

  private async loadMedications(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.api.getMedications().subscribe(async meds => {
        this.medications.set(meds);
        this.loading.set(false);
        for (const med of meds) {
          await firstValueFrom(this.offlineStorage.put('medications', med));
        }
      });
    } else {
      this.offlineStorage.getAll<Medication>('medications').subscribe(meds => {
        this.medications.set(meds);
        this.loading.set(false);
      });
    }
  }

  // -------- Display helpers --------

  isActive(med: Medication): boolean {
    if (!med.endDate) return true;
    return new Date(med.endDate) >= new Date();
  }

  isCollapsed(p: RoutinePeriod): boolean {
    return this.collapsedSessions().has(p);
  }

  toggleSession(p: RoutinePeriod): void {
    this.collapsedSessions.update(s => {
      const next = new Set(s);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  }

  summaryLine(s: SessionRoutine): string {
    if (s.meds.length === 0) return 'No medication';
    return `${s.meds.length} med${s.meds.length === 1 ? '' : 's'}`;
  }

  private getDoseLine(med: Medication): string {
    const form = this.detectMedForm(med);
    if (form === 'Drops') return '2 Drops';
    if (form === 'Syrup') return '1 Dose';
    if (form === 'Cream') return 'Apply';
    return `1 ${form}`;
  }

  private detectMedForm(med: Medication): string {
    const name = (med.name || '').toLowerCase();
    const dose = (med.dosage || '').toLowerCase();
    if (name.includes('capsule') || dose.includes('capsule') || dose.includes('cap')) return 'Capsule';
    if (name.includes('syrup') || dose.includes('ml')) return 'Syrup';
    if (name.includes('drop')) return 'Drops';
    if (name.includes('cream') || name.includes('ointment')) return 'Cream';
    return 'Tablet';
  }

  private getTimeBlocksFor(med: Medication): RoutinePeriod[] {
    const freq = (med.frequency || '').toLowerCase();
    const inst = (med.instructions || '').toLowerCase();
    if (freq.includes('four') || freq.includes('4 times')) {
      return ['morning', 'afternoon', 'evening', 'night'];
    }
    if (freq.includes('three') || freq.includes('3 times')) {
      return ['morning', 'afternoon', 'evening'];
    }
    if (freq.includes('twice') || freq.includes('two')) {
      return ['morning', 'evening'];
    }
    if (inst.includes('night') || inst.includes('bedtime')) return ['night'];
    if (inst.includes('evening')) return ['evening'];
    if (inst.includes('afternoon')) return ['afternoon'];
    if (inst.includes('morning')) return ['morning'];
    if (inst.includes('with meal')) return ['morning', 'afternoon', 'evening'];
    return ['morning'];
  }

  private periodIcon(p: RoutinePeriod): string {
    const map: Record<RoutinePeriod, string> = {
      morning: 'wb_sunny',
      afternoon: 'wb_twilight',
      evening: 'brightness_3',
      night: 'dark_mode'
    };
    return map[p];
  }

  // -------- Refill / supply prediction --------

  /** Units the patient consumes per day, parsed from the prescribed frequency
   *  and multiplied by units-per-dose (defaults to 1). */
  private dailyDose(med: Medication): number {
    const f = (med.frequency || '').toLowerCase();
    let perDay = 1;
    if (f.includes('four') || f.includes('4 times')) perDay = 4;
    else if (f.includes('three') || f.includes('3 times')) perDay = 3;
    else if (f.includes('twice') || f.includes('two')) perDay = 2;
    else perDay = 1; // "Once daily" / unspecified → 1
    return perDay * (med.unitsPerDose ?? 1);
  }

  /** Predicts run-out from the billed receipt: dispensed qty ÷ daily dose,
   *  counted forward from the dispense date. Returns null when the receipt
   *  data isn't available (legacy rows), so nothing is shown rather than a guess. */
  supplyInfo(med: Medication): SupplyInfo | null {
    if (med.dispensedQty == null || !med.dispensedDate) return null;
    const perDay = this.dailyDose(med);
    if (perDay <= 0) return null;

    const daysSupply = Math.floor(med.dispensedQty / perDay);
    const dispensed = new Date(med.dispensedDate); dispensed.setHours(0, 0, 0, 0);
    const runOut = new Date(dispensed); runOut.setDate(runOut.getDate() + daysSupply);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((runOut.getTime() - today.getTime()) / 86_400_000);

    const status: SupplyStatus =
      daysLeft < 0 ? 'out' : daysLeft <= 2 ? 'critical' : daysLeft <= 7 ? 'low' : 'ok';

    let label: string;
    if (daysLeft < 0) {
      const over = -daysLeft;
      label = `Ran out ${over} day${over === 1 ? '' : 's'} ago`;
    } else if (daysLeft === 0) label = 'Runs out today';
    else if (daysLeft === 1) label = 'Runs out tomorrow';
    else label = `${daysLeft} days left`;

    const runOutLabel = (daysLeft < 0 ? 'Ran out ' : 'Runs out ') +
      runOut.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

    return { daysLeft, status, label, runOutLabel };
  }

  /** POC: a refill request would post to the pharmacy queue / create a refill
   *  order. For now we acknowledge it so the flow is demonstrable. */
  refill(name: string): void {
    this.snackBar.open(
      `Refill requested for ${name}. The pharmacy will prepare your order for pickup.`,
      'OK',
      { duration: 4000 }
    );
  }

  refillAll(): void {
    const names = this.refillNeeded().map(x => x.med.name);
    if (!names.length) return;
    this.snackBar.open(
      `Refill requested for ${names.length} medication${names.length === 1 ? '' : 's'}. The pharmacy will prepare your order.`,
      'OK',
      { duration: 4000 }
    );
  }
}
