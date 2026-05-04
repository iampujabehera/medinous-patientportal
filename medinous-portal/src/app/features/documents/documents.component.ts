import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { SkeletonCardComponent } from '../../shared/components/skeleton-loader/skeleton-card.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ApiService } from '../../core/services/api.service';
import { I18nService } from '../../core/services/i18n.service';
import { PatientDocument } from '../../core/models/patient.model';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatChipsModule,
    MatButtonToggleModule, MatFormFieldModule, MatSelectModule, MatInputModule,
    MatProgressBarModule, MatSnackBarModule, MatDialogModule, MatDividerModule,
    SkeletonCardComponent, TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="documents-container" [class.rtl]="i18n.isRtl()">
      <div class="docs-header">
        <div>
          <h1>{{ 'doc.title' | translate }}</h1>
          <p class="subtitle">{{ 'doc.subtitle' | translate }}</p>
        </div>
        <button mat-flat-button color="primary" (click)="showUpload.set(!showUpload())">
          <mat-icon>{{ showUpload() ? 'close' : 'cloud_upload' }}</mat-icon>
          {{ (showUpload() ? 'common.cancel' : 'doc.upload') | translate }}
        </button>
      </div>

      <!-- Upload Zone -->
      @if (showUpload()) {
        <mat-card class="upload-card">
          <div class="upload-zone"
               [class.drag-over]="isDragOver()"
               (dragover)="onDragOver($event)"
               (dragleave)="isDragOver.set(false)"
               (drop)="onDrop($event)"
               (click)="fileInput.click()">
            <input #fileInput type="file" hidden
                   accept=".pdf,.jpg,.jpeg,.png,.dcm"
                   (change)="onFileSelected($event)">
            <mat-icon class="upload-icon">cloud_upload</mat-icon>
            <p>{{ 'doc.drag_drop' | translate }}</p>
            <span class="upload-hint">{{ 'doc.supported' | translate }}</span>
          </div>

          @if (selectedFile()) {
            <div class="upload-form">
              <div class="selected-file">
                <mat-icon>{{ getFileIcon(selectedFile()!.name) }}</mat-icon>
                <span>{{ selectedFile()!.name }}</span>
                <span class="file-size">{{ formatFileSize(selectedFile()!.size) }}</span>
                <button mat-icon-button (click)="selectedFile.set(null)">
                  <mat-icon>close</mat-icon>
                </button>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>{{ 'doc.select_type' | translate }}</mat-label>
                  <mat-select [ngModel]="uploadType()" (ngModelChange)="uploadType.set($event)">
                    <mat-option value="lab_report">{{ 'doc.lab_report' | translate }}</mat-option>
                    <mat-option value="radiology">{{ 'doc.radiology' | translate }}</mat-option>
                    <mat-option value="prescription">{{ 'doc.prescription' | translate }}</mat-option>
                    <mat-option value="insurance">{{ 'doc.insurance' | translate }}</mat-option>
                    <mat-option value="other">{{ 'doc.other' | translate }}</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>{{ 'doc.select_category' | translate }}</mat-label>
                  <input matInput [ngModel]="uploadCategory()" (ngModelChange)="uploadCategory.set($event)">
                </mat-form-field>
              </div>

              @if (uploading()) {
                <mat-progress-bar mode="indeterminate"></mat-progress-bar>
              }

              <button mat-flat-button color="primary"
                      [disabled]="uploading() || !uploadType()"
                      (click)="uploadDocument()">
                <mat-icon>upload</mat-icon>
                {{ 'doc.upload' | translate }}
              </button>
            </div>
          }
        </mat-card>
      }

      <!-- Filters -->
      <mat-button-toggle-group [value]="activeFilter()" (change)="onFilterChange($event.value)" class="filter-group">
        <mat-button-toggle value="all">{{ 'doc.all' | translate }}</mat-button-toggle>
        <mat-button-toggle value="lab_report">{{ 'doc.lab_report' | translate }}</mat-button-toggle>
        <mat-button-toggle value="radiology">{{ 'doc.radiology' | translate }}</mat-button-toggle>
        <mat-button-toggle value="prescription">{{ 'doc.prescription' | translate }}</mat-button-toggle>
        <mat-button-toggle value="insurance">{{ 'doc.insurance' | translate }}</mat-button-toggle>
      </mat-button-toggle-group>

      <!-- Document Grid -->
      @if (loading()) {
        <div class="docs-grid">
          @for (i of [1,2,3,4,5,6]; track i) {
            <app-skeleton-card [lines]="3" />
          }
        </div>
      } @else if (filteredDocs().length === 0) {
        <mat-card class="empty-card">
          <mat-icon>folder_open</mat-icon>
          <h3>{{ 'doc.no_documents' | translate }}</h3>
        </mat-card>
      } @else {
        <div class="docs-grid">
          @for (doc of filteredDocs(); track doc.id) {
            <mat-card class="doc-card">
              <div class="doc-preview" [ngClass]="'preview-' + doc.type">
                <mat-icon>{{ getDocTypeIcon(doc.type) }}</mat-icon>
              </div>
              <div class="doc-info">
                <strong class="doc-name">{{ doc.name }}</strong>
                <div class="doc-meta">
                  <mat-chip class="type-chip" [ngClass]="'type-' + doc.type">
                    {{ formatDocType(doc.type) }}
                  </mat-chip>
                  <span class="doc-size">{{ formatFileSize(doc.fileSize) }}</span>
                </div>
                <div class="doc-details">
                  <span><mat-icon class="tiny-icon">person</mat-icon> {{ doc.uploadedBy }}</span>
                  <span><mat-icon class="tiny-icon">schedule</mat-icon> {{ doc.uploadDate | date:'mediumDate' }}</span>
                </div>
                @if (doc.tags.length) {
                  <div class="doc-tags">
                    @for (tag of doc.tags; track tag) {
                      <mat-chip class="tag-chip">{{ tag }}</mat-chip>
                    }
                  </div>
                }
              </div>
              <mat-divider></mat-divider>
              <div class="doc-actions">
                <button mat-button color="primary">
                  <mat-icon>visibility</mat-icon> {{ 'doc.view' | translate }}
                </button>
                <button mat-button>
                  <mat-icon>download</mat-icon> {{ 'doc.download' | translate }}
                </button>
                <button mat-button color="warn" (click)="deleteDocument(doc)">
                  <mat-icon>delete</mat-icon> {{ 'doc.delete' | translate }}
                </button>
              </div>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .documents-container { max-width: 1100px; margin: 0 auto; }
    .documents-container.rtl { direction: rtl; text-align: right; }
    .docs-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    h1 { font-size: 28px; font-weight: 600; color: #1a237e; margin: 0; }
    .subtitle { color: #666; margin: 4px 0 0; }

    .upload-card { padding: 24px; margin-bottom: 24px; }

    .upload-zone {
      border: 2px dashed #ccc;
      border-radius: 12px;
      padding: 40px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .upload-zone:hover, .upload-zone.drag-over {
      border-color: #3f51b5;
      background: #f5f5ff;
    }
    .upload-icon { font-size: 48px; width: 48px; height: 48px; color: #3f51b5; margin-bottom: 8px; }
    .upload-hint { font-size: 13px; color: #888; }

    .upload-form { margin-top: 20px; }
    .selected-file {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; background: #f5f5f5; border-radius: 8px; margin-bottom: 16px;
    }
    .selected-file mat-icon { color: #3f51b5; }
    .selected-file span { flex: 1; }
    .file-size { color: #888; font-size: 13px; flex: 0 !important; }

    .form-row { display: flex; gap: 16px; margin-bottom: 8px; }
    .half-width { flex: 1; }

    .filter-group { margin-bottom: 20px; }

    .docs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .doc-card { overflow: hidden; }
    .doc-preview {
      height: 60px; display: flex; align-items: center; justify-content: center;
    }
    .doc-preview mat-icon { font-size: 32px; width: 32px; height: 32px; color: white; }
    .preview-lab_report { background: linear-gradient(135deg, #00897b, #4db6ac); }
    .preview-radiology { background: linear-gradient(135deg, #0277bd, #4fc3f7); }
    .preview-prescription { background: linear-gradient(135deg, #f57c00, #ffb74d); }
    .preview-insurance { background: linear-gradient(135deg, #7b1fa2, #ba68c8); }
    .preview-other { background: linear-gradient(135deg, #546e7a, #90a4ae); }

    .doc-info { padding: 16px; }
    .doc-name { display: block; margin-bottom: 8px; font-size: 15px; line-height: 1.3; }
    .doc-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .doc-size { font-size: 12px; color: #888; }
    .type-chip { font-size: 11px !important; min-height: 22px !important; }
    .type-lab_report { background: #e0f2f1 !important; color: #00897b !important; }
    .type-radiology { background: #e1f5fe !important; color: #0277bd !important; }
    .type-prescription { background: #fff3e0 !important; color: #f57c00 !important; }
    .type-insurance { background: #f3e5f5 !important; color: #7b1fa2 !important; }
    .type-other { background: #eceff1 !important; color: #546e7a !important; }

    .doc-details {
      display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #888;
    }
    .doc-details span { display: flex; align-items: center; gap: 4px; }
    .tiny-icon { font-size: 14px; width: 14px; height: 14px; }

    .doc-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
    .tag-chip {
      font-size: 11px !important; min-height: 20px !important;
      background: #f5f5f5 !important; color: #666 !important;
    }

    .doc-actions {
      display: flex; justify-content: space-between; padding: 8px;
    }
    .doc-actions button { font-size: 12px; }

    .empty-card { padding: 40px; text-align: center; color: #888; }
    .empty-card mat-icon { font-size: 48px; width: 48px; height: 48px; }

    @media (max-width: 600px) {
      .docs-grid { grid-template-columns: 1fr; }
      .form-row { flex-direction: column; }
      .doc-actions { flex-wrap: wrap; }
    }
  `]
})
export class DocumentsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly i18n = inject(I18nService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly documents = signal<PatientDocument[]>([]);
  readonly activeFilter = signal('all');
  readonly showUpload = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly uploadType = signal<string>('');
  readonly uploadCategory = signal('');
  readonly uploading = signal(false);
  readonly isDragOver = signal(false);

  readonly filteredDocs = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all') return this.documents();
    return this.documents().filter(d => d.type === filter);
  });

  ngOnInit(): void {
    this.api.getDocuments().subscribe(docs => {
      this.documents.set(docs);
      this.loading.set(false);
    });
  }

  onFilterChange(filter: string): void {
    this.activeFilter.set(filter);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File): void {
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      this.snackBar.open('File too large. Maximum size is 25MB.', this.i18n.t('common.close'), { duration: 4000 });
      return;
    }
    this.selectedFile.set(file);
  }

  uploadDocument(): void {
    const file = this.selectedFile();
    if (!file || !this.uploadType()) return;

    this.uploading.set(true);
    this.api.uploadDocument(file, {
      type: this.uploadType() as PatientDocument['type'],
      category: this.uploadCategory() || 'General',
      tags: []
    }).subscribe({
      next: (doc) => {
        this.documents.update(docs => [doc, ...docs]);
        this.uploading.set(false);
        this.selectedFile.set(null);
        this.uploadType.set('');
        this.uploadCategory.set('');
        this.showUpload.set(false);
        this.snackBar.open(this.i18n.t('doc.uploaded'), this.i18n.t('common.close'), { duration: 3000 });
      },
      error: () => {
        this.uploading.set(false);
        this.snackBar.open(this.i18n.t('doc.upload_failed'), this.i18n.t('common.close'), { duration: 5000 });
      }
    });
  }

  deleteDocument(doc: PatientDocument): void {
    if (!confirm(this.i18n.t('doc.delete_confirm'))) return;
    this.api.deleteDocument(doc.id).subscribe(() => {
      this.documents.update(docs => docs.filter(d => d.id !== doc.id));
      this.snackBar.open(this.i18n.t('doc.deleted'), this.i18n.t('common.close'), { duration: 3000 });
    });
  }

  getDocTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      lab_report: 'science', radiology: 'image', prescription: 'medication',
      insurance: 'health_and_safety', other: 'description'
    };
    return icons[type] ?? 'description';
  }

  getFileIcon(filename: string): string {
    if (filename.endsWith('.pdf')) return 'picture_as_pdf';
    if (/\.(jpg|jpeg|png)$/i.test(filename)) return 'image';
    return 'insert_drive_file';
  }

  formatDocType(type: string): string {
    return type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
