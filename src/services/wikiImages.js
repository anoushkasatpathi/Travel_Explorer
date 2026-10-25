// Fetches photo URLs for a list of Wikipedia article titles in ONE request
// (the MediaWiki API accepts up to 50 titles at once). Free, no API key.
//
// Returns: { [requestedTitle]: { thumb, large } }
//   thumb -> ~800px wide, used for cards and lists
//   large -> up to ~1600px wide, used by the attraction gallery

import { Platform } from 'react-native';

const API = 'https://en.wikipedia.org/w/api.php';

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// Pick a high-resolution URL without downloading a huge original file.
function largeUrl(thumb, original) {
  const isBitmap = original && /\.(jpe?g|png|webp)$/i.test(original.source);
  if (isBitmap && original.width && original.width <= 2000) return original.source;
  // Wikimedia thumbnail URLs end in ".../800px-File.jpg"; ask for 1600px instead.
  if (thumb) return thumb.replace(/\/\d+px-([^/]+)$/, '/1600px-$1');
  return null;
}

export async function fetchWikiImages(titles, thumbSize = 800) {
  const result = {};

  for (const group of chunk(titles, 50)) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      prop: 'pageimages',
      piprop: 'thumbnail|original',
      pithumbsize: String(thumbSize),
      redirects: '1', // follow renamed articles, e.g. "Baga Beach" -> "Baga, Goa"
      origin: '*', // needed for CORS when running on the web
      titles: group.join('|'),
    });

    const headers =
      Platform.OS === 'web' ? {} : { 'Api-User-Agent': 'TravelExplorer/1.0 (GDGC student project)' };

    const res = await fetch(`${API}?${params.toString()}`, { headers });
    if (!res.ok) throw new Error(`Wikipedia API error ${res.status}`);
    const data = await res.json();
    const q = data.query || {};

    // The API may normalise or redirect titles, so map them back to what we asked for.
    const normalized = Object.fromEntries((q.normalized || []).map((n) => [n.from, n.to]));
    const redirects = Object.fromEntries((q.redirects || []).map((r) => [r.from, r.to]));
    const byTitle = {};
    (q.pages || []).forEach((p) => {
      const thumb = p.thumbnail?.source;
      if (thumb) byTitle[p.title] = { thumb, large: largeUrl(thumb, p.original) || thumb };
    });

    group.forEach((title) => {
      let finalTitle = normalized[title] || title;
      finalTitle = redirects[finalTitle] || finalTitle;
      if (byTitle[finalTitle]) result[title] = byTitle[finalTitle];
    });
  }

  return result;
}
