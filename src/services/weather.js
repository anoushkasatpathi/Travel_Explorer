// Real-time weather.
//
// Primary source: OpenWeather (https://openweathermap.org/api)
//   - Current weather:  /data/2.5/weather
//   - 5-day forecast:   /data/2.5/forecast (3-hour steps, grouped into days here)
//   Your key is read from the EXPO_PUBLIC_OPENWEATHER_API_KEY environment variable
//   (put it in a .env file in the project root, see .env.example).
//
// Fallback: Open-Meteo (free, no key). Used when no key is set, the key is
// invalid/not active yet, or OpenWeather is unreachable, so the app never breaks.
//
// Results are cached for 10 minutes per location and identical requests are
// shared, so many cards showing the same city only cost one API call.

const OW_KEY = (process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || '').trim();
export const hasOpenWeatherKey = OW_KEY.length > 0 && OW_KEY !== 'your_openweather_api_key_here';

const TTL = 10 * 60 * 1000;
const cache = new Map(); // key -> { at, data }
const inflight = new Map(); // key -> Promise
let keyRejected = false; // set if OpenWeather says the key is invalid (401)

// ---------- condition -> label + MaterialCommunityIcons icon ----------
// OpenWeather condition ids: https://openweathermap.org/weather-conditions
export function describeOpenWeather(id, isNight) {
  if (id >= 200 && id < 300) return { label: 'Thunderstorm', icon: 'weather-lightning-rainy' };
  if (id >= 300 && id < 400) return { label: 'Drizzle', icon: 'weather-rainy' };
  if (id >= 500 && id < 600) return { label: id >= 502 ? 'Heavy rain' : 'Rain', icon: 'weather-pouring' };
  if (id >= 600 && id < 700) return { label: 'Snow', icon: 'weather-snowy' };
  if (id >= 700 && id < 800) return { label: id === 781 ? 'Tornado' : 'Haze / mist', icon: 'weather-fog' };
  if (id === 800) return { label: 'Clear sky', icon: isNight ? 'weather-night' : 'weather-sunny' };
  if (id === 801 || id === 802) return { label: 'Partly cloudy', icon: isNight ? 'weather-night-partly-cloudy' : 'weather-partly-cloudy' };
  return { label: 'Cloudy', icon: 'weather-cloudy' };
}

// Open-Meteo uses WMO codes
export function describeWmo(code, isNight) {
  if (code === 0) return { label: 'Clear sky', icon: isNight ? 'weather-night' : 'weather-sunny' };
  if (code === 1 || code === 2) return { label: 'Partly cloudy', icon: isNight ? 'weather-night-partly-cloudy' : 'weather-partly-cloudy' };
  if (code === 3) return { label: 'Overcast', icon: 'weather-cloudy' };
  if (code === 45 || code === 48) return { label: 'Fog', icon: 'weather-fog' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: 'weather-rainy' };
  if (code >= 61 && code <= 67) return { label: 'Rain', icon: 'weather-pouring' };
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: 'weather-snowy' };
  if (code >= 80 && code <= 82) return { label: 'Rain showers', icon: 'weather-pouring' };
  if (code === 85 || code === 86) return { label: 'Snow showers', icon: 'weather-snowy-heavy' };
  if (code >= 95) return { label: 'Thunderstorm', icon: 'weather-lightning-rainy' };
  return { label: 'Unknown', icon: 'weather-cloudy-alert' };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function dayLabel(isoDate, todayIso) {
  if (isoDate === todayIso) return 'Today';
  const d = new Date(`${isoDate}T12:00:00Z`);
  return WEEKDAYS[d.getUTCDay()];
}

// ---------- OpenWeather ----------
async function fromOpenWeather({ lat, lon }) {
  const q = `lat=${lat}&lon=${lon}&units=metric&appid=${OW_KEY}`;
  const [curRes, fcRes] = await Promise.all([
    fetch(`https://api.openweathermap.org/data/2.5/weather?${q}`),
    fetch(`https://api.openweathermap.org/data/2.5/forecast?${q}`),
  ]);
  if (curRes.status === 401 || fcRes.status === 401) {
    keyRejected = true;
    throw new Error('OpenWeather rejected the API key (401). New keys can take up to a couple of hours to activate.');
  }
  if (!curRes.ok) throw new Error(`OpenWeather error ${curRes.status}`);
  const cur = await curRes.json();
  const fc = fcRes.ok ? await fcRes.json() : null;

  const tz = cur.timezone || 0; // seconds offset from UTC for that city
  const now = cur.dt || Date.now() / 1000;
  const isNight = cur.sys ? now < cur.sys.sunrise || now > cur.sys.sunset : false;
  const w = cur.weather?.[0] || {};
  const desc = describeOpenWeather(w.id, isNight);

  const current = {
    temp: Math.round(cur.main.temp),
    feelsLike: Math.round(cur.main.feels_like),
    humidity: cur.main.humidity,
    wind: Math.round((cur.wind?.speed || 0) * 3.6), // m/s -> km/h
    label: w.description ? w.description.charAt(0).toUpperCase() + w.description.slice(1) : desc.label,
    icon: desc.icon,
    sunrise: cur.sys?.sunrise ? (cur.sys.sunrise + tz) * 1000 : null,
    sunset: cur.sys?.sunset ? (cur.sys.sunset + tz) * 1000 : null,
  };

  // Group 3-hourly forecast into days (in the city's local time)
  let forecast = [];
  if (fc?.list?.length) {
    const cityTz = fc.city?.timezone ?? tz;
    const todayIso = new Date((now + cityTz) * 1000).toISOString().slice(0, 10);
    const byDay = new Map();
    fc.list.forEach((item) => {
      const local = new Date((item.dt + cityTz) * 1000);
      const iso = local.toISOString().slice(0, 10);
      const hour = local.getUTCHours();
      const entry = byDay.get(iso) || { iso, min: Infinity, max: -Infinity, pick: null, pickDist: 99, pop: 0 };
      entry.min = Math.min(entry.min, item.main.temp_min);
      entry.max = Math.max(entry.max, item.main.temp_max);
      entry.pop = Math.max(entry.pop, item.pop || 0);
      const dist = Math.abs(hour - 13); // prefer the early-afternoon reading for the icon
      if (dist < entry.pickDist) {
        entry.pick = item;
        entry.pickDist = dist;
      }
      byDay.set(iso, entry);
    });
    forecast = [...byDay.values()].slice(0, 5).map((e) => ({
      key: e.iso,
      day: dayLabel(e.iso, todayIso),
      min: Math.round(e.min),
      max: Math.round(e.max),
      rain: Math.round(e.pop * 100),
      ...describeOpenWeather(e.pick?.weather?.[0]?.id ?? 800, false),
    }));
  }

  return { current, forecast, source: 'OpenWeather' };
}

// ---------- Open-Meteo fallback ----------
async function fromOpenMeteo({ lat, lon }) {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset' +
    '&timezone=auto&forecast_days=5';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`);
  const j = await res.json();
  const c = j.current;
  const desc = describeWmo(c.weather_code, c.is_day === 0);
  const todayIso = j.daily?.time?.[0];
  return {
    current: {
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      wind: Math.round(c.wind_speed_10m),
      ...desc,
      sunrise: j.daily?.sunrise?.[0] ? Date.parse(`${j.daily.sunrise[0]}Z`) : null,
      sunset: j.daily?.sunset?.[0] ? Date.parse(`${j.daily.sunset[0]}Z`) : null,
    },
    forecast: (j.daily?.time || []).map((iso, i) => ({
      key: iso,
      day: dayLabel(iso, todayIso),
      min: Math.round(j.daily.temperature_2m_min[i]),
      max: Math.round(j.daily.temperature_2m_max[i]),
      rain: j.daily.precipitation_probability_max?.[i] ?? 0,
      ...describeWmo(j.daily.weather_code[i], false),
    })),
    source: 'Open-Meteo',
  };
}

// ---------- public API ----------
export async function getWeather(coords) {
  const key = `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    let data;
    let note = null;
    if (hasOpenWeatherKey && !keyRejected) {
      try {
        data = await fromOpenWeather(coords);
      } catch (e) {
        note = e.message;
        console.warn('OpenWeather failed, falling back to Open-Meteo:', e.message);
      }
    }
    if (!data) data = await fromOpenMeteo(coords);
    data = { ...data, note, fetchedAt: Date.now() };
    cache.set(key, { at: Date.now(), data });
    return data;
  })();

  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}

// Format a "city local time" timestamp (already shifted) as HH:MM
export function formatLocalTime(ms) {
  if (!ms) return '–';
  const d = new Date(ms);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
