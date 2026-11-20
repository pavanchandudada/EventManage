import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import type {
  BookingStatus,
  PaymentMethod,
  PaymentPlan,
  RealtimeEvent,
  SlotWindow,
} from './src/lib/types';
import { EventPlatformStore } from './src/server/store';

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const store = new EventPlatformStore();
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const reqUrl = new URL(
      request.url || '/',
      `http://${request.headers.host || 'localhost'}`
    );
    if (reqUrl.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  const broadcast = (event: RealtimeEvent) => {
    const payload = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  };

  // Periodically expire timed-out 10-minute holds and broadcast release events
  const expiryTimer = setInterval(() => {
    const expiredIds = store.purgeExpiredHolds();
    for (const holdId of expiredIds) {
      broadcast({ type: 'slot:released', holdId });
    }
  }, 15000);
  expiryTimer.unref();

  wss.on('connection', (ws) => {
    ws.send(
      JSON.stringify({
        type: 'connected',
        serverTime: new Date().toISOString(),
      })
    );
  });

  // --- REST API Routes ---

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      mode: store.isLiveRazorpayConfigured()
        ? 'live_razorpay'
        : 'offline_upi_sandbox',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/bootstrap', (_req, res) => {
    res.json(store.getBootstrapState());
  });

  app.post('/api/holds', (req, res) => {
    const { vendorId, packageId, eventDate, slotWindow, sessionId } = req.body as {
      vendorId?: string;
      packageId?: string;
      eventDate?: string;
      slotWindow?: SlotWindow;
      sessionId?: string;
    };

    if (!vendorId || !packageId || !eventDate || !slotWindow || !sessionId) {
      res.status(400).json({ error: 'Missing required slot hold fields.' });
      return;
    }

    const result = store.createHold({
      vendorId,
      packageId,
      eventDate,
      slotWindow,
      sessionId,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    broadcast({ type: 'slot:held', hold: result.hold });
    res.status(201).json({ hold: result.hold });
  });

  app.delete('/api/holds/:id', (req, res) => {
    const removed = store.releaseHold(req.params.id);
    if (removed) {
      broadcast({ type: 'slot:released', holdId: req.params.id });
    }
    res.json({ released: removed });
  });

  app.post('/api/payments/create-order', async (req, res) => {
    const { holdId, guestCount, selectedAddonIds, paymentPlan } = req.body as {
      holdId?: string;
      guestCount?: number;
      selectedAddonIds?: string[];
      paymentPlan?: PaymentPlan;
    };

    if (!holdId || !paymentPlan) {
      res.status(400).json({ error: 'Missing holdId or paymentPlan.' });
      return;
    }

    const result = await store.createPaymentOrder({
      holdId,
      guestCount: Number(guestCount || 100),
      selectedAddonIds: Array.isArray(selectedAddonIds) ? selectedAddonIds : [],
      paymentPlan,
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json(result.order);
  });

  app.post('/api/payments/verify', (req, res) => {
    const body = req.body as {
      holdId?: string;
      sessionId?: string;
      guestCount?: number;
      selectedAddonIds?: string[];
      paymentPlan?: PaymentPlan;
      paymentMethod?: PaymentMethod;
      upiId?: string;
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      venueAddress?: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
    };

    if (
      !body.holdId ||
      !body.sessionId ||
      !body.paymentPlan ||
      !body.paymentMethod ||
      !body.razorpayOrderId
    ) {
      res.status(400).json({ error: 'Incomplete payment verification payload.' });
      return;
    }

    const result = store.verifyAndConfirmBooking({
      holdId: body.holdId,
      sessionId: body.sessionId,
      guestCount: Number(body.guestCount || 100),
      selectedAddonIds: Array.isArray(body.selectedAddonIds)
        ? body.selectedAddonIds
        : [],
      paymentPlan: body.paymentPlan,
      paymentMethod: body.paymentMethod,
      upiId: body.upiId,
      customerName: body.customerName || '',
      customerPhone: body.customerPhone || '',
      customerEmail: body.customerEmail || '',
      venueAddress: body.venueAddress || '',
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
    });

    if (!result.ok) {
      res
        .status(result.status)
        .json({ error: result.error, fieldErrors: result.fieldErrors });
      return;
    }

    broadcast({
      type: 'slot:booked',
      booking: result.booking,
      releasedHoldId: result.releasedHoldId,
    });
    res.status(201).json({ booking: result.booking });
  });

  app.post('/api/bookings/:id/cancel', (req, res) => {
    const result = store.cancelBooking(req.params.id);
    if (!result.ok || !result.booking) {
      res.status(404).json({ error: result.error || 'Booking not found.' });
      return;
    }
    const bootstrap = store.getBootstrapState();
    broadcast({
      type: 'slot:updated',
      blockedSlots: bootstrap.blockedSlots,
      bookings: bootstrap.bookings,
    });
    res.json({ booking: result.booking });
  });

  app.patch('/api/bookings/:id/status', (req, res) => {
    const { status } = req.body as { status?: BookingStatus };
    if (
      !status ||
      !['confirmed', 'in_progress', 'completed', 'cancelled'].includes(status)
    ) {
      res.status(400).json({ error: 'Invalid booking status.' });
      return;
    }
    const result = store.updateBookingStatus(req.params.id, status);
    if (!result.ok || !result.booking) {
      res.status(404).json({ error: result.error || 'Booking not found.' });
      return;
    }
    const bootstrap = store.getBootstrapState();
    broadcast({
      type: 'slot:updated',
      blockedSlots: bootstrap.blockedSlots,
      bookings: bootstrap.bookings,
    });
    res.json({ booking: result.booking });
  });

  app.patch('/api/vendors/:id/availability', (req, res) => {
    const { eventDate, slotWindow, blocked, reason } = req.body as {
      eventDate?: string;
      slotWindow?: SlotWindow;
      blocked?: boolean;
      reason?: string;
    };
    if (!eventDate || !slotWindow || typeof blocked !== 'boolean') {
      res.status(400).json({ error: 'Missing availability update fields.' });
      return;
    }

    const result = store.toggleVendorSlotBlock({
      vendorId: req.params.id,
      eventDate,
      slotWindow,
      blocked,
      reason,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    broadcast({ type: 'slot:updated', blockedSlots: result.blockedSlots });
    res.json({ blockedSlots: result.blockedSlots });
  });

  app.post('/api/vendors/:id/packages', (req, res) => {
    const {
      name,
      description,
      basePriceInr,
      perGuestPriceInr,
      includedGuests,
      deliverables,
    } = req.body as {
      name?: string;
      description?: string;
      basePriceInr?: number;
      perGuestPriceInr?: number;
      includedGuests?: number;
      deliverables?: string[];
    };

    const result = store.addVendorPackage(req.params.id, {
      name: name || '',
      description: description || '',
      basePriceInr: Number(basePriceInr || 0),
      perGuestPriceInr: Number(perGuestPriceInr || 0),
      includedGuests: Number(includedGuests || 100),
      deliverables: Array.isArray(deliverables) ? deliverables : [],
      addons: [],
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    broadcast({ type: 'vendor:updated', vendor: result.vendor });
    res.status(201).json({ vendor: result.vendor });
  });

  app.get('/api/theme', (_req, res) => {
    res.json({ theme: store.getTheme() });
  });

  app.put('/api/theme', (req, res) => {
    const updated = store.updateTheme(req.body);
    broadcast({ type: 'theme:updated', theme: updated });
    res.json({ theme: updated });
  });

  // --- Frontend Serving (Vite dev middleware or built dist/) ---
  if (!IS_PROD) {
    const disableHmr = Boolean(
      process.env.DISABLE_HMR === 'true' ||
        (process.env.APP_URL && !process.env.APP_URL.includes('localhost'))
    );
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`UtsavGrid server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
