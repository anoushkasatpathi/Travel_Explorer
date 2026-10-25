// Per-destination look for the full-bleed hero "stage":
//   tint    – background colour behind the photo frame (changes as you swipe)
//   horizon – where the scenery starts (0 = top, 1 = bottom). The lower part of
//             the photo is redrawn ON TOP of the giant title from this line down,
//             so the landscape appears to sit in front of the lettering.
//
// Tints stay in the app's blue family, with warm sand tones only for desert
// places and cool blue-greys for mountains, matching the motion reference.

const BY_CATEGORY = {
  Cities: { tint: '#1C3B6E', horizon: 0.6 },
  Beaches: { tint: '#1F6F86', horizon: 0.63 },
  Mountains: { tint: '#5F7690', horizon: 0.56 },
  Heritage: { tint: '#3E5378', horizon: 0.6 },
  Adventure: { tint: '#3C4A8E', horizon: 0.58 },
};

const OVERRIDES = {
  jaisalmer: { tint: '#B07A4F', horizon: 0.62 },
  dubai: { tint: '#A9805A', horizon: 0.64 },
  jaipur: { tint: '#9A6E5C' },
  ladakh: { tint: '#6E8197', horizon: 0.55 },
  manali: { tint: '#5B7590' },
  shimla: { tint: '#5E7A8E' },
  srinagar: { tint: '#64809E' },
  darjeeling: { tint: '#4F7568' },
  munnar: { tint: '#3F6E62' },
  maldives: { tint: '#167C95', horizon: 0.66 },
  bali: { tint: '#2E6E73' },
  tokyo: { tint: '#2B3A6B', horizon: 0.62 },
  paris: { tint: '#4A5C82' },
  london: { tint: '#405274' },
  newyork: { tint: '#2C4166' },
};

export function stageStyle(d) {
  const base = BY_CATEGORY[d?.category] || BY_CATEGORY.Cities;
  return { ...base, ...(OVERRIDES[d?.id] || {}) };
}

// Big condensed title size that fits the frame width
export function fitTitleSize(text, width, max) {
  const len = Math.max(4, text.length);
  return Math.round(Math.min(max, (width * 0.92) / (len * 0.43)));
}
