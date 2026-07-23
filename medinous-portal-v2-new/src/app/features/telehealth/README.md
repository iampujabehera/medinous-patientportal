# Telehealth Module — Medinous Patient Portal

A patient-facing **Telehealth MVP** built inside the existing Medinous Patient Portal.
It is the digital extension of the hospital for remote care: video consultations,
selected home-care services, and home laboratory sample collection — all connected
back to the patient's hospital record.

> **Stack note.** The product brief's "React / Tailwind / Lucide" line is a generic
> scaffold. This portal is **Angular 19** (standalone components, signals, OnPush,
> Angular Material, Material Symbols icons). To live *inside* the existing portal,
> the Telehealth module is built on the same stack and reuses the portal's
> `FamilyService`, `I18nService` (EN/AR + RTL), design tokens and deep-links to
> Records / Medications / Payments. No new UI framework was introduced.

---

## 1. How to run

```bash
cd medinous-portal-v2-new
npm install
npm start            # ng serve → http://localhost:4200
```

**Enter the feature:** log in (Patient ID `12345678`, password `123`, tick Terms),
then tap the **Telehealth** Quick Action on the dashboard. Direct URL: `/telehealth`.

Build check:

```bash
npm run build        # ng build — passes strictTemplates
```

No backend is required. All data is client-side mock; active bookings persist to
`localStorage`. A **"Reset demo data"** button at the bottom of the Telehealth home
restores the seeded starting state.

---

## 2. Demo storyline (Aisha / the seeded patient)

1. Open **Telehealth** — the home shows an **upcoming General Medicine video
   consultation** (today, 4:00 PM) and a **doctor-recommended HbA1c** card.
2. Tap the video consult → **Prepare** (tick the checklist + device check) → **Join**.
3. In the simulated call, tap **End** → the doctor's **outcome** appears with a
   summary, prescription, **ordered tests (HbA1c + Fasting Glucose)** and a
   **2-week follow-up** — each as a one-tap action.
4. Tap **Book recommended tests at home** → the tests are already in the cart →
   review fasting instructions → pick address → pick a collection window → pay.
5. Open **Track collection** and use **Advance to next stage** to walk the timeline:
   phlebotomist assigned → on the way → sample collected → report ready.
6. When the report is ready, deep-link into **My Records**; the home screen then
   surfaces **"Book the recommended follow-up."**

This demonstrates the Medinous chain: **consultation → recommendation → home test →
report → follow-up**, without the patient ever searching for the service again.

### Exception states to demo
- **Payment failed** — in the instant-consult review, pick *"Declined test card"*.
- **Doctor delayed** — appears in the instant-consult waiting room (alert-me / callback).
- **Provider late** — tracking screen, *"Preview: provider running late"*.
- **No slots** — slot picker, *"Preview: busy day"*.
- **Service not in area** — address picker, choose the *"Farm House"* address.
- **Emergency** — Help screen leads with emergency guidance; Telehealth is never
  positioned as emergency care.

---

## 3. Information architecture (routes)

```
/telehealth                       Telehealth home (§5, §17)
/telehealth/active-care           Active Care — Upcoming / In progress / Completed / Cancelled (§10)
/telehealth/consult               Consult online — options (§6)
/telehealth/consult/instant       Instant "available doctor" wizard: specialty→language→concern→pay→assign→wait (§6.B)
/telehealth/consult/room/:id      Simulated video call (§6 step 7)
/telehealth/consult/outcome/:id   Consultation outcome + continuity actions (§6 step 8, §14)
/telehealth/home-care             Care at home — catalogue + booking flow (§7, §8)
/telehealth/lab-tests             Home lab — discovery + cart + booking (§9)
/telehealth/prepare/:id           Service preparation checklist (§11)
/telehealth/track/:id             Service tracking timeline (§12)
/telehealth/help                  Help, FAQs, exceptions, emergency (§13)
```

Deep-links out to existing modules (never rebuilt here): **Records** (`/timeline`),
**Medications** (`/medications`), **Payments** (`/payments`), **Book Appointment**
(`/appointments?mode=video` for scheduled video consults).

## 4. File map

| File | Responsibility |
|------|----------------|
| `telehealth.model.ts` | All domain types (care items, catalogues, providers, outcomes, recommendations) |
| `telehealth.service.ts` | Mock catalogues, per-patient care store (localStorage), recommendations, pricing, status simulation, demo seed |
| `telehealth.styles.ts` | Shared design-token styles (`TELE_STYLES`) spread into every screen |
| `care-status.util.ts` | Status → chip + primary-action mappings (single source of truth) |
| `th-header.component.ts` | Back / title / help + "Care for:" family selector |
| `address-picker.component.ts`, `slot-picker.component.ts` | Reusable booking sub-flows (home-care + lab) |
| `telehealth-home` / `active-care` / `consult-online` / `instant-consult` / `video-room` / `consult-outcome` / `home-care` / `lab-tests` / `preparation` / `service-tracking` / `help` | The screens |

---

## 5. Product assumptions

- **Active patient context.** Reuses the portal's family grouping. Care items are
  scoped to the selected member. The seeded demo data is attached to the primary
  patient id (`12345678`); the "Care for" pill shows whichever family member is
  active. (The seed labels read "Aisha Rahman" per the brief; the portal's own
  family fixture names the primary member differently — a cosmetic prototype
  mismatch, not a data-model issue.)
- **Currency** is **AED** throughout (Middle East positioning). SAR/BHD and full
  Arabic strings are production items; the portal already supports EN/AR + RTL and
  a currency service that this module would adopt.
- **"Available doctor" matching, doctor assignment, ETAs and status transitions**
  are simulated on timers / a manual "advance" control. Doctor and provider
  identities are mock but always render as hospital-verified.
- **Payments** are simulated (success + a deliberate failure path). Real charges,
  receipts and refunds belong to the existing Payments module.
- **The video call records nothing.** Controls are visual only.
- **Symptom → specialty suggestion** is a keyword hint, explicitly labelled *"a
  suggestion, not a medical diagnosis."* No AI diagnosis is performed (out of scope
  per §24).
- **Clinical safety boundaries** (§24) are respected: no ICU-at-home, dialysis,
  ambulance, critical care, long-term packages, remote-device dashboards or
  medication reminders.

## 6. Production integration requirements

To move this MVP to production, the mock layer in `telehealth.service.ts` would be
replaced by real HMS/HIS integrations:

1. **Teleconsultation** — real-time doctor availability + queue, a video SDK
   (Twilio/Agora/WebRTC gateway) with consented recording per hospital policy, and
   waiting-room/late-doctor signalling.
2. **Home-care & phlebotomy operations** — provider rostering, geo-dispatch, live
   ETA, arrival windows and status webhooks feeding the tracking timeline.
3. **Orders & results** — doctor-ordered tests and prescriptions written to the HMS
   order set; lab results and visit documentation returned to the patient record so
   Records/Medications reflect them automatically.
4. **Payments** — replace the simulated flow with the hospital Payments/PG
   integration (pay-now, pay-at-service, insurance eligibility, receipts).
5. **Recommendations engine** — the "continuity" cards should read from real HMS
   care-plan / follow-up / order data rather than the seeded + outcome-derived mocks.
6. **Identity & consent** — provider verification badges, guardian/consent rules
   for minors, and audit logging.
7. **Service-area & scheduling** — real coverage polygons for the address check and
   a slot-availability service for home windows.
8. **i18n & currency** — complete Arabic translation keys and tenant currency/branch
   configuration via the existing `I18nService` / geography config.

---

## 7. Success criteria coverage (§25)

A patient can, entirely within the prototype: understand Telehealth at a glance,
start a consult or home service with minimal entry, prepare, track, know what's
next, move from a doctor recommendation straight to a booking, and reach results /
prescriptions through the existing portal modules — without calling the hospital.
