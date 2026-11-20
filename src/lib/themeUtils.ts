import type {
  FontPairingId,
  RadiusScale,
  StorefrontSectionConfig,
  ThemeConfig,
} from './types';

export const FONT_PAIRINGS: Record<
  FontPairingId,
  { label: string; display: string; body: string; description: string }
> = {
  'fraunces-jakarta': {
    label: 'Fraunces + Plus Jakarta Sans',
    display: "'Fraunces', Georgia, serif",
    body: "'Plus Jakarta Sans', system-ui, sans-serif",
    description: 'Editorial hospitality serif with crisp modern sans',
  },
  'playfair-dm': {
    label: 'Playfair Display + DM Sans',
    display: "'Playfair Display', Georgia, serif",
    body: "'DM Sans', system-ui, sans-serif",
    description: 'Classic luxury wedding serif with clean geometric sans',
  },
  'bricolage-manrope': {
    label: 'Bricolage Grotesque + Manrope',
    display: "'Bricolage Grotesque', system-ui, sans-serif",
    body: "'Manrope', system-ui, sans-serif",
    description: 'Contemporary architectural sans for corporate & modern events',
  },
};

export const RADIUS_SCALE_VALUES: Record<
  RadiusScale,
  { card: string; control: string; label: string }
> = {
  sharp: { card: '4px', control: '4px', label: 'Architectural (4px)' },
  balanced: { card: '12px', control: '8px', label: 'Balanced (12px)' },
  soft: { card: '20px', control: '12px', label: 'Soft Touch (20px)' },
};

export const DEFAULT_SECTIONS: StorefrontSectionConfig[] = [
  { id: 'hero', label: 'Editorial Hero & Live Search', visible: true },
  { id: 'catalog', label: 'Verified Local Event Companies', visible: true },
  { id: 'trust_guarantees', label: 'Booking & Payment Guarantees', visible: true },
  { id: 'localities', label: 'Active Indian Localities', visible: true },
];

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  brandName: 'UtsavGrid',
  heroTitle: 'Curated local event companies, live slot availability, instant UPI booking.',
  heroSubtitle:
    'Compare verified wedding decorators, artisan caterers, candid filmmakers, and corporate production teams in your locality—lock your date with a 10-minute checkout hold and transparent GST pricing.',
  primaryAccent: '#1E3A8A',
  secondaryAccent: '#B45309',
  colorMode: 'light',
  fontPairing: 'fraunces-jakarta',
  radiusScale: 'balanced',
  cardDensity: 'comfortable',
  showVerifiedOnlyDefault: false,
  sections: DEFAULT_SECTIONS,
};

export interface ThemePreset {
  id: string;
  name: string;
  summary: string;
  patch: Partial<ThemeConfig>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'royal-indigo',
    name: 'Royal Indigo Editorial',
    summary: 'Sunlit alabaster canvas with deep royal indigo primary actions',
    patch: {
      primaryAccent: '#1E3A8A',
      secondaryAccent: '#B45309',
      colorMode: 'light',
      fontPairing: 'fraunces-jakarta',
      radiusScale: 'balanced',
    },
  },
  {
    id: 'botanical-emerald',
    name: 'Botanical Courtyard',
    summary: 'Deep heritage emerald with warm brass accents and Playfair serif',
    patch: {
      primaryAccent: '#065F46',
      secondaryAccent: '#A16207',
      colorMode: 'light',
      fontPairing: 'playfair-dm',
      radiusScale: 'soft',
    },
  },
  {
    id: 'midnight-gala',
    name: 'Midnight Velvet Gala',
    summary: 'High-contrast dark hospitality canvas with luminous sapphire actions',
    patch: {
      primaryAccent: '#3B82F6',
      secondaryAccent: '#F59E0B',
      colorMode: 'dark',
      fontPairing: 'fraunces-jakarta',
      radiusScale: 'balanced',
    },
  },
  {
    id: 'architectural-slate',
    name: 'Corporate Summit Studio',
    summary: 'Sharp 4px geometry with crimson-garnet focus and modern grotesque type',
    patch: {
      primaryAccent: '#9F1239',
      secondaryAccent: '#0F766E',
      colorMode: 'light',
      fontPairing: 'bricolage-manrope',
      radiusScale: 'sharp',
    },
  },
];

function isValidHex(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Generates hex alpha tint or darkened hover tone safely.
 */
export function adjustHexBrightness(hex: string, factor: number): string {
  if (!isValidHex(hex)) return hex;
  const r = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * factor)));
  const b = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * factor)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Converts a ThemeConfig into CSS custom properties injected at the document root.
 */
export function themeToCssVariables(theme: ThemeConfig): Record<string, string> {
  const font = FONT_PAIRINGS[theme.fontPairing] ?? FONT_PAIRINGS['fraunces-jakarta'];
  const radius = RADIUS_SCALE_VALUES[theme.radiusScale] ?? RADIUS_SCALE_VALUES.balanced;
  const primary = isValidHex(theme.primaryAccent)
    ? theme.primaryAccent
    : DEFAULT_THEME_CONFIG.primaryAccent;
  const secondary = isValidHex(theme.secondaryAccent)
    ? theme.secondaryAccent
    : DEFAULT_THEME_CONFIG.secondaryAccent;

  return {
    '--ug-accent': primary,
    '--ug-accent-hover': adjustHexBrightness(primary, theme.colorMode === 'dark' ? 1.12 : 0.86),
    '--ug-accent-soft': `${primary}18`,
    '--ug-secondary': secondary,
    '--ug-font-display': font.display,
    '--ug-font-body': font.body,
    '--ug-radius-card': radius.card,
    '--ug-radius-control': radius.control,
  };
}

/**
 * Safely normalizes user-edited or imported JSON ThemeConfig objects.
 */
export function normalizeThemeConfig(raw: unknown): ThemeConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_THEME_CONFIG, sections: DEFAULT_SECTIONS.map((s) => ({ ...s })) };
  }
  const obj = raw as Partial<ThemeConfig>;

  const validSectionIds = new Set(DEFAULT_SECTIONS.map((s) => s.id));
  const incomingSections = Array.isArray(obj.sections)
    ? obj.sections.filter(
        (s): s is StorefrontSectionConfig =>
          Boolean(s) &&
          typeof s.id === 'string' &&
          validSectionIds.has(s.id as StorefrontSectionConfig['id']) &&
          typeof s.visible === 'boolean'
      )
    : [];

  // Ensure every canonical section exists exactly once
  const seen = new Set<string>();
  const normalizedSections: StorefrontSectionConfig[] = [];
  for (const s of incomingSections) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      const canonical = DEFAULT_SECTIONS.find((d) => d.id === s.id)!;
      normalizedSections.push({
        id: canonical.id,
        label: canonical.label,
        visible: s.visible,
      });
    }
  }
  for (const fallback of DEFAULT_SECTIONS) {
    if (!seen.has(fallback.id)) {
      normalizedSections.push({ ...fallback });
    }
  }

  return {
    brandName:
      typeof obj.brandName === 'string' && obj.brandName.trim().length > 0
        ? obj.brandName.trim().slice(0, 32)
        : DEFAULT_THEME_CONFIG.brandName,
    heroTitle:
      typeof obj.heroTitle === 'string' && obj.heroTitle.trim().length > 0
        ? obj.heroTitle.trim().slice(0, 140)
        : DEFAULT_THEME_CONFIG.heroTitle,
    heroSubtitle:
      typeof obj.heroSubtitle === 'string' && obj.heroSubtitle.trim().length > 0
        ? obj.heroSubtitle.trim().slice(0, 320)
        : DEFAULT_THEME_CONFIG.heroSubtitle,
    primaryAccent:
      typeof obj.primaryAccent === 'string' && isValidHex(obj.primaryAccent)
        ? obj.primaryAccent
        : DEFAULT_THEME_CONFIG.primaryAccent,
    secondaryAccent:
      typeof obj.secondaryAccent === 'string' && isValidHex(obj.secondaryAccent)
        ? obj.secondaryAccent
        : DEFAULT_THEME_CONFIG.secondaryAccent,
    colorMode: obj.colorMode === 'dark' ? 'dark' : 'light',
    fontPairing:
      obj.fontPairing && obj.fontPairing in FONT_PAIRINGS
        ? obj.fontPairing
        : DEFAULT_THEME_CONFIG.fontPairing,
    radiusScale:
      obj.radiusScale && obj.radiusScale in RADIUS_SCALE_VALUES
        ? obj.radiusScale
        : DEFAULT_THEME_CONFIG.radiusScale,
    cardDensity: obj.cardDensity === 'compact' ? 'compact' : 'comfortable',
    showVerifiedOnlyDefault: Boolean(obj.showVerifiedOnlyDefault),
    sections: normalizedSections,
  };
}

/**
 * Moves a section up or down in the storefront section order.
 */
export function moveSectionOrder(
  sections: StorefrontSectionConfig[],
  index: number,
  direction: -1 | 1
): StorefrontSectionConfig[] {
  const target = index + direction;
  if (index < 0 || index >= sections.length || target < 0 || target >= sections.length) {
    return sections;
  }
  const copy = sections.map((s) => ({ ...s }));
  const temp = copy[index];
  copy[index] = copy[target];
  copy[target] = temp;
  return copy;
}
