import {
  Component, ChangeDetectionStrategy, inject, signal, ViewChild, ElementRef, OnInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { RecordVitalsComponent } from '../../shared/components/record-vitals/record-vitals.component';
import { VitalSign } from '../../core/models/patient.model';

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

type Stage = 'slots' | 'pay' | 'chat' | 'waiting' | 'call';
type Sender = 'system' | 'doctor' | 'patient';
type MsgKind = 'text' | 'link' | 'rx' | 'followup' | 'readings';
interface ChatMsg { id: number; sender: Sender; text?: string; kind: MsgKind; time: string; }

@Component({
  selector: 'app-video-consult-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RecordVitalsComponent],
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
      <!-- ===== 3. CONSULTATION ROOM (chat) — the durable hub =====
           Practo-style: booking opens a chat with the doctor that holds the
           join link, the messages, the reminder, and afterwards the e-Rx +
           follow-up. It can be minimised to a dock and reopened — the "way
           back" so the consultation is a place, not a one-shot screen. -->
      @if (stage() === 'chat') {
        @if (chatMin()) {
          <button class="vcd-dock" (click)="openChat()">
            <div class="ch-av sm">FA</div>
            <div class="vd-body">
              <strong>Consultation with Dr. Al-Huwail</strong>
              <span>{{ completed() ? 'Completed · tap to view' : 'Tap to open chat' }}</span>
            </div>
            @if (unread() > 0) { <span class="vd-badge">{{ unread() }}</span> }
            <mat-icon>expand_less</mat-icon>
          </button>
        } @else {
          <div class="vcd-chatroom">
            <!-- header -->
            <div class="ch-head">
              <div class="ch-av">FA</div>
              <div class="ch-id">
                <strong>Dr. Fatimah Al-Huwail</strong>
                <span [class.online]="joinEnabled() && !completed()">
                  @if (completed()) { Consultation completed }
                  @else if (joinEnabled()) { <i class="ch-dot"></i> Ready to see you now }
                  @else { Video consult · Today, {{ slot() }} }
                </span>
              </div>
              @if (!completed()) {
                <button class="ch-join" [class.ready]="joinEnabled()" [disabled]="!joinEnabled()" (click)="enterWaiting()">
                  <mat-icon>videocam</mat-icon> {{ joinEnabled() ? 'Join' : slot() }}
                </button>
              }
              <button class="ch-min" (click)="minimizeChat()" aria-label="Minimize chat"><mat-icon>expand_more</mat-icon></button>
            </div>

            <!-- messages -->
            <div class="ch-body" #chatScroll>
              @for (m of messages(); track m.id) {
                @switch (m.kind) {
                  @case ('link') {
                    <div class="ch-row system">
                      <div class="ch-linkcard">
                        <mat-icon>videocam</mat-icon>
                        <div class="cl-body">
                          <strong>Your consultation link</strong>
                          <span class="cl-url">{{ joinUrl }}</span>
                        </div>
                        <button class="cl-copy" (click)="copyLink()" aria-label="Copy link">
                          <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
                        </button>
                      </div>
                    </div>
                  }
                  @case ('rx') {
                    <div class="ch-row doctor">
                      <div class="ch-av sm">FA</div>
                      <div class="ch-doccard">
                        <mat-icon>medication</mat-icon>
                        <div><strong>e-Prescription</strong><span>Metformin 500 mg · 1-0-1 × 30 days</span></div>
                        <span class="vcd-tag">My Records</span>
                      </div>
                    </div>
                  }
                  @case ('followup') {
                    <div class="ch-row doctor">
                      <div class="ch-av sm">FA</div>
                      <div class="ch-fup">
                        <strong>Follow-up advised by 20 Aug</strong>
                        <div class="cf-btns">
                          <button (click)="restart()">Book video</button>
                          <button (click)="restart()">Book in-person</button>
                        </div>
                      </div>
                    </div>
                  }
                  @case ('readings') {
                    <div class="ch-row patient">
                      <div class="ch-readings"><mat-icon>favorite</mat-icon> {{ m.text }}<span class="ch-time">{{ m.time }}</span></div>
                    </div>
                  }
                  @default {
                    @if (m.sender === 'system') {
                      <div class="ch-row system"><div class="ch-syschip">{{ m.text }}</div></div>
                    } @else {
                      <div class="ch-row {{ m.sender }}">
                        @if (m.sender === 'doctor') { <div class="ch-av sm">FA</div> }
                        <div class="ch-bubble">{{ m.text }}<span class="ch-time">{{ m.time }}</span></div>
                      </div>
                    }
                  }
                }
              }
              @if (docTyping()) {
                <div class="ch-row doctor">
                  <div class="ch-av sm">FA</div>
                  <div class="ch-bubble typing"><span></span><span></span><span></span></div>
                </div>
              }
            </div>

            <!-- quick actions + composer -->
            @if (!completed()) {
              <div class="ch-quick">
                <button class="ch-chip" (click)="openReadings()"><mat-icon>favorite</mat-icon> Share recent readings</button>
                <button class="ch-chip" (click)="copyLink()"><mat-icon>content_copy</mat-icon> Copy link</button>
              </div>
            }
            <div class="ch-input">
              <input [ngModel]="draft()" (ngModelChange)="draft.set($event)" (keyup.enter)="send()"
                     placeholder="Message Dr. Al-Huwail…" aria-label="Message">
              <button class="ch-send" [disabled]="!draft().trim()" (click)="send()" aria-label="Send">
                <mat-icon>send</mat-icon>
              </button>
            </div>
          </div>
        }

        @if (readingsOpen()) {
          <app-record-vitals variant="sheet" doctorName="Dr. Al-Huwail"
                             context="Shared into your consultation chat"
                             (saved)="onReadingsShared($event)"
                             (closed)="readingsOpen.set(false)" />
        }
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


      <!-- ===== In-app 10-minute reminder (the portal notification) =====
           Transient card pinned top-center — mirrors the push the patient gets
           in the app. Dismissible, so it never clutters the resting UI. -->
      @if (reminder()) {
        <div class="vcd-notif" role="alert">
          <mat-icon class="vn-bell">notifications_active</mat-icon>
          <div class="vn-body">
            <strong>Your video consultation starts in 10 minutes</strong>
            <span>Dr. Fatimah Al-Huwail · Endocrinology. Join when you're ready.</span>
          </div>
          <button class="vn-join" (click)="joinFromReminder()">Join</button>
          <button class="vn-x" (click)="reminder.set(false)" aria-label="Dismiss"><mat-icon>close</mat-icon></button>
        </div>
      }

      <!-- ========================= DEMO CONTROLS ============================= -->
      <div class="vcd-demo">
        <b>DEMO CONTROLS (simulates backend + doctor)</b>
        @if (stage() === 'chat' && !joinEnabled()) {
          <button (click)="reachT10()"><mat-icon>notifications_active</mat-icon> Fire 10-min reminder (enables Join)</button>
        }
        @if (stage() === 'chat' && joinEnabled() && !completed()) {
          <button (click)="doctorChatMessage()"><mat-icon>chat</mat-icon> Doctor sends a chat message</button>
        }
        @if (stage() === 'waiting') {
          <button (click)="doctorJoins()"><mat-icon>medical_services</mat-icon> Doctor clicks JOIN CALL</button>
        }
        @if (stage() === 'call') {
          <button (click)="endCall()">Doctor ends the call</button>
        }
        @if (stage() !== 'slots') {
          <button (click)="restart()"><mat-icon>restart_alt</mat-icon> Restart demo</button>
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
    /* Join link + reminder promise (compact, two rows) */
    .vcd-meet{border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:12px 0}
    .vcd-meet-link{display:flex;align-items:center;gap:8px;padding:11px 12px;background:#f0fdfa}
    .vcd-meet-link>mat-icon{color:#0d9488;font-size:19px;width:19px;height:19px;flex-shrink:0}
    .vcd-url{flex:1;min-width:0;font-size:13px;color:#0f5c58;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .vcd-copy{display:inline-flex;align-items:center;gap:4px;flex-shrink:0;border:1px solid #b6e3d8;background:#fff;color:#0d9488;border-radius:8px;padding:5px 10px;font:inherit;font-size:12px;font-weight:600;cursor:pointer}
    .vcd-copy:hover{background:#e0f2f1}
    .vcd-copy mat-icon{font-size:15px;width:15px;height:15px}
    .vcd-meet-remind{display:flex;align-items:flex-start;gap:7px;padding:10px 12px;font-size:12.5px;color:#6b7280;line-height:1.45;border-top:1px dashed #e5e7eb}
    .vcd-meet-remind mat-icon{color:#f59e0b;font-size:17px;width:17px;height:17px;flex-shrink:0;margin-top:1px}
    .vcd-meet-remind b{color:#374151}

    /* In-app 10-min reminder notification (transient) */
    .vcd-notif{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:11px;width:min(440px,calc(100vw - 28px));background:#fff;border:1px solid #e5e7eb;border-left:4px solid #0d9488;border-radius:14px;padding:12px 14px;box-shadow:0 10px 30px rgba(0,0,0,.18);animation:vcdSlide .22s cubic-bezier(.16,1,.3,1)}
    @keyframes vcdSlide{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}
    .vn-bell{color:#0d9488;font-size:24px;width:24px;height:24px;flex-shrink:0}
    .vn-body{flex:1;min-width:0;display:flex;flex-direction:column}
    .vn-body strong{font-size:13.5px;color:#111827}
    .vn-body span{font-size:12px;color:#6b7280}
    .vn-join{flex-shrink:0;border:none;background:#0d9488;color:#fff;border-radius:9px;padding:9px 16px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
    .vn-join:hover{background:#0b7d72}
    .vn-x{flex-shrink:0;border:none;background:transparent;color:#9ca3af;cursor:pointer;display:flex;padding:2px}
    .vn-x mat-icon{font-size:18px;width:18px;height:18px}

    /* ===== Consultation chat room ===== */
    .vcd-chatroom{display:flex;flex-direction:column;height:min(620px,72vh);background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,.06)}
    .ch-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #eef1f1;background:#fbfdfd}
    .ch-av{width:40px;height:40px;border-radius:50%;background:#0d9488;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0}
    .ch-av.sm{width:30px;height:30px;font-size:12px}
    .ch-id{flex:1;min-width:0;display:flex;flex-direction:column}
    .ch-id strong{font-size:14.5px;color:#111827}
    .ch-id span{font-size:12px;color:#9ca3af;display:flex;align-items:center;gap:5px}
    .ch-id span.online{color:#0d9488;font-weight:600}
    .ch-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block}
    .ch-join{display:inline-flex;align-items:center;gap:5px;flex-shrink:0;border:1px solid #d1d5db;background:#f3f4f6;color:#9ca3af;border-radius:999px;padding:7px 14px;font:inherit;font-size:13px;font-weight:700;cursor:not-allowed}
    .ch-join.ready{background:#0d9488;border-color:#0d9488;color:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(13,148,136,.3)}
    .ch-join mat-icon{font-size:17px;width:17px;height:17px}
    .ch-min{border:none;background:transparent;color:#9ca3af;cursor:pointer;display:flex;padding:4px;flex-shrink:0}
    .ch-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f7f9f9}
    .ch-row{display:flex;gap:8px;align-items:flex-end;max-width:100%}
    .ch-row.patient{justify-content:flex-end}
    .ch-row.system{justify-content:center}
    .ch-bubble{max-width:76%;padding:9px 12px;border-radius:14px;font-size:13.5px;line-height:1.45;position:relative;background:#fff;color:#1f2937;border:1px solid #eceff1;border-bottom-left-radius:4px}
    .ch-row.patient .ch-bubble{background:#0d9488;color:#fff;border:none;border-radius:14px;border-bottom-right-radius:4px}
    .ch-time{display:block;font-size:9.5px;opacity:.6;margin-top:3px;text-align:right}
    .ch-syschip{font-size:11.5px;color:#6b7280;background:#eef2f2;border-radius:999px;padding:5px 12px;text-align:center;max-width:88%}
    .ch-bubble.typing{display:flex;gap:3px;padding:12px 14px}
    .ch-bubble.typing span{width:6px;height:6px;border-radius:50%;background:#b0bcc0;animation:chType 1.1s infinite}
    .ch-bubble.typing span:nth-child(2){animation-delay:.18s}
    .ch-bubble.typing span:nth-child(3){animation-delay:.36s}
    @keyframes chType{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
    /* link + doc + follow-up + readings cards inside chat */
    .ch-linkcard{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid #cdeee8;border-radius:12px;padding:10px 12px;max-width:88%;box-shadow:0 1px 4px rgba(0,0,0,.05)}
    .ch-linkcard>mat-icon{color:#0d9488;flex-shrink:0}
    .cl-body{flex:1;min-width:0;display:flex;flex-direction:column}
    .cl-body strong{font-size:12.5px;color:#0f5c58}
    .cl-url{font-size:12px;color:#0d9488;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .cl-copy{border:none;background:#e0f2f1;color:#0d9488;border-radius:8px;width:30px;height:30px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center}
    .cl-copy mat-icon{font-size:16px;width:16px;height:16px}
    .ch-doccard{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid #eceff1;border-radius:12px;padding:10px 12px;max-width:80%}
    .ch-doccard>mat-icon{color:#0d9488}
    .ch-doccard div{flex:1;display:flex;flex-direction:column}
    .ch-doccard strong{font-size:13px;color:#111827}
    .ch-doccard span{font-size:12px;color:#6b7280}
    .vcd-tag{font-size:10px;background:#f0fdfa;color:#0f766e;padding:3px 8px;border-radius:999px;font-weight:600;white-space:nowrap}
    .ch-fup{background:#f0fdfa;border:1px solid #ccf1ec;border-radius:12px;padding:11px 13px;max-width:82%}
    .ch-fup strong{font-size:13px;color:#0f5c58;display:block;margin-bottom:8px}
    .cf-btns{display:flex;gap:8px}
    .cf-btns button{border:1px solid #0d9488;background:#fff;color:#0d9488;border-radius:8px;padding:6px 12px;font:inherit;font-size:12px;font-weight:600;cursor:pointer}
    .ch-readings{display:inline-flex;align-items:center;gap:6px;background:#0d9488;color:#fff;border-radius:14px;border-bottom-right-radius:4px;padding:9px 12px;font-size:13px;max-width:80%}
    .ch-readings mat-icon{font-size:16px;width:16px;height:16px}
    .ch-readings .ch-time{color:#d7f2ee}
    /* quick actions + composer */
    .ch-quick{display:flex;gap:8px;padding:8px 12px;overflow-x:auto;border-top:1px solid #eef1f1;background:#fff}
    .ch-chip{display:inline-flex;align-items:center;gap:5px;flex-shrink:0;border:1px solid #cfe0e0;background:#f0fdfa;color:#0d9488;border-radius:999px;padding:6px 12px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}
    .ch-chip mat-icon{font-size:15px;width:15px;height:15px}
    .ch-input{display:flex;align-items:center;gap:8px;padding:10px 12px;border-top:1px solid #eef1f1;background:#fff}
    .ch-input input{flex:1;border:1.5px solid #e5e7eb;border-radius:999px;padding:10px 14px;font:inherit;font-size:13.5px;outline:none}
    .ch-input input:focus{border-color:#0d9488}
    .ch-send{width:40px;height:40px;border-radius:50%;border:none;background:#0d9488;color:#fff;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center}
    .ch-send:disabled{background:#cbd5d5;cursor:not-allowed}
    .ch-send mat-icon{font-size:19px;width:19px;height:19px}
    /* minimised dock — the "way back" */
    .vcd-dock{display:flex;align-items:center;gap:11px;width:100%;background:#fff;border:1px solid #e5e7eb;border-left:4px solid #0d9488;border-radius:14px;padding:11px 14px;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,.08);font:inherit;text-align:left}
    .vcd-dock:hover{background:#fafdfd}
    .vd-body{flex:1;min-width:0;display:flex;flex-direction:column}
    .vd-body strong{font-size:13.5px;color:#111827}
    .vd-body span{font-size:12px;color:#6b7280}
    .vd-badge{background:#ef4444;color:#fff;font-size:11px;font-weight:700;min-width:20px;height:20px;border-radius:999px;display:flex;align-items:center;justify-content:center;padding:0 5px}
    .vcd-dock>mat-icon{color:#9ca3af}

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
    @media (max-width:560px){.vcd-self{width:100%;height:180px}}
  `]
})
export class VideoConsultDemoComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    // Deep-link / notification re-entry: ?resume=chat reopens the consultation
    // room directly, the way tapping the app's chat entry would.
    if (this.route.snapshot.queryParamMap.get('resume') === 'chat') {
      this.slot.set('5:00 PM');
      this.stage.set('chat');
      this.seedChat();
    }
  }

  // Shared availability pool. Greyed slots are booked in either mode, or held.
  readonly slotGroups = [
    { period: 'Morning',   list: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'] },
    { period: 'Afternoon', list: ['02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'] },
    { period: 'Evening',   list: ['05:00 PM'] }
  ];
  private readonly TAKEN = ['09:30 AM', '03:00 PM'];   // booked (shared pool)
  private readonly HELD  = ['10:30 AM'];               // held by another patient

  readonly stage = signal<Stage>('slots');
  readonly slot = signal<string | null>(null);
  readonly consent = signal(false);
  readonly holdLeft = signal(600);        // 10-min hold, seconds
  readonly joinEnabled = signal(false);   // T-10 rule (demo fast-forwards)
  readonly waitSecs = signal(0);          // waiting-room timer (webhook demo)
  readonly muted = signal(false);
  readonly camOff = signal(false);
  readonly doctorIn = signal(false);

  // Join link + the 10-minute in-app reminder.
  readonly joinUrl = 'meet.ghh.med.sa/GHH-4821';
  readonly copied = signal(false);
  readonly reminder = signal(false);

  // ---- Consultation chat room ----------------------------------------------
  readonly messages = signal<ChatMsg[]>([]);
  readonly draft = signal('');
  readonly chatMin = signal(false);      // minimised to the dock
  readonly unread = signal(0);           // doctor msgs arrived while minimised
  readonly docTyping = signal(false);
  readonly completed = signal(false);    // call finished — post-consult chat
  readonly readingsOpen = signal(false);
  private msgId = 0;
  private replyIdx = 0;
  private readonly scriptedReplies = [
    'Thank you, noted. We\'ll go through this together on the call.',
    'Understood. If anything changes before we connect, message me here.',
    'Good to know. Please keep your recent reports handy for the call.',
    'Thanks for sharing. I\'ll review this before we start.'
  ];

  @ViewChild('chatScroll') set chatScroll(ref: ElementRef<HTMLElement> | undefined) {
    this.chatEl = ref?.nativeElement ?? null;
    this.scrollChat();
  }
  private chatEl: HTMLElement | null = null;

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
    this.stage.set('chat');
    this.seedChat();
  }

  // ---- Consultation chat ---------------------------------------------------
  private nowTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private pushMsg(m: { sender: Sender; text?: string; kind?: MsgKind }): void {
    this.messages.update(list => [...list, {
      id: ++this.msgId, sender: m.sender, text: m.text, kind: m.kind ?? 'text', time: this.nowTime()
    }]);
    if (m.sender === 'doctor' && this.chatMin()) this.unread.update(n => n + 1);
    this.scrollChat();
  }

  private doctorReply(text: string, delay = 1100): void {
    this.docTyping.set(true);
    this.scrollChat();
    setTimeout(() => {
      this.docTyping.set(false);
      this.pushMsg({ sender: 'doctor', text });
    }, delay);
  }

  /** Opening messages the patient sees the moment the room is created. */
  private seedChat(): void {
    this.messages.set([]);
    this.msgId = 0;
    this.pushMsg({ sender: 'system', text: 'Payment received · $20.00 · receipt saved to My Payments' });
    this.pushMsg({ sender: 'system', kind: 'link' });
    this.pushMsg({ sender: 'system', text: 'We\'ll notify you here 10 minutes before your slot. You can close this — the consultation stays in your chats.' });
    this.doctorReply('Hello Fatima 👋 I\'m Dr. Al-Huwail. I\'ll see you today at ' + this.slot() +
      '. If you have any recent readings or symptoms, share them here so I can review beforehand.', 1400);
  }

  send(): void {
    const t = this.draft().trim();
    if (!t) return;
    this.pushMsg({ sender: 'patient', text: t });
    this.draft.set('');
    if (!this.completed()) {
      const reply = this.scriptedReplies[this.replyIdx++ % this.scriptedReplies.length];
      this.doctorReply(reply);
    }
  }

  openReadings(): void { this.readingsOpen.set(true); }

  onReadingsShared(list: VitalSign[]): void {
    this.readingsOpen.set(false);
    const summary = list.map(v => `${this.readingLabel(v.type)} ${v.value}`).join(', ');
    this.pushMsg({ sender: 'patient', kind: 'readings', text: 'Shared readings — ' + summary });
    this.doctorReply('Thank you, I can see your readings. We\'ll go over them on the call.', 1300);
  }

  private readingLabel(type: string): string {
    const m: Record<string, string> = {
      blood_pressure: 'BP', glucose: 'Sugar', temperature: 'Temp', weight: 'Weight', heart_rate: 'HR', oxygen: 'SpO₂'
    };
    return m[type] ?? type;
  }

  minimizeChat(): void { this.chatMin.set(true); }

  openChat(): void {
    this.chatMin.set(false);
    this.unread.set(0);
  }

  /** Demo: doctor sends an ad-hoc message into the chat. */
  doctorChatMessage(): void {
    this.doctorReply('I\'m ready for you now — tap Join whenever you\'re set.', 700);
  }

  // ---- Join link + 10-minute reminder --------------------------------------
  copyLink(): void {
    const text = 'https://' + this.joinUrl;
    navigator.clipboard?.writeText(text).catch(() => { /* clipboard blocked — ignore */ });
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1600);
  }

  /** Demo: T-10 reached → the in-app reminder fires, Join unlocks, and the
   *  doctor drops a note into the chat. */
  reachT10(): void {
    this.joinEnabled.set(true);
    this.reminder.set(true);
    this.doctorReply('I\'m ready when you are — tap Join to start the call.', 900);
  }

  /** Join straight from the notification. */
  joinFromReminder(): void {
    this.reminder.set(false);
    this.joinEnabled.set(true);
    this.enterWaiting();
  }

  // ---- Waiting room --------------------------------------------------------
  enterWaiting(): void {
    this.reminder.set(false);
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
    this.stopCam();
    // Return to the consultation room — everything the visit produced lands
    // back in the chat, Practo-style, so it stays the durable record.
    this.completed.set(true);
    this.joinEnabled.set(false);
    this.stage.set('chat');
    this.chatMin.set(false);
    this.pushMsg({ sender: 'system', text: 'Video consultation ended · duration 08:12' });
    this.doctorReply('It was good to see you, Fatima. I\'ve added your prescription and visit notes to your records.', 900);
    setTimeout(() => this.pushMsg({ sender: 'doctor', kind: 'rx' }), 2100);
    setTimeout(() => this.pushMsg({ sender: 'doctor', kind: 'followup' }), 2600);
  }

  private scrollChat(): void {
    setTimeout(() => { if (this.chatEl) this.chatEl.scrollTop = this.chatEl.scrollHeight; }, 30);
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
    this.muted.set(false);
    this.camOff.set(false);
    this.doctorIn.set(false);
    this.reminder.set(false);
    this.copied.set(false);
    this.messages.set([]);
    this.draft.set('');
    this.chatMin.set(false);
    this.unread.set(0);
    this.docTyping.set(false);
    this.completed.set(false);
    this.readingsOpen.set(false);
    this.replyIdx = 0;
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
