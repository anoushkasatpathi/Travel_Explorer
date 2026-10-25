import { CURRENCY_SYMBOLS } from '../data/countries';

// Currencies that are normally shown without decimals
const NO_DECIMALS = ['JPY', 'IDR', 'INR'];

// precise: true is used for exchange rates ("1 THB = ₹2.71"), where small
// values need more decimals than prices do.
export function formatMoney(amount, code, { precise = false } = {}) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '–';
  const symbol = CURRENCY_SYMBOLS[code] || code;
  const abs = Math.abs(amount);
  let digits;
  if (precise) digits = abs >= 100 ? 2 : abs >= 1 ? 3 : 4;
  else if (Number.isInteger(amount) || abs >= 1000 || NO_DECIMALS.includes(code)) digits = 0;
  else digits = abs < 1 ? 3 : 2;
  let text;
  try {
    text = amount.toLocaleString(code === 'INR' ? 'en-IN' : 'en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  } catch {
    text = amount.toFixed(digits);
  }
  const spacer = symbol.length > 2 ? ' ' : '';
  return `${symbol}${spacer}${text}`;
}

// Parse what the user typed ("1,500.50" -> 1500.5)
export function parseAmount(text) {
  const n = parseFloat(String(text).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
