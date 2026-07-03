import { Component, ChangeDetectionStrategy, computed, effect, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { GeographyService } from '../../../core/services/geography.service';
import { I18nService, SupportedLang } from '../../../core/services/i18n.service';
import { LocationService } from '../../../core/services/location.service';
import { FamilyService } from '../../../core/services/family.service';
import { SelectPatientComponent } from '../../../features/select-patient/select-patient.component';
import { SignupHandoffService, SignupPrefill } from '../../../core/services/signup-handoff.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatMenuModule, MatSelectModule,
    MatDividerModule, MatChipsModule, MatTooltipModule, MatCardModule,
    MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSnackBarModule, FormsModule,
    TranslatePipe,
    SelectPatientComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Family Grouping modal: overlays whichever screen is active -->
    @if (family.pickerOpen()) {
      <app-select-patient></app-select-patient>
    }

    @if (!locationService.isLocationSelected()) {

      <!-- ============================================ -->
      <!--  STEP 1: HOSPITAL WEBSITE LANDING PAGE       -->
      <!-- ============================================ -->
      @if (!showLocationPicker()) {
        <div class="landing-page">
          <!-- Top Bar -->
          <div class="top-bar">
            <div class="top-bar-inner">
              <span><mat-icon class="tb-icon">phone</mat-icon> +973-17812222</span>
              <span><mat-icon class="tb-icon">email</mat-icon> info&#64;bsh.com.bh</span>
              <span class="top-spacer"></span>
              <span><mat-icon class="tb-icon">schedule</mat-icon> 24/7 Emergency</span>
            </div>
          </div>

          <!-- Navbar -->
          <nav class="landing-nav">
            <div class="nav-inner">
              <div class="nav-brand">
                <mat-icon class="brand-icon">local_hospital</mat-icon>
                <div class="brand-text">
                  <span class="brand-name">PRINCE FAHD BIN SULTAN</span>
                  <span class="brand-sub">HOSPITAL</span>
                </div>
              </div>
              <div class="nav-links">
                <a (click)="scrollTo('about')">ABOUT US</a>
                <a (click)="scrollTo('services')">OUR SPECIALTIES</a>
                <a (click)="scrollTo('doctors')">OUR DOCTORS</a>
                <a (click)="scrollTo('contact')">CONTACT</a>
              </div>
              <button mat-flat-button class="nav-cta" (click)="goToLogin()">
                <mat-icon>person</mat-icon> Patient Portal
              </button>
            </div>
          </nav>

          <!-- Hero Banner -->
          <section class="hero">
            <div class="hero-content">
              <p class="hero-tagline">Welcome to</p>
              <h1>Prince Fahd Bin Sultan Hospital</h1>
              <p class="hero-desc">Providing world-class healthcare services in the Kingdom of Saudi Arabia since 2009.
                 MOH licensed, internationally accredited, and trusted by over 100,000 patients.</p>
              <div class="hero-actions">
                <button mat-flat-button class="hero-btn primary" (click)="goToLogin()">
                  <mat-icon>login</mat-icon> Patient Portal
                </button>
                <button mat-flat-button class="hero-btn appointment-btn" (click)="goToLogin()">
                  <mat-icon>event</mat-icon> Request Appointment
                </button>
              </div>
            </div>
          </section>

          <!-- Quick Stats Bar -->
          <div class="stats-bar">
            <div class="stats-inner">
              <div class="stat-item">
                <mat-icon>local_hospital</mat-icon>
                <div><strong>4</strong><span>Locations</span></div>
              </div>
              <div class="stat-item">
                <mat-icon>groups</mat-icon>
                <div><strong>50+</strong><span>Specialists</span></div>
              </div>
              <div class="stat-item">
                <mat-icon>people</mat-icon>
                <div><strong>100K+</strong><span>Patients Served</span></div>
              </div>
              <div class="stat-item">
                <mat-icon>emergency</mat-icon>
                <div><strong>24/7</strong><span>Emergency</span></div>
              </div>
            </div>
          </div>

          <!-- Our Specialties -->
          <section class="section" id="services">
            <div class="section-inner">
              <h2>Our Specialties</h2>
              <div class="specialties-grid">
                @for (svc of hospitalServices; track svc.name) {
                  <div class="specialty-card">
                    <mat-icon [style.color]="svc.color">{{ svc.icon }}</mat-icon>
                    <span>{{ svc.name }}</span>
                  </div>
                }
              </div>
            </div>
          </section>

          <!-- Our Doctors -->
          <section class="section doctors-section" id="doctors">
            <div class="section-inner">
              <h2>Our Doctors</h2>
              <p class="section-desc">Board-certified specialists from around the world</p>
              <div class="doctors-preview-grid">
                @for (doc of previewDoctors; track doc.name) {
                  <div class="doc-preview">
                    <div class="doc-avatar"><mat-icon>person</mat-icon></div>
                    <strong>{{ doc.name }}</strong>
                    <span>{{ doc.dept }}</span>
                  </div>
                }
              </div>
            </div>
          </section>

          <!-- Contact Center Banner -->
          <section class="contact-banner" id="contact">
            <div class="contact-banner-inner">
              <h2>Speak with our Contact Center for assistance</h2>
              <div class="contact-btns">
                <div class="contact-box">
                  <span class="cb-label">Helpline:</span>
                  <span class="cb-value">+973-17812222</span>
                </div>
                <div class="contact-box">
                  <span class="cb-label">Helpline:</span>
                  <span class="cb-value clickable" (click)="goToLogin()">Request an Appointment</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Footer Links Bar -->
          <div class="footer-links-bar">
            <div class="footer-links-inner">
              <a (click)="goToLogin()">Patient Portal</a>
              <span class="flink-sep">|</span>
              <a>Patient Feedback</a>
              <span class="flink-sep">|</span>
              <a>Career</a>
              <span class="flink-sep">|</span>
              <a>Blogs</a>
              <span class="flink-sep">|</span>
              <a>Support Services</a>
              <span class="flink-sep">|</span>
              <a (click)="scrollTo('doctors')">Our Locations</a>
              <span class="flink-sep">|</span>
              <a>Patient and Family Rights</a>
            </div>
          </div>

          <!-- Accreditations -->
          <div class="accreditations" id="about">
            <div class="accred-inner">
              <div class="accred-badges">
                <div class="accred-badge">
                  <mat-icon>verified</mat-icon>
                  <span>CBAHI Accredited</span>
                </div>
                <div class="accred-badge">
                  <mat-icon>workspace_premium</mat-icon>
                  <span>JCI Accredited</span>
                </div>
                <div class="accred-badge">
                  <mat-icon>school</mat-icon>
                  <span>Training Center</span>
                </div>
                <div class="accred-badge">
                  <mat-icon>military_tech</mat-icon>
                  <span>Center of Excellence</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <footer class="landing-footer">
            <div class="footer-inner">
              <strong class="footer-title">PRINCE FAHD BIN SULTAN HOSPITAL</strong>
              <p>Prince Sultan Bin Abdulaziz Road, Sultanah District, P.O. Box: 10588, Tabuk, Kingdom of Saudi Arabia</p>
              <p class="footer-copy">Copyright 2026 &#64; Prince Fahd Bin Sultan Hospital</p>
            </div>
          </footer>

          <!-- Bottom Mobile Nav -->
          <div class="bottom-nav">
            <a class="bnav-item" (click)="scrollTo('services')">
              <mat-icon>home</mat-icon><span>Home</span>
            </a>
            <a class="bnav-item" (click)="goToLogin()">
              <mat-icon>event</mat-icon><span>Appointment</span>
            </a>
            <a class="bnav-item" (click)="scrollTo('doctors')">
              <mat-icon>search</mat-icon><span>Search</span>
            </a>
            <a class="bnav-item" (click)="goToLogin()">
              <mat-icon>person</mat-icon><span>Login</span>
            </a>
          </div>
        </div>

      } @else {

        <!-- ============================================ -->
        <!--  STEP 3: LOGIN SCREEN                        -->
        <!-- ============================================ -->
        <div class="login-page">
          <!-- Top strip: PFSH hospital brand + branch with Change -->
          <div class="login-topbar">
            <div class="topbar-inner">
              <button mat-icon-button class="topbar-back" (click)="goBackToLanding()" matTooltip="Back to website">
                <mat-icon>arrow_back</mat-icon>
              </button>
              <div class="hospital-brand">
                <div class="hospital-brand-icon"><mat-icon>local_hospital</mat-icon></div>
                <div class="hospital-brand-text">
                  <strong>Prince Fahd Bin Sultan Hospital</strong>
                  <span class="hospital-brand-ar">مستشفى نورثبريدج التخصصي</span>
                </div>
              </div>
              <button mat-stroked-button class="topbar-loc-btn" [matMenuTriggerFor]="locChangeMenu">
                <mat-icon class="loc-pin">location_on</mat-icon>
                <span class="topbar-loc-name topbar-loc-name-full">{{ getLocationName(pendingLocationId()) }}</span>
                <span class="topbar-loc-name topbar-loc-name-short">{{ getLocationBranch(pendingLocationId()) }}</span>
                <mat-icon class="loc-change-arrow">expand_more</mat-icon>
              </button>
              <mat-menu #locChangeMenu="matMenu" class="loc-change-menu">
                @for (loc of locationService.locations; track loc.id) {
                  <button mat-menu-item (click)="pendingLocationId.set(loc.id)">
                    <mat-icon [class.loc-current]="pendingLocationId() === loc.id">
                      {{ pendingLocationId() === loc.id ? 'check_circle' : 'local_hospital' }}
                    </mat-icon>
                    <div class="menu-loc">
                      <strong>{{ loc.name }}</strong>
                      <span>{{ loc.address }}, {{ loc.city }}</span>
                    </div>
                  </button>
                }
              </mat-menu>
            </div>
          </div>

          <div class="login-card-wrapper">
            <mat-card class="login-card">
              <!-- Hospital wordmark inside the login card.
                   White-label slot: each tenant's brand image goes here.
                   Current tenant: Prince Fahd Bin Sultan Hospital, Tabuk (KSA). -->
              <div class="login-medinous-strip">
                <img src="prince-fahd-hospital.png"
                     alt="Prince Fahd Bin Sultan Hospital"
                     class="hospital-logo">
                <span class="medinous-tag">Patient Portal</span>
              </div>

              <!-- ============= MODE: SIGN IN ============= -->
              @if (loginMode() === 'signin') {
                <div class="login-body" [class.login-body-locked]="isLocked()">
                  <h2 class="login-title">Sign in to your account</h2>

                  <!-- Login method tabs: Password / OTP.
                       Both methods share the CPR field below; only the
                       second field (password vs OTP) and the primary CTA
                       change between modes. -->
                  <div class="login-tabs" role="tablist" aria-label="Login method">
                    <button type="button" role="tab"
                            class="login-tab" [class.active]="loginMethod()==='password'"
                            [attr.aria-selected]="loginMethod()==='password'"
                            [disabled]="isLocked()"
                            (click)="setLoginMethod('password')">
                      <mat-icon>lock</mat-icon>
                      <span>Password</span>
                    </button>
                    <button type="button" role="tab"
                            class="login-tab" [class.active]="loginMethod()==='otp'"
                            [attr.aria-selected]="loginMethod()==='otp'"
                            [disabled]="isLocked()"
                            (click)="setLoginMethod('otp')">
                      <mat-icon>sms</mat-icon>
                      <span>OTP</span>
                    </button>
                  </div>

                  @if (isLocked()) {
                    <div class="signin-locked" role="alert">
                      <mat-icon class="lock-icon">lock</mat-icon>
                      <div class="locked-text">
                        <strong>Account temporarily locked</strong>
                        <span>
                          Too many login attempts. Please try again in
                          <strong>{{ lockCountdown() }}</strong>.
                        </span>
                      </div>
                    </div>
                  } @else if (signInError()) {
                    <p class="signin-error" role="alert">{{ signInError() }}</p>
                  }

                  @if (loginMethod() === 'password') {
                    <mat-form-field appearance="outline" class="login-field">
                      <mat-label>National ID / Patient ID</mat-label>
                      <mat-icon matPrefix>person</mat-icon>
                      <input matInput
                             name="cpr"
                             autocomplete="username"
                             inputmode="numeric"
                             [ngModel]="loginCpr()"
                             (ngModelChange)="onLoginCprInput($event)"
                             [readonly]="isLocked()"
                             placeholder="Enter National ID or Patient ID">
                      <mat-icon matSuffix class="info-icon"
                                matTooltip="Your 8-digit National ID, or the Patient ID provided by the hospital at registration."
                                matTooltipPosition="above">info_outline</mat-icon>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="login-field">
                      <mat-label>Password</mat-label>
                      <mat-icon matPrefix>lock</mat-icon>
                      <input matInput
                             name="password"
                             autocomplete="current-password"
                             [type]="showPassword() ? 'text' : 'password'"
                             [ngModel]="loginPassword()"
                             (ngModelChange)="onLoginPasswordInput($event)"
                             [readonly]="isLocked()"
                             placeholder="Enter your password">
                      <button mat-icon-button matSuffix (click)="togglePassword()" [disabled]="isLocked()">
                        <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                      </button>
                    </mat-form-field>

                    <div class="login-options">
                      <a class="forgot-link" (click)="setMode('forgot')">Forgot Password?</a>
                    </div>
                  } @else {
                    <!-- OTP mode: Blinkit-style split — small flag-only box
                         (opens country menu) + larger phone field with the
                         dial code as an in-field prefix. Helper line below
                         names exactly which gate is unmet so the patient
                         never has to guess why Send OTP is disabled. -->
                    <div class="phone-row-split">
                      <button type="button" class="cc-box"
                              [matMenuTriggerFor]="ccMenu"
                              [disabled]="isLocked() || signinOtpSent()"
                              [attr.aria-label]="'Country: ' + signinOtpCountry().country">
                        <img class="cc-flag-img"
                             [src]="flagUrl(signinOtpCountry().iso)"
                             [alt]="signinOtpCountry().country + ' flag'"
                             width="28" height="20" loading="eager">
                        <mat-icon class="cc-caret">expand_more</mat-icon>
                      </button>

                      <div class="phone-field"
                           [class.phone-field-valid]="signinOtpPhoneValid()"
                           [class.phone-field-warn]="signinOtpPhonePartial()"
                           [class.phone-field-locked]="isLocked() || signinOtpSent()">
                        <span class="phone-prefix">{{ signinOtpCountry().code }}</span>
                        <input class="phone-input"
                               #otpPhoneInput
                               type="tel"
                               name="otp-phone"
                               autocomplete="tel-national"
                               inputmode="numeric"
                               maxlength="10"
                               [ngModel]="signinOtpPhone()"
                               (ngModelChange)="onSigninOtpPhoneInput($event, otpPhoneInput)"
                               [readonly]="isLocked() || signinOtpSent()"
                               placeholder="Mobile number"
                               aria-label="Mobile number">
                        @if (signinOtpPhone().length > 0 && !isLocked() && !signinOtpSent()) {
                          <button class="phone-clear" type="button"
                                  (click)="onSigninOtpPhoneInput('')"
                                  aria-label="Clear mobile number">
                            <mat-icon>cancel</mat-icon>
                          </button>
                        }
                      </div>

                      <mat-menu #ccMenu="matMenu" class="cc-menu">
                        @for (cc of countryCodes; track cc.code) {
                          <button mat-menu-item type="button"
                                  (click)="signinOtpCountryCode.set(cc.code)">
                            <img class="cc-menu-flag-img"
                                 [src]="flagUrl(cc.iso)"
                                 [alt]="cc.country + ' flag'"
                                 width="22" height="16" loading="lazy">
                            <span class="cc-menu-text">
                              <strong>{{ cc.country }}</strong>
                              <span class="cc-menu-code">{{ cc.code }}</span>
                            </span>
                            @if (signinOtpCountryCode() === cc.code) {
                              <mat-icon class="cc-menu-tick">check</mat-icon>
                            }
                          </button>
                        }
                      </mat-menu>
                    </div>

                    @if (signinOtpSent()) {
                      <div class="otp-sent-notice" role="status">
                        <mat-icon>mark_email_read</mat-icon>
                        <span>OTP sent to <strong>{{ signinOtpDestination() }}</strong></span>
                        @if (!isLocked()) {
                          <button type="button" class="edit-number-link"
                                  (click)="editSigninOtpNumber(otpPhoneInput)"
                                  aria-label="Edit mobile number">
                            <mat-icon>edit</mat-icon>
                            <span>Edit number</span>
                          </button>
                        }
                      </div>

                      <mat-form-field appearance="outline" class="login-field">
                        <mat-label>Enter OTP</mat-label>
                        <mat-icon matPrefix>sms</mat-icon>
                        <input matInput
                               #otpCodeInput
                               name="otp"
                               autocomplete="one-time-code"
                               inputmode="numeric"
                               maxlength="6"
                               [ngModel]="signinOtp()"
                               (ngModelChange)="onSigninOtpInput($event, otpCodeInput)"
                               [readonly]="isLocked()"
                               placeholder="6-digit code">
                      </mat-form-field>

                      <div class="otp-meta">
                        <span>Didn't receive it?</span>
                        @if (signinOtpResendSec() > 0) {
                          <span class="resend-wait">Resend in {{ signinOtpResendSec() }}s</span>
                        } @else {
                          <a class="resend-link" (click)="resendSigninOtp()">Resend OTP</a>
                        }
                      </div>
                    }
                  }

                  <div class="login-terms">
                    <mat-checkbox [ngModel]="termsAccepted()" (ngModelChange)="termsAccepted.set($event)" [disabled]="isLocked()">
                      I agree to the <a class="terms-link">Terms &amp; Conditions</a>
                    </mat-checkbox>
                  </div>

                  @if (loginMethod() === 'password') {
                    <button mat-flat-button class="login-btn"
                            [disabled]="!loginCpr() || !loginPassword() || !termsAccepted() || isLocked()"
                            (click)="signIn()">
                      Sign In <mat-icon>arrow_forward</mat-icon>
                    </button>
                  } @else if (!signinOtpSent()) {
                    <button mat-flat-button class="login-btn"
                            [disabled]="!signinOtpPhoneValid() || !termsAccepted() || isLocked()"
                            (click)="sendSigninOtp()">
                      Send OTP <mat-icon>send</mat-icon>
                    </button>
                  } @else {
                    <button mat-flat-button class="login-btn"
                            [disabled]="signinOtp().length !== 6 || !termsAccepted() || isLocked()"
                            (click)="signInWithOtp()">
                      Sign In <mat-icon>arrow_forward</mat-icon>
                    </button>
                  }

                  <div class="login-divider"><span>or</span></div>

                  <div class="login-alt-row">
                    <span class="alt-text">New patient?</span>
                    <a class="alt-link" (click)="setMode('create')">Create Account</a>
                  </div>

                  <a class="guest-login-link" (click)="loginAsGuest()">
                    <mat-icon>bolt</mat-icon>
                    Quick Booking
                  </a>
                </div>
              }

              <!-- ============= MODE: CREATE ACCOUNT ============= -->
              @else if (loginMode() === 'create') {
                <div class="login-body">
                  <button mat-button class="back-btn" (click)="setMode('signin')">
                    <mat-icon>arrow_back</mat-icon> Back to sign in
                  </button>
                  <h2 class="login-title">Create your account</h2>

                  <div class="stepper">
                    <div class="step" [class.active]="signupStep() >= 1" [class.done]="signupStep() > 1">
                      <span class="step-num">{{ signupStep() > 1 ? '✓' : '1' }}</span>
                      <span class="step-label">Identify</span>
                    </div>
                    <div class="step-line" [class.done]="signupStep() > 1"></div>
                    <div class="step" [class.active]="signupStep() >= 2" [class.done]="signupStep() > 2">
                      <span class="step-num">{{ signupStep() > 2 ? '✓' : '2' }}</span>
                      <span class="step-label">Verify</span>
                    </div>
                    <div class="step-line" [class.done]="signupStep() > 2"></div>
                    <div class="step" [class.active]="signupStep() >= 3">
                      <span class="step-num">3</span>
                      <span class="step-label">Password</span>
                    </div>
                  </div>

                  @if (signupStep() === 1) {
                    <p class="step-desc">Enter your details to begin registration.</p>

                    <div class="signup-row">
                      <mat-form-field appearance="outline" class="login-field signup-half">
                        <mat-label>First Name</mat-label>
                        <mat-icon matPrefix>person</mat-icon>
                        <input matInput maxlength="60"
                               [ngModel]="signupFirstName()"
                               (ngModelChange)="signupFirstName.set($event)"
                               placeholder="As per National ID">
                        @if (fnInvalid()) {
                          <mat-error>{{ signupFirstName().trim().length === 0 ? 'First name is required' : 'Maximum 60 characters' }}</mat-error>
                        }
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="login-field signup-half">
                        <mat-label>Last Name</mat-label>
                        <input matInput maxlength="60"
                               [ngModel]="signupLastName()"
                               (ngModelChange)="signupLastName.set($event)"
                               placeholder="Family name">
                        @if (lnInvalid()) {
                          <mat-error>{{ signupLastName().trim().length === 0 ? 'Last name is required' : 'Maximum 60 characters' }}</mat-error>
                        }
                      </mat-form-field>
                    </div>

                    <mat-form-field appearance="outline" class="login-field">
                      <mat-label>National ID / Patient ID</mat-label>
                      <mat-icon matPrefix>badge</mat-icon>
                      <input matInput inputmode="numeric" maxlength="8"
                             [ngModel]="signupCpr()"
                             (ngModelChange)="onSignupCprInput($event)"
                             placeholder="8-digit National ID or Patient ID">
                      @if (cprInvalid()) {
                        <mat-error>National ID / Patient ID must be exactly 8 digits</mat-error>
                      } @else {
                        <mat-hint align="end">{{ signupCpr().length }}/8</mat-hint>
                      }
                    </mat-form-field>

                    <div class="signup-row phone-row">
                      <mat-form-field appearance="outline" class="login-field signup-cc">
                        <mat-label>Code</mat-label>
                        <mat-select [ngModel]="signupCountryCode()" (ngModelChange)="signupCountryCode.set($event)">
                          @for (cc of countryCodes; track cc.code) {
                            <mat-option [value]="cc.code">{{ cc.code }} · {{ cc.country }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="login-field signup-phone">
                        <mat-label>Mobile Number</mat-label>
                        <mat-icon matPrefix>phone</mat-icon>
                        <input matInput inputmode="numeric" maxlength="10"
                               [ngModel]="signupPhone()"
                               (ngModelChange)="onSignupPhoneInput($event)"
                               placeholder="10-digit number">
                        @if (phInvalid()) {
                          <mat-error>Mobile number must be exactly 10 digits</mat-error>
                        } @else {
                          <mat-hint align="end">{{ signupPhone().length }}/10</mat-hint>
                        }
                      </mat-form-field>
                    </div>

                    <button mat-flat-button class="login-btn" (click)="sendSignupOtp()">
                      Send OTP <mat-icon>send</mat-icon>
                    </button>
                  }

                  @if (signupStep() === 2) {
                    <p class="step-desc">We sent a 6-digit code to the mobile number registered with ID <strong>{{ signupCpr() }}</strong>.</p>
                    <mat-form-field appearance="outline" class="login-field">
                      <mat-label>Enter OTP</mat-label>
                      <mat-icon matPrefix>sms</mat-icon>
                      <input matInput [ngModel]="signupOtp()" (ngModelChange)="signupOtp.set($event)" placeholder="6-digit code" maxlength="6" inputmode="numeric">
                    </mat-form-field>
                    <p class="otp-hint">Demo OTP: <code>123456</code></p>
                    <div class="otp-meta">
                      <span>Didn't receive it?</span>
                      <a class="resend-link" (click)="sendSignupOtp()">Resend OTP</a>
                    </div>
                    <button mat-flat-button class="login-btn"
                            [disabled]="signupOtp().length !== 6" (click)="verifySignupOtp()">
                      Verify <mat-icon>check</mat-icon>
                    </button>
                  }

                  @if (signupStep() === 3) {
                    <p class="step-desc">How would you like to set your password?</p>
                    <div class="pwd-choice">
                      <label class="choice-card" [class.selected]="passwordChoice() === 'hospital'">
                        <input type="radio" name="pwdChoice" value="hospital"
                               [checked]="passwordChoice() === 'hospital'"
                               (change)="passwordChoice.set('hospital')">
                        <mat-icon>business</mat-icon>
                        <div class="choice-text">
                          <strong>Use the password from hospital</strong>
                          <span>The one given to you at registration</span>
                        </div>
                      </label>
                      <label class="choice-card" [class.selected]="passwordChoice() === 'own'">
                        <input type="radio" name="pwdChoice" value="own"
                               [checked]="passwordChoice() === 'own'"
                               (change)="passwordChoice.set('own')">
                        <mat-icon>vpn_key</mat-icon>
                        <div class="choice-text">
                          <strong>Set my own password</strong>
                          <span>Choose a new password right now</span>
                        </div>
                      </label>
                    </div>

                    @if (passwordChoice() === 'own') {
                      <mat-form-field appearance="outline" class="login-field">
                        <mat-label>New Password</mat-label>
                        <mat-icon matPrefix>lock</mat-icon>
                        <input matInput type="password"
                               [ngModel]="signupNewPassword()"
                               (ngModelChange)="signupNewPassword.set($event)"
                               placeholder="Minimum 6 characters">
                      </mat-form-field>
                    }

                    <button mat-flat-button class="login-btn"
                            [disabled]="!passwordChoice() || (passwordChoice() === 'own' && signupNewPassword().length < 6)"
                            (click)="completeSignup()">
                      Create Account <mat-icon>check_circle</mat-icon>
                    </button>
                  }
                </div>
              }

              <!-- ============= MODE: FORGOT PASSWORD ============= -->
              @else if (loginMode() === 'forgot') {
                <div class="login-body">
                  <button mat-button class="back-btn" (click)="setMode('signin')">
                    <mat-icon>arrow_back</mat-icon> Back to sign in
                  </button>
                  <h2 class="login-title">Reset your password</h2>

                  <div class="stepper">
                    <div class="step" [class.active]="forgotStep() >= 1" [class.done]="forgotStep() > 1">
                      <span class="step-num">{{ forgotStep() > 1 ? '✓' : '1' }}</span>
                      <span class="step-label">Identify</span>
                    </div>
                    <div class="step-line" [class.done]="forgotStep() > 1"></div>
                    <div class="step" [class.active]="forgotStep() >= 2" [class.done]="forgotStep() > 2">
                      <span class="step-num">{{ forgotStep() > 2 ? '✓' : '2' }}</span>
                      <span class="step-label">Verify</span>
                    </div>
                    <div class="step-line" [class.done]="forgotStep() > 2"></div>
                    <div class="step" [class.active]="forgotStep() >= 3">
                      <span class="step-num">3</span>
                      <span class="step-label">New Password</span>
                    </div>
                  </div>

                  @if (forgotStep() === 1) {
                    <p class="step-desc">Enter your National ID or Patient ID. We'll send a 6-digit OTP to the mobile number registered with your account.</p>
                    <mat-form-field appearance="outline" class="login-field">
                      <mat-label>National ID / Patient ID</mat-label>
                      <mat-icon matPrefix>person</mat-icon>
                      <input matInput [ngModel]="forgotCpr()" (ngModelChange)="forgotCpr.set($event)" placeholder="Enter National ID or Patient ID">
                    </mat-form-field>
                    <button mat-flat-button class="login-btn"
                            [disabled]="!forgotCpr()" (click)="sendForgotOtp()">
                      Send OTP <mat-icon>send</mat-icon>
                    </button>
                  }

                  @if (forgotStep() === 2) {
                    <p class="step-desc">Enter the 6-digit OTP we sent to your registered mobile.</p>
                    <mat-form-field appearance="outline" class="login-field">
                      <mat-label>Enter OTP</mat-label>
                      <mat-icon matPrefix>sms</mat-icon>
                      <input matInput [ngModel]="forgotOtp()" (ngModelChange)="forgotOtp.set($event)" placeholder="6-digit code" maxlength="6" inputmode="numeric">
                    </mat-form-field>
                    <p class="otp-hint">Demo OTP: <code>123456</code></p>
                    <div class="otp-meta">
                      <span>Didn't receive it?</span>
                      <a class="resend-link" (click)="sendForgotOtp()">Resend OTP</a>
                    </div>
                    <button mat-flat-button class="login-btn"
                            [disabled]="forgotOtp().length !== 6" (click)="verifyForgotOtp()">
                      Verify <mat-icon>check</mat-icon>
                    </button>
                  }

                  @if (forgotStep() === 3) {
                    <p class="step-desc">Set a new password for your account.</p>
                    <mat-form-field appearance="outline" class="login-field">
                      <mat-label>New Password</mat-label>
                      <mat-icon matPrefix>lock</mat-icon>
                      <input matInput type="password"
                             [ngModel]="forgotNewPassword()"
                             (ngModelChange)="forgotNewPassword.set($event)"
                             placeholder="Minimum 6 characters">
                    </mat-form-field>
                    <button mat-flat-button class="login-btn"
                            [disabled]="forgotNewPassword().length < 6" (click)="completeForgot()">
                      Reset Password <mat-icon>check_circle</mat-icon>
                    </button>
                  }
                </div>
              }
            </mat-card>

            <p class="powered-by-foot">
              <mat-icon class="shield-icon">verified_user</mat-icon>
              Secured by
              <img src="medinous-logo.svg" alt="Medinous" class="medinous-logo-foot">
            </p>
          </div>
        </div>
      }

    } @else {

      <!-- ============================================ -->
      <!--  STEP 4: MAIN APP (after login)              -->
      <!-- ============================================ -->
      <div class="shell-container" [class.rtl]="i18n.isRtl()">
        <mat-toolbar class="toolbar">
          <!-- Hamburger only on mobile -->
          @if (isMobile()) {
            <button mat-icon-button class="hamburger" (click)="toggleSidenav()" aria-label="Menu">
              <mat-icon>menu</mat-icon>
            </button>
          }

          <!-- Brand: Prince Fahd Bin Sultan Hospital | Patient Portal -->
          <div class="brand">
            <span class="brand-hospital">Prince Fahd Bin Sultan Hospital</span>
            <span class="brand-divider"></span>
            <span class="brand-tag">Patient Portal</span>
          </div>

          <span class="toolbar-spacer"></span>

          <!-- Desktop-only pills. On mobile everything collapses into the sidenav. -->
          @if (!isMobile()) {
            <!-- Sticky active-patient indicator (Family Grouping) -->
            @if (family.activeMember(); as active) {
              <button
                mat-stroked-button
                class="patient-pill"
                [class.patient-pill-multi]="family.isMultiProfile()"
                [matTooltip]="family.isMultiProfile() ? 'Switch patient profile' : 'Current patient'"
                aria-label="Active patient"
                (click)="openFamilyPicker()">
                <span class="pp-avatar" [class.pp-avatar-female]="active.gender === 'Female'">
                  {{ activeInitials() }}
                </span>
                <span class="pp-text">
                  <strong>{{ active.firstName }} {{ active.lastName }}</strong>
                  <span class="pp-rel">{{ active.relationship }} · #{{ active.patientId }}</span>
                </span>
                @if (family.isMultiProfile()) {
                  <mat-icon class="pp-caret">swap_horiz</mat-icon>
                }
              </button>
            }

            <!-- Location pill -->
            @if (locationService.selectedLocation(); as loc) {
              <button mat-stroked-button class="loc-pill" [matMenuTriggerFor]="locationMenu">
                <mat-icon class="loc-pin">location_on</mat-icon>
                <span class="loc-name">{{ shortLocationName(loc.name) }}</span>
                <mat-icon class="loc-caret">expand_more</mat-icon>
              </button>
            }
            <mat-menu #locationMenu="matMenu" class="hdr-menu">
              <div class="menu-head">Choose location</div>
              @for (loc of locationService.locations; track loc.id) {
                <button mat-menu-item class="menu-loc-item"
                        (click)="locationService.setLocation(loc.id)">
                  <mat-icon [class.menu-current]="locationService.selectedLocation()?.id === loc.id">
                    {{ locationService.selectedLocation()?.id === loc.id ? 'check_circle' : 'local_hospital' }}
                  </mat-icon>
                  <div class="menu-loc-text">
                    <strong>{{ loc.name }}</strong>
                    <span>{{ loc.address }}, {{ loc.city }}</span>
                  </div>
                </button>
              }
            </mat-menu>

            <!-- Language pill -->
            @if (geo.config().languages.length > 1) {
              <button mat-stroked-button class="lang-pill" [matMenuTriggerFor]="langMenu">
                <mat-icon class="lang-globe">language</mat-icon>
                <span class="lang-code">{{ i18n.lang() === 'ar' ? 'AR' : 'EN' }}</span>
                <mat-icon class="lang-caret">expand_more</mat-icon>
              </button>
              <mat-menu #langMenu="matMenu" class="hdr-menu">
                <button mat-menu-item (click)="i18n.setLanguage('en')">
                  <mat-icon [class.invisible]="i18n.lang() !== 'en'">check</mat-icon>
                  English
                </button>
                <button mat-menu-item (click)="i18n.setLanguage('ar')">
                  <mat-icon [class.invisible]="i18n.lang() !== 'ar'">check</mat-icon>
                  العربية
                </button>
              </mat-menu>
            }
          }

          <!-- User icon: opens the user menu on desktop, opens the sidenav on mobile.
               On mobile we deliberately collapse everything (account actions,
               location, language, profile switcher) into the sidenav so the
               toolbar stays minimal. -->
          @if (isMobile()) {
            <button mat-icon-button class="user-btn" aria-label="Open menu"
                    (click)="toggleSidenav()">
              <mat-icon>account_circle</mat-icon>
            </button>
          } @else {
            <button mat-icon-button [matMenuTriggerFor]="userMenu" class="user-btn" aria-label="Account">
              <mat-icon>account_circle</mat-icon>
            </button>
          }
          <mat-menu #userMenu="matMenu" class="hdr-menu">
            @if (family.activeMember(); as active) {
              <div class="user-menu-head">
                <span class="umh-avatar" [class.umh-avatar-female]="active.gender === 'Female'">
                  {{ activeInitials() }}
                </span>
                <div class="umh-text">
                  <strong>{{ active.fullName }}</strong>
                  <span>{{ active.relationship }} · ID {{ active.patientId }}</span>
                </div>
              </div>
              <mat-divider></mat-divider>
            }
            <button mat-menu-item routerLink="/profile">
              <mat-icon>person</mat-icon> {{ 'nav.profile' | translate }}
            </button>
            @if (family.isPrimaryOwner()) {
              <!--
                Primary-owner-only actions. Only the account owner can
                change credentials. Other family contexts are patient-
                view only.
              -->
              <button mat-menu-item (click)="openChangePassword()">
                <mat-icon>lock</mat-icon> Change Password
              </button>
            } @else {
              <button mat-menu-item disabled
                      matTooltip="Only the primary account owner can change the password.">
                <mat-icon>lock</mat-icon> Change Password
              </button>
            }
            <button mat-menu-item routerLink="/dashboard" [queryParams]="{ openFeedback: '1' }">
              <mat-icon>rate_review</mat-icon> Feedback
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="signOut()">
              <mat-icon>logout</mat-icon> {{ 'nav.signout' | translate }}
            </button>
          </mat-menu>
        </mat-toolbar>

        <mat-sidenav-container class="sidenav-container" [hasBackdrop]="isMobile()">
          <mat-sidenav
            [mode]="isMobile() ? 'over' : 'side'"
            [opened]="sidenavOpened()"
            [fixedInViewport]="isMobile()"
            [fixedTopGap]="isMobile() ? 64 : 0"
            (closedStart)="sidenavOpen.set(false)"
            class="sidenav">
            @if (family.activeMember(); as active) {
              <div class="sn-patient">
                <div class="sn-patient-card">
                  <span class="sn-avatar" [class.sn-avatar-female]="active.gender === 'Female'">
                    {{ activeInitials() }}
                  </span>
                  <div class="sn-patient-text">
                    <strong>{{ active.fullName }}</strong>
                    <span>{{ active.relationship }} · ID {{ active.patientId }}</span>
                    @if (active.isMinorOrDependent) {
                      <small class="sn-guardian">
                        <mat-icon>shield_person</mat-icon> Guardian access
                      </small>
                    }
                  </div>
                </div>
                @if (family.isMultiProfile()) {
                  <button mat-stroked-button class="sn-switch"
                          (click)="openFamilyPicker(); closeSidenavOnMobile()">
                    <mat-icon>swap_horiz</mat-icon> Switch patient
                  </button>
                }
              </div>
              <mat-divider></mat-divider>
            }
            <mat-nav-list>
              <a mat-list-item routerLink="/dashboard" routerLinkActive="active-link"
                 (click)="closeSidenavOnMobile()">
                <mat-icon matListItemIcon>dashboard</mat-icon>
                <span matListItemTitle>{{ 'nav.dashboard' | translate }}</span>
              </a>
              <a mat-list-item routerLink="/appointments" routerLinkActive="active-link"
                 (click)="closeSidenavOnMobile()">
                <mat-icon matListItemIcon>event</mat-icon>
                <span matListItemTitle>{{ 'nav.appointments' | translate }}</span>
              </a>
              <a mat-list-item routerLink="/consultations" routerLinkActive="active-link"
                 (click)="closeSidenavOnMobile()">
                <mat-icon matListItemIcon>health_and_safety</mat-icon>
                <span matListItemTitle>My Health</span>
              </a>
              <a mat-list-item routerLink="/timeline" routerLinkActive="active-link"
                 (click)="closeSidenavOnMobile()">
                <mat-icon matListItemIcon>folder_shared</mat-icon>
                <span matListItemTitle>My Records</span>
              </a>
              <a mat-list-item routerLink="/medications" routerLinkActive="active-link"
                 (click)="closeSidenavOnMobile()">
                <mat-icon matListItemIcon>medication</mat-icon>
                <span matListItemTitle>{{ 'nav.medications' | translate }}</span>
              </a>
              <a mat-list-item routerLink="/payments" routerLinkActive="active-link"
                 (click)="closeSidenavOnMobile()">
                <mat-icon matListItemIcon>receipt_long</mat-icon>
                <span matListItemTitle>{{ 'nav.payments' | translate }}</span>
              </a>
            </mat-nav-list>

            <!-- Mobile-only: everything the desktop toolbar shows as pills /
                 the user menu shows as a popover collapses into the sidenav. -->
            @if (isMobile()) {
              <mat-divider></mat-divider>

              <div class="sn-section-label">Preferences</div>

              @if (locationService.selectedLocation(); as loc) {
                <button class="sn-row-btn" [matMenuTriggerFor]="locationMenuMobile">
                  <mat-icon class="sn-row-icon">location_on</mat-icon>
                  <div class="sn-row-text">
                    <strong>Location</strong>
                    <span>{{ shortLocationName(loc.name) }}</span>
                  </div>
                  <mat-icon class="sn-row-caret">expand_more</mat-icon>
                </button>
                <mat-menu #locationMenuMobile="matMenu" class="hdr-menu">
                  <div class="menu-head">Choose location</div>
                  @for (l of locationService.locations; track l.id) {
                    <button mat-menu-item class="menu-loc-item"
                            (click)="locationService.setLocation(l.id); closeSidenavOnMobile()">
                      <mat-icon [class.menu-current]="locationService.selectedLocation()?.id === l.id">
                        {{ locationService.selectedLocation()?.id === l.id ? 'check_circle' : 'local_hospital' }}
                      </mat-icon>
                      <div class="menu-loc-text">
                        <strong>{{ l.name }}</strong>
                        <span>{{ l.address }}, {{ l.city }}</span>
                      </div>
                    </button>
                  }
                </mat-menu>
              }

              @if (geo.config().languages.length > 1) {
                <button class="sn-row-btn" [matMenuTriggerFor]="langMenuMobile">
                  <mat-icon class="sn-row-icon">language</mat-icon>
                  <div class="sn-row-text">
                    <strong>Language</strong>
                    <span>{{ i18n.lang() === 'ar' ? 'العربية' : 'English' }}</span>
                  </div>
                  <mat-icon class="sn-row-caret">expand_more</mat-icon>
                </button>
                <mat-menu #langMenuMobile="matMenu" class="hdr-menu">
                  <button mat-menu-item (click)="i18n.setLanguage('en'); closeSidenavOnMobile()">
                    <mat-icon [class.invisible]="i18n.lang() !== 'en'">check</mat-icon>
                    English
                  </button>
                  <button mat-menu-item (click)="i18n.setLanguage('ar'); closeSidenavOnMobile()">
                    <mat-icon [class.invisible]="i18n.lang() !== 'ar'">check</mat-icon>
                    العربية
                  </button>
                </mat-menu>
              }

              <mat-divider></mat-divider>

              <div class="sn-section-label">Account</div>

              <a class="sn-row-btn" routerLink="/profile" (click)="closeSidenavOnMobile()">
                <mat-icon class="sn-row-icon">person</mat-icon>
                <div class="sn-row-text"><strong>{{ 'nav.profile' | translate }}</strong></div>
              </a>

              @if (family.isPrimaryOwner()) {
                <button class="sn-row-btn" (click)="openChangePassword(); closeSidenavOnMobile()">
                  <mat-icon class="sn-row-icon">lock</mat-icon>
                  <div class="sn-row-text"><strong>Change Password</strong></div>
                </button>
              }

              <a class="sn-row-btn" routerLink="/dashboard" [queryParams]="{ openFeedback: '1' }"
                 (click)="closeSidenavOnMobile()">
                <mat-icon class="sn-row-icon">rate_review</mat-icon>
                <div class="sn-row-text"><strong>Feedback</strong></div>
              </a>

              <button class="sn-row-btn sn-row-danger" (click)="signOut(); closeSidenavOnMobile()">
                <mat-icon class="sn-row-icon">logout</mat-icon>
                <div class="sn-row-text"><strong>{{ 'nav.signout' | translate }}</strong></div>
              </button>
            }
          </mat-sidenav>
          <mat-sidenav-content class="content">
            <router-outlet />
          </mat-sidenav-content>
        </mat-sidenav-container>
      </div>

      <!-- ============================================ -->
      <!-- CHANGE PASSWORD MODAL                        -->
      <!-- ============================================ -->
      @if (changePasswordOpen()) {
        <div class="cp-backdrop" (click)="closeChangePassword()"></div>
      }
      <div class="cp-modal" [class.open]="changePasswordOpen()" role="dialog" aria-modal="true">
        <header class="cp-head">
          <div class="cp-head-icon"><mat-icon>lock_reset</mat-icon></div>
          <div class="cp-head-text">
            <h3>Change Password</h3>
            <p>Enter your current password and choose a new one.</p>
          </div>
          <button mat-icon-button class="cp-close" (click)="closeChangePassword()" aria-label="Close">
            <mat-icon>close</mat-icon>
          </button>
        </header>

        <div class="cp-body">

          <!-- ====== CURRENT-PASSWORD SLOT (mode switches inside this slot) ====== -->
          @if (cpRecoveryMode() === 'password') {
            <div class="cp-label-row">
              <label class="cp-label">Current Password</label>
              <a class="cp-forgot-link" (click)="cpStartRecovery()">Forgot current password?</a>
            </div>
            <div class="cp-field">
              <input class="cp-input"
                     [type]="showCurrent() ? 'text' : 'password'"
                     placeholder="Enter your current password"
                     autocomplete="current-password"
                     [ngModel]="cpCurrent()" (ngModelChange)="cpCurrent.set($event)">
              <button mat-icon-button class="cp-eye" (click)="showCurrent.set(!showCurrent())"
                      aria-label="Show or hide current password">
                <mat-icon>{{ showCurrent() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </div>
          }

          <!-- OTP recovery — Send OTP prompt -->
          @if (cpRecoveryMode() === 'otp-send') {
            <div class="cp-recovery-card">
              <div class="cp-recovery-head">
                <mat-icon>sms</mat-icon>
                <span>Reset using OTP</span>
                <a class="cp-back-link" (click)="cpCancelRecovery()">Use current password</a>
              </div>
              <p class="cp-recovery-text">
                We'll send a 6-digit OTP to your registered mobile <strong>{{ cpMaskedPhone }}</strong>.
              </p>
              <button mat-flat-button color="primary" class="cp-otp-btn" (click)="cpSendOtp()">
                <mat-icon>send</mat-icon> Send OTP
              </button>
            </div>
          }

          <!-- OTP recovery — Enter OTP -->
          @if (cpRecoveryMode() === 'otp-verify') {
            <div class="cp-recovery-card">
              <div class="cp-recovery-head">
                <mat-icon>sms</mat-icon>
                <span>Enter OTP</span>
                <a class="cp-back-link" (click)="cpCancelRecovery()">Use current password</a>
              </div>
              <p class="cp-recovery-text">
                Enter the 6-digit code sent to <strong>{{ cpMaskedPhone }}</strong>.
              </p>
              <div class="cp-otp-row">
                <div class="cp-field cp-otp-input-field">
                  <input class="cp-input"
                         type="text" inputmode="numeric" maxlength="6"
                         placeholder="6-digit code"
                         autocomplete="one-time-code"
                         [ngModel]="cpOtp()" (ngModelChange)="cpOtp.set($event)"
                         (keyup.enter)="cpVerifyOtp()">
                </div>
                <button mat-flat-button color="primary" class="cp-otp-btn-inline"
                        [disabled]="cpOtp().length !== 6" (click)="cpVerifyOtp()">
                  Verify
                </button>
              </div>
              <div class="cp-otp-meta">
                <span class="cp-otp-hint">Demo OTP: <code>123456</code></span>
                <a class="cp-resend" (click)="cpSendOtp()">Resend</a>
              </div>
            </div>
          }

          <!-- OTP recovery — Verified pill -->
          @if (cpRecoveryMode() === 'otp-verified') {
            <div class="cp-verified">
              <mat-icon>verified</mat-icon>
              <span>OTP verified — you can now set a new password.</span>
              <a class="cp-back-link" (click)="cpCancelRecovery()">Use current password</a>
            </div>
          }

          <!-- ====== NEW PASSWORD ====== -->
          <label class="cp-label">New Password</label>
          <div class="cp-field">
            <input class="cp-input"
                   [type]="showNew() ? 'text' : 'password'"
                   placeholder="Enter a new password"
                   autocomplete="new-password"
                   [ngModel]="cpNew()" (ngModelChange)="cpNew.set($event)">
            <button mat-icon-button class="cp-eye" (click)="showNew.set(!showNew())"
                    aria-label="Show or hide new password">
              <mat-icon>{{ showNew() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </div>

          @if (cpNew().length > 0) {
            <ul class="cp-rules">
              <li [class.met]="ruleLength()">
                <mat-icon>{{ ruleLength() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                At least 8 characters
              </li>
              <li [class.met]="ruleNumber()">
                <mat-icon>{{ ruleNumber() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                Contains a number
              </li>
              <li [class.met]="ruleUpper()">
                <mat-icon>{{ ruleUpper() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                Contains an uppercase letter
              </li>
            </ul>
          }

          <!-- ====== CONFIRM ====== -->
          <label class="cp-label">Re-confirm Password</label>
          <div class="cp-field"
               [class.cp-error]="cpConfirm().length > 0 && !ruleMatch()">
            <input class="cp-input"
                   [type]="showConfirm() ? 'text' : 'password'"
                   placeholder="Re-enter the new password"
                   autocomplete="new-password"
                   [ngModel]="cpConfirm()" (ngModelChange)="cpConfirm.set($event)"
                   (keyup.enter)="submitChangePassword()">
            <button mat-icon-button class="cp-eye" (click)="showConfirm.set(!showConfirm())"
                    aria-label="Show or hide confirm password">
              <mat-icon>{{ showConfirm() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </div>
          @if (cpConfirm().length > 0 && !ruleMatch()) {
            <span class="cp-error-text">
              <mat-icon>error_outline</mat-icon>
              Passwords do not match
            </span>
          }
        </div>

        <footer class="cp-footer">
          <button mat-stroked-button (click)="closeChangePassword()">Cancel</button>
          <button mat-flat-button color="primary"
                  [disabled]="!canSubmitChangePassword()"
                  (click)="submitChangePassword()">
            Update Password
          </button>
        </footer>
      </div>
    }
  `,
  styles: [`
    /* =============================================
       LANDING PAGE - PFSH Hospital Website
       ============================================= */
    .landing-page {
      min-height: 100vh; background: #fff;
      padding-bottom: 56px; /* space for bottom nav */
    }

    /* Top Bar */
    .top-bar { background: #1b3a4b; padding: 6px 0; }
    .top-bar-inner {
      max-width: 1200px; margin: 0 auto; padding: 0 24px;
      display: flex; align-items: center; gap: 24px;
      font-size: 12px; color: rgba(255,255,255,0.8);
    }
    .tb-icon { font-size: 14px; width: 14px; height: 14px; vertical-align: middle; margin-right: 4px; }
    .top-spacer { flex: 1; }

    /* Navbar */
    .landing-nav {
      position: sticky; top: 0; z-index: 100;
      background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .nav-inner {
      max-width: 1200px; margin: 0 auto; padding: 0 24px;
      height: 68px; display: flex; align-items: center; gap: 24px;
    }
    .nav-brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon { font-size: 36px; width: 36px; height: 36px; color: #0d8a8a; }
    .brand-text { display: flex; flex-direction: column; line-height: 1.15; }
    .brand-name { font-size: 16px; font-weight: 700; color: #1b3a4b; letter-spacing: 0.5px; }
    .brand-sub { font-size: 13px; font-weight: 600; color: #0d8a8a; }
    .nav-links { display: flex; gap: 20px; flex: 1; justify-content: center; }
    .nav-links a {
      color: #1b3a4b; text-decoration: none; font-size: 13px; font-weight: 600;
      cursor: pointer; letter-spacing: 0.3px; transition: color 0.2s;
    }
    .nav-links a:hover { color: #0d8a8a; }
    .nav-cta {
      background: #0d8a8a !important; color: white !important;
      font-weight: 600 !important; border-radius: 6px !important;
    }

    /* Hero */
    .hero {
      background: linear-gradient(135deg, #1b3a4b 0%, #1e4d5e 50%, #1b3a4b 100%);
      padding: 70px 24px 60px;
    }
    .hero-content { max-width: 750px; margin: 0 auto; text-align: center; }
    .hero-tagline { color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 6px; letter-spacing: 1px; text-transform: uppercase; }
    .hero h1 { color: white; font-size: 38px; font-weight: 700; margin: 0 0 16px; }
    .hero-desc { color: rgba(255,255,255,0.8); font-size: 15px; line-height: 1.7; margin: 0 0 32px; }
    .hero-actions { display: flex; gap: 16px; justify-content: center; }
    .hero-btn {
      padding: 12px 28px !important; font-size: 14px !important;
      font-weight: 600 !important; border-radius: 6px !important;
    }
    .hero-btn.primary { background: white !important; color: #1b3a4b !important; }
    .appointment-btn { background: #0d8a8a !important; color: white !important; }

    /* Stats Bar */
    .stats-bar { background: #f0f7f7; padding: 20px 24px; }
    .stats-inner {
      max-width: 900px; margin: 0 auto;
      display: flex; justify-content: space-around;
    }
    .stat-item { display: flex; align-items: center; gap: 10px; }
    .stat-item mat-icon { font-size: 28px; width: 28px; height: 28px; color: #0d8a8a; }
    .stat-item strong { font-size: 22px; color: #1b3a4b; }
    .stat-item span { font-size: 12px; color: #888; display: block; }

    /* Sections */
    .section { padding: 48px 24px; }
    .section-inner { max-width: 1100px; margin: 0 auto; }
    .section h2 { text-align: center; font-size: 26px; font-weight: 700; color: #1b3a4b; margin: 0 0 24px; }
    .section-desc { text-align: center; color: #666; font-size: 14px; margin: 0 auto 32px; max-width: 500px; }

    /* Specialties */
    .specialties-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
    }
    .specialty-card {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 24px 12px; border-radius: 10px; border: 1px solid #eee;
      cursor: pointer; transition: all 0.2s;
    }
    .specialty-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-2px); }
    .specialty-card mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .specialty-card span { font-size: 13px; font-weight: 600; color: #333; }

    /* Doctors */
    .doctors-section { background: #f8fafa; }
    .doctors-preview-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px;
    }
    .doc-preview {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 20px; background: white; border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    }
    .doc-avatar {
      width: 56px; height: 56px; border-radius: 50%; background: #e0f2f1;
      display: flex; align-items: center; justify-content: center;
    }
    .doc-avatar mat-icon { color: #0d8a8a; font-size: 28px; width: 28px; height: 28px; }
    .doc-preview strong { font-size: 13px; color: #1b3a4b; text-align: center; }
    .doc-preview span { font-size: 11px; color: #888; }

    /* Contact Banner */
    .contact-banner {
      background: linear-gradient(135deg, #1b3a4b, #1e4d5e);
      padding: 48px 24px;
    }
    .contact-banner-inner { max-width: 800px; margin: 0 auto; text-align: center; }
    .contact-banner h2 { color: white; font-size: 24px; font-weight: 600; margin: 0 0 24px; }
    .contact-btns { display: flex; gap: 20px; justify-content: center; }
    .contact-box {
      background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3);
      border-radius: 8px; padding: 16px 32px;
      display: flex; align-items: center; gap: 12px;
    }
    .cb-label { color: rgba(255,255,255,0.6); font-size: 14px; }
    .cb-value { color: white; font-size: 16px; font-weight: 600; }
    .cb-value.clickable { cursor: pointer; text-decoration: underline; }

    /* Footer Links Bar */
    .footer-links-bar { background: #80cbc4; padding: 14px 24px; }
    .footer-links-inner {
      max-width: 1100px; margin: 0 auto; text-align: center;
      display: flex; flex-wrap: wrap; justify-content: center; gap: 6px;
    }
    .footer-links-inner a {
      color: #1b3a4b; font-size: 13px; font-weight: 500;
      cursor: pointer; text-decoration: none;
    }
    .footer-links-inner a:hover { text-decoration: underline; }
    .flink-sep { color: #1b3a4b; font-size: 13px; }

    /* Accreditations */
    .accreditations { background: #fff; padding: 32px 24px; }
    .accred-inner { max-width: 800px; margin: 0 auto; }
    .accred-badges { display: flex; justify-content: center; gap: 40px; }
    .accred-badge {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
    }
    .accred-badge mat-icon { font-size: 40px; width: 40px; height: 40px; color: #bbb; }
    .accred-badge span { font-size: 11px; color: #888; }

    /* Footer */
    .landing-footer { background: #f5f5f5; padding: 28px 24px; text-align: center; }
    .footer-inner { max-width: 800px; margin: 0 auto; }
    .footer-title { font-size: 16px; color: #0d8a8a; display: block; margin-bottom: 8px; }
    .footer-inner p { color: #666; margin: 4px 0; font-size: 13px; }
    .footer-copy { margin-top: 12px !important; font-size: 12px !important; color: #aaa !important; }
    .tiny-icon { font-size: 14px; width: 14px; height: 14px; }

    /* Bottom Mobile Nav */
    .bottom-nav {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
      background: white; border-top: 1px solid #e0e0e0;
      display: flex; justify-content: space-around; padding: 6px 0;
    }
    .bnav-item {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      font-size: 11px; color: #888; cursor: pointer; text-decoration: none;
    }
    .bnav-item mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .bnav-item:hover { color: #0d8a8a; }

    /* =============================================
       LOCATION GATE (Step 2)
       ============================================= */
    .location-gate {
      min-height: 100vh;
      background: linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .gate-content {
      max-width: 680px;
      width: 100%;
      position: relative;
    }
    .gate-back {
      position: absolute;
      top: -48px;
      left: 0;
      color: white !important;
    }
    .gate-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 32px;
    }
    .gate-logo-icon { font-size: 40px; width: 40px; height: 40px; color: white; }
    .gate-brand { font-size: 32px; font-weight: 700; color: white; margin: 0; letter-spacing: 1px; }
    .gate-title { text-align: center; color: white; font-size: 24px; font-weight: 600; margin: 0 0 8px; }
    .gate-subtitle { text-align: center; color: rgba(255,255,255,0.7); margin: 0 0 32px; font-size: 15px; }

    .locations-list { display: flex; flex-direction: column; gap: 12px; }

    .gate-location-card {
      padding: 20px; cursor: pointer; transition: all 0.25s;
      border: 2px solid transparent; border-radius: 12px !important;
    }
    .gate-location-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      border-color: #3f51b5;
    }
    .gate-loc-row { display: flex; align-items: center; gap: 16px; }
    .gate-loc-icon {
      width: 52px; height: 52px; border-radius: 14px; background: #e8eaf6;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .gate-loc-icon mat-icon { color: #3f51b5; font-size: 28px; width: 28px; height: 28px; }
    .gate-loc-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .gate-loc-info strong { font-size: 16px; color: #1a237e; }
    .gate-loc-address { font-size: 13px; color: #666; }
    .gate-loc-meta { display: flex; gap: 16px; font-size: 12px; color: #888; margin-top: 2px; }
    .gate-loc-meta span { display: flex; align-items: center; gap: 3px; }
    .gate-loc-specialties { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .spec-chip { font-size: 11px !important; min-height: 22px !important; background: #e8eaf6 !important; color: #3f51b5 !important; }
    .spec-chip.more { background: #f5f5f5 !important; color: #888 !important; }
    .gate-arrow { color: #bbb; flex-shrink: 0; transition: color 0.2s; }
    .gate-location-card:hover .gate-arrow { color: #3f51b5; }

    /* =============================================
       LOGIN SCREEN (Step 3) — REDESIGNED
       ============================================= */
    .login-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #f0f7f7 0%, #e0eef0 50%, #f5f9fa 100%);
      display: flex; flex-direction: column; align-items: center;
      padding: 0; position: relative;
    }
    .login-page::before {
      content: ''; position: absolute; inset: 0;
      background:
        radial-gradient(circle at 20% 10%, rgba(13,138,138,0.08) 0%, transparent 40%),
        radial-gradient(circle at 80% 80%, rgba(27,58,75,0.06) 0%, transparent 40%);
      pointer-events: none;
    }

    /* ---------- Top brand strip (PFSH hospital + location) ---------- */
    .login-topbar {
      width: 100%; background: white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      position: relative; z-index: 2;
    }
    .topbar-inner {
      max-width: 1100px; margin: 0 auto;
      padding: 12px 20px;
      display: flex; align-items: center; gap: 12px;
    }
    .topbar-back {
      color: #1b3a4b !important; flex-shrink: 0;
    }
    .hospital-brand {
      display: flex; align-items: center; gap: 10px;
      flex: 1; min-width: 0;
    }
    .hospital-brand-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: linear-gradient(135deg, #0d8a8a 0%, #1b3a4b 100%);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(13,138,138,0.25);
    }
    .hospital-brand-icon mat-icon {
      color: white; font-size: 24px; width: 24px; height: 24px;
    }
    .hospital-brand-text {
      display: flex; flex-direction: column; line-height: 1.2;
      min-width: 0; overflow: hidden;
    }
    .hospital-brand-text strong {
      font-size: 15px; color: #1b3a4b; font-weight: 700;
      letter-spacing: 0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .hospital-brand-ar {
      font-size: 11px; color: #0d8a8a; direction: rtl;
      text-align: left; font-weight: 600;
    }
    .topbar-loc-btn {
      flex-shrink: 0;
      border-radius: 22px !important;
      padding: 4px 12px !important;
      height: 36px !important;
      border-color: #80cbc4 !important;
      background: #f0f7f7 !important;
      display: flex !important; align-items: center !important; gap: 4px !important;
      color: #0d8a8a !important; font-weight: 600 !important;
      font-size: 13px !important;
    }
    .topbar-loc-btn:hover { background: #e0f2f1 !important; }
    .topbar-loc-btn .loc-pin {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
      color: #0d8a8a;
    }
    .topbar-loc-name {
      max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    /* Desktop default: show the full "Hospital - Branch" label.
       Mobile (<=480px) swaps to the branch-only label so the chip stops
       repeating the brand banner above. See @media (max-width: 480px). */
    .topbar-loc-name-short { display: none; }
    .topbar-loc-btn .loc-change-arrow {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      color: #0d8a8a; margin-left: 2px;
    }
    .menu-loc { display: flex; flex-direction: column; gap: 2px; }
    .menu-loc strong { font-size: 13px; color: #1b3a4b; }
    .menu-loc span { font-size: 11px; color: #888; }
    .loc-current { color: #0d8a8a !important; }

    .login-card-wrapper {
      position: relative; z-index: 1;
      width: 100%; max-width: 460px;
      padding: 32px 16px 40px;
      display: flex; flex-direction: column; align-items: center;
      flex: 1; justify-content: center;
    }
    .login-card {
      width: 100%;
      padding: 0; border-radius: 14px !important;
      box-shadow: 0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04) !important;
      overflow: hidden; background: white;
    }

    /* ---------- Medinous wordmark strip inside the card ---------- */
    .login-medinous-strip {
      display: flex; align-items: center; justify-content: center;
      gap: 12px; padding: 18px 24px;
      background: linear-gradient(135deg, #f8fafa 0%, #eef5f5 100%);
      border-bottom: 1px solid #e3ecec;
    }
    .medinous-logo {
      height: 28px; width: auto; display: block;
    }
    /* Hospital brand image — wider composition (seal + bilingual name).
       Sized taller than the medinous wordmark to keep the seal legible
       alongside the Arabic + English lines. object-fit: contain so the
       composition never crops if the source aspect ratio shifts. */
    .hospital-logo {
      height: 44px;
      width: auto; max-width: 240px;
      object-fit: contain;
      display: block;
    }
    .medinous-tag {
      font-size: 11px; color: #888; font-weight: 500;
      padding-left: 12px; border-left: 1px solid #cfd8d8;
      letter-spacing: 0.5px; text-transform: uppercase;
    }
    .medinous-logo-foot {
      height: 16px; width: auto; vertical-align: middle;
      margin-left: 2px;
    }

    /* ---------- Body & shared form ---------- */
    .login-body { padding: 24px 28px 28px; }
    .login-title {
      margin: 0 0 18px; font-size: 18px; font-weight: 600;
      color: #1b3a4b; text-align: center;
    }
    .login-field { width: 100%; margin-bottom: 8px; }
    .login-field mat-icon { color: #888; }
    .info-icon {
      cursor: help; color: #b0b0b0 !important;
    }
    .info-icon:hover { color: #0d8a8a !important; }

    .login-options { text-align: right; margin-bottom: 14px; }
    .forgot-link {
      font-size: 13px; color: #0d8a8a; cursor: pointer; font-weight: 500;
    }
    .forgot-link:hover { text-decoration: underline; }

    .login-terms { margin-bottom: 18px; font-size: 13px; color: #555; }
    .terms-link { color: #0d8a8a; cursor: pointer; font-weight: 500; }
    .terms-link:hover { text-decoration: underline; }

    /* ---------- Login method tabs (Password / OTP) ---------- */
    .login-tabs {
      display: flex;
      gap: 4px;
      padding: 4px;
      margin-bottom: 18px;
      background: #f0f7f7;
      border-radius: 10px;
    }
    .login-tab {
      flex: 1;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 8px 12px;
      background: transparent; border: none;
      border-radius: 7px;
      font-family: inherit; font-size: 13px; font-weight: 600;
      color: #5a7a82;
      cursor: pointer;
      transition: background 0.18s, color 0.18s, box-shadow 0.18s;
    }
    .login-tab mat-icon {
      font-size: 16px; width: 16px; height: 16px;
    }
    .login-tab:hover:not(.active):not(:disabled) { color: #0d8a8a; }
    .login-tab.active {
      background: white;
      color: #0d8a8a;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .login-tab:disabled { opacity: 0.55; cursor: not-allowed; }

    /* ---------- OTP-sent confirmation banner ---------- */
    .otp-sent-notice {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
      background: #e8f5f4; border: 1px solid #b2dfdb;
      border-radius: 8px;
      font-size: 13px; color: #0d6b6b;
    }
    .otp-sent-notice mat-icon {
      color: #0d8a8a;
      font-size: 18px; width: 18px; height: 18px; flex-shrink: 0;
    }
    .otp-sent-notice strong { color: #0d8a8a; font-weight: 700; }
    .edit-number-link {
      margin-left: auto;
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 6px;
      background: none; border: none; cursor: pointer;
      color: #0d8a8a; font-size: 12px; font-weight: 600;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .edit-number-link:hover { background: #d6efed; text-decoration: underline; }
    .edit-number-link mat-icon {
      font-size: 15px; width: 15px; height: 15px;
    }

    /* ---------- Resend-wait countdown (sibling of .resend-link) ---------- */
    .resend-wait {
      color: #90a4a4; font-size: 13px; font-weight: 500;
    }

    /* ---------- Blinkit-style split phone row (OTP login)
         Two separate bordered boxes — small flag-only box on the left
         (opens country menu) + larger phone field with the dial code as
         a non-editable in-field prefix. Helper line below names exactly
         which gate is unmet so the patient never has to guess why Send
         OTP is disabled. */
    .phone-row-split {
      display: flex; align-items: stretch; gap: 10px;
      width: 100%;
      margin-bottom: 8px;
    }

    /* Left: flag + caret only. Compact, square-ish — pure picker affordance. */
    .cc-box {
      display: flex; align-items: center; gap: 6px;
      padding: 0 10px 0 12px;
      height: 56px;
      background: white;
      border: 1.5px solid #e0e4ea;
      border-radius: 12px;
      cursor: pointer;
      font-family: inherit;
      flex-shrink: 0;
      transition: border-color 0.18s, box-shadow 0.18s;
    }
    .cc-box:hover:not(:disabled) { border-color: #b0c4d4; }
    .cc-box:focus-visible {
      outline: none;
      border-color: #0d8a8a;
      box-shadow: 0 0 0 3px rgba(13,138,138,0.10);
    }
    .cc-box:disabled { cursor: not-allowed; opacity: 0.6; }
    /* Flag served as a PNG from flagcdn.com — emoji flags render as text
       "BH"/"IN" on Windows, so we use an image for cross-platform fidelity. */
    .cc-flag-img {
      width: 28px; height: 20px;
      border-radius: 3px;
      object-fit: cover;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
      flex-shrink: 0;
      display: block;
    }
    .cc-caret {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      color: #90a4a4;
    }

    /* Right: phone field with in-field dial code prefix + clear button. */
    .phone-field {
      flex: 1; min-width: 0;
      display: flex; align-items: center; gap: 10px;
      padding: 0 12px 0 14px;
      height: 56px;
      background: white;
      border: 1.5px solid #e0e4ea;
      border-radius: 12px;
      transition: border-color 0.18s, box-shadow 0.18s;
    }
    .phone-field:hover:not(.phone-field-locked) { border-color: #b0c4d4; }
    .phone-field:focus-within {
      border-color: #0d8a8a;
      box-shadow: 0 0 0 3px rgba(13,138,138,0.10);
    }
    .phone-field.phone-field-valid:not(:focus-within) {
      border-color: #66bb6a;
    }
    .phone-field.phone-field-warn:not(:focus-within) {
      border-color: #ffb74d;
    }
    .phone-field.phone-field-locked { opacity: 0.7; }
    .phone-prefix {
      font-size: 15px; font-weight: 600;
      color: #1b3a4b;
      letter-spacing: 0.2px;
      flex-shrink: 0;
    }
    .phone-input {
      flex: 1; min-width: 0;
      height: 100%;
      border: none; background: transparent; outline: none;
      font: inherit;
      font-size: 15px; font-weight: 500;
      color: #1b3a4b;
      letter-spacing: 0.4px;
    }
    .phone-input::placeholder { color: #b0bec5; font-weight: 400; letter-spacing: 0.2px; }
    .phone-input:read-only { cursor: not-allowed; }
    .phone-clear {
      background: transparent; border: none; padding: 4px;
      display: flex; align-items: center; justify-content: center;
      color: #b0bec5;
      cursor: pointer;
      border-radius: 50%;
      transition: color 0.15s, background 0.15s;
      flex-shrink: 0;
    }
    .phone-clear:hover { color: #5a7a82; background: #f0f4f7; }
    .phone-clear mat-icon {
      font-size: 20px !important; width: 20px !important; height: 20px !important;
    }

    /* Country menu items: flag + name + code + tick on the active one */
    ::ng-deep .cc-menu .mat-mdc-menu-item {
      min-height: 44px !important;
      padding: 0 14px !important;
    }
    ::ng-deep .cc-menu .mat-mdc-menu-item .mat-mdc-menu-item-text {
      display: flex; align-items: center; gap: 10px;
      width: 100%;
    }
    .cc-menu-flag-img {
      width: 22px; height: 16px;
      border-radius: 3px;
      object-fit: cover;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
      flex-shrink: 0;
      display: block;
    }
    .cc-menu-text {
      display: flex; align-items: baseline; gap: 8px;
      flex: 1; min-width: 0;
    }
    .cc-menu-text strong {
      font-size: 13.5px; color: #1b3a4b; font-weight: 600;
    }
    .cc-menu-code {
      font-size: 12.5px; color: #6b7884; font-weight: 500;
    }
    .cc-menu-tick {
      color: #0d8a8a;
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      flex-shrink: 0;
    }

    .login-btn {
      width: 100%;
      padding: 14px !important;
      font-size: 15px !important;
      font-weight: 600 !important;
      background: #0d8a8a !important;
      color: white !important;
      border-radius: 8px !important;
      letter-spacing: 0.4px;
      box-shadow: 0 4px 12px rgba(13,138,138,0.25) !important;
    }
    .login-btn:disabled {
      background: #b2dfdb !important;
      color: rgba(255,255,255,0.85) !important;
      box-shadow: none !important;
    }
    .login-btn mat-icon { vertical-align: middle; margin-left: 4px; }

    /* ---------- Sign-in error message ---------- */
    .signin-error {
      margin: 0 0 16px;
      padding: 12px 14px; border-radius: 6px;
      background: #fdecea; border: 1px solid #f5b5b5;
      color: #d23f3f; font-size: 13px; font-weight: 400;
      text-align: left;
    }

    /* ---------- Locked banner (3 failed attempts) ---------- */
    .signin-locked {
      display: flex; align-items: flex-start; gap: 10px;
      margin: 0 0 16px; padding: 12px 14px;
      background: #fff7e6; border: 1px solid #f3d6a3;
      border-radius: 8px; text-align: left;
    }
    .signin-locked .lock-icon {
      color: #c47700; font-size: 22px !important; width: 22px !important; height: 22px !important;
      flex-shrink: 0; margin-top: 1px;
    }
    .locked-text {
      display: flex; flex-direction: column; gap: 2px;
      font-size: 13px; color: #6b4500; line-height: 1.5;
    }
    .locked-text strong { color: #8c5a00; font-weight: 700; }
    .locked-text > span strong { color: #1b3a4b; }

    /* Mute the form when locked so it visually reads as inactive */
    .login-body-locked .login-field,
    .login-body-locked .login-options,
    .login-body-locked .login-terms {
      opacity: 0.55; pointer-events: none;
    }
    .login-body-locked .login-btn {
      background: #d8e0e6 !important; color: #6b7884 !important;
      box-shadow: none !important;
    }
    .login-body-locked .login-btn[disabled] mat-icon {
      color: #6b7884;
    }

    /* ---------- Sign-in alt actions ---------- */
    .login-divider {
      display: flex; align-items: center; gap: 12px;
      margin: 20px 0 16px;
      color: #aaa; font-size: 12px; font-weight: 500;
    }
    .login-divider::before, .login-divider::after {
      content: ''; flex: 1; height: 1px; background: #e0e0e0;
    }
    .login-alt-row {
      display: flex; align-items: center; justify-content: center;
      gap: 8px; margin-bottom: 14px;
    }
    .alt-text { font-size: 14px; color: #555; }
    .alt-link {
      font-size: 14px; color: #0d8a8a; font-weight: 600;
      cursor: pointer;
    }
    .alt-link:hover { text-decoration: underline; }

    .guest-login-link {
      display: flex; align-items: center; justify-content: center;
      gap: 8px; font-size: 14px; color: #0d8a8a;
      cursor: pointer; font-weight: 500;
      padding: 11px; border-radius: 8px;
      border: 1px dashed #80cbc4; transition: all 0.2s;
    }
    .guest-login-link:hover { background: #e0f2f1; }

    /* ---------- Stepper (create / forgot) ---------- */
    .back-btn {
      font-size: 13px !important; color: #666 !important;
      padding: 4px 8px !important; min-width: auto !important;
      margin-bottom: 8px !important; height: 32px !important;
    }
    .back-btn mat-icon {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      margin-right: 2px;
    }
    .stepper {
      display: flex; align-items: center; gap: 6px;
      margin: 4px 0 22px; padding: 0 8px;
    }
    .step {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      flex-shrink: 0;
    }
    .step-num {
      width: 30px; height: 30px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 600;
      background: #e8eaee; color: #999;
      transition: all 0.25s;
    }
    .step.active .step-num {
      background: #0d8a8a; color: white;
      box-shadow: 0 2px 8px rgba(13,138,138,0.35);
    }
    .step.done .step-num { background: #80cbc4; color: white; }
    .step-label {
      font-size: 11px; color: #888; font-weight: 500;
      letter-spacing: 0.2px;
    }
    .step.active .step-label { color: #0d8a8a; font-weight: 600; }
    .step-line {
      flex: 1; height: 2px; background: #e8eaee;
      margin-bottom: 18px; transition: background 0.25s;
    }
    .step-line.done { background: #80cbc4; }
    .step-desc {
      font-size: 13px; color: #555; line-height: 1.5;
      margin: 0 0 16px; text-align: center;
    }
    .step-desc strong { color: #1b3a4b; }
    .otp-hint {
      font-size: 11px; color: #999; text-align: center;
      margin: -4px 0 8px;
    }
    .otp-hint code {
      background: #f0f7f7; padding: 1px 6px; border-radius: 4px;
      color: #0d8a8a; font-weight: 600;
    }
    .otp-meta {
      display: flex; align-items: center; justify-content: center;
      gap: 6px; font-size: 12px; color: #888;
      margin: 4px 0 14px;
    }
    .resend-link {
      color: #0d8a8a; cursor: pointer; font-weight: 600;
    }
    .resend-link:hover { text-decoration: underline; }

    /* ---------- Prefill banner (from guest booking) ---------- */
    .prefill-banner {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 10px 12px; margin: 0 0 14px;
      background: #e0f2f1; border-left: 3px solid #0d8a8a;
      border-radius: 8px;
    }
    .prefill-banner > mat-icon {
      color: #0d8a8a; font-size: 20px; width: 20px; height: 20px;
      flex-shrink: 0; margin-top: 1px;
    }
    .prefill-text {
      display: flex; flex-direction: column; gap: 2px; min-width: 0;
    }
    .prefill-text strong {
      font-size: 13px; color: #1b3a4b; font-weight: 700;
    }
    .prefill-text > span {
      font-size: 12px; color: #555;
    }

    /* ---------- Signup row (first/last name, country code + phone) ---------- */
    .signup-row {
      display: flex; gap: 10px; align-items: flex-start;
    }
    .signup-half { flex: 1; min-width: 0; }
    .phone-row { gap: 8px; }
    .signup-cc { width: 110px; flex-shrink: 0; }
    .signup-phone { flex: 1; min-width: 0; }
    @media (max-width: 420px) {
      .signup-row { flex-direction: column; gap: 0; }
      .signup-cc { width: 100%; }
    }

    /* ---------- Password choice cards ---------- */
    .pwd-choice {
      display: flex; flex-direction: column; gap: 10px;
      margin-bottom: 14px;
    }
    .choice-card {
      display: flex; align-items: center; gap: 12px;
      padding: 14px; border-radius: 10px;
      border: 2px solid #e3ecec; background: #fafcfc;
      cursor: pointer; transition: all 0.2s;
    }
    .choice-card:hover { border-color: #80cbc4; background: #f5fafa; }
    .choice-card.selected {
      border-color: #0d8a8a; background: #e0f2f1;
      box-shadow: 0 2px 8px rgba(13,138,138,0.15);
    }
    .choice-card input[type="radio"] {
      accent-color: #0d8a8a; width: 18px; height: 18px; flex-shrink: 0;
      margin: 0;
    }
    .choice-card mat-icon {
      color: #0d8a8a; font-size: 24px; width: 24px; height: 24px;
      flex-shrink: 0;
    }
    .choice-text { display: flex; flex-direction: column; gap: 2px; }
    .choice-text strong { font-size: 14px; color: #1b3a4b; font-weight: 600; }
    .choice-text span { font-size: 12px; color: #777; }

    /* ---------- Footer ---------- */
    .powered-by-foot {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      margin-top: 18px; font-size: 12px; color: #888;
    }
    .powered-by-foot strong { color: #0d8a8a; font-weight: 700; letter-spacing: 0.3px; }
    .shield-icon {
      font-size: 14px !important; width: 14px !important; height: 14px !important;
      color: #80cbc4;
    }

    /* =============================================
       MAIN APP SHELL (Step 4) — REDESIGNED
       ============================================= */
    .shell-container { display: flex; flex-direction: column; height: 100vh; }
    .shell-container.rtl { direction: rtl; }

    .toolbar {
      position: sticky; top: 0; z-index: 1000;
      background: white !important; color: #1b3a4b !important;
      border-bottom: 1px solid #e3ecec;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      padding: 0 16px !important;
      gap: 8px;
    }
    .hamburger { color: #1b3a4b !important; flex-shrink: 0; margin-right: 4px; }

    /* Brand: Prince Fahd Bin Sultan Hospital | Patient Portal */
    .brand {
      display: flex; align-items: center; gap: 8px;
      min-width: 0;
    }
    .brand-hospital {
      font-size: 15px; font-weight: 700; color: #1a237e;
      letter-spacing: -0.01em; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis;
    }
    .brand-divider {
      width: 1px; height: 22px; background: #d8e3e3;
      margin: 0 4px;
    }
    .brand-tag {
      font-size: 11px; color: #888; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.6px;
      white-space: nowrap;
    }

    .toolbar-spacer { flex: 1; }

    /* Pill buttons (location + language) */
    .loc-pill, .lang-pill {
      border-radius: 22px !important; height: 36px !important;
      border-color: #d8e3e3 !important; background: white !important;
      color: #1b3a4b !important; font-weight: 500 !important;
      font-size: 13px !important;
      padding: 0 12px !important;
      display: inline-flex !important; align-items: center !important;
      gap: 4px !important; flex-shrink: 0;
      transition: all 0.18s;
    }
    .loc-pill:hover, .lang-pill:hover {
      border-color: #80cbc4 !important; background: #f5fafa !important;
    }
    .loc-pin {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
      color: #0d8a8a;
    }
    .loc-name {
      max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .loc-caret, .lang-caret {
      font-size: 18px !important; width: 18px !important; height: 18px !important;
      color: #888;
    }
    .lang-globe {
      font-size: 16px !important; width: 16px !important; height: 16px !important;
      color: #0d8a8a;
    }
    .lang-code { font-weight: 700; letter-spacing: 0.3px; }

    /* Active-patient pill (Family Grouping) */
    .patient-pill {
      border-radius: 22px !important; height: 40px !important;
      border-color: #80cbc4 !important; background: #e0f2f1 !important;
      color: #00695c !important; padding: 0 10px 0 4px !important;
      display: inline-flex !important; align-items: center !important;
      gap: 8px !important; flex-shrink: 0;
      max-width: 240px;
    }
    .patient-pill:hover { background: #b2dfdb !important; }
    .patient-pill-multi { cursor: pointer; }
    .pp-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(135deg, #00897b, #00bfa5);
      color: #fff; font-weight: 700; font-size: 11px;
      display: inline-flex; align-items: center; justify-content: center;
      letter-spacing: 0.4px;
    }
    .pp-avatar-female { background: linear-gradient(135deg, #d81b60, #f06292); }
    .pp-text {
      display: inline-flex; flex-direction: column; line-height: 1.1;
      text-align: left; overflow: hidden;
    }
    .pp-text strong {
      font-size: 12px; color: #00695c; max-width: 130px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .pp-rel {
      font-size: 10px; color: #009688; font-weight: 600;
      max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .pp-caret { font-size: 16px !important; width: 16px !important; height: 16px !important; color: #00695c; }

    /* Switcher menu */
    .patient-switch-menu .ps-head {
      padding: 10px 14px; display: flex; flex-direction: column; gap: 2px;
    }
    .patient-switch-menu .ps-head strong { font-size: 13px; color: #1b3a4b; }
    .patient-switch-menu .ps-head span { font-size: 11px; color: #888; }
    .patient-switch-menu .ps-item {
      height: auto !important; line-height: 1.3 !important;
      padding: 10px 14px !important;
      display: flex !important; gap: 10px !important; align-items: center !important;
    }
    .ps-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, #00897b, #00bfa5);
      color: #fff; font-weight: 700; font-size: 12px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .ps-avatar-female { background: linear-gradient(135deg, #d81b60, #f06292); }
    .ps-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .ps-text strong { font-size: 13px; color: #1b3a4b; }
    .ps-text span { font-size: 11px; color: #6b7280; }
    .ps-locked {
      font-size: 10px; color: #b45309; display: inline-flex; align-items: center; gap: 4px;
    }
    .ps-locked mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .ps-check { color: #00897b !important; font-size: 18px !important; width: 18px !important; height: 18px !important; }

    /* Sidenav active-patient card (visible primarily on mobile) */
    .sn-patient { padding: 14px 12px 12px; }
    .sn-patient-card {
      display: flex; gap: 10px; align-items: flex-start;
      background: linear-gradient(135deg, #e0f2f1, #f0fdf9);
      border-radius: 12px; padding: 12px;
    }
    .sn-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: linear-gradient(135deg, #00897b, #00bfa5);
      color: #fff; font-weight: 700; font-size: 14px;
      display: inline-flex; align-items: center; justify-content: center;
      flex: 0 0 auto;
    }
    .sn-avatar-female { background: linear-gradient(135deg, #d81b60, #f06292); }
    .sn-patient-text { display: flex; flex-direction: column; min-width: 0; }
    .sn-patient-text strong {
      font-size: 13px; color: #1b3a4b;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .sn-patient-text span { font-size: 11px; color: #00695c; font-weight: 600; }
    .sn-guardian {
      margin-top: 4px; font-size: 10px; color: #5e35b1;
      display: inline-flex; align-items: center; gap: 4px;
    }
    .sn-guardian mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .sn-switch {
      width: 100%; margin-top: 10px;
      color: #00695c !important; border-color: #80cbc4 !important;
      font-size: 12px !important;
    }

    /* Sidenav: mobile-only Preferences + Account rows
       (location, language, profile, change password, manage family,
        feedback, sign out — collapsed from the desktop toolbar) */
    .sn-section-label {
      padding: 14px 16px 4px;
      font-size: 11px; font-weight: 700; letter-spacing: 0.6px;
      text-transform: uppercase; color: #94a3a3;
    }
    .sn-row-btn {
      display: flex; align-items: center; gap: 12px;
      width: calc(100% - 16px);
      margin: 0 8px;
      padding: 10px 12px;
      background: transparent;
      border: none; border-radius: 8px;
      text-align: left; cursor: pointer;
      color: #1b3a4b; text-decoration: none;
      font: inherit;
    }
    .sn-row-btn:hover { background: #f0f7f7; }
    .sn-row-icon {
      color: #6b7c80; font-size: 20px !important;
      width: 20px !important; height: 20px !important; flex: 0 0 auto;
    }
    .sn-row-text {
      flex: 1; display: flex; flex-direction: column; min-width: 0;
    }
    .sn-row-text strong {
      font-size: 13px; font-weight: 500; color: #1b3a4b;
    }
    .sn-row-text span {
      font-size: 11px; color: #00695c; font-weight: 600;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .sn-row-caret {
      color: #94a3a3; font-size: 18px !important;
      width: 18px !important; height: 18px !important;
    }
    .sn-row-danger { color: #c62828; }
    .sn-row-danger .sn-row-icon,
    .sn-row-danger .sn-row-text strong { color: #c62828; }

    .user-btn { color: #1b3a4b !important; flex-shrink: 0; }

    /* User menu — active patient context strip */
    .user-menu-head {
      display: flex; gap: 10px; align-items: center;
      padding: 12px 14px; min-width: 240px;
      background: linear-gradient(135deg, #e0f2f1, #f0fdf9);
    }
    .umh-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, #00897b, #00bfa5);
      color: #fff; font-weight: 700; font-size: 13px;
      display: inline-flex; align-items: center; justify-content: center;
      flex: 0 0 auto;
    }
    .umh-avatar-female { background: linear-gradient(135deg, #d81b60, #f06292); }
    .umh-text { display: flex; flex-direction: column; min-width: 0; }
    .umh-text strong { font-size: 13px; color: #1b3a4b; }
    .umh-text span { font-size: 11px; color: #00695c; font-weight: 600; }

    /* Header menus */
    .hdr-menu .menu-head {
      padding: 12px 16px 6px; font-size: 11px; color: #888;
      font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
      border-bottom: 1px solid #f0f0f0; margin-bottom: 4px;
    }
    .menu-loc-item {
      height: auto !important; line-height: 1.3 !important; padding: 10px 16px !important;
    }
    .menu-loc-text {
      display: flex; flex-direction: column; gap: 2px;
    }
    .menu-loc-text strong { font-size: 13px; color: #1b3a4b; }
    .menu-loc-text span { font-size: 11px; color: #888; }
    .menu-current { color: #0d8a8a !important; }
    .invisible { visibility: hidden; }

    /* Sidenav */
    .sidenav-container { flex: 1; background: #f5f7fa; }
    .sidenav {
      width: 240px;
      border-right: 1px solid #e3ecec;
      background: white;
    }
    .rtl .sidenav { border-right: none; border-left: 1px solid #e3ecec; }
    .sidenav mat-nav-list { padding: 12px 8px; }
    .sidenav a[mat-list-item] {
      border-radius: 8px;
      margin-bottom: 4px;
      transition: background 0.15s;
    }
    .sidenav a[mat-list-item]:hover { background: #f0f7f7; }
    .sidenav mat-icon[matListItemIcon] { color: #888; }
    .active-link {
      background: rgba(13,138,138,0.10) !important;
      color: #0d8a8a !important;
      font-weight: 600;
    }
    .active-link mat-icon[matListItemIcon] { color: #0d8a8a !important; }

    .content { padding: 24px; background: #f5f7fa; min-height: 100%; overflow-y: auto; }
    .guest-link { color: #00897b; }

    /* =============================================
       RESPONSIVE
       ============================================= */
    @media (max-width: 768px) {
      .top-bar-inner { font-size: 11px; gap: 12px; }
      .nav-links { display: none; }
      .hero h1 { font-size: 26px; }
      .hero-actions { flex-direction: column; align-items: center; }
      .stats-inner { flex-wrap: wrap; gap: 16px; justify-content: center; }
      .specialties-grid { grid-template-columns: repeat(2, 1fr); }
      .contact-btns { flex-direction: column; align-items: center; }
      .footer-links-inner a { font-size: 12px; }
      .accred-badges { flex-wrap: wrap; gap: 20px; }

      .sidenav { width: 240px; }
      .content { padding: 16px; }

      /* Toolbar on mobile: compact brand, hide tag + divider, smaller pills */
      .toolbar { padding: 0 10px !important; }
      .brand { gap: 6px; }
      .brand-hospital { font-size: 13px; }
      .brand-divider, .brand-tag { display: none; }
      .loc-pill, .lang-pill { height: 32px !important; padding: 0 8px !important; }
      .loc-name { max-width: 70px; }

      /* Patient pill on mobile: avatar + caret only — full info lives in sidenav */
      .patient-pill { height: 32px !important; padding: 0 6px 0 2px !important; max-width: none; }
      .pp-text { display: none !important; }
      .pp-avatar { width: 26px; height: 26px; font-size: 10px; }
      .loc-caret, .lang-caret, .lang-globe, .loc-pin {
        font-size: 14px !important; width: 14px !important; height: 14px !important;
      }
      .lang-pill .lang-code { font-size: 12px; }

      /* Login top bar — collapse to two rows on mobile */
      .topbar-inner { flex-wrap: wrap; padding: 10px 12px; gap: 8px; }
      .hospital-brand-text strong { font-size: 13px; }
      .hospital-brand-ar { font-size: 10px; }
      .topbar-loc-btn { font-size: 12px !important; height: 32px !important; }
      .topbar-loc-name { max-width: 120px; }
    }

    @media (max-width: 480px) {
      /* ---------- Landing page ---------- */
      .top-bar-inner { padding: 6px 12px; gap: 8px; }
      .hero { padding: 40px 16px 48px; }
      .hero h1 { font-size: 22px; line-height: 1.25; }
      .hero p { font-size: 13px; }
      .stats-bar { padding: 14px 12px; }
      .stats-inner {
        display: grid; grid-template-columns: 1fr 1fr; gap: 14px 12px;
        justify-content: stretch;
      }
      .stat-item { justify-content: center; gap: 8px; }
      .stat-item mat-icon { font-size: 22px; width: 22px; height: 22px; }
      .stat-item strong { font-size: 16px; }
      .stat-item span { font-size: 11px; }
      .section { padding: 32px 16px; }
      .section h2 { font-size: 20px; margin-bottom: 16px; }
      .specialties-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
      .doctors-preview-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .footer-links-bar { padding: 10px 12px; }
      .footer-links-inner { gap: 4px 8px; font-size: 11px; }
      .footer-links-inner a { font-size: 11px; }
      .flink-sep { font-size: 11px; }
      .accreditations { padding: 24px 12px; }
      .accred-badges { gap: 14px; flex-wrap: wrap; }
      .accred-badge mat-icon { font-size: 30px; width: 30px; height: 30px; }
      .accred-badge span { font-size: 10px; }

      /* ---------- Login topbar (pre-auth banner) ----------
         At <=480px the hospital name + Arabic subtitle were wrapping to 2-3
         lines AND the chip on the right repeated the full hospital name +
         branch, so the row looked like noise piled on noise. Cleanup:
         (1) hide the hospital name block — the brand icon keeps visual ID,
             and the chip already names the place;
         (2) swap the chip label to branch-only ("Juffair" instead of the
             full "Prince Fahd Bin Sultan Hospital - Juffair");
         (3) keep the chip sized to its content (it is a 7-char label — not
             a search bar) and pin it to the right edge of the row so the
             brand icon and chip read as two endpoints, not a stretched
             tug-of-war. */
      .topbar-inner { padding: 8px 10px; gap: 8px; flex-wrap: nowrap; }
      .hospital-brand { gap: 8px; flex: 0 0 auto; min-width: 0; }
      .hospital-brand-icon { width: 32px; height: 32px; border-radius: 8px; }
      .hospital-brand-icon mat-icon { font-size: 18px; width: 18px; height: 18px; }
      .hospital-brand-text { display: none; }
      .topbar-loc-btn {
        flex: 0 0 auto;
        margin-left: auto;
        font-size: 12px !important; height: 32px !important; padding: 0 10px !important;
        max-width: 60vw;
      }
      .topbar-loc-name-full { display: none; }
      .topbar-loc-name-short { display: inline; }
      .topbar-loc-name {
        max-width: 140px; font-size: 12px;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .topbar-loc-btn .loc-pin,
      .topbar-loc-btn .loc-change-arrow {
        font-size: 14px !important; width: 14px !important; height: 14px !important;
      }

      /* ---------- Login / Sign-up / Forgot card ---------- */
      .login-card-wrapper { padding: 16px 10px 28px; }
      .login-medinous-strip { padding: 12px 16px; gap: 8px; }
      .medinous-logo { height: 22px; }
      .hospital-logo { height: 36px; max-width: 180px; }
      .medinous-tag { font-size: 10px; padding-left: 8px; }
      .login-body { padding: 18px 16px 22px; }
      .login-title { font-size: 16px; margin-bottom: 14px; }

      /* Signup / Forgot stepper */
      .stepper { gap: 4px; }
      .step-num { width: 26px !important; height: 26px !important; font-size: 12px !important; }
      .step-label { font-size: 10px; }
      .step-desc { font-size: 12px; line-height: 1.4; }

      /* Stack two-column signup row on phones */
      .signup-row { flex-direction: column; gap: 0; }
      .signup-half { width: 100%; }
      .signup-cc { width: 100%; }
      .signup-phone { width: 100%; }

      /* ---------- App shell toolbar (post-auth) ---------- */
      .toolbar { padding: 0 8px !important; }
      .brand { gap: 4px; }
      .brand-hospital { font-size: 12px; max-width: 190px; }
      .loc-pill, .lang-pill {
        height: 28px !important; padding: 0 6px !important;
        font-size: 11px !important;
      }
      .loc-name { max-width: 60px; font-size: 11px; }
      .lang-pill .lang-code { font-size: 11px; }
      .content { padding: 12px; }
    }

    @media (max-width: 360px) {
      .stats-inner { grid-template-columns: 1fr; }
      .hero h1 { font-size: 20px; }
      .topbar-back { display: none; }
      .topbar-loc-name { max-width: 60px; }
      .brand-hospital { font-size: 11px; max-width: 120px; }
      .loc-name { max-width: 40px; }
      .lang-pill { display: none !important; }
    }

    /* ============================================
       CHANGE PASSWORD MODAL
       ============================================ */
    .cp-backdrop {
      position: fixed; inset: 0;
      background: rgba(15, 23, 42, 0.45);
      z-index: 1100;
      animation: cp-fade 0.18s ease;
    }
    @keyframes cp-fade { from { opacity: 0; } to { opacity: 1; } }

    .cp-modal {
      position: fixed; top: 0; left: 50%;
      transform: translate(-50%, -110%);
      width: min(520px, calc(100vw - 24px));
      max-height: calc(100vh - 24px);
      margin-top: 12px;
      background: white;
      border-radius: 18px;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
      z-index: 1101;
      display: flex; flex-direction: column;
      visibility: hidden;
      transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1),
                  visibility 0.32s linear;
    }
    .cp-modal.open { transform: translate(-50%, 0); visibility: visible; }

    .cp-head {
      padding: 18px 20px 14px;
      display: flex; align-items: flex-start; gap: 12px;
      border-bottom: 1px solid #eceff1;
      flex-shrink: 0;
    }
    .cp-head-icon {
      width: 40px; height: 40px; border-radius: 12px;
      background: linear-gradient(135deg, #1a237e, #3949ab);
      color: white;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .cp-head-icon mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .cp-head-text { flex: 1; min-width: 0; }
    .cp-head-text h3 { margin: 0; font-size: 17px; font-weight: 600; color: #1b3a4b; }
    .cp-head-text p { margin: 4px 0 0; font-size: 12px; color: #607d8b; }
    .cp-close { flex-shrink: 0; }

    .cp-body {
      padding: 16px 20px;
      overflow-y: auto; flex: 1;
      display: flex; flex-direction: column; gap: 6px;
    }

    /* Label row with inline "Forgot current password?" link */
    .cp-label-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px;
      margin: 10px 0 6px;
    }
    .cp-label-row .cp-label { margin: 0; }
    .cp-forgot-link {
      font-size: 12px; color: #1a237e; font-weight: 600;
      cursor: pointer; text-decoration: none;
    }
    .cp-forgot-link:hover { text-decoration: underline; }

    /* OTP recovery mini-card */
    .cp-recovery-card {
      background: #f6f8fc; border: 1px solid #e3e7f5;
      border-radius: 12px; padding: 14px 16px;
      margin: 10px 0 8px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .cp-recovery-head {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: #1a237e; font-weight: 700;
      text-transform: uppercase; letter-spacing: .04em;
    }
    .cp-recovery-head mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .cp-recovery-head .cp-back-link {
      margin-left: auto;
      font-size: 11px; font-weight: 600;
      text-transform: none; letter-spacing: 0;
      color: #607d8b; cursor: pointer;
    }
    .cp-recovery-head .cp-back-link:hover { color: #1a237e; text-decoration: underline; }
    .cp-recovery-text { margin: 0; font-size: 13px; color: #455a64; line-height: 1.5; }
    .cp-recovery-text strong { color: #1b3a4b; }

    .cp-otp-btn {
      align-self: stretch;
      height: 40px !important; border-radius: 8px !important;
      font-weight: 600 !important;
    }
    .cp-otp-btn mat-icon {
      font-size: 16px; width: 16px; height: 16px;
      vertical-align: middle; margin-right: 4px;
    }

    .cp-otp-row {
      display: flex; gap: 8px; align-items: stretch;
    }
    .cp-otp-input-field { flex: 1; }
    .cp-otp-btn-inline {
      height: 44px !important; border-radius: 8px !important;
      padding: 0 16px !important; font-weight: 600 !important;
      flex-shrink: 0;
    }

    .cp-otp-meta {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 12px; color: #888;
    }
    .cp-otp-hint code {
      background: #ffffff; padding: 1px 6px; border-radius: 4px;
      font-family: 'Courier New', monospace; color: #1b3a4b; font-weight: 600;
      border: 1px solid #e0e4ea;
    }
    .cp-resend {
      color: #1a237e; font-weight: 600; cursor: pointer;
    }
    .cp-resend:hover { text-decoration: underline; }

    /* OTP-verified success pill */
    .cp-verified {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; margin: 10px 0 8px;
      background: #e8f5e9; border: 1px solid #c8e6c9;
      border-radius: 10px;
      font-size: 13px; color: #1b5e20; font-weight: 500;
    }
    .cp-verified mat-icon { color: #2e7d32; font-size: 18px; width: 18px; height: 18px; }
    .cp-verified .cp-back-link {
      margin-left: auto; font-size: 11px; font-weight: 600;
      color: #607d8b; cursor: pointer; text-transform: none; letter-spacing: 0;
    }
    .cp-verified .cp-back-link:hover { color: #1a237e; text-decoration: underline; }

    .cp-label {
      display: block;
      font-size: 12px; font-weight: 600; color: #455a64;
      text-transform: uppercase; letter-spacing: .04em;
      margin: 10px 0 6px;
    }

    .cp-field {
      display: flex; align-items: center; gap: 4px;
      padding: 0 4px 0 12px;
      background: white;
      border: 1.5px solid #cfd8dc; border-radius: 10px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .cp-field:focus-within {
      border-color: #1a237e;
      box-shadow: 0 0 0 3px rgba(26, 35, 126, 0.10);
    }
    .cp-field.cp-error {
      border-color: #c62828;
    }
    .cp-field.cp-error:focus-within { box-shadow: 0 0 0 3px rgba(198, 40, 40, 0.10); }
    .cp-input {
      flex: 1; min-width: 0;
      border: none; outline: none; background: transparent;
      font: inherit; font-size: 14px; color: #1b3a4b;
      padding: 12px 0;
    }
    .cp-input::placeholder { color: #b0bec5; }
    .cp-eye {
      width: 36px !important; height: 36px !important; line-height: 36px !important;
      color: #90a4ae !important; flex-shrink: 0;
    }
    .cp-eye mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .cp-eye:hover { color: #1a237e !important; }

    .cp-rules {
      list-style: none; padding: 8px 0 0; margin: 0 0 8px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .cp-rules li {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: #90a4ae;
      transition: color 0.15s;
    }
    .cp-rules li mat-icon {
      font-size: 16px; width: 16px; height: 16px;
      color: #cfd8dc;
    }
    .cp-rules li.met { color: #2e7d32; }
    .cp-rules li.met mat-icon { color: #2e7d32; }

    .cp-error-text {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 12px; color: #c62828; margin-top: 4px;
    }
    .cp-error-text mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .cp-footer {
      padding: 14px 20px;
      display: flex; gap: 10px; justify-content: flex-end;
      border-top: 1px solid #eceff1;
      background: #fafafa;
      flex-shrink: 0;
    }
    .cp-footer button {
      height: 40px !important;
      font-size: 13px !important; font-weight: 600 !important;
      border-radius: 10px !important;
      padding: 0 18px !important;
    }

    @media (max-width: 600px) {
      .cp-modal {
        width: 100%; max-width: 100%;
        max-height: 100vh; height: 100vh;
        margin: 0; border-radius: 0;
      }
    }
  `]
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly signupHandoff = inject(SignupHandoffService);
  private readonly snackBar = inject(MatSnackBar);
  readonly geo = inject(GeographyService);
  readonly i18n = inject(I18nService);
  readonly locationService = inject(LocationService);
  readonly family = inject(FamilyService);

  // ===== Change Password =====
  // Default flow: current + new + confirm.
  // Escape hatch: "Forgot current password?" replaces the current-password
  // field with an inline OTP recovery mini-flow.
  readonly changePasswordOpen = signal(false);
  readonly cpRecoveryMode = signal<'password' | 'otp-send' | 'otp-verify' | 'otp-verified'>('password');
  readonly cpCurrent = signal('');
  readonly cpOtp = signal('');
  readonly cpNew = signal('');
  readonly cpConfirm = signal('');
  readonly showCurrent = signal(false);
  readonly showNew = signal(false);
  readonly showConfirm = signal(false);

  readonly cpMaskedPhone = '+973 ••• ••55';

  readonly ruleLength = computed(() => this.cpNew().length >= 8);
  readonly ruleNumber = computed(() => /\d/.test(this.cpNew()));
  readonly ruleUpper = computed(() => /[A-Z]/.test(this.cpNew()));
  readonly ruleMatch = computed(() =>
    this.cpConfirm().length > 0 && this.cpConfirm() === this.cpNew()
  );

  /**
   * Submit is enabled when either the current password is provided
   * OR the user has completed OTP recovery, AND the new-password
   * rules + confirm match pass.
   */
  readonly canSubmitChangePassword = computed(() => {
    const authProvided =
      this.cpRecoveryMode() === 'otp-verified' || this.cpCurrent().length > 0;
    return authProvided &&
      this.ruleLength() &&
      this.ruleNumber() &&
      this.ruleUpper() &&
      this.ruleMatch();
  });

  openChangePassword(): void {
    this.cpRecoveryMode.set('password');
    this.cpCurrent.set('');
    this.cpOtp.set('');
    this.cpNew.set('');
    this.cpConfirm.set('');
    this.showCurrent.set(false);
    this.showNew.set(false);
    this.showConfirm.set(false);
    this.changePasswordOpen.set(true);
  }

  closeChangePassword(): void {
    this.changePasswordOpen.set(false);
  }

  cpStartRecovery(): void {
    this.cpCurrent.set('');
    this.cpRecoveryMode.set('otp-send');
  }

  cpCancelRecovery(): void {
    this.cpOtp.set('');
    this.cpRecoveryMode.set('password');
  }

  cpSendOtp(): void {
    this.cpOtp.set('');
    this.cpRecoveryMode.set('otp-verify');
    this.snackBar.open(`OTP sent to ${this.cpMaskedPhone}`, 'Close', { duration: 2500 });
  }

  cpVerifyOtp(): void {
    if (this.cpOtp() === '123456') {
      this.cpRecoveryMode.set('otp-verified');
      this.snackBar.open('OTP verified', 'Close', { duration: 2000 });
    } else {
      this.snackBar.open('Incorrect OTP. Please try again.', 'Close', { duration: 3000 });
    }
  }

  submitChangePassword(): void {
    if (!this.canSubmitChangePassword()) return;
    // In a real build, POST to /auth/change-password.
    // Server-side this branches on whether the OTP was used or
    // the current password was supplied.
    this.changePasswordOpen.set(false);
    this.snackBar.open('Password updated successfully', 'Close', { duration: 3500 });
    this.cpCurrent.set('');
    this.cpOtp.set('');
    this.cpNew.set('');
    this.cpConfirm.set('');
  }
  readonly sidenavOpen = signal(false);
  readonly isMobile = signal(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  readonly sidenavOpened = computed(() => !this.isMobile() || this.sidenavOpen());
  readonly showLocationPicker = signal(false);
  readonly showLogin = signal(false);
  readonly pendingLocationId = signal<string>('');
  readonly loginCpr = signal('');
  readonly loginPassword = signal('');
  readonly showPassword = signal(false);
  readonly termsAccepted = signal(false);
  readonly signInError = signal('');

  // Sign-in method (Password / OTP). Tab switch at the top of the form.
  // Password flow: CPR + Password.
  // OTP flow: country code + 10-digit mobile → Send OTP → 6-digit OTP → Sign In.
  // Any 6 digits accepted (demo); the lockout from password-mode failures
  // still applies so OTP can't bypass the 3-strike rule.
  readonly loginMethod = signal<'password' | 'otp'>('password');
  readonly signinOtpCountryCode = signal('+973');
  readonly signinOtpPhone = signal('');
  readonly signinOtpSent = signal(false);
  readonly signinOtp = signal('');
  private readonly signinOtpSentAt = signal<number | null>(null);
  // Phone must be exactly 10 digits to enable Send OTP (mirrors signup rule).
  readonly signinOtpPhoneValid = computed(() => this.signinOtpPhone().length === 10);
  /** True when the patient has typed some digits but hasn't reached 10 yet
   *  — drives the warning colour on the helper text. Empty input is not a
   *  warning, it's a prompt. */
  readonly signinOtpPhonePartial = computed(() => {
    const len = this.signinOtpPhone().length;
    return len > 0 && len < 10;
  });
  // Masked rendering of the destination phone for the "OTP sent to ..." banner.
  // Shows the dial code + last 4 digits, hides the middle. Demo only — real
  // backend would echo whatever it actually messaged.
  readonly signinOtpDestination = computed(() => {
    const cc = this.signinOtpCountryCode();
    const phone = this.signinOtpPhone();
    if (!phone) return cc;
    if (phone.length <= 4) return `${cc} ${phone}`;
    const hidden = '*'.repeat(phone.length - 4);
    return `${cc} ${hidden}${phone.slice(-4)}`;
  });
  // Seconds remaining before "Resend OTP" becomes clickable again (30s window).
  readonly signinOtpResendSec = computed(() => {
    const sentAt = this.signinOtpSentAt();
    if (sentAt === null) return 0;
    const elapsedSec = Math.floor((this.currentTime() - sentAt) / 1000);
    return Math.max(0, 30 - elapsedSec);
  });

  // Failed-login lockout state
  private readonly LOCK_DURATION_MS = 60 * 1000; // 1 minute
  readonly failedAttempts = signal(0);
  readonly lockedUntil = signal<number | null>(null);
  readonly currentTime = signal(Date.now());

  readonly isLocked = computed(() => {
    const lock = this.lockedUntil();
    return lock !== null && this.currentTime() < lock;
  });

  readonly lockCountdown = computed(() => {
    const lock = this.lockedUntil();
    if (!lock) return '';
    const remaining = Math.max(0, lock - this.currentTime());
    const totalSec = Math.ceil(remaining / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m > 0
      ? `${m}m ${s.toString().padStart(2, '0')}s`
      : `${s}s`;
  });

  // Tick once per second so the countdown renders smoothly,
  // and auto-clear the lock when it expires.
  private readonly _lockTicker: ReturnType<typeof setInterval> | null =
    typeof window !== 'undefined'
      ? setInterval(() => {
          this.currentTime.set(Date.now());
          const lock = this.lockedUntil();
          if (lock !== null && Date.now() >= lock) {
            this.lockedUntil.set(null);
            this.failedAttempts.set(0);
            this.signInError.set('');
            try {
              localStorage.removeItem('login_lock_until');
              localStorage.removeItem('login_attempts');
            } catch { /* localStorage may be unavailable */ }
          }
        }, 1000)
      : null;

  // Restore lock state from localStorage so a refresh during a lock
  // period doesn't bypass the wait time. Any stored lock longer than the
  // current max duration is treated as stale (e.g. from a prior 30-min build)
  // and cleared so users aren't trapped after a duration policy change.
  private readonly _restoreLockState = (() => {
    if (typeof localStorage === 'undefined') return;
    try {
      const until = parseInt(localStorage.getItem('login_lock_until') || '0', 10);
      const attempts = parseInt(localStorage.getItem('login_attempts') || '0', 10);
      const remaining = until - Date.now();
      if (remaining > 0 && remaining <= this.LOCK_DURATION_MS) {
        this.lockedUntil.set(until);
        this.failedAttempts.set(attempts);
      } else if (until > 0) {
        // Either expired or longer than the current allowed lock — clear it.
        localStorage.removeItem('login_lock_until');
        localStorage.removeItem('login_attempts');
      } else if (attempts > 0 && attempts < 3) {
        this.failedAttempts.set(attempts);
      }
    } catch { /* localStorage may be unavailable */ }
  })();

  // Login screen mode: signin | create | forgot
  readonly loginMode = signal<'signin' | 'create' | 'forgot'>('signin');

  // Create-account flow
  readonly signupStep = signal<1 | 2 | 3>(1);
  readonly signupCpr = signal('');
  readonly signupFirstName = signal('');
  readonly signupLastName = signal('');
  readonly signupCountryCode = signal('+973');
  readonly signupPhone = signal('');
  readonly signupAttempted = signal(false);
  readonly signupOtp = signal('');
  readonly signupNewPassword = signal('');
  readonly passwordChoice = signal<'hospital' | 'own' | null>(null);

  // ISO 3166-1 alpha-2 codes drive flag-image lookup via flagcdn.com.
  // Emoji flags render as plain text ("BH", "IN") on Windows because the
  // OS doesn't ship colour flag glyphs — SVGs are the cross-platform fix.
  readonly countryCodes = [
    { code: '+973', country: 'Bahrain',      iso: 'bh' },
    { code: '+91',  country: 'India',        iso: 'in' },
    { code: '+1',   country: 'USA',          iso: 'us' },
    { code: '+44',  country: 'UK',           iso: 'gb' },
    { code: '+971', country: 'UAE',          iso: 'ae' },
    { code: '+966', country: 'Saudi Arabia', iso: 'sa' },
    { code: '+965', country: 'Kuwait',       iso: 'kw' },
    { code: '+974', country: 'Qatar',        iso: 'qa' },
    { code: '+968', country: 'Oman',         iso: 'om' }
  ];

  /** Active country object for the OTP phone input — drives the flag/code
   *  shown in the unified phone field's left-side trigger. Falls back to the
   *  first entry if the signal somehow holds an unknown code. */
  readonly signinOtpCountry = computed(() =>
    this.countryCodes.find(c => c.code === this.signinOtpCountryCode()) ?? this.countryCodes[0]
  );

  /** Flag-CDN URL for a country. 40px-wide PNG hits the sweet spot for
   *  small UI chips on retina — sharper than the SVG at this size and
   *  smaller payload (~1KB vs ~5-15KB SVG). */
  flagUrl(iso: string): string {
    return `https://flagcdn.com/w40/${iso}.png`;
  }

  // Field-level invalid states (only shown after first Send OTP attempt)
  readonly fnInvalid = computed(() => {
    if (!this.signupAttempted()) return false;
    const v = this.signupFirstName().trim();
    return v.length === 0 || v.length > 60;
  });
  readonly lnInvalid = computed(() => {
    if (!this.signupAttempted()) return false;
    const v = this.signupLastName().trim();
    return v.length === 0 || v.length > 60;
  });
  readonly cprInvalid = computed(() => {
    if (!this.signupAttempted()) return false;
    return this.signupCpr().length !== 8;
  });
  readonly phInvalid = computed(() => {
    if (!this.signupAttempted()) return false;
    return this.signupPhone().length !== 10;
  });
  readonly signupStep1Valid = computed(() => {
    const fn = this.signupFirstName().trim();
    const ln = this.signupLastName().trim();
    return fn.length > 0 && fn.length <= 60 &&
           ln.length > 0 && ln.length <= 60 &&
           this.signupCpr().length === 8 &&
           this.signupPhone().length === 10;
  });

  // Forgot-password flow
  readonly forgotStep = signal<1 | 2 | 3>(1);
  readonly forgotCpr = signal('');
  readonly forgotOtp = signal('');
  readonly forgotNewPassword = signal('');

  // Carries name/phone/email from guest booking into the signup banner
  readonly signupPrefill = signal<SignupPrefill | null>(null);

  // Auto-open Create Account (or Sign In) when guest booking hands off
  // prefill data. The handoff's `mode` field decides which login surface
  // we land on — 'create' fills the signup form, 'signin' just opens the
  // sign-in card with the CPR (if any) prefilled.
  private readonly _handoffEffect = effect(() => {
    const data = this.signupHandoff.prefillData();
    if (!data) return;
    const mode = data.mode ?? 'create';

    if (mode === 'create') {
      this.signupPrefill.set(data);
      this.signupFirstName.set(data.firstName || '');
      this.signupLastName.set(data.lastName || '');
      this.signupCpr.set((data.cpr || '').replace(/\D/g, '').slice(0, 8));
      const parsed = this.parsePrefillPhone(data.phone);
      this.signupCountryCode.set(parsed.code);
      this.signupPhone.set(parsed.number);
      this.signupAttempted.set(false);
      this.signupOtp.set('');
      this.signupNewPassword.set('');
      this.passwordChoice.set(null);
      this.signupStep.set(1);
    } else {
      // Sign-in mode: only the CPR / Patient ID field is prefillable.
      // We don't have a CPR from guest booking, so leave it blank —
      // the user enters whatever ID they registered with.
      this.loginCpr.set((data.cpr || '').replace(/\D/g, '').slice(0, 8));
      this.loginPassword.set('');
      this.signInError.set('');
      this.termsAccepted.set(false);
    }

    if (!this.pendingLocationId()) {
      this.pendingLocationId.set(this.locationService.locations[0].id);
    }
    this.showLocationPicker.set(true);
    this.showLogin.set(true);
    this.loginMode.set(mode);
    this.signupHandoff.consume();
  });

  private parsePrefillPhone(phone: string | undefined): { code: string; number: string } {
    if (!phone) return { code: '+973', number: '' };
    const cleaned = phone.replace(/\s+/g, '');
    for (const cc of this.countryCodes) {
      if (cleaned.startsWith(cc.code)) {
        return { code: cc.code, number: cleaned.slice(cc.code.length).replace(/\D/g, '').slice(0, 10) };
      }
    }
    return { code: '+973', number: cleaned.replace(/\D/g, '').slice(0, 10) };
  }

  readonly previewDoctors = [
    { name: 'Dr. Rajesh Kumar', dept: 'Cardiology' },
    { name: 'Dr. Sarah Chen', dept: 'Dermatology' },
    { name: 'Dr. Ahmed Hassan', dept: 'General Medicine' },
    { name: 'Dr. Lisa Wong', dept: 'Endocrinology' },
    { name: 'Dr. Vikram Patel', dept: 'Orthopedics' },
    { name: 'Dr. Fatima Al-Rashid', dept: 'Cardiology' }
  ];

  readonly hospitalServices = [
    { name: 'Cardiology', icon: 'favorite', color: '#e53935', desc: 'Heart & vascular care' },
    { name: 'Orthopedics', icon: 'accessibility_new', color: '#1e88e5', desc: 'Bone & joint specialists' },
    { name: 'Dermatology', icon: 'face', color: '#8e24aa', desc: 'Skin health & cosmetics' },
    { name: 'General Medicine', icon: 'medical_services', color: '#43a047', desc: 'Primary & preventive care' },
    { name: 'Endocrinology', icon: 'bloodtype', color: '#f4511e', desc: 'Diabetes & hormonal care' },
    { name: 'Pediatrics', icon: 'child_care', color: '#00acc1', desc: 'Children\'s healthcare' },
    { name: 'Neurology', icon: 'psychology', color: '#5e35b1', desc: 'Brain & nervous system' },
    { name: 'Radiology', icon: 'image_search', color: '#6d4c41', desc: 'Advanced imaging & scans' }
  ];

  onLocationSelected(locationId: string): void {
    this.pendingLocationId.set(locationId);
    this.showLogin.set(true);
  }

  goToLogin(): void {
    if (!this.pendingLocationId()) {
      this.pendingLocationId.set(this.locationService.locations[0].id);
    }
    this.showLocationPicker.set(true);
    this.showLogin.set(true);
  }

  goBackToLanding(): void {
    this.showLogin.set(false);
    this.showLocationPicker.set(false);
    this.loginMode.set('signin');
  }

  // ----- Family Grouping helpers (toolbar + sidenav) -----

  activeInitials(): string {
    const a = this.family.activeMember();
    if (!a) return '';
    return `${a.firstName[0] ?? ''}${a.lastName[0] ?? ''}`.toUpperCase();
  }

/**
   * Open the family picker modal. Single dismissible call — the modal
   * renders on top of whichever page the user is on (toolbar pill,
   * sidenav switch button, etc.).
   *
   * If the user is mid-workflow we warn first so the switch doesn't
   * silently wipe a partially-filled booking / payment form. The actual
   * reset to /dashboard happens inside the picker's `select` handler
   * once a different profile is confirmed.
   */
  openFamilyPicker(): void {
    if (!this.family.hasFamily()) return;

    if (
      this.family.config().confirmSwitchDuringWorkflow &&
      this.isInDestructiveWorkflow()
    ) {
      const proceed = window.confirm(
        'Switching patient will reset the current workflow.\n\n' +
        'Any unsaved booking, payment or form data will be lost.\n\n' +
        'Continue?'
      );
      if (!proceed) return;
    }

    this.family.openPicker(true);
  }

  /**
   * Workflows that should warn before a patient switch wipes them.
   * Anything that's not just a read-only list is treated as a workflow.
   */
  private isInDestructiveWorkflow(): boolean {
    const url = this.router.url || '';
    return (
      url.startsWith('/appointments') ||
      url.startsWith('/payments') ||
      url.startsWith('/profile')
    );
  }

  /** Sign out clears the family + active patient and returns home. */
  signOut(): void {
    this.family.clear();
    this.locationService.setLocation(null);
    this.showLogin.set(false);
    this.showLocationPicker.set(false);
    this.router.navigate(['/']);
  }

  signIn(): void {
    if (this.isLocked()) return;

    const cpr = this.loginCpr().trim();
    const pwd = this.loginPassword().trim();

    if (cpr === '12345678' && pwd === '123') {
      this.completeSignIn();
      return;
    }

    const newCount = this.failedAttempts() + 1;
    this.failedAttempts.set(newCount);
    try { localStorage.setItem('login_attempts', newCount.toString()); } catch { /* ignore */ }

    if (newCount >= 3) {
      const until = Date.now() + this.LOCK_DURATION_MS;
      this.lockedUntil.set(until);
      try { localStorage.setItem('login_lock_until', until.toString()); } catch { /* ignore */ }
      this.signInError.set('');
    } else {
      const remaining = 3 - newCount;
      this.signInError.set(
        `Incorrect National ID/Patient ID or password. You have ${remaining} ` +
        `attempt${remaining === 1 ? '' : 's'} remaining before temporary account lock.`
      );
    }
  }

  /** Switch between Password and OTP login tabs. Clears any in-flight error
   *  and resets OTP state — the patient should start the OTP flow clean if
   *  they bounce between tabs. */
  setLoginMethod(method: 'password' | 'otp'): void {
    if (this.loginMethod() === method) return;
    this.loginMethod.set(method);
    this.signInError.set('');
    this.signinOtpSent.set(false);
    this.signinOtp.set('');
    this.signinOtpSentAt.set(null);
  }

  /** Pretend-send a 6-digit OTP to the entered mobile number. Validates the
   *  phone is exactly 10 digits and the account isn't locked. Starts a 30s
   *  window before the patient can hit Resend. */
  sendSigninOtp(): void {
    if (this.isLocked()) return;
    if (!this.signinOtpPhoneValid()) return;
    this.signinOtp.set('');
    this.signinOtpSent.set(true);
    this.signinOtpSentAt.set(Date.now());
    this.signInError.set('');
  }

  /** Phone-input handler for the OTP flow. Strips non-digits, caps at 10,
   *  clears any visible error, and — if an OTP was already sent — invalidates
   *  it so the patient must hit Send OTP again with the corrected number. */
  onSigninOtpPhoneInput(value: string, el?: HTMLInputElement): void {
    const digits = (value || '').replace(/\D/g, '').slice(0, 10);
    this.signinOtpPhone.set(digits);
    // One-way [ngModel] skips writing back to the DOM when the sanitized value
    // equals the current signal (e.g. typing "www" → "" while already ""), so
    // the stray characters would stay visible. Force the element in sync.
    if (el && el.value !== digits) el.value = digits;
    if (this.signInError() && !this.isLocked()) this.signInError.set('');
    if (this.signinOtpSent()) {
      this.signinOtpSent.set(false);
      this.signinOtp.set('');
      this.signinOtpSentAt.set(null);
    }
  }

  /** Resend OTP — re-runs sendSigninOtp() but only if the 30s window has
   *  expired. Bound to the resend link. */
  resendSigninOtp(): void {
    if (this.signinOtpResendSec() > 0) return;
    this.sendSigninOtp();
  }

  /** "Edit number" — let the patient correct the mobile number after an OTP
   *  was already sent. Unwinds the whole OTP step: clears the entered code,
   *  hides the "OTP sent" notice, resets the 30s resend timer, and re-enables
   *  the mobile field. With signinOtpSent() back to false the primary CTA
   *  reverts to "Send OTP", so the patient must request and verify a fresh
   *  code before they can sign in. */
  editSigninOtpNumber(el?: HTMLInputElement): void {
    this.signinOtpSent.set(false);
    this.signinOtp.set('');
    this.signinOtpSentAt.set(null);
    if (this.signInError() && !this.isLocked()) this.signInError.set('');
    // Field is editable again next render — focus it for an immediate edit.
    if (el) setTimeout(() => el.focus());
  }

  /** Sign in via OTP. Demo accepts any 6-digit OTP — the real flow would
   *  POST {cpr, otp} to the HMS and gate on a 200 response. Lockout from
   *  password-mode failures still applies. */
  signInWithOtp(): void {
    if (this.isLocked()) return;
    if (!this.signinOtpSent()) return;
    if (this.signinOtp().length !== 6) {
      this.signInError.set('OTP must be 6 digits.');
      return;
    }
    this.completeSignIn();
  }

  onSigninOtpInput(value: string, el?: HTMLInputElement): void {
    // Strip non-digits + clamp to 6 — keeps the field strictly numeric.
    const digits = (value || '').replace(/\D/g, '').slice(0, 6);
    this.signinOtp.set(digits);
    // Force the DOM in sync — one-way [ngModel] won't repaint when the
    // sanitized value matches the current signal (see onSigninOtpPhoneInput).
    if (el && el.value !== digits) el.value = digits;
    if (this.signInError() && !this.isLocked()) this.signInError.set('');
  }

  /** Shared post-auth handoff used by both password and OTP sign-in.
   *  Clears lock state, sets the chosen location, loads the family group
   *  for the authenticated mobile, picks the primary owner, then navigates
   *  to the dashboard (showing the family picker if >1 selectable member). */
  private completeSignIn(): void {
    this.failedAttempts.set(0);
    this.lockedUntil.set(null);
    this.signInError.set('');
    try {
      localStorage.removeItem('login_lock_until');
      localStorage.removeItem('login_attempts');
    } catch { /* ignore */ }
    this.locationService.setLocation(this.pendingLocationId());

    // The verified mobile is what unlocks the family group; the CPR is the
    // login handle. Both must succeed for any patient context to be selected.
    const authenticatedMobile = '+97333224455'; // demo: Priya's verified mobile
    this.family.loadFamilyForMobile(authenticatedMobile).subscribe(group => {
      const selectable = this.family.selectableMembers();

      if (!group || selectable.length === 0) {
        // No valid family link — fall back to the single CPR holder.
        // Production HMS would always return at least the self record;
        // this branch protects the demo from a misconfigured tenant.
        this.router.navigate(['/dashboard']);
        return;
      }

      // Pre-select the primary owner so the dashboard renders meaningful
      // data behind the modal. The user then either confirms (closes
      // modal) or switches to another family member.
      const primary = selectable.find(m => m.isPrimaryOwner) ?? selectable[0];
      this.family.setActivePatient(primary.patientId);
      this.router.navigate(['/dashboard']);

      // For multi-profile groups, open the picker as a dismissible overlay
      // on top of the dashboard — the primary owner is already active
      // behind it, so closing the sheet just lands on her dashboard.
      // Single-profile groups skip it (happy-flow rule #4).
      if (selectable.length > 1) {
        this.family.openPicker(true);
      }
    });
  }

  onLoginCprInput(value: string): void {
    this.loginCpr.set(value);
    if (this.signInError() && !this.isLocked()) this.signInError.set('');
  }

  onLoginPasswordInput(value: string): void {
    this.loginPassword.set(value);
    if (this.signInError() && !this.isLocked()) this.signInError.set('');
  }

  loginAsGuest(): void {
    this.locationService.setLocation(this.pendingLocationId());
    this.router.navigate(['/guest-booking']);
  }

  toggleSidenav(): void {
    this.sidenavOpen.update(v => !v);
  }

  closeSidenavOnMobile(): void {
    if (this.isMobile()) this.sidenavOpen.set(false);
  }

  shortLocationName(name: string): string {
    return name.replace(/^Prince Fahd Bin Sultan Hospital\s*-?\s*/i, '').replace(/^PFSH\s+/i, '');
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    const mobile = window.innerWidth <= 768;
    if (mobile !== this.isMobile()) {
      this.isMobile.set(mobile);
      if (!mobile) this.sidenavOpen.set(false);
    }
  }

  toggleLanguage(): void {
    const next: SupportedLang = this.i18n.lang() === 'en' ? 'ar' : 'en';
    this.i18n.setLanguage(next);
  }

  togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  getLocationName(id: string): string {
    return this.locationService.getLocationById(id)?.name ?? '';
  }

  /** Branch-only label for the location chip on mobile. Locations are named
   *  "Prince Fahd Bin Sultan Hospital - Juffair" / "PFSH Clinic - Riffa" —
   *  on narrow screens the hospital prefix repeats the brand banner above
   *  and just adds noise, so we slice to whatever follows the last " - ".
   *  Falls back to the full name if no dash is present. */
  getLocationBranch(id: string): string {
    const full = this.getLocationName(id);
    const idx = full.lastIndexOf(' - ');
    return idx >= 0 ? full.slice(idx + 3) : full;
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  setMode(mode: 'signin' | 'create' | 'forgot'): void {
    this.loginMode.set(mode);
    this.signInError.set('');
    if (mode === 'create') {
      this.signupStep.set(1);
      this.signupFirstName.set('');
      this.signupLastName.set('');
      this.signupCpr.set('');
      this.signupCountryCode.set('+973');
      this.signupPhone.set('');
      this.signupAttempted.set(false);
      this.signupOtp.set('');
      this.signupNewPassword.set('');
      this.passwordChoice.set(null);
      this.signupPrefill.set(null);
    } else if (mode === 'forgot') {
      this.forgotStep.set(1);
      this.forgotCpr.set('');
      this.forgotOtp.set('');
      this.forgotNewPassword.set('');
    } else {
      this.signupPrefill.set(null);
    }
  }

  onSignupCprInput(value: string): void {
    this.signupCpr.set(value.replace(/\D/g, '').slice(0, 8));
  }

  onSignupPhoneInput(value: string): void {
    this.signupPhone.set(value.replace(/\D/g, '').slice(0, 10));
  }

  sendSignupOtp(): void {
    this.signupAttempted.set(true);
    if (!this.signupStep1Valid()) return;
    this.signupOtp.set('');
    this.signupStep.set(2);
  }

  verifySignupOtp(): void {
    if (this.signupOtp() === '123456') {
      this.signupStep.set(3);
    }
  }

  completeSignup(): void {
    // Account created — drop them into sign-in with their CPR pre-filled.
    this.loginCpr.set(this.signupCpr());
    this.loginPassword.set('');
    this.setMode('signin');
  }

  sendForgotOtp(): void {
    this.forgotOtp.set('');
    this.forgotStep.set(2);
  }

  verifyForgotOtp(): void {
    if (this.forgotOtp() === '123456') {
      this.forgotStep.set(3);
    }
  }

  completeForgot(): void {
    this.loginCpr.set(this.forgotCpr());
    this.loginPassword.set('');
    this.setMode('signin');
  }
}
