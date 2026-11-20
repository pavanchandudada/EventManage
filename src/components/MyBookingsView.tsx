import React, { useState } from 'react';
import { CalendarDays, Receipt, XCircle } from 'lucide-react';
import {
  formatEventDate,
  formatINR,
  SLOT_WINDOW_LABELS,
} from '../lib/bookingEngine';
import type { Booking } from '../lib/types';

interface MyBookingsViewProps {
  bookings: Booking[];
  onCancelBooking: (bookingId: string) => Promise<boolean>;
  onExplore: () => void;
}

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({
  bookings,
  onCancelBooking,
  onExplore,
}) => {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'cancelled'>('all');

  const filtered = bookings.filter((b) => {
    if (filter === 'active') return b.status !== 'cancelled';
    if (filter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    await onCancelBooking(id);
    setCancellingId(null);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
            My Event Bookings
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Track confirmed event dates, GST payment receipts, and remaining balances.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filter bookings"
          className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ug-control-radius self-start"
        >
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'cancelled', label: 'Cancelled' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={`min-h-[36px] px-3.5 text-xs font-medium ug-control-radius transition-colors cursor-pointer ${
                filter === tab.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-10 text-center ug-card-radius">
          <CalendarDays
            className="w-8 h-8 text-slate-400 mx-auto"
            aria-hidden="true"
          />
          <h2 className="mt-3 font-display text-xl font-semibold text-slate-900 dark:text-white">
            No bookings in this view yet
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Browse local event companies to inspect real-time slot availability and lock your celebration date.
          </p>
          <button
            type="button"
            onClick={onExplore}
            className="mt-5 min-h-[44px] px-5 py-2.5 text-sm font-medium text-white ug-accent-bg ug-control-radius cursor-pointer"
          >
            Discover Event Companies
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filtered.map((booking) => {
            const statusLabel =
              booking.status === 'confirmed'
                ? 'Confirmed'
                : booking.status === 'in_progress'
                ? 'In Progress'
                : booking.status === 'completed'
                ? 'Completed'
                : 'Cancelled';

            const statusColor =
              booking.status === 'cancelled'
                ? 'text-rose-700 dark:text-rose-400'
                : booking.status === 'completed'
                ? 'text-slate-600 dark:text-slate-300'
                : 'text-emerald-700 dark:text-emerald-400';

            return (
              <article
                key={booking.id}
                className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 ug-card-radius"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono-num font-semibold text-slate-800 dark:text-slate-200">
                        {booking.bookingCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-semibold ${statusColor}`}>
                        {statusLabel}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {booking.vendorLocality}, {booking.vendorCity}
                      </span>
                    </div>

                    <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
                      {booking.vendorName} — {booking.packageName}
                    </h2>

                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {formatEventDate(booking.eventDate)} ·{' '}
                      {SLOT_WINDOW_LABELS[booking.slotWindow].label} (
                      {SLOT_WINDOW_LABELS[booking.slotWindow].timeRange}) ·{' '}
                      <span className="font-mono-num">{booking.guestCount}</span>{' '}
                      guests
                    </p>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Venue: {booking.venueAddress} · Contact: {booking.customerName} (
                      {booking.customerPhone})
                    </p>
                  </div>

                  <div className="lg:text-right shrink-0 space-y-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Total incl. 18% GST
                    </p>
                    <p className="font-mono-num text-xl font-semibold text-slate-900 dark:text-white">
                      {formatINR(booking.totalInr)}
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono-num">
                      Paid: {formatINR(booking.amountPaidInr)}
                      {booking.balanceDueInr > 0
                        ? ` · Balance: ${formatINR(booking.balanceDueInr)}`
                        : ' · Paid in full'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="font-mono-num">
                      Payment ID: {booking.razorpayPaymentId}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Subtotal {formatINR(booking.subtotalInr)} + GST{' '}
                      {formatINR(booking.gstInr)}
                    </span>
                  </div>

                  {booking.status === 'confirmed' && (
                    <button
                      type="button"
                      disabled={cancellingId === booking.id}
                      onClick={() => void handleCancel(booking.id)}
                      className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 ug-control-radius cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {cancellingId === booking.id
                          ? 'Cancelling...'
                          : 'Cancel & Release Slot'}
                      </span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
