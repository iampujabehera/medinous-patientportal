import { Injectable, signal } from '@angular/core';

export interface SignupPrefill {
  firstName: string;
  lastName: string;
  cpr: string;
  phone: string;
  email: string;
  /**
   * Which login surface the handoff should land on.
   *  - 'create' (default): open the Create Account form prefilled.
   *  - 'signin': open the Sign In form (used when guest booking has
   *    already minted an account and the user just needs to log in).
   */
  mode?: 'create' | 'signin';
}

@Injectable({ providedIn: 'root' })
export class SignupHandoffService {
  readonly prefillData = signal<SignupPrefill | null>(null);

  setPrefill(data: SignupPrefill): void {
    this.prefillData.set(data);
  }

  consume(): SignupPrefill | null {
    const data = this.prefillData();
    this.prefillData.set(null);
    return data;
  }
}
