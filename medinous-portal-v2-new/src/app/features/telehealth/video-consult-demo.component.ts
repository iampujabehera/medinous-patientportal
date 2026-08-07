import {
  Component, ChangeDetectionStrategy, signal, ViewChild, ElementRef, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

// =============================================================================
// VIDEO CONSULTATION — full flow demo  (Angular port of VideoConsultDemo.jsx)
// -----------------------------------------------------------------------------
// Self-contained pitch demo of the end-to-end scheduled video consult:
//   slots -> consent + PAY NOW -> confirmed (+ optional readings) -> waiting
//   room -> in-call (4 controls) -> completed (e-Rx + follow-up).
// A floating DEMO panel simulates the backend + doctor side (fast-forward to
// T-10, doctor joins, doctor ends). Uses the real webcam for the self-view if
// permission is granted (nothing is transmitted); falls back to an avatar.
//
// Faithful reproduction of the master requirements doc — kept standalone so it
// can be shown on its own without touching the real booking journey.
// =============================================================================

type Stage = 'slots' | 'pay' | 'confirmed' | 'waiting' | 'call' | 'done';
interface Readings { bp: string; sugar: string; temp: string; weight: string; when: string; }
interface SavedReadings extends Readings { by: string; at: string; }

@Component({
  selector: 'app-video-consult-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vcd-root">

      <!-- ================= DOCTOR CARD HEADER (always visible) ================ -->
      <div class="vcd-card vcd-dochead">
        <div class="vcd-av">FA</div>
        <div>
          <b>Dr. Fatimah Al-Huwail</b>
          <div class="vcd-sub">Consultant Endocrinologist · Endocrinology</div>
        </div>
        <div class="vcd-fee"><b>$20.00</b><span>VIDEO</span></div>
      </div>

      <!-- ============================ 1. SLOTS =============================== -->
      @if (stage() === 'slots') {
        <div class="vcd-card">
          <div class="vcd-tabs">
            <div><mat-icon>local_hospital</mat-icon> Hospital Visit</div>
            <div class="on"><mat-icon>videocam</mat-icon> Video Consult</div>
          </div>
          <p class="vcd-note">Slots come from the doctor's shared availability pool (roster type Video/Both). Greyed = booked in either mode or currently held by another patient.</p>
          @for (grp of slotGroups; track grp.period) {
            <div>
              <div class="vcd-period">{{ grp.period }}</div>
              <div class="vcd-slotrow">
                @for (t of grp.list; track t) {
                  <button class="vcd-slot" [class.off]="isOff(t)" (click)="pickSlot(t)">{{ t }}</button>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- ======================= 2. CONSENT + PAY NOW ======================== -->
      @if (stage() === 'pay') {
        <div class="vcd-card">
          <h3>Confirm your video consultation</h3>
          <div class="vcd-row"><span>Today · {{ slot() }}</span><b>$20.00</b></div>
          <div class="vcd-hold">Slot held for you: <b>{{ mmss(holdLeft()) }}</b> — complete payment to confirm</div>
          <label class="vcd-consent">
            <input type="checkbox" [ngModel]="consent()" (ngModelChange)="consent.set($event)" />
            <span>I agree to the telehealth consultation terms. I understand this service is <b>not for medical emergencies</b>.</span>
          </label>
          <!-- Requirement 11.2: PAY NOW ONLY on the video tab — no Pay at Hospital -->
          <div class="vcd-payopt on"><mat-icon>credit_card</mat-icon> Pay Now <small>Pay securely online — required for video consultations</small></div>
          <button class="vcd-btn" (click)="pay()">Pay $20.00 &amp; Confirm</button>
          <button class="vcd-link" (click)="cancelHold()">Cancel (releases the hold)</button>
        </div>
      }

      <!-- ================== 3. CONFIRMED + READINGS FORM ===================== -->
      @if (stage() === 'confirmed') {
        <div class="vcd-card">
          <div class="vcd-okbar"><mat-icon>check_circle</mat-icon> Appointment confirmed &amp; paid — receipt saved to My Payments</div>
          <h3>Video consultation · Today, {{ slot() }}</h3>
          <p class="vcd-note">Join from this app up to 10 minutes before your time. You'll get a reminder with the link (24 h, 1 h and 15 min before).</p>
          <button class="vcd-btn" [disabled]="!joinEnabled()" (click)="enterWaiting()">
            {{ joinEnabled() ? 'Join consultation' : 'Join available 10 min before your slot' }}
          </button>

          <div class="vcd-form">
            <div class="vcd-formhead">Have recent readings? Add them for your doctor <small>(optional — everything below can be skipped)</small></div>
            @if (savedReadings(); as sr) {
              <div class="vcd-savednote">Saved ✓ — will show to the doctor as <b>patient-reported readings</b>, entered by {{ sr.by }} at {{ sr.at }}. You can edit until the doctor joins.</div>
            } @else {
              <div class="vcd-grid">
                <input placeholder="Blood pressure (e.g. 120/80)" [ngModel]="readings().bp" (ngModelChange)="setReading('bp', $event)" />
                <input placeholder="Blood sugar (mg/dL)" [ngModel]="readings().sugar" (ngModelChange)="setReading('sugar', $event)" />
                <input placeholder="Temperature (°C)" [ngModel]="readings().temp" (ngModelChange)="setReading('temp', $event)" />
                <input placeholder="Weight (kg)" [ngModel]="readings().weight" (ngModelChange)="setReading('weight', $event)" />
              </div>
              <div class="vcd-when">
                Measured:
                @for (w of whenOptions; track w) {
                  <button [class.sel]="readings().when === w" (click)="setReading('when', w)">{{ w }}</button>
                }
              </div>
              <button class="vcd-btn ghost" (click)="saveReadings()">Save readings</button>
            }
          </div>
        </div>
      }

      <!-- ========================= 4. WAITING ROOM =========================== -->
      @if (stage() === 'waiting') {
        <div class="vcd-card vcd-dark">
          <h3>Waiting room</h3>
          <div class="vcd-stagebox">
            <div class="vcd-self">
              @if (camOff()) {
                <div class="vcd-self-off"><mat-icon>videocam_off</mat-icon> off</div>
              } @else {
                <video #selfVideo autoplay playsinline muted></video>
              }
              <span>You</span>
            </div>
          </div>
          <div class="vcd-waitline"><span class="vcd-pulse"></span> Dr. Al-Huwail will join shortly · you've been waiting {{ mmss(waitSecs()) }}</div>
          <p class="vcd-note lite">Joining this room is your check-in — the clinic can see you've arrived. (This is the webhook moment: the doctor's queue timer just started.)</p>
        </div>
      }

      <!-- ============================ 5. IN CALL ============================= -->
      @if (stage() === 'call') {
        <div class="vcd-card vcd-dark">
          <div class="vcd-callgrid">
            <div class="vcd-peer">
              <div class="vcd-peer-av">FA</div>
              <span>Dr. Fatimah Al-Huwail</span>
            </div>
            <div class="vcd-self small">
              @if (camOff()) {
                <div class="vcd-self-off"><mat-icon>videocam_off</mat-icon> off</div>
              } @else {
                <video #selfVideo autoplay playsinline muted></video>
              }
              <span>You</span>
            </div>
          </div>
          <!-- Requirement 8.2: exactly four controls -->
          <div class="vcd-controls">
            <button (click)="muted.set(!muted())">
              <mat-icon>{{ muted() ? 'mic_off' : 'mic' }}</mat-icon> {{ muted() ? 'Unmute' : 'Mute' }}
            </button>
            <button (click)="toggleCam()">
              <mat-icon>{{ camOff() ? 'videocam' : 'videocam_off' }}</mat-icon> {{ camOff() ? 'Camera on' : 'Camera off' }}
            </button>
            <button (click)="reconnect()"><mat-icon>refresh</mat-icon> Reconnect</button>
            <button class="end" (click)="endCall()"><mat-icon>call_end</mat-icon> End call</button>
          </div>
        </div>
      }

      <!-- ============================= 6. DONE =============================== -->
      @if (stage() === 'done') {
        <div class="vcd-card">
          <div class="vcd-okbar"><mat-icon>check_circle</mat-icon> Consultation completed</div>
          <div class="vcd-doc"><mat-icon>medication</mat-icon> <b>e-Prescription</b> — Metformin 500 mg, 1-0-1 × 30 days <span class="vcd-tag">in My Records</span></div>
          <div class="vcd-doc"><mat-icon>receipt_long</mat-icon> <b>Receipt</b> — $20.00 · Teleconsultation (Consultant) <span class="vcd-tag">in My Payments</span></div>
          <div class="vcd-fup">
            <b>Dr. Al-Huwail advised a follow-up by 20 Aug</b>
            <div class="vcd-fupbtns"><button class="vcd-btn ghost">Book video follow-up</button><button class="vcd-btn ghost">Book in-person</button></div>
            <small>Booked via this card — follow-up pricing applies. General bookings stay full price.</small>
          </div>
          <button class="vcd-link" (click)="restart()">Restart demo</button>
        </div>
      }

      <!-- ========================= DEMO CONTROLS ============================= -->
      <div class="vcd-demo">
        <b>DEMO CONTROLS (simulates backend + doctor)</b>
        @if (stage() === 'confirmed' && !joinEnabled()) {
          <button (click)="joinEnabled.set(true)"><mat-icon>fast_forward</mat-icon> Fast-forward to T-10 min (enables Join)</button>
        }
        @if (stage() === 'waiting') {
          <button (click)="doctorJoins()"><mat-icon>medical_services</mat-icon> Doctor clicks JOIN CALL</button>
        }
        @if (stage() === 'call') {
          <button (click)="endCall()">Doctor ends the call</button>
        }
        <span class="vcd-demonote">stage: {{ stage() }}{{ doctorIn() && stage() === 'call' ? ' · encounter running (Telehealth)' : '' }}</span>
      </div>
    </div>
  `,
  styles: [`
    .vcd-root{max-width:760px;margin:0 auto;padding:20px 14px;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937;display:flex;flex-direction:column;gap:14px}
    .vcd-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:20px;box-shadow:0 3px 12px rgba(0,0,0,.06)}
    .vcd-dochead{display:flex;align-items:center;gap:14px}
    .vcd-av{width:52px;height:52px;border-radius:50%;background:#ccf1ec;color:#0d9488;display:flex;align-items:center;justify-content:center;font-weight:700}
    .vcd-sub{color:#6b7280;font-size:13px}
    .vcd-fee{margin-left:auto;text-align:right}
    .vcd-fee b{font-size:20px}
    .vcd-fee span{display:block;font-size:11px;color:#7c3aed;font-weight:700;letter-spacing:.5px}
    .vcd-tabs{display:flex;border-radius:12px;overflow:hidden;background:#f3f4f6;margin-bottom:14px}
    .vcd-tabs div{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:12px;font-weight:600;color:#6b7280;font-size:14px}
    .vcd-tabs .on{background:#fff;color:#7c3aed;box-shadow:0 1px 5px rgba(0,0,0,.1);border-radius:12px}
    .vcd-tabs mat-icon{font-size:18px;width:18px;height:18px}
    .vcd-period{font-weight:600;font-size:13px;color:#374151;margin:12px 0 8px}
    .vcd-slotrow{display:flex;flex-wrap:wrap;gap:10px}
    .vcd-slot{padding:11px 16px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;font-size:14px;cursor:pointer;font-family:inherit}
    .vcd-slot:hover{border-color:#0d9488}
    .vcd-slot.off{color:#c7ccd4;cursor:not-allowed;background:#fafafa}
    .vcd-note{font-size:12.5px;color:#6b7280;line-height:1.5;margin:4px 0 6px}
    .vcd-note.lite{color:#9aa3b0}
    .vcd-row{display:flex;justify-content:space-between;font-size:15px;margin:10px 0}
    .vcd-hold{background:#fffbeb;color:#92400e;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px}
    .vcd-consent{display:flex;gap:10px;font-size:13px;line-height:1.5;margin-bottom:12px;align-items:flex-start}
    .vcd-consent input{margin-top:3px}
    .vcd-payopt{display:flex;align-items:center;gap:8px;flex-wrap:wrap;border:1.5px solid #e5e7eb;border-radius:12px;padding:12px 14px;font-weight:600;font-size:14px;margin-bottom:12px}
    .vcd-payopt small{flex-basis:100%;font-weight:400;color:#6b7280;margin-top:2px}
    .vcd-payopt.on{border-color:#0d9488;background:#f0fdfa}
    .vcd-payopt mat-icon{font-size:19px;width:19px;height:19px;color:#0d9488}
    .vcd-btn{width:100%;padding:14px;border:none;border-radius:12px;background:#0d9488;color:#fff;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}
    .vcd-btn:disabled{background:#9ca3af;cursor:not-allowed}
    .vcd-btn.ghost{background:#fff;color:#0d9488;border:1.5px solid #0d9488;margin-top:8px}
    .vcd-link{background:none;border:none;color:#0d9488;text-decoration:underline;font-size:13px;margin-top:10px;cursor:pointer;display:block;width:100%;font-family:inherit}
    .vcd-okbar{display:flex;align-items:center;gap:7px;background:#ecfdf5;color:#065f46;border-radius:10px;padding:11px 13px;font-size:13.5px;margin-bottom:12px}
    .vcd-okbar mat-icon{font-size:18px;width:18px;height:18px}
    .vcd-form{margin-top:18px;border-top:1px dashed #e5e7eb;padding-top:14px}
    .vcd-formhead{font-weight:600;font-size:14px;margin-bottom:10px}
    .vcd-formhead small{font-weight:400;color:#6b7280}
    .vcd-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
    .vcd-grid input{padding:11px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:13.5px;font-family:inherit}
    .vcd-when{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;color:#6b7280;margin-bottom:6px}
    .vcd-when button{padding:6px 12px;border:1px solid #e5e7eb;border-radius:999px;background:#fff;font-size:12.5px;cursor:pointer;font-family:inherit}
    .vcd-when button.sel{background:#0d9488;color:#fff;border-color:#0d9488}
    .vcd-savednote{background:#f0fdfa;color:#0f766e;border-radius:10px;padding:11px 13px;font-size:13px;line-height:1.5}
    .vcd-dark{background:#111827;color:#f3f4f6;border-color:#111827}
    .vcd-dark h3{margin-bottom:12px}
    .vcd-stagebox{display:flex;justify-content:center;padding:8px 0 14px}
    .vcd-self{position:relative;width:280px;height:200px;border-radius:14px;overflow:hidden;background:#1f2937;display:flex;align-items:center;justify-content:center}
    .vcd-self video{width:100%;height:100%;object-fit:cover}
    .vcd-self span{position:absolute;bottom:8px;left:10px;font-size:12px;background:rgba(0,0,0,.5);padding:2px 8px;border-radius:6px}
    .vcd-self.small{width:150px;height:110px;position:absolute;bottom:12px;right:12px;border:2px solid #374151}
    .vcd-self-off{display:flex;align-items:center;gap:5px;color:#9ca3af;font-size:14px}
    .vcd-self-off mat-icon{font-size:18px;width:18px;height:18px}
    .vcd-waitline{display:flex;align-items:center;gap:10px;font-size:14px;justify-content:center;margin-bottom:8px}
    .vcd-pulse{width:10px;height:10px;border-radius:50%;background:#34d399;animation:vcdp 1.4s infinite}
    @keyframes vcdp{0%{box-shadow:0 0 0 0 rgba(52,211,153,.5)}70%{box-shadow:0 0 0 9px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}
    .vcd-callgrid{position:relative;height:320px;border-radius:14px;overflow:hidden;background:#0b1220;margin-bottom:14px}
    .vcd-peer{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#cbd5e1}
    .vcd-peer-av{width:84px;height:84px;border-radius:50%;background:#164e63;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;color:#67e8f9}
    .vcd-controls{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
    .vcd-controls button{display:inline-flex;align-items:center;gap:6px;padding:11px 16px;border-radius:999px;border:1px solid #374151;background:#1f2937;color:#e5e7eb;font-size:13.5px;cursor:pointer;font-family:inherit}
    .vcd-controls button mat-icon{font-size:18px;width:18px;height:18px}
    .vcd-controls .end{background:#b91c1c;border-color:#b91c1c;color:#fff}
    .vcd-doc{border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;font-size:14px;margin-bottom:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .vcd-doc mat-icon{font-size:20px;width:20px;height:20px;color:#0d9488}
    .vcd-tag{margin-left:auto;font-size:11px;background:#f0fdfa;color:#0f766e;padding:3px 9px;border-radius:999px;font-weight:600}
    .vcd-fup{border:1.5px solid #ccf1ec;background:#f0fdfa;border-radius:12px;padding:14px;font-size:14px;margin-top:6px}
    .vcd-fupbtns{display:flex;gap:10px;margin:10px 0 6px}
    .vcd-fup small{color:#6b7280;font-size:12px}
    .vcd-demo{position:fixed;bottom:14px;right:14px;background:#111827;color:#e5e7eb;border-radius:12px;padding:12px 14px;font-size:12px;display:flex;flex-direction:column;gap:8px;max-width:250px;box-shadow:0 6px 20px rgba(0,0,0,.3);z-index:50}
    .vcd-demo button{display:inline-flex;align-items:center;gap:6px;justify-content:center;padding:9px 12px;border-radius:8px;border:none;background:#0d9488;color:#fff;font-size:12.5px;cursor:pointer;font-family:inherit}
    .vcd-demo button mat-icon{font-size:16px;width:16px;height:16px}
    .vcd-demonote{color:#9ca3af;font-size:11px}
    @media (max-width:560px){.vcd-grid{grid-template-columns:1fr}.vcd-self{width:100%;height:180px}}
  `]
})
export class VideoConsultDemoComponent implements OnDestroy {
  // Shared availability pool. Greyed slots are booked in either mode, or held.
  readonly slotGroups = [
    { period: 'Morning',   list: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'] },
    { period: 'Afternoon', list: ['02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'] },
    { period: 'Evening',   list: ['05:00 PM'] }
  ];
  private readonly TAKEN = ['09:30 AM', '03:00 PM'];   // booked (shared pool)
  private readonly HELD  = ['10:30 AM'];               // held by another patient
  readonly whenOptions = ['Today', 'Yesterday', 'This week'];

  readonly stage = signal<Stage>('slots');
  readonly slot = signal<string | null>(null);
  readonly consent = signal(false);
  readonly holdLeft = signal(600);        // 10-min hold, seconds
  readonly joinEnabled = signal(false);   // T-10 rule (demo fast-forwards)
  readonly waitSecs = signal(0);          // waiting-room timer (webhook demo)
  readonly readings = signal<Readings>({ bp: '', sugar: '', temp: '', weight: '', when: 'Today' });
  readonly savedReadings = signal<SavedReadings | null>(null);
  readonly muted = signal(false);
  readonly camOff = signal(false);
  readonly doctorIn = signal(false);

  @ViewChild('selfVideo') set selfVideo(ref: ElementRef<HTMLVideoElement> | undefined) {
    this.videoEl = ref?.nativeElement ?? null;
    this.attachStream();
  }
  private videoEl: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private holdTimer: ReturnType<typeof setInterval> | null = null;
  private waitTimer: ReturnType<typeof setInterval> | null = null;

  mmss(s: number): string {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  // ---- Slot selection ------------------------------------------------------
  isOff(t: string): boolean {
    return this.TAKEN.includes(t) || this.HELD.includes(t);
  }

  pickSlot(t: string): void {
    if (this.TAKEN.includes(t)) return;
    if (this.HELD.includes(t)) {
      alert('This slot was just taken — please pick another. (Another patient is completing payment; if they abandon, it frees in minutes.)');
      return;
    }
    this.slot.set(t);
    this.stage.set('pay');
    this.startHold();
  }

  // ---- Hold countdown while paying -----------------------------------------
  private startHold(): void {
    this.stopHold();
    this.holdLeft.set(600);
    this.holdTimer = setInterval(() => {
      const s = this.holdLeft();
      if (s <= 1) {
        this.stopHold();
        this.stage.set('slots');
        this.slot.set(null);
        this.holdLeft.set(600);
        alert('Hold expired — the slot was released back to the pool. (In production: one WhatsApp nudge, nothing on any hospital screen.)');
        return;
      }
      this.holdLeft.set(s - 1);
    }, 1000);
  }

  private stopHold(): void {
    if (this.holdTimer) { clearInterval(this.holdTimer); this.holdTimer = null; }
  }

  cancelHold(): void {
    this.stopHold();
    this.stage.set('slots');
    this.slot.set(null);
  }

  pay(): void {
    if (!this.consent()) { alert('Please accept the telehealth terms first.'); return; }
    this.stopHold();
    this.stage.set('confirmed');
  }

  // ---- Confirmed: optional readings ----------------------------------------
  setReading(key: keyof Readings, val: string): void {
    this.readings.update(r => ({ ...r, [key]: val }));
  }

  saveReadings(): void {
    const r = this.readings();
    if (!(r.bp || r.sugar || r.temp || r.weight)) {
      alert('All fields are optional — add at least one reading to save, or skip entirely.');
      return;
    }
    this.savedReadings.set({
      ...r,
      by: 'Fatima Sharma (patient)',
      at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  // ---- Waiting room --------------------------------------------------------
  enterWaiting(): void {
    this.stage.set('waiting');
    this.waitSecs.set(0);
    this.stopWait();
    this.waitTimer = setInterval(() => this.waitSecs.update(s => s + 1), 1000);
    this.startCam();
  }

  private stopWait(): void {
    if (this.waitTimer) { clearInterval(this.waitTimer); this.waitTimer = null; }
  }

  // ---- In-call -------------------------------------------------------------
  doctorJoins(): void {
    this.stopWait();
    this.doctorIn.set(true);
    this.stage.set('call');
    this.startCam();
  }

  toggleCam(): void {
    this.camOff.set(!this.camOff());
    if (!this.camOff()) this.attachStream();
  }

  reconnect(): void {
    alert('Reconnecting to the same room… (auto-rejoin on drop; if unrecoverable, the doctor calls your phone)');
  }

  endCall(): void {
    this.stopWait();
    this.stage.set('done');
    this.stopCam();
  }

  restart(): void {
    this.stopHold();
    this.stopWait();
    this.stopCam();
    this.slot.set(null);
    this.consent.set(false);
    this.holdLeft.set(600);
    this.joinEnabled.set(false);
    this.waitSecs.set(0);
    this.readings.set({ bp: '', sugar: '', temp: '', weight: '', when: 'Today' });
    this.savedReadings.set(null);
    this.muted.set(false);
    this.camOff.set(false);
    this.doctorIn.set(false);
    this.stage.set('slots');
  }

  // ---- Webcam self-view (never transmitted anywhere) -----------------------
  private async startCam(): Promise<void> {
    if (this.stream) { this.attachStream(); return; }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      this.attachStream();
    } catch {
      // Permission denied — the avatar / off state renders instead.
    }
  }

  private attachStream(): void {
    // Runs on every #selfVideo (re)bind; also after camera is toggled back on.
    if (this.videoEl && this.stream && !this.camOff()) {
      this.videoEl.srcObject = this.stream;
    }
  }

  private stopCam(): void {
    this.stream?.getTracks().forEach(tr => tr.stop());
    this.stream = null;
  }

  ngOnDestroy(): void {
    this.stopHold();
    this.stopWait();
    this.stopCam();
  }
}
