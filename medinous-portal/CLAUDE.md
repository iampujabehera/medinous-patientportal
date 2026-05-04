# Medinous Patient Portal — CLAUDE.md

## Project Context
B2B SaaS patient portal for hospital groups. Currently a POC/MVP being demoed to sales teams and hospital clients. Primary target: Bahrain Specialist Hospital (BSH). Built to be white-labeled for any hospital group globally.

## Tech Stack
- Angular 19, standalone components, signals, OnPush change detection
- Angular Material + custom SCSS
- Lazy-loaded feature modules
- IndexedDB for offline storage
- Mock data layer (toggle `useMocks` in api.service.ts for real APIs)
- No backend yet — all data is client-side mocks

## Project Structure
```
src/app/
├── core/models/          # All interfaces (patient, payment, doctor, etc.)
├── core/services/        # API, geography, location, i18n, offline storage
├── shared/components/    # Shell (landing + login + app), skeleton loaders
├── shared/pipes/         # translate, relativeTime
├── features/
│   ├── dashboard/        # Main dashboard with vitals, alerts, CSAT
│   ├── appointments/     # Booking wizard with fee + insurance
│   ├── timeline/         # Unified health records (merged with documents)
│   ├── medications/      # Tracker with offline support
│   ├── payments/         # History, pending charges, advance payment
│   └── guest-booking/    # Unauthenticated booking flow
```

## User (Puja) — Working Style

### Decision Making
- Thinks from the **patient's perspective first**, hospital second
- Wants less information on screen, not more — "patients don't need to select much"
- Prefers features that are "self-sufficient" — minimal clicks, obvious actions
- Evaluates UI by comparing to real-world apps patients already use (Swiggy, Zomato, UPI/GPay)

### Design Preferences
- Mobile-first thinking even on desktop
- Card-based layouts over tables or lists
- Gradient color banners for visual categorization (like the health records cards)
- Inline actions (View/Download/Delete) visible on cards, not hidden in menus
- Search bars should be always-visible, Swiggy-style — not hidden behind a toggle
- Time period filters as horizontal pill chips, not date pickers
- Floating action buttons (FAB) for primary actions on mobile

### Communication Style
- Shows screenshots of competitor/reference apps to explain what they want
- Compares to the real BSH portal (patport.bahrainspecialisthospital.com) frequently
- Asks "why" questions to understand business justification, not just technical
- Expects concise business-value explanations for each feature
- Thinks in terms of sales pitch — "why will this give us money"

### Things to Avoid
- Don't clutter the UI — if something can be a dropdown/popover instead of a full card, do that
- Don't add features to the sidenav that should be accessed contextually (e.g., guest booking lives on login screen, not sidenav)
- Don't use timeline dots/connectors on mobile — wastes horizontal space
- Don't add tag chips (CBC, blood, routine) on record cards — too noisy
- Don't auto-restore location from localStorage — patients must select each session
- Don't show doctor ratings or block/location labels on doctor cards — keep it to name, specialty, fee

### Things They Like
- Hospital-branded landing page that looks like the real hospital website
- Login screen matching the real BSH patient portal (CPR + password + T&C + guest link)
- Fee transparency on appointment booking (consultation fee visible on doctor card)
- Book & Pay / Book & Pay Later / Use Insurance — three clear options
- Advance Payment as a compact wallet button, not a full card
- Pending charges showing ALL types (meds, labs, radiology, procedures) in one scrollable list
- Unified "My Records" instead of separate Timeline + Documents

## App Flow
1. BSH Hospital Website (landing page)
2. "Patient Portal" → Location Picker (name + address only)
3. Login Screen (CPR/Patient ID + Password + Terms + Guest link)
4. Dashboard (default screen after login)

## Demo Credentials
- Patient ID: `12345678`
- Password: `123`
- Check "Terms & Conditions" → Sign In

## Geography
- Default region: Bahrain (BH)
- Currency: USD ($)
- Supports: US, India, UAE, UK, Bahrain
- Arabic/RTL support built in

## Key Business Arguments
- Multi-location = higher deal value (pay per branch)
- Guest booking = captures walk-in revenue
- Fee transparency = reduces billing disputes
- Insurance at booking = reduces front-desk workload
- Offline medication tracking = works in poor connectivity areas
- One codebase for global deployment (multi-geography)
