import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ThHeaderComponent } from './th-header.component';
import { TELE_STYLES } from './telehealth.styles';

interface Faq { q: string; a: string; open?: boolean; }

// =====================================================================
// HELP & SUPPORT  (spec §13)
//
// Emergency guidance first (Telehealth is never emergency care), then
// contact channels and FAQs. Also surfaces the exception scenarios so a
// patient can find the right path when something goes wrong.
// =====================================================================
@Component({
  selector: 'app-telehealth-help',
  standalone: true,
  imports: [CommonModule, MatIconModule, ThHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="th-page th-wrap">
      <th-header title="Help & support" subtitle="We're here whenever you need us" />

      <!-- Emergency -->
      <div class="th-banner banner-red">
        <mat-icon>emergency</mat-icon>
        <div class="b-body">
          <strong>This is not emergency care</strong>
          <span>For chest pain, severe breathing difficulty, heavy bleeding or any medical emergency, call your local emergency number immediately.</span>
        </div>
      </div>
      <div class="th-grid-2" style="margin-bottom:22px">
        <a class="th-btn th-btn-danger" href="tel:998"><mat-icon>call</mat-icon> Emergency services</a>
        <a class="th-btn th-btn-ghost" href="tel:+97141234567"><mat-icon>local_hospital</mat-icon> Hospital ED</a>
      </div>

      <!-- Contact -->
      <section class="th-section">
        <div class="th-sec-head"><h2>Contact the Telehealth team</h2></div>
        <div class="th-stack">
          <a class="contact-row" href="tel:+97148000000">
            <div class="cr-icon" style="background:#1565c0"><mat-icon>call</mat-icon></div>
            <div class="cr-body"><strong>Call support</strong><span>7 am – 11 pm · every day</span></div>
            <mat-icon class="cr-arrow">chevron_right</mat-icon>
          </a>
          <button class="contact-row" (click)="chat()">
            <div class="cr-icon" style="background:#00897b"><mat-icon>chat</mat-icon></div>
            <div class="cr-body"><strong>Chat with us</strong><span>Typical reply under 5 minutes</span></div>
            <mat-icon class="cr-arrow">chevron_right</mat-icon>
          </button>
          <button class="contact-row" (click)="callback()">
            <div class="cr-icon" style="background:#5e35b1"><mat-icon>phone_callback</mat-icon></div>
            <div class="cr-body"><strong>Request a callback</strong><span>We'll call you back shortly</span></div>
            <mat-icon class="cr-arrow">chevron_right</mat-icon>
          </button>
        </div>
      </section>

      <!-- Common issues -->
      <section class="th-section">
        <div class="th-sec-head"><h2>Something went wrong?</h2></div>
        <div class="th-grid-2">
          @for (i of issues; track i.title) {
            <div class="issue-tile">
              <mat-icon [style.color]="i.color">{{ i.icon }}</mat-icon>
              <strong>{{ i.title }}</strong>
              <span>{{ i.help }}</span>
            </div>
          }
        </div>
      </section>

      <!-- FAQs -->
      <section class="th-section">
        <div class="th-sec-head"><h2>Frequently asked questions</h2></div>
        <div class="th-stack">
          @for (f of faqs(); track f.q) {
            <div class="faq" [class.open]="f.open">
              <button class="faq-q" (click)="toggle(f)">
                <span>{{ f.q }}</span>
                <mat-icon>{{ f.open ? 'expand_less' : 'expand_more' }}</mat-icon>
              </button>
              @if (f.open) { <p class="faq-a">{{ f.a }}</p> }
            </div>
          }
        </div>
      </section>
    </div>
  `,
  styles: [TELE_STYLES, `
    .contact-row { display: flex; align-items: center; gap: 12px; padding: 14px; background: white; border: 1px solid #eceff1; border-radius: 14px; text-decoration: none; color: inherit; font: inherit; width: 100%; text-align: left; cursor: pointer; transition: all .15s; }
    .contact-row:hover { border-color: #c5cae9; box-shadow: 0 2px 10px rgba(0,0,0,.05); }
    .cr-icon { width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .cr-icon mat-icon { color: white; font-size: 22px; width: 22px; height: 22px; }
    .cr-body { flex: 1; min-width: 0; } .cr-body strong { display: block; font-size: 14px; color: #1b3a4b; } .cr-body span { font-size: 12px; color: #90a4ae; }
    .cr-arrow { color: #cfd8dc; }

    .issue-tile { padding: 14px; background: white; border: 1px solid #eceff1; border-radius: 14px; }
    .issue-tile mat-icon { font-size: 24px; width: 24px; height: 24px; }
    .issue-tile strong { display: block; font-size: 13.5px; color: #1b3a4b; margin: 6px 0 3px; }
    .issue-tile span { font-size: 12px; color: #607d8b; line-height: 1.45; }

    .faq { background: white; border: 1px solid #eceff1; border-radius: 14px; overflow: hidden; }
    .faq.open { border-color: #c5cae9; }
    .faq-q { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 14px 16px; background: none; border: none; font: inherit; text-align: left; cursor: pointer; }
    .faq-q span { font-size: 13.5px; font-weight: 600; color: #1b3a4b; }
    .faq-q mat-icon { color: #90a4ae; flex-shrink: 0; }
    .faq-a { margin: 0; padding: 0 16px 16px; font-size: 13px; color: #607d8b; line-height: 1.6; }
  `]
})
export class HelpComponent {
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  readonly issues = [
    { icon: 'credit_card_off', color: '#c62828', title: 'Payment failed', help: 'Your booking is saved. Retry payment or choose another method from the service.' },
    { icon: 'schedule', color: '#ef6c00', title: 'Doctor is delayed', help: 'Keep waiting, ask to be alerted when ready, or reschedule from the waiting room.' },
    { icon: 'directions_car', color: '#ef6c00', title: 'Provider is late', help: 'See the updated arrival time on the tracking screen or contact support.' },
    { icon: 'wrong_location', color: '#c62828', title: 'Not available at my address', help: 'Try another address or choose a hospital visit for this service.' },
    { icon: 'event_busy', color: '#ef6c00', title: 'No slots available', help: 'View the next available window, pick another date, or join the waiting list.' },
    { icon: 'emergency', color: '#c62828', title: 'It feels like an emergency', help: 'Telehealth is not for emergencies — call local emergency services right away.' }
  ];

  readonly faqs = signal<Faq[]>([
    { q: 'Are the doctors and providers verified?', a: 'Yes. Every doctor, nurse, physiotherapist and phlebotomist is authorised by the hospital, identity-verified, and linked to your clinical record.' },
    { q: 'Where do my prescriptions and reports go?', a: 'Prescriptions and lab reports are saved directly to your hospital record. You can open them any time in My Records and Medications.' },
    { q: 'Can I book for a family member?', a: 'Yes. Use the "Care for" selector at the top of each screen to switch between yourself and linked family members, or add a new family member.' },
    { q: 'How is the fee charged?', a: 'Fees are shown before you confirm and processed through the hospital Payments module. Receipts appear in Payments.' },
    { q: 'What if I need to cancel?', a: 'Home services offer free cancellation up to 4 hours before the arrival window. You can cancel from Active Care.' },
    { q: 'Is my video consultation recorded?', a: 'No. This prototype does not record audio or video. In production, recording would follow hospital consent policy.' }
  ]);

  toggle(f: Faq): void {
    this.faqs.update(list => list.map(x => x === f ? { ...x, open: !x.open } : x));
  }
  chat(): void { this.snack.open('Connecting you to a support agent…', 'OK', { duration: 3000 }); }
  callback(): void { this.snack.open('Callback requested. Our team will call you shortly.', 'OK', { duration: 3000 }); }
}
