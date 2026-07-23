import { Component, ChangeDetectionStrategy, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ThHeaderComponent } from './th-header.component';
import { TelehealthService, TELE_CURRENCY } from './telehealth.service';
import { TELE_STYLES } from './telehealth.styles';
import { ConsultSpecialty, SupportedTeleLang, CareItem } from './telehealth.model';

type Step = 'specialty' | 'language' | 'concern' | 'review' | 'assigning' | 'waiting';

// =====================================================================
// INSTANT CONSULT WIZARD  (spec §6.B, steps 1–6)
//
// Choose speciality → language → brief concern → review & pay →
// doctor assignment → waiting room. Ends by handing off to the video
// room. Every step keeps completion under two minutes; drafts persist.
//
// Also demonstrates the payment-failure and doctor-delayed exceptions
// (spec §13) inline in the flow.
// =====================================================================
@Component({
  selector: 'app-instant-consult',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, ThHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="th-page th-wrap">
      <th-header [title]="titleFor()" [subtitle]="subtitleFor()" back="/telehealth/consult" [showCareFor]="step() === 'specialty'" />

      @if (isWizard()) {
        <div class="th-steps">
          @for (i of [0,1,2,3]; track i) { <div class="th-step-dot" [class.on]="wizardIndex() >= i"></div> }
        </div>
      }

      <!-- ============ STEP 1: SPECIALTY ============ -->
      @if (step() === 'specialty') {
        <div class="th-field">
          <label class="th-label">Not sure which speciality?</label>
          <div class="concern-search">
            <mat-icon>search</mat-icon>
            <input class="th-input" [(ngModel)]="concernText" (ngModelChange)="onConcernType()"
                   placeholder="Describe it in your words, e.g. “fever and body pain”" autocomplete="off" />
          </div>
          @if (suggestion(); as sg) {
            <div class="th-banner banner-info" style="margin-top:10px">
              <mat-icon>lightbulb</mat-icon>
              <div class="b-body">
                <strong>{{ sg.name }} may be suitable</strong>
                <span>This is a suggestion, not a medical diagnosis. You can pick any speciality below.</span>
              </div>
            </div>
          }
        </div>

        <label class="th-label" style="margin-top:6px">Choose a speciality or concern</label>
        <div class="th-stack">
          @for (s of svc.consultSpecialties; track s.key) {
            <button class="th-option" [class.sel]="specialty()?.key === s.key" (click)="selectSpecialty(s)">
              <div class="th-option-icon" [style.background]="s.color"><mat-icon>{{ s.icon }}</mat-icon></div>
              <div class="th-option-body">
                <strong>{{ s.name }}</strong>
                <span>{{ s.blurb }}</span>
              </div>
              <div class="opt-fee">{{ currency }} {{ s.fee }}</div>
              @if (specialty()?.key === s.key) { <mat-icon class="th-option-check">check_circle</mat-icon> }
            </button>
          }
        </div>
      }

      <!-- ============ STEP 2: LANGUAGE ============ -->
      @if (step() === 'language') {
        <p class="step-lede">We'll try to connect you to a doctor who speaks your preferred language.</p>
        <div class="th-grid-2">
          @for (l of svc.languages; track l) {
            <button class="th-option" [class.sel]="language() === l" (click)="selectLanguage(l)">
              <div class="th-option-icon" style="background:#00897b"><mat-icon>translate</mat-icon></div>
              <div class="th-option-body"><strong>{{ l }}</strong></div>
              @if (language() === l) { <mat-icon class="th-option-check">check_circle</mat-icon> }
            </button>
          }
        </div>
      }

      <!-- ============ STEP 3: CONCERN ============ -->
      @if (step() === 'concern') {
        <p class="step-lede">Just a few essentials — this takes under two minutes.</p>

        <div class="th-field">
          <label class="th-label">What would you like help with?</label>
          <textarea class="th-textarea" [ngModel]="problem()" (ngModelChange)="problem.set($event)"
                    placeholder="Briefly describe your main concern"></textarea>
        </div>

        <div class="th-field">
          <label class="th-label">How long have you had this?</label>
          <div class="th-pills">
            @for (d of durations; track d) {
              <button class="th-pill" [class.on]="duration() === d" (click)="duration.set(d)">{{ d }}</button>
            }
          </div>
        </div>

        <div class="th-field">
          <label class="th-label">Is it getting…</label>
          <div class="th-pills">
            @for (t of trends; track t.key) {
              <button class="th-pill" [class.on]="trend() === t.key" (click)="trend.set(t.key)">{{ t.label }}</button>
            }
          </div>
        </div>

        @if (specialty()?.key === 'derm') {
          <div class="th-banner banner-info">
            <mat-icon>photo_camera</mat-icon>
            <div class="b-body"><strong>Dermatology tip</strong><span>A clear, well-lit photo of the affected skin helps the doctor a lot.</span></div>
          </div>
        }
        @if (specialty()?.key === 'peds') {
          <div class="th-banner banner-info">
            <mat-icon>escalator_warning</mat-icon>
            <div class="b-body"><strong>Paediatrics</strong><span>Please have the child's guardian present during the consultation.</span></div>
          </div>
        }

        <div class="th-field">
          <label class="th-label">Add a photo or report <span class="opt">(optional)</span></label>
          <div class="upload-row">
            <button class="upload-btn" (click)="mockUpload()">
              <mat-icon>upload_file</mat-icon> Upload a file
            </button>
            <button class="upload-btn" (click)="mockSelectRecord()">
              <mat-icon>folder_shared</mat-icon> Select from My Records
            </button>
          </div>
          @if (uploads().length > 0) {
            <div class="upload-list">
              @for (u of uploads(); track u) {
                <span class="upload-chip"><mat-icon>description</mat-icon>{{ u }}<button (click)="removeUpload(u)"><mat-icon>close</mat-icon></button></span>
              }
            </div>
          }
        </div>
      }

      <!-- ============ STEP 4: REVIEW & PAY ============ -->
      @if (step() === 'review') {
        <div class="th-card summary">
          <h3 class="sum-title">Consultation summary</h3>
          <div class="sum-row"><span>Speciality</span><strong>{{ specialty()?.name }}</strong></div>
          <div class="sum-row"><span>Language</span><strong>{{ language() }}</strong></div>
          <div class="sum-row"><span>Expected connection</span><strong>2–5 minutes</strong></div>
          <div class="sum-row"><span>Follow-up</span><strong>Free message follow-up for 48h</strong></div>
          @if (uploads().length > 0) {
            <div class="sum-row"><span>Attached</span><strong>{{ uploads().length }} file(s)</strong></div>
          }
          <div class="sum-total"><span>Consultation fee</span><strong>{{ currency }} {{ specialty()?.fee }}</strong></div>
        </div>

        <label class="th-label" style="margin-top:8px">Payment method</label>
        <div class="th-stack">
          <button class="th-option" [class.sel]="payMethod() === 'card'" (click)="payMethod.set('card')">
            <div class="th-option-icon" style="background:#1565c0"><mat-icon>credit_card</mat-icon></div>
            <div class="th-option-body"><strong>Card ending 4242</strong><span>Visa · default</span></div>
            @if (payMethod() === 'card') { <mat-icon class="th-option-check">check_circle</mat-icon> }
          </button>
          <button class="th-option" [class.sel]="payMethod() === 'fail'" (click)="payMethod.set('fail')">
            <div class="th-option-icon" style="background:#c62828"><mat-icon>credit_card_off</mat-icon></div>
            <div class="th-option-body"><strong>Declined test card</strong><span>Use this to preview the payment-failed flow</span></div>
            @if (payMethod() === 'fail') { <mat-icon class="th-option-check">check_circle</mat-icon> }
          </button>
        </div>

        @if (payFailed()) {
          <div class="th-banner banner-red" style="margin-top:14px">
            <mat-icon>error</mat-icon>
            <div class="b-body">
              <strong>Your payment was not completed</strong>
              <span>Your consultation details are saved. Try again or choose another method.</span>
            </div>
          </div>
        }
      }

      <!-- ============ STEP 5: ASSIGNING ============ -->
      @if (step() === 'assigning') {
        <div class="assign-wrap">
          <div class="assign-spinner"><mat-icon>autorenew</mat-icon></div>
          <h3>We're finding an available doctor…</h3>
          <p>Matching you with a {{ specialty()?.name }} who speaks {{ language() }}.</p>
        </div>
      }

      <!-- ============ STEP 6: WAITING ROOM ============ -->
      @if (step() === 'waiting') {
        @if (assignedItem()?.provider; as doc) {
          <div class="th-card doc-card">
            <div class="th-provider">
              <div class="th-prov-avatar" style="background:linear-gradient(135deg,#1565c0,#42a5f5)">{{ doc.initials }}</div>
              <div class="th-prov-body">
                <strong>{{ doc.name }}</strong>
                <div class="pr-role">{{ doc.specialty }} · {{ doc.experienceYears }} yrs</div>
                <div class="doc-langs">
                  <span class="th-verified"><mat-icon>verified</mat-icon> Hospital-verified</span>
                  <span class="doc-lang"><mat-icon>translate</mat-icon>{{ doc.languages?.join(', ') }}</span>
                </div>
              </div>
            </div>
          </div>

          @if (doctorDelayed()) {
            <div class="th-banner banner-amber">
              <mat-icon>schedule</mat-icon>
              <div class="b-body">
                <strong>Your doctor is running about 10 minutes late</strong>
                <span>You can keep waiting, or we can alert you the moment they're ready.</span>
              </div>
            </div>
            <div class="th-grid-2" style="margin-bottom:14px">
              <button class="th-btn th-btn-ghost" (click)="alertMe()"><mat-icon>notifications_active</mat-icon> Alert me when ready</button>
              <button class="th-btn th-btn-ghost" (click)="requestCallback()"><mat-icon>call</mat-icon> Request callback</button>
            </div>
          } @else {
            <div class="th-banner banner-teal">
              <mat-icon>check_circle</mat-icon>
              <div class="b-body"><strong>Doctor assigned</strong><span>Estimated wait: under 2 minutes. Please complete a quick device check.</span></div>
            </div>
          }

          <label class="th-label">Get ready</label>
          <div class="th-stack" style="margin-bottom:8px">
            <button class="ready-row" [class.done]="deviceChecked()" (click)="checkDevice()">
              <mat-icon>{{ deviceChecked() ? 'check_circle' : 'videocam' }}</mat-icon>
              <div><strong>Check camera & microphone</strong><span>{{ deviceChecked() ? 'Camera and mic look good' : 'Tap to run a quick check' }}</span></div>
            </button>
            <button class="ready-row" (click)="mockUpload()">
              <mat-icon>upload_file</mat-icon>
              <div><strong>Upload one more document</strong><span>{{ uploads().length }} attached</span></div>
            </button>
          </div>
        }
      }

      <!-- ============ STICKY FOOTER ============ -->
      <div class="th-sticky">
        <div class="th-sticky-inner">
          @switch (step()) {
            @case ('specialty') {
              <button class="th-btn th-btn-primary th-btn-block" [disabled]="!specialty()" (click)="next()">Continue</button>
            }
            @case ('language') {
              <button class="th-btn th-btn-primary th-btn-block" [disabled]="!language()" (click)="next()">Continue</button>
            }
            @case ('concern') {
              <button class="th-btn th-btn-primary th-btn-block" [disabled]="!problem().trim()" (click)="next()">Review consultation</button>
            }
            @case ('review') {
              <div class="th-sticky-price"><span class="sp-label">Total</span><span class="sp-amount">{{ currency }} {{ specialty()?.fee }}</span></div>
              @if (payFailed()) {
                <button class="th-btn th-btn-primary" style="flex:1" (click)="retryPayment()"><mat-icon>refresh</mat-icon> Retry payment</button>
              } @else {
                <button class="th-btn th-btn-primary" style="flex:1" [disabled]="paying()" (click)="payAndConsult()">
                  <mat-icon>lock</mat-icon> {{ paying() ? 'Processing…' : 'Pay & consult' }}
                </button>
              }
            }
            @case ('waiting') {
              <button class="th-btn th-btn-danger" (click)="cancelConsult()">Cancel</button>
              <button class="th-btn th-btn-primary" style="flex:1" (click)="joinCall()"><mat-icon>videocam</mat-icon> Join consultation</button>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [TELE_STYLES, `
    .step-lede { font-size: 13.5px; color: #607d8b; margin: -4px 0 16px; }
    .concern-search { position: relative; }
    .concern-search mat-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #90a4ae; font-size: 20px; width: 20px; height: 20px; }
    .concern-search .th-input { padding-left: 42px; }
    .opt-fee { font-size: 13px; font-weight: 700; color: #1565c0; flex-shrink: 0; }

    .upload-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .upload-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; border: 1.5px dashed #c5cae9; border-radius: 12px; background: #f6f8fc; color: #1565c0; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .upload-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .upload-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 8px 6px 10px; background: #e8f5e9; border-radius: 10px; font-size: 12px; color: #2e7d32; font-weight: 600; }
    .upload-chip mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .upload-chip button { background: none; border: none; color: #66bb6a; cursor: pointer; display: flex; padding: 0; }

    .summary { padding: 18px; }
    .sum-title { margin: 0 0 12px; font-size: 15px; color: #1b3a4b; }
    .sum-row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 13.5px; color: #607d8b; border-bottom: 1px solid #f2f4f7; }
    .sum-row strong { color: #1b3a4b; font-weight: 600; }
    .sum-total { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e0e4ea; }
    .sum-total span { font-size: 14px; color: #455a64; }
    .sum-total strong { font-size: 20px; color: #1565c0; }

    .assign-wrap { text-align: center; padding: 40px 20px; }
    .assign-spinner { width: 72px; height: 72px; margin: 0 auto 18px; border-radius: 50%; background: #f3f8ff; display: flex; align-items: center; justify-content: center; }
    .assign-spinner mat-icon { font-size: 38px; width: 38px; height: 38px; color: #1565c0; animation: spin 1.1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .assign-wrap h3 { margin: 0 0 6px; font-size: 17px; color: #1b3a4b; }
    .assign-wrap p { margin: 0; font-size: 13.5px; color: #607d8b; }

    .doc-card { padding: 16px; margin-bottom: 14px; }
    .doc-langs { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 6px; }
    .doc-lang { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: #607d8b; font-weight: 600; }
    .doc-lang mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .ready-row { display: flex; align-items: center; gap: 12px; padding: 14px; background: white; border: 1.5px solid #eceff1; border-radius: 14px; width: 100%; text-align: left; font: inherit; cursor: pointer; }
    .ready-row.done { border-color: #b2dfdb; background: #effcfa; }
    .ready-row > mat-icon { font-size: 24px; width: 24px; height: 24px; color: #1565c0; flex-shrink: 0; }
    .ready-row.done > mat-icon { color: #00897b; }
    .ready-row strong { display: block; font-size: 13.5px; color: #1b3a4b; }
    .ready-row span { font-size: 12px; color: #90a4ae; }
  `]
})
export class InstantConsultComponent implements OnDestroy {
  readonly svc = inject(TelehealthService);
  private readonly router = inject(Router);
  readonly currency = TELE_CURRENCY;

  readonly step = signal<Step>('specialty');
  readonly specialty = signal<ConsultSpecialty | null>(null);
  readonly language = signal<SupportedTeleLang | null>(null);
  concernText = '';
  readonly suggestion = signal<ConsultSpecialty | null>(null);
  readonly problem = signal('');
  readonly duration = signal<string | null>(null);
  readonly trend = signal<'better' | 'unchanged' | 'worse' | null>(null);
  readonly uploads = signal<string[]>([]);
  readonly payMethod = signal<'card' | 'fail'>('card');
  readonly paying = signal(false);
  readonly payFailed = signal(false);
  readonly assignedItem = signal<CareItem | null>(null);
  readonly doctorDelayed = signal(false);
  readonly deviceChecked = signal(false);

  readonly durations = ['< 1 day', '1–3 days', '4–7 days', '> 1 week'];
  readonly trends = [
    { key: 'better' as const, label: 'Getting better' },
    { key: 'unchanged' as const, label: 'About the same' },
    { key: 'worse' as const, label: 'Getting worse' }
  ];

  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    // Restore any in-progress draft (mid-flow refresh resilience).
    const d = this.svc.draft();
    if (d.specialtyKey) this.specialty.set(this.svc.consultSpecialties.find(s => s.key === d.specialtyKey) ?? null);
    if (d.language) this.language.set(d.language);
    if (d.problem) this.problem.set(d.problem);
    if (d.uploadedNames) this.uploads.set(d.uploadedNames);
  }

  ngOnDestroy(): void { this.timers.forEach(clearTimeout); }

  isWizard(): boolean { return ['specialty', 'language', 'concern', 'review'].includes(this.step()); }
  wizardIndex(): number { return ['specialty', 'language', 'concern', 'review'].indexOf(this.step()); }

  titleFor(): string {
    switch (this.step()) {
      case 'specialty': return 'Choose a speciality';
      case 'language': return 'Preferred language';
      case 'concern': return 'Tell us briefly';
      case 'review': return 'Review & pay';
      case 'assigning': return 'Finding a doctor';
      case 'waiting': return 'Waiting room';
    }
  }
  subtitleFor(): string {
    return this.step() === 'specialty' ? 'Speak to an available doctor' : '';
  }

  // ---- Step 1 ----
  onConcernType(): void {
    this.suggestion.set(this.concernText.trim().length > 2 ? this.svc.suggestSpecialty(this.concernText) : null);
  }
  selectSpecialty(s: ConsultSpecialty): void {
    this.specialty.set(s);
    this.svc.saveDraft({ specialtyKey: s.key, concernText: this.concernText });
  }

  // ---- Step 2 ----
  selectLanguage(l: SupportedTeleLang): void {
    this.language.set(l);
    this.svc.saveDraft({ language: l });
  }

  // ---- Step 3 uploads ----
  mockUpload(): void {
    const names = ['Blood_report_May.pdf', 'Skin_photo.jpg', 'Prescription_scan.pdf', 'ECG_strip.png'];
    const name = names[this.uploads().length % names.length];
    this.uploads.update(u => u.includes(name) ? u : [...u, name]);
    this.svc.saveDraft({ uploadedNames: this.uploads() });
  }
  mockSelectRecord(): void {
    const name = 'HbA1c result (My Records).pdf';
    this.uploads.update(u => u.includes(name) ? u : [...u, name]);
    this.svc.saveDraft({ uploadedNames: this.uploads() });
  }
  removeUpload(u: string): void { this.uploads.update(list => list.filter(x => x !== u)); }

  // ---- Navigation ----
  next(): void {
    const order: Step[] = ['specialty', 'language', 'concern', 'review'];
    const i = order.indexOf(this.step());
    if (i >= 0 && i < order.length - 1) this.step.set(order[i + 1]);
  }

  // ---- Step 4: pay ----
  payAndConsult(): void {
    if (this.payMethod() === 'fail') { this.payFailed.set(true); return; }
    this.paying.set(true);
    this.timers.push(setTimeout(() => {
      this.paying.set(false);
      this.startAssignment();
    }, 1200));
  }
  retryPayment(): void {
    this.payFailed.set(false);
    this.payMethod.set('card');
  }

  private startAssignment(): void {
    const item = this.svc.createInstantConsult({
      specialty: this.specialty()!,
      language: this.language()!,
      concern: this.problem() || this.concernText,
      fee: this.specialty()!.fee,
      paymentState: 'paid'
    });
    this.assignedItem.set(item);
    this.step.set('assigning');
    // Simulate doctor search, then move to the waiting room. One in two
    // demo runs shows the "doctor delayed" exception.
    this.timers.push(setTimeout(() => {
      this.doctorDelayed.set((Date.now() % 2) === 0);
      this.step.set('waiting');
    }, 2200));
  }

  // ---- Step 6: waiting ----
  checkDevice(): void { this.deviceChecked.set(true); }
  alertMe(): void { this.doctorDelayed.set(false); }
  requestCallback(): void { this.doctorDelayed.set(false); }

  cancelConsult(): void {
    const item = this.assignedItem();
    if (item) this.svc.cancelItem(item.id);
    this.svc.clearDraft();
    this.router.navigateByUrl('/telehealth');
  }

  joinCall(): void {
    const item = this.assignedItem();
    if (!item) return;
    this.svc.updateItem(item.id, { status: 'ready_to_join' });
    this.svc.clearDraft();
    this.router.navigate(['/telehealth/consult/room', item.id]);
  }
}
