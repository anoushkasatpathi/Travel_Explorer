// Central place for colours, spacing and category styling.
// Everything uses shades of blue. There are two palettes (light + dark);
// screens read the active one with the useTheme() hook (src/context/ThemeContext.js).

export const lightColors = {
  bg: '#F2F6FC',
  card: '#FFFFFF',
  ink: '#0E2340',
  muted: '#62748C',
  line: '#DAE4F1',
  accent: '#1D6FE0',
  accentSoft: '#E2EDFD',
  accentDeep: '#0F3E8C',
  heart: '#E23B5A',
  heartSoft: '#FDE8EC',
  success: '#0E9FB8', // ticks / progress (teal-blue)
  white: '#FFFFFF',
  overlay: 'rgba(255,255,255,0.92)', // round buttons drawn on top of photos
  footer: 'rgba(242,246,252,0.96)',
  tabBar: '#FFFFFF',
  sidebar: '#0E2A55',
  sidebarInk: '#C9D8F0',
  sidebarActive: '#1D6FE0',
};

export const darkColors = {
  bg: '#08111F',
  card: '#101D33',
  ink: '#E6EEFA',
  muted: '#8BA0BC',
  line: '#1C2E4C',
  accent: '#4C9BFF',
  accentSoft: '#132C52',
  accentDeep: '#9CC6FF',
  heart: '#FF5C7A',
  heartSoft: '#3A1826',
  success: '#2FC6DB',
  white: '#FFFFFF',
  overlay: 'rgba(16,29,51,0.9)',
  footer: 'rgba(8,17,31,0.96)',
  tabBar: '#0B1729',
  sidebar: '#060E1B',
  sidebarInk: '#8BA0BC',
  sidebarActive: '#2B6FD6',
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

// Every category has its own shade of blue and an icon (MaterialCommunityIcons).
export const CATEGORIES = ['All', 'Cities', 'Beaches', 'Mountains', 'Heritage', 'Adventure'];

export const categoryMeta = {
  All: { icon: 'view-grid-outline', color: '#1D6FE0' },
  Cities: { icon: 'city-variant-outline', color: '#2E86DE' },
  Beaches: { icon: 'beach', color: '#0B9EBB' },
  Mountains: { icon: 'image-filter-hdr', color: '#1F5FAE' },
  Heritage: { icon: 'castle', color: '#1A3E80' },
  Adventure: { icon: 'hiking', color: '#4B57D6' },
};

export const REGIONS = [
  { key: 'all', label: 'Everywhere', icon: 'earth' },
  { key: 'india', label: 'India', icon: 'map-marker-radius-outline' },
  { key: 'abroad', label: 'Abroad', icon: 'airplane-takeoff' },
];

export const shadow = {
  shadowColor: '#0B2550',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};
