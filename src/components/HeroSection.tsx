import React from 'react';
import { ArrowRight, Calendar, MapPin, Search } from 'lucide-react';
import { formatEventDate } from '../lib/bookingEngine';
import type { EventCategory, ThemeConfig } from '../lib/types';
import { HERO_BANNER_IMAGE } from '../server/seedData';
import { PWAInstallButton } from './PWAInstallButton';

interface HeroSectionProps {
  theme: ThemeConfig;
  cities: string[];
  categories: EventCategory[];
  upcomingDates: string[];
  selectedCity: string;
  selectedCategory: string;
  selectedDate: string;
  searchQuery: string;
  onCityChange: (city: string) => void;
  onCategoryChange: (cat: string) => void;
  onDateChange: (date: string) => void;
  onSearchChange: (q: string) => void;
  onExploreClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  theme,
  cities,
  categories,
  upcomingDates,
  selectedCity,
  selectedCategory,
  selectedDate,
  searchQuery,
  onCityChange,
  onCategoryChange,
  onDateChange,
  onSearchChange,
  onExploreClick,
}) => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 pb-8 md:pb-12">
      {/* Split 2-column Hero with items-stretch */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center py-2">
          <p className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400">
            Bengaluru · Mumbai · Hyderabad · Delhi NCR
          </p>

          <h1
            className="mt-3 font-display text-3xl sm:text-4xl lg:text-[2.85rem] font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.12]"
            style={{ textWrap: 'balance' }}
          >
            {theme.heroTitle}
          </h1>

          <p className="mt-5 text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
            {theme.heroSubtitle}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onExploreClick}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 text-sm font-medium text-white ug-accent-bg ug-control-radius ug-accent-ring transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Browse Available Companies</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <PWAInstallButton />
          </div>

          <div className="mt-7 pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-3 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            <span>10-min checkout slot hold</span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
            <span>Razorpay UPI & 25% token</span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
            <span>Itemized 18% GST receipts</span>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="relative w-full aspect-[16/10] lg:aspect-auto lg:h-full min-h-[260px] overflow-hidden bg-slate-200 dark:bg-slate-800 ug-card-radius border border-slate-200/80 dark:border-slate-800">
            <img
              src={HERO_BANNER_IMAGE}
              alt="Outdoor evening Indian heritage celebration pavilion with floral arches and warm lighting"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent"
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 text-white">
              <div>
                <p className="text-xs text-slate-200">
                  Real-Time Multi-Vendor Calendar
                </p>
                <p className="mt-0.5 text-sm sm:text-base font-medium">
                  Live Morning, Evening & Full-Day slot verification
                </p>
              </div>
              <span className="font-mono-num text-xs text-slate-100 whitespace-nowrap shrink-0">
                INR · UPI Ready
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Integrated 4-column Search & Availability Filter Bar below the Hero split */}
      <div className="mt-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 ug-card-radius shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-3">
            <label
              htmlFor="filter-city"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              City & Locality
            </label>
            <div className="relative">
              <MapPin
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <select
                id="filter-city"
                value={selectedCity}
                onChange={(e) => onCityChange(e.target.value)}
                className="w-full min-h-[44px] pl-9 pr-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 ug-control-radius ug-accent-ring"
              >
                <option value="All">All Indian Cities</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="lg:col-span-3">
            <label
              htmlFor="filter-category"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Event Service
            </label>
            <select
              id="filter-category"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full min-h-[44px] px-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 ug-control-radius ug-accent-ring"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label
              htmlFor="filter-date"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Check Live Date
            </label>
            <div className="relative">
              <Calendar
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <select
                id="filter-date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="w-full min-h-[44px] pl-9 pr-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 ug-control-radius ug-accent-ring"
              >
                {upcomingDates.map((d) => (
                  <option key={d} value={d}>
                    {formatEventDate(d)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="lg:col-span-3">
            <label
              htmlFor="filter-search"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Search Company or Locality
            </label>
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="filter-search"
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Mandap, Bandra, catering..."
                className="w-full min-h-[44px] pl-9 pr-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 ug-control-radius ug-accent-ring"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
