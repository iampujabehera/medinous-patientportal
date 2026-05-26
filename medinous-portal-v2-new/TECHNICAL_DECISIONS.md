# Medinous Patient Portal — Technical Decisions

> **Purpose.** A single doc that captures every technical decision in the POC, the PM rationale, and how to defend it in a stakeholder review (BSH, Naren, Murali, hospital CIOs).
>
> **Status labels:**
> - **Shipped** — already in the POC repo, demoable today.
> - **Mocked** — wired in the UI, backed by mock data; backend integration deferred.
> - **Planned** — design decided, build deferred to post-POC.

Author: Puja Behera · TPM, Medinous

---

## 1. Stack Summary (one-line view)

| Layer | Choice | Status |
|---|---|---|
| Frontend framework | Angular 19 (standalone components, signals, OnPush) | Shipped |
| UI kit | Angular Material 19 + custom SCSS | Shipped |
| State / reactivity | Angular Signals + RxJS 7 | Shipped |
| HTTP client | Angular HttpClient (`@angular/common/http`) | Shipped (toggled to mocks) |
| Offline storage | IndexedDB (native, version 2) | Shipped |
| i18n / RTL | Custom `i18n.service` + `translate` pipe, Arabic RTL scaffolded | Shipped |
| Mock data layer | In-repo `mock-data.ts` + per-patient slicing in `api.service` | Shipped |
| Auth | CPR + password (mocked) | Mocked |
| Backend | None yet — designed to plug into existing Medinous HMS REST APIs | Planned |
| Hosting | Vercel (static SPA) — see [vercel.json](medinous-portal-v2-new/vercel.json) | Shipped |
| Build | Angular CLI 19, TypeScript 5.7 | Shipped |
| Test runner | Karma + Jasmine | Shipped (sparse coverage — POC) |
| Database | N/A in POC. Production: rides Medinous HMS DB | Planned |

---

## 2. Frontend Framework — Angular 19

**Decision:** Angular 19 with **standalone components**, **signals**, and **OnPush change detection**.

**Why (PM rationale):**
- The Medinous HMS frontend is already on Angular — same team can maintain the portal without a new skill set.
- Angular 19's signals + standalone components remove most of the boilerplate that made earlier Angular versions painful — modern DX without changing platform.
- Strong typing (TypeScript 5.7) reduces clinical-data bugs.

**Justification in the room:**
- "Zero new tech debt for the Medinous engineering team. Same language, same framework, same tooling."
- Reduces hiring/training risk vs. introducing React or Vue alongside the existing stack.

---

## 3. UI Kit — Angular Material + Custom SCSS

**Decision:** Angular Material 19 components for primitives (dialogs, form fields, snackbars, tabs), custom SCSS for everything brand-visible (cards, banners, gradients, page chrome).

**Why:**
- Material gives accessibility, keyboard nav, and screen-reader behavior for free — non-negotiable for a healthcare app.
- Custom SCSS for visual identity so the portal feels hospital-branded, not "Google-themed."

**Justification:**
- A11y is table-stakes in healthcare procurement reviews. Material covers WCAG AA on its components by default.
- White-labeling per hospital is cheap because brand surface = SCSS variables, not framework theming.

---

## 4. State Management — Signals + RxJS

**Decision:** Use **Angular Signals** as the default reactive primitive; use **RxJS** only where streams genuinely exist (HTTP, debounced search).

**Why:**
- Signals are simpler, sync-friendly, and don't leak subscriptions — fewer footguns for the team.
- RxJS still wins for HTTP + cancellable streams; mixing is intentional, not accidental.

**Justification:**
- Lower bug surface — most "stale data on screen" issues in the old portal came from RxJS subscription mistakes.
- Aligned with where Angular itself is moving as of v19.

---

## 5. Architecture — Standalone Components + Lazy-Loaded Feature Modules

**Decision:** Every feature (`appointments`, `consultations`, `dashboard`, `documents`, `guest-booking`, `medications`, `payments`, `profile`, `select-patient`, `timeline`) is a **lazy-loaded route** with **standalone components**.

**Why:**
- First paint of the dashboard doesn't pay for features the user hasn't navigated to yet.
- Per-feature ownership becomes natural — one engineer can own `payments/` end-to-end.

**Justification:**
- Performance budget: dashboard interactive < 2s on mid-range Android over 4G. Lazy loading is the single biggest lever.
- Onboarding new engineers gets easier — they touch one feature folder at a time.

---

## 6. API Layer — HttpClient with a `useMocks` Toggle

**Decision:** All data flows through one `ApiService` ([api.service.ts](medinous-portal-v2-new/src/app/core/services/api.service.ts)). Today `useMocks = true`; flip to `false` to hit real HMS endpoints. `baseUrl` is geography-aware (driven by `GeographyService`).

**Endpoints designed (matches what the UI calls):**

| Endpoint | Method | Purpose |
|---|---|---|
| `/dashboard` | GET | Dashboard summary (upcoming appt, alerts) |
| `/consultations` | GET | List of consultations |
| `/consultations/{id}` | GET | Consultation detail |
| `/timeline` | GET | Unified health timeline |
| `/doctors` | GET | Doctor directory (filterable by specialty/location) |
| `/specialties` | GET | Specialty list |
| `/slots` | GET | Bookable slots for a doctor |
| `/appointments` | POST | Book an appointment |
| `/medications` | GET | Active + past medications |
| `/payments` | GET | Payment history + pending charges |
| `/payments/{id}` | GET | Payment detail |
| `/payments/{id}/receipt` | POST | Generate receipt PDF |
| `/payments/{id}/claim` | GET | Insurance claim doc |
| `/documents` | GET / POST / DELETE | Patient documents |
| `/guest/appointments` | POST | Guest booking (no auth) |
| `/locations/{locationId}/doctors` | GET | Doctors at a specific branch |

**Why:**
- A single, mockable API surface lets us ship a UX-complete POC without waiting on the HMS team.
- The endpoint contract is documented *by the UI* — when HMS integrates, the contract is already discovered, not invented.

**Justification:**
- BSH demo doesn't get blocked on backend availability.
- When real backend lands, switching `useMocks` to `false` is the entire integration on the UI side.

---

## 7. Authentication — CPR + Password (Mocked)

**Decision:** Login takes **CPR (Patient ID) + password + T&C acceptance**. Currently mocked (demo creds: `12345678` / `123`).

**Why CPR over email:**
- CPR is universal in Bahrain — every patient already has it.
- Email coverage in the GCC patient base is patchy and inconsistently captured.

**Why mocked today:**
- We don't own the HMS auth integration in the POC scope. The real flow will federate via the hospital's existing identity (HMS user store or hospital SSO).

**Justification:**
- Matches the **real BSH portal** authentication shape, so the demo is recognizable to a BSH evaluator.
- CPR also doubles as the integration key into the HMS — same ID across portal and clinical system.

---

## 8. Multi-Patient (Family) Linking — `FamilyService` + Per-Patient Slicing

**Decision:** One CPR-holder can have multiple linked patients (spouse, child, parent). The `select-patient` screen shows them; `ApiService` slices mock data per patient ID so each profile feels distinct on the demo.

**Why:**
- GCC family healthcare reality: one adult often manages a household's appointments, payments, and meds.
- Forcing separate accounts kills adoption — the parent who books for everyone simply won't.

**Justification:**
- Direct mirror of Sehhaty (KSA) and DHA dependents — a model GCC patients already understand.
- Demo evidence: 4 sliced profiles (Priya, Rohan, Aarav, Meera) showing adult / pediatric / geriatric variations — proves the model holds across personas.

---

## 9. Multi-Geography / Multi-Tenancy — `GeographyService`

**Decision:** The portal supports multiple geographies (Bahrain default, plus UAE, KSA, India, UK, US scaffolded). Geography drives:
- Currency (USD default in POC; per-region in production)
- API base URL
- Default phone code, ID format, language
- Locale-specific copy via `i18n.service`

**Why:**
- Medinous's market is GCC + Africa. A portal that's hard-coded to one country can't be sold to the next hospital.
- Multi-location pricing is a deal-value lever — hospital groups pay per branch/region.

**Justification:**
- Sales: same codebase deploys to BSH (Bahrain), an Apollo-equivalent in KSA, or a Nairobi group. Lower TCO, faster time-to-deploy.
- Engineering: zero forking per customer — geography is configuration, not code.

---

## 10. Internationalization — EN + Arabic (RTL-Ready)

**Decision:** Custom `i18n.service` + `translate` pipe. Arabic strings + RTL layout scaffolding are in place; today's POC ships EN.

**Why custom over `@angular/localize`:**
- We need runtime language switching (user toggles AR/EN in the app), not a per-build locale flip.
- `@angular/localize` is build-time; that's wrong for a B2B SaaS where one binary serves many tenants.

**Justification:**
- Bahrain is bilingual. Shipping EN-only signals "not built for us" to a BSH evaluator.
- RTL-ready *now* is cheap; retrofitting RTL later is a quarter of work.

---

## 11. Offline Storage — IndexedDB

**Decision:** `OfflineStorageService` ([offline-storage.service.ts](medinous-portal-v2-new/src/app/core/services/offline-storage.service.ts)) uses **IndexedDB** (db name `medinous_portal`, version 2) with object stores:
- `medications` — active meds, available offline
- `medication_logs` — patient-logged doses
- `sync_queue` — actions queued when offline, synced when back online
- `payments_cache` — recent payments for offline view
- `documents_cache` — recent docs for offline view

**Why IndexedDB over localStorage:**
- Larger quota (hundreds of MB), structured storage, indexed queries.
- localStorage is sync + small + flat — wrong tool for clinical data.

**Why offline at all:**
- Medication adherence is the use case with the highest cost-of-failure when connectivity drops (rural Saudi, Bahrain village clinics, KSA pilgrim season).

**Justification:**
- One of the few features that's *meaningfully better* than the incumbent portals. Sales-pitch line: "works when the network doesn't."

---

## 12. Performance — OnPush + Lazy Loading + Signals

**Decision:** All components default to `ChangeDetectionStrategy.OnPush`. All feature routes are lazy-loaded. State is in signals (re-render only what changed).

**Why:**
- Angular's default change detection is the #1 source of perf complaints. OnPush + signals removes 90% of accidental re-renders.

**Justification:**
- Hard target: dashboard interactive in **< 2s on mid-range Android over 4G**.
- Industry benchmark (Apollo 24/7, Practo, Sehhaty) — same neighborhood. Slower than that and patient drop-off becomes the headline.

---

## 13. Database / Sharding — Not in the POC, but here's the production posture

**Decision today:** The POC has **no database**. All data is in `mock-data.ts` and IndexedDB (client-side).

**Production posture (when this leaves POC):**
- **No new database.** The portal reads/writes via the Medinous HMS APIs and persists in the existing HMS database that the hospital already runs.
- **No sharding** in the classic sense — each hospital runs its **own HMS instance** (single-tenant deployment). Multi-tenancy is achieved at the **deployment level**, not the schema level.
- For very large groups, the HMS can be deployed with logical isolation per branch/location (location-scoped queries already exist — see `/locations/{locationId}/doctors`).

**Why no sharding:**
- Hospital data volumes are large but bounded — a single well-tuned RDBMS instance handles a hospital group comfortably. Sharding introduces operational complexity disproportionate to the scale.
- Hospitals also have **regulatory data-residency** requirements (KSA: data stays in KSA; Bahrain: PDPL). Single-tenant deployment per hospital satisfies this cleanly.

**Caching strategy (when wired):**
- Client-side: IndexedDB for offline-tolerant content (meds, recent docs, payments).
- Server-side: standard HMS-level caching; CDN for static assets.

**Justification in the room:**
- "We're not inventing a new datastore. The portal extends the HMS the hospital already trusts."
- This is the **single biggest reason a hospital CIO signs** — no data leaves their HMS perimeter.

---

## 14. Security & PHI Handling

| Decision | Why | Justification |
|---|---|---|
| **No PHI in URLs.** Patient IDs and clinical artefact IDs are passed in headers or POST bodies, not query strings. | URLs leak into browser history, screenshots, server logs, analytics. | PDPL Bahrain + KSA PDPL alignment. Standard healthcare hygiene. |
| **Session-bound state by default; no long-lived `remember me`.** | GCC devices are shared inside families — long-lived tokens = wrong family member seeing wrong records. | Privacy + family-device reality. Opt-in persistence can come later. |
| **Audit logging server-side on read of clinical artefact.** Planned in production. | Required to answer "who saw what, when." | Hospital governance + regulator audit readiness. |
| **Explicit `autocomplete` rules.** Login fields use the standard `autocomplete` values; search bars use `autocomplete="off"` so saved Patient IDs don't leak into search. | Caught during testing — saved CPR was appearing in unrelated search fields. | Small but the kind of detail a clinical buyer notices. |
| **HTTPS only.** Vercel-managed cert in POC; hospital-provided cert in production. | Non-negotiable. | Healthcare baseline. |
| **No third-party trackers, no marketing pixels.** | Tracker-laden portals fail privacy reviews instantly. | PDPL/HIPAA-spirit posture. |

---

## 15. Hosting & Build

| Decision | Why | Justification |
|---|---|---|
| **Vercel for POC hosting** | Zero-config deploys, instant share URLs for stakeholder demos. | Demo cadence > infra control during POC. |
| **Production: hospital's own infra (on-prem or hospital-managed cloud)** | Data residency. Hospital CIOs want the portal in the same network zone as the HMS. | KSA/Bahrain data residency. Aligns with how Medinous HMS is already deployed. |
| **Angular CLI build** — single static bundle (`ng build`) | No SSR needed for an authenticated portal; SSR would just add server cost without UX gain. | Lower hosting cost, simpler ops. |

---

## 16. Testing & Quality

**Decision:** Karma + Jasmine for unit tests (Angular default). Coverage today is sparse — POC priorities favored UX over test coverage.

**Honest stance:** This is a known gap. Pre-production, the plan is:
- Unit tests for `ApiService`, `GeographyService`, `FamilyService`, `OfflineStorageService` (the data-shaped logic).
- Component tests for booking flow, payment flow, login.
- E2E (Cypress or Playwright) for the three critical paths: login → dashboard, book appointment, pay.

**Justification in the room:**
- "POC optimised for clarity-of-vision; pre-production hardening is a named workstream, not an afterthought."
- Naming the gap up front is more credible than claiming coverage we don't have.

---

## 17. Decisions deliberately *not* made (and why)

| Not done | Why it's deferred |
|---|---|
| **No native iOS/Android app.** | >80% GCC patient portal usage is mobile web. Native = store approvals, two codebases, install barrier. Revisit only after web stickiness is proven. |
| **No backend in POC.** | Backend is the Medinous HMS, which already exists. Inventing a parallel backend would create exactly the data-silo problem hospitals are trying to solve. |
| **No analytics SDK (Mixpanel, Amplitude, etc.).** | Analytics events are named in code; instrumentation deferred until post-pilot so we don't leak PHI into a third-party tool by accident. |
| **No PWA install prompt yet.** | Wanted to validate web stickiness first. PWA install is a 1-day add-on once we have data. |
| **No push notifications.** | Same reason — depends on PWA + a notification backend. Phase 2. |
| **No dark mode.** | Patient confidence in healthcare apps is built by *calm and light*, not by darkness. Tested in design; no demand. |

---

## 18. How to defend this stack in a stakeholder review (cheat sheet)

**To Naren / Murali (engineering credibility):**
> "Same Angular stack the HMS team already runs. Signals + standalone components = modern DX without a framework change. Single API surface, mockable today, swappable to real HMS endpoints by flipping one flag."

**To BSH CIO (security + ops credibility):**
> "No new database. No data leaves your HMS. Single-tenant deployment per hospital satisfies PDPL. Auth federates with the hospital identity. Audit logging on every clinical artefact read."

**To BSH business sponsor (market credibility):**
> "Mobile-first, Arabic-ready, family-linked, guest-booking enabled. Looks like Sehhaty, behaves like Swiggy, respects the HMS you already run. Same codebase deploys to your next branch — no fork."

**To engineers handing this over:**
> "Lazy-loaded feature folders, OnPush by default, signals for state, RxJS for streams. One `ApiService`, one `useMocks` toggle, geography-aware base URL. IndexedDB for offline meds."

---

## 19. Open technical questions (be honest about these)

These are real and worth surfacing before a BSH technical deep-dive:

1. **HMS API contract** — endpoint shape is *designed by the UI today*. Confirmation needed from the HMS team that the contract is buildable as-is, or what shape it needs to take.
2. **Auth federation mechanism** — OAuth2 / SAML / proprietary HMS session? Decides login-flow build.
3. **NPHIES / insurance integration** — not in POC scope but BSH will ask; need a clear answer on phasing.
4. **Document storage** — does the HMS already store patient documents, or do we need an object store (S3-equivalent)?
5. **Notification channel** — SMS via local provider, WhatsApp Business, email, or in-app only? Channel choice drives cost model.
6. **Production audit log destination** — HMS audit table, SIEM, or both?

Naming these openly is a credibility move, not a weakness — every CIO has seen vendors who pretended these were solved when they weren't.
