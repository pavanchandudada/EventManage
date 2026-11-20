export type EventCategory =
  | 'Wedding Decor'
  | 'Artisan Catering'
  | 'Photography & Film'
  | 'Corporate Production'
  | 'Boutique Celebrations'
  | 'Full-Service Planning';

export type SlotWindow = 'morning' | 'evening' | 'full_day';

export type SlotAvailabilityState =
  | 'available'
  | 'held'
  | 'booked'
  | 'blocked';

export type PaymentPlan = 'full' | 'token_25';

export type PaymentMethod =
  | 'upi_gpay'
  | 'upi_phonepe'
  | 'upi_paytm'
  | 'upi_id'
  | 'card';

export type BookingStatus =
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ServiceAddon {
  id: string;
  name: string;
  priceInr: number;
  unitLabel: string;
}

export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  basePriceInr: number;
  perGuestPriceInr: number;
  includedGuests: number;
  deliverables: string[];
  addons: ServiceAddon[];
}

export interface Vendor {
  id: string;
  name: string;
  tagline: string;
  category: EventCategory;
  city: string;
  locality: string;
  pincode: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  responseMinutes: number;
  guestCapacityMin: number;
  guestCapacityMax: number;
  coverImage: string;
  about: string;
  highlights: string[];
  packages: ServicePackage[];
}

export interface BlockedSlot {
  vendorId: string;
  eventDate: string; // YYYY-MM-DD
  slotWindow: SlotWindow;
  reason: string;
}

export interface SlotHold {
  id: string;
  vendorId: string;
  packageId: string;
  eventDate: string; // YYYY-MM-DD
  slotWindow: SlotWindow;
  sessionId: string;
  expiresAt: string; // ISO timestamp
  createdAt: string;
}

export interface BookingPricingBreakdown {
  basePriceInr: number;
  extraGuestCount: number;
  extraGuestsChargeInr: number;
  addonsTotalInr: number;
  subtotalInr: number;
  gstInr: number;
  totalInr: number;
  payableNowInr: number;
  balanceDueInr: number;
}

export interface Booking {
  id: string;
  bookingCode: string;
  vendorId: string;
  vendorName: string;
  vendorCity: string;
  vendorLocality: string;
  packageId: string;
  packageName: string;
  eventDate: string; // YYYY-MM-DD
  slotWindow: SlotWindow;
  guestCount: number;
  selectedAddonIds: string[];
  selectedAddonNames: string[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  venueAddress: string;
  paymentPlan: PaymentPlan;
  paymentMethod: PaymentMethod;
  subtotalInr: number;
  gstInr: number;
  totalInr: number;
  amountPaidInr: number;
  balanceDueInr: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  paymentMode: 'live_razorpay' | 'offline_upi_sandbox';
  status: BookingStatus;
  createdAt: string;
}

export type FontPairingId =
  | 'fraunces-jakarta'
  | 'playfair-dm'
  | 'bricolage-manrope';

export type RadiusScale = 'sharp' | 'balanced' | 'soft';
export type CardDensity = 'comfortable' | 'compact';

export type StorefrontSectionId =
  | 'hero'
  | 'catalog'
  | 'trust_guarantees'
  | 'localities';

export interface StorefrontSectionConfig {
  id: StorefrontSectionId;
  label: string;
  visible: boolean;
}

export interface ThemeConfig {
  brandName: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryAccent: string;
  secondaryAccent: string;
  colorMode: 'light' | 'dark';
  fontPairing: FontPairingId;
  radiusScale: RadiusScale;
  cardDensity: CardDensity;
  showVerifiedOnlyDefault: boolean;
  sections: StorefrontSectionConfig[];
}

export interface AppBootstrapState {
  vendors: Vendor[];
  blockedSlots: BlockedSlot[];
  activeHolds: SlotHold[];
  bookings: Booking[];
  theme: ThemeConfig;
  serverTime: string;
  paymentGatewayMode: 'live_razorpay' | 'offline_upi_sandbox';
}

export type RealtimeEvent =
  | { type: 'slot:held'; hold: SlotHold }
  | { type: 'slot:released'; holdId: string }
  | { type: 'slot:booked'; booking: Booking; releasedHoldId?: string }
  | { type: 'slot:updated'; blockedSlots: BlockedSlot[]; bookings?: Booking[] }
  | { type: 'vendor:updated'; vendor: Vendor }
  | { type: 'theme:updated'; theme: ThemeConfig };
