import { Injectable, computed, inject, signal } from '@angular/core';
import { FamilyService } from '../../core/services/family.service';
import {
  CareItem, CareBucket, CareStatus, ConsultSpecialty, ConsultDraft,
  HealthPackage, HomeCareService, LabTest, PreparationItem, PriceLine,
  ServiceAddress, CareSlot, SupportedTeleLang, TeleProvider, TrackStep,
  CareRecommendation, HomeCareServiceKey, CareOutcome
} from './telehealth.model';

// =====================================================================
// TELEHEALTH SERVICE
//
// Single source of truth for the Telehealth module. Holds:
//   • static catalogues (specialties, languages, home services, tests)
//   • the patient's booked care items (persisted to localStorage)
//   • hospital-connected recommendations (continuity of care)
//   • helpers for the booking wizards + status simulation
//
// Everything is per-active-family-member so switching "Care for:" in the
// header re-slices the data exactly like the rest of the portal.
// =====================================================================

const STORE_KEY = 'medinous_telehealth_items_v1';
const DRAFT_KEY = 'medinous_telehealth_draft_v1';
const REC_DISMISS_KEY = 'medinous_telehealth_rec_dismissed_v1';

/** AED is the primary demo currency (Middle East positioning). */
export const TELE_CURRENCY = 'AED';

@Injectable({ providedIn: 'root' })
export class TelehealthService {
  private readonly family = inject(FamilyService);

  // ---- Reactive store -------------------------------------------------
  private readonly _items = signal<CareItem[]>(this.loadItems());
  private readonly _dismissedRecs = signal<Set<string>>(this.loadDismissed());
  readonly draft = signal<ConsultDraft>(this.loadDraft());

  /** Active family member id (falls back to primary demo patient). */
  private activePatientId(): string {
    return this.family.activeMember()?.patientId ?? '12345678';
  }
  private activePatientName(): string {
    return this.family.activeMember()?.fullName ?? 'Aisha Rahman';
  }

  /** Care items for the currently-selected patient only (privacy-scoped). */
  readonly items = computed<CareItem[]>(() =>
    this._items().filter(i => i.patientId === this.activePatientId())
  );

  // ================================================================
  // CATALOGUE: instant-consult specialties
  // ================================================================
  readonly consultSpecialties: ConsultSpecialty[] = [
    { key: 'gp',    name: 'General Physician',        icon: 'medical_services', color: '#2e7d32', blurb: 'Fever, cough, infections, everyday illness', fee: 90 },
    { key: 'peds',  name: 'Paediatrics',              icon: 'child_care',       color: '#ef6c00', blurb: 'Child health, fever, feeding, growth', fee: 110 },
    { key: 'derm',  name: 'Dermatology',              icon: 'spa',              color: '#ad1457', blurb: 'Skin, rashes, acne, hair concerns', fee: 130 },
    { key: 'gyn',   name: 'Gynaecology',              icon: 'pregnant_woman',   color: '#c2185b', blurb: 'Women’s health, cycle, pregnancy care', fee: 140 },
    { key: 'mind',  name: 'Mental Wellness',          icon: 'psychology',       color: '#00897b', blurb: 'Stress, sleep, mood, anxiety support', fee: 160 },
    { key: 'ortho', name: 'Orthopaedics',             icon: 'accessibility_new',color: '#1565c0', blurb: 'Joint pain, injury, mobility', fee: 130 },
    { key: 'cardio',name: 'Cardiology',               icon: 'favorite',         color: '#c62828', blurb: 'Blood pressure, palpitations, heart follow-up', fee: 160 },
    { key: 'endo',  name: 'Diabetes & Endocrinology', icon: 'water_drop',       color: '#6a1b9a', blurb: 'Diabetes, thyroid, hormone review', fee: 150 }
  ];

  /** Everyday-words → specialty suggestion (not a diagnosis). */
  private readonly concernMap: { term: string; key: string }[] = [
    { term: 'fever', key: 'gp' }, { term: 'body pain', key: 'gp' }, { term: 'cough', key: 'gp' },
    { term: 'cold', key: 'gp' }, { term: 'flu', key: 'gp' }, { term: 'throat', key: 'gp' },
    { term: 'rash', key: 'derm' }, { term: 'skin', key: 'derm' }, { term: 'acne', key: 'derm' }, { term: 'hair', key: 'derm' },
    { term: 'child', key: 'peds' }, { term: 'baby', key: 'peds' }, { term: 'kid', key: 'peds' },
    { term: 'sugar', key: 'endo' }, { term: 'diabetes', key: 'endo' }, { term: 'thyroid', key: 'endo' },
    { term: 'knee', key: 'ortho' }, { term: 'back pain', key: 'ortho' }, { term: 'joint', key: 'ortho' }, { term: 'sprain', key: 'ortho' },
    { term: 'chest', key: 'cardio' }, { term: 'bp', key: 'cardio' }, { term: 'pressure', key: 'cardio' }, { term: 'palpitation', key: 'cardio' },
    { term: 'stress', key: 'mind' }, { term: 'anxiety', key: 'mind' }, { term: 'sleep', key: 'mind' }, { term: 'sad', key: 'mind' },
    { term: 'period', key: 'gyn' }, { term: 'pregnan', key: 'gyn' }
  ];

  suggestSpecialty(concern: string): ConsultSpecialty | null {
    const c = concern.toLowerCase();
    const hit = this.concernMap.find(m => c.includes(m.term));
    if (!hit) return null;
    return this.consultSpecialties.find(s => s.key === hit.key) ?? null;
  }

  readonly languages: SupportedTeleLang[] = ['English', 'Arabic', 'Hindi', 'Malayalam', 'Tamil', 'Urdu'];

  // ================================================================
  // CATALOGUE: home-care services
  // ================================================================
  readonly homeCareServices: HomeCareService[] = [
    {
      key: 'nurse_visit', name: 'Nurse Visit', icon: 'vaccines', color: '#1565c0',
      description: 'A qualified nurse for a prescribed procedure or basic nursing support at home.',
      startingPrice: 150, duration: '30–45 min', earliestSlot: 'Available today',
      prescriptionRule: 'recommended', prescriptionNote: 'Prescription may be required',
      preparation: [
        { id: 'n1', text: 'Keep the prescription or discharge instruction ready' },
        { id: 'n2', text: 'Keep any medicines or supplies available when instructed' },
        { id: 'n3', text: 'Inform the hospital of any allergies' },
        { id: 'n4', text: 'Ensure an adult caregiver is present if required' }
      ],
      intake: [
        { id: 'need', label: 'What service is required?', type: 'textarea', placeholder: 'e.g. Injection, catheter care, vitals check' },
        { id: 'byorder', label: 'Is this based on a doctor’s instruction?', type: 'choice', options: ['Yes', 'No'] },
        { id: 'rx', label: 'Upload prescription or instruction', type: 'upload', optional: true },
        { id: 'extra', label: 'Anything else we should know?', type: 'textarea', optional: true }
      ]
    },
    {
      key: 'physiotherapy', name: 'Physiotherapy at Home', icon: 'self_improvement', color: '#00897b',
      description: 'A physiotherapy assessment or scheduled therapy session at home.',
      startingPrice: 200, duration: '45–60 min', earliestSlot: 'Next available: Tomorrow',
      prescriptionRule: 'not_required', prescriptionNote: 'No prescription needed',
      preparation: [
        { id: 'p1', text: 'Wear comfortable, loose clothing' },
        { id: 'p2', text: 'Keep any walking aids nearby' },
        { id: 'p3', text: 'Make enough clear space for movement' },
        { id: 'p4', text: 'Keep surgery or scan reports ready' }
      ],
      intake: [
        { id: 'concern', label: 'What is the primary concern?', type: 'textarea', placeholder: 'e.g. Knee stiffness after surgery' },
        { id: 'since', label: 'Surgery or injury date (if applicable)', type: 'date', optional: true },
        { id: 'mobility', label: 'Any difficulty walking or moving?', type: 'choice', options: ['No difficulty', 'Some difficulty', 'Significant difficulty'] },
        { id: 'ref', label: 'Upload referral', type: 'upload', optional: true }
      ]
    },
    {
      key: 'wound_dressing', name: 'Wound Dressing', icon: 'healing', color: '#ef6c00',
      description: 'A nurse for wound assessment and dressing at home.',
      startingPrice: 175, duration: '20–30 min', earliestSlot: 'Available today',
      prescriptionRule: 'recommended', prescriptionNote: 'Prescription or discharge instruction recommended',
      preparation: [
        { id: 'w1', text: 'Keep the discharge or dressing instruction ready' },
        { id: 'w2', text: 'Keep prescribed dressing supplies available if you have them' },
        { id: 'w3', text: 'Clean, well-lit space for the dressing' },
        { id: 'w4', text: 'Inform the nurse of any allergies to dressings or tape' }
      ],
      intake: [
        { id: 'site', label: 'Where is the wound?', type: 'text', placeholder: 'e.g. Right lower leg' },
        { id: 'origin', label: 'Post-surgery or injury?', type: 'choice', options: ['Post-surgery', 'Injury', 'Chronic wound', 'Not sure'] },
        { id: 'rx', label: 'Upload discharge / dressing instruction', type: 'upload', optional: true }
      ]
    },
    {
      key: 'medication_admin', name: 'Injection / Medication', icon: 'medication_liquid', color: '#5e35b1',
      description: 'A nurse to administer a prescribed injection or medication at home.',
      startingPrice: 120, duration: '15–20 min', earliestSlot: 'Available today',
      prescriptionRule: 'required', prescriptionNote: 'Prescription required',
      preparation: [
        { id: 'm1', text: 'Keep the prescription ready (required)' },
        { id: 'm2', text: 'Keep the medicine available if already dispensed' },
        { id: 'm3', text: 'Inform the hospital of any allergies' }
      ],
      intake: [
        { id: 'med', label: 'What medication or injection?', type: 'text', placeholder: 'e.g. Vitamin B12 injection' },
        { id: 'rx', label: 'Upload prescription (required)', type: 'upload' },
        { id: 'have', label: 'Do you already have the medicine?', type: 'choice', options: ['Yes', 'No, please arrange'] }
      ]
    },
    {
      key: 'vaccination', name: 'Vaccination at Home', icon: 'syringe', color: '#43a047',
      description: 'A scheduled vaccination administered safely at home.',
      startingPrice: 160, duration: '15–20 min', earliestSlot: 'Next available: Tomorrow',
      prescriptionRule: 'not_required', prescriptionNote: 'No prescription needed for routine vaccines',
      preparation: [
        { id: 'v1', text: 'Keep the vaccination card or record ready' },
        { id: 'v2', text: 'Note any past reaction to vaccines' },
        { id: 'v3', text: 'For children, keep the guardian present' }
      ],
      intake: [
        { id: 'vaccine', label: 'Which vaccine?', type: 'text', placeholder: 'e.g. Influenza, Tetanus booster' },
        { id: 'who', label: 'Who is it for?', type: 'choice', options: ['Adult', 'Child'] },
        { id: 'prior', label: 'Any past reaction to a vaccine?', type: 'textarea', optional: true }
      ]
    }
  ];

  homeCare(key: HomeCareServiceKey): HomeCareService {
    return this.homeCareServices.find(s => s.key === key)!;
  }

  // ================================================================
  // CATALOGUE: lab tests + packages
  // ================================================================
  readonly labTests: LabTest[] = [
    { code: 'CBC',   name: 'Complete Blood Count (CBC)', price: 45,  turnaround: 'Same day',  fasting: false, category: 'blood' },
    { code: 'HBA1C', name: 'HbA1c (3-month sugar)',      price: 65,  turnaround: 'Same day',  fasting: false, category: 'metabolic', doctorRecommended: true, recommendedBy: 'Dr. Ahmed Hassan' },
    { code: 'FBS',   name: 'Fasting Blood Glucose',      price: 30,  turnaround: 'Same day',  fasting: true,  fastingNote: 'Fast 8–10 hours before collection', category: 'metabolic', doctorRecommended: true, recommendedBy: 'Dr. Ahmed Hassan' },
    { code: 'LIPID', name: 'Lipid Profile',              price: 80,  turnaround: 'Same day',  fasting: true,  fastingNote: 'Fast 9–12 hours before collection', category: 'cardiac' },
    { code: 'TSH',   name: 'Thyroid Profile (TSH, T3, T4)', price: 95, turnaround: 'Next day', fasting: false, category: 'hormone' },
    { code: 'LFT',   name: 'Liver Function Test',        price: 90,  turnaround: 'Same day',  fasting: false, category: 'organ' },
    { code: 'KFT',   name: 'Kidney Function Test',       price: 90,  turnaround: 'Same day',  fasting: false, category: 'organ' },
    { code: 'VITD',  name: 'Vitamin D',                  price: 120, turnaround: '2 days',    fasting: false, category: 'vitamin' },
    { code: 'BG',    name: 'Blood Glucose (Random)',     price: 25,  turnaround: 'Same day',  fasting: false, category: 'metabolic' }
  ];

  readonly healthPackages: HealthPackage[] = [
    { code: 'PKG_DIAB', name: 'Diabetes Care Panel', blurb: 'HbA1c, Fasting Glucose, Lipid, Kidney', price: 220, testCodes: ['HBA1C', 'FBS', 'LIPID', 'KFT'], fasting: true },
    { code: 'PKG_BASIC', name: 'Basic Wellness Check', blurb: 'CBC, Lipid, Liver, Kidney, Vitamin D', price: 310, testCodes: ['CBC', 'LIPID', 'LFT', 'KFT', 'VITD'], fasting: true },
    { code: 'PKG_THY', name: 'Thyroid & Hormone', blurb: 'Thyroid Profile + Vitamin D', price: 190, testCodes: ['TSH', 'VITD'], fasting: false }
  ];

  test(code: string): LabTest | undefined {
    return this.labTests.find(t => t.code === code);
  }
  get doctorRecommendedTests(): LabTest[] {
    return this.labTests.filter(t => t.doctorRecommended);
  }

  // ================================================================
  // CATALOGUE: saved addresses + slots
  // ================================================================
  readonly savedAddresses: ServiceAddress[] = [
    { id: 'addr_home', label: 'Home', line1: 'Villa 24, Al Wasl Road', area: 'Jumeirah 1', city: 'Dubai', building: 'Villa 24', landmark: 'Near Al Wasl Park', entryNote: 'Gate code 4471', inServiceArea: true },
    { id: 'addr_office', label: 'Office', line1: 'Level 12, Boulevard Plaza Tower 1', area: 'Downtown', city: 'Dubai', building: 'Tower 1', inServiceArea: true }
  ];

  /** A far-out address used to demo the "not in service area" exception. */
  readonly outOfAreaAddress: ServiceAddress = {
    id: 'addr_faraway', label: 'Farm House', line1: 'Plot 7, Al Lisaili', area: 'Al Lisaili', city: 'Dubai (rural)', inServiceArea: false
  };

  /** Arrival-window slots for the next few days (home services + labs). */
  slotsFor(daysAhead: number[] = [1, 2, 3]): { date: string; label: string; windows: CareSlot[] }[] {
    const windows = ['7:00–8:00 AM', '8:00–10:00 AM', '10:00 AM–12:00 PM', '4:00–6:00 PM'];
    return daysAhead.map((d, di) => {
      const date = this.addDays(d);
      return {
        date: date.iso,
        label: date.label,
        windows: windows.map((w, wi) => ({
          id: `${date.iso}_${wi}`, date: date.iso, window: w,
          earliest: di === 0 && wi === 0
        }))
      };
    });
  }

  // ================================================================
  // RECOMMENDATIONS (hospital-connected → direct actions)
  // ================================================================
  readonly recommendations = computed<CareRecommendation[]>(() => {
    const dismissed = this._dismissedRecs();
    const base: CareRecommendation[] = [];

    // Seed recommendation: doctor-ordered HbA1c (drives the demo storyline)
    base.push({
      id: 'rec_hba1c',
      kind: 'lab_test',
      title: 'Dr. Ahmed Hassan recommended an HbA1c test',
      detail: 'Ordered at your last diabetes review · book home sample collection',
      doctorName: 'Dr. Ahmed Hassan',
      action: 'Book at home',
      target: 'lab_tests',
      payloadTestCodes: ['HBA1C']
    });

    // Dynamic recommendations produced by completed video consults
    for (const item of this.items()) {
      if (item.outcome) {
        if (item.outcome.testsOrdered?.length) {
          base.push({
            id: `rec_tests_${item.id}`,
            kind: 'lab_test',
            title: `${item.provider?.name ?? 'Your doctor'} ordered ${item.outcome.testsOrdered.map(c => this.test(c)?.name ?? c).join(' and ')}`,
            detail: 'Recommended after your video consultation · book home collection',
            doctorName: item.provider?.name ?? 'Your doctor',
            action: 'Book recommended tests at home',
            target: 'lab_tests',
            payloadTestCodes: item.outcome.testsOrdered
          });
        }
        if (item.outcome.homeServicesRecommended?.length) {
          const key = item.outcome.homeServicesRecommended[0];
          base.push({
            id: `rec_home_${item.id}`,
            kind: 'home_service',
            title: `${item.provider?.name ?? 'Your doctor'} recommended ${this.homeCare(key).name}`,
            detail: 'Recommended after your video consultation · book a home visit',
            doctorName: item.provider?.name ?? 'Your doctor',
            action: `Book ${this.homeCare(key).name.toLowerCase()}`,
            target: 'home_care',
            payloadServiceKey: key
          });
        }
        if (item.outcome.followUpInDays) {
          base.push({
            id: `rec_fu_${item.id}`,
            kind: 'followup',
            title: `Follow-up video consultation recommended in ${item.outcome.followUpInDays} weeks`,
            detail: `With ${item.provider?.name ?? 'your doctor'} · book when convenient`,
            doctorName: item.provider?.name ?? 'Your doctor',
            action: 'Book video follow-up',
            target: 'video_consult'
          });
        }
      }
      // A lab collection whose report is ready → follow-up prompt
      if (item.type === 'lab_collection' && item.status === 'completed') {
        base.push({
          id: `rec_report_${item.id}`,
          kind: 'report_ready',
          title: 'Your lab report is ready',
          detail: 'Book the follow-up recommended after your consultation',
          doctorName: 'Dr. Ahmed Hassan',
          action: 'Book video follow-up',
          target: 'video_consult'
        });
      }
    }
    return base.filter(r => !dismissed.has(r.id));
  });

  dismissRecommendation(id: string): void {
    const next = new Set(this._dismissedRecs());
    next.add(id);
    this._dismissedRecs.set(next);
    try { localStorage.setItem(REC_DISMISS_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
  }

  // ================================================================
  // ACTIVE-CARE QUERIES
  // ================================================================
  itemsByBucket(bucket: CareBucket): CareItem[] {
    return this.items()
      .filter(i => i.bucket === bucket)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /** The single nearest upcoming/active item for the home "Active care" card. */
  readonly nearestActive = computed<CareItem | null>(() => {
    const active = this.items()
      .filter(i => i.bucket === 'upcoming' || i.bucket === 'in_progress')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return active[0] ?? null;
  });

  readonly recentCompleted = computed<CareItem[]>(() =>
    this.items()
      .filter(i => i.bucket === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
  );

  getItem(id: string): CareItem | undefined {
    return this._items().find(i => i.id === id);
  }

  // ================================================================
  // MUTATIONS
  // ================================================================
  addItem(item: CareItem): void {
    this._items.update(list => [...list, item]);
    this.persist();
  }

  updateItem(id: string, patch: Partial<CareItem>): void {
    this._items.update(list => list.map(i => i.id === id ? { ...i, ...patch } : i));
    this.persist();
  }

  removeItem(id: string): void {
    this._items.update(list => list.filter(i => i.id !== id));
    this.persist();
  }

  cancelItem(id: string): void {
    this.updateItem(id, { status: 'cancelled', bucket: 'cancelled' });
  }

  togglePrep(id: string, prepId: string): void {
    const item = this.getItem(id);
    if (!item?.preparation) return;
    const preparation = item.preparation.map(p => p.id === prepId ? { ...p, done: !p.done } : p);
    this.updateItem(id, { preparation });
  }

  /** Advance a home/lab service one step along its lifecycle (demo simulation). */
  advanceStatus(id: string): CareStatus | null {
    const item = this.getItem(id);
    if (!item) return null;
    const flow = this.statusFlow(item.type);
    const idx = flow.indexOf(item.status);
    if (idx < 0 || idx >= flow.length - 1) return item.status;
    const next = flow[idx + 1];
    const bucket: CareBucket =
      next === 'completed' ? 'completed'
      : next === 'in_progress' || next === 'provider_on_the_way' || next === 'provider_arrived' ? 'in_progress'
      : 'upcoming';
    const patch: Partial<CareItem> = { status: next, bucket };
    // Assign a provider when we reach the "assigned" step.
    if (next === 'provider_assigned' && !item.provider) {
      patch.provider = this.mockProviderFor(item);
    }
    this.updateItem(id, patch);
    return next;
  }

  private statusFlow(type: CareItem['type']): CareStatus[] {
    if (type === 'lab_collection') {
      return ['request_received', 'confirmed', 'provider_assigning', 'provider_assigned', 'provider_on_the_way', 'in_progress', 'completed'];
    }
    if (type === 'home_care') {
      return ['request_received', 'confirmed', 'provider_assigning', 'provider_assigned', 'provider_on_the_way', 'provider_arrived', 'in_progress', 'completed'];
    }
    // video
    return ['confirmed', 'ready_to_join', 'in_progress', 'completed'];
  }

  // ================================================================
  // BOOKING BUILDERS
  // ================================================================
  private mkBase(type: CareItem['type']): Pick<CareItem, 'id' | 'patientId' | 'patientName' | 'bookingRef' | 'createdAt'> {
    return {
      id: `care_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      patientId: this.activePatientId(),
      patientName: this.activePatientName(),
      bookingRef: 'TH-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      createdAt: new Date().toISOString()
    };
  }

  /** Create an instant video consultation record after mock payment. */
  createInstantConsult(input: {
    specialty: ConsultSpecialty; language: SupportedTeleLang;
    concern: string; fee: number; paymentState: CareItem['paymentState'];
  }): CareItem {
    const provider = this.mockDoctor(input.specialty, input.language);
    const item: CareItem = {
      ...this.mkBase('video_consult'),
      type: 'video_consult',
      title: 'Video Consultation',
      subtitle: input.specialty.name,
      status: 'confirmed',
      bucket: 'upcoming',
      date: new Date().toISOString(),
      timeLabel: 'Connecting now',
      provider,
      fee: input.fee,
      paymentState: input.paymentState,
      concern: input.concern,
      language: input.language,
      preparation: [
        { id: 'c1', text: 'Sit in a private, well-lit place' },
        { id: 'c2', text: 'Check your camera and microphone' },
        { id: 'c3', text: 'Keep any relevant records ready' }
      ]
    };
    this.addItem(item);
    return item;
  }

  /** Attach an outcome to a completed video consult (drives continuity). */
  completeConsult(id: string, outcome: CareOutcome): void {
    this.updateItem(id, { status: 'completed', bucket: 'completed', outcome, timeLabel: 'Completed just now' });
  }

  createHomeCareBooking(input: {
    service: HomeCareService; address: ServiceAddress; slot: CareSlot;
    concern: string; priceLines: PriceLine[]; total: number;
    paymentState: CareItem['paymentState'];
  }): CareItem {
    const item: CareItem = {
      ...this.mkBase('home_care'),
      type: 'home_care',
      homeCareKey: input.service.key,
      title: input.service.name,
      subtitle: input.service.description,
      status: 'confirmed',
      bucket: 'upcoming',
      date: input.slot.date,
      timeLabel: input.slot.window,
      address: input.address,
      fee: input.total,
      paymentState: input.paymentState,
      priceLines: input.priceLines,
      concern: input.concern,
      preparation: input.service.preparation.map(p => ({ ...p, done: false }))
    };
    this.addItem(item);
    return item;
  }

  createLabBooking(input: {
    testCodes: string[]; address: ServiceAddress; slot: CareSlot;
    priceLines: PriceLine[]; total: number; paymentState: CareItem['paymentState'];
  }): CareItem {
    const anyFasting = input.testCodes.some(c => this.test(c)?.fasting);
    const item: CareItem = {
      ...this.mkBase('lab_collection'),
      type: 'lab_collection',
      title: 'Home Sample Collection',
      subtitle: input.testCodes.map(c => this.test(c)?.name ?? c).join(', '),
      status: 'confirmed',
      bucket: 'upcoming',
      date: input.slot.date,
      timeLabel: input.slot.window,
      address: input.address,
      fee: input.total,
      paymentState: input.paymentState,
      priceLines: input.priceLines,
      testCodes: input.testCodes,
      preparation: [
        ...(anyFasting ? [{ id: 'l1', text: 'Fast for 8–10 hours before collection. Plain water is allowed.', done: false }] : []),
        { id: 'l2', text: 'Keep your Emirates ID or hospital MRN ready', done: false },
        { id: 'l3', text: 'Inform the collector of any fainting history', done: false }
      ]
    };
    this.addItem(item);
    return item;
  }

  // ================================================================
  // TRACKING TIMELINE
  // ================================================================
  buildTimeline(item: CareItem): TrackStep[] {
    const flow = this.statusFlow(item.type);
    const currentIdx = flow.indexOf(item.status);
    const labels = this.stepLabels(item);
    return flow.map((key, i) => ({
      key,
      label: labels[key]?.label ?? key,
      patientNote: labels[key]?.note,
      state: item.status === 'cancelled' ? 'upcoming'
        : i < currentIdx ? 'done'
        : i === currentIdx ? 'current'
        : 'upcoming'
    }));
  }

  private stepLabels(item: CareItem): Record<string, { label: string; note?: string }> {
    const fasting = item.testCodes?.some(c => this.test(c)?.fasting);
    return {
      request_received: { label: 'Request received', note: 'We have received your request and are confirming it.' },
      confirmed: { label: 'Service confirmed', note: item.type === 'lab_collection' && fasting ? 'Please fast for 8–10 hours before collection. Plain water is allowed.' : 'Your booking is confirmed.' },
      provider_assigning: { label: item.type === 'lab_collection' ? 'Assigning phlebotomist' : 'Assigning provider', note: 'We are assigning a hospital-verified provider near you.' },
      provider_assigned: { label: item.type === 'lab_collection' ? 'Phlebotomist assigned' : 'Provider assigned', note: 'Your provider is confirmed. You will see their arrival window shortly.' },
      provider_on_the_way: { label: 'Provider on the way', note: 'Your provider is heading to your address.' },
      provider_arrived: { label: 'Provider arrived', note: 'Your provider has arrived at your address.' },
      in_progress: { label: item.type === 'lab_collection' ? 'Sample collection' : 'Service in progress', note: 'The service is being carried out.' },
      completed: { label: item.type === 'lab_collection' ? 'Report ready' : 'Service completed', note: item.type === 'lab_collection' ? 'Your report is available in My Records.' : 'Documentation is available in My Records.' }
    };
  }

  // ================================================================
  // MOCK PROVIDERS
  // ================================================================
  private mockDoctor(spec: ConsultSpecialty, lang: SupportedTeleLang): TeleProvider {
    const byKey: Record<string, { name: string; initials: string; exp: number }> = {
      gp:    { name: 'Dr. Sara Al Amiri',    initials: 'SA', exp: 9 },
      peds:  { name: 'Dr. Huda Kassem',      initials: 'HK', exp: 12 },
      derm:  { name: 'Dr. Layla Haddad',     initials: 'LH', exp: 8 },
      gyn:   { name: 'Dr. Mariam Yusuf',     initials: 'MY', exp: 14 },
      mind:  { name: 'Dr. Omar Sheikh',      initials: 'OS', exp: 11 },
      ortho: { name: 'Dr. Sanjay Mehta',     initials: 'SM', exp: 15 },
      cardio:{ name: 'Dr. Fatima Hassan',    initials: 'FH', exp: 16 },
      endo:  { name: 'Dr. Ahmed Hassan',     initials: 'AH', exp: 13 }
    };
    const d = byKey[spec.key] ?? byKey['gp'];
    const langs: SupportedTeleLang[] = Array.from(new Set([lang, 'English'] as SupportedTeleLang[]));
    return { name: d.name, role: 'Doctor', specialty: spec.name, experienceYears: d.exp, languages: langs, verified: true, initials: d.initials };
  }

  private mockProviderFor(item: CareItem): TeleProvider {
    if (item.type === 'lab_collection') {
      return { name: 'Reema Nair', role: 'Phlebotomist', experienceYears: 6, verified: true, initials: 'RN', arrivalWindow: item.timeLabel };
    }
    if (item.homeCareKey === 'physiotherapy') {
      return { name: 'Karan Pillai', role: 'Physiotherapist', experienceYears: 8, verified: true, initials: 'KP', arrivalWindow: item.timeLabel };
    }
    return { name: 'Anjali Menon', role: 'Registered Nurse', experienceYears: 7, verified: true, initials: 'AM', arrivalWindow: item.timeLabel };
  }

  // ================================================================
  // PRICING HELPERS
  // ================================================================
  labPrice(codes: string[]): { lines: PriceLine[]; total: number } {
    const items = codes.map(c => this.test(c)).filter((t): t is LabTest => !!t);
    const itemTotal = items.reduce((s, t) => s + t.price, 0);
    const collectionFee = 40;
    const lines: PriceLine[] = [
      ...items.map(t => ({ label: t.name, amount: t.price })),
      { label: 'Home sample collection fee', amount: collectionFee }
    ];
    return { lines, total: itemTotal + collectionFee };
  }

  homeCarePrice(service: HomeCareService): { lines: PriceLine[]; total: number } {
    const visitFee = 25;
    const tax = Math.round((service.startingPrice + visitFee) * 0.05);
    const lines: PriceLine[] = [
      { label: service.name, amount: service.startingPrice },
      { label: 'Home visit fee', amount: visitFee },
      { label: 'VAT (5%)', amount: tax }
    ];
    return { lines, total: service.startingPrice + visitFee + tax };
  }

  // ================================================================
  // DRAFT PERSISTENCE (mid-flow)
  // ================================================================
  saveDraft(patch: Partial<ConsultDraft>): void {
    this.draft.update(d => ({ ...d, ...patch }));
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(this.draft())); } catch { /* ignore */ }
  }
  clearDraft(): void {
    this.draft.set({});
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  }

  // ================================================================
  // DATE HELPERS
  // ================================================================
  addDays(n: number): { iso: string; label: string } {
    const d = new Date();
    d.setDate(d.getDate() + n);
    d.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow'
      : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    return { iso: d.toISOString(), label };
  }

  // ================================================================
  // PERSISTENCE (localStorage)
  // ================================================================
  private persist(): void {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this._items())); } catch { /* ignore */ }
  }

  private loadItems(): CareItem[] {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw) as CareItem[];
    } catch { /* ignore */ }
    return this.seed();
  }

  private loadDraft(): ConsultDraft {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) return JSON.parse(raw) as ConsultDraft;
    } catch { /* ignore */ }
    return {};
  }

  private loadDismissed(): Set<string> {
    try {
      const raw = localStorage.getItem(REC_DISMISS_KEY);
      if (raw) return new Set<string>(JSON.parse(raw));
    } catch { /* ignore */ }
    return new Set();
  }

  /** Reset the module to the demo seed (used by the "Reset demo" action). */
  resetDemo(): void {
    this._items.set(this.seed());
    this._dismissedRecs.set(new Set());
    this.clearDraft();
    this.persist();
    try { localStorage.removeItem(REC_DISMISS_KEY); } catch { /* ignore */ }
  }

  // ================================================================
  // DEMO SEED — the storyline's starting state
  //   • an upcoming General Medicine video consultation (today, 4 PM)
  //   • a couple of completed items for "Recent care"
  //   (The doctor-recommended HbA1c is a recommendation, above.)
  // ================================================================
  private seed(): CareItem[] {
    const upcomingVideo: CareItem = {
      id: 'seed_video_1',
      type: 'video_consult',
      title: 'Video Consultation',
      subtitle: 'General Medicine',
      patientId: '12345678',
      patientName: 'Aisha Rahman',
      status: 'confirmed',
      bucket: 'upcoming',
      date: this.atTimeToday(16, 0),
      timeLabel: 'Today, 4:00 PM',
      provider: { name: 'Dr. Sara Al Amiri', role: 'Doctor', specialty: 'General Medicine', experienceYears: 9, languages: ['English', 'Arabic'], verified: true, initials: 'SA' },
      fee: 90,
      paymentState: 'paid',
      concern: 'Follow-up on fever and body pain',
      language: 'English',
      bookingRef: 'TH-GM4821',
      createdAt: new Date().toISOString(),
      preparation: [
        { id: 'c1', text: 'Sit in a private, well-lit place', done: false },
        { id: 'c2', text: 'Check your camera and microphone', done: false },
        { id: 'c3', text: 'Keep any relevant records ready', done: false },
        { id: 'c4', text: 'Join five minutes early', done: false }
      ]
    };

    const completedConsult: CareItem = {
      id: 'seed_video_done',
      type: 'video_consult',
      title: 'Video Consultation',
      subtitle: 'Dermatology',
      patientId: '12345678',
      patientName: 'Aisha Rahman',
      status: 'completed',
      bucket: 'completed',
      date: this.addDaysISO(-3),
      timeLabel: 'Completed 3 days ago',
      provider: { name: 'Dr. Layla Haddad', role: 'Doctor', specialty: 'Dermatology', experienceYears: 8, languages: ['English'], verified: true, initials: 'LH' },
      fee: 130,
      paymentState: 'paid',
      language: 'English',
      bookingRef: 'TH-DM2201',
      createdAt: this.addDaysISO(-3),
      outcome: {
        summary: 'Mild contact dermatitis on the forearm. Advised a topical steroid and to avoid the suspected irritant.',
        advice: ['Apply the prescribed cream twice daily for 7 days', 'Avoid scented soaps on the area', 'Return if the rash spreads or blisters'],
        prescriptionIssued: true,
        prescriptionItems: [{ name: 'Hydrocortisone 1% cream', dosage: 'Apply thin layer', frequency: 'Twice daily', duration: '7 days' }]
      }
    };

    const completedLab: CareItem = {
      id: 'seed_lab_done',
      type: 'lab_collection',
      title: 'Home Sample Collection',
      subtitle: 'Complete Blood Count (CBC)',
      patientId: '12345678',
      patientName: 'Aisha Rahman',
      status: 'completed',
      bucket: 'completed',
      date: this.addDaysISO(-7),
      timeLabel: 'Completed last week',
      provider: { name: 'Reema Nair', role: 'Phlebotomist', experienceYears: 6, verified: true, initials: 'RN' },
      fee: 85,
      paymentState: 'paid',
      testCodes: ['CBC'],
      bookingRef: 'TH-LB1180',
      createdAt: this.addDaysISO(-7)
    };

    return [upcomingVideo, completedConsult, completedLab];
  }

  private atTimeToday(h: number, m: number): string {
    const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString();
  }
  private addDaysISO(n: number): string {
    const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString();
  }
}
