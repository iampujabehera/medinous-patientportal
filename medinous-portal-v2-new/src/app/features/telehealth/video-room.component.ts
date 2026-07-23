import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TelehealthService } from './telehealth.service';
import { CareItem, CareOutcome } from './telehealth.model';

// =====================================================================
// SIMULATED VIDEO CONSULTATION  (spec §6, step 7)
//
// A prototype call screen — no audio/video is captured. Controls are
// visual only. Ending the call attaches a doctor outcome (advice,
// prescription, ordered tests, follow-up) which then powers the
// continuity-of-care recommendations across the module.
// =====================================================================
@Component({
  selector: 'app-video-room',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (item(); as it) {
      <div class="room" [class.ended]="ending()">
        <!-- Doctor video area -->
        <div class="doc-stage">
          <div class="doc-avatar">{{ it.provider?.initials }}</div>
          <div class="doc-nameplate">
            <span class="live-dot"></span>
            {{ it.provider?.name }} · {{ it.provider?.specialty }}
          </div>
          <div class="call-timer">{{ elapsed() }}</div>
          <div class="prototype-note"><mat-icon>info</mat-icon> Simulated call — no audio or video is recorded</div>
        </div>

        <!-- Patient self-view -->
        <div class="self-view" [class.cam-off]="!camOn()">
          @if (camOn()) { <span class="self-initials">You</span> }
          @else { <mat-icon>videocam_off</mat-icon> }
        </div>

        <!-- Controls -->
        <div class="controls">
          <button class="ctrl" [class.off]="!micOn()" (click)="micOn.set(!micOn())" aria-label="Microphone">
            <mat-icon>{{ micOn() ? 'mic' : 'mic_off' }}</mat-icon>
            <span>{{ micOn() ? 'Mute' : 'Unmute' }}</span>
          </button>
          <button class="ctrl" [class.off]="!camOn()" (click)="camOn.set(!camOn())" aria-label="Camera">
            <mat-icon>{{ camOn() ? 'videocam' : 'videocam_off' }}</mat-icon>
            <span>Camera</span>
          </button>
          <button class="ctrl" (click)="flip()" aria-label="Switch camera">
            <mat-icon>cameraswitch</mat-icon>
            <span>Flip</span>
          </button>
          <button class="ctrl" [class.off]="!speakerOn()" (click)="speakerOn.set(!speakerOn())" aria-label="Speaker">
            <mat-icon>{{ speakerOn() ? 'volume_up' : 'volume_off' }}</mat-icon>
            <span>Speaker</span>
          </button>
          <button class="ctrl" (click)="help()" aria-label="Technical help">
            <mat-icon>help</mat-icon>
            <span>Help</span>
          </button>
          <button class="ctrl end" (click)="endCall()" aria-label="End call">
            <mat-icon>call_end</mat-icon>
            <span>End</span>
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .room {
      position: fixed; inset: 0; z-index: 1100;
      background: radial-gradient(circle at 50% 30%, #263238 0%, #101418 100%);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .doc-stage { position: relative; flex: 1; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .doc-avatar {
      width: 120px; height: 120px; border-radius: 50%;
      background: linear-gradient(135deg, #1565c0, #42a5f5);
      color: white; font-size: 42px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 0 8px rgba(255,255,255,.06), 0 0 40px rgba(66,165,245,.35);
    }
    .doc-nameplate {
      position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 16px; border-radius: 20px;
      background: rgba(0,0,0,.4); color: white; font-size: 13px; font-weight: 600;
      white-space: nowrap;
    }
    .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #4caf50; box-shadow: 0 0 8px #4caf50; animation: pulse 1.5s infinite; }
    @keyframes pulse { 50% { opacity: .4; } }
    .call-timer { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,.8); font-size: 14px; font-variant-numeric: tabular-nums; }
    .prototype-note { position: absolute; top: 52px; left: 50%; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 5px; color: rgba(255,255,255,.5); font-size: 11px; white-space: nowrap; }
    .prototype-note mat-icon { font-size: 13px; width: 13px; height: 13px; }

    .self-view {
      position: absolute; top: 80px; right: 16px;
      width: 96px; height: 128px; border-radius: 14px;
      background: linear-gradient(135deg, #37474f, #546e7a);
      display: flex; align-items: center; justify-content: center;
      color: rgba(255,255,255,.85); border: 2px solid rgba(255,255,255,.15);
      box-shadow: 0 6px 20px rgba(0,0,0,.4);
    }
    .self-view.cam-off { background: #263238; }
    .self-view mat-icon { color: rgba(255,255,255,.5); }
    .self-initials { font-size: 13px; font-weight: 600; }

    .controls {
      display: flex; gap: 10px; padding: 20px 16px calc(24px + env(safe-area-inset-bottom, 0px));
      width: 100%; max-width: 560px; justify-content: center; flex-wrap: wrap;
    }
    .ctrl {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      background: none; border: none; cursor: pointer;
      color: rgba(255,255,255,.9); font: inherit; font-size: 11px;
    }
    .ctrl mat-icon {
      width: 52px; height: 52px; border-radius: 50%;
      background: rgba(255,255,255,.12);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px;
    }
    .ctrl.off mat-icon { background: rgba(255,255,255,.28); }
    .ctrl.end mat-icon { background: #e53935; }
    .ctrl:hover mat-icon { background: rgba(255,255,255,.2); }
    .ctrl.end:hover mat-icon { background: #c62828; }
  `]
})
export class VideoRoomComponent implements OnInit, OnDestroy {
  private readonly svc = inject(TelehealthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly item = signal<CareItem | null>(null);
  readonly micOn = signal(true);
  readonly camOn = signal(true);
  readonly speakerOn = signal(true);
  readonly ending = signal(false);
  readonly elapsed = signal('00:00');

  private tick?: ReturnType<typeof setInterval>;
  private seconds = 0;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    const it = this.svc.getItem(id);
    if (!it) { this.router.navigateByUrl('/telehealth'); return; }
    this.svc.updateItem(id, { status: 'in_progress' });
    this.item.set(it);
    this.tick = setInterval(() => {
      this.seconds++;
      const m = String(Math.floor(this.seconds / 60)).padStart(2, '0');
      const s = String(this.seconds % 60).padStart(2, '0');
      this.elapsed.set(`${m}:${s}`);
    }, 1000);
  }

  ngOnDestroy(): void { if (this.tick) clearInterval(this.tick); }

  flip(): void { /* visual only */ }
  help(): void { this.router.navigateByUrl('/telehealth/help'); }

  endCall(): void {
    const it = this.item();
    if (!it) return;
    this.ending.set(true);
    if (this.tick) clearInterval(this.tick);
    this.svc.completeConsult(it.id, this.outcomeFor(it));
    setTimeout(() => this.router.navigate(['/telehealth/consult/outcome', it.id]), 400);
  }

  /**
   * A canned but specialty-aware outcome. General Medicine / diabetes
   * consults order HbA1c + Fasting Glucose and a 2-week follow-up — this
   * is what drives the demo's continuity-of-care storyline.
   */
  private outcomeFor(it: CareItem): CareOutcome {
    const key = this.svc.consultSpecialties.find(s => s.name === it.subtitle)?.key;
    if (key === 'derm') {
      return {
        summary: 'Likely mild eczema. Advised a topical emollient and a short steroid course.',
        advice: ['Moisturise twice daily', 'Avoid hot showers on the area', 'Return if it spreads or weeps'],
        prescriptionIssued: true,
        prescriptionItems: [{ name: 'Emollient cream', dosage: 'Apply generously', frequency: 'Twice daily', duration: '2 weeks' }],
        followUpInDays: 14
      };
    }
    // Default (GP / endo / most) — the storyline path.
    return {
      summary: 'Reviewed fever, body pain and blood-sugar control. Advised rest, fluids and blood tests to check diabetes control.',
      advice: ['Rest and stay hydrated', 'Paracetamol for fever if needed', 'Complete the ordered blood tests before the follow-up'],
      prescriptionIssued: true,
      prescriptionItems: [{ name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'Every 6 hours if needed', duration: '3 days' }],
      testsOrdered: ['HBA1C', 'FBS'],
      followUpInDays: 14
    };
  }
}
