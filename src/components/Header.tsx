import React from 'react';
import { CalendarCheck2, Compass, SlidersHorizontal, Store } from 'lucide-react';

export type AppView = 'discover' | 'bookings' | 'vendor' | 'customize';

interface HeaderProps {
  brandName: string;
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  activeBookingCount: number;
  onPrimaryAction: () => void;
}

const NAV_ITEMS: { id: AppView; label: string; mobileLabel: string }[] = [
  { id: 'discover', label: 'Discover', mobileLabel: 'Discover' },
  { id: 'bookings', label: 'My Bookings', mobileLabel: 'Bookings' },
  { id: 'vendor', label: 'Vendor Portal', mobileLabel: 'Vendor' },
  { id: 'customize', label: 'Customize UI', mobileLabel: 'Customize' },
];

export const Header: React.FC<HeaderProps> = ({
  brandName,
  activeView,
  onSelectView,
  activeBookingCount,
  onPrimaryAction,
}) => {
  return (
    <>
      {/* Desktop & Mobile Top Bar — strictly 3 zones on desktop, compact 52px on mobile */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0F1522]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[52px] md:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => onSelectView('discover')}
            className="font-display text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 ug-accent-ring cursor-pointer"
          >
            {brandName}
          </button>

          {/* Zone 2: 4 clean single-line text nav links (Desktop) */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ug-accent-ring ${
                    isActive
                      ? 'text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.id === 'bookings' && activeBookingCount > 0 && (
                    <span className="ml-1.5 font-mono-num text-xs text-slate-500 dark:text-slate-400">
                      ({activeBookingCount})
                    </span>
                  )}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 right-0 -bottom-[21px] h-0.5 ug-accent-bg"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onPrimaryAction}
              className="min-h-[40px] md:min-h-[40px] px-4 py-2 text-xs md:text-sm font-medium text-white ug-accent-bg ug-control-radius ug-accent-ring transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Book an Event
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Tab Bar (60px height; combined with 52px top bar = 112px <= 15% of 844px mobile viewport) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0F1522]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-4 h-[60px] items-center">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            const Icon =
              item.id === 'discover'
                ? Compass
                : item.id === 'bookings'
                ? CalendarCheck2
                : item.id === 'vendor'
                ? Store
                : SlidersHorizontal;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  isActive
                    ? 'ug-accent-text font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="text-[11px] leading-none whitespace-nowrap">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
