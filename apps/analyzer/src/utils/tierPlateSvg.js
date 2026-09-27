/**
 * The tier plate artwork, as an SVG string.
 *
 * Why a string builder rather than JSX: the throwaway comparison page in
 * apps/analyzer/tier-preview/ is plain HTML with no build step, and a preview
 * that drifts from the shipped component is worse than no preview at all. Both
 * the React component and the preview generator call into here, so what you
 * review is what renders.
 *
 * DESIGN NOTES (the first attempt got these wrong)
 *
 * - The letter is the hero, not the plate. The plate is a small angled slab that
 *   sits BEHIND and BELOW the letter, which rises clear above it. The first pass
 *   drew a box around the whole glyph, which read as a button, not a rank.
 * - The dark keyline is painted with paint-order="stroke", so the stroke sits
 *   BEHIND the fill. CSS -webkit-text-stroke centres the stroke on the glyph
 *   edge, which at badge sizes ate most of the letter and made it unreadable.
 * - Geometry is in viewBox units and scales with the rendered box, so one
 *   definition covers every size and stays sharp.
 */

/** Dark keyline shared by every tier, as in the source art. */
const OUTLINE = '#3b2a17';

/**
 * Per-tier palette. The plate and letter share a hue so a tier reads as one
 * colour at a glance, and the five hues form a ramp a viewer can order without
 * being told which is better.
 */
export const TIER_ART = {
  // Z keeps the blue slab and red letter on purpose - it reads as the Dragon
  // Ball Z mark, and it sits apart from the ramp below rather than on it.
  // (Red and blue-to-red slabs were both tried and rejected: with a red letter
  // there is not enough separating the glyph from its own floor at small sizes.)
  //
  // The red is CRIMSON, not orange-red. The earlier pair was hue ~8-20 degrees,
  // which at pill size read as bronze rather than as the top tier - a warm metal
  // rather than a mark. These sit at ~350 degrees, cool enough to be plainly red.
  // Note this pair does three jobs at once: the glyph's gradient (light at the
  // top, deep below), the pill's text colour (the light one) and the pill's
  // border and background tint (the deep one). Judge any change on both.
  Z: { plate: ['#3a7fc4', '#1b4a84'], letter: ['#ff8fa0', '#c8102e'] },
  // S down to C: purple, gold, blue, grey. (Swapped S and A from the rarity
  // ramp's gold-then-purple to try purple as the higher tier - under review.)
  // B shares Z's blue slab, which is fine - Z is told apart by its red letter,
  // not by owning the hue.
  S: { plate: ['#8455cc', '#4c2a8a'], letter: ['#e8d4ff', '#ad7ef0'] },
  A: { plate: ['#c08a1e', '#7d5208'], letter: ['#fff1b8', '#f3c33a'] },
  B: { plate: ['#3a7fc4', '#1b4a84'], letter: ['#b9e6ff', '#3f9bd8'] },
  C: { plate: ['#767d89', '#41474f'], letter: ['#f2f4f7', '#98a0ab'] },
};

/** Rendered box for each named size. The viewBox is 120x96, a 1.25 ratio. */
export const PLATE_SIZES = {
  small: { w: 32, h: 26 },
  medium: { w: 42, h: 34 },
  large: { w: 62, h: 50 },
};

/**
 * SVG markup for one tier plate.
 *
 * `idPrefix` must be unique per rendered instance: SVG gradient ids are global to
 * the document, so two plates sharing an id would both take the first one's
 * colours.
 */
export function tierPlateSvg(tier, options = {}) {
  const {
    size = 'medium',
    provisional = false,
    deselected = false,
    idPrefix = 'tp',
    className = '',
  } = options;

  const art = TIER_ART[tier] || TIER_ART.C;
  const box = PLATE_SIZES[size] || PLATE_SIZES.medium;
  const plateId = `${idPrefix}-plate-${tier}`;
  const letterId = `${idPrefix}-letter-${tier}`;

  // The slab: a parallelogram leaning right, sitting low in the box so the
  // letter clears it. Points are top-left, top-right, bottom-right, bottom-left.
  const slab = '34,54 118,54 86,88 2,88';

  // Two different kinds of 'muted', and they must not look alike:
  //   provisional - a real tier on a thin sample, so it stays in colour but
  //                 softened, because the tier is still the reader's answer
  //   deselected  - a filter that is switched OFF, so all colour drains away;
  //                 it must read as absent, not as a weaker tier
  // NOTE: these fold into the SVG's single style attribute below. Emitting a
  // second style= would be silently dropped - the HTML parser keeps only the
  // first - which is how an earlier version left deselected plates in colour.
  let filter = 'none';
  let opacity = 1;
  if (deselected) {
    filter = 'grayscale(1) brightness(0.75) contrast(0.9)';
    opacity = 0.28;
  } else if (provisional) {
    filter = 'saturate(0.45)';
    opacity = 0.62;
  }

  return `<svg viewBox="0 0 120 96" width="${box.w}" height="${box.h}" role="img" aria-hidden="true" class="${className}" style="overflow:visible;display:block;opacity:${opacity};filter:${filter}">
  <defs>
    <linearGradient id="${plateId}" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stop-color="${art.plate[0]}"/>
      <stop offset="100%" stop-color="${art.plate[1]}"/>
    </linearGradient>
    <linearGradient id="${letterId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${art.letter[0]}"/>
      <stop offset="55%" stop-color="${art.letter[1]}"/>
      <stop offset="100%" stop-color="${art.letter[1]}"/>
    </linearGradient>
  </defs>
  <polygon points="${slab}" fill="url(#${plateId})" stroke="${OUTLINE}" stroke-width="5" stroke-linejoin="round"/>
  <text x="56" y="74"
        text-anchor="middle"
        font-family="'Arial Black','Helvetica Neue',Impact,sans-serif"
        font-size="76" font-weight="900"
        fill="url(#${letterId})"
        stroke="${OUTLINE}" stroke-width="9" stroke-linejoin="round"
        paint-order="stroke"
        style="letter-spacing:0.01em">${tier}</text>
</svg>`;
}

/**
 * Score-pill colours for a tier, derived from the SAME palette as the plate so
 * the two can never drift apart. Returns CSS colour strings.
 *
 * The pill is tinted rather than neutral because a row should read as one
 * colour; the plate carries the identity and the pill echoes it quietly.
 */
export function tierPillColors(tier) {
  const art = TIER_ART[tier] || TIER_ART.C;
  const [light, deep] = art.letter;
  return {
    background: hexToRgba(deep, 0.16),
    color: light,
    borderColor: deep,
  };
}

/** #rrggbb -> rgba(), for the pill tint. */
function hexToRgba(hex, alpha) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const [r, g, b] = [m[1], m[2], m[3]].map(h => parseInt(h, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
