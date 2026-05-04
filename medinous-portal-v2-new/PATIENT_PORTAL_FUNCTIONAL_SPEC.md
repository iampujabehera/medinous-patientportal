# Patient Portal
## Functional Specification

| | |
|---|---|
| **Product** | Patient Portal |
| **Author** | Puja Behera |
| **Version** | 1.0 · Draft |
| **Date** | April 2026 |
| **Customer** | Bahrain Specialist Hospital |
| **Reviewers** | Murali |

---

# 1. Business Context

The current hospital patient portal experience is fragmented and clinical. Patients are forced through registration walls before they can book a single appointment. Doctor consultation fees are hidden until checkout, leading to abandoned bookings and front-desk negotiations. Lab reports, prescriptions, and procedure summaries live in separate screens, none of which surface critical updates the patient actually needs to act on.

Hospital groups operating multiple branches deploy multiple disconnected portals, one per location, fragmenting the brand and the patient data. Insurance flows are handled at the front desk rather than during booking, creating queues and billing disputes. Most importantly, the dashboard most patients see on login is a static status board, it tells them what data exists but never tells them what they need to do next.

## The Problem Patient Portal Solves:

This new patient portal unifies the entire patient experience on one mobile-first, multi-location, white-labeled platform that hospitals can deploy under their own brand.

- **Hospital-branded landing page** every patient enters through a website that looks like the hospital's own, building trust before they reach any portal interface.
- **Multi-location selection** before login one portal serves all branches; patients pick their clinic and the system filters doctors, schedules, and pricing accordingly.
- **Authentication with guest fallback** registered patients sign in with CPR/Patient ID; new patients can book as a guest without registration, capturing walk-in revenue competitors lose.
- **Smart Context Dashboard** the dashboard shows the ONE most important thing a patient needs to do, color-coded by urgency, with action button always visible.
- **Fee-transparent appointment booking** consultation fees visible on the doctor card before selection, with three payment options at confirmation Book & Pay, Book & Pay Later, or Use Insurance Card.
- **Unified Health Records** medical history and document management merged into one screen with search, time-period filtering, category toggles, and inline upload/download/delete.
- **Wallet-style advance payment** compact top-right button on the Payments screen lets patients top up their wallet without cluttering the transaction history.
- **Offline-capable medication tracker** daily take/skip logging works offline using IndexedDB and syncs when connectivity returns.
- **Multi-geography & Arabic RTL** one codebase deploys across Bahrain, UAE, India, UK, and US, with full Arabic RTL support for Gulf patients.

## Functional Requirements

---

# Module 1: Hospital Landing & Authentication

## US 1. As a patient, I need to see the hospital's website-branded landing page when I open the portal, so I trust I'm on my hospital's site and not a third-party tool.

**REQ-1** Add a public, unauthenticated landing page as the application root route. The page renders before any portal screen and is the only entry point for patients.

> **REQ-1.1** Landing page contains a sticky top bar with hospital phone (+973-17812222), email (info@bsh.com.bh), and "24/7 Emergency" label.

> **REQ-1.2** Sticky navbar displays the hospital logo (BAHRAIN SPECIALIST / HOSPITAL with teal cross icon), navigation links (About Us, Our Specialties, Our Doctors, Contact), and a teal "Patient Portal" CTA button on the right.

> **REQ-1.3** Hero banner displays welcome heading, hospital description, and two CTA buttons: "Patient Portal" (white, primary) and "Request Appointment" (teal, secondary).

> **REQ-1.4** Stats bar shows: 4 Locations, 50+ Specialists, 100K+ Patients Served, 24/7 Emergency with teal icons.

> **REQ-1.5** Specialties grid displays 8 specialty cards (Cardiology, Orthopedics, Dermatology, General Medicine, Endocrinology, Pediatrics, Neurology, Radiology) each with a colored icon and label.

> **REQ-1.6** Doctors preview grid shows 6 doctor cards with avatar placeholder, name, and department.

> **REQ-1.7** Contact banner displays "Speak with our Contact Center for assistance" with two boxes: Helpline number and "Request an Appointment" link.

> **REQ-1.8** Footer links bar shows: Patient Portal, Patient Feedback, Career, Blogs, Support Services, Our Locations, Patient and Family Rights.

> **REQ-1.9** Accreditations section displays NHRA Bahrain, JCI Accredited, Training Center, and Center of Excellence badges.

> **REQ-1.10** Footer shows hospital name, address (Building: 2743, Road: 2442, Block: 324, P.O. Box: 10588, Kingdom of Bahrain), and copyright.

> **REQ-1.11** On mobile (<768px), a fixed bottom navigation bar shows Home, Appointment, Search, and Login icons. Top navbar links are hidden on mobile.

> **REQ-1.12** Clicking "Patient Portal" or "Request Appointment" CTAs opens the Location Picker overlay. Clicking nav links scrolls smoothly to the corresponding section.

---

## US 2. As a patient, I need to select my hospital branch before logging in, so the system shows me the correct doctors, schedules, and pricing for that location.

**REQ-2** When the user clicks any "Patient Portal" CTA, render a full-screen Location Picker overlay above the landing page.

> **REQ-2.1** Overlay displays a back arrow button (top-left), the hospital logo, and the heading "Select Your Clinic" with subtitle "Choose the location you'd like to visit".

> **REQ-2.2** Display all active clinic locations as selectable cards: Bahrain Specialist Hospital - Juffair, BSH Medical Centre - Seef, BSH Clinic - Riffa, BSH Clinic - Muharraq.

> **REQ-2.3** Each card shows ONLY the location name and address (no operating hours, phone, or specialty chips). Card uses dashed border on hover with subtle elevation.

> **REQ-2.4** Clicking a card stores the selected location in `LocationService.selectedLocationId` and advances the user to the Login screen.

> **REQ-2.5** Selected location persists in `localStorage` under key `medinous_location` for the active session only. The `LocationService.initialize()` method does NOT auto-restore from localStorage so patients always re-enter through the landing page each session.

> **REQ-2.6** Back arrow button returns to the landing page without selecting a location.

---

## US 3. As a patient, I need a clean login screen that matches the hospital's existing patient portal design, so I feel confident I'm authenticating with the correct system.

**REQ-3** After location selection, render the Login screen as a centered card on a neutral background.

> **REQ-3.1** Login card header shows the BSH logo with bilingual text Arabic ("مستشفى البحرين التخصصي") above English ("Bahrain Specialist Hospital") and the selected location name below the logo with a location pin icon.

> **REQ-3.2** Login form contains two input fields with prefix icons: "CPR No / Patient ID" (text input with person icon and search button suffix) and "Password" (password input with lock icon and visibility toggle suffix).

> **REQ-3.3** A "Forgot Password / Send OTP" link is shown below the password field, right-aligned, in teal color.

> **REQ-3.4** A "Terms & Conditions" checkbox is shown below the forgot password link. The checkbox label "Terms & Conditions" is rendered as a teal link.

> **REQ-3.5** "Sign In" button is teal, full-width, and disabled until: CPR is non-empty AND Password is non-empty AND Terms & Conditions checkbox is checked.

> **REQ-3.6** On Sign In click, validate credentials. For demo mode: CPR `12345678` and Password `123` succeed. After successful sign-in, navigate to `/dashboard`.

> **REQ-3.7** A horizontal divider separates the login form from the guest section.

> **REQ-3.8** "Login as a Guest" link is shown below the divider with a person-add icon and dashed teal border. Clicking it navigates to `/guest-booking` with the selected location preserved.

> **REQ-3.9** "Powered by medinous" attribution is displayed below the login card in light gray text.

> **REQ-3.10** Password visibility toggle button switches the password input type between `password` and `text` and updates the eye icon (visibility / visibility_off).

---

# Module 2: Engagement Dashboard

## US 4. As a patient, I need to see the ONE most important thing I need to do right now in a single banner at the top of the dashboard, so I'm not overwhelmed by data and can act in 2 seconds.

**REQ-4** Replace the static greeting with a Smart Context Banner that surfaces the highest-priority actionable item for the patient.

> **REQ-4.1** Banner is a single card at the top of the dashboard with a colored icon, title, subtitle, and one action button. Banner type and color depend on patient state.

> **REQ-4.2** Priority resolution order (highest to lowest):
> 1. **Appointment** (indigo) if the patient has an upcoming appointment, show "Appointment with Dr. [Name]", date/time as subtitle, and action button "Get Directions" (in-person) or "Join Call" (telehealth).
> 2. **Payment** (orange) if there is an urgent alert (e.g., elevated BP), show alert title and message with "View" action.
> 3. **Lab** (teal) if lab results are ready, show "Lab results are ready" with "View Results" action.
> 4. **Refill** (red) if a medication refill is due, show refill alert with "Request Refill" action.
> 5. **Clear** (green) if no urgent items, show "All clear, [FirstName]" with "My Records" action.

> **REQ-4.3** Action button uses a `routerLink` to navigate to the relevant module: `/appointments`, `/payments`, `/timeline`, `/medications`.

> **REQ-4.4** Only ONE banner is displayed at a time. The priority resolver is implemented as a `computed` signal in the dashboard component.

---

## US 5. As a patient, I need a horizontal row of quick-action chips below the banner, so I can navigate to common actions in one tap, GPay-style.

**REQ-5** Add an Action Chips Row immediately below the Smart Context Banner.

> **REQ-5.1** The row is horizontally scrollable, with thumb-reachable pill-shaped chips. Native scrollbar is hidden.

> **REQ-5.2** Display 6 chips in this exact order: Book Appt (event icon), Pay Bill (payment icon), Lab Results (science icon), Rx (medication icon), Records (folder_shared icon), Telehealth (videocam icon).

> **REQ-5.3** Each chip displays the icon vertically stacked above the label. Icons are 24px, labels are 11px, all in teal (#0d8a8a).

> **REQ-5.4** Each chip is wrapped in a `routerLink` directive that navigates to its corresponding feature module on click.

> **REQ-5.5** Chip cards use a white background with 1px border, rounded corners (14px). On hover, border turns teal and background turns light teal (#f0fafa).

---

## US 6. As a patient, I need a "Today" card that shows my daily medication schedule and next appointment with one-tap "Mark Done" buttons, so I can complete my daily check-ins without leaving the dashboard.

**REQ-6** Add a Today Card below the Action Chips Row.

> **REQ-6.1** Card header displays "Today" with a today-icon and the formatted date (e.g., "Wed, Apr 16"). Card has a teal left-border accent.

> **REQ-6.2** Each active medication is rendered as a row inside the card with: time-of-day label (Morning/Evening), pill icon, medication name + dosage, and a "Mark" button.

> **REQ-6.3** Clicking "Mark" toggles the button to "Done" with a green check icon. The medication ID is added to a local `medChecked` Set signal for the current session.

> **REQ-6.4** The next upcoming appointment (if any) is rendered as a row with: appointment time, event icon, doctor name + specialty, and a "View" button that routes to `/appointments`.

> **REQ-6.5** A streak counter displays at the bottom of the card: "5-day streak" with a fire icon, computed from the patient's most recent consecutive `taken[]` values across all medications.

> **REQ-6.6** Streak is calculated as the count of consecutive `true` values from the end of the `taken[]` array of the first medication, breaking on the first `false`.

---

## US 7. As a patient, I need to see only the top 3 most clinically relevant vitals with trend arrows, so I get health insight at a glance without scanning a wall of numbers.

**REQ-7** Display a Vitals Row showing only the top 3 vitals.

> **REQ-7.1** Vitals are filtered to display only: blood_pressure, glucose, heart_rate. The order is enforced via a priority array.

> **REQ-7.2** Each vital card shows: a colored icon badge (green=normal, orange=warning, red=critical), the vital label, the value, a trend arrow icon next to the value, and the unit.

> **REQ-7.3** Trend arrow icon is `trending_flat` for normal, `trending_up` for warning or critical. Arrow color matches the status.

> **REQ-7.4** Cards are displayed in a horizontally scrollable row with hidden scrollbar. On mobile, card minimum width reduces from 130px to 110px.

> **REQ-7.5** A trailing "All Vitals" card with dashed teal border and arrow icon links to `/timeline` for the full vitals history.

---

## US 8. As a patient, I need to see only my next single appointment on the dashboard (not a list), so I'm not overwhelmed by future visits.

**REQ-8** Display only the first upcoming appointment from `data.upcomingAppointments[0]`.

> **REQ-8.1** Appointment card shows: type icon (videocam for telehealth, local_hospital for in_person), doctor name, specialty, formatted date and time with schedule icon, and a type chip (Video / In-Person).

> **REQ-8.2** Card icon background and chip background colors vary by type: in_person uses indigo (#e8eaf6 / #3f51b5); telehealth uses teal (#e0f2f1 / #00897b).

> **REQ-8.3** If no upcoming appointment exists, the card is not rendered and the dashboard skips to the next section.

---

## US 9. As a patient, I need a "What's New" card that rotates through new content, so the dashboard feels fresh between visits.

**REQ-9** Add a What's New Card that rotates through pre-defined content items.

> **REQ-9.1** The card displays an icon, title, subtitle, and right-arrow icon. The card has a light indigo background (#f8f9ff).

> **REQ-9.2** Content rotates through 4 items: "Lab results ready" (science), "Flu vaccination available" (campaign), "Telehealth appointments" (videocam), "Health checkup package" (local_offer).

> **REQ-9.3** Clicking the card increments the `whatsNewIndex` signal. The displayed item cycles through the array using modulo.

> **REQ-9.4** On hover, the card shows subtle elevation. Cursor is a pointer.

---

## US 10. As a patient, I want to give quick 5-star feedback after a visit, so the hospital can improve without sending me a long survey.

**REQ-10** Add a CSAT Feedback Card that appears conditionally.

> **REQ-10.1** The card is rendered only if `feedbackDismissed` signal is false (default false).

> **REQ-10.2** Card shows a "rate_review" icon, the prompt "How was your last visit?", subtitle "Quick tap helps us improve", and 5 star buttons (1 to 5).

> **REQ-10.3** Clicking a star sets the `feedbackRating` signal to that value. Stars at or below the rating turn yellow (#ffc107). Other stars remain gray.

> **REQ-10.4** After a rating is submitted, a "Thanks for your feedback!" message with a green check icon appears below the stars.

> **REQ-10.5** After 2 seconds (setTimeout), the card auto-dismisses by setting `feedbackDismissed` to true.

> **REQ-10.6** A close (×) button in the top-right corner allows manual dismissal at any time.

---

# Module 3: Appointment Booking

## US 11. As a patient, I need to book an appointment in a clear 3-step wizard with the consultation fee visible upfront, so I don't abandon the booking due to hidden costs.

**REQ-11** Implement the appointment booking flow as a `MatStepper` with three linear steps: Choose Doctor, Pick Time, Confirm.

> **REQ-11.1** Step 1 (Choose Doctor) displays a specialty dropdown filter and a list of doctor cards.

> **REQ-11.2** Each doctor card shows: avatar placeholder (person icon), doctor name, specialty, and consultation fee in a green badge on the right.

> **REQ-11.3** Doctor cards display ONLY name, specialty, and fee. Star ratings, location/block labels, and "next available" dates are not shown.

> **REQ-11.4** Selecting a doctor sets `selectedDoctor` signal, triggers `loadSlots(doctor)`, and unlocks the "Continue" button.

> **REQ-11.5** Step 2 (Pick Time) displays a banner with the selected doctor's name, specialty, and fee in a green pill, with a "Change" button to return to Step 1.

> **REQ-11.6** Available time slots are rendered as a grid of buttons. Selected slot highlights in indigo with white text.

> **REQ-11.7** If no slots are available, an "event_busy" icon and message "No available slots for this date" is displayed.

---

## US 12. As a patient, I need three clear payment options at the confirmation step, so I can choose to pay now, pay later at the clinic, or use my insurance card.

**REQ-12** Step 3 (Confirm) renders the appointment summary, fee details, complaint input, insurance toggle, and three payment action buttons.

> **REQ-12.1** Appointment Summary card shows doctor name + specialty, full date, and time with respective icons (person, event, schedule).

> **REQ-12.2** Fee Details card (green-bordered) displays: Consultation Fee, Advance Fee, and Total Payable. Total is rendered in large green text.

> **REQ-12.3** A reason/complaints textarea allows the patient to enter symptoms (optional, multi-line).

> **REQ-12.4** Insurance Selection card displays a Self Pay / Use Insurance Card toggle.

> **REQ-12.5** When "Use Insurance Card" is selected, an active insurance policy is displayed: "ADNIC Insurance, Policy: POL-449921, Active" with a credit_card icon and green "Active" chip.

> **REQ-12.6** When Self Pay is selected, two action buttons are displayed stacked: "Book & Pay" (blue, primary) and "Book & Pay Later" (gray, outlined).

> **REQ-12.7** When Use Insurance is selected, a single "Book with Insurance" button is displayed (replacing both Self Pay buttons).

> **REQ-12.8** On clicking any booking button, set `paymentMode` signal to `pay_now`, `pay_later`, or `insurance` accordingly. Show a spinner inside the clicked button during the API call.

> **REQ-12.9** On successful booking, render the Success screen with: green check_circle icon, "Appointment Booked!" heading, dynamic subtitle reflecting payment mode, and a summary card with booking details and payment status chip.

> **REQ-12.10** Success subtitle text varies by mode:
> - `pay_now` "Payment of $X received successfully"
> - `pay_later` "Payment is pending. Please pay at the clinic before your consultation"
> - `insurance` "Booked with insurance. Your insurer will be billed directly"

> **REQ-12.11** A "Book Another" button on the success screen resets all signals (`currentStep`, `selectedDoctor`, `selectedSlot`, `visitReason`, `bookedAppointment`, `paymentMode`).

---

# Module 4: My Records (Unified Health Timeline + Documents)

## US 13. As a patient, I need a single screen for my entire medical history and documents, so I don't have to switch between separate timeline and documents pages.

**REQ-13** Merge the Health Timeline and Documents features into a single "My Records" feature route at `/timeline`. The Documents route is removed.

> **REQ-13.1** Sidebar navigation label is "My Records" with a `folder_shared` icon, replacing the previous "Health Timeline" and "Documents" entries.

> **REQ-13.2** Page header displays "Health Timeline" heading + "Your complete health history in one place" subtitle on the left, and an "Upload" button (cloud_upload icon, teal) on the right (desktop only).

> **REQ-13.3** On mobile, the header Upload button is hidden and a Floating Action Button (FAB) is rendered at the bottom-right corner.

> **REQ-13.4** Both Upload triggers open the same inline Upload Panel.

---

## US 14. As a patient, I need a always-visible search bar at the top of the records screen, so I can find any record by name or doctor in one tap (Swiggy-style).

**REQ-14** Add an always-visible Search Bar below the page header.

> **REQ-14.1** Search bar is a rounded pill-shaped container with a search icon prefix, an input field, and a clear button (×) that appears only when the query is non-empty.

> **REQ-14.2** Search filter matches case-insensitively against record `title` and `provider` fields.

> **REQ-14.3** Search input is bound to a `searchQuery` signal. The filtered events are recomputed via a `computed` signal.

---

## US 15. As a patient, I need horizontally scrollable time-period chips below the search bar, so I can filter records by recency without using a date picker.

**REQ-15** Display Time Period Chips as horizontally scrollable pills.

> **REQ-15.1** Chips are: Last 7 days, Last 30 days (default), 3 months, 6 months, 1 year, All time.

> **REQ-15.2** Chip values map to days: 7, 30, 90, 180, 365, 9999. The active chip uses indigo background; inactive chips use white with gray border.

> **REQ-15.3** When a period is selected, records older than the cutoff date are filtered out from the displayed list. Selecting "All time" disables the date filter.

---

## US 16. As a patient, I need horizontally scrollable category tabs, so I can filter by record type without a dropdown.

**REQ-16** Display Category Tabs below the time period chips.

> **REQ-16.1** Tabs are: All (default), Visits (appointment), Labs (lab_result), Rx (prescription), Radiology (imaging), Procedures (procedure), Reports (medical_report), Vaccines (vaccination).

> **REQ-16.2** Tabs are rendered as a `MatButtonToggleGroup`. Selecting a tab updates the `activeFilter` signal and refreshes the filtered records.

> **REQ-16.3** Below the tabs, a record count is displayed: "[N] records in last [period]" or just "[N] records" if All time is selected.

---

## US 17. As a patient, I need to see my records as 2-column color-banner cards, so they're visually scannable on desktop and stack to 1 column on mobile.

**REQ-17** Display records in a CSS Grid with `grid-template-columns: repeat(2, 1fr)` (mobile: 1fr).

> **REQ-17.1** Each record card has three sections: a top color-gradient banner (64px height) with a centered white icon, a card body, and a card actions bar.

> **REQ-17.2** Banner gradient color varies by record type:
> - appointment indigo gradient
> - lab_result teal gradient
> - prescription orange gradient
> - vaccination purple gradient
> - imaging blue gradient
> - procedure red-orange gradient
> - medical_report green gradient

> **REQ-17.3** Card body shows: record title (bold, 15px, truncated with ellipsis), a type chip, doctor name with person icon, and date with schedule icon.

> **REQ-17.4** No tag chips (CBC, blood, routine, etc.) are displayed on the cards.

> **REQ-17.5** Card actions bar displays three buttons separated by a top border: View (visibility icon, blue), Download (download icon, blue), Delete (delete icon, red).

> **REQ-17.6** Clicking Delete removes the record from the local `allEvents` signal and shows a snackbar with "Deleted" message and "Undo" action (4-second duration). Clicking Undo restores the record to its position.

---

## US 18. As a patient, I need to upload my own documents (lab reports, prescriptions, scans), so I can keep all my medical records in one place even if they came from external providers.

**REQ-18** Implement an inline Upload Panel that opens when the Upload button or FAB is clicked.

> **REQ-18.1** Upload panel is a card with a teal dashed border. Header shows "Upload Document" and a close (×) button.

> **REQ-18.2** A drop zone is shown with a cloud_upload icon, "Tap to select file" text, and "PDF, JPG, PNG (max 25 MB)" hint. Clicking the zone triggers the hidden file input.

> **REQ-18.3** When a file is selected, display a file preview row with a file icon, the file name, and a remove (×) button.

> **REQ-18.4** Document type dropdown (required) offers: Lab Report, Radiology, Prescription, Medical Report, Procedure Report, Other.

> **REQ-18.5** "Upload" submit button is disabled until both a file is selected AND a document type is chosen.

> **REQ-18.6** On submit, a new TimelineEvent is created with: `id: 'upload-' + Date.now()`, `type: <selected>`, `title: <filename without extension>`, `description: ''`, `date: <now ISO>`, `provider: 'Self-uploaded'`. The event is prepended to the `allEvents` signal.

> **REQ-18.7** A snackbar confirms "Document uploaded" with an "OK" action button (3-second duration).

> **REQ-18.8** After upload, the panel closes (`showUpload.set(false)`) and the input fields reset.

---

# Module 5: Medication Tracker

## US 19. As a patient, I need to see today's medication schedule with one-tap "Take" or "Skip" buttons, so I can log my doses without typing.

**REQ-19** Render the medication tracker with a Today's Schedule list.

> **REQ-19.1** Page header displays "Medication Tracker" title with a subtitle "Track your daily medications and adherence". An "Offline Mode" badge is shown when `navigator.onLine` is false.

> **REQ-19.2** Each active medication is rendered as a card with: pill icon, name, dosage, frequency, instructions (if any), prescribing doctor, and Take/Skip buttons.

> **REQ-19.3** When the medication is logged for today, the Take/Skip buttons are replaced with a "Taken" chip (green) or "Skipped" chip (orange).

> **REQ-19.4** Below each medication, a 7-day adherence visual is shown: 7 day-name labels (Mon-Sun) with colored indicators (green check for taken, red X for missed) and a progress bar showing the percentage.

> **REQ-19.5** If `refillsRemaining` is ≤ 2, a "Request Refill" button is shown with a warning chip "Low refills - X remaining".

---

## US 20. As a patient, I need my medication logs to work offline, so I can mark doses as taken even without internet, and they sync when I reconnect.

**REQ-20** Implement offline support using IndexedDB.

> **REQ-20.1** On `ngOnInit`, after fetching medications from the API, cache each medication into the `medications` IndexedDB object store via `OfflineStorageService.put('medications', med)`.

> **REQ-20.2** Listen to `window.online` and `window.offline` events. Update the `isOffline` signal accordingly. Show "Offline Mode" badge in the header when offline.

> **REQ-20.3** When the patient marks a medication as taken or skipped, write the log entry to the `medication_logs` IndexedDB store immediately.

> **REQ-20.4** If offline, also add the action to the `sync_queue` IndexedDB store via `OfflineStorageService.addToSyncQueue({ type, data })`.

> **REQ-20.5** When the device reconnects (online event), iterate the sync queue and replay pending actions to the API. On success, remove items from the queue.

---

## US 21. As a patient, I need a summary of my overall medication adherence, so I know how well I'm doing without computing it myself.

**REQ-21** Display a Summary Stats grid below the medication list.

> **REQ-21.1** Grid contains 4 stat cards in a 4-column layout (mobile: 2-column):
> - Active Medications count of medications in `medications` signal
> - Overall Adherence average percentage of `taken[]` arrays across all medications
> - Refills Needed count of medications with `refillsRemaining` ≤ 2
> - Taken Today count of medications marked as taken in `todayLogs`

> **REQ-21.2** Stats are recomputed via `computed` signals whenever `medications` or `todayLogs` change.

---

# Module 6: Payments & Wallet

## US 22. As a patient, I need a compact wallet-style "Advance Payment" button on the top-right of the Payments screen, so I can top up my advance balance without cluttering the page.

**REQ-22** Add a wallet-style Advance Payment control in the Payments header.

> **REQ-22.1** Header is a flex row with title/subtitle on the left and the Advance Payment button on the right.

> **REQ-22.2** When `showAdvanceForm` signal is false, render a single button: "Advance Payment" with `account_balance_wallet` icon, indigo background, white text.

> **REQ-22.3** When clicked, set `showAdvanceForm` to true and render an absolutely-positioned dropdown card (320px wide, top: 0, right: 0) overlaying the underlying content.

> **REQ-22.4** Dropdown card contains: header row ("Advance Payment" text + close X button), Amount input (number) with currency prefix, "Apply to" dropdown (General Advance OR a specific pending payment), and a "Pay [amount]" submit button.

> **REQ-22.5** Submit button is disabled if Amount is empty or ≤ 0. On submit, create a new Payment object with `status: 'completed'`, `method: 'card'`, dynamically generated invoice number, and prepend it to the `payments` signal.

> **REQ-22.6** After submit, close the dropdown, reset Amount to 0, and show a snackbar: "Advance payment of $X recorded".

---

## US 23. As a patient, I need search and time-period filters on the Payments screen identical to My Records, so my filtering experience is consistent across the app.

**REQ-23** Add a Search Bar and Time Period Pills above the status tabs in the Payments screen.

> **REQ-23.1** Search bar is rounded, with search icon, input bound to `searchQuery` signal, and a clear button when query is non-empty.

> **REQ-23.2** Search filters payments by case-insensitive match on `description` and `doctorName` fields.

> **REQ-23.3** Time period pills are: Last 7 days, Last 30 days (default), 3 months, 6 months, 1 year, All time. Active pill uses indigo background.

> **REQ-23.4** Selected period filters payments by `date >= cutoff` cutoff calculated as `new Date()` minus selected days.

> **REQ-23.5** A record count is displayed below the filter tabs: "[N] records in last [period]" or "[N] records" for All time.

---

## US 24. As a patient, I need to see all my pending charges (medications, labs, radiology, procedures, consultations) in one scrollable list under the Pending tab, so I can pay everything I owe in one place.

**REQ-24** Implement the Pending tab as a scrollable list of all outstanding charges grouped by category.

> **REQ-24.1** When `activeFilter` is `pending`, render a "Total Outstanding" bar at the top with the sum of all pending charges (orange background).

> **REQ-24.2** Below the bar, render a scrollable list of pending charges. Each item is a row with: a category-colored icon, the item name, a meta line (qty, doctor, date), and the amount.

> **REQ-24.3** Categories and icon colors:
> - medication purple (#7b1fa2) with `medication` icon
> - lab teal (#00897b) with `science` icon
> - radiology blue (#0277bd) with `image_search` icon
> - procedure red-orange (#e64a19) with `monitor_heart` icon
> - consultation orange (#f57c00) with `person` icon

> **REQ-24.4** A "Pay All ($X)" button is rendered at the bottom of the list with the total amount.

> **REQ-24.5** Hardcoded mock pending charges include: Metformin 500mg, Amlodipine 5mg, Vitamin D3, CBC, HbA1c, Lipid Panel, Thyroid Function Test, Chest X-Ray, Ultrasound Abdomen, ECG, Consultation follow-up.

---

## US 25. As a patient, I need to download a receipt for any completed payment, so I have proof for insurance reimbursement or my own records.

**REQ-25** Add a Receipt action button on completed payment cards.

> **REQ-25.1** A "Receipt" button (with receipt icon) is rendered only on cards where `payment.status === 'completed'`.

> **REQ-25.2** On click, set `generatingReceipt` signal to the payment ID and show a spinner inside the button.

> **REQ-25.3** Call `api.generateReceipt(paymentId)`. On success, show a snackbar "Receipt downloaded successfully". On error, show a snackbar "Failed to generate receipt. Please try again." with red panel class.

> **REQ-25.4** After completion (success or error), reset `generatingReceipt` to null.

---

# Module 7: Guest Booking

## US 26. As an unregistered patient, I need to book an appointment without creating an account, so I can get medical care without registration friction.

**REQ-26** Implement the Guest Booking flow as a 4-step `MatStepper` accessible at `/guest-booking`.

> **REQ-26.1** Guest Booking is accessed only via the "Login as a Guest" link on the Login screen. There is no entry from the authenticated sidebar navigation.

> **REQ-26.2** Step 1 (Select Location) displays a card grid of clinic locations with name, address, phone, hours, and specialties. Selecting a card sets `selectedLocation`.

> **REQ-26.3** Step 2 (Guest Details) shows a form with required fields (First Name, Last Name, Phone, Email) and optional fields (ID Type CPR/Passport/Driving License, ID Number).

> **REQ-26.4** Step 3 (Choose Doctor & Time) displays a specialty dropdown, doctor cards (showing only name + specialty, no rating), and time slot grid.

> **REQ-26.5** Step 4 (Confirm) shows a summary card with location, guest name, doctor, date/time and a reason textarea.

> **REQ-26.6** On confirmation, call `api.bookGuestAppointment(guest, slot, reason)` which returns a `GuestBookingResult` with the appointment, a temporary patient ID, and a registration token.

> **REQ-26.7** Success screen displays: green check icon, "Appointment Booked!" heading, the temporary patient ID, appointment details, and two buttons "Create Account" (uses the registration token) and "Book Another" (resets the flow).

---

# Module 8: Cross-Cutting Features

## US 27. As a patient in Bahrain or UAE, I need to use the portal in Arabic with right-to-left layout, so I can navigate in my native language.

**REQ-27** Implement multi-language support with English and Arabic in regions where languages includes 'ar'.

> **REQ-27.1** A language toggle button (`translate` icon) is shown in the toolbar only when `geo.config().languages.length > 1`.

> **REQ-27.2** Clicking the toggle switches `i18n.lang()` between 'en' and 'ar'. The selection is persisted in localStorage under `medinous_lang`.

> **REQ-27.3** When Arabic is active: `document.documentElement.dir` is set to `rtl`, `document.documentElement.lang` to `ar`, and a `.rtl` class is added to the shell container.

> **REQ-27.4** All UI labels are sourced from translation keys via the `| translate` pipe. The translation dictionary contains 200+ keys covering nav, dashboard, appointments, medications, payments, documents, guest booking, location, and common labels.

> **REQ-27.5** Sidebar border swaps from `border-right` to `border-left` when RTL is active, ensuring correct visual alignment.

---

## US 28. As a hospital group with branches in multiple geographies, I need the portal to adapt its currency, units, date format, and feature flags per region, so one codebase serves all my markets.

**REQ-28** Implement the Geography service with per-region configuration.

> **REQ-28.1** Five regions are configured: US, IN (India), AE (UAE), GB (UK), BH (Bahrain).

> **REQ-28.2** Each region defines: locale, currency, dateFormat, timeFormat (12h/24h), timezone, units (temperature/weight/height), feature flags (telehealth, insuranceBilling, prescriptionRefill, labOrdering, guestBooking, documentUpload, payments), and supported languages.

> **REQ-28.3** Geography is selected via a dropdown in the toolbar. Selection is persisted in localStorage under `medinous_geo`.

> **REQ-28.4** Currency and number formatting throughout the app uses `Intl.NumberFormat(geo.config().locale, { style: 'currency', currency: geo.config().currency })`.

> **REQ-28.5** Default geography is BH (Bahrain) with USD currency for the BSH POC.

---

## US 29. As a patient on a slow network, I need to see content structure immediately on every screen, so I never wait on a blank white page.

**REQ-29** Implement progressive loading with skeleton shimmer animations.

> **REQ-29.1** Two skeleton components exist:
> - `SkeletonLoaderComponent` (configurable line count, height, widths)
> - `SkeletonCardComponent` (with optional avatar and configurable lines)

> **REQ-29.2** Each feature component renders skeleton placeholders while `loading` signal is true. Skeletons match the structure of the real content (cards, rows, columns).

> **REQ-29.3** Mock API endpoints simulate realistic network delays (200ms-1000ms) using RxJS `delay()` operator. This ensures the skeleton experience is visible during demo.

> **REQ-29.4** Once data is fetched, `loading` is set to false and the actual content replaces the skeletons via Angular control flow blocks (`@if (loading()) ... @else ...`).

---

# Gherkins

## Module 1: Hospital Landing & Authentication

1. **Scenario: Patient sees the hospital landing page on first visit**

    Given the patient navigates to the portal URL
    When the page loads
    Then the hospital landing page is displayed with branding, navbar, hero section, specialties, doctors, and contact information

2. **Scenario: Patient clicks Patient Portal CTA to begin authentication**

    Given the patient is on the landing page
    When the patient clicks the "Patient Portal" button in the navbar or hero section
    Then the Location Picker overlay is displayed

3. **Scenario: Patient selects a clinic location**

    Given the Location Picker is displayed with multiple clinic options
    When the patient clicks a location card
    Then the location is stored as the selected branch and the Login screen is rendered

4. **Scenario: Patient signs in with valid credentials**

    Given the patient is on the Login screen with a location selected
    When the patient enters CPR ID, password, accepts Terms & Conditions, and clicks Sign In
    Then the patient is authenticated and routed to the Dashboard

5. **Scenario: Patient chooses to book as a guest**

    Given the patient is on the Login screen
    When the patient clicks the "Login as a Guest" link
    Then the patient is routed to the Guest Booking flow with the selected location preserved

## Module 2: Engagement Dashboard

6. **Scenario: Dashboard displays the most urgent action in the Smart Context Banner**

    Given the patient has an upcoming appointment within 24 hours
    When the Dashboard loads
    Then the Smart Context Banner displays the appointment with a "Get Directions" or "Join Call" action button

7. **Scenario: Patient marks a medication as Done from the Today Card**

    Given the patient sees today's medications listed in the Today Card
    When the patient clicks "Mark" on a medication row
    Then the button updates to "Done" with a green check and the medication ID is added to the local checked set

8. **Scenario: Patient sees only the top 3 vitals with trend arrows**

    Given the patient's recent vitals data is loaded
    When the Dashboard renders the Vitals Row
    Then only Blood Pressure, Glucose, and Heart Rate cards are displayed with trend arrows colored by status

9. **Scenario: Patient cycles through What's New content**

    Given the What's New card displays a content item
    When the patient clicks the card
    Then the next item in the rotation is displayed without page reload

10. **Scenario: Patient submits CSAT feedback**

    Given the CSAT card is visible on the Dashboard
    When the patient clicks a star rating
    Then the rating is recorded, a "Thanks for your feedback!" message appears, and the card auto-dismisses after 2 seconds

## Module 3: Appointment Booking

11. **Scenario: Patient books an appointment with full fee transparency**

    Given the patient is on the Choose Doctor step
    When the patient views the doctor cards
    Then each card displays the consultation fee in a green badge before selection

12. **Scenario: Patient confirms booking with self-pay**

    Given the patient is on the Confirm step with Self Pay selected
    When the patient clicks "Book & Pay"
    Then the appointment is created and the Success screen displays "Payment received successfully"

13. **Scenario: Patient confirms booking with insurance**

    Given the patient is on the Confirm step
    When the patient toggles "Use Insurance Card" and clicks "Book with Insurance"
    Then the appointment is booked, the active insurance policy is attached, and the success screen displays "Booked with insurance"

14. **Scenario: Patient defers payment to clinic**

    Given the patient is on the Confirm step with Self Pay selected
    When the patient clicks "Book & Pay Later"
    Then the appointment is booked with payment status "Pay at Clinic" displayed in orange on the success screen

## Module 4: My Records

15. **Scenario: Patient searches for a record by name**

    Given the patient is on the My Records screen with multiple records
    When the patient types a query in the search bar
    Then only records whose title or provider matches the query are displayed

16. **Scenario: Patient filters by time period**

    Given the patient is on the My Records screen
    When the patient clicks a time period pill (e.g., 3 months)
    Then only records dated within the last 3 months are displayed

17. **Scenario: Patient uploads a document**

    Given the patient clicks the Upload button or FAB
    When the patient selects a file, chooses a document type, and clicks "Upload"
    Then a new record is added to the top of the records list and a success snackbar is shown

18. **Scenario: Patient deletes a record with undo**

    Given the patient clicks Delete on a record card
    When the snackbar appears with "Undo" action
    Then clicking Undo within 4 seconds restores the record to its position

## Module 5: Medication Tracker

19. **Scenario: Patient marks a medication as taken**

    Given the patient is on the Medication Tracker screen
    When the patient clicks "Take" on a medication card
    Then the button is replaced by a "Taken" green chip and the log is written to IndexedDB

20. **Scenario: Patient logs medication while offline**

    Given the device is offline
    When the patient marks a medication as taken
    Then the action is stored in the IndexedDB sync queue and the "Offline Mode" badge is visible in the header

21. **Scenario: Patient sees a low-refill warning**

    Given a medication has 2 or fewer refills remaining
    When the medication card is rendered
    Then a "Request Refill" button is displayed with a warning chip showing the refill count

## Module 6: Payments & Wallet

22. **Scenario: Patient makes an advance payment**

    Given the patient clicks the Advance Payment button on the top-right
    When the patient enters an amount and clicks "Pay"
    Then a new completed payment is added to the transaction list and a confirmation snackbar is shown

23. **Scenario: Patient views all pending charges in one list**

    Given the patient clicks the Pending tab
    When the tab content renders
    Then all outstanding charges (medications, labs, radiology, procedures, consultations) are displayed in a scrollable list with a Total Outstanding bar and Pay All button

24. **Scenario: Patient downloads a receipt**

    Given a payment with status "completed" is shown
    When the patient clicks the "Receipt" button
    Then the receipt is generated and a confirmation snackbar is displayed

## Module 7: Guest Booking

25. **Scenario: Guest patient completes a booking without an account**

    Given the patient clicked "Login as a Guest" from the Login screen
    When the patient completes the 4-step flow (Location, Details, Doctor & Time, Confirm)
    Then a guest appointment is created and the success screen displays a temporary patient ID with options to Create Account or Book Another

## Module 8: Cross-Cutting Features

26. **Scenario: Patient switches the portal to Arabic**

    Given the patient is on the dashboard with the language toggle visible (region supports Arabic)
    When the patient clicks the language toggle
    Then the entire UI translates to Arabic and the layout switches to right-to-left

27. **Scenario: Patient on a slow network sees skeleton loading**

    Given the patient navigates to a feature screen
    When the data is being fetched from the API
    Then skeleton shimmer placeholders are displayed in place of the actual content until the data arrives

28. **Scenario: Hospital admin switches to a different geography**

    Given the patient is on any authenticated screen
    When the geography dropdown selection changes from BH to AE
    Then the currency, date format, and feature flags update to match the new region's configuration

---

*Document generated from the Patient Portal V2 working codebase. All features described are implemented and functional in the POC.*

**Author:** Puja Behera · TPM, Medinous
