# Medinous Patient Portal V2 — Functional Specification

**Version:** 2.0 (POC/MVP)
**Date:** April 17, 2026
**Target Client:** Bahrain Specialist Hospital (BSH)
**Product Type:** B2B SaaS White-Label Patient Portal

---

## 1. Product Overview

### 1.1 Purpose
A multi-location, white-labeled patient portal that hospital groups deploy under their own brand. Patients use it to book appointments, view health records, track medications, manage payments, and communicate with their healthcare provider — all from one unified interface.

### 1.2 Target Users
- **Primary:** Patients (mobile and desktop)
- **Secondary:** Hospital administrators (configuration)
- **Tertiary:** Sales team (demo and pitch)

### 1.3 Design Philosophy
- Patient-first, mobile-first
- Minimal information on screen — only what patients need
- Self-sufficient UI — patients should not need training
- Consumer-grade UX benchmarks (Swiggy, Zomato, GPay, Apple Health)

---

## 2. Application Flow

### 2.1 Entry Flow (Unauthenticated)

```
Hospital Website (Landing Page)
    |
    v
"Patient Portal" button clicked
    |
    v
Location Picker (select clinic branch)
    |
    +---> Login Screen (CPR/Patient ID + Password)
    |         |
    |         +---> Sign In ---> Dashboard
    |         |
    |         +---> "Login as Guest" ---> Guest Booking Flow
```

### 2.2 Authenticated Navigation

```
Dashboard (default)
    |
    +--- Appointments (booking wizard)
    +--- My Records (health timeline + document management)
    +--- Medications (daily tracker)
    +--- Payments (history + pending charges)
```

---

## 3. Screen Specifications

### 3.1 Hospital Landing Page

**Purpose:** First impression. Looks like the hospital's own website, not a third-party tool. Builds patient trust.

**Sections (top to bottom):**

| Section | Content |
|---------|---------|
| Top Bar | Phone (+973-17812222), email (info@bsh.com.bh), 24/7 Emergency label |
| Navbar | BSH logo (icon + "BAHRAIN SPECIALIST / HOSPITAL"), nav links (About Us, Our Specialties, Our Doctors, Contact), "Patient Portal" CTA button (teal) |
| Hero Banner | "Welcome to Bahrain Specialist Hospital" headline, description text, two CTAs: "Patient Portal" (white) + "Request Appointment" (teal) |
| Stats Bar | 4 Locations, 50+ Specialists, 100K+ Patients Served, 24/7 Emergency — with teal icons |
| Specialties Grid | 8 specialty cards: Cardiology, Orthopedics, Dermatology, General Medicine, Endocrinology, Pediatrics, Neurology, Radiology |
| Doctors Preview | 6 doctor cards with avatar placeholder, name, department |
| Contact Banner | "Speak with our Contact Center" + Helpline number + "Request an Appointment" link |
| Footer Links Bar | Patient Portal, Patient Feedback, Career, Blogs, Support Services, Our Locations, Patient and Family Rights |
| Accreditations | NHRA Bahrain, JCI Accredited, Training Center, Center of Excellence |
| Footer | "BAHRAIN SPECIALIST HOSPITAL", Building: 2743, Road: 2442, Block: 324, P.O. Box: 10588, Kingdom of Bahrain |
| Bottom Mobile Nav | Home, Appointment, Search, Login — fixed at bottom |

**Interactions:**
- "Patient Portal" button -> opens Location Picker
- "Request Appointment" -> opens Location Picker
- Nav links -> smooth scroll to sections
- Bottom mobile nav -> respective actions

---

### 3.2 Location Picker

**Purpose:** Patient selects which hospital branch they are visiting. Required before login.

**Design:** Full-screen overlay, dark blue gradient background, back button to return to landing page.

**Content:**
- BSH logo + "Select Your Clinic" heading
- 4 clinic cards (name + address only, no clutter):
  1. Bahrain Specialist Hospital - Juffair (24/7)
  2. BSH Medical Centre - Seef
  3. BSH Clinic - Riffa
  4. BSH Clinic - Muharraq

**Interaction:** Clicking a card advances to the Login Screen with that location pre-selected.

**Business Rationale:** Hospital groups license per branch. Location selection enables branch-specific data (doctors, schedules, pricing).

---

### 3.3 Login Screen

**Purpose:** Authenticate registered patients. Provide guest access for unregistered patients.

**Design:** Centered card on neutral background, hospital branding at top.

**Fields:**

| Field | Type | Validation |
|-------|------|-----------|
| CPR No / Patient ID | Text + search icon | Required |
| Password | Password + visibility toggle | Required |
| Terms & Conditions | Checkbox | Required to enable Sign In |

**Elements:**
- Hospital logo with bilingual text (Arabic: مستشفى البحرين التخصصي, English: Bahrain Specialist Hospital)
- Selected location name displayed below logo
- "Forgot Password / Send OTP" link (teal)
- "Sign In" button (teal, disabled until all fields filled + terms accepted)
- Divider
- "Login as a Guest" link with dashed border (navigates to Guest Booking)
- "Powered by medinous" footer text

**Demo Credentials:**
- Patient ID: `12345678`
- Password: `123`

---

### 3.4 Dashboard (V2 — Engagement-Optimized)

**Purpose:** Answer the patient's only question: "What do I need to do right now?" in under 2 seconds.

**Card Hierarchy (top to bottom):**

#### 3.4.1 Smart Context Banner
Single card showing the ONE most important thing, color-coded by urgency:

| Priority | Condition | Banner Type | Color | Action Button |
|----------|-----------|-------------|-------|---------------|
| 1 | Upcoming appointment exists | appointment | Indigo | "Get Directions" / "Join Call" |
| 2 | Urgent alert (elevated BP, etc.) | payment | Orange | "View" |
| 3 | Lab results available | lab | Teal | "View Results" |
| 4 | Medication refill due | refill | Red | "Request Refill" |
| 5 | Nothing urgent | clear | Green | "My Records" |

#### 3.4.2 Action Chips Row
Horizontal scrollable pill buttons (GPay pattern):

| Chip | Icon | Route |
|------|------|-------|
| Book Appt | event | /appointments |
| Pay Bill | payment | /payments |
| Lab Results | science | /timeline |
| Rx | medication | /medications |
| Records | folder_shared | /timeline |
| Telehealth | videocam | /appointments |

#### 3.4.3 Today Card
Daily schedule showing what the patient needs to do TODAY:

- Lists each active medication with time-of-day label (Morning/Evening) and "Mark Done" button
- Shows next appointment inline with "View" button
- Medication streak counter ("5-day streak" with fire icon) at bottom
- Left teal border accent

**Interactions:**
- "Mark" toggles to "Done" (green) — tracks daily check-in
- Streak updates based on consecutive adherence days

#### 3.4.4 Vitals Row
Horizontal scrollable cards showing only the TOP 3 clinically relevant vitals:

| Vital | Icon | Trend |
|-------|------|-------|
| Blood Pressure | speed | trending_flat / trending_up |
| Glucose | water_drop | trending_flat / trending_up |
| Heart Rate | favorite | trending_flat / trending_up |

- Each card shows: colored icon badge, label, value with trend arrow, unit
- "All Vitals" link card at the end (dashed border)
- Trend arrow color matches status (green=normal, orange=warning, red=critical)

#### 3.4.5 Next Appointment Card
Single card for the next upcoming appointment only (not a list):
- Doctor name, specialty, date, time
- Type chip (In-Person / Video)
- Icon changes based on type (hospital vs videocam)

#### 3.4.6 What's New Card
Rotating content card — taps to cycle through:

| Item | Icon | Description |
|------|------|-------------|
| Lab results ready | science | "Your HbA1c results from April 5 are available" |
| Flu vaccination | campaign | "Seasonal flu shots now available at all branches" |
| Telehealth | videocam | "Book video consultations from home" |
| Health checkup | local_offer | "Comprehensive checkup at 20% off this month" |

**Purpose:** Keeps dashboard fresh between visits. Patient sees something new each session.

#### 3.4.7 CSAT Feedback (Conditional)
- Shows only when patient has recent appointments
- "How was your last visit?" with 5 star buttons
- Tapping a star shows "Thanks for your feedback!" then auto-dismisses in 2 seconds
- Dismissable with X button

---

### 3.5 Appointment Booking

**Purpose:** Book a doctor visit in 3 steps with full fee transparency and payment options.

**Step 1: Choose Doctor**
- Specialty dropdown filter
- Doctor cards showing: avatar, name, specialty, consultation fee (green badge)
- No ratings, no block/location labels
- Skeleton loading while fetching

**Step 2: Pick Time**
- Selected doctor banner with name, specialty, fee
- Grid of available time slots
- "Change" button to go back to Step 1

**Step 3: Confirm & Pay**

| Section | Content |
|---------|---------|
| Appointment Summary | Doctor, date, time |
| Fee Details | Consultation Fee, Advance Fee, Total Payable (green card) |
| Insurance Selection | Self Pay / Use Insurance toggle. If insurance: shows "ADNIC Insurance, Policy: POL-449921, Active" |
| Complaints | Textarea for symptoms/reason |
| Action Buttons | **Book & Pay** (blue), **Book & Pay Later** (gray), or **Book with Insurance** (blue, if insurance selected) |

**Success Screen:**
- Green checkmark
- Payment status: "Paid" (green) / "Pay at Clinic" (orange) / "Insurance" (green)
- Booking details with fee
- "Book Another" button

---

### 3.6 My Records (Unified Health Timeline + Documents)

**Purpose:** One screen for the patient's entire medical history. View, search, upload, download, delete.

**Top Section (matches BSH reference exactly):**
- "Health Timeline" heading + "Upload" button (top-right, desktop) / FAB (mobile)
- Always-visible search bar (rounded, Swiggy-style)
- Time period pills: Last 7 days, Last 30 days, 3 months, 6 months, 1 year, All time
- Category toggles: All, Visits, Labs, Rx, Radiology, Procedures, Reports, Vaccines
- Record count with time context ("10 records in last 30 days")

**Records Grid (2 columns desktop, 1 column mobile):**
Each card contains:
- **Color gradient banner** (top) with category icon (teal=labs, blue=radiology, indigo=visits, orange=rx, red=procedures, green=reports, purple=vaccines)
- **Title** (bold, truncated on overflow)
- **Type chip** (e.g., "Lab Report", "Radiology", "Procedure")
- **Provider name** with person icon
- **Date** with clock icon
- **Action bar** (bottom): View | Download | Delete

**Record Types:**

| Type | Icon | Banner Color |
|------|------|-------------|
| Visit (appointment) | event | Indigo gradient |
| Lab Result | science | Teal gradient |
| Prescription | medication | Orange gradient |
| Radiology/Imaging | image | Blue gradient |
| Procedure | monitor_heart | Red-orange gradient |
| Medical Report | summarize | Green gradient |
| Vaccination | vaccines | Purple gradient |

**Upload Functionality:**
- Opens inline card with:
  - File drop zone ("Tap to select file", supports PDF/JPG/PNG, max 25MB)
  - Selected file preview with remove button
  - Document type dropdown
  - "Upload" submit button
- Uploaded document appears immediately in the grid

**Delete Functionality:**
- Removes card from grid
- Shows undo snackbar for 4 seconds

---

### 3.7 Medication Tracker

**Purpose:** Daily medication management with offline support and adherence tracking.

**Sections:**

| Section | Content |
|---------|---------|
| Header | "Medication Tracker" title + "Offline Mode" badge (when no internet) |
| Today's Schedule | List of medication cards with Take/Skip buttons, dosage, frequency, instructions, prescribing doctor |
| 7-Day Adherence | Per-medication visual: day indicators (green check / red X) + progress bar + percentage |
| Refill Management | Refill count per medication + "Request Refill" button (shown when <= 2 refills) |
| Summary Stats | 4 cards: Active Medications count, Overall Adherence %, Refills Needed, Taken Today |

**Offline Support:**
- Medications cached in IndexedDB
- Medication logs stored locally when offline
- Sync queue batches changes for when connectivity returns
- Online/offline status listeners update UI in real-time

---

### 3.8 Payments

**Purpose:** View transaction history, pay pending charges, make advance payments, download receipts.

**Top Section:**
- "Payment History" title + "Advance Payment" wallet button (top-right)
- 4 summary stat cards: Total Paid, Pending, This Month, Transactions
- Search bar (always-visible)
- Time period pills (same pattern as Health Records)
- Status tabs: All, Completed, Pending, Failed

**Advance Payment (dropdown form):**
- Triggered by top-right button
- Amount input with currency prefix
- "Apply to" dropdown: General Advance or specific pending payment
- "Pay" button — adds transaction to list immediately

**Pending Tab:**
- Orange "Total Outstanding" bar at top
- Scrollable list of ALL pending charges:

| Category | Icon Color | Examples |
|----------|-----------|---------|
| Medication | Purple | Metformin 500mg (Qty: 60), Amlodipine 5mg |
| Lab | Teal | CBC, HbA1c, Lipid Panel, Thyroid Function |
| Radiology | Blue | Chest X-Ray, Ultrasound Abdomen |
| Procedure | Red | ECG |
| Consultation | Orange | Follow-up with Dr. Rajesh Kumar |

- "Pay All" button at bottom with total amount

**All/Completed/Failed Tabs:**
- Simple card list per transaction
- Description, date, amount, status chip
- "Receipt" button for completed transactions

---

### 3.9 Guest Booking

**Purpose:** Allow unregistered patients to book appointments without creating an account.

**Access:** Via "Login as a Guest" link on the Login Screen (not in sidenav).

**4-Step Flow:**

| Step | Content |
|------|---------|
| 1. Select Location | Clinic cards with name, address, hours, phone, specialties |
| 2. Guest Details | First name, last name, phone, email (required). ID type (CPR/Passport/License) + ID number (optional) |
| 3. Choose Doctor | Specialty filter + doctor cards (name, specialty only) + time slots |
| 4. Confirm | Summary of location, guest name, doctor, date/time + reason textarea |

**Success Screen:**
- Appointment confirmed with details
- Temporary Patient ID assigned
- "Create Account" button (to convert to registered)
- "Book Another" button

---

## 4. Cross-Cutting Features

### 4.1 Multi-Location Support
- 4 BSH branches configured (Juffair, Seef, Riffa, Muharraq)
- Each branch has: name, address, city, phone, operating hours, available specialties
- Location selection required each session (not auto-restored)
- Doctors, schedules, and pricing filtered by selected location
- Location shown in toolbar chip with switch option

### 4.2 Multi-Geography / White-Label
- 5 regions supported: US, India, UAE, UK, Bahrain
- Per-region configuration:
  - Locale, currency, date/time format, timezone
  - Unit system (temperature, weight, height)
  - Feature flags (telehealth, insurance, guest booking, etc.)
  - Supported languages
- Default for BSH: Bahrain (BH), USD, English + Arabic

### 4.3 Arabic / RTL Support
- Full bilingual translations (200+ keys in English and Arabic)
- RTL layout flips automatically when Arabic is selected
- Language toggle in toolbar (visible when region supports multiple languages)
- Document direction, text alignment, and sidenav border adjust for RTL
- Translation pipe (`| translate`) used throughout templates

### 4.4 Offline Storage
- IndexedDB database (`medinous_portal`) with 3 object stores:
  - `medications` — cached medication data
  - `medication_logs` — daily take/skip logs
  - `sync_queue` — pending changes to sync when online
- Automatic online/offline detection
- Visual "Offline Mode" indicator on Medications screen

### 4.5 Progressive Loading
- Skeleton shimmer animations on every screen during data fetch
- No blank screens ever — content structure visible immediately
- Simulated network delays (300ms-1000ms) in mock mode for realistic demo
- Skeleton variants: line loader, card loader (with/without avatar)

### 4.6 Insurance Integration
- Insurance card selection during appointment booking (Step 3)
- Self Pay / Use Insurance toggle
- Active insurance policy display (provider, policy number, status)
- Insurance claim tracking in payment history (status, covered amount, patient responsibility)
- Claim form download for reimbursement

---

## 5. Technical Architecture

### 5.1 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 19 |
| Components | Standalone, OnPush change detection |
| State | Angular Signals (reactive) |
| UI Library | Angular Material + custom SCSS |
| Routing | Lazy-loaded feature modules |
| Offline | IndexedDB via OfflineStorageService |
| i18n | Custom I18nService with signal-based reactivity |
| Build | Angular CLI, esbuild |

### 5.2 Project Structure

```
src/app/
├── core/
│   ├── models/
│   │   ├── patient.model.ts        (13 interfaces)
│   │   └── geography.model.ts      (5 region configs)
│   └── services/
│       ├── api.service.ts           (16 endpoints, mock toggle)
│       ├── geography.service.ts     (region management)
│       ├── location.service.ts      (branch selection)
│       ├── i18n.service.ts          (bilingual translations)
│       ├── offline-storage.service.ts (IndexedDB wrapper)
│       └── mock-data.ts            (demo dataset)
├── shared/
│   ├── components/
│   │   ├── shell/                   (landing + login + app shell)
│   │   └── skeleton-loader/         (shimmer animations)
│   └── pipes/
│       ├── translate.pipe.ts
│       └── relative-time.pipe.ts
├── features/
│   ├── dashboard/                   (engagement-optimized)
│   ├── appointments/                (3-step wizard + payments)
│   ├── timeline/                    (unified records + documents)
│   ├── medications/                 (offline tracker)
│   ├── payments/                    (history + pending + advance)
│   └── guest-booking/              (4-step unauthenticated flow)
├── app.routes.ts                    (lazy-loaded routing)
└── app.config.ts                    (providers, preloading, initializers)
```

### 5.3 API Endpoints (Mock Layer)

| Endpoint | Method | Returns | Delay |
|----------|--------|---------|-------|
| getDashboard() | GET | DashboardSummary | 800ms |
| getTimeline(page, size) | GET | TimelineEvent[] | 400ms |
| getDoctors(specialty?) | GET | Doctor[] | 500ms |
| getAvailableSlots(doctorId, date) | GET | BookingSlot[] | 300ms |
| bookAppointment(slot, reason) | POST | Appointment | 600ms |
| getMedications() | GET | Medication[] | 500ms |
| getSpecialties() | GET | string[] | 200ms |
| getPayments(status?) | GET | Payment[] | 600ms |
| generateReceipt(paymentId) | POST | {url} | 1000ms |
| downloadInsuranceClaim(paymentId) | GET | {url} | 800ms |
| bookGuestAppointment(guest, slot, reason) | POST | GuestBookingResult | 800ms |

**Toggle:** Set `useMocks = false` in `api.service.ts` to switch to real HTTP calls.

### 5.4 Data Models

| Model | Key Fields |
|-------|-----------|
| Patient | id, firstName, lastName, dateOfBirth, gender, email, phone |
| Doctor | id, name, specialty, consultationFee, advanceFee, nextAvailable |
| Appointment | id, doctorName, specialty, date, time, status, type (in_person/telehealth) |
| Medication | id, name, dosage, frequency, prescribedBy, refillsRemaining, taken[] |
| TimelineEvent | id, type (8 categories), title, date, provider |
| Payment | id, amount, currency, status, method, breakdown[], insuranceClaim? |
| ClinicLocation | id, name, address, city, phone, operatingHours, specialties[] |
| GuestPatient | firstName, lastName, phone, email, idType?, idNumber? |

---

## 6. Demo Script

### 6.1 Setup
- V1 running on `localhost:4200`
- V2 running on `localhost:4300`

### 6.2 Demo Flow (2 minutes)

1. **Landing Page** (10s) — "This is the hospital's own website. Notice the branding, accreditations, contact center banner."

2. **Patient Portal** (5s) — "Click Patient Portal. Patient picks their branch — Juffair."

3. **Login** (10s) — "CPR: 12345678, Password: 123. Notice the Guest option below. Sign In."

4. **Dashboard** (20s) — "The dashboard immediately tells Ahmed his appointment is tomorrow. Below: today's medication schedule with Done buttons and a 5-day streak. Three key vitals with trend arrows. One tap to any action."

5. **Appointments** (20s) — "Book an appointment. Fee is visible on every doctor card. Pick Dr. Rajesh, select a slot. Confirmation shows fee breakdown, insurance toggle, and three options: Book & Pay, Pay Later, or Use Insurance."

6. **My Records** (15s) — "All health records in one place. Labs, radiology, procedures, medical reports. Filter by time, search by name. Upload a document. Download or delete. Two-column cards with color banners."

7. **Payments** (15s) — "Payment history with search and time filters. Pending tab shows everything outstanding — medications, labs, procedures — in one scrollable list. Advance Payment wallet button top-right."

8. **Medications** (10s) — "Daily tracker works offline. Take/skip each med, see 7-day adherence, request refills when low."

9. **Close** (15s) — "This is one codebase that deploys for any hospital, any country. Arabic RTL built in. Multi-location licensing. Guest booking captures walk-in revenue. No competitor offers this combination."

---

## 7. Competitive Differentiation

| Feature | Competitors | Medinous V2 |
|---------|------------|-------------|
| Multi-location | Separate portals per branch | One portal, branch selection, per-location licensing |
| New patient access | Registration wall required | Guest booking — zero friction |
| Fee transparency | Hidden until checkout | Fee visible on doctor card during selection |
| Payment options | Pay only | Book & Pay, Pay Later, Use Insurance |
| Health records | Separate timeline + documents | Unified "My Records" with upload/download/delete |
| Pending charges | Simple list | All charge types (meds, labs, procedures) in one scrollable view |
| Offline | Not supported | IndexedDB medication tracking + sync queue |
| Mobile | Desktop-adapted | Mobile-first design, FABs, horizontal scrolling, bottom nav |
| Localization | English only | English + Arabic RTL, 5 geography configs |
| Dashboard | Static status board | Context-aware smart banner, daily schedule, streaks, What's New |

---

## 8. Revenue Model

| Revenue Stream | Mechanism |
|----------------|-----------|
| Per-location licensing | Hospital pays per branch connected |
| Setup fee | White-label branding, API integration |
| Annual maintenance | Support, updates, hosting |
| Premium features | Telehealth module, advanced analytics |
| Transaction fees | Payment processing commission (optional) |

---

## 9. Future Roadmap (Post-POC)

| Priority | Feature | Business Value |
|----------|---------|---------------|
| P1 | Real API integration + backend | Production deployment |
| P2 | Telehealth video calls | Premium feature upsell |
| P3 | Prescription refill requests | Reduces pharmacy phone calls |
| P4 | Push notifications | Appointment reminders reduce no-shows |
| P5 | Family member profiles | Parent manages kids' health — higher engagement |
| P6 | Doctor chat / messaging | Async follow-up reduces unnecessary visits |
| P7 | Queue / token system | Live wait times reduce patient frustration |

---

*Document generated from working codebase. All features described are implemented and functional in the V2 POC.*
