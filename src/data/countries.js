// Country-level info used by the Local Essentials card and the Currency Converter.
//
// emergency:  numbers you can tap to call (always double-check locally before you travel)
// currency:   ISO code, name, symbol
// prices:     typical local prices (approximate, in the local currency) so the
//             converter can show "a street meal costs about ₹X in your currency"
// fallbackPerUSD: offline estimate used only if live rates can't be downloaded

export const COUNTRIES = {
  IN: {
    name: 'India',
    flag: '🇮🇳',
    currency: { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    emergency: [
      { label: 'All emergencies', number: '112', icon: 'shield-alert-outline' },
      { label: 'Police', number: '100', icon: 'police-badge-outline' },
      { label: 'Ambulance', number: '108', icon: 'ambulance' },
      { label: 'Fire', number: '101', icon: 'fire-truck' },
      { label: 'Women helpline', number: '1091', icon: 'face-woman-outline' },
      { label: 'Tourist helpline (24×7)', number: '1800111363', display: '1800-11-1363', icon: 'information-outline' },
    ],
    prices: [
      { label: 'Street-food meal', amount: 150, icon: 'food' },
      { label: 'Restaurant meal', amount: 500, icon: 'silverware-fork-knife' },
      { label: 'Cup of coffee', amount: 150, icon: 'coffee-outline' },
      { label: 'Short taxi / auto ride', amount: 200, icon: 'taxi' },
    ],
  },
  AE: {
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    currency: { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
    emergency: [
      { label: 'Police', number: '999', icon: 'police-badge-outline' },
      { label: 'Ambulance', number: '998', icon: 'ambulance' },
      { label: 'Fire', number: '997', icon: 'fire-truck' },
      { label: 'Dubai Police (non-emergency)', number: '901', icon: 'information-outline' },
    ],
    prices: [
      { label: 'Casual meal', amount: 40, icon: 'food' },
      { label: 'Restaurant meal', amount: 120, icon: 'silverware-fork-knife' },
      { label: 'Cup of coffee', amount: 20, icon: 'coffee-outline' },
      { label: 'Metro ride', amount: 5, icon: 'train' },
    ],
  },
  SG: {
    name: 'Singapore',
    flag: '🇸🇬',
    currency: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    emergency: [
      { label: 'Police', number: '999', icon: 'police-badge-outline' },
      { label: 'Ambulance & Fire', number: '995', icon: 'ambulance' },
      { label: 'Non-emergency ambulance', number: '1777', icon: 'information-outline' },
    ],
    prices: [
      { label: 'Hawker-centre meal', amount: 6, icon: 'food' },
      { label: 'Restaurant meal', amount: 30, icon: 'silverware-fork-knife' },
      { label: 'Cup of coffee', amount: 6, icon: 'coffee-outline' },
      { label: 'MRT ride', amount: 2, icon: 'train' },
    ],
  },
  TH: {
    name: 'Thailand',
    flag: '🇹🇭',
    currency: { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    emergency: [
      { label: 'Tourist Police', number: '1155', icon: 'information-outline' },
      { label: 'Police', number: '191', icon: 'police-badge-outline' },
      { label: 'Ambulance', number: '1669', icon: 'ambulance' },
      { label: 'Fire', number: '199', icon: 'fire-truck' },
    ],
    prices: [
      { label: 'Street-food meal', amount: 70, icon: 'food' },
      { label: 'Restaurant meal', amount: 350, icon: 'silverware-fork-knife' },
      { label: 'Cup of coffee', amount: 80, icon: 'coffee-outline' },
      { label: 'BTS Skytrain ride', amount: 40, icon: 'train' },
    ],
  },
  ID: {
    name: 'Indonesia',
    flag: '🇮🇩',
    currency: { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
    emergency: [
      { label: 'All emergencies', number: '112', icon: 'shield-alert-outline' },
      { label: 'Police', number: '110', icon: 'police-badge-outline' },
      { label: 'Ambulance', number: '118', icon: 'ambulance' },
      { label: 'Fire', number: '113', icon: 'fire-truck' },
    ],
    prices: [
      { label: 'Local warung meal', amount: 40000, icon: 'food' },
      { label: 'Restaurant meal', amount: 150000, icon: 'silverware-fork-knife' },
      { label: 'Cup of coffee', amount: 35000, icon: 'coffee-outline' },
      { label: 'Scooter rental (per day)', amount: 80000, icon: 'moped' },
    ],
  },
  MV: {
    name: 'Maldives',
    flag: '🇲🇻',
    currency: { code: 'MVR', name: 'Maldivian Rufiyaa', symbol: 'MVR' },
    emergency: [
      { label: 'Police', number: '119', icon: 'police-badge-outline' },
      { label: 'Ambulance', number: '102', icon: 'ambulance' },
      { label: 'Fire', number: '118', icon: 'fire-truck' },
    ],
    prices: [
      { label: 'Local café meal', amount: 150, icon: 'food' },
      { label: 'Resort meal', amount: 900, icon: 'silverware-fork-knife' },
      { label: 'Cup of coffee', amount: 60, icon: 'coffee-outline' },
      { label: 'Public ferry ride', amount: 30, icon: 'ferry' },
    ],
  },
  FR: {
    name: 'France',
    flag: '🇫🇷',
    currency: { code: 'EUR', name: 'Euro', symbol: '€' },
    emergency: [
      { label: 'All emergencies', number: '112', icon: 'shield-alert-outline' },
      { label: 'Medical (SAMU)', number: '15', icon: 'ambulance' },
      { label: 'Police', number: '17', icon: 'police-badge-outline' },
      { label: 'Fire', number: '18', icon: 'fire-truck' },
    ],
    prices: [
      { label: 'Bakery lunch', amount: 10, icon: 'food' },
      { label: 'Restaurant meal', amount: 25, icon: 'silverware-fork-knife' },
      { label: 'Cup of coffee', amount: 3, icon: 'coffee-outline' },
      { label: 'Métro ticket', amount: 2.5, icon: 'train' },
    ],
  },
  GB: {
    name: 'United Kingdom',
    flag: '🇬🇧',
    currency: { code: 'GBP', name: 'British Pound', symbol: '£' },
    emergency: [
      { label: 'All emergencies', number: '999', icon: 'shield-alert-outline' },
      { label: 'Emergency (EU number)', number: '112', icon: 'shield-alert-outline' },
      { label: 'NHS non-urgent medical', number: '111', icon: 'medical-bag' },
      { label: 'Police non-emergency', number: '101', icon: 'police-badge-outline' },
    ],
    prices: [
      { label: 'Meal deal / takeaway', amount: 8, icon: 'food' },
      { label: 'Restaurant meal', amount: 25, icon: 'silverware-fork-knife' },
      { label: 'Cup of coffee', amount: 3.5, icon: 'coffee-outline' },
      { label: 'Tube ride (zone 1)', amount: 3, icon: 'train' },
    ],
  },
  US: {
    name: 'United States',
    flag: '🇺🇸',
    currency: { code: 'USD', name: 'US Dollar', symbol: '$' },
    emergency: [
      { label: 'All emergencies', number: '911', icon: 'shield-alert-outline' },
      { label: 'NYC city services (non-emergency)', number: '311', icon: 'information-outline' },
    ],
    prices: [
      { label: 'Slice of pizza / street food', amount: 5, icon: 'food' },
      { label: 'Restaurant meal', amount: 35, icon: 'silverware-fork-knife' },
      { label: 'Cup of coffee', amount: 5, icon: 'coffee-outline' },
      { label: 'Subway ride', amount: 3, icon: 'train' },
    ],
  },
  JP: {
    name: 'Japan',
    flag: '🇯🇵',
    currency: { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    emergency: [
      { label: 'Police', number: '110', icon: 'police-badge-outline' },
      { label: 'Fire & Ambulance', number: '119', icon: 'ambulance' },
      { label: 'Japan Visitor Hotline (24×7)', number: '05038162787', display: '050-3816-2787', icon: 'information-outline' },
    ],
    prices: [
      { label: 'Ramen / convenience-store meal', amount: 1000, icon: 'food' },
      { label: 'Restaurant meal', amount: 3000, icon: 'silverware-fork-knife' },
      { label: 'Cup of coffee', amount: 500, icon: 'coffee-outline' },
      { label: 'Metro ride', amount: 200, icon: 'train' },
    ],
  },
};

// Currencies the user can convert into ("your currency")
export const HOME_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY', 'AUD', 'CAD', 'THB', 'IDR', 'MVR'];

export const CURRENCY_SYMBOLS = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED', SGD: 'S$', JPY: '¥',
  AUD: 'A$', CAD: 'C$', THB: '฿', IDR: 'Rp', MVR: 'MVR',
};

// Offline estimates (units per 1 USD). Only used if the live rate request fails.
export const FALLBACK_PER_USD = {
  USD: 1, INR: 88, EUR: 0.86, GBP: 0.75, AED: 3.6725, SGD: 1.29, JPY: 150,
  AUD: 1.52, CAD: 1.38, THB: 32.5, IDR: 16400, MVR: 15.42,
};

export function getCountry(code) {
  return COUNTRIES[code] || COUNTRIES.IN;
}
