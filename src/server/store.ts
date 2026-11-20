import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  calculateBookingPricing,
  hasSlotConflict,
  HOLD_TTL_MS,
  validateBookingCustomerInput,
} from '../lib/bookingEngine';
import { DEFAULT_THEME_CONFIG, normalizeThemeConfig } from '../lib/themeUtils';
import type {
  AppBootstrapState,
  BlockedSlot,
  Booking,
  BookingStatus,
  PaymentMethod,
  PaymentPlan,
  ServicePackage,
  SlotHold,
  SlotWindow,
  ThemeConfig,
  Vendor,
} from '../lib/types';
import {
  createSeedBlockedSlots,
  createSeedBookings,
  createSeedVendors,
} from './seedData';

interface PersistedDatabase {
  vendors: Vendor[];
  blockedSlots: BlockedSlot[];
  activeHolds: SlotHold[];
  bookings: Booking[];
  theme: ThemeConfig;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'utsavgrid-db.json');

export class EventPlatformStore {
  private state: PersistedDatabase;

  constructor() {
    this.state = this.loadFromDisk();
  }

  private loadFromDisk(): PersistedDatabase {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<PersistedDatabase>;
        if (Array.isArray(parsed.vendors) && parsed.vendors.length > 0) {
          return {
            vendors: parsed.vendors,
            blockedSlots: Array.isArray(parsed.blockedSlots)
              ? parsed.blockedSlots
              : [],
            activeHolds: Array.isArray(parsed.activeHolds)
              ? parsed.activeHolds
              : [],
            bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
            theme: normalizeThemeConfig(parsed.theme ?? DEFAULT_THEME_CONFIG),
          };
        }
      }
    } catch {
      // Fall back to deterministic seed state if file is unreadable
    }

    const seeded: PersistedDatabase = {
      vendors: createSeedVendors(),
      blockedSlots: createSeedBlockedSlots(),
      activeHolds: [],
      bookings: createSeedBookings(),
      theme: { ...DEFAULT_THEME_CONFIG },
    };
    this.saveToDisk(seeded);
    return seeded;
  }

  private saveToDisk(nextState: PersistedDatabase = this.state): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(nextState, null, 2), 'utf-8');
    } catch {
      // Keep running in memory if filesystem is read-only
    }
  }

  public purgeExpiredHolds(nowMs: number = Date.now()): string[] {
    const expiredIds: string[] = [];
    const remaining: SlotHold[] = [];
    for (const hold of this.state.activeHolds) {
      if (Date.parse(hold.expiresAt) <= nowMs) {
        expiredIds.push(hold.id);
      } else {
        remaining.push(hold);
      }
    }
    if (expiredIds.length > 0) {
      this.state.activeHolds = remaining;
      this.saveToDisk();
    }
    return expiredIds;
  }

  public isLiveRazorpayConfigured(): boolean {
    return Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    );
  }

  public getBootstrapState(): AppBootstrapState {
    this.purgeExpiredHolds();
    return {
      vendors: this.state.vendors,
      blockedSlots: this.state.blockedSlots,
      activeHolds: this.state.activeHolds,
      bookings: this.state.bookings,
      theme: this.state.theme,
      serverTime: new Date().toISOString(),
      paymentGatewayMode: this.isLiveRazorpayConfigured()
        ? 'live_razorpay'
        : 'offline_upi_sandbox',
    };
  }

  public getVendorById(vendorId: string): Vendor | undefined {
    return this.state.vendors.find((v) => v.id === vendorId);
  }

  public getHoldById(holdId: string): SlotHold | undefined {
    this.purgeExpiredHolds();
    return this.state.activeHolds.find((h) => h.id === holdId);
  }

  public createHold(params: {
    vendorId: string;
    packageId: string;
    eventDate: string;
    slotWindow: SlotWindow;
    sessionId: string;
  }): { ok: true; hold: SlotHold } | { ok: false; status: number; error: string } {
    this.purgeExpiredHolds();
    const vendor = this.getVendorById(params.vendorId);
    if (!vendor) {
      return { ok: false, status: 404, error: 'Event company not found.' };
    }
    const pkg = vendor.packages.find((p) => p.id === params.packageId);
    if (!pkg) {
      return { ok: false, status: 404, error: 'Selected service package not found.' };
    }

    const nowMs = Date.now();
    const conflictCheck = hasSlotConflict(
      params.vendorId,
      params.eventDate,
      params.slotWindow,
      {
        blockedSlots: this.state.blockedSlots,
        activeHolds: this.state.activeHolds,
        bookings: this.state.bookings,
      },
      nowMs,
      params.sessionId
    );

    if (conflictCheck.conflict) {
      return {
        ok: false,
        status: 409,
        error: conflictCheck.reason || 'This slot is no longer available.',
      };
    }

    // Release any previous hold owned by the same session on the same vendor/date
    this.state.activeHolds = this.state.activeHolds.filter(
      (h) =>
        !(
          h.sessionId === params.sessionId &&
          h.vendorId === params.vendorId &&
          h.eventDate === params.eventDate
        )
    );

    const hold: SlotHold = {
      id: `hold_${crypto.randomBytes(6).toString('hex')}`,
      vendorId: params.vendorId,
      packageId: params.packageId,
      eventDate: params.eventDate,
      slotWindow: params.slotWindow,
      sessionId: params.sessionId,
      createdAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + HOLD_TTL_MS).toISOString(),
    };

    this.state.activeHolds.push(hold);
    this.saveToDisk();
    return { ok: true, hold };
  }

  public releaseHold(holdId: string): boolean {
    const before = this.state.activeHolds.length;
    this.state.activeHolds = this.state.activeHolds.filter((h) => h.id !== holdId);
    if (this.state.activeHolds.length !== before) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  public async createPaymentOrder(params: {
    holdId: string;
    guestCount: number;
    selectedAddonIds: string[];
    paymentPlan: PaymentPlan;
  }): Promise<
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
    | { ok: false; status: number; error: string }
  > {
    const hold = this.getHoldById(params.holdId);
    if (!hold) {
      return {
        ok: false,
        status: 410,
        error: 'Your 10-minute slot hold has expired. Please re-select the slot.',
      };
    }
    const vendor = this.getVendorById(hold.vendorId);
    const pkg = vendor?.packages.find((p) => p.id === hold.packageId);
    if (!vendor || !pkg) {
      return { ok: false, status: 404, error: 'Package details could not be resolved.' };
    }

    const pricing = calculateBookingPricing(
      pkg,
      params.selectedAddonIds,
      params.guestCount,
      params.paymentPlan
    );
    const amountPaise = pricing.payableNowInr * 100;

    if (this.isLiveRazorpayConfigured()) {
      const keyId = process.env.RAZORPAY_KEY_ID!;
      const keySecret = process.env.RAZORPAY_KEY_SECRET!;
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      try {
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            receipt: hold.id,
            notes: {
              vendorId: vendor.id,
              eventDate: hold.eventDate,
              slotWindow: hold.slotWindow,
            },
          }),
        });
        if (response.ok) {
          const rzpOrder = (await response.json()) as { id: string };
          return {
            ok: true,
            order: {
              orderId: rzpOrder.id,
              amountPaise,
              amountInr: pricing.payableNowInr,
              currency: 'INR',
              mode: 'live_razorpay',
              keyId,
            },
          };
        }
      } catch {
        // Fall through to offline sandbox if network is unavailable offline
      }
    }

    return {
      ok: true,
      order: {
        orderId: `order_UG${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
        amountPaise,
        amountInr: pricing.payableNowInr,
        currency: 'INR',
        mode: 'offline_upi_sandbox',
      },
    };
  }

  public verifyAndConfirmBooking(params: {
    holdId: string;
    sessionId: string;
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
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  }):
    | { ok: true; booking: Booking; releasedHoldId: string }
    | { ok: false; status: number; error: string; fieldErrors?: Record<string, string> } {
    this.purgeExpiredHolds();

    const validation = validateBookingCustomerInput({
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      customerEmail: params.customerEmail,
      venueAddress: params.venueAddress,
      paymentMethod: params.paymentMethod,
      upiId: params.upiId,
    });
    if (!validation.valid) {
      return {
        ok: false,
        status: 400,
        error: 'Please correct the highlighted checkout fields.',
        fieldErrors: validation.errors,
      };
    }

    const hold = this.state.activeHolds.find((h) => h.id === params.holdId);
    if (!hold) {
      return {
        ok: false,
        status: 410,
        error: 'Your slot hold expired before payment completed. Please re-hold the date.',
      };
    }

    // Verify no concurrent conflict exists outside this hold's session
    const conflict = hasSlotConflict(
      hold.vendorId,
      hold.eventDate,
      hold.slotWindow,
      {
        blockedSlots: this.state.blockedSlots,
        activeHolds: this.state.activeHolds,
        bookings: this.state.bookings,
      },
      Date.now(),
      hold.sessionId
    );
    if (conflict.conflict) {
      return {
        ok: false,
        status: 409,
        error: conflict.reason || 'Slot became unavailable before confirmation.',
      };
    }

    // If live Razorpay signature was provided, verify HMAC-SHA256
    let paymentMode: 'live_razorpay' | 'offline_upi_sandbox' = 'offline_upi_sandbox';
    if (
      this.isLiveRazorpayConfigured() &&
      params.razorpayPaymentId &&
      params.razorpaySignature
    ) {
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
        .digest('hex');
      if (expected !== params.razorpaySignature) {
        return {
          ok: false,
          status: 400,
          error: 'Razorpay payment signature verification failed.',
        };
      }
      paymentMode = 'live_razorpay';
    }

    const vendor = this.getVendorById(hold.vendorId);
    const pkg = vendor?.packages.find((p) => p.id === hold.packageId);
    if (!vendor || !pkg) {
      return { ok: false, status: 404, error: 'Vendor package no longer exists.' };
    }

    const pricing = calculateBookingPricing(
      pkg,
      params.selectedAddonIds,
      params.guestCount,
      params.paymentPlan
    );

    const selectedAddonNames = pkg.addons
      .filter((a) => params.selectedAddonIds.includes(a.id))
      .map((a) => a.name);

    const booking: Booking = {
      id: `bkg_${crypto.randomBytes(6).toString('hex')}`,
      bookingCode: `UG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorCity: vendor.city,
      vendorLocality: vendor.locality,
      packageId: pkg.id,
      packageName: pkg.name,
      eventDate: hold.eventDate,
      slotWindow: hold.slotWindow,
      guestCount: Math.max(1, Math.round(params.guestCount)),
      selectedAddonIds: params.selectedAddonIds,
      selectedAddonNames,
      customerName: params.customerName.trim(),
      customerPhone: params.customerPhone.trim(),
      customerEmail: params.customerEmail.trim(),
      venueAddress: params.venueAddress.trim(),
      paymentPlan: params.paymentPlan,
      paymentMethod: params.paymentMethod,
      subtotalInr: pricing.subtotalInr,
      gstInr: pricing.gstInr,
      totalInr: pricing.totalInr,
      amountPaidInr: pricing.payableNowInr,
      balanceDueInr: pricing.balanceDueInr,
      razorpayOrderId: params.razorpayOrderId,
      razorpayPaymentId:
        params.razorpayPaymentId ||
        `pay_UPI${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
      paymentMode,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    // Commit booking and remove consumed hold atomically
    this.state.bookings.unshift(booking);
    this.state.activeHolds = this.state.activeHolds.filter((h) => h.id !== hold.id);
    this.saveToDisk();

    return { ok: true, booking, releasedHoldId: hold.id };
  }

  public cancelBooking(bookingId: string): {
    ok: boolean;
    booking?: Booking;
    error?: string;
  } {
    const booking = this.state.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      return { ok: false, error: 'Booking not found.' };
    }
    if (booking.status === 'cancelled') {
      return { ok: true, booking };
    }
    booking.status = 'cancelled';
    this.saveToDisk();
    return { ok: true, booking };
  }

  public updateBookingStatus(
    bookingId: string,
    status: BookingStatus
  ): { ok: boolean; booking?: Booking; error?: string } {
    const booking = this.state.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      return { ok: false, error: 'Booking not found.' };
    }
    booking.status = status;
    this.saveToDisk();
    return { ok: true, booking };
  }

  public toggleVendorSlotBlock(params: {
    vendorId: string;
    eventDate: string;
    slotWindow: SlotWindow;
    blocked: boolean;
    reason?: string;
  }): { ok: true; blockedSlots: BlockedSlot[] } | { ok: false; status: number; error: string } {
    this.purgeExpiredHolds();
    const vendor = this.getVendorById(params.vendorId);
    if (!vendor) {
      return { ok: false, status: 404, error: 'Vendor not found.' };
    }

    if (params.blocked) {
      const existingBooking = this.state.bookings.find(
        (b) =>
          b.vendorId === params.vendorId &&
          b.eventDate === params.eventDate &&
          b.status !== 'cancelled' &&
          (b.slotWindow === params.slotWindow ||
            b.slotWindow === 'full_day' ||
            params.slotWindow === 'full_day')
      );
      if (existingBooking) {
        return {
          ok: false,
          status: 409,
          error: `Cannot block slot: already booked under ${existingBooking.bookingCode}.`,
        };
      }

      const alreadyBlocked = this.state.blockedSlots.some(
        (s) =>
          s.vendorId === params.vendorId &&
          s.eventDate === params.eventDate &&
          s.slotWindow === params.slotWindow
      );
      if (!alreadyBlocked) {
        this.state.blockedSlots.push({
          vendorId: params.vendorId,
          eventDate: params.eventDate,
          slotWindow: params.slotWindow,
          reason: params.reason?.trim() || 'Reserved offline by vendor',
        });
      }
    } else {
      this.state.blockedSlots = this.state.blockedSlots.filter(
        (s) =>
          !(
            s.vendorId === params.vendorId &&
            s.eventDate === params.eventDate &&
            s.slotWindow === params.slotWindow
          )
      );
    }

    this.saveToDisk();
    return { ok: true, blockedSlots: this.state.blockedSlots };
  }

  public addVendorPackage(
    vendorId: string,
    pkgInput: Omit<ServicePackage, 'id'>
  ): { ok: true; vendor: Vendor } | { ok: false; status: number; error: string } {
    const vendor = this.getVendorById(vendorId);
    if (!vendor) {
      return { ok: false, status: 404, error: 'Vendor not found.' };
    }
    if (!pkgInput.name.trim() || pkgInput.basePriceInr <= 0) {
      return {
        ok: false,
        status: 400,
        error: 'Package name and a positive INR base price are required.',
      };
    }

    const newPkg: ServicePackage = {
      ...pkgInput,
      id: `pkg_${crypto.randomBytes(4).toString('hex')}`,
      name: pkgInput.name.trim(),
      description: pkgInput.description.trim(),
      basePriceInr: Math.round(pkgInput.basePriceInr),
      perGuestPriceInr: Math.max(0, Math.round(pkgInput.perGuestPriceInr || 0)),
      includedGuests: Math.max(10, Math.round(pkgInput.includedGuests || 100)),
      deliverables: pkgInput.deliverables.filter((d) => d.trim().length > 0),
      addons: pkgInput.addons || [],
    };

    vendor.packages.push(newPkg);
    this.saveToDisk();
    return { ok: true, vendor };
  }

  public getTheme(): ThemeConfig {
    return this.state.theme;
  }

  public updateTheme(raw: unknown): ThemeConfig {
    this.state.theme = normalizeThemeConfig(raw);
    this.saveToDisk();
    return this.state.theme;
  }

  public getAllBookings(): Booking[] {
    return this.state.bookings;
  }
}
