import { Injectable, computed, signal } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  FamilyConfig,
  FamilyGroupResponse,
  FamilyMember,
  RelationshipType
} from '../models/family.model';

// =====================================================================
// HMS-SIDE CONFIG (mirror of /hms/config/family-grouping)
// =====================================================================
const HMS_FAMILY_CONFIG: FamilyConfig = {
  maxLinkedProfiles: 5,
  allowedRelationships: ['Self', 'Spouse', 'Child', 'Parent', 'Dependent'],
  guardianRequiredForMinors: true,
  disabledProfileVisibility: 'disable',
  confirmSwitchDuringWorkflow: true
};

// =====================================================================
// HMS-SIDE FAMILY GROUP (mocked) — keyed by the authenticated mobile
// =====================================================================
// All members below share the same verified mobile (+973 3322 4455)
// AND a valid HMS relationship mapping. The shared mobile alone is
// never enough — the relationship + portal access + consent must
// also be present.
// =====================================================================
const HMS_FAMILY_GROUPS: Record<string, FamilyGroupResponse> = {
  '+97333224455': {
    primaryMobile: '+97333224455',
    config: HMS_FAMILY_CONFIG,
    members: [
      {
        patientId: '12345678',
        firstName: 'Fatima',
        lastName: 'Sharma',
        fullName: 'Fatima Sharma',
        dateOfBirth: '1990-05-15',
        gender: 'Female',
        relationship: 'Self',
        isPrimaryOwner: true,
        primaryMobile: '+97333224455',
        portalAccessEnabled: true,
        consentStatus: 'not_required',
        isMinorOrDependent: false,
        status: 'active'
      },
      {
        patientId: '12345679',
        firstName: 'Salman',
        lastName: 'Sharma',
        fullName: 'Salman Sharma',
        dateOfBirth: '1988-11-02',
        gender: 'Male',
        relationship: 'Spouse',
        isPrimaryOwner: false,
        primaryMobile: '+97333224455',
        portalAccessEnabled: true,
        consentStatus: 'granted',
        isMinorOrDependent: false,
        status: 'active'
      },
      {
        patientId: '12345680',
        firstName: 'Aisha',
        lastName: 'Sharma',
        fullName: 'Aisha Sharma',
        dateOfBirth: '2017-08-21',
        gender: 'Female',
        relationship: 'Child',
        isPrimaryOwner: false,
        primaryMobile: '+97333224455',
        portalAccessEnabled: true,
        consentStatus: 'granted',
        isMinorOrDependent: true,
        guardianMemberId: '12345678',
        status: 'active'
      },
      // NOTE: seeded family is intentionally below the 5-profile cap so
      // the "Add family member" CTA stays visible in the picker for the
      // demo. To showcase the limit-reached state, raise this to 5 via
      // the existing add-family flow (or temporarily seed more here).
    ]
  }
};

const ACTIVE_PATIENT_KEY = 'medinous_active_patient_id';
const HIDDEN_PROFILES_KEY = 'medinous_hidden_profiles';
const REVOKED_PROFILES_KEY = 'medinous_revoked_profiles';

/**
 * Lightweight HMS-side patient directory used by the "Add family member"
 * lookup-by-ID flow. These are real hospital patients that exist in HMS
 * but are NOT yet linked to any family group. Looking them up returns
 * their basic identity so the user can confirm + pick a relationship.
 *
 * Real production hits HMS /patients/{id} — here we just match against
 * this fixed list so the demo flow is deterministic.
 */
const HMS_PATIENT_DIRECTORY: FamilyMember[] = [
  // Headline demo ID — type 12345666 in the add-family lookup to see
  // the "found" state populate inline on the same screen.
  {
    patientId: '12345666',
    firstName: 'Ravi',
    lastName: 'Sharma',
    fullName: 'Ravi Sharma',
    dateOfBirth: '1962-09-08',
    gender: 'Male',
    relationship: 'Parent',
    isPrimaryOwner: false,
    primaryMobile: '+97333224455',
    portalAccessEnabled: true,
    consentStatus: 'granted',
    isMinorOrDependent: false,
    status: 'active'
  },
  {
    patientId: '12345681',
    firstName: 'Meera',
    lastName: 'Sharma',
    fullName: 'Meera Sharma',
    dateOfBirth: '1958-02-12',
    gender: 'Female',
    relationship: 'Parent',
    isPrimaryOwner: false,
    primaryMobile: '+97333224455',
    portalAccessEnabled: true,
    consentStatus: 'granted',
    isMinorOrDependent: true,
    status: 'active'
  },
  {
    patientId: '12345682',
    firstName: 'Aanya',
    lastName: 'Sharma',
    fullName: 'Aanya Sharma',
    dateOfBirth: '2010-06-04',
    gender: 'Female',
    relationship: 'Dependent',
    isPrimaryOwner: false,
    primaryMobile: '+97333224455',
    portalAccessEnabled: true,
    consentStatus: 'granted',
    isMinorOrDependent: true,
    status: 'active'
  }
];

export type PatientLookupResult =
  | { status: 'found'; patient: FamilyMember }
  | { status: 'already_linked'; patient: FamilyMember }
  | { status: 'not_found' };

// =====================================================================
// HMIS PATIENT INDEX — Create Account "Account step" lookup
// =====================================================================
// A verified mobile number can map to 0, 1, or MANY HMS patient records
// (one household, one shared phone). The Create Account workflow looks a
// patient up here after OTP verification to auto-populate their identity.
// A resolvable National / Patient ID wins outright; otherwise (ID absent
// OR unknown to HMS) the lookup falls back to the verified mobile.
//
// DEMO — the ID on the Identify step is optional, so the branches are
// driven by the (ID, Mobile) pair; leave the ID blank to force the
// mobile-based lookup:
//   • ID blank,    mobile 1234567890 → TWO records → picker modal ★
//   • ID 12345678, any mobile     → Fatima — ALREADY registered → info dialog
//   • ID 12345679, any mobile     → Salman — single record → auto-populate
//   • ID 87654321, any mobile     → Yusuf  — single record → auto-populate
//   • ID 99999999, mobile 3322445599 → unknown ID → mobile → THREE records → picker modal
//   • ID 99999999, mobile 3322445501 → unknown ID → mobile → ONE record (Yusuf)
//   • ID 99999999, mobile 0000000000 → nothing matches → empty, manual entry
//
// `hasPortalAccount` mirrors the portal-side account ledger. Production
// resolves it via GET /portal/accounts?patientId= — here it is a flag.
// =====================================================================
export interface HmisPatientRecord {
  patientId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;                 // ISO yyyy-mm-dd
  gender: 'Male' | 'Female' | 'Other';
  mobile: string;                      // 10-digit local, as typed in signup
  hasPortalAccount: boolean;           // already registered on the portal?
}

const HMIS_PATIENT_INDEX: HmisPatientRecord[] = [
  // --- Headline demo: two profiles on one mobile (1234567890) ---------
  // Leave the optional ID blank, type this number, verify the OTP, and
  // the Account step opens the Select Patient Profile modal with exactly
  // these two records. Neither has a portal account yet, so both are
  // registerable and the flow never dead-ends on the "already exists"
  // dialog.
  { patientId: '20114477', firstName: 'Noura',  lastName: 'Al-Otaibi', fullName: 'Noura Al-Otaibi', dateOfBirth: '1992-04-18', gender: 'Female', mobile: '1234567890', hasPortalAccount: false },
  { patientId: '20114478', firstName: 'Khalid', lastName: 'Al-Otaibi', fullName: 'Khalid Al-Otaibi', dateOfBirth: '1989-12-05', gender: 'Male',   mobile: '1234567890', hasPortalAccount: false },
  // --- Shared-mobile household (3322445599) → multi-record modal ------
  { patientId: '12345678', firstName: 'Fatima', lastName: 'Sharma', fullName: 'Fatima Sharma', dateOfBirth: '1990-05-15', gender: 'Female', mobile: '3322445599', hasPortalAccount: true },
  { patientId: '12345679', firstName: 'Salman', lastName: 'Sharma', fullName: 'Salman Sharma', dateOfBirth: '1988-11-02', gender: 'Male',   mobile: '3322445599', hasPortalAccount: false },
  { patientId: '12345680', firstName: 'Aisha',  lastName: 'Sharma', fullName: 'Aisha Sharma',  dateOfBirth: '2017-08-21', gender: 'Female', mobile: '3322445599', hasPortalAccount: false },
  // --- Single-record patient (3322445501) → auto-populate ------------
  { patientId: '87654321', firstName: 'Yusuf',  lastName: 'Khan',   fullName: 'Yusuf Khan',    dateOfBirth: '1979-03-30', gender: 'Male',   mobile: '3322445501', hasPortalAccount: false }
];

// =====================================================================
// FAMILY SERVICE
// =====================================================================
@Injectable({ providedIn: 'root' })
export class FamilyService {
  // ------ HMS-sourced state -----------------------------------------
  private readonly _config = signal<FamilyConfig>(HMS_FAMILY_CONFIG);
  private readonly _members = signal<FamilyMember[]>([]);
  private readonly _primaryMobile = signal<string | null>(null);
  private readonly _activePatientId = signal<string | null>(null);

  // ------ Picker UI state -------------------------------------------
  // The picker now lives as a modal rendered by ShellComponent; any
  // call site (toolbar pill, post-login flow) toggles it through here.
  private readonly _pickerOpen = signal(false);
  private readonly _pickerDismissible = signal(true);

  // ------ Public reads ----------------------------------------------
  readonly config = this._config.asReadonly();
  readonly primaryMobile = this._primaryMobile.asReadonly();
  readonly pickerOpen = this._pickerOpen.asReadonly();
  readonly pickerDismissible = this._pickerDismissible.asReadonly();
  /** Raw member list (unfiltered). Use this for surfaces that need to
   *  see revoked / hidden rows too — Manage Family's "No longer sharing"
   *  section, for example. Picker code should use visibleMembers. */
  readonly allMembers = this._members.asReadonly();

  /**
   * Members the user is allowed to SEE on the picker. Members hidden
   * by the disabledProfileVisibility config are filtered out here;
   * disabled members are still returned so the picker can render
   * them in a non-selectable state.
   *
   * We additionally hide two categories from the picker:
   *  - `lockedByOwner === true`  → primary owner chose to hide them
   *    (reversible from Manage Family)
   *  - `consentStatus === 'revoked'` → the patient themselves revoked
   *    consent; only reception can restore.
   * The primary owner row is never filtered by these rules — you can't
   * hide / revoke the account root.
   */
  readonly visibleMembers = computed<FamilyMember[]>(() => {
    const rule = this._config().disabledProfileVisibility;
    return this._members().filter(m => {
      if (m.status !== 'active') return false;
      if (rule === 'hide' && !m.portalAccessEnabled) return false;
      if (m.isPrimaryOwner) return true;
      if (m.lockedByOwner) return false;
      if (m.consentStatus === 'revoked') return false;
      return true;
    });
  });

  /**
   * Members the owner has hidden — exposed for the "Manage Family"
   * screen so they can be restored. We deliberately ignore consent
   * revocation here; that's a reception-only path.
   */
  readonly hiddenMembers = computed<FamilyMember[]>(() =>
    this._members().filter(m => m.lockedByOwner === true && !m.isPrimaryOwner)
  );

  /** Members the user can actually click into (privacy-safe). */
  readonly selectableMembers = computed<FamilyMember[]>(() =>
    this.visibleMembers().filter(m => this.isSelectable(m))
  );

  readonly activeMember = computed<FamilyMember | null>(() => {
    const id = this._activePatientId();
    if (!id) return null;
    return this._members().find(m => m.patientId === id) ?? null;
  });

  readonly hasFamily = computed(() => this.selectableMembers().length > 0);

  readonly isMultiProfile = computed(() => this.selectableMembers().length > 1);

  /** Only the primary owner can change password / settings / family. */
  readonly isPrimaryOwner = computed(() => this.activeMember()?.isPrimaryOwner === true);

  /** Has the configured maximum been reached? */
  readonly hasReachedMaxLinked = computed(
    () => this._members().filter(m => m.status === 'active').length >= this._config().maxLinkedProfiles
  );

  // ------ Mutations -------------------------------------------------

  /**
   * Looks up the family group for a verified mobile. In production
   * this hits HMS; here we read the in-memory mock map.
   *
   * Enforces every link rule on the way in:
   *   - verified mobile match
   *   - HMS relationship mapping present
   *   - relationship type in allowedRelationships
   *   - max linked profiles cap (returns truncated list with a flag)
   *   - guardian mapping for minors/dependents when required
   */
  loadFamilyForMobile(mobile: string): Observable<FamilyGroupResponse | null> {
    const normalised = mobile.replace(/\s+/g, '');
    const group = HMS_FAMILY_GROUPS[normalised];

    if (!group) return of(null).pipe(delay(300));

    const allowed = new Set<RelationshipType>(group.config.allowedRelationships);
    const valid = group.members.filter(m => {
      // Verified mobile match — gate #1
      if (m.primaryMobile.replace(/\s+/g, '') !== normalised) return false;
      // Allowed relationship type — gate #2
      if (!allowed.has(m.relationship)) return false;
      // Guardian rule for minors — gate #4
      if (
        m.isMinorOrDependent &&
        group.config.guardianRequiredForMinors &&
        !m.guardianMemberId
      ) {
        return false;
      }
      return true;
    });

    // Decorate disabled reason for the UI
    const decorated = valid.map(m => this.withDisabledReason(m));

    // Enforce max linked profiles — gate #3.
    // We keep the primary owner + the first (cap - 1) others, in HMS
    // sort order. Production would never even return more than `cap`.
    let capped = decorated;
    if (decorated.length > group.config.maxLinkedProfiles) {
      const cap = group.config.maxLinkedProfiles;
      const primary = decorated.find(m => m.isPrimaryOwner);
      const others = decorated.filter(m => !m.isPrimaryOwner).slice(0, cap - 1);
      capped = primary ? [primary, ...others] : decorated.slice(0, cap);
    }

    // Re-apply any owner-side hide / consent-revoke preferences that
    // were persisted on a previous session. We restore them here, after
    // the HMS-truth members are in, so the in-memory state always
    // reflects both sources.
    const hidden = this.readIdSet(HIDDEN_PROFILES_KEY);
    const revoked = this.readIdSet(REVOKED_PROFILES_KEY);
    const finalMembers = capped.map(m => ({
      ...m,
      lockedByOwner: hidden.has(m.patientId) && !m.isPrimaryOwner ? true : m.lockedByOwner,
      consentStatus: revoked.has(m.patientId) && !m.isPrimaryOwner
        ? 'revoked' as const
        : m.consentStatus
    }));

    this._config.set(group.config);
    this._members.set(finalMembers);
    this._primaryMobile.set(group.primaryMobile);

    return of({ ...group, members: finalMembers }).pipe(delay(400));
  }

  /**
   * Sets the active patient context. Called by the picker, the header
   * switcher, and by the post-login redirect when only one profile
   * exists.
   *
   * Will refuse to set a non-selectable member (privacy-safe).
   */
  setActivePatient(patientId: string): boolean {
    const member = this._members().find(m => m.patientId === patientId);
    if (!member || !this.isSelectable(member)) return false;

    this._activePatientId.set(patientId);
    try {
      sessionStorage.setItem(ACTIVE_PATIENT_KEY, patientId);
    } catch {
      /* sessionStorage may be unavailable */
    }
    return true;
  }

  /**
   * Restore the active patient on a soft refresh within the same
   * session. We deliberately use sessionStorage (NOT localStorage) so
   * that a fresh login forces a re-selection (edge case #10).
   */
  restoreActivePatient(): void {
    try {
      const stored = sessionStorage.getItem(ACTIVE_PATIENT_KEY);
      if (stored && this._members().some(m => m.patientId === stored)) {
        this._activePatientId.set(stored);
      }
    } catch {
      /* ignore */
    }
  }

  /** Wipe family + active patient state on logout. */
  clear(): void {
    this._members.set([]);
    this._activePatientId.set(null);
    this._primaryMobile.set(null);
    this._pickerOpen.set(false);
    try {
      sessionStorage.removeItem(ACTIVE_PATIENT_KEY);
      // Hide / revoke preferences are also session-scoped — clear them
      // on sign-out so a fresh login starts from HMS truth.
      sessionStorage.removeItem(HIDDEN_PROFILES_KEY);
      sessionStorage.removeItem(REVOKED_PROFILES_KEY);
    } catch {
      /* ignore */
    }
  }

  // =============================================
  // PROFILE LOCK / CONSENT MUTATIONS
  // =============================================
  // Two distinct flavours of "lock":
  //   1. lockedByOwner  → portal-side preference owned by the primary
  //      account holder. Reversible from Manage Family. Only affects
  //      THIS login's picker — does not touch HMS.
  //   2. consentStatus  → HMS-side. The patient themselves revoked
  //      consent. Only reception can restore. Affects every login
  //      linked to this patient.

  /**
   * Primary-owner gate. Only the primary owner of the account can hide
   * or unhide profiles from their picker. Everyone else sees a
   * read-only picker.
   */
  private isOwnerSession(): boolean {
    return this.activeMember()?.isPrimaryOwner === true ||
           this._members().find(m => m.isPrimaryOwner)?.patientId ===
           this._members()[0]?.patientId;
  }

  /**
   * Whether the primary owner is allowed to hide this profile from
   * their view. Never the primary owner themselves.
   */
  canHideAsOwner(member: FamilyMember): boolean {
    return !member.isPrimaryOwner;
  }

  /**
   * Whether the patient is allowed to revoke their own HMS consent
   * from inside the portal. Per Puja's "Netflix model" rules:
   *  - The primary owner can't self-revoke (they ARE the account root)
   *  - Minors / dependents can't self-revoke (guardian-managed)
   *  - Everyone else (adult linked profile) can.
   */
  canSelfLock(member: FamilyMember): boolean {
    if (member.isPrimaryOwner) return false;
    if (member.isMinorOrDependent) return false;
    return true;
  }

  /** Primary owner hides a profile from THEIR view (reversible). */
  hideProfile(patientId: string): boolean {
    const target = this._members().find(m => m.patientId === patientId);
    if (!target || !this.canHideAsOwner(target)) return false;

    this._members.update(list =>
      list.map(m => m.patientId === patientId ? { ...m, lockedByOwner: true } : m)
    );
    // If the currently-active patient just got hidden, fall back to the
    // primary owner so the dashboard doesn't render data for a hidden
    // profile.
    if (this._activePatientId() === patientId) {
      const primary = this._members().find(m => m.isPrimaryOwner);
      if (primary) this.setActivePatient(primary.patientId);
    }
    this.persistIdSet(HIDDEN_PROFILES_KEY, m => m.lockedByOwner === true);
    return true;
  }

  /** Restore a profile the owner had previously hidden. */
  unhideProfile(patientId: string): boolean {
    const target = this._members().find(m => m.patientId === patientId);
    if (!target) return false;

    this._members.update(list =>
      list.map(m => m.patientId === patientId ? { ...m, lockedByOwner: false } : m)
    );
    this.persistIdSet(HIDDEN_PROFILES_KEY, m => m.lockedByOwner === true);
    return true;
  }

  /**
   * Adult self-revocation. Sets consentStatus to 'revoked' which means
   * the profile disappears from the owner's picker AND no other login
   * can see it either (in production HMS would broadcast). Demo path
   * only — restoration requires reception.
   */
  revokeOwnConsent(patientId: string): boolean {
    const target = this._members().find(m => m.patientId === patientId);
    if (!target || !this.canSelfLock(target)) return false;

    this._members.update(list =>
      list.map(m => m.patientId === patientId ? { ...m, consentStatus: 'revoked' as const } : m)
    );
    if (this._activePatientId() === patientId) {
      const primary = this._members().find(m => m.isPrimaryOwner);
      if (primary) this.setActivePatient(primary.patientId);
    }
    this.persistIdSet(REVOKED_PROFILES_KEY, m => m.consentStatus === 'revoked');
    return true;
  }

  private readIdSet(key: string): Set<string> {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return new Set();
      return new Set<string>(JSON.parse(raw));
    } catch {
      return new Set();
    }
  }

  private persistIdSet(key: string, predicate: (m: FamilyMember) => boolean): void {
    try {
      const ids = this._members().filter(predicate).map(m => m.patientId);
      sessionStorage.setItem(key, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }

  /**
   * Open the picker modal.
   *  - `dismissible=false` for the mandatory post-login pick (the user
   *    cannot close until they choose a profile or sign out).
   *  - `dismissible=true` for mid-session switches from the toolbar.
   */
  openPicker(dismissible = true): void {
    this._pickerDismissible.set(dismissible);
    this._pickerOpen.set(true);
  }

  /** Close the modal — respects dismissibility. Returns true if closed. */
  closePicker(): boolean {
    if (!this._pickerDismissible()) return false;
    this._pickerOpen.set(false);
    return true;
  }

  /** Force-close (used after a successful selection regardless of state). */
  forceClosePicker(): void {
    this._pickerOpen.set(false);
    this._pickerDismissible.set(true);
  }

  // ------ Helpers ---------------------------------------------------

  /**
   * Compute current age from the member's DOB. The portal renders
   * "Age 35" for adults and "Age 8 yrs" for minors so the picker
   * is glanceable at a glance.
   */
  ageFor(member: FamilyMember): number {
    const dob = new Date(member.dateOfBirth);
    if (Number.isNaN(dob.getTime())) return 0;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age;
  }

  /**
   * Selectable = portal access enabled, consent satisfied, status active.
   * Adult members without an explicit consent are 'not_required'.
   */
  isSelectable(member: FamilyMember): boolean {
    if (member.status !== 'active') return false;
    if (!member.portalAccessEnabled) return false;
    if (member.consentStatus === 'pending' || member.consentStatus === 'revoked') return false;
    return true;
  }

  /**
   * Validation message helper for any place where the portal might
   * attempt to LINK a new profile — used by the (future) "Add family
   * member" flow and surfaced in the dashboard when applicable.
   */
  maxLimitMessage(): string {
    return 'Maximum allowed family profiles limit has been reached.';
  }

  /**
   * Create a brand-new patient record in HMS AND link them to this
   * family in one step. Used when the user couldn't find their relative
   * via Patient ID — usually because the relative has never been to the hospital
   * and therefore doesn't have an account yet.
   *
   * Real production: POST /patients (HMS) then POST /family/{owner}/links
   * Demo: synthesise a Patient ID, append to in-memory members, persist.
   *
   * Returns the newly-linked FamilyMember on success, null if the family
   * is at the cap (caller should pre-check `hasReachedMaxLinked`).
   */
  createAndLinkFamilyMember(input: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;          // ISO yyyy-mm-dd
    gender: 'Female' | 'Male' | 'Other';
    mobile?: string;
    relationship: RelationshipType;
  }): FamilyMember | null {
    if (this.hasReachedMaxLinked()) return null;
    if (!input.firstName || !input.lastName || !input.dateOfBirth) return null;
    if (input.relationship === 'Self') return null;

    // Synthesise a fresh Patient ID. Real HMS owns the ID space; here we
    // just generate a 7-digit number that won't collide with existing
    // members or the directory.
    const newId = this.mintPatientId();

    // Treat the linked patient as a minor if they're under 18 — gates
    // the self-revoke rule the same way HMS-sourced members behave.
    const age = this.ageFromDob(input.dateOfBirth);
    const isMinor = age < 18;

    const newMember: FamilyMember = {
      patientId: newId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      fullName: `${input.firstName.trim()} ${input.lastName.trim()}`,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      relationship: input.relationship,
      isPrimaryOwner: false,
      primaryMobile: input.mobile?.trim() || this._primaryMobile() || '',
      portalAccessEnabled: true,
      consentStatus: isMinor ? 'not_required' : 'granted',
      isMinorOrDependent: isMinor,
      guardianMemberId: isMinor
        ? this._members().find(m => m.isPrimaryOwner)?.patientId
        : undefined,
      status: 'active',
      lockedByOwner: false
    };

    this._members.update(list => [...list, newMember]);
    return newMember;
  }

  /** Synthesise a Patient ID that doesn't collide with existing
   *  members or the HMS directory. */
  private mintPatientId(): string {
    const taken = new Set<string>([
      ...this._members().map(m => m.patientId),
      ...HMS_PATIENT_DIRECTORY.map(p => p.patientId)
    ]);
    let id: string;
    do {
      id = String(Math.floor(10_000_000 + Math.random() * 89_999_999));
    } while (taken.has(id));
    return id;
  }

  /** Years from DOB to today. Used by createAndLinkFamilyMember to
   *  decide whether the new patient should default to minor rules. */
  private ageFromDob(iso: string): number {
    const dob = new Date(iso);
    if (Number.isNaN(dob.getTime())) return 0;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age;
  }

  /**
   * Look a patient up by National ID / Patient ID. Real HMS would hit
   * /patients/{id}; the demo searches the local family group + an HMS
   * directory of unlinked patients.
   *
   *  - `already_linked`: the ID is already a member of this family.
   *  - `found`: exists in HMS, is NOT yet linked here. Returns the
   *    identity so the picker can render it for confirmation.
   *  - `not_found`: HMS doesn't know this ID — the user can hand off to
   *    the Create-Account workflow to register them.
   */
  lookupPatient(rawId: string): PatientLookupResult {
    const id = (rawId || '').trim();
    if (!id) return { status: 'not_found' };

    const inFamily = this._members().find(m => m.patientId === id);
    if (inFamily) return { status: 'already_linked', patient: inFamily };

    const inDirectory = HMS_PATIENT_DIRECTORY.find(p => p.patientId === id);
    if (inDirectory) return { status: 'found', patient: inDirectory };

    return { status: 'not_found' };
  }

  // =============================================
  // HMIS LOOKUP — Create Account "Account step"
  // =============================================
  // Portal-side ledger of HMS patient IDs that have already minted a
  // Patient Portal login during this session (on top of the seeded
  // `hasPortalAccount` flags). Lets the "already registered" guard
  // reflect accounts created within the same demo run.
  private readonly _portalRegistered = new Set<string>();

  /**
   * HMIS lookup for the Create Account flow. Prefers the National ID /
   * Patient ID when one is supplied; otherwise falls back to the verified
   * mobile number. Returns EVERY matching record (0, 1, or many) — the
   * caller decides how to render each count.
   *
   * Production hits HMS: GET /patients?nationalId= or ?mobile=. The demo
   * matches against HMIS_PATIENT_INDEX so the flow is deterministic.
   */
  hmisLookup(input: { cpr?: string; mobile?: string }): HmisPatientRecord[] {
    const cpr = (input.cpr || '').replace(/\D/g, '');
    if (cpr) {
      const byId = HMIS_PATIENT_INDEX.filter(p => p.patientId === cpr);
      // An ID that resolves wins outright. If the ID is provided but HMS
      // doesn't know it (typo, or an ID from a different facility), we
      // fall through to the verified mobile rather than dead-ending a
      // patient whose phone is already on file.
      if (byId.length > 0) return byId;
    }
    const mobile = (input.mobile || '').replace(/\D/g, '');
    if (!mobile) return [];
    return HMIS_PATIENT_INDEX.filter(p => this.mobileMatches(p.mobile, mobile));
  }

  /** True when the HMS patient already has a Patient Portal login. */
  hmisHasPortalAccount(patientId: string): boolean {
    if (this._portalRegistered.has(patientId)) return true;
    const rec = HMIS_PATIENT_INDEX.find(p => p.patientId === patientId);
    return rec?.hasPortalAccount === true;
  }

  /**
   * Link a freshly-created Patient Portal account to its HMS patient
   * record. Production: POST /portal/accounts { patientId }. Demo: record
   * the ID so a repeat registration attempt hits the "already registered"
   * guard.
   */
  hmisLinkPortalAccount(patientId: string): void {
    if (patientId) this._portalRegistered.add(patientId);
  }

  /** Compare two mobile numbers ignoring country-code / formatting noise
   *  by matching on the shared trailing digits (min 8). */
  private mobileMatches(a: string, b: string): boolean {
    const da = (a || '').replace(/\D/g, '');
    const db = (b || '').replace(/\D/g, '');
    if (!da || !db) return false;
    const min = Math.min(da.length, db.length);
    if (min < 8) return da === db;
    return da.slice(-min) === db.slice(-min);
  }

  private withDisabledReason(member: FamilyMember): FamilyMember {
    if (member.status !== 'active') {
      return { ...member, disabledReason: 'inactive' };
    }
    if (!member.portalAccessEnabled) {
      return { ...member, disabledReason: 'portal_access_disabled' };
    }
    if (member.consentStatus === 'pending' || member.consentStatus === 'revoked') {
      return { ...member, disabledReason: 'consent_pending' };
    }
    return member;
  }
}
