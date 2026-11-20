import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBookingPricing,
  countAvailableSlotsForDate,
  doSlotWindowsOverlap,
  formatINR,
  hasSlotConflict,
  resolveSlotStatus,
  validateBookingCustomerInput,
} from './bookingEngine';
import type { Booking, ServicePackage, SlotHold } from './types';

const samplePackage: ServicePackage = {
  id: 'pkg-1',
  name: 'Heritage Floral Mandap',
  description: 'Complete custom floral mandap and aisle lighting',
  basePriceInr: 100000,
  perGuestPriceInr: 400,
  includedGuests: 150,
  deliverables: ['Teakwood Mandap', 'Warm LED Lighting'],
  addons: [
    { id: 'add-1', name: 'Live Shehnai Quartet', priceInr: 15000, unitLabel: 'per event' },
    { id: 'add-2', name: 'Photo Booth Wall', priceInr: 10000, unitLabel: 'per event' },
  ],
};

test('formatINR formats Indian currency with lakh grouping', () => {
  assert.equal(formatINR(125000), '₹1,25,000');
  assert.equal(formatINR(45000), '₹45,000');
});

test('doSlotWindowsOverlap enforces full_day exclusivity', () => {
  assert.equal(doSlotWindowsOverlap('morning', 'evening'), false);
  assert.equal(doSlotWindowsOverlap('morning', 'morning'), true);
  assert.equal(doSlotWindowsOverlap('full_day', 'morning'), true);
  assert.equal(doSlotWindowsOverlap('evening', 'full_day'), true);
});

test('calculateBookingPricing computes extra guests, add-ons, 18% GST, and 25% token split', () => {
  const full = calculateBookingPricing(samplePackage, ['add-1'], 200, 'full');
  // Base 100,000 + 50 extra guests * 400 (20,000) + add-on 15,000 = 135,000
  assert.equal(full.subtotalInr, 135000);
  assert.equal(full.gstInr, 24300);
  assert.equal(full.totalInr, 159300);
  assert.equal(full.payableNowInr, 159300);
  assert.equal(full.balanceDueInr, 0);

  const token = calculateBookingPricing(samplePackage, ['add-1'], 200, 'token_25');
  assert.equal(token.payableNowInr, 39825);
  assert.equal(token.balanceDueInr, 119475);
  assert.equal(token.payableNowInr + token.balanceDueInr, token.totalInr);
});

test('resolveSlotStatus respects bookings, vendor blocks, active holds, and ignores expired holds', () => {
  const now = Date.parse('2026-12-01T10:00:00.000Z');
  const activeHold: SlotHold = {
    id: 'hold-1',
    vendorId: 'v-1',
    packageId: 'pkg-1',
    eventDate: '2026-12-10',
    slotWindow: 'evening',
    sessionId: 'sess-other',
    createdAt: '2026-12-01T09:55:00.000Z',
    expiresAt: '2026-12-01T10:05:00.000Z',
  };
  const expiredHold: SlotHold = {
    ...activeHold,
    id: 'hold-expired',
    slotWindow: 'morning',
    expiresAt: '2026-12-01T09:59:00.000Z',
  };
  const confirmedBooking: Booking = {
    id: 'b-1',
    bookingCode: 'UG-2026-1001',
    vendorId: 'v-1',
    vendorName: 'Kala Mandap',
    vendorCity: 'Bengaluru',
    vendorLocality: 'Indiranagar',
    packageId: 'pkg-1',
    packageName: 'Heritage Floral Mandap',
    eventDate: '2026-12-11',
    slotWindow: 'morning',
    guestCount: 150,
    selectedAddonIds: [],
    selectedAddonNames: [],
    customerName: 'Aarav Sharma',
    customerPhone: '9876543210',
    customerEmail: 'aarav@example.com',
    venueAddress: 'Indiranagar Club',
    paymentPlan: 'full',
    paymentMethod: 'upi_gpay',
    subtotalInr: 100000,
    gstInr: 18000,
    totalInr: 118000,
    amountPaidInr: 118000,
    balanceDueInr: 0,
    razorpayOrderId: 'order_123',
    razorpayPaymentId: 'pay_123',
    paymentMode: 'offline_upi_sandbox',
    status: 'confirmed',
    createdAt: '2026-12-01T08:00:00.000Z',
  };

  const snapshot = {
    blockedSlots: [
      {
        vendorId: 'v-1',
        eventDate: '2026-12-12',
        slotWindow: 'full_day' as const,
        reason: 'Offline wedding',
      },
    ],
    activeHolds: [activeHold, expiredHold],
    bookings: [confirmedBooking],
  };

  // Expired morning hold resolves as available
  assert.equal(resolveSlotStatus('v-1', '2026-12-10', 'morning', snapshot, now).status, 'available');
  // Active evening hold blocks evening and full_day for other sessions
  assert.equal(resolveSlotStatus('v-1', '2026-12-10', 'evening', snapshot, now).status, 'held');
  assert.equal(resolveSlotStatus('v-1', '2026-12-10', 'full_day', snapshot, now).status, 'held');
  // Same session can proceed on its own hold
  assert.equal(
    hasSlotConflict('v-1', '2026-12-10', 'evening', snapshot, now, 'sess-other').conflict,
    false
  );
  // Confirmed morning booking blocks morning and full_day, leaves evening open
  assert.equal(resolveSlotStatus('v-1', '2026-12-11', 'morning', snapshot, now).status, 'booked');
  assert.equal(resolveSlotStatus('v-1', '2026-12-11', 'full_day', snapshot, now).status, 'booked');
  assert.equal(resolveSlotStatus('v-1', '2026-12-11', 'evening', snapshot, now).status, 'available');
  assert.equal(countAvailableSlotsForDate('v-1', '2026-12-11', snapshot, now), 1);
  // Full-day vendor block blocks all 3 windows
  assert.equal(countAvailableSlotsForDate('v-1', '2026-12-12', snapshot, now), 0);
});

test('validateBookingCustomerInput enforces Indian phone, email, address, and UPI ID', () => {
  const invalid = validateBookingCustomerInput({
    customerName: 'A',
    customerPhone: '12345',
    customerEmail: 'bad-email',
    venueAddress: 'Home',
    paymentMethod: 'upi_id',
    upiId: 'invalid-upi',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.customerName);
  assert.ok(invalid.errors.customerPhone);
  assert.ok(invalid.errors.customerEmail);
  assert.ok(invalid.errors.venueAddress);
  assert.ok(invalid.errors.upiId);

  const valid = validateBookingCustomerInput({
    customerName: 'Priya Nair',
    customerPhone: '+91 98450 12345',
    customerEmail: 'priya.nair@example.in',
    venueAddress: '100 Feet Road, Indiranagar, Bengaluru',
    paymentMethod: 'upi_id',
    upiId: 'priya.nair@okhdfcbank',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});
