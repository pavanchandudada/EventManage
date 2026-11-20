import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Moon,
  RotateCcw,
  Save,
  Sun,
  Upload,
} from 'lucide-react';
import {
  DEFAULT_THEME_CONFIG,
  FONT_PAIRINGS,
  moveSectionOrder,
  normalizeThemeConfig,
  RADIUS_SCALE_VALUES,
  THEME_PRESETS,
} from '../lib/themeUtils';
import type { FontPairingId, RadiusScale, ThemeConfig } from '../lib/types';
import { PWAInstallButton } from './PWAInstallButton';

interface ThemeCustomizerViewProps {
  theme: ThemeConfig;
  onPreviewChange: (theme: ThemeConfig) => void;
  onSaveTheme: (theme: ThemeConfig) => Promise<boolean>;
}

export const ThemeCustomizerView: React.FC<ThemeCustomizerViewProps> = ({
  theme,
  onPreviewChange,
  onSaveTheme,
}) => {
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const update = (patch: Partial<ThemeConfig>) => {
    setSavedNotice(null);
    onPreviewChange({ ...theme, ...patch });
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSaveTheme(theme);
    setSaving(false);
    setSavedNotice(
      ok
        ? 'Frontend configuration saved and synced across all connected devices.'
        : 'Could not persist configuration right now.'
    );
  };

  const handleReset = async () => {
    const fresh = normalizeThemeConfig(DEFAULT_THEME_CONFIG);
    onPreviewChange(fresh);
    await onSaveTheme(fresh);
    setSavedNotice('Restored default UtsavGrid theme configuration.');
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(theme, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setJsonInput(JSON.stringify(theme, null, 2));
    }
  };

  const handleImportJson = async () => {
    setImportError(null);
    try {
      const parsed = JSON.parse(jsonInput);
      const normalized = normalizeThemeConfig(parsed);
      onPreviewChange(normalized);
      await onSaveTheme(normalized);
      setSavedNotice('Imported and applied custom JSON frontend configuration.');
      setJsonInput('');
    } catch {
      setImportError('Invalid JSON format. Paste a valid exported theme config.');
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
            Live Frontend & White-Label Customizer
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Every design token, font pairing, color mode, hero message, and homepage section order updates live across Web, PWA, and Capacitor mobile builds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <PWAInstallButton compact />
          <button
            type="button"
            onClick={() => void handleReset()}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 ug-control-radius cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 text-xs font-medium text-white ug-accent-bg ug-control-radius cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{saving ? 'Saving...' : 'Save & Sync Theme'}</span>
          </button>
        </div>
      </div>

      {savedNotice && (
        <div
          role="status"
          className="mt-5 p-3.5 text-sm bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 ug-control-radius"
        >
          {savedNotice}
        </div>
      )}

      <div className="mt-7 grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Left Column: Brand Copy, Presets, Colors & Mode */}
        <div className="lg:col-span-7 space-y-6">
          {/* Curated Presets */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 ug-card-radius">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Quick Theme Presets
            </h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => update(preset.patch)}
                  className="text-left p-3.5 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 ug-control-radius transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {preset.name}
                    </span>
                    <span
                      aria-hidden="true"
                      className="w-4 h-4 rounded-sm border border-black/10 shrink-0"
                      style={{ backgroundColor: preset.patch.primaryAccent }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {preset.summary}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Brand Identity & Hero Copy */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 ug-card-radius space-y-4">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Brand Identity & Storefront Copy
            </h2>

            <div>
              <label
                htmlFor="custom-brand-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Platform Brand Name
              </label>
              <input
                id="custom-brand-name"
                type="text"
                value={theme.brandName}
                onChange={(e) => update({ brandName: e.target.value })}
                className="w-full min-h-[44px] px-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius"
              />
            </div>

            <div>
              <label
                htmlFor="custom-hero-title"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Hero Headline
              </label>
              <input
                id="custom-hero-title"
                type="text"
                value={theme.heroTitle}
                onChange={(e) => update({ heroTitle: e.target.value })}
                className="w-full min-h-[44px] px-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius"
              />
            </div>

            <div>
              <label
                htmlFor="custom-hero-subtitle"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Hero Subheadline
              </label>
              <textarea
                id="custom-hero-subtitle"
                rows={3}
                value={theme.heroSubtitle}
                onChange={(e) => update({ heroSubtitle: e.target.value })}
                className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius"
              />
            </div>
          </div>

          {/* Colors, Typography & Geometry */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 ug-card-radius space-y-5">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Design Tokens — Color, Typography & Radius
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="custom-accent-color"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Primary Brand Accent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="custom-accent-color"
                    type="color"
                    value={theme.primaryAccent}
                    onChange={(e) => update({ primaryAccent: e.target.value })}
                    className="h-11 w-14 border border-slate-200 dark:border-slate-700 ug-control-radius cursor-pointer bg-transparent"
                  />
                  <span className="font-mono-num text-xs text-slate-600 dark:text-slate-300">
                    {theme.primaryAccent}
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="custom-secondary-color"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Secondary Accent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="custom-secondary-color"
                    type="color"
                    value={theme.secondaryAccent}
                    onChange={(e) => update({ secondaryAccent: e.target.value })}
                    className="h-11 w-14 border border-slate-200 dark:border-slate-700 ug-control-radius cursor-pointer bg-transparent"
                  />
                  <span className="font-mono-num text-xs text-slate-600 dark:text-slate-300">
                    {theme.secondaryAccent}
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Color Posture
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => update({ colorMode: 'light' })}
                    className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 text-xs font-medium border ug-control-radius cursor-pointer ${
                      theme.colorMode === 'light'
                        ? 'ug-accent-border ug-accent-soft-bg text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ colorMode: 'dark' })}
                    className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 text-xs font-medium border ug-control-radius cursor-pointer ${
                      theme.colorMode === 'dark'
                        ? 'ug-accent-border ug-accent-soft-bg text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Dark</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label
                  htmlFor="custom-font-pairing"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Font Pairing
                </label>
                <select
                  id="custom-font-pairing"
                  value={theme.fontPairing}
                  onChange={(e) =>
                    update({ fontPairing: e.target.value as FontPairingId })
                  }
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius"
                >
                  {(Object.keys(FONT_PAIRINGS) as FontPairingId[]).map((id) => (
                    <option key={id} value={id}>
                      {FONT_PAIRINGS[id].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="custom-radius-scale"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Corner Geometry
                </label>
                <select
                  id="custom-radius-scale"
                  value={theme.radiusScale}
                  onChange={(e) =>
                    update({ radiusScale: e.target.value as RadiusScale })
                  }
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius"
                >
                  {(Object.keys(RADIUS_SCALE_VALUES) as RadiusScale[]).map(
                    (id) => (
                      <option key={id} value={id}>
                        {RADIUS_SCALE_VALUES[id].label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="custom-density"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Catalog Card Density
                </label>
                <select
                  id="custom-density"
                  value={theme.cardDensity}
                  onChange={(e) =>
                    update({
                      cardDensity: e.target.value as 'comfortable' | 'compact',
                    })
                  }
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius"
                >
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact Grid</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Storefront Section Builder + JSON Config Portability */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 ug-card-radius">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Storefront Section Composer
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Show, hide, or reorder sections on the Discover homepage without changing code.
            </p>

            <div className="mt-4 space-y-2.5">
              {theme.sections.map((section, idx) => (
                <div
                  key={section.id}
                  className="flex items-center justify-between gap-2 p-3 border border-slate-200 dark:border-slate-800 ug-control-radius"
                >
                  <label className="flex items-center gap-2.5 text-sm text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={section.visible}
                      onChange={() => {
                        const next = theme.sections.map((s) =>
                          s.id === section.id ? { ...s, visible: !s.visible } : s
                        );
                        update({ sections: next });
                      }}
                      className="w-4 h-4 accent-[var(--ug-accent)]"
                    />
                    <span>{section.label}</span>
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      aria-label={`Move ${section.label} up`}
                      onClick={() =>
                        update({
                          sections: moveSectionOrder(theme.sections, idx, -1),
                        })
                      }
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center border border-slate-200 dark:border-slate-700 ug-control-radius text-slate-600 dark:text-slate-300 disabled:opacity-35 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === theme.sections.length - 1}
                      aria-label={`Move ${section.label} down`}
                      onClick={() =>
                        update({
                          sections: moveSectionOrder(theme.sections, idx, 1),
                        })
                      }
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center border border-slate-200 dark:border-slate-700 ug-control-radius text-slate-600 dark:text-slate-300 disabled:opacity-35 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 ug-card-radius space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Portable JSON Config
              </h2>
              <button
                type="button"
                onClick={() => void handleCopyJson()}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 ug-control-radius cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Export your UI theme to store in Git or Supabase `theme_configs`, or paste a config below to apply immediately.
            </p>
            <textarea
              aria-label="Paste JSON theme configuration"
              rows={4}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='Paste exported ThemeConfig JSON here...'
              className="w-full p-3 text-xs font-mono-num bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius"
            />
            {importError && (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {importError}
              </p>
            )}
            <button
              type="button"
              disabled={!jsonInput.trim()}
              onClick={() => void handleImportJson()}
              className="w-full min-h-[44px] px-4 text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 ug-control-radius inline-flex items-center justify-center gap-2 disabled:opacity-45 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Import & Apply JSON Config</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
