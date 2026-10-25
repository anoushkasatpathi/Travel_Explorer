// Extension 1: Smart Destination Matcher.
// Each destination gets a score out of 100 based on the user's answers:
//   trip style  -> 40 pts (main category) or 20 pts (secondary tag)
//   budget      -> 25 pts if the trip's approx. cost fits, 12 pts if slightly over
//   trip length -> 20 pts if the destination's ideal number of days fits
//   season      -> 15 pts if this month is a good time to visit

import { destinations, isAbroad } from '../data/destinations';

export const TRIP_TYPES = [
  { key: 'relax', label: 'Beach & relax', icon: 'beach', category: 'Beaches' },
  { key: 'nature', label: 'Mountains', icon: 'image-filter-hdr', category: 'Mountains' },
  { key: 'culture', label: 'History & culture', icon: 'castle', category: 'Heritage' },
  { key: 'thrill', label: 'Adventure', icon: 'hiking', category: 'Adventure' },
  { key: 'city', label: 'City break', icon: 'city-variant-outline', category: 'Cities' },
];

export const WHERE = [
  { key: 'all', label: 'Anywhere', icon: 'earth' },
  { key: 'india', label: 'In India', icon: 'map-marker-radius-outline' },
  { key: 'abroad', label: 'Abroad', icon: 'airplane-takeoff' },
];

export const DURATIONS = [
  { key: 'weekend', label: 'Weekend', hint: '1–3 days', range: [1, 3] },
  { key: 'short', label: 'Short trip', hint: '4–6 days', range: [4, 6] },
  { key: 'long', label: 'Long trip', hint: '7+ days', range: [7, 30] },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function matchDestinations({ tripType, budget, duration, where = 'all' }, month = new Date().getMonth() + 1) {
  const type = TRIP_TYPES.find((t) => t.key === tripType);
  const range = DURATIONS.find((d) => d.key === duration)?.range;

  return destinations
    .filter((d) => where === 'all' || (where === 'abroad' ? isAbroad(d) : !isAbroad(d)))
    .map((d) => {
      let score = 0;
      const reasons = [];

      if (type) {
        if (d.category === type.category) {
          score += 40;
          reasons.push(`${type.label} pick`);
        } else if (d.tags.includes(type.key)) {
          score += 20;
          reasons.push(`Also good for ${type.label.toLowerCase()}`);
        }
      }

      // budget is a rupee amount per person (from the train slider)
      if (budget) {
        const cost = `~₹${Math.round(d.approxCost / 1000)}k`;
        if (d.approxCost <= budget) {
          score += 25;
          reasons.push(`Fits your budget (${cost})`);
        } else if (d.approxCost <= budget * 1.25) {
          score += 12;
          reasons.push(`Slightly over budget (${cost})`);
        }
      }

      if (range) {
        const [min, max] = d.idealDays;
        if (min <= range[1] && max >= range[0]) {
          score += 20;
          reasons.push(`${min}–${max} days is ideal`);
        }
      }

      if (d.bestMonths.includes(month)) {
        score += 15;
        reasons.push(`In season (${MONTHS[month - 1]})`);
      }

      const styleMatches = !type || d.category === type.category || d.tags.includes(type.key);
      return { destination: d, score, reasons, styleMatches };
    })
    // If a trip style was picked, only show places that suit it.
    // Also ignore places that only match on season.
    .filter((r) => r.styleMatches && r.score > 15)
    .sort((a, b) => b.score - a.score);
}
