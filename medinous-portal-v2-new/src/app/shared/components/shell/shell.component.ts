import { Component, ChangeDetectionStrategy, computed, effect, inject, signal } from '@angular/core';
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
import { FormsModule } from '@angular/forms';
import { GeographyService } from '../../../core/services/geography.service';
import { I18nService, SupportedLang } from '../../../core/services/i18n.service';
import { LocationService } from '../../../core/services/location.service';
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
    MatCheckboxModule, MatFormFieldModule, MatInputModule, FormsModule,
    TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
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
                  <span class="brand-name">BAHRAIN SPECIALIST</span>
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
              <h1>Bahrain Specialist Hospital</h1>
              <p class="hero-desc">Providing world-class healthcare services in the Kingdom of Bahrain since 2009.
                 NHRA licensed, internationally accredited, and trusted by over 100,000 patients.</p>
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
                  <span>NHRA Bahrain</span>
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
              <strong class="footer-title">BAHRAIN SPECIALIST HOSPITAL</strong>
              <p>Building: 2743, Road: 2442, Block: 324, P.O. Box: 10588, Kingdom of Bahrain</p>
              <p class="footer-copy">Copyright 2026 &#64; Bahrain Specialist Hospital</p>
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
          <!-- Top strip: BSH hospital brand + branch with Change -->
          <div class="login-topbar">
            <div class="topbar-inner">
              <button mat-icon-button class="topbar-back" (click)="goBackToLanding()" matTooltip="Back to website">
                <mat-icon>arrow_back</mat-icon>
              </button>
              <div class="hospital-brand">
                <div class="hospital-brand-icon"><mat-icon>local_hospital</mat-icon></div>
                <div class="hospital-brand-text">
                  <strong>Bahrain Specialist Hospital</strong>
                  <span class="hospital-brand-ar">مستشفى البحرين التخصصي</span>
                </div>
              </div>
              <button mat-stroked-button class="topbar-loc-btn" [matMenuTriggerFor]="locChangeMenu">
                <mat-icon class="loc-pin">location_on</mat-icon>
                <span class="topbar-loc-name">{{ getLocationName(pendingLocationId()) }}</span>
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
              <!-- Medinous wordmark inside the login card -->
              <div class="login-medinous-strip">
                <img src="medinous-logo.svg" alt="Medinous" class="medinous-logo">
                <span class="medinous-tag">Patient Portal</span>
              </div>

              <!-- ============= MODE: SIGN IN ============= -->
              @if (loginMode() === 'signin') {
                <div class="login-body">
                  <h2 class="login-title">Sign in to your account</h2>

                  <mat-form-field appearance="outline" class="login-field">
                    <mat-label>CPR No / Patient ID</mat-label>
                    <mat-icon matPrefix>person</mat-icon>
                    <input matInput [ngModel]="loginCpr()" (ngModelChange)="loginCpr.set($event)" placeholder="Enter CPR or Patient ID">
                    <mat-icon matSuffix class="info-icon"
                              matTooltip="CPR is your Bahrain national ID (8 digits). Patient ID is provided by the hospital at registration."
                              matTooltipPosition="above">info_outline</mat-icon>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="login-field">
                    <mat-label>Password</mat-label>
                    <mat-icon matPrefix>lock</mat-icon>
                    <input matInput [type]="showPassword() ? 'text' : 'password'" [ngModel]="loginPassword()" (ngModelChange)="loginPassword.set($event)" placeholder="Enter your password">
                    <button mat-icon-button matSuffix (click)="togglePassword()">
                      <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                  </mat-form-field>

                  <div class="login-options">
                    <a class="forgot-link" (click)="setMode('forgot')">Forgot Password?</a>
                  </div>

                  <div class="login-terms">
                    <mat-checkbox [ngModel]="termsAccepted()" (ngModelChange)="termsAccepted.set($event)">
                      I agree to the <a class="terms-link">Terms &amp; Conditions</a>
                    </mat-checkbox>
                  </div>

                  <button mat-flat-button class="login-btn"
                          [disabled]="!loginCpr() || !loginPassword() || !termsAccepted()"
                          (click)="signIn()">
                    Sign In <mat-icon>arrow_forward</mat-icon>
                  </button>

                  <div class="login-divider"><span>or</span></div>

                  <div class="login-alt-row">
                    <span class="alt-text">New patient?</span>
                    <a class="alt-link" (click)="setMode('create')">Create Account</a>
                  </div>

                  <a class="guest-login-link" (click)="loginAsGuest()">
                    <mat-icon>person_outline</mat-icon>
                    Continue as Guest
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
                      <span class="step-label">CPR</span>
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
                               placeholder="As per CPR">
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
                      <mat-label>CPR Number</mat-label>
                      <mat-icon matPrefix>badge</mat-icon>
                      <input matInput inputmode="numeric" maxlength="8"
                             [ngModel]="signupCpr()"
                             (ngModelChange)="onSignupCprInput($event)"
                             placeholder="8-digit CPR">
                      @if (cprInvalid()) {
                        <mat-error>CPR must be exactly 8 digits</mat-error>
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
                    <p class="step-desc">We sent a 6-digit code to the mobile number registered with CPR <strong>{{ signupCpr() }}</strong>.</p>
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
                    <p class="step-desc">Enter your CPR or Patient ID. We'll send an OTP to the mobile registered with your account.</p>
                    <mat-form-field appearance="outline" class="login-field">
                      <mat-label>CPR No / Patient ID</mat-label>
                      <mat-icon matPrefix>person</mat-icon>
                      <input matInput [ngModel]="forgotCpr()" (ngModelChange)="forgotCpr.set($event)" placeholder="Enter CPR or Patient ID">
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
        <mat-toolbar color="primary" class="toolbar">
          <button mat-icon-button (click)="toggleSidenav()">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="logo">BSH Patient Portal</span>
          <span class="toolbar-spacer"></span>

          @if (locationService.selectedLocation(); as loc) {
            <mat-chip class="location-chip" [matMenuTriggerFor]="locationMenu">
              <mat-icon>location_on</mat-icon>
              {{ loc.name | slice:0:25 }}
            </mat-chip>
          }
          <mat-menu #locationMenu="matMenu">
            @for (loc of locationService.locations; track loc.id) {
              <button mat-menu-item (click)="locationService.setLocation(loc.id)">
                <mat-icon>{{ locationService.selectedLocation()?.id === loc.id ? 'check_circle' : 'local_hospital' }}</mat-icon>
                {{ loc.name }}
              </button>
            }
          </mat-menu>

          @if (geo.config().languages.length > 1) {
            <button mat-icon-button (click)="toggleLanguage()" [matTooltip]="i18n.lang() === 'en' ? 'العربية' : 'English'">
              <mat-icon>translate</mat-icon>
            </button>
          }

          <mat-select
            class="geo-select"
            [value]="geo.config().code"
            (selectionChange)="geo.setGeography($event.value)">
            @for (region of geo.availableRegions; track region.code) {
              <mat-option [value]="region.code">{{ region.name }}</mat-option>
            }
          </mat-select>

          <button mat-icon-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <button mat-menu-item>
              <mat-icon>person</mat-icon> {{ 'nav.profile' | translate }}
            </button>
            <button mat-menu-item>
              <mat-icon>settings</mat-icon> {{ 'nav.settings' | translate }}
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item>
              <mat-icon>logout</mat-icon> {{ 'nav.signout' | translate }}
            </button>
          </mat-menu>
        </mat-toolbar>

        <mat-sidenav-container class="sidenav-container">
          <mat-sidenav [mode]="'side'" [opened]="sidenavOpen()" class="sidenav">
            <mat-nav-list>
              <a mat-list-item routerLink="/dashboard" routerLinkActive="active-link">
                <mat-icon matListItemIcon>dashboard</mat-icon>
                <span matListItemTitle>{{ 'nav.dashboard' | translate }}</span>
              </a>
              <a mat-list-item routerLink="/appointments" routerLinkActive="active-link">
                <mat-icon matListItemIcon>event</mat-icon>
                <span matListItemTitle>{{ 'nav.appointments' | translate }}</span>
              </a>
              <a mat-list-item routerLink="/timeline" routerLinkActive="active-link">
                <mat-icon matListItemIcon>folder_shared</mat-icon>
                <span matListItemTitle>My Records</span>
              </a>
              <a mat-list-item routerLink="/medications" routerLinkActive="active-link">
                <mat-icon matListItemIcon>medication</mat-icon>
                <span matListItemTitle>{{ 'nav.medications' | translate }}</span>
              </a>
              <a mat-list-item routerLink="/payments" routerLinkActive="active-link">
                <mat-icon matListItemIcon>receipt_long</mat-icon>
                <span matListItemTitle>{{ 'nav.payments' | translate }}</span>
              </a>
            </mat-nav-list>
          </mat-sidenav>
          <mat-sidenav-content class="content">
            <router-outlet />
          </mat-sidenav-content>
        </mat-sidenav-container>
      </div>
    }
  `,
  styles: [`
    /* =============================================
       LANDING PAGE - BSH Hospital Website
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

    /* ---------- Top brand strip (BSH hospital + location) ---------- */
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
       MAIN APP SHELL (Step 4)
       ============================================= */
    .shell-container { display: flex; flex-direction: column; height: 100vh; }
    .shell-container.rtl { direction: rtl; }
    .toolbar { position: sticky; top: 0; z-index: 1000; }
    .logo { font-size: 20px; font-weight: 600; margin-left: 8px; letter-spacing: 0.5px; }
    .rtl .logo { margin-left: 0; margin-right: 8px; }
    .toolbar-spacer { flex: 1; }
    .location-chip {
      cursor: pointer; margin-right: 8px;
      background: rgba(255,255,255,0.15) !important; color: white !important;
    }
    .geo-select {
      width: 140px; margin-right: 8px;
      ::ng-deep .mat-mdc-select-value { color: white; }
      ::ng-deep .mat-mdc-select-arrow { color: rgba(255,255,255,0.7); }
    }
    .sidenav-container { flex: 1; }
    .sidenav { width: 240px; border-right: 1px solid rgba(0,0,0,0.08); }
    .rtl .sidenav { border-right: none; border-left: 1px solid rgba(0,0,0,0.08); }
    .content { padding: 24px; background: #f5f7fa; min-height: 100%; overflow-y: auto; }
    .active-link { background: rgba(63,81,181,0.08) !important; color: #3f51b5; }
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

      .sidenav { width: 200px; }
      .content { padding: 16px; }
      .geo-select { width: 100px; }
      .location-chip { max-width: 150px; }

      /* Login top bar — collapse to two rows on mobile */
      .topbar-inner { flex-wrap: wrap; padding: 10px 12px; gap: 8px; }
      .hospital-brand-text strong { font-size: 13px; }
      .hospital-brand-ar { font-size: 10px; }
      .topbar-loc-btn { font-size: 12px !important; height: 32px !important; }
      .topbar-loc-name { max-width: 120px; }
    }

    @media (max-width: 480px) {
      .specialties-grid { grid-template-columns: 1fr 1fr; }
      .doctors-preview-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly signupHandoff = inject(SignupHandoffService);
  readonly geo = inject(GeographyService);
  readonly i18n = inject(I18nService);
  readonly locationService = inject(LocationService);
  readonly sidenavOpen = signal(true);
  readonly showLocationPicker = signal(false);
  readonly showLogin = signal(false);
  readonly pendingLocationId = signal<string>('');
  readonly loginCpr = signal('');
  readonly loginPassword = signal('');
  readonly showPassword = signal(false);
  readonly termsAccepted = signal(false);

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

  readonly countryCodes = [
    { code: '+973', country: 'Bahrain' },
    { code: '+91',  country: 'India' },
    { code: '+1',   country: 'USA' },
    { code: '+44',  country: 'UK' },
    { code: '+971', country: 'UAE' },
    { code: '+966', country: 'Saudi Arabia' },
    { code: '+965', country: 'Kuwait' },
    { code: '+974', country: 'Qatar' },
    { code: '+968', country: 'Oman' }
  ];

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

  // Auto-open Create Account when guest booking hands off prefill data.
  private readonly _handoffEffect = effect(() => {
    const data = this.signupHandoff.prefillData();
    if (!data) return;
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
    if (!this.pendingLocationId()) {
      this.pendingLocationId.set(this.locationService.locations[0].id);
    }
    this.showLocationPicker.set(true);
    this.showLogin.set(true);
    this.loginMode.set('create');
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

  signIn(): void {
    const cpr = this.loginCpr().trim();
    const pwd = this.loginPassword().trim();
    if ((cpr === '12345678' && pwd === '123') || (cpr && pwd)) {
      this.locationService.setLocation(this.pendingLocationId());
      this.router.navigate(['/dashboard']);
    }
  }

  loginAsGuest(): void {
    this.locationService.setLocation(this.pendingLocationId());
    this.router.navigate(['/guest-booking']);
  }

  toggleSidenav(): void {
    this.sidenavOpen.update(v => !v);
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

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  setMode(mode: 'signin' | 'create' | 'forgot'): void {
    this.loginMode.set(mode);
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
