import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Lock,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import {
  calculateBookingPricing,
  formatEventDate,
  formatINR,
  resolveSlotStatus,
  SLOT_WINDOW_LABELS,
  validateBookingCustomerInput,
  type AvailabilitySnapshot,
} from '../lib/bookingEngine';
import type {
  Booking,
  PaymentMethod,
  PaymentPlan,
  SlotHold,
  SlotWindow,
  Vendor,
} from '../lib/types';

interface BookingDrawerProps {
  vendor: Vendor;
  initialDate: string;
  upcomingDates: string[];
  availability: AvailabilitySnapshot;
  sessionId: string;
  paymentGatewayMode: 'live_razorpay' | 'offline_upi_sandbox';
  onClose: () => void;
  onHoldSlot: (params: {
    vendorId: string;
    packageId: string;
    eventDate: string;
    slotWindow: SlotWindow;
  }) => Promise<{ ok: true; hold: SlotHold } | { ok: false; error: string }>;
  onReleaseHold: (holdId: string) => Promise<void>;
  onCreateOrder: (params: {
    holdId: string;
    guestCount: number;
    selectedAddonIds: string[];
    paymentPlan: PaymentPlan;
  }) => Promise<
    | {
        ok: true;
        order: {
          orderId: string;
          amountPaise: number;
          amountInr: number;
          currency: 'INR';
          mode: 'live_razorpay' | 'offline_upi_sandbox';
          keyId?: string;
        };
      }
    | { ok: false; error: string }
  >;
  onVerifyAndBook: (params: {
    holdId: string;
    guestCount: number;
    selectedAddonIds: string[];
    paymentPlan: PaymentPlan;
    paymentMethod: PaymentMethod;
    upiId?: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    venueAddress: string;
    razorpayOrderId: string;
  }) => Promise<
    | { ok: true; booking: Booking }
    | { ok: false; error: string; fieldErrors?: Record<string, string> }
  >;
  onGoToBookings: () => void;
}

type CheckoutStep = 'configure' | 'payment' | 'confirmed';

const SLOT_WINDOWS: SlotWindow[] = ['morning', 'evening', 'full_day'];

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  hint: string;
}[] = [
  { id: 'upi_gpay', label: 'Google Pay (UPI Intent)', hint: 'Instant zero-fee UPI' },
  { id: 'upi_phonepe', label: 'PhonePe (UPI Intent)', hint: 'Instant zero-fee UPI' },
  { id: 'upi_paytm', label: 'Paytm UPI', hint: 'Instant zero-fee UPI' },
  { id: 'upi_id', label: 'Enter UPI ID / VPA', hint: 'e.g. name@okaxis' },
  { id: 'card', label: 'Credit / Debit Card', hint: 'Razorpay Visa / RuPay / MC' },
];

function formatCountdown(expiresAtIso: string, nowMs: number): string {
  const remainingSec = Math.max(
    0,
    Math.floor((Date.parse(expiresAtIso) - nowMs) / 1000)
  );
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const BookingDrawer: React.FC<BookingDrawerProps> = ({
  vendor,
  initialDate,
  upcomingDates,
  availability,
  sessionId,
  paymentGatewayMode,
  onClose,
  onHoldSlot,
  onReleaseHold,
  onCreateOrder,
  onVerifyAndBook,
  onGoToBookings,
}) => {
  const [step, setStep] = useState<CheckoutStep>('configure');
  const [selectedPackageId, setSelectedPackageId] = useState(
    vendor.packages[0]?.id ?? ''
  );
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedSlot, setSelectedSlot] = useState<SlotWindow | null>(null);
  const [guestCount, setGuestCount] = useState(
    vendor.packages[0]?.includedGuests ?? 120
  );
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>('token_25');

  const [activeHold, setActiveHold] = useState<SlotHold | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Customer & UPI checkout state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi_gpay');
  const [upiId, setUpiId] = useState('');

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const selectedPackage = useMemo(
    () =>
      vendor.packages.find((p) => p.id === selectedPackageId) ??
      vendor.packages[0],
    [vendor.packages, selectedPackageId]
  );

  // Sync live countdown timer while holding a slot
  useEffect(() => {
    if (!activeHold || step !== 'payment') return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeHold, step]);

  // Reset selected slot when changing date if the slot isn't open
  useEffect(() => {
    setSelectedSlot((current) => {
      if (current) {
        const check = resolveSlotStatus(
          vendor.id,
          selectedDate,
          current,
          availability,
          Date.now(),
          sessionId
        );
        if (check.status === 'available') return current;
      }
      const firstAvailable = SLOT_WINDOWS.find(
        (w) =>
          resolveSlotStatus(
            vendor.id,
            selectedDate,
            w,
            availability,
            Date.now(),
            sessionId
          ).status === 'available'
      );
      return firstAvailable ?? null;
    });
  }, [availability, selectedDate, sessionId, vendor.id]);

  const pricing = useMemo(() => {
    if (!selectedPackage) return null;
    return calculateBookingPricing(
      selectedPackage,
      selectedAddonIds,
      guestCount,
      paymentPlan
    );
  }, [selectedPackage, selectedAddonIds, guestCount, paymentPlan]);

  const toggleAddon = (addonId: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId]
    );
  };

  const handleClose = async () => {
    if (activeHold && step === 'payment') {
      await onReleaseHold(activeHold.id);
    }
    onClose();
  };

  const handleHoldAndContinue = async () => {
    if (!selectedPackage || !selectedSlot) {
      setErrorMsg('Select an available date and time slot to continue.');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    const holdRes = await onHoldSlot({
      vendorId: vendor.id,
      packageId: selectedPackage.id,
      eventDate: selectedDate,
      slotWindow: selectedSlot,
    });
    if (!holdRes.ok) {
      setErrorMsg(holdRes.error);
      setBusy(false);
      return;
    }

    const orderRes = await onCreateOrder({
      holdId: holdRes.hold.id,
      guestCount,
      selectedAddonIds,
      paymentPlan,
    });
    if (!orderRes.ok) {
      await onReleaseHold(holdRes.hold.id);
      setErrorMsg(orderRes.error);
      setBusy(false);
      return;
    }

    setActiveHold(holdRes.hold);
    setOrderId(orderRes.order.orderId);
    setStep('payment');
    setBusy(false);
  };

  const handleBackToConfigure = async () => {
    if (activeHold) {
      await onReleaseHold(activeHold.id);
      setActiveHold(null);
      setOrderId(null);
    }
    setErrorMsg(null);
    setFieldErrors({});
    setStep('configure');
  };

  const handleCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHold || !orderId) return;

    const validation = validateBookingCustomerInput({
      customerName,
      customerPhone,
      customerEmail,
      venueAddress,
      paymentMethod,
      upiId,
    });
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setErrorMsg('Please complete all required customer and payment fields.');
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    setFieldErrors({});

    const result = await onVerifyAndBook({
      holdId: activeHold.id,
      guestCount,
      selectedAddonIds,
      paymentPlan,
      paymentMethod,
      upiId: paymentMethod === 'upi_id' ? upiId : undefined,
      customerName,
      customerPhone,
      customerEmail,
      venueAddress,
      razorpayOrderId: orderId,
    });

    if (!result.ok) {
      setErrorMsg(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      setBusy(false);
      return;
    }

    setConfirmedBooking(result.booking);
    setActiveHold(null);
    setStep('confirmed');
    setBusy(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-drawer-title"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/60 backdrop-blur-sm md:p-6"
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-t-2xl md:ug-card-radius shadow-2xl overflow-hidden">
        {/* Sticky Drawer Header */}
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {vendor.category} · {vendor.locality}, {vendor.city}
            </p>
            <h2
              id="booking-drawer-title"
              className="font-display text-xl font-semibold text-slate-900 dark:text-white truncate"
            >
              {vendor.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void handleClose()}
            aria-label="Close booking window"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white ug-control-radius hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          {errorMsg && (
            <div
              role="alert"
              className="mb-5 p-3.5 text-sm bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 ug-control-radius"
            >
              {errorMsg}
            </div>
          )}

          {/* STEP 1: CONFIGURE PACKAGE & REAL-TIME SLOT */}
          {step === 'configure' && selectedPackage && pricing && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
              <div className="lg:col-span-7 space-y-6">
                {/* About & Highlights */}
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {vendor.about}
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    {vendor.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="ug-accent-text font-semibold" aria-hidden="true">
                          —
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Package Selector */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                    1. Choose Service Package
                  </h3>
                  <div className="space-y-2.5">
                    {vendor.packages.map((pkg) => {
                      const active = pkg.id === selectedPackage.id;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => {
                            setSelectedPackageId(pkg.id);
                            setSelectedAddonIds([]);
                            setGuestCount(pkg.includedGuests);
                          }}
                          className={`w-full text-left p-4 border ug-control-radius transition-colors cursor-pointer ${
                            active
                              ? 'ug-accent-border ug-accent-soft-bg'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-sm text-slate-900 dark:text-white">
                                {pkg.name}
                              </p>
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                {pkg.description}
                              </p>
                            </div>
                            <span className="font-mono-num text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap shrink-0">
                              {formatINR(pkg.basePriceInr)}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Includes up to {pkg.includedGuests} guests
                            {pkg.perGuestPriceInr > 0
                              ? ` · +${formatINR(pkg.perGuestPriceInr)} per additional guest`
                              : ' · Flat team rate'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Real-Time Date & Slot Availability Matrix */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                    2. Real-Time Date & Slot Availability
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {upcomingDates.slice(0, 8).map((d) => {
                      const isPicked = d === selectedDate;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelectedDate(d)}
                          className={`min-h-[44px] px-3 py-2 text-xs font-medium border ug-control-radius whitespace-nowrap transition-colors cursor-pointer ${
                            isPicked
                              ? 'text-white ug-accent-bg ug-accent-border'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {formatEventDate(d).replace(/, \d{4}$/, '')}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {SLOT_WINDOWS.map((slot) => {
                      const info = resolveSlotStatus(
                        vendor.id,
                        selectedDate,
                        slot,
                        availability,
                        Date.now(),
                        sessionId
                      );
                      const isAvailable = info.status === 'available';
                      const isSelected = selectedSlot === slot && isAvailable;
                      const meta = SLOT_WINDOW_LABELS[slot];

                      const statusText =
                        info.status === 'available'
                          ? 'Available'
                          : info.status === 'booked'
                          ? 'Booked'
                          : info.status === 'held'
                          ? 'Held (Checkout)'
                          : 'Blocked by Vendor';

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setSelectedSlot(slot)}
                          aria-label={`${meta.label} slot (${meta.timeRange}) — ${statusText}`}
                          className={`min-h-[68px] p-3 text-left border ug-control-radius transition-colors ${
                            !isAvailable
                              ? 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-65 cursor-not-allowed'
                              : isSelected
                              ? 'ug-accent-border ug-accent-soft-bg cursor-pointer'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 cursor-pointer'
                          }`}
                        >
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            {meta.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {meta.timeRange}
                          </p>
                          <p
                            className={`text-[11px] font-medium mt-1.5 ${
                              info.status === 'available'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : info.status === 'held'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {statusText}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Guest Count & Optional Add-ons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="guest-count-input"
                      className="block text-xs font-semibold text-slate-900 dark:text-white mb-1.5"
                    >
                      3. Expected Guests ({vendor.guestCapacityMin}–{vendor.guestCapacityMax})
                    </label>
                    <input
                      id="guest-count-input"
                      type="number"
                      min={vendor.guestCapacityMin}
                      max={vendor.guestCapacityMax}
                      value={guestCount}
                      onChange={(e) =>
                        setGuestCount(
                          Math.max(
                            vendor.guestCapacityMin,
                            Math.min(
                              vendor.guestCapacityMax,
                              Number(e.target.value) || vendor.guestCapacityMin
                            )
                          )
                        )
                      }
                      className="w-full min-h-[44px] px-3 text-sm font-mono-num bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius ug-accent-ring"
                    />
                  </div>
                </div>

                {selectedPackage.addons.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      4. Optional Enhancements
                    </h3>
                    <div className="space-y-2">
                      {selectedPackage.addons.map((addon) => {
                        const checked = selectedAddonIds.includes(addon.id);
                        return (
                          <label
                            key={addon.id}
                            className="flex items-center justify-between gap-3 p-3 border border-slate-200 dark:border-slate-800 ug-control-radius cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50"
                          >
                            <span className="flex items-center gap-3 text-sm text-slate-800 dark:text-slate-200">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleAddon(addon.id)}
                                className="w-4 h-4 accent-[var(--ug-accent)]"
                              />
                              <span>
                                {addon.name}{' '}
                                <span className="text-xs text-slate-500">
                                  ({addon.unitLabel})
                                </span>
                              </span>
                            </span>
                            <span className="font-mono-num text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              +{formatINR(addon.priceInr)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Contiguous Summary & Hold CTA */}
              <div className="lg:col-span-5">
                <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-5 ug-card-radius sticky top-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Booking Summary
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {formatEventDate(selectedDate)} ·{' '}
                    {selectedSlot
                      ? SLOT_WINDOW_LABELS[selectedSlot].label
                      : 'No slot open'}
                  </p>

                  {/* Payment Plan Choice: Full vs 25% Token */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentPlan('token_25')}
                      className={`min-h-[44px] px-3 py-2 text-xs font-medium border ug-control-radius text-left cursor-pointer ${
                        paymentPlan === 'token_25'
                          ? 'ug-accent-border ug-accent-soft-bg text-slate-900 dark:text-white'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="block font-semibold">25% Token</span>
                      <span className="text-[11px] opacity-80">
                        Lock date now
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentPlan('full')}
                      className={`min-h-[44px] px-3 py-2 text-xs font-medium border ug-control-radius text-left cursor-pointer ${
                        paymentPlan === 'full'
                          ? 'ug-accent-border ug-accent-soft-bg text-slate-900 dark:text-white'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="block font-semibold">100% Full Pay</span>
                      <span className="text-[11px] opacity-80">
                        Single GST receipt
                      </span>
                    </button>
                  </div>

                  {/* Itemized Breakdown */}
                  <dl className="mt-5 space-y-2.5 text-sm border-t border-slate-200 dark:border-slate-800 pt-4">
                    <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-300">
                      <dt>{selectedPackage.name}</dt>
                      <dd className="font-mono-num">{formatINR(pricing.basePriceInr)}</dd>
                    </div>
                    {pricing.extraGuestsChargeInr > 0 && (
                      <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-300">
                        <dt>Extra guests ({pricing.extraGuestCount})</dt>
                        <dd className="font-mono-num">
                          {formatINR(pricing.extraGuestsChargeInr)}
                        </dd>
                      </div>
                    )}
                    {pricing.addonsTotalInr > 0 && (
                      <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-300">
                        <dt>Selected enhancements</dt>
                        <dd className="font-mono-num">
                          {formatINR(pricing.addonsTotalInr)}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-300">
                      <dt>GST (18%)</dt>
                      <dd className="font-mono-num">{formatINR(pricing.gstInr)}</dd>
                    </div>
                    <div className="flex justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-white">
                      <dt>Total Package Value</dt>
                      <dd className="font-mono-num">{formatINR(pricing.totalInr)}</dd>
                    </div>
                    <div className="flex justify-between gap-2 text-sm font-semibold ug-accent-text">
                      <dt>
                        {paymentPlan === 'token_25'
                          ? 'Payable Now (25% Token)'
                          : 'Payable Now (Full)'}
                      </dt>
                      <dd className="font-mono-num">
                        {formatINR(pricing.payableNowInr)}
                      </dd>
                    </div>
                    {pricing.balanceDueInr > 0 && (
                      <div className="flex justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <dt>Balance due 7 days pre-event</dt>
                        <dd className="font-mono-num">
                          {formatINR(pricing.balanceDueInr)}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <button
                    type="button"
                    disabled={busy || !selectedSlot}
                    onClick={() => void handleHoldAndContinue()}
                    className="mt-5 w-full min-h-[48px] px-4 py-2.5 text-sm font-medium text-white ug-accent-bg ug-control-radius ug-accent-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {busy
                      ? 'Locking Slot...'
                      : selectedSlot
                      ? `Hold Slot (10 Min) & Pay ${formatINR(pricing.payableNowInr)}`
                      : 'Select an Available Date'}
                  </button>

                  <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Clicking Hold temporarily reserves this slot across all users for 10 minutes while you finish Razorpay / UPI checkout.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ACTIVE 10-MINUTE HOLD & RAZORPAY / UPI PAYMENT */}
          {step === 'payment' && activeHold && pricing && (
            <form
              onSubmit={(e) => void handleCompletePayment(e)}
              className="grid grid-cols-1 lg:grid-cols-12 gap-7"
            >
              <div className="lg:col-span-7 space-y-5">
                {/* Active Hold Notice */}
                <div className="flex items-center justify-between gap-4 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 ug-control-radius">
                  <div className="flex items-center gap-2.5 text-sm text-amber-900 dark:text-amber-200">
                    <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      Slot locked for{' '}
                      <strong>{formatEventDate(activeHold.eventDate)}</strong> (
                      {SLOT_WINDOW_LABELS[activeHold.slotWindow].label})
                    </span>
                  </div>
                  <span className="font-mono-num text-sm font-semibold text-amber-900 dark:text-amber-100 whitespace-nowrap">
                    {formatCountdown(activeHold.expiresAt, nowMs)}
                  </span>
                </div>

                {/* Contact & Venue Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="checkout-name"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Full Name *
                    </label>
                    <input
                      id="checkout-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ananya Kulkarni"
                      className="w-full min-h-[44px] px-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius ug-accent-ring"
                    />
                    {fieldErrors.customerName && (
                      <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                        {fieldErrors.customerName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-phone"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Indian Mobile Number *
                    </label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="9845012345"
                      className="w-full min-h-[44px] px-3 text-sm font-mono-num bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius ug-accent-ring"
                    />
                    {fieldErrors.customerPhone && (
                      <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                        {fieldErrors.customerPhone}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="checkout-email"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Email for GST Invoice *
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="ananya@example.in"
                      className="w-full min-h-[44px] px-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius ug-accent-ring"
                    />
                    {fieldErrors.customerEmail && (
                      <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                        {fieldErrors.customerEmail}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="checkout-venue"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Event Venue & Locality Address *
                    </label>
                    <input
                      id="checkout-venue"
                      type="text"
                      value={venueAddress}
                      onChange={(e) => setVenueAddress(e.target.value)}
                      placeholder="Taj West End Lawns, Race Course Rd, Bengaluru"
                      className="w-full min-h-[44px] px-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius ug-accent-ring"
                    />
                    {fieldErrors.venueAddress && (
                      <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                        {fieldErrors.venueAddress}
                      </p>
                    )}
                  </div>
                </div>

                {/* Razorpay / UPI Method Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Razorpay / UPI Payment Method
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {paymentGatewayMode === 'live_razorpay'
                        ? 'Live Razorpay Gateway'
                        : 'Offline UPI Sandbox'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PAYMENT_METHODS.map((pm) => {
                      const active = paymentMethod === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMethod(pm.id)}
                          className={`min-h-[54px] p-3 text-left border ug-control-radius flex items-center gap-3 cursor-pointer transition-colors ${
                            active
                              ? 'ug-accent-border ug-accent-soft-bg'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                          }`}
                        >
                          {pm.id === 'card' ? (
                            <CreditCard
                              className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0"
                              aria-hidden="true"
                            />
                          ) : (
                            <Smartphone
                              className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          <span>
                            <span className="block text-xs font-semibold text-slate-900 dark:text-white">
                              {pm.label}
                            </span>
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                              {pm.hint}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {paymentMethod === 'upi_id' && (
                    <div className="mt-3">
                      <label
                        htmlFor="checkout-upi-id"
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                      >
                        UPI ID (VPA) *
                      </label>
                      <input
                        id="checkout-upi-id"
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="ananya@okhdfcbank"
                        className="w-full min-h-[44px] px-3 text-sm font-mono-num bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white ug-control-radius ug-accent-ring"
                      />
                      {fieldErrors.upiId && (
                        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                          {fieldErrors.upiId}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Payment Confirmation Column */}
              <div className="lg:col-span-5">
                <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-5 ug-card-radius space-y-4">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <ShieldCheck className="w-4 h-4 ug-accent-text" aria-hidden="true" />
                    <span>Razorpay Order Ref:</span>
                    <span className="font-mono-num text-slate-900 dark:text-white">
                      {orderId}
                    </span>
                  </div>

                  <dl className="space-y-2 text-sm border-t border-slate-200 dark:border-slate-800 pt-3">
                    <div className="flex justify-between">
                      <dt className="text-slate-600 dark:text-slate-400">Package</dt>
                      <dd className="font-medium text-slate-900 dark:text-white">
                        {selectedPackage?.name}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600 dark:text-slate-400">Guests</dt>
                      <dd className="font-mono-num text-slate-900 dark:text-white">
                        {guestCount}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600 dark:text-slate-400">Total incl. GST</dt>
                      <dd className="font-mono-num text-slate-900 dark:text-white">
                        {formatINR(pricing.totalInr)}
                      </dd>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-base font-semibold ug-accent-text">
                      <dt>Amount to Pay Now</dt>
                      <dd className="font-mono-num">
                        {formatINR(pricing.payableNowInr)}
                      </dd>
                    </div>
                  </dl>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full min-h-[48px] px-4 py-2.5 text-sm font-medium text-white ug-accent-bg ug-control-radius ug-accent-ring flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {busy
                        ? 'Verifying UPI Payment...'
                        : `Pay ${formatINR(pricing.payableNowInr)} & Confirm Booking`}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleBackToConfigure()}
                    className="w-full min-h-[44px] px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 ug-control-radius cursor-pointer"
                  >
                    Release Hold & Edit Package
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* STEP 3: INSTANT BOOKING CONFIRMATION & GST RECEIPT */}
          {step === 'confirmed' && confirmedBooking && (
            <div className="max-w-xl mx-auto py-4">
              <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-7 h-7 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs font-medium">
                    Booking Confirmed · Real-Time Calendar Locked
                  </p>
                  <h3 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">
                    Booking {confirmedBooking.bookingCode}
                  </h3>
                </div>
              </div>

              <div className="mt-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 ug-card-radius space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">Company</span>
                  <span className="font-medium text-slate-900 dark:text-white text-right">
                    {confirmedBooking.vendorName} ({confirmedBooking.vendorLocality})
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">Date & Slot</span>
                  <span className="font-medium text-slate-900 dark:text-white text-right">
                    {formatEventDate(confirmedBooking.eventDate)} ·{' '}
                    {SLOT_WINDOW_LABELS[confirmedBooking.slotWindow].label}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">Package</span>
                  <span className="text-slate-900 dark:text-white text-right">
                    {confirmedBooking.packageName} ({confirmedBooking.guestCount} guests)
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">
                    Payment Ref
                  </span>
                  <span className="font-mono-num text-xs text-slate-900 dark:text-white">
                    {confirmedBooking.razorpayPaymentId}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between gap-4 font-semibold text-slate-900 dark:text-white">
                  <span>Paid Now (incl. 18% GST)</span>
                  <span className="font-mono-num">
                    {formatINR(confirmedBooking.amountPaidInr)}
                  </span>
                </div>
                {confirmedBooking.balanceDueInr > 0 && (
                  <div className="flex justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span>Remaining Balance (due 7 days prior)</span>
                    <span className="font-mono-num">
                      {formatINR(confirmedBooking.balanceDueInr)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoToBookings();
                  }}
                  className="flex-1 min-h-[44px] px-4 py-2.5 text-sm font-medium text-white ug-accent-bg ug-control-radius cursor-pointer"
                >
                  View in My Bookings
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-5 py-2.5 text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 ug-control-radius cursor-pointer"
                >
                  Back to Discover
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
