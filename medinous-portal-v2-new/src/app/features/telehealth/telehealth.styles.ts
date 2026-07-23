// =====================================================================
// TELEHEALTH — SHARED STYLES
//
// One design language across every Telehealth screen. Mirrors the portal
// tokens (indigo primary, teal/green confirmed, amber attention, red
// urgent) so the module never looks like a bolt-on. Spread into each
// component's `styles: []` array alongside its own screen-specific rules.
//
// Colour intent (per spec §20):
//   blue  #1565c0 / indigo #1a237e  → primary actions
//   teal  #00897b / green #2e7d32   → confirmed / completed
//   amber #ef6c00                   → preparation / attention
//   red   #c62828                   → urgent warnings / failures
// =====================================================================

export const TELE_STYLES = `
  :host { display: block; }

  /* ---- Page shell ---- */
  .th-page {
    max-width: 920px; margin: 0 auto;
    padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  }
  .th-wrap { padding: 0 2px; }

  /* ---- Header (back • title • help) ---- */
  .th-head {
    display: flex; align-items: center; gap: 10px;
    padding: 4px 0 14px;
  }
  .th-back, .th-help {
    width: 40px; height: 40px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    background: white; border: 1px solid #eceff1; color: #1a237e;
    cursor: pointer; flex-shrink: 0; transition: all .15s;
  }
  .th-back:hover, .th-help:hover { border-color: #c5cae9; background: #f6f8fc; }
  .th-head-titles { flex: 1; min-width: 0; }
  .th-head-titles h1 { font-size: 20px; font-weight: 700; color: #1a237e; margin: 0; letter-spacing: -.01em; }
  .th-head-titles p { font-size: 13px; color: #607d8b; margin: 2px 0 0; }

  /* ---- Family selector pill ---- */
  .th-care-for {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 12px; border-radius: 12px;
    background: #eef0fb; border: 1px solid #d7dcf5;
    color: #1a237e; font-size: 13px; font-weight: 600;
    cursor: pointer; margin-bottom: 18px; transition: all .15s;
  }
  .th-care-for:hover { background: #e3e7f8; }
  .th-care-for mat-icon { font-size: 18px; width: 18px; height: 18px; }
  .th-care-for .cf-avatar {
    width: 24px; height: 24px; border-radius: 50%;
    background: linear-gradient(135deg, #1a237e, #3949ab);
    color: white; font-size: 10px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }

  /* ---- Section heading ---- */
  .th-section { margin-bottom: 26px; }
  .th-sec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 12px; }
  .th-section h2 { font-size: 16px; font-weight: 600; color: #1b3a4b; margin: 0; }
  .th-sec-sub { font-size: 12px; color: #90a4ae; margin: 2px 0 0; }
  .th-sec-link {
    display: inline-flex; align-items: center; gap: 4px;
    color: #1a237e; font-size: 13px; font-weight: 600;
    text-decoration: none; background: none; border: none; cursor: pointer;
  }
  .th-sec-link mat-icon { font-size: 16px; width: 16px; height: 16px; }

  /* ---- Generic card ---- */
  .th-card {
    background: white; border: 1px solid #eceff1; border-radius: 16px;
    padding: 16px;
  }

  /* ---- Service choice cards (big three) ---- */
  .th-choice {
    display: flex; align-items: center; gap: 14px;
    padding: 16px; background: white;
    border: 1px solid #eceff1; border-radius: 16px;
    text-align: left; font: inherit; color: inherit; width: 100%;
    cursor: pointer; transition: all .15s;
  }
  .th-choice:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.06); border-color: #c5cae9; }
  .th-choice-icon {
    width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .th-choice-icon mat-icon { color: white; font-size: 26px; width: 26px; height: 26px; }
  .th-choice-body { flex: 1; min-width: 0; }
  .th-choice-body strong { display: block; font-size: 15px; color: #1b3a4b; }
  .th-choice-body span { font-size: 12.5px; color: #607d8b; }
  .th-choice-arrow { color: #cfd8dc; flex-shrink: 0; }

  /* ---- Status chips ---- */
  .th-chip {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 10px;
    font-size: 11px; font-weight: 700; letter-spacing: .02em;
  }
  .th-chip mat-icon { font-size: 13px; width: 13px; height: 13px; }
  .chip-confirmed { background: #e0f2f1; color: #00695c; }
  .chip-progress  { background: #e8eaf6; color: #3949ab; }
  .chip-attention { background: #fff3e0; color: #e65100; }
  .chip-ready     { background: #e8f5e9; color: #2e7d32; }
  .chip-completed { background: #eceff1; color: #546e7a; }
  .chip-cancelled { background: #fdecea; color: #c62828; }
  .chip-video     { background: #e0f2f1; color: #00897b; }

  /* ---- Verified provider badge ---- */
  .th-verified {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 11px; font-weight: 700; color: #2e7d32;
  }
  .th-verified mat-icon { font-size: 14px; width: 14px; height: 14px; }

  /* ---- Buttons ---- */
  .th-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    height: 46px; padding: 0 20px; border-radius: 12px;
    font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
    border: 1px solid transparent; transition: all .15s; text-decoration: none;
  }
  .th-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
  .th-btn-primary { background: #1565c0; color: white; }
  .th-btn-primary:hover { background: #0d47a1; }
  .th-btn-primary:disabled { background: #cfd8dc; color: #eceff1; cursor: not-allowed; }
  .th-btn-teal { background: #00897b; color: white; }
  .th-btn-teal:hover { background: #00796b; }
  .th-btn-ghost { background: white; color: #1a237e; border-color: #d7dcf5; }
  .th-btn-ghost:hover { background: #f6f8fc; }
  .th-btn-danger { background: white; color: #c62828; border-color: #ffcdd2; }
  .th-btn-danger:hover { background: #fff5f5; }
  .th-btn-block { width: 100%; }

  /* ---- Sticky footer CTA ---- */
  .th-sticky {
    position: sticky; bottom: 0; left: 0; right: 0; z-index: 20;
    margin: 16px -2px 0; padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
    background: linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 24%);
  }
  .th-sticky-inner {
    max-width: 916px; margin: 0 auto;
    display: flex; align-items: center; gap: 12px;
  }
  .th-sticky-price { flex-shrink: 0; }
  .th-sticky-price .sp-label { font-size: 11px; color: #90a4ae; display: block; }
  .th-sticky-price .sp-amount { font-size: 18px; font-weight: 700; color: #1b3a4b; }

  /* ---- Wizard stepper ---- */
  .th-steps { display: flex; align-items: center; gap: 6px; margin-bottom: 20px; }
  .th-step-dot { flex: 1; height: 4px; border-radius: 2px; background: #eceff1; transition: background .2s; }
  .th-step-dot.on { background: #1565c0; }
  .th-step-label { font-size: 12px; color: #90a4ae; font-weight: 600; margin-bottom: 4px; }

  /* ---- Selectable option rows (specialty, language, slot, address) ---- */
  .th-option {
    display: flex; align-items: center; gap: 12px;
    padding: 14px; background: white;
    border: 1.5px solid #eceff1; border-radius: 14px;
    text-align: left; font: inherit; color: inherit; width: 100%;
    cursor: pointer; transition: all .15s;
  }
  .th-option:hover { border-color: #c5cae9; }
  .th-option.sel { border-color: #1565c0; background: #f3f8ff; }
  .th-option-icon {
    width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .th-option-icon mat-icon { color: white; font-size: 22px; width: 22px; height: 22px; }
  .th-option-body { flex: 1; min-width: 0; }
  .th-option-body strong { display: block; font-size: 14px; color: #1b3a4b; }
  .th-option-body span { font-size: 12px; color: #607d8b; }
  .th-option-check { color: #1565c0; flex-shrink: 0; }

  /* ---- Grids ---- */
  .th-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .th-stack { display: flex; flex-direction: column; gap: 10px; }

  /* ---- Fields ---- */
  .th-field { margin-bottom: 14px; }
  .th-label { display: block; font-size: 13px; font-weight: 600; color: #455a64; margin-bottom: 6px; }
  .th-label .opt { color: #b0bec5; font-weight: 500; }
  .th-input, .th-textarea, .th-select {
    width: 100%; box-sizing: border-box; padding: 12px 14px;
    border: 1px solid #e0e4ea; border-radius: 12px;
    font: inherit; font-size: 14px; color: #1b3a4b; background: white;
  }
  .th-input:focus, .th-textarea:focus, .th-select:focus { outline: none; border-color: #1565c0; }
  .th-textarea { resize: vertical; min-height: 84px; }

  /* ---- Chips row ---- */
  .th-pills { display: flex; flex-wrap: wrap; gap: 8px; }
  .th-pill {
    padding: 8px 14px; border-radius: 20px;
    border: 1.5px solid #e0e4ea; background: white;
    color: #455a64; font: inherit; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all .15s;
  }
  .th-pill:hover { border-color: #c5cae9; }
  .th-pill.on { background: #eef0fb; border-color: #1565c0; color: #1565c0; }

  /* ---- Price breakdown ---- */
  .th-price-lines { display: flex; flex-direction: column; gap: 8px; }
  .th-price-row { display: flex; justify-content: space-between; font-size: 13.5px; color: #455a64; }
  .th-price-row.discount { color: #2e7d32; }
  .th-price-total {
    display: flex; justify-content: space-between; align-items: baseline;
    margin-top: 10px; padding-top: 12px; border-top: 1px dashed #e0e4ea;
  }
  .th-price-total strong { font-size: 16px; color: #1b3a4b; }
  .th-price-total .tt { font-size: 20px; font-weight: 700; color: #1565c0; }

  /* ---- Info / warning banners ---- */
  .th-banner {
    display: flex; gap: 12px; padding: 14px;
    border-radius: 14px; margin-bottom: 16px;
  }
  .th-banner mat-icon { flex-shrink: 0; }
  .th-banner .b-body { min-width: 0; }
  .th-banner .b-body strong { display: block; font-size: 14px; margin-bottom: 2px; }
  .th-banner .b-body span { font-size: 13px; line-height: 1.5; }
  .banner-info    { background: #f3f8ff; border: 1px solid #d0e3ff; }
  .banner-info mat-icon, .banner-info strong { color: #1565c0; }
  .banner-info span { color: #37474f; }
  .banner-amber   { background: #fff8ef; border: 1px solid #ffe0b2; }
  .banner-amber mat-icon, .banner-amber strong { color: #e65100; }
  .banner-amber span { color: #6d4c41; }
  .banner-teal    { background: #effcfa; border: 1px solid #b2dfdb; }
  .banner-teal mat-icon, .banner-teal strong { color: #00897b; }
  .banner-teal span { color: #37474f; }
  .banner-red     { background: #fff5f5; border: 1px solid #ffcdd2; }
  .banner-red mat-icon, .banner-red strong { color: #c62828; }
  .banner-red span { color: #6d4c41; }

  /* ---- Empty state ---- */
  .th-empty { text-align: center; padding: 48px 20px; color: #90a4ae; }
  .th-empty mat-icon { font-size: 44px; width: 44px; height: 44px; color: #cfd8dc; margin-bottom: 8px; }
  .th-empty p { margin: 4px 0 0; font-size: 14px; }

  /* ---- Provider row ---- */
  .th-provider { display: flex; align-items: center; gap: 12px; }
  .th-prov-avatar {
    width: 46px; height: 46px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #00897b, #26a69a);
    color: white; font-weight: 700; font-size: 15px;
    display: flex; align-items: center; justify-content: center;
  }
  .th-prov-body { flex: 1; min-width: 0; }
  .th-prov-body strong { font-size: 14px; color: #1b3a4b; display: block; }
  .th-prov-body .pr-role { font-size: 12px; color: #607d8b; }

  /* ---- Responsive ---- */
  @media (max-width: 600px) {
    .th-grid-2 { grid-template-columns: 1fr; }
    .th-head-titles h1 { font-size: 18px; }
  }
`;
