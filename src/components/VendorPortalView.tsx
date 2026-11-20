import React, { useMemo, useState } from 'react';
import { Plus, Radio } from 'lucide-react';
import {
  formatEventDate,
  formatINR,
  resolveSlotStatus,
  SLOT_WINDOW_LABELS,
  type AvailabilitySnapshot,
} from '../lib/bookingEngine';
import type {
  Booking,
  BookingStatus,
  SlotWindow,
  Vendor,
} from '../lib/types';

interface VendorPortalViewProps {
  vendors: Vendor[];
  upcomingDates: string[];
  availability: AvailabilitySnapshot;
  bookings: Booking[];
  wsConnected: boolean;
  onToggleSlotBlock: (params: {
    vendorId: string;
    eventDate: string;
    slotWindow: SlotWindow;
    blocked: boolean;
    reason?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onUpdateBookingStatus: (
    bookingId: string,
    status: BookingStatus
  ) => Promise<boolean>;
  onAddPackage: (
    vendorId: string,
    pkg: {
      name: string;
      description: string;
      basePriceInr: number;
      perGuestPriceInr: number;
      includedGuests: number;
      deliverables: string[];
    }
  ) => Promise<{ ok: boolean; error?: string }>;
}

const WINDOWS: SlotWindow[] = ['morning', 'evening', 'full_day'];

export const VendorPortalView: React.FC<VendorPortalViewProps> = ({
  vendors,
  upcomingDates,
  availability,
  bookings,
  wsConnected,
  onToggleSlotBlock,
  onUpdateBookingStatus,
  onAddPackage,
}) => {
  const [activeVendorId, setActiveVendorId] = useState(vendors[0]?.id ?? '');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New package form state
  const [pkgName, setPkgName] = useState('');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgPrice, setPkgPrice] = useState('85000');
  const [pkgGuests, setPkgGuests] = useState('120');
  const [pkgPerGuest, setPkgPerGuest] = useState('250');
  const [pkgDeliverables, setPkgDeliverables] = useState('');
  const [savingPkg, setSavingPkg] = useState(false);

  const activeVendor = useMemo(
    () => vendors.find((v) => v.id === activeVendorId) ?? vendors[0],
    [vendors, activeVendorId]
  );

  const vendorBookings = useMemo(
    () => bookings.filter((b) => b.vendorId === activeVendor?.id),
    [bookings, activeVendor?.id]
  );

  const handleSlotToggle = async (
    eventDate: string,
    slotWindow: SlotWindow,
    currentlyBlocked: boolean
  ) => {
    if (!activeVendor) return;
    setErrorMsg(null);
    setFeedback(null);
    const res = await onToggleSlotBlock({
      vendorId: activeVendor.id,
      eventDate,
      slotWindow,
      blocked: !currentlyBlocked,
      reason: 'Blocked from Vendor Portal',
    });
    if (!res.ok) {
      setErrorMsg(res.error || 'Could not update slot availability.');
      return;
    }
    setFeedback(
      `${formatEventDate(eventDate)} (${SLOT_WINDOW_LABELS[slotWindow].label}) is now ${
        !currentlyBlocked ? 'blocked' : 'open for booking'
      } across all customer screens.`
    );
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVendor) return;
    if (!pkgName.trim() || Number(pkgPrice) <= 0) {
      setErrorMsg('Enter a package name and a positive INR base price.');
      return;
    }
    setSavingPkg(true);
    setErrorMsg(null);
    setFeedback(null);
    const res = await onAddPackage(activeVendor.id, {
      name: pkgName.trim(),
      description:
        pkgDesc.trim() || 'Custom event service package created from Vendor Portal.',
      basePriceInr: Number(pkgPrice),
      perGuestPriceInr: Number(pkgPerGuest) || 0,
      includedGuests: Number(pkgGuests) || 100,
      deliverables: pkgDeliverables
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    });
    setSavingPkg(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Unable to add package.');
      return;
    }
    setPkgName('');
    setPkgDesc('');
    setPkgDeliverables('');
    setFeedback(`Added new package to ${activeVendor.name}.`);
  };

  if (!activeVendor) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-12">
      {/* Header & Company Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Radio
              className={`w-3.5 h-3.5 ${
                wsConnected ? 'text-emerald-600' : 'text-amber-600'
              }`}
              aria-hidden="true"
            />
            <span>
              {wsConnected
                ? 'Live WebSocket sync connected'
                : 'Reconnecting to live availability server'}
            </span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
            Vendor Availability & Operations Portal
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Toggle open or blocked slots in real time, update booking progress, and publish new INR packages.
          </p>
        </div>

        <div className="w-full md:w-72">
          <label
            htmlFor="vendor-portal-select"
            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
          >
            Manage Event Company
          </label>
          <select
            id="vendor-portal-select"
            value={activeVendor.id}
            onChange={(e) => {
              setActiveVendorId(e.target.value);
              setFeedback(null);
              setErrorMsg(null);
            }}
            className="w-full min-h-[44px] px-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius ug-accent-ring"
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="mt-5 p-3.5 text-sm bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 ug-control-radius"
        >
          {feedback}
        </div>
      )}
      {errorMsg && (
        <div
          role="alert"
          className="mt-5 p-3.5 text-sm bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 ug-control-radius"
        >
          {errorMsg}
        </div>
      )}

      {/* Real-Time Availability Matrix */}
      <div className="mt-7 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 ug-card-radius">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Real-Time Calendar Matrix — {activeVendor.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any Open or Blocked cell to immediately broadcast availability changes to customers.
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Open · Blocked · Held · Booked
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pr-4 font-medium">Event Date</th>
                {WINDOWS.map((w) => (
                  <th key={w} className="py-2.5 px-2 font-medium">
                    {SLOT_WINDOW_LABELS[w].label}
                    <span className="block font-normal text-[11px] opacity-80">
                      {SLOT_WINDOW_LABELS[w].timeRange}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
              {upcomingDates.slice(0, 7).map((dateStr) => (
                <tr key={dateStr}>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                    {formatEventDate(dateStr)}
                  </td>
                  {WINDOWS.map((slot) => {
                    const resolved = resolveSlotStatus(
                      activeVendor.id,
                      dateStr,
                      slot,
                      availability
                    );
                    const exactBlocked = availability.blockedSlots.some(
                      (s) =>
                        s.vendorId === activeVendor.id &&
                        s.eventDate === dateStr &&
                        s.slotWindow === slot
                    );
                    const isInteractive =
                      resolved.status === 'available' || exactBlocked;

                    const label =
                      resolved.status === 'booked'
                        ? `Booked (${resolved.booking?.bookingCode ?? ''})`
                        : resolved.status === 'held'
                        ? 'Held (Checkout)'
                        : exactBlocked
                        ? 'Blocked (Tap to Open)'
                        : resolved.status === 'blocked'
                        ? 'Blocked via Full Day'
                        : 'Open (Tap to Block)';

                    const cellStyle =
                      resolved.status === 'booked'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                        : resolved.status === 'held'
                        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-900 cursor-not-allowed'
                        : exactBlocked || resolved.status === 'blocked'
                        ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-950/50 cursor-pointer'
                        : 'bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/70 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/40 cursor-pointer';

                    return (
                      <td key={slot} className="py-2.5 px-2">
                        <button
                          type="button"
                          disabled={!isInteractive}
                          onClick={() =>
                            void handleSlotToggle(dateStr, slot, exactBlocked)
                          }
                          aria-label={`${formatEventDate(dateStr)} ${SLOT_WINDOW_LABELS[slot].label}: ${label}`}
                          className={`w-full min-h-[44px] px-3 py-2 text-xs font-medium border ug-control-radius text-left transition-colors ${cellStyle}`}
                        >
                          {label}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom 2-Column Operations: Incoming Bookings + Add Package */}
      <div className="mt-7 grid grid-cols-1 lg:grid-cols-12 gap-7">
        <div className="lg:col-span-7 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 ug-card-radius">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Incoming Bookings ({vendorBookings.length})
          </h2>
          {vendorBookings.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              No customer bookings for {activeVendor.name} yet.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {vendorBookings.map((b) => (
                <div
                  key={b.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
                      {b.bookingCode} · {formatEventDate(b.eventDate)} ·{' '}
                      {SLOT_WINDOW_LABELS[b.slotWindow].label}
                    </p>
                    <p className="font-semibold text-sm text-slate-900 dark:text-white mt-0.5">
                      {b.customerName} — {b.packageName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Paid {formatINR(b.amountPaidInr)} of {formatINR(b.totalInr)} ·{' '}
                      {b.customerPhone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      aria-label={`Update status for booking ${b.bookingCode}`}
                      value={b.status}
                      onChange={(e) =>
                        void onUpdateBookingStatus(
                          b.id,
                          e.target.value as BookingStatus
                        )
                      }
                      className="min-h-[40px] px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius"
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 ug-card-radius">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Publish New Service Package
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Packages appear immediately in customer search and booking checkout.
          </p>

          <form
            onSubmit={(e) => void handleCreatePackage(e)}
            className="mt-4 space-y-3.5"
          >
            <div>
              <label
                htmlFor="pkg-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Package Name
              </label>
              <input
                id="pkg-name"
                type="text"
                value={pkgName}
                onChange={(e) => setPkgName(e.target.value)}
                placeholder="Intimate Sangeet Lighting Suite"
                className="w-full min-h-[44px] px-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius"
              />
            </div>

            <div>
              <label
                htmlFor="pkg-desc"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Short Description
              </label>
              <input
                id="pkg-desc"
                type="text"
                value={pkgDesc}
                onChange={(e) => setPkgDesc(e.target.value)}
                placeholder="Warm stage lighting, floral backdrop, and sound deck"
                className="w-full min-h-[44px] px-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label
                  htmlFor="pkg-price"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Base (INR)
                </label>
                <input
                  id="pkg-price"
                  type="number"
                  min={5000}
                  value={pkgPrice}
                  onChange={(e) => setPkgPrice(e.target.value)}
                  className="w-full min-h-[44px] px-2.5 text-sm font-mono-num bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius"
                />
              </div>
              <div>
                <label
                  htmlFor="pkg-guests"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Incl. Guests
                </label>
                <input
                  id="pkg-guests"
                  type="number"
                  min={10}
                  value={pkgGuests}
                  onChange={(e) => setPkgGuests(e.target.value)}
                  className="w-full min-h-[44px] px-2.5 text-sm font-mono-num bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius"
                />
              </div>
              <div>
                <label
                  htmlFor="pkg-per-guest"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Extra/Guest
                </label>
                <input
                  id="pkg-per-guest"
                  type="number"
                  min={0}
                  value={pkgPerGuest}
                  onChange={(e) => setPkgPerGuest(e.target.value)}
                  className="w-full min-h-[44px] px-2.5 text-sm font-mono-num bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="pkg-deliverables"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Deliverables (one per line)
              </label>
              <textarea
                id="pkg-deliverables"
                rows={3}
                value={pkgDeliverables}
                onChange={(e) => setPkgDeliverables(e.target.value)}
                placeholder={'Custom floral stage\nDedicated sound technician'}
                className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius"
              />
            </div>

            <button
              type="submit"
              disabled={savingPkg}
              className="w-full min-h-[44px] px-4 py-2.5 text-sm font-medium text-white ug-accent-bg ug-control-radius inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{savingPkg ? 'Publishing...' : 'Add Package to Catalog'}</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
