// =====================================================================
// FAMILY GROUPING — DOMAIN MODELS
//
// One verified mobile number / login can be linked to multiple patient
// profiles, BUT only when:
//   1. The mobile number is verified on each profile
//   2. A valid family relationship mapping exists in HMS/HIS
//   3. Portal access is enabled for the linked profile
//   4. Consent / guardian rules are satisfied
//
// The patient portal MUST NOT create these mappings — they originate
// from HMS/HIS. The portal only consumes them.
// =====================================================================

export type RelationshipType =
  | 'Self'
  | 'Spouse'
  | 'Child'
  | 'Parent'
  | 'Dependent';

export type ConsentStatus = 'granted' | 'pending' | 'revoked' | 'not_required';

export type FamilyMemberStatus = 'active' | 'inactive';

/**
 * A single patient profile linked to the authenticated mobile number.
 * Every action in the portal happens under exactly ONE selected member
 * at a time (patient-context isolation).
 */
export interface FamilyMember {
  /** HMS Patient ID. Used as the unique key across the portal. */
  patientId: string;

  /** Personal identity (read-only — sourced from HMS). */
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  avatarUrl?: string;

  /** Relationship to the primary owner (NOT to the linked phone number). */
  relationship: RelationshipType;

  /**
   * Primary owner of the login.
   * Only the primary owner can:
   *  - Change the password
   *  - Manage account settings
   *  - Manage family grouping in the future
   * All other linked members are patient-contexts only.
   */
  isPrimaryOwner: boolean;

  /**
   * Verified mobile number on the HMS patient record.
   * MUST match the authenticated mobile for the link to be valid.
   */
  primaryMobile: string;

  /**
   * Portal access flag set in HMS. When false, the member is either
   * hidden or shown in a disabled state per the configured visibility
   * rule. We never expose any patient data when this is false.
   */
  portalAccessEnabled: boolean;

  /** Consent / guardian status from HMS. */
  consentStatus: ConsentStatus;

  /**
   * True if the member is a minor (or otherwise a dependent under a
   * guardian). When true, guardianMemberId MUST point to a valid
   * adult primary-owner relationship.
   */
  isMinorOrDependent: boolean;

  /** Patient ID of the guardian member (only for minors / dependents). */
  guardianMemberId?: string;

  /**
   * Active link status. Inactive means the mapping was removed in HMS;
   * the member must disappear on the next login / session refresh.
   */
  status: FamilyMemberStatus;

  /**
   * Reason the member appears in a disabled state on the picker.
   * Populated by the service for UI hinting; never inferred elsewhere.
   */
  disabledReason?: 'portal_access_disabled' | 'consent_pending' | 'inactive';

  /**
   * Portal-side "hide from my view" preference set by the primary
   * account owner. This is NOT a consent revocation — the patient still
   * exists in HMS and any other login linked to them is unaffected. The
   * owner can flip it back from Manage Family. Persisted in
   * sessionStorage so it survives a refresh within the same session.
   */
  lockedByOwner?: boolean;
}

/**
 * Per-tenant configuration. In production these values come from
 * /hms/config/family-grouping. We keep a local mirror so the portal
 * can render limits + messages without round-tripping.
 */
export interface FamilyConfig {
  /** Maximum linked profiles allowed under one mobile / login. */
  maxLinkedProfiles: number;

  /** Relationship types the hospital allows. */
  allowedRelationships: RelationshipType[];

  /** Whether minor children require an explicit guardian mapping. */
  guardianRequiredForMinors: boolean;

  /**
   * Behaviour when a linked profile has portalAccessEnabled = false.
   *  - 'hide'    → omit from the picker
   *  - 'disable' → show on the picker, greyed out, not selectable
   */
  disabledProfileVisibility: 'hide' | 'disable';

  /** Show a confirmation when switching mid-workflow (e.g. booking). */
  confirmSwitchDuringWorkflow: boolean;
}

/**
 * The authoritative payload returned by HMS for the authenticated
 * mobile number. The portal never assembles this itself.
 */
export interface FamilyGroupResponse {
  primaryMobile: string;
  members: FamilyMember[];
  config: FamilyConfig;
}
