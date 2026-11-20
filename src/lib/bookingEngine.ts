import type {
  BlockedSlot,
  Booking,
  BookingPricingBreakdown,
  PaymentMethod,
  PaymentPlan,
  ServicePackage,
  SlotAvailabilityState,
  SlotHold,
  SlotWindow,
} from './types';

export const GST_RATE = 0.18;
export const TOKEN_ADVANCE_RATE = 0.25;
export const HOLD_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const SLOT_WINDOW_LABELS: Record<
  SlotWindow,
  { label: string; timeRange: string }
> = {
  morning: { label: 'Morning', timeRange: '7:00 AM – 2:00 PM' },
  evening: { label: 'Evening', timeRange: '4:00 PM – 11:30 PM' },
  full_day: { label: 'Full Day', timeRange: '7:00 AM – 11:30 PM' },
};

/**
 * Formats an integer INR amount using the Indian numbering system (e.g. ₹1,25,000).
 */
export function formatINR(amount: number): string {
  const rounded = Math.round(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rounded);
}

/**
 * Formats an ISO YYYY-MM-DD date string for readable UI display.
 */
export function formatEventDate(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return isoDate;
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Generates an array of upcoming YYYY-MM-DD date strings starting tomorrow.
 */
export function getUpcomingDates(
  count: number,
  referenceDate: Date = new Date()
): string[] {
  const dates: string[] = [];
  const base = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  for (let i = 1; i <= count; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

/**
 * Two slot windows on the same vendor & date conflict if they are identical
 * or if either one is 'full_day'.
 */
export function doSlotWindowsOverlap(a: SlotWindow, b: SlotWindow): boolean {
  if (a === b) return true;
  if (a === 'full_day' || b === 'full_day') return true;
  return false;
}

export interface AvailabilitySnapshot {
  blockedSlots: BlockedSlot[];
  activeHolds: SlotHold[];
  bookings: Booking[];
}

export interface ResolvedSlotInfo {
  status: SlotAvailabilityState;
  hold?: SlotHold;
  booking?: Booking;
  blockReason?: string;
}

/**
 * Resolves the authoritative real-time availability state of a vendor's date + slot window.
 * Automatically ignores expired holds and cancelled bookings.
 */
export function resolveSlotStatus(
  vendorId: string,
  eventDate: string,
  slotWindow: SlotWindow,
  snapshot: AvailabilitySnapshot,
  nowMs: number = Date.now(),
  ignoreSessionId?: string
): ResolvedSlotInfo {
  const activeBooking = snapshot.bookings.find(
    (b) =>
      b.vendorId === vendorId &&
      b.eventDate === eventDate &&
      b.status !== 'cancelled' &&
      doSlotWindowsOverlap(b.slotWindow, slotWindow)
  );
  if (activeBooking) {
    return { status: 'booked', booking: activeBooking };
  }

  const blocked = snapshot.blockedSlots.find(
    (s) =>
      s.vendorId === vendorId &&
      s.eventDate === eventDate &&
      doSlotWindowsOverlap(s.slotWindow, slotWindow)
  );
  if (blocked) {
    return { status: 'blocked', blockReason: blocked.reason };
  }

  const activeHold = snapshot.activeHolds.find((h) => {
    if (h.vendorId !== vendorId || h.eventDate !== eventDate) return false;
    if (ignoreSessionId && h.sessionId === ignoreSessionId) return false;
    if (Date.parse(h.expiresAt) <= nowMs) return false;
    return doSlotWindowsOverlap(h.slotWindow, slotWindow);
  });
  if (activeHold) {
    return { status: 'held', hold: activeHold };
  }

  return { status: 'available' };
}

/**
 * Checks whether a new hold or booking can be safely created without double-booking.
 */
export function hasSlotConflict(
  vendorId: string,
  eventDate: string,
  slotWindow: SlotWindow,
  snapshot: AvailabilitySnapshot,
  nowMs: number = Date.now(),
  ignoreSessionId?: string
): { conflict: boolean; reason?: string; status: SlotAvailabilityState } {
  const resolved = resolveSlotStatus(
    vendorId,
    eventDate,
    slotWindow,
    snapshot,
    nowMs,
    ignoreSessionId
  );
  if (resolved.status === 'available') {
    return { conflict: false, status: 'available' };
  }
  if (resolved.status === 'booked') {
    return {
      conflict: true,
      status: 'booked',
      reason: 'This date and time slot is already booked.',
    };
  }
  if (resolved.status === 'blocked') {
    return {
      conflict: true,
      status: 'blocked',
      reason:
        resolved.blockReason || 'This slot has been blocked by the vendor.',
    };
  }
  return {
    conflict: true,
    status: 'held',
    reason:
      'Another customer currently has a 10-minute checkout hold on this slot.',
  };
}

/**
 * Counts how many of the 3 standard windows (morning, evening, full_day) are open on a date.
 */
export function countAvailableSlotsForDate(
  vendorId: string,
  eventDate: string,
  snapshot: AvailabilitySnapshot,
  nowMs: number = Date.now()
): number {
  const windows: SlotWindow[] = ['morning', 'evening', 'full_day'];
  return windows.filter(
    (w) =>
      resolveSlotStatus(vendorId, eventDate, w, snapshot, nowMs).status ===
      'available'
  ).length;
}

/**
 * Computes itemized INR pricing including extra guests, add-ons, 18% GST,
 * and Full Pay vs 25% Booking Token Advance split.
 */
export function calculateBookingPricing(
  pkg: ServicePackage,
  selectedAddonIds: string[],
  guestCount: number,
  paymentPlan: PaymentPlan
): BookingPricingBreakdown {
  const safeGuests = Math.max(1, Math.round(guestCount));
  const extraGuestCount = Math.max(0, safeGuests - pkg.includedGuests);
  const extraGuestsChargeInr = extraGuestCount * pkg.perGuestPriceInr;

  const addonsTotalInr = pkg.addons
    .filter((addon) => selectedAddonIds.includes(addon.id))
    .reduce((sum, addon) => sum + addon.priceInr, 0);

  const subtotalInr = pkg.basePriceInr + extraGuestsChargeInr + addonsTotalInr;
  const gstInr = Math.round(subtotalInr * GST_RATE);
  const totalInr = subtotalInr + gstInr;

  const payableNowInr =
    paymentPlan === 'token_25'
      ? Math.round(totalInr * TOKEN_ADVANCE_RATE)
      : totalInr;
  const balanceDueInr = Math.max(0, totalInr - payableNowInr);

  return {
    basePriceInr: pkg.basePriceInr,
    extraGuestCount,
    extraGuestsChargeInr,
    addonsTotalInr,
    subtotalInr,
    gstInr,
    totalInr,
    payableNowInr,
    balanceDueInr,
  };
}

export interface CustomerValidationInput {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  venueAddress: string;
  paymentMethod: PaymentMethod;
  upiId?: string;
}

export interface CustomerValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates customer checkout fields strictly without bypassing missing inputs.
 */
export function validateBookingCustomerInput(
  input: CustomerValidationInput
): CustomerValidationResult {
  const errors: Record<string, string> = {};

  if (!input.customerName.trim() || input.customerName.trim().length < 2) {
    errors.customerName = 'Enter the full name of the booking contact.';
  }

  const normalizedPhone = input.customerPhone.replace(/[\s\-+]/g, '');
  const indianPhone = normalizedPhone.startsWith('91') && normalizedPhone.length === 12
    ? normalizedPhone.slice(2)
    : normalizedPhone;
  if (!/^[6-9]\d{9}$/.test(indianPhone)) {
    errors.customerPhone = 'Enter a valid 10-digit Indian mobile number.';
  }

  if (
    !input.customerEmail.trim() ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customerEmail.trim())
  ) {
    errors.customerEmail = 'Enter a valid email address for the GST receipt.';
  }

  if (!input.venueAddress.trim() || input.venueAddress.trim().length < 6) {
    errors.venueAddress = 'Enter the locality or event venue address.';
  }

  if (input.paymentMethod === 'upi_id') {
    const upi = (input.upiId || '').trim();
    if (!/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(upi)) {
      errors.upiId = 'Enter a valid UPI ID (e.g. name@okaxis or name@ybl).';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
