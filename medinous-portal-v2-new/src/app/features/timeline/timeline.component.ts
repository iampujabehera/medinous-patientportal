import { Component, ChangeDetectionStrategy, ElementRef, HostListener, inject, NgZone, OnInit, AfterViewInit, OnDestroy, signal, computed, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { ApiService } from '../../core/services/api.service';
import { TimelineEvent } from '../../core/models/patient.model';

interface TimePeriod { label: string; short: string; days: number; }
interface CategoryFilter {
  value: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatChipsModule,
    MatMenuModule, MatDividerModule, MatInputModule, MatFormFieldModule, MatSelectModule,
    MatDialogModule, MatTooltipModule, MatSnackBarModule,
    SkeletonCardComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-head">
        <div>
          <h1>My Records</h1>
          <p class="sub">Your complete health history in one place</p>
        </div>
        <button mat-flat-button class="upload-btn" (click)="showUpload.set(true)">
          <mat-icon>cloud_upload</mat-icon> Upload
        </button>
      </div>

      <!-- Search + Period dropdown row -->
      <div class="filter-row">
        <div class="search-wrap">
          <mat-icon class="s-icon">search</mat-icon>
          <input class="s-input"
                 type="search"
                 name="records-search"
                 autocomplete="off"
                 [ngModel]="searchQuery()"
                 (ngModelChange)="setSearch($event)"
                 placeholder="Search records, providers...">
          @if (searchQuery()) {
            <button mat-icon-button class="s-clear" (click)="setSearch('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>
        <button mat-stroked-button class="period-btn" [matMenuTriggerFor]="periodMenu">
          <mat-icon class="period-icon">event</mat-icon>
          <span class="period-label">{{ getPeriodLabel() }}</span>
          <mat-icon class="period-caret">expand_more</mat-icon>
        </button>
        <!-- Period menu is YEAR-based: a patient's last visit is routinely more
             than 30 or 90 days old, so day-window presets show an empty screen
             to exactly the patients who visit least often. Years always hit. -->
        <mat-menu #periodMenu="matMenu">
          @for (y of recordYears(); track y) {
            <button mat-menu-item (click)="selectYear(y)">
              <mat-icon [class.invisible]="!isYear(y)">check</mat-icon>
              <span>{{ y }}</span>
            </button>
          }
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="openCustomRange()">
            <mat-icon [class.invisible]="!isCustom()">check</mat-icon>
            <span>Custom range…</span>
          </button>
        </mat-menu>

        <!-- Custom range popover, anchored under the period button -->
        @if (customPickerOpen()) {
          <div class="cr-backdrop" (click)="cancelCustomRange()"></div>
          <div class="cr-panel" role="dialog" aria-modal="true" aria-label="Custom date range">
            <div class="cr-head">
              <mat-icon>date_range</mat-icon>
              <strong>Custom range</strong>
            </div>

            <div class="cr-fields">
              <label class="cr-field">
                <span>From</span>
                <input type="date" [max]="crFrom() ? (crTo() || today) : today"
                       [ngModel]="crFrom()" (ngModelChange)="crFrom.set($event)">
              </label>
              <label class="cr-field">
                <span>To</span>
                <input type="date" [min]="crFrom()" [max]="today"
                       [ngModel]="crTo()" (ngModelChange)="crTo.set($event)">
              </label>
            </div>

            <!-- One-tap shortcuts for the ranges a date picker makes tedious -->
            <div class="cr-quick">
              @for (q of quickRanges; track q.label) {
                <button type="button" class="cr-quick-btn" (click)="applyQuick(q.days)">
                  {{ q.label }}
                </button>
              }
            </div>

            @if (crError()) {
              <p class="cr-err">{{ crError() }}</p>
            }

            <div class="cr-actions">
              <button mat-button type="button" (click)="cancelCustomRange()">Cancel</button>
              <button mat-flat-button type="button" class="cr-apply"
                      [disabled]="!!crError() || !crFrom() || !crTo()"
                      (click)="applyCustomRange()">Apply</button>
            </div>
          </div>
        }
      </div>

      <!-- Category filter chips with icons -->
      <div class="cat-chips">
        @for (cat of categories; track cat.value) {
          <button class="cat-chip"
                  [class.active]="activeFilter() === cat.value"
                  (click)="setCategory(cat.value)">
            <mat-icon>{{ cat.icon }}</mat-icon>
            <span>{{ cat.label }}</span>
          </button>
        }
      </div>

      <!-- Spacing only. No counts line here: the header already states the
           total and each month heading states its own. -->
      <div class="list-anchor" #listTop></div>

      <!-- Upload panel (unchanged) -->
      @if (showUpload()) {
        <mat-card class="upload-card">
          <div class="uc-header">
            <strong>Upload Document</strong>
            <button mat-icon-button (click)="showUpload.set(false)"><mat-icon>close</mat-icon></button>
          </div>
          <div class="uc-drop" (click)="fileInput.click()">
            <mat-icon>cloud_upload</mat-icon>
            <p>Tap to select file</p>
            <span>PDF, JPG, PNG (max 25 MB)</span>
            <input #fileInput type="file" hidden accept=".pdf,.jpg,.jpeg,.png" (change)="onFileSelected($event)">
          </div>
          @if (uploadFileName()) {
            <div class="uc-file">
              <mat-icon>insert_drive_file</mat-icon>
              <span>{{ uploadFileName() }}</span>
              <button mat-icon-button (click)="uploadFileName.set('')"><mat-icon>close</mat-icon></button>
            </div>
          }
          <mat-form-field appearance="outline" class="uc-field">
            <mat-label>Document type</mat-label>
            <mat-select [ngModel]="uploadType()" (ngModelChange)="uploadType.set($event)">
              <mat-option value="lab_result">Lab Report</mat-option>
              <mat-option value="imaging">Radiology</mat-option>
              <mat-option value="prescription">Prescription</mat-option>
              <mat-option value="medical_report">Medical Report</mat-option>
              <mat-option value="procedure">Procedure Report</mat-option>
              <mat-option value="self_document">Self-Uploaded</mat-option>
              <mat-option value="note">Other</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-flat-button color="primary" class="uc-submit"
                  [disabled]="!uploadFileName() || !uploadType()"
                  (click)="submitUpload()">Upload</button>
        </mat-card>
      }

      <!-- ===== Records, grouped by month =====
           Sticky month headings restore the shape of the history: a run of
           dense months reads as "the year I was unwell" at a glance, which a
           flat list of identical rows never conveys. -->
      @if (loading()) {
        <!-- A batch of fixed-height skeletons on first load, so the list
             never collapses and re-expands as records arrive. -->
        <div class="rec-list">
          @for (i of skeletonRows; track i) {
            <app-skeleton-card [lines]="2" [showAvatar]="true" variant="compact" />
          }
        </div>
      } @else if (!filteredEvents().length) {
        <div class="empty">
          <mat-icon>folder_open</mat-icon>
          <h3>No records found</h3>
          <p>Try a different period, category, or upload a document</p>
        </div>
      } @else {
        @for (group of monthGroups(); track group.key) {
          <div class="month-head">
            <span class="mh-label">{{ group.label }}</span>
            <span class="mh-rule"></span>
            <span class="mh-count">{{ group.events.length }}</span>
          </div>

          <div class="rec-list">
            @for (event of group.events; track event.id) {
              <!-- The whole row opens the document; the inline View / Download /
                   Delete icons on the right give the same actions explicitly. -->
              <div class="rec-row" [ngClass]="'type-' + event.type"
                   [class.highlighted]="event.id === highlightId()"
                   [attr.data-event-id]="event.id"
                   role="button" tabindex="0"
                   [attr.aria-label]="'Open ' + event.title"
                   (click)="openViewer(event)"
                   (keydown.enter)="openViewer(event)"
                   (keydown.space)="openViewer(event); $event.preventDefault()">
                <div class="rec-icon" [ngClass]="'icon-' + event.type">
                  <mat-icon>{{ getEventIcon(event) }}</mat-icon>
                </div>
                <div class="rec-body">
                  <div class="rec-line-1">
                    <strong class="rec-title">{{ event.title }}</strong>
                    <span class="rec-type-chip" [ngClass]="'chip-' + event.type">
                      {{ formatType(event.type) }}
                    </span>
                  </div>
                  <div class="rec-meta">
                    <span><mat-icon class="meta-icon">person</mat-icon>{{ event.provider }}</span>
                    <span class="meta-dot">·</span>
                    <span><mat-icon class="meta-icon">schedule</mat-icon>{{ formatDate(event.date) }}</span>
                  </div>
                </div>
                <div class="rec-actions" (click)="$event.stopPropagation()">
                  <button mat-icon-button matTooltip="View" aria-label="View record"
                          class="ra-btn ra-view" (click)="openViewer(event)">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Download" aria-label="Download record"
                          class="ra-btn" (click)="downloadRecord(event)">
                    <mat-icon>download</mat-icon>
                  </button>
                  <!-- Delete is offered only for the patient's own uploads.
                       Hospital-generated records are the clinical record and
                       cannot be removed from the portal. -->
                  <button mat-icon-button matTooltip="Delete" aria-label="Delete record"
                          class="ra-btn ra-delete" (click)="confirmDelete(event)">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- ===== Infinite-scroll sentinel =====
           Always present at the foot of the list so its ViewChild reference
           stays stable. When it scrolls into view and more records remain,
           the observer reveals the next batch; the spinner marks that more is
           loading, and once everything is shown the sentinel renders empty. -->
      <div #loadMore class="load-more">
        @if (!loading() && hasMore()) {
          <span class="lm-spinner" aria-hidden="true"></span>
          <span class="lm-text">Loading more records…</span>
        } @else if (!loading() && totalRecords() > BATCH_SIZE) {
          <span class="lm-end">You've reached the end · {{ totalRecords() }} records</span>
        }
      </div>

      <!-- Mobile FAB -->
      <button mat-fab class="fab" (click)="showUpload.set(true)">
        <mat-icon>cloud_upload</mat-icon>
      </button>
    </div>

    <!-- ===== Document Viewer Overlay (REQ 18.4.1–18.4.3) =====
         Displays the complete document as an overlay on top of My Records,
         without navigating away. Backdrop click or the Close (X) action
         dismisses it and returns the user to the records list. -->
    @if (viewerEvent(); as doc) {
      <div class="viewer-overlay" (click)="closeViewer()">
        <div class="viewer-panel" (click)="$event.stopPropagation()"
             role="dialog" aria-modal="true" aria-label="Document viewer">
          <!-- Floating controls: on mobile the top bar is hidden, so these
               pinned buttons keep Close (X) and Download always visible. -->
          <div class="vt-float">
            <button mat-icon-button class="vt-float-btn" aria-label="Download document"
                    (click)="downloadRecord(doc)">
              <mat-icon>download</mat-icon>
            </button>
            <button mat-icon-button class="vt-float-btn close" aria-label="Close document viewer"
                    (click)="closeViewer()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="viewer-topbar">
            <div class="vt-left">
              <div class="vt-icon" [ngClass]="'icon-' + doc.type">
                <mat-icon>{{ getEventIcon(doc) }}</mat-icon>
              </div>
              <div class="vt-titles">
                <strong>{{ doc.title }}</strong>
                <span>{{ formatType(doc.type) }} · {{ doc.provider }} · {{ formatDate(doc.date) }}</span>
              </div>
            </div>
            <div class="vt-actions">
              <button mat-stroked-button class="vt-dl" (click)="downloadRecord(doc)">
                <mat-icon>download</mat-icon> Download
              </button>
              <button mat-icon-button class="vt-close" matTooltip="Close &amp; return to My Records"
                      aria-label="Close document viewer" (click)="closeViewer()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>

          <div class="viewer-body">
            <div class="doc-page">
              <div class="dp-header">
                <div class="dp-hospital">
                  <strong>Good Health Hospital</strong>
                  <span>Tabuk · Kingdom of Saudi Arabia</span>
                </div>
                <span class="dp-badge" [ngClass]="'chip-' + doc.type">{{ formatType(doc.type) }}</span>
              </div>
              <hr class="dp-rule">
              <h2 class="dp-title">{{ doc.title }}</h2>
              <div class="dp-meta-grid">
                <div><label>Provider</label><span>{{ doc.provider }}</span></div>
                <div><label>Date</label><span>{{ formatDate(doc.date) }}</span></div>
                <div><label>Record Type</label><span>{{ formatType(doc.type) }}</span></div>
                <div><label>Document ID</label><span>{{ doc.id }}</span></div>
              </div>
              <hr class="dp-rule">
              @for (section of getDocumentSections(doc); track section.heading) {
                <div class="dp-section">
                  <h3>{{ section.heading }}</h3>
                  @for (line of section.lines; track line) {
                    <p>{{ line }}</p>
                  }
                </div>
              }
              <div class="dp-footer">
                <mat-icon>verified</mat-icon>
                <span>Electronically generated record · Good Health Hospital Patient Portal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Delete Confirmation Dialog -->
    <ng-template #deleteDialog let-data>
      <div class="del-dialog">
        <div class="del-icon-wrap">
          <mat-icon>warning_amber</mat-icon>
        </div>
        <h3>Delete this record?</h3>
        <p><strong>{{ data.title }}</strong> will be permanently removed. This action cannot be undone.</p>
        <div class="del-actions">
          <button mat-stroked-button matDialogClose>Cancel</button>
          <button mat-flat-button class="del-confirm-btn" [matDialogClose]="'confirm'">
            <mat-icon>delete</mat-icon> Delete
          </button>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    /* Bottom padding clears the Upload FAB so it never covers the pager. */
    .page { max-width: 1000px; margin: 0 auto; padding-bottom: 104px; }

    /* ===== HEADER ===== */
    .page-head {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 18px;
    }
    h1 { font-size: 26px; font-weight: 700; color: #1b3a4b; margin: 0; }
    .sub { color: #888; font-size: 14px; margin: 4px 0 0; }
    .sub strong { color: #1b3a4b; font-weight: 700; }
    .upload-btn {
      background: #0d8a8a !important; color: white !important;
      font-weight: 600 !important; border-radius: 8px !important;
      padding: 0 18px !important;
    }

    /* ===== SEARCH + PERIOD DROPDOWN ROW ===== */
    .filter-row {
      display: flex; gap: 10px; align-items: center;
      margin-bottom: 14px;
      position: relative;            /* anchors the custom-range popover */
    }

    /* ---------- Custom date range popover ---------- */
    .cr-backdrop { position: fixed; inset: 0; z-index: 40; }
    .cr-panel {
      position: absolute; top: calc(100% + 8px); right: 0; z-index: 41;
      width: 320px; max-width: calc(100vw - 32px);
      background: #fff; border: 1px solid #d8e3e3; border-radius: 14px;
      box-shadow: 0 12px 32px rgba(0,0,0,.16);
      padding: 14px; animation: crPop 140ms cubic-bezier(.16,1,.3,1);
    }
    @keyframes crPop {
      from { opacity: 0; transform: translateY(-6px) scale(.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .cr-head {
      display: flex; align-items: center; gap: 7px; margin-bottom: 12px;
      color: #1b3a4b; font-size: 14px;
    }
    .cr-head mat-icon { font-size: 19px; width: 19px; height: 19px; color: #00897b; }

    .cr-fields { display: flex; gap: 10px; }
    .cr-field { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .cr-field span {
      font-size: 11px; font-weight: 700; color: #78909c;
      text-transform: uppercase; letter-spacing: .04em;
    }
    .cr-field input {
      width: 100%; box-sizing: border-box;
      border: 1.5px solid #d8e3e3; border-radius: 9px;
      padding: 9px 10px; font: inherit; font-size: 13px; color: #1b3a4b;
      background: #fff;
    }
    .cr-field input:focus {
      outline: none; border-color: #00897b;
      box-shadow: 0 0 0 3px rgba(0,137,123,.12);
    }

    .cr-quick { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
    .cr-quick-btn {
      border: 1px solid #d8e3e3; background: #f7fbfb; border-radius: 999px;
      padding: 5px 11px; font: inherit; font-size: 11.5px; font-weight: 600;
      color: #00695c; cursor: pointer; transition: all .12s;
    }
    .cr-quick-btn:hover { background: #e0f2f1; border-color: #80cbc4; }

    .cr-err { margin: 10px 0 0; font-size: 11.5px; color: #d32f2f; font-weight: 600; }

    .cr-actions {
      display: flex; justify-content: flex-end; gap: 8px;
      margin-top: 14px; padding-top: 12px; border-top: 1px solid #eef2f2;
    }
    .cr-apply { background: #00897b !important; color: #fff !important; }
    .cr-apply[disabled] { background: #cfd8dc !important; color: #90a4ae !important; }

    @media (max-width: 600px) {
      .cr-panel { right: auto; left: 0; width: calc(100vw - 32px); }
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
    .s-icon { color: #999; font-size: 20px; width: 20px; height: 20px; }
    .s-input {
      flex: 1; min-width: 0;
      border: none; outline: none; background: transparent;
      font-size: 14px; font-family: inherit; color: #333;
    }
    .s-input::placeholder { color: #aaa; }
    .s-clear {
      width: 28px !important; height: 28px !important;
      line-height: 28px !important; color: #999;
    }
    .s-clear mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .period-btn {
      flex-shrink: 0; height: 40px !important;
      border-radius: 22px !important;
      border-color: #d8e3e3 !important; background: white !important;
      color: #1b3a4b !important; font-weight: 500 !important;
      font-size: 13px !important;
      padding: 0 14px !important;
      display: inline-flex !important; align-items: center; gap: 6px;
    }
    .period-btn .period-icon {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      color: #0d8a8a;
    }
    .period-btn .period-caret {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      color: #888;
    }
    .period-label { white-space: nowrap; }

    .invisible { visibility: hidden; }

    /* ===== CATEGORY CHIPS ===== */
    .cat-chips {
      display: flex; gap: 8px; overflow-x: auto;
      padding: 2px 0 14px;
      scrollbar-width: none;
    }
    .cat-chips::-webkit-scrollbar { display: none; }
    .cat-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: 20px;
      border: 1px solid #d8e3e3; background: white;
      font-size: 13px; font-weight: 500; color: #555;
      cursor: pointer; white-space: nowrap;
      transition: all 0.18s;
      flex-shrink: 0;
      font-family: inherit;
    }
    .cat-chip:hover { border-color: #80cbc4; color: #0d8a8a; }
    .cat-chip mat-icon {
      font-size: 16px; width: 16px; height: 16px;
    }
    .cat-chip.active {
      background: #0d8a8a; color: white; border-color: #0d8a8a;
      box-shadow: 0 2px 6px rgba(13,138,138,0.25);
    }

    /* Scroll target only — carries the gap the counts line used to occupy. */
    .list-anchor { height: 14px; }

    /* ===== UPLOAD PANEL ===== */
    .upload-card {
      padding: 20px; margin-bottom: 18px;
      border: 2px dashed #0d8a8a;
      border-radius: 12px !important; background: #f0fafa;
    }
    .uc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .uc-header strong { font-size: 16px; color: #1b3a4b; }
    .uc-drop {
      text-align: center; padding: 20px; cursor: pointer;
      border: 1px dashed #b2dfdb; border-radius: 10px;
      background: white; margin-bottom: 12px;
    }
    .uc-drop:hover { background: #e0f2f1; }
    .uc-drop mat-icon { font-size: 32px; width: 32px; height: 32px; color: #0d8a8a; }
    .uc-drop p { margin: 6px 0 2px; font-size: 14px; color: #333; }
    .uc-drop span { font-size: 12px; color: #999; }
    .uc-file {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      background: white; border-radius: 8px; margin-bottom: 12px;
    }
    .uc-file mat-icon { color: #0d8a8a; }
    .uc-file span { flex: 1; font-size: 13px; }
    .uc-field { width: 100%; }
    .uc-submit { width: 100%; }

    /* ===== COMPACT RECORD ROWS ===== */
    .rec-list {
      display: flex; flex-direction: column; gap: 8px;
    }
    .rec-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px;
      background: white; border: 1px solid #e8eded;
      border-radius: 10px; transition: all 0.18s;
      cursor: pointer;                 /* the row itself opens the document */
    }
    .rec-row:hover {
      border-color: #b2dfdb;
      box-shadow: 0 3px 10px rgba(0,0,0,0.06);
    }
    .rec-row:focus-visible {
      outline: none; border-color: #0d8a8a;
      box-shadow: 0 0 0 3px rgba(13,138,138,.18);
    }

    /* Colored icon circle on the left */
    .rec-icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .rec-icon mat-icon { color: white; font-size: 20px; width: 20px; height: 20px; }
    .icon-appointment { background: linear-gradient(135deg, #3f51b5, #5c6bc0); }
    .icon-lab_result { background: linear-gradient(135deg, #00897b, #26a69a); }
    .icon-prescription { background: linear-gradient(135deg, #f57c00, #ffb74d); }
    .icon-vaccination { background: linear-gradient(135deg, #7b1fa2, #ab47bc); }
    .icon-note { background: linear-gradient(135deg, #546e7a, #78909c); }
    .icon-imaging { background: linear-gradient(135deg, #0277bd, #29b6f6); }
    .icon-procedure { background: linear-gradient(135deg, #e64a19, #ff8a65); }
    .icon-medical_report { background: linear-gradient(135deg, #2e7d32, #66bb6a); }
    .icon-self_document { background: linear-gradient(135deg, #00897b, #4db6ac); }

    .rec-body {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; gap: 3px;
    }
    .rec-line-1 {
      display: flex; align-items: center; gap: 8px; min-width: 0;
    }
    .rec-title {
      font-size: 14px; color: #1b3a4b; font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      flex: 0 1 auto;
    }
    .rec-type-chip {
      font-size: 10px; font-weight: 600;
      padding: 2px 7px; border-radius: 8px;
      flex-shrink: 0; text-transform: uppercase; letter-spacing: 0.3px;
    }
    .chip-appointment { background: #e8eaf6; color: #3f51b5; }
    .chip-lab_result { background: #e0f2f1; color: #00897b; }
    .chip-prescription { background: #fff3e0; color: #f57c00; }
    .chip-vaccination { background: #f3e5f5; color: #7b1fa2; }
    .chip-note { background: #eceff1; color: #546e7a; }
    .chip-imaging { background: #e1f5fe; color: #0277bd; }
    .chip-procedure { background: #fbe9e7; color: #e64a19; }
    .chip-medical_report { background: #e8f5e9; color: #2e7d32; }
    .chip-self_document { background: #e0f2f1; color: #00897b; }

    .rec-meta {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: #888;
      flex-wrap: wrap;
    }
    .rec-meta span { display: inline-flex; align-items: center; gap: 3px; }
    .meta-icon {
      font-size: 13px !important; width: 13px !important; height: 13px !important;
      color: #aaa;
    }
    .meta-dot { color: #ccc; }

    .rec-actions {
      display: flex; gap: 2px; flex-shrink: 0;
    }
    /* 40px, not 34 — two adjacent icon targets on a phone need the room,
       especially when one of them deletes something. */
    .ra-btn {
      width: 40px !important; height: 40px !important;
      line-height: 40px !important; color: #888 !important;
    }
    .ra-btn:hover { color: #0d8a8a !important; background: #f0f7f7 !important; }
    .ra-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    /* View is the primary action — tinted teal by default so it reads first. */
    .ra-view { color: #0d8a8a !important; }
    .ra-view:hover { background: #e0f2f1 !important; }
    .ra-delete:hover { color: #d32f2f !important; background: #fdecea !important; }

    /* ===== EMPTY ===== */
    .empty { text-align: center; padding: 60px 20px; color: #999; }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; margin-bottom: 8px; }

    /* ===== FAB ===== */
    .fab {
      position: fixed; bottom: 24px; right: 24px; z-index: 50;
      background: #0d8a8a !important; color: white !important;
    }

    /* ===== DELETE DIALOG ===== */
    .del-dialog { padding: 24px; text-align: center; max-width: 360px; }
    .del-icon-wrap {
      width: 56px; height: 56px; border-radius: 50%;
      background: #fff3e0; display: flex; align-items: center; justify-content: center;
      margin: 0 auto 14px;
    }
    .del-icon-wrap mat-icon {
      color: #f57c00; font-size: 32px; width: 32px; height: 32px;
    }
    .del-dialog h3 {
      margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1b3a4b;
    }
    .del-dialog p {
      margin: 0 0 20px; font-size: 14px; color: #555; line-height: 1.5;
    }
    .del-dialog p strong { color: #1b3a4b; }
    .del-actions {
      display: flex; gap: 10px; justify-content: center;
    }
    .del-actions button { min-width: 110px; }
    .del-confirm-btn {
      background: #d32f2f !important; color: white !important;
      font-weight: 600 !important;
    }
    .del-confirm-btn mat-icon {
      font-size: 18px; width: 18px; height: 18px; vertical-align: middle; margin-right: 4px;
    }

    /* ===== MONTH HEADINGS ===== */
    /* Sticky so the month you are reading is always named, however far you
       scroll. This is what makes the list a history instead of a table. */
    .month-head {
      position: sticky; top: 0; z-index: 5;
      display: flex; align-items: center; gap: 10px;
      margin: 20px 0 10px; padding: 6px 0;
      /* Matches the shell's .content background so rows scroll cleanly under. */
      background: linear-gradient(#f5f7fa 68%, rgba(245,247,250,0));
    }
    .month-head:first-of-type { margin-top: 4px; }
    .mh-label {
      font-size: 12.5px; font-weight: 800; color: #00695c;
      text-transform: uppercase; letter-spacing: .07em; white-space: nowrap;
    }
    .mh-rule { flex: 1; height: 1px; background: #dfe9e9; }
    .mh-count {
      font-size: 11px; font-weight: 700; color: #78909c;
      background: #eef4f4; border-radius: 999px; padding: 2px 9px;
    }

    /* ===== INFINITE-SCROLL SENTINEL ===== */
    /* Sits at the foot of the list. Height comes from its content, so it only
       occupies space while something is being shown (loading / end marker). */
    .load-more {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      min-height: 8px; padding: 18px 0 6px;
      color: #78909c; font-size: 13px;
    }
    .lm-spinner {
      width: 18px; height: 18px; flex-shrink: 0;
      border: 2.5px solid #cfe6e3; border-top-color: #0d8a8a;
      border-radius: 50%; animation: lmSpin .7s linear infinite;
    }
    @keyframes lmSpin { to { transform: rotate(360deg); } }
    .lm-text { font-weight: 500; }
    .lm-end { color: #9aa8ad; font-size: 12.5px; font-weight: 500; }

    /* ===== DOCUMENT VIEWER OVERLAY ===== */
    .viewer-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(15, 30, 35, 0.55);
      backdrop-filter: blur(2px);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      animation: viewerFade 0.18s ease;
    }
    @keyframes viewerFade { from { opacity: 0; } to { opacity: 1; } }
    .viewer-panel {
      position: relative;
      width: 100%; max-width: 820px; max-height: 92vh;
      background: #f4f6f7; border-radius: 14px;
      display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.35);
      animation: viewerPop 0.2s ease;
    }

    /* Floating close/download controls — hidden on desktop (top bar is used),
       shown on mobile where the top bar is collapsed. */
    .vt-float { display: none; }
    .vt-float-btn {
      width: 42px !important; height: 42px !important; line-height: 42px !important;
      border-radius: 50% !important;
      background: white !important; color: #1b3a4b !important;
      box-shadow: 0 2px 10px rgba(0,0,0,0.22) !important;
    }
    .vt-float-btn mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .vt-float-btn.close { background: #1b3a4b !important; color: white !important; }
    @keyframes viewerPop {
      from { transform: translateY(12px) scale(0.98); opacity: 0; }
      to   { transform: translateY(0) scale(1); opacity: 1; }
    }
    .viewer-topbar {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 12px 16px; background: white; border-bottom: 1px solid #e6ecec;
      flex-shrink: 0;
    }
    .vt-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .vt-icon {
      width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .vt-icon mat-icon { color: white; font-size: 20px; width: 20px; height: 20px; }
    .vt-titles { min-width: 0; display: flex; flex-direction: column; }
    .vt-titles strong {
      font-size: 15px; color: #1b3a4b;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .vt-titles span { font-size: 12px; color: #8a9a9a; }
    .vt-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .vt-dl {
      border-color: #cfe0e0 !important; color: #0d8a8a !important;
      font-weight: 600 !important; border-radius: 8px !important;
    }
    .vt-dl mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .vt-close {
      width: 40px !important; height: 40px !important; line-height: 40px !important;
      border-radius: 50% !important;
      background: #f0f3f3 !important; color: #1b3a4b !important;
      transition: background 0.15s, color 0.15s;
    }
    .vt-close:hover { background: #fdecea !important; color: #d32f2f !important; }
    .vt-close mat-icon { font-size: 22px; width: 22px; height: 22px; }

    .viewer-body { overflow-y: auto; padding: 22px; }
    .doc-page {
      background: white; border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      padding: 34px 40px; max-width: 680px; margin: 0 auto;
    }
    .dp-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .dp-hospital { display: flex; flex-direction: column; }
    .dp-hospital strong { font-size: 16px; color: #0d8a8a; letter-spacing: 0.2px; }
    .dp-hospital span { font-size: 12px; color: #999; margin-top: 2px; }
    .dp-badge {
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
      padding: 4px 9px; border-radius: 8px; white-space: nowrap;
    }
    .dp-rule { border: none; border-top: 1px solid #eef1f1; margin: 16px 0; }
    .dp-title { font-size: 20px; font-weight: 700; color: #1b3a4b; margin: 4px 0 14px; }
    .dp-meta-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px;
    }
    .dp-meta-grid > div { display: flex; flex-direction: column; gap: 2px; }
    .dp-meta-grid label {
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #a5b0b0;
    }
    .dp-meta-grid span { font-size: 13px; color: #37474f; font-weight: 500; }
    .dp-section { margin-top: 18px; }
    .dp-section h3 {
      font-size: 13px; font-weight: 700; color: #0d8a8a;
      text-transform: uppercase; letter-spacing: 0.4px; margin: 0 0 6px;
    }
    .dp-section p { font-size: 13.5px; color: #37474f; line-height: 1.6; margin: 0 0 4px; }
    .dp-footer {
      display: flex; align-items: center; gap: 6px;
      margin-top: 26px; padding-top: 14px; border-top: 1px dashed #e0e6e6;
      font-size: 11px; color: #a5b0b0;
    }
    .dp-footer mat-icon { font-size: 15px; width: 15px; height: 15px; color: #4db6ac; }

    @media (max-width: 600px) {
      .viewer-overlay { padding: 0; }
      .viewer-panel { max-width: 100%; max-height: 100vh; border-radius: 0; height: 100%; }
      /* Collapse the top bar; the floating buttons take over so Close (X) is
         always visible in the corner without hunting for it. */
      .viewer-topbar { display: none; }
      .vt-float {
        display: flex; gap: 10px;
        position: absolute; top: 12px; right: 12px; z-index: 6;
      }
      .viewer-body { padding: 64px 16px 16px; }
      .doc-page { padding: 22px 20px; }
      .dp-meta-grid { grid-template-columns: 1fr; }
    }

    /* ===== Highlighted record (deep-link from dashboard) ===== */
    .rec-row.highlighted {
      animation: pulseHighlight 1.4s ease-in-out 3;
      border-radius: 12px;
      position: relative;
    }
    .rec-row.highlighted::before {
      content: 'JUST UPDATED';
      position: absolute; top: -10px; left: 12px;
      background: #1a237e; color: white;
      font-size: 9px; font-weight: 700;
      padding: 2px 8px; border-radius: 8px;
      letter-spacing: .05em;
    }
    @keyframes pulseHighlight {
      0%   { box-shadow: 0 0 0 0 rgba(26,35,126,0.35); background: white; }
      50%  { box-shadow: 0 0 0 8px rgba(26,35,126,0); background: #f3f5fb; }
      100% { box-shadow: 0 0 0 0 rgba(26,35,126,0); background: white; }
    }

    @media (min-width: 769px) { .fab { display: none; } }
    @media (max-width: 768px) {
      .upload-btn { display: none; }
      h1 { font-size: 22px; }
      .filter-row { gap: 8px; }
      .rec-row { padding: 10px 12px; }
      .rec-title { font-size: 13px; }
    }
  `]
})
export class TimelineComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly zone = inject(NgZone);

  @ViewChild('deleteDialog', { static: true }) deleteDialogRef!: TemplateRef<unknown>;
  /** Scroll anchor for filter changes — the top of the list, not the page. */
  @ViewChild('listTop') listTop?: ElementRef<HTMLElement>;
  /** Sentinel at the foot of the list; when it scrolls into view the
   *  IntersectionObserver reveals the next batch (infinite scroll). */
  @ViewChild('loadMore') loadMore?: ElementRef<HTMLElement>;

  readonly loading = signal(true);
  readonly allEvents = signal<TimelineEvent[]>([]);
  readonly activeFilter = signal('all');
  // Starts on a calendar year (YEAR_PERIOD = -3, declared below), never on a
  // rolling day window — see `timePeriods`. The year itself is resolved from
  // the data once records load, so the default is always a year that has them.
  readonly selectedPeriod = signal(-3);
  readonly searchQuery = signal('');
  readonly showUpload = signal(false);
  readonly uploadFileName = signal('');
  readonly uploadType = signal('');
  readonly highlightId = signal<string | null>(null);
  // Record currently open in the document viewer overlay (null = viewer closed).
  readonly viewerEvent = signal<TimelineEvent | null>(null);

  // ---- Infinite scroll ---------------------------------------------
  /** Records revealed per batch. The list opens on one batch and grows by
   *  another every time the foot-of-list sentinel scrolls into view. */
  readonly BATCH_SIZE = 10;
  readonly skeletonRows = Array.from({ length: 10 }, (_, i) => i);
  /** How many filtered records are currently rendered. Reset to one batch on
   *  any filter / search / date change; grown by the scroll observer. */
  readonly visibleCount = signal(10);
  private readonly MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // ---- Custom date range ------------------------------------------
  // `selectedPeriod` holds CUSTOM_PERIOD when an explicit from/to range is
  // active; otherwise it holds the preset's day count.
  readonly CUSTOM_PERIOD = -1;
  readonly today = new Date().toISOString().slice(0, 10);

  /** Committed range driving the filter (empty when a preset is active). */
  readonly customFrom = signal('');
  readonly customTo = signal('');
  /** Draft values bound to the picker inputs. */
  readonly crFrom = signal('');
  readonly crTo = signal('');
  readonly customPickerOpen = signal(false);

  // Shortcuts, all within the 1-year selection cap enforced by crError.
  readonly quickRanges = [
    { label: 'Last 3 months', days: 90 },
    { label: 'Last 6 months', days: 180 },
    { label: 'Last year', days: 365 }
  ];

  /** Maximum span a custom range may cover, in days. 366 lets a full
   *  same-date-to-next-year selection (leap-safe) through while blocking
   *  anything genuinely longer than a year. */
  readonly MAX_RANGE_DAYS = 366;

  readonly isCustom = computed(() => this.selectedPeriod() === this.CUSTOM_PERIOD);

  // ---- Calendar-year selection ------------------------------------
  /** `selectedPeriod` holds YEAR_PERIOD when a single calendar year is active. */
  readonly YEAR_PERIOD = -3;
  readonly activeYear = signal<number | null>(new Date().getFullYear());
  readonly isYearPeriod = computed(() => this.selectedPeriod() === this.YEAR_PERIOD);

  /** Years that actually contain records, newest first — no empty years offered. */
  readonly recordYears = computed(() => {
    const years = new Set<number>();
    for (const e of this.allEvents()) {
      if (e.type === 'appointment') continue;
      years.add(new Date(e.date).getFullYear());
    }
    return [...years].sort((a, b) => b - a);
  });

  isYear(year: number): boolean {
    return this.isYearPeriod() && this.activeYear() === year;
  }

  selectYear(year: number): void {
    this.activeYear.set(year);
    this.selectedPeriod.set(this.YEAR_PERIOD);
    this.customFrom.set('');
    this.customTo.set('');
    this.resetScroll();
  }

  /** Validation message for the draft range (empty = valid). */
  readonly crError = computed(() => {
    const from = this.crFrom();
    const to = this.crTo();
    if (!from || !to) return '';
    if (from > to) return 'The "From" date must be on or before the "To" date.';
    if (to > this.today) return 'The "To" date cannot be in the future.';
    const spanDays = (Date.parse(to) - Date.parse(from)) / 86_400_000;
    if (spanDays > this.MAX_RANGE_DAYS) {
      return 'You can view up to 1 year at a time. Shorten the range and try again.';
    }
    return '';
  });

  isPreset(days: number): boolean {
    return !this.isCustom() && !this.isYearPeriod() && this.selectedPeriod() === days;
  }

  /** Choosing a preset clears any committed custom range or year. */
  selectPreset(days: number): void {
    this.selectedPeriod.set(days);
    this.customFrom.set('');
    this.customTo.set('');
    this.activeYear.set(null);
    this.resetScroll();
  }

  // ---- Infinite-scroll behaviour ----------------------------------
  /**
   * Any change to category, search or date range collapses the list back to
   * the first batch and scrolls to the top. Without the reset, a patient deep
   * in a long scroll would keep that depth against a freshly filtered (and
   * possibly shorter) result set.
   */
  private resetScroll(): void {
    this.visibleCount.set(this.BATCH_SIZE);
    requestAnimationFrame(() => {
      this.listTop?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  setCategory(value: string): void {
    this.activeFilter.set(value);
    this.resetScroll();
  }

  setSearch(value: string): void {
    this.searchQuery.set(value);
    this.resetScroll();
  }

  openCustomRange(): void {
    // Seed the draft from the committed range, or default to the last 30
    // days so the picker never opens empty.
    if (this.customFrom() && this.customTo()) {
      this.crFrom.set(this.customFrom());
      this.crTo.set(this.customTo());
    } else {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      this.crFrom.set(start.toISOString().slice(0, 10));
      this.crTo.set(this.today);
    }
    this.customPickerOpen.set(true);
  }

  cancelCustomRange(): void {
    this.customPickerOpen.set(false);
  }

  applyCustomRange(): void {
    if (this.crError() || !this.crFrom() || !this.crTo()) return;
    this.customFrom.set(this.crFrom());
    this.customTo.set(this.crTo());
    this.selectedPeriod.set(this.CUSTOM_PERIOD);
    this.activeYear.set(null);
    this.customPickerOpen.set(false);
    this.resetScroll();
  }

  /** Quick shortcuts inside the picker: fill the draft, then commit. */
  applyQuick(days: number): void {
    const now = new Date();
    let start: Date;
    if (days === 0) {
      start = new Date(now.getFullYear(), now.getMonth(), 1);      // this month
    } else if (days === -2) {
      start = new Date(now.getFullYear(), 0, 1);                    // year to date
    } else {
      start = new Date();
      start.setDate(start.getDate() - days);
    }
    this.crFrom.set(start.toISOString().slice(0, 10));
    this.crTo.set(this.today);
    this.applyCustomRange();
  }

  @HostListener('document:keydown.escape')
  onEscapeCustomRange(): void {
    if (this.customPickerOpen()) this.cancelCustomRange();
  }

  /**
   * The period control offers CALENDAR YEARS only — the menu is built from
   * `recordYears()` at runtime. Rolling day windows (7/30/90) were removed:
   * a patient whose last visit was 8 months ago would open My Records to an
   * empty screen, and that failure hits hardest the patients who visit least.
   *
   * This array is retained only so a deep-linked highlight can widen the
   * filter to "All time"; it is not rendered in the menu.
   */
  readonly timePeriods: TimePeriod[] = [
    { label: 'All time', short: 'All', days: 9999 }
  ];

  readonly categories: CategoryFilter[] = [
    { value: 'all',            label: 'All',         icon: 'apps' },
    // Self-uploaded docs get the 2nd slot (right after All) so the tab is
    // always visible without scrolling the chip row — patients shouldn't have
    // to hunt for the documents they uploaded themselves.
    { value: 'self_document',  label: 'Self-Uploaded', icon: 'folder_shared' },
    { value: 'lab_result',     label: 'Labs',        icon: 'science' },
    // No 'Rx' chip — prescriptions live in the Medications section; they
    // still appear under "All" here, just without a dedicated tab.
    { value: 'imaging',        label: 'Radiology',   icon: 'image' },
    { value: 'procedure',      label: 'Procedures',  icon: 'monitor_heart' },
    { value: 'medical_report', label: 'Reports',     icon: 'summarize' },
    { value: 'vaccination',    label: 'Vaccines',    icon: 'vaccines' }
  ];

  readonly filteredEvents = computed(() => {
    let events = this.allEvents().filter(e => e.type !== 'appointment');
    const days = this.selectedPeriod();
    const filter = this.activeFilter();
    const q = this.searchQuery().toLowerCase().trim();

    if (days === this.YEAR_PERIOD) {
      // Single calendar year — Jan 1 through Dec 31 inclusive.
      const y = this.activeYear();
      if (y !== null) events = events.filter(e => e.date.slice(0, 4) === String(y));
    } else if (days === this.CUSTOM_PERIOD) {
      // Explicit from/to range. `to` is inclusive of the whole day.
      const from = this.customFrom();
      const to = this.customTo();
      if (from) events = events.filter(e => e.date >= from);
      if (to) events = events.filter(e => e.date <= `${to}T23:59:59.999`);
    } else if (days < 9999) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      events = events.filter(e => e.date >= cutoff.toISOString());
    }
    if (filter !== 'all') {
      events = events.filter(e => e.type === filter);
    }
    if (q) {
      events = events.filter(e =>
        e.title.toLowerCase().includes(q) || e.provider.toLowerCase().includes(q)
      );
    }
    // Newest first — the infinite-scroll list and month grouping both assume
    // descending order.
    return [...events].sort((a, b) => b.date.localeCompare(a.date));
  });

  // ---- Infinite-scroll + grouping computeds -----------------------
  readonly totalRecords = computed(() => this.filteredEvents().length);

  /** The slice currently rendered — grows one batch at a time as the foot
   *  sentinel scrolls into view (see the observer in ngAfterViewInit). */
  readonly visibleEvents = computed(() =>
    this.filteredEvents().slice(0, this.visibleCount())
  );

  /** More records remain below what's rendered — drives the loading sentinel
   *  and gates the observer so it stops once everything is shown. */
  readonly hasMore = computed(() => this.visibleCount() < this.totalRecords());

  /**
   * Visible rows bucketed into calendar months, newest first. The month
   * heading is what turns a flat list back into a history you can skim —
   * "the year I was in and out of hospital" becomes visible as a run of
   * dense months rather than 40 identical rows.
   */
  readonly monthGroups = computed(() => {
    const groups: { key: string; label: string; events: TimelineEvent[] }[] = [];
    for (const e of this.visibleEvents()) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = `${this.MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.events.push(e);
      else groups.push({ key, label, events: [e] });
    }
    return groups;
  });

  ngOnInit(): void {
    const highlight = this.route.snapshot.queryParamMap.get('highlight');
    // Reset to "All time" + "All categories" so a deep-linked highlight isn't filtered out
    if (highlight) {
      this.selectedPeriod.set(9999);
      this.activeFilter.set('all');
      // Use the search to also narrow visually
      this.searchQuery.set(highlight);
    }

    // Full archive is fetched once here because the POC has no server; in
    // production this call takes an offset and returns the next batch.
    this.api.getTimeline(0, 1000).subscribe(events => {
      this.allEvents.set(events);
      this.loading.set(false);

      // The default year must be one that actually has records. A patient
      // whose last visit was in 2024 lands on 2024, not on an empty 2026.
      if (this.isYearPeriod()) {
        const years = this.recordYears();
        if (years.length && !years.includes(this.activeYear() ?? -1)) {
          this.activeYear.set(years[0]);
        }
      }
      if (highlight) {
        // After paint, find the first matching event row and scroll + pulse
        setTimeout(() => this.applyHighlight(highlight), 80);
      }
    });
  }

  private observer?: IntersectionObserver;

  /**
   * Infinite scroll: watch the foot-of-list sentinel. Each time it enters the
   * viewport (with a 200px pre-load margin) and more records remain, reveal
   * the next batch. The callback fires outside Angular's zone, so the signal
   * update is wrapped in `zone.run` to schedule change detection.
   */
  ngAfterViewInit(): void {
    if (!this.loadMore) return;
    this.observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting) && this.hasMore() && !this.loading()) {
          this.zone.run(() => this.visibleCount.update(n => n + this.BATCH_SIZE));
        }
      },
      { root: null, rootMargin: '200px' }
    );
    this.observer.observe(this.loadMore.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private applyHighlight(query: string): void {
    const match = this.filteredEvents()[0];
    if (!match) return;
    this.highlightId.set(match.id);
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-event-id="${match.id}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    // Clear the highlight class after the pulse animation finishes (~4.5s)
    setTimeout(() => this.highlightId.set(null), 4500);
  }

  getEventIcon(event: TimelineEvent): string {
    const m: Record<string, string> = {
      appointment: 'event', lab_result: 'science', prescription: 'medication',
      vaccination: 'vaccines', note: 'description', imaging: 'image',
      procedure: 'monitor_heart', medical_report: 'summarize',
      self_document: 'folder_shared'
    };
    return m[event.type] ?? 'info';
  }

  formatType(type: string): string {
    const m: Record<string, string> = {
      appointment: 'Visit', lab_result: 'Lab', prescription: 'Rx',
      vaccination: 'Vaccine', note: 'Note', imaging: 'Radiology',
      procedure: 'Procedure', medical_report: 'Report', self_document: 'Document'
    };
    return m[type] ?? type;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getPeriodLabel(): string {
    if (this.isYearPeriod() && this.activeYear() !== null) {
      return String(this.activeYear());
    }
    if (this.isCustom()) {
      const fmt = (iso: string) => {
        const d = new Date(iso);
        return Number.isNaN(d.getTime())
          ? iso
          : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      };
      return `${fmt(this.customFrom())} – ${fmt(this.customTo())}`;
    }
    return this.timePeriods.find(p => p.days === this.selectedPeriod())?.label ?? '';
  }

  onFileSelected(event: Event): void {
    const f = (event.target as HTMLInputElement).files;
    if (f?.length) this.uploadFileName.set(f[0].name);
  }

  submitUpload(): void {
    const name = this.uploadFileName();
    const type = this.uploadType() as TimelineEvent['type'];
    if (!name || !type) return;
    this.allEvents.update(list => [{
      id: 'upload-' + Date.now(), type,
      title: name.replace(/\.[^.]+$/, ''),
      description: '', date: new Date().toISOString(), provider: 'Self-uploaded'
    }, ...list]);
    this.showUpload.set(false);
    this.uploadFileName.set('');
    this.uploadType.set('');
    this.snackBar.open('Document uploaded', 'OK', { duration: 3000 });
  }

  confirmDelete(event: TimelineEvent): void {
    const ref = this.dialog.open(this.deleteDialogRef, {
      width: '380px',
      data: event,
      panelClass: 'del-dialog-panel'
    });
    ref.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        this.deleteRecord(event);
      }
    });
  }

  private deleteRecord(event: TimelineEvent): void {
    this.allEvents.update(list => list.filter(e => e.id !== event.id));
    this.snackBar.open('Record deleted', 'Undo', { duration: 4000 }).onAction().subscribe(() => {
      this.allEvents.update(list => [...list, event].sort((a, b) => b.date.localeCompare(a.date)));
    });
  }

  // ===== Document viewer (REQ 18.4.1–18.4.3) =====
  /** Open the selected record in the viewer overlay, without leaving My Records. */
  openViewer(event: TimelineEvent): void {
    this.viewerEvent.set(event);
  }

  /** Close the viewer (Close X / backdrop) and return to the records list. */
  closeViewer(): void {
    this.viewerEvent.set(null);
  }

  // ===== Download (REQ 18.4.4–18.4.7) =====
  /**
   * Download the record to the user's device, then surface a temporary
   * notification with a "View Report" action. The snackbar auto-dismisses
   * after 5 seconds; selecting "View Report" opens it in the viewer.
   */
  downloadRecord(event: TimelineEvent): void {
    // If the download is triggered from inside the viewer, keep the flow clean
    // by leaving the viewer as-is; the notification lets the user re-open it.
    const sections = this.getDocumentSections(event);
    const lines: string[] = [
      'GOOD HEALTH HOSPITAL',
      'Tabuk · Kingdom of Saudi Arabia',
      '',
      event.title,
      '========================================',
      'Record Type : ' + this.formatType(event.type),
      'Provider    : ' + event.provider,
      'Date        : ' + this.formatDate(event.date),
      'Document ID : ' + event.id,
      ''
    ];
    for (const s of sections) {
      lines.push(s.heading.toUpperCase());
      for (const l of s.lines) lines.push('  ' + l);
      lines.push('');
    }
    lines.push('— Electronically generated record · Patient Portal —');

    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.safeFileName(event.title) + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // REQ 18.4.5–18.4.7: temporary notification, 5s auto-dismiss, "View Report" re-opens the viewer.
    this.snackBar
      .open('Downloaded "' + event.title + '"', 'View Report', { duration: 5000 })
      .onAction()
      .subscribe(() => this.openViewer(event));
  }

  private safeFileName(name: string): string {
    return name.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'record';
  }

  /**
   * Build a realistic, type-aware document body for the viewer and the
   * downloaded file. This is demo content standing in for the real report PDF.
   */
  getDocumentSections(event: TimelineEvent): { heading: string; lines: string[] }[] {
    switch (event.type) {
      case 'lab_result':
        return [
          { heading: 'Summary', lines: [
            'Laboratory investigation completed. Results reviewed by the ordering physician.',
            'No critical values flagged. See parameters below.' ] },
          { heading: 'Results', lines: [
            'Haemoglobin (Hb) .......... 14.2 g/dL   (Ref 13.0–17.0)',
            'WBC Count ................. 7.4 ×10³/µL (Ref 4.0–11.0)',
            'Platelets ................. 265 ×10³/µL (Ref 150–410)',
            'Fasting Glucose ........... 96 mg/dL    (Ref 70–100)' ] },
          { heading: 'Interpretation', lines: [
            'All measured parameters are within normal reference ranges.',
            'Routine follow-up advised at the next scheduled visit.' ] }
        ];
      case 'imaging':
        return [
          { heading: 'Study', lines: [ 'Modality and region as titled above. Images acquired and archived to PACS.' ] },
          { heading: 'Findings', lines: [
            'No acute abnormality identified.',
            'Bony structures and soft-tissue planes appear unremarkable.' ] },
          { heading: 'Impression', lines: [ 'Normal study. Correlate clinically as indicated.' ] }
        ];
      case 'prescription':
        return [
          { heading: 'Prescribed Medication', lines: [
            'Metformin 500 mg — 1 tablet twice daily after meals.',
            'Duration: 30 days. Refills: 2.' ] },
          { heading: 'Instructions', lines: [
            'Take with food to reduce gastric upset.',
            'Report any persistent nausea or unusual fatigue to your physician.' ] }
        ];
      case 'medical_report':
      case 'procedure':
        return [
          { heading: 'Clinical Summary', lines: [
            'Encounter documented by the attending physician.',
            'Patient stable at the time of reporting.' ] },
          { heading: 'Assessment & Plan', lines: [
            'Continue current management.',
            'Follow-up as advised; return earlier if symptoms worsen.' ] }
        ];
      case 'vaccination':
        return [
          { heading: 'Immunization', lines: [
            'Vaccine administered as titled. Dose recorded in the immunization register.',
            'No immediate adverse reaction observed during the observation period.' ] }
        ];
      case 'self_document':
        return [
          { heading: 'Uploaded Document', lines: [
            'This document was uploaded by the patient to their personal health record.',
            'Original file retained in the portal document store.' ] }
        ];
      default:
        return [
          { heading: 'Details', lines: [
            event.description || 'Record details are displayed as captured in the health record.' ] }
        ];
    }
  }
}
