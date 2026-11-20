import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SECTIONS,
  DEFAULT_THEME_CONFIG,
  moveSectionOrder,
  normalizeThemeConfig,
  themeToCssVariables,
} from './themeUtils';

test('themeToCssVariables maps font pairing, radius, and accent tokens', () => {
  const vars = themeToCssVariables({
    ...DEFAULT_THEME_CONFIG,
    primaryAccent: '#065F46',
    fontPairing: 'playfair-dm',
    radiusScale: 'sharp',
  });
  assert.equal(vars['--ug-accent'], '#065F46');
  assert.equal(vars['--ug-radius-card'], '4px');
  assert.ok(vars['--ug-font-display'].includes('Playfair Display'));
});

test('normalizeThemeConfig repairs invalid colors and missing sections safely', () => {
  const normalized = normalizeThemeConfig({
    brandName: '   Festiva India  ',
    primaryAccent: 'not-a-hex',
    colorMode: 'dark',
    sections: [{ id: 'catalog', label: 'Catalog', visible: false }],
  });

  assert.equal(normalized.brandName, 'Festiva India');
  assert.equal(normalized.primaryAccent, DEFAULT_THEME_CONFIG.primaryAccent);
  assert.equal(normalized.colorMode, 'dark');
  assert.equal(normalized.sections.length, DEFAULT_SECTIONS.length);
  assert.equal(normalized.sections[0].id, 'catalog');
  assert.equal(normalized.sections[0].visible, false);
});

test('moveSectionOrder swaps adjacent sections cleanly and ignores out-of-bounds moves', () => {
  const moved = moveSectionOrder(DEFAULT_SECTIONS, 1, -1);
  assert.equal(moved[0].id, 'catalog');
  assert.equal(moved[1].id, 'hero');

  const unchanged = moveSectionOrder(DEFAULT_SECTIONS, 0, -1);
  assert.equal(unchanged[0].id, 'hero');
});
