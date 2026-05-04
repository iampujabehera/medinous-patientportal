import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
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
              <button mat-flat-button class="nav-cta" (click)="showLocationPicker.set(true)">
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
                <button mat-flat-button class="hero-btn primary" (click)="showLocationPicker.set(true)">
                  <mat-icon>login</mat-icon> Patient Portal
                </button>
                <button mat-flat-button class="hero-btn appointment-btn" (click)="showLocationPicker.set(true)">
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
                  <span class="cb-value clickable" (click)="showLocationPicker.set(true)">Request an Appointment</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Footer Links Bar -->
          <div class="footer-links-bar">
            <div class="footer-links-inner">
              <a (click)="showLocationPicker.set(true)">Patient Portal</a>
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
            <a class="bnav-item" (click)="showLocationPicker.set(true)">
              <mat-icon>event</mat-icon><span>Appointment</span>
            </a>
            <a class="bnav-item" (click)="scrollTo('doctors')">
              <mat-icon>search</mat-icon><span>Search</span>
            </a>
            <a class="bnav-item" (click)="showLocationPicker.set(true)">
              <mat-icon>person</mat-icon><span>Login</span>
            </a>
          </div>
        </div>

      } @else if (!showLogin()) {

        <!-- ============================================ -->
        <!--  STEP 2: LOCATION PICKER                     -->
        <!-- ============================================ -->
        <div class="location-gate">
          <div class="gate-content">
            <button mat-icon-button class="gate-back" (click)="showLocationPicker.set(false)">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="gate-logo">
              <mat-icon class="gate-logo-icon">local_hospital</mat-icon>
              <h1 class="gate-brand">BSH</h1>
            </div>
            <h2 class="gate-title">Select Your Clinic</h2>
            <p class="gate-subtitle">Choose the location you'd like to visit</p>

            <div class="locations-list">
              @for (loc of locationService.locations; track loc.id) {
                <mat-card class="gate-location-card" (click)="onLocationSelected(loc.id)">
                  <div class="gate-loc-row">
                    <div class="gate-loc-icon">
                      <mat-icon>local_hospital</mat-icon>
                    </div>
                    <div class="gate-loc-info">
                      <strong>{{ loc.name }}</strong>
                      <span class="gate-loc-address">{{ loc.address }}, {{ loc.city }}</span>
                    </div>
                    <mat-icon class="gate-arrow">arrow_forward</mat-icon>
                  </div>
                </mat-card>
              }
            </div>
          </div>
        </div>

      } @else {

        <!-- ============================================ -->
        <!--  STEP 3: LOGIN SCREEN                        -->
        <!-- ============================================ -->
        <div class="login-page">
          <div class="login-card-wrapper">
            <mat-card class="login-card">
              <!-- Header with logo -->
              <div class="login-header">
                <div class="login-logo-row">
                  <mat-icon class="login-logo-icon">local_hospital</mat-icon>
                  <div class="login-logo-text">
                    <span class="login-logo-ar">مستشفى البحرين التخصصي</span>
                    <span class="login-logo-en">Bahrain Specialist Hospital</span>
                  </div>
                </div>
                @if (pendingLocationId()) {
                  <p class="login-location">
                    <mat-icon class="tiny-icon">location_on</mat-icon>
                    {{ getLocationName(pendingLocationId()) }}
                  </p>
                }
              </div>

              <!-- Login Form -->
              <div class="login-form">
                <mat-form-field appearance="outline" class="login-field">
                  <mat-label>CPR No / Patient ID</mat-label>
                  <mat-icon matPrefix>person</mat-icon>
                  <input matInput [ngModel]="loginCpr()" (ngModelChange)="loginCpr.set($event)" placeholder="Enter your CPR or Patient ID">
                  <button mat-icon-button matSuffix color="primary">
                    <mat-icon>search</mat-icon>
                  </button>
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
                  <a class="forgot-link">Forgot Password / Send OTP</a>
                </div>

                <div class="login-terms">
                  <mat-checkbox [ngModel]="termsAccepted()" (ngModelChange)="termsAccepted.set($event)">
                    <a class="terms-link">Terms & Conditions</a>
                  </mat-checkbox>
                </div>

                <button mat-flat-button class="login-btn"
                        [disabled]="!loginCpr() || !loginPassword() || !termsAccepted()"
                        (click)="signIn()">
                  Sign In <mat-icon>login</mat-icon>
                </button>
              </div>

              <!-- Guest link -->
              <div class="login-guest">
                <mat-divider></mat-divider>
                <a class="guest-login-link" (click)="loginAsGuest()">
                  <mat-icon>person_add</mat-icon>
                  Login as a Guest
                </a>
              </div>
            </mat-card>

            <p class="powered-by">Powered by <strong>medinous</strong></p>
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
       LOGIN SCREEN (Step 3)
       ============================================= */
    .login-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #e0e7ee 0%, #c8d6e0 50%, #dce4eb 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 24px; position: relative;
    }
    .login-page::before {
      content: ''; position: absolute; inset: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect fill="%231b3a4b" opacity="0.03" x="0" y="0" width="1200" height="800"/></svg>');
      opacity: 0.5;
    }
    .login-card-wrapper {
      position: relative; z-index: 1;
      width: 100%; max-width: 440px;
    }
    .login-card {
      padding: 0; border-radius: 12px !important;
      box-shadow: 0 12px 40px rgba(0,0,0,0.15) !important;
      overflow: hidden;
    }

    .login-header {
      background: #f8fafa; padding: 28px 32px 20px;
      border-bottom: 1px solid #e8e8e8; text-align: center;
    }
    .login-logo-row {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      margin-bottom: 8px;
    }
    .login-logo-icon { font-size: 40px; width: 40px; height: 40px; color: #0d8a8a; }
    .login-logo-text { display: flex; flex-direction: column; text-align: left; }
    .login-logo-ar { font-size: 14px; color: #1b3a4b; font-weight: 600; direction: rtl; }
    .login-logo-en { font-size: 12px; color: #666; }
    .login-location {
      display: flex; align-items: center; justify-content: center; gap: 4px;
      font-size: 12px; color: #888; margin: 8px 0 0;
    }

    .login-form { padding: 28px 32px; }

    .login-field {
      width: 100%; margin-bottom: 4px;
    }
    .login-field mat-icon {
      color: #888;
    }

    .login-options {
      text-align: right; margin-bottom: 16px;
    }
    .forgot-link {
      font-size: 13px; color: #0d8a8a; cursor: pointer; font-weight: 500;
    }
    .forgot-link:hover { text-decoration: underline; }

    .login-terms { margin-bottom: 20px; }
    .terms-link { font-size: 13px; color: #0d8a8a; cursor: pointer; }
    .terms-link:hover { text-decoration: underline; }

    .login-btn {
      width: 100%;
      padding: 14px !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      background: #0d8a8a !important;
      color: white !important;
      border-radius: 8px !important;
      letter-spacing: 0.5px;
    }
    .login-btn:disabled {
      background: #b2dfdb !important;
      color: rgba(255,255,255,0.7) !important;
    }

    .login-guest {
      padding: 0 32px 24px;
    }
    .login-guest mat-divider { margin-bottom: 16px; }
    .guest-login-link {
      display: flex; align-items: center; justify-content: center;
      gap: 8px; font-size: 14px; color: #0d8a8a;
      cursor: pointer; font-weight: 500;
      padding: 10px; border-radius: 8px;
      border: 1px dashed #80cbc4; transition: all 0.2s;
    }
    .guest-login-link:hover {
      background: #e0f2f1; text-decoration: none;
    }

    .powered-by {
      text-align: center; margin-top: 20px;
      font-size: 12px; color: #999;
    }
    .powered-by strong { color: #0d8a8a; font-weight: 700; letter-spacing: 0.5px; }

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
      .gate-content { padding: 0 8px; }
      .gate-loc-meta { flex-direction: column; gap: 4px; }
    }

    @media (max-width: 480px) {
      .specialties-grid { grid-template-columns: 1fr 1fr; }
      .doctors-preview-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class ShellComponent {
  private readonly router = inject(Router);
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
}
