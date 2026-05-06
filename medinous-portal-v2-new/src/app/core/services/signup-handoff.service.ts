import { Injectable, signal } from '@angular/core';

export interface SignupPrefill {
  firstName: string;
  lastName: string;
  cpr: string;
  phone: string;
  email: string;
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
