import { CareItem, CareStatus } from './telehealth.model';

// =====================================================================
// CARE STATUS + PRIMARY ACTION HELPERS
//
// Shared, pure mappings so the home, active-care and tracking screens
// render statuses and next-actions identically. Keeping this out of the
// components avoids three copies drifting apart.
// =====================================================================

export interface ChipView {
  label: string;
  cls: string;      // th-chip modifier class
  icon: string;     // Material Symbols
  tone: 'confirmed' | 'ready' | 'progress' | 'attention' | 'completed' | 'cancelled';
}

const CHIP: Record<CareStatus, ChipView> = {
  request_received:    { label: 'Request received',   cls: 'chip-progress',  icon: 'hourglass_top', tone: 'progress' },
  confirming:          { label: 'Confirming',         cls: 'chip-progress',  icon: 'hourglass_top', tone: 'progress' },
  confirmed:           { label: 'Confirmed',          cls: 'chip-confirmed', icon: 'check_circle',  tone: 'confirmed' },
  provider_assigning:  { label: 'Assigning provider', cls: 'chip-progress',  icon: 'sync',          tone: 'progress' },
  provider_assigned:   { label: 'Provider assigned',  cls: 'chip-progress',  icon: 'assignment_ind',tone: 'progress' },
  provider_on_the_way: { label: 'On the way',         cls: 'chip-progress',  icon: 'directions_car',tone: 'progress' },
  provider_arrived:    { label: 'Arrived',            cls: 'chip-progress',  icon: 'location_on',   tone: 'progress' },
  in_progress:         { label: 'In progress',        cls: 'chip-progress',  icon: 'pending',       tone: 'progress' },
  ready_to_join:       { label: 'Ready to join',      cls: 'chip-ready',     icon: 'videocam',      tone: 'ready' },
  completed:           { label: 'Completed',          cls: 'chip-completed', icon: 'check',         tone: 'completed' },
  cancelled:           { label: 'Cancelled',          cls: 'chip-cancelled', icon: 'cancel',        tone: 'cancelled' },
  payment_failed:      { label: 'Payment failed',     cls: 'chip-cancelled', icon: 'error',         tone: 'attention' }
};

export function statusChip(item: CareItem): ChipView {
  return CHIP[item.status] ?? CHIP.confirmed;
}

export interface ActionView { label: string; icon: string; route: string; }

/**
 * The single most useful next action for a care item, given its status.
 * The route is where tapping it should take the patient.
 */
export function primaryActionFor(item: CareItem): ActionView {
  if (item.type === 'video_consult') {
    if (item.status === 'confirmed') return { label: 'Prepare for consultation', icon: 'checklist', route: `/telehealth/prepare/${item.id}` };
    if (item.status === 'ready_to_join') return { label: 'Join consultation', icon: 'videocam', route: `/telehealth/consult/room/${item.id}` };
    if (item.status === 'completed') return { label: 'View outcome', icon: 'description', route: `/telehealth/consult/outcome/${item.id}` };
    return { label: 'View details', icon: 'info', route: `/telehealth/prepare/${item.id}` };
  }
  // home care + lab collection
  if (item.status === 'confirmed' || item.status === 'request_received') {
    return { label: 'View preparation', icon: 'checklist', route: `/telehealth/prepare/${item.id}` };
  }
  if (item.status === 'completed') {
    return { label: item.type === 'lab_collection' ? 'View report' : 'View summary', icon: 'description', route: `/telehealth/track/${item.id}` };
  }
  return { label: 'Track service', icon: 'timeline', route: `/telehealth/track/${item.id}` };
}
