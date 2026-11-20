import React, { useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import {
  countAvailableSlotsForDate,
  formatINR,
  type AvailabilitySnapshot,
} from '../lib/bookingEngine';
import type { CardDensity, Vendor } from '../lib/types';

interface VendorCardProps {
  vendor: Vendor;
  selectedDate: string;
  availability: AvailabilitySnapshot;
  density: CardDensity;
  onSelect: (vendor: Vendor) => void;
}

export const VendorCard: React.FC<VendorCardProps> = ({
  vendor,
  selectedDate,
  availability,
  density,
  onSelect,
}) => {
  const [imageError, setImageError] = useState(false);

  const startingPrice = Math.min(...vendor.packages.map((p) => p.basePriceInr));
  const openSlotsCount = countAvailableSlotsForDate(
    vendor.id,
    selectedDate,
    availability
  );

  const padClass = density === 'compact' ? 'p-4' : 'p-5';

  return (
    <article className="group flex flex-col bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 overflow-hidden ug-card-radius transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* 4:3 Photography Lead with resilient fallback */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {!imageError ? (
          <img
            src={vendor.coverImage}
            alt={`${vendor.name} — ${vendor.category} in ${vendor.locality}, ${vendor.city}`}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
            <Sparkles className="w-6 h-6 text-slate-400 mb-2" aria-hidden="true" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {vendor.name}
            </span>
          </div>
        )}
      </div>

      {/* Card Body — Zero-Pill Discipline */}
      <div className={`flex-1 flex flex-col ${padClass}`}>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {vendor.category}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {vendor.locality}, {vendor.city}
          </span>
        </div>

        <h3 className="mt-1.5 font-display text-lg font-semibold text-slate-900 dark:text-white leading-snug">
          {vendor.name}
        </h3>

        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
          {vendor.tagline}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono-num font-medium text-slate-800 dark:text-slate-200">
            {vendor.rating.toFixed(1)} ★ ({vendor.reviewCount})
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {vendor.guestCapacityMin}–{vendor.guestCapacityMax} guests
          </span>
          <span aria-hidden="true">·</span>
          <span
            className={
              openSlotsCount > 0
                ? 'font-medium text-emerald-700 dark:text-emerald-400'
                : 'font-medium text-amber-700 dark:text-amber-400'
            }
          >
            {openSlotsCount > 0
              ? `${openSlotsCount} of 3 slots open`
              : 'Sold out on selected date'}
          </span>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Packages from
            </p>
            <p className="font-mono-num text-base font-semibold text-slate-900 dark:text-white">
              {formatINR(startingPrice)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSelect(vendor)}
            aria-label={`Check live availability and book ${vendor.name}`}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 text-xs font-medium text-white ug-accent-bg ug-control-radius ug-accent-ring transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Check Slots & Book</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
};
