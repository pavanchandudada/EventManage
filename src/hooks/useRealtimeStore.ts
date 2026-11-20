import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_THEME_CONFIG } from '../lib/themeUtils';
import type {
  AppBootstrapState,
  BlockedSlot,
  Booking,
  BookingStatus,
  PaymentMethod,
  PaymentPlan,
  RealtimeEvent,
  SlotHold,
  SlotWindow,
  ThemeConfig,
  Vendor,
} from '../lib/types';

function getOrCreateSessionId(): string {
  const key = 'utsavgrid_session_id';
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const next = `sess_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    window.localStorage.setItem(key, next);
    return next;
  } catch {
    return `sess_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function useRealtimeStore() {
  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [activeHolds, setActiveHolds] = useState<SlotHold[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  const [paymentGatewayMode, setPaymentGatewayMode] = useState<
    'live_razorpay' | 'offline_upi_sandbox'
  >('offline_upi_sandbox');

  const reconnectTimerRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) {
        throw new Error(`Unable to load marketplace data (${res.status})`);
      }
      const data = (await res.json()) as AppBootstrapState;
      setVendors(data.vendors);
      setBlockedSlots(data.blockedSlots);
      setActiveHolds(data.activeHolds);
      setBookings(data.bookings);
      setTheme(data.theme);
      setPaymentGatewayMode(data.paymentGatewayMode);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to reach event server.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const applyRealtimeEvent = useCallback((event: RealtimeEvent) => {
    switch (event.type) {
      case 'slot:held':
        setActiveHolds((prev) => {
          const withoutSame = prev.filter(
            (h) =>
              h.id !== event.hold.id &&
              !(
                h.sessionId === event.hold.sessionId &&
                h.vendorId === event.hold.vendorId &&
                h.eventDate === event.hold.eventDate
              )
          );
          return [...withoutSame, event.hold];
        });
        break;
      case 'slot:released':
        setActiveHolds((prev) => prev.filter((h) => h.id !== event.holdId));
        break;
      case 'slot:booked':
        setBookings((prev) => {
          if (prev.some((b) => b.id === event.booking.id)) {
            return prev.map((b) =>
              b.id === event.booking.id ? event.booking : b
            );
          }
          return [event.booking, ...prev];
        });
        if (event.releasedHoldId) {
          setActiveHolds((prev) =>
            prev.filter((h) => h.id !== event.releasedHoldId)
          );
        }
        break;
      case 'slot:updated':
        setBlockedSlots(event.blockedSlots);
        if (event.bookings) {
          setBookings(event.bookings);
        }
        break;
      case 'vendor:updated':
        setVendors((prev) =>
          prev.map((v) => (v.id === event.vendor.id ? event.vendor : v))
        );
        break;
      case 'theme:updated':
        setTheme(event.theme);
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    void fetchBootstrap();
  }, [fetchBootstrap]);

  useEffect(() => {
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = socket;

      socket.addEventListener('open', () => {
        if (!unmounted) {
          setWsConnected(true);
        }
      });

      socket.addEventListener('message', (msg) => {
        try {
          const parsed = JSON.parse(msg.data) as RealtimeEvent | { type: 'connected' };
          if (parsed.type !== 'connected') {
            applyRealtimeEvent(parsed);
          }
        } catch {
          // Ignore non-event frames
        }
      });

      socket.addEventListener('close', () => {
        if (!unmounted) {
          setWsConnected(false);
          reconnectTimerRef.current = window.setTimeout(() => {
            void fetchBootstrap();
            connect();
          }, 3000);
        }
      });
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [applyRealtimeEvent, fetchBootstrap]);

  const holdSlot = useCallback(
    async (params: {
      vendorId: string;
      packageId: string;
      eventDate: string;
      slotWindow: SlotWindow;
    }): Promise<{ ok: true; hold: SlotHold } | { ok: false; error: string }> => {
      const res = await fetch('/api/holds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Could not hold slot.' };
      }
      applyRealtimeEvent({ type: 'slot:held', hold: data.hold });
      return { ok: true, hold: data.hold };
    },
    [applyRealtimeEvent, sessionId]
  );

  const releaseHold = useCallback(
    async (holdId: string) => {
      await fetch(`/api/holds/${encodeURIComponent(holdId)}`, {
        method: 'DELETE',
      });
      applyRealtimeEvent({ type: 'slot:released', holdId });
    },
    [applyRealtimeEvent]
  );

  const createPaymentOrder = useCallback(
    async (params: {
      holdId: string;
      guestCount: number;
      selectedAddonIds: string[];
      paymentPlan: PaymentPlan;
    }) => {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false as const,
          error: data.error || 'Could not initialize payment order.',
        };
      }
      return { ok: true as const, order: data };
    },
    []
  );

  const verifyPaymentAndBook = useCallback(
    async (params: {
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
    }): Promise<
      | { ok: true; booking: Booking }
      | { ok: false; error: string; fieldErrors?: Record<string, string> }
    > => {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.error || 'Payment verification failed.',
          fieldErrors: data.fieldErrors,
        };
      }
      applyRealtimeEvent({
        type: 'slot:booked',
        booking: data.booking,
        releasedHoldId: params.holdId,
      });
      return { ok: true, booking: data.booking };
    },
    [applyRealtimeEvent, sessionId]
  );

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      const res = await fetch(
        `/api/bookings/${encodeURIComponent(bookingId)}/cancel`,
        { method: 'POST' }
      );
      if (res.ok) {
        await fetchBootstrap();
        return true;
      }
      return false;
    },
    [fetchBootstrap]
  );

  const updateBookingStatus = useCallback(
    async (bookingId: string, status: BookingStatus) => {
      const res = await fetch(
        `/api/bookings/${encodeURIComponent(bookingId)}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );
      if (res.ok) {
        await fetchBootstrap();
        return true;
      }
      return false;
    },
    [fetchBootstrap]
  );

  const toggleVendorSlotBlock = useCallback(
    async (params: {
      vendorId: string;
      eventDate: string;
      slotWindow: SlotWindow;
      blocked: boolean;
      reason?: string;
    }): Promise<{ ok: boolean; error?: string }> => {
      const res = await fetch(
        `/api/vendors/${encodeURIComponent(params.vendorId)}/availability`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to update slot.' };
      }
      setBlockedSlots(data.blockedSlots);
      return { ok: true };
    },
    []
  );

  const addVendorPackage = useCallback(
    async (
      vendorId: string,
      pkg: {
        name: string;
        description: string;
        basePriceInr: number;
        perGuestPriceInr: number;
        includedGuests: number;
        deliverables: string[];
      }
    ): Promise<{ ok: boolean; error?: string }> => {
      const res = await fetch(
        `/api/vendors/${encodeURIComponent(vendorId)}/packages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pkg),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to create package.' };
      }
      applyRealtimeEvent({ type: 'vendor:updated', vendor: data.vendor });
      return { ok: true };
    },
    [applyRealtimeEvent]
  );

  const saveTheme = useCallback(
    async (nextTheme: ThemeConfig): Promise<boolean> => {
      setTheme(nextTheme);
      const res = await fetch('/api/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextTheme),
      });
      if (res.ok) {
        const data = (await res.json()) as { theme: ThemeConfig };
        setTheme(data.theme);
        return true;
      }
      return false;
    },
    []
  );

  return {
    sessionId,
    loading,
    error,
    wsConnected,
    vendors,
    blockedSlots,
    activeHolds,
    bookings,
    theme,
    setThemePreview: setTheme,
    paymentGatewayMode,
    refresh: fetchBootstrap,
    holdSlot,
    releaseHold,
    createPaymentOrder,
    verifyPaymentAndBook,
    cancelBooking,
    updateBookingStatus,
    toggleVendorSlotBlock,
    addVendorPackage,
    saveTheme,
  };
}
