import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookingDrawer } from './components/BookingDrawer';
import { Header, type AppView } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MyBookingsView } from './components/MyBookingsView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ThemeCustomizerView } from './components/ThemeCustomizerView';
import { VendorCard } from './components/VendorCard';
import { VendorPortalView } from './components/VendorPortalView';
import { useRealtimeStore } from './hooks/useRealtimeStore';
import {
  countAvailableSlotsForDate,
  formatEventDate,
  getUpcomingDates,
} from './lib/bookingEngine';
import { themeToCssVariables } from './lib/themeUtils';
import type { EventCategory, Vendor } from './lib/types';

export default function App() {
  const store = useRealtimeStore();
  const upcomingDates = useMemo(() => getUpcomingDates(10), []);

  const [activeView, setActiveView] = useState<AppView>('discover');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDate, setSelectedDate] = useState(upcomingDates[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAvailableOnDate, setOnlyAvailableOnDate] = useState(false);

  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const catalogSectionRef = useRef<HTMLDivElement | null>(null);

  // Inject customizable CSS custom properties & Light/Dark class onto document root
  useEffect(() => {
    const root = document.documentElement;
    const vars = themeToCssVariables(store.theme);
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
    if (store.theme.colorMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    document.title = `${store.theme.brandName} — Local Event Management Aggregator`;
  }, [store.theme]);

  const cities = useMemo(
    () => Array.from(new Set(store.vendors.map((v) => v.city))),
    [store.vendors]
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set(store.vendors.map((v) => v.category))
      ) as EventCategory[],
    [store.vendors]
  );

  const availabilitySnapshot = useMemo(
    () => ({
      blockedSlots: store.blockedSlots,
      activeHolds: store.activeHolds,
      bookings: store.bookings,
    }),
    [store.blockedSlots, store.activeHolds, store.bookings]
  );

  const filteredVendors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return store.vendors.filter((vendor) => {
      if (selectedCity !== 'All' && vendor.city !== selectedCity) return false;
      if (selectedCategory !== 'All' && vendor.category !== selectedCategory) {
        return false;
      }
      if (onlyAvailableOnDate) {
        const open = countAvailableSlotsForDate(
          vendor.id,
          selectedDate,
          availabilitySnapshot
        );
        if (open === 0) return false;
      }
      if (q) {
        const haystack = `${vendor.name} ${vendor.tagline} ${vendor.category} ${vendor.city} ${vendor.locality}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    availabilitySnapshot,
    onlyAvailableOnDate,
    searchQuery,
    selectedCategory,
    selectedCity,
    selectedDate,
    store.vendors,
  ]);

  const activeVendor: Vendor | null = useMemo(
    () => store.vendors.find((v) => v.id === activeVendorId) ?? null,
    [store.vendors, activeVendorId]
  );

  const activeBookingCount = useMemo(
    () => store.bookings.filter((b) => b.status !== 'cancelled').length,
    [store.bookings]
  );

  const scrollToCatalog = () => {
    setActiveView('discover');
    window.setTimeout(() => {
      catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100">
      <Header
        brandName={store.theme.brandName}
        activeView={activeView}
        onSelectView={setActiveView}
        activeBookingCount={activeBookingCount}
        onPrimaryAction={scrollToCatalog}
      />

      <main className="flex-1">
        {store.loading ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Loading verified local event companies and live slot availability...
            </p>
          </div>
        ) : store.error ? (
          <div className="max-w-xl mx-auto px-4 py-20 text-center">
            <p className="text-base font-medium text-rose-700 dark:text-rose-400">
              {store.error}
            </p>
            <button
              type="button"
              onClick={() => void store.refresh()}
              className="mt-4 min-h-[44px] px-5 text-sm font-medium text-white ug-accent-bg ug-control-radius cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {/* DISCOVER VIEW — Driven by Customizable Section Order & Visibility */}
            {activeView === 'discover' && (
              <div className="pb-24 md:pb-14">
                {store.theme.sections
                  .filter((sec) => sec.visible)
                  .map((sec) => {
                    if (sec.id === 'hero') {
                      return (
                        <HeroSection
                          key={sec.id}
                          theme={store.theme}
                          cities={cities}
                          categories={categories}
                          upcomingDates={upcomingDates}
                          selectedCity={selectedCity}
                          selectedCategory={selectedCategory}
                          selectedDate={selectedDate}
                          searchQuery={searchQuery}
                          onCityChange={setSelectedCity}
                          onCategoryChange={setSelectedCategory}
                          onDateChange={setSelectedDate}
                          onSearchChange={setSearchQuery}
                          onExploreClick={scrollToCatalog}
                        />
                      );
                    }

                    if (sec.id === 'catalog') {
                      return (
                        <section
                          key={sec.id}
                          ref={catalogSectionRef}
                          className="scroll-mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                            <div>
                              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
                                Verified Local Event Companies
                              </h2>
                              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                Showing{' '}
                                <span className="font-mono-num font-medium text-slate-900 dark:text-white">
                                  {filteredVendors.length}
                                </span>{' '}
                                companies · Live slots checked for{' '}
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  {formatEventDate(selectedDate)}
                                </span>
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <label className="inline-flex items-center gap-2 min-h-[40px] text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={onlyAvailableOnDate}
                                  onChange={(e) =>
                                    setOnlyAvailableOnDate(e.target.checked)
                                  }
                                  className="w-4 h-4 accent-[var(--ug-accent)]"
                                />
                                <span>Open on selected date only</span>
                              </label>
                              {(selectedCity !== 'All' ||
                                selectedCategory !== 'All' ||
                                searchQuery.trim() !== '' ||
                                onlyAvailableOnDate) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCity('All');
                                    setSelectedCategory('All');
                                    setSearchQuery('');
                                    setOnlyAvailableOnDate(false);
                                  }}
                                  className="min-h-[36px] px-3 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 ug-control-radius cursor-pointer"
                                >
                                  Clear Filters
                                </button>
                              )}
                            </div>
                          </div>

                          {filteredVendors.length === 0 ? (
                            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-10 text-center ug-card-radius">
                              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                                No matching event companies found
                              </h3>
                              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                Try another locality, switch dates, or clear active service filters.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCity('All');
                                  setSelectedCategory('All');
                                  setSearchQuery('');
                                  setOnlyAvailableOnDate(false);
                                }}
                                className="mt-4 min-h-[44px] px-4 text-sm font-medium text-white ug-accent-bg ug-control-radius cursor-pointer"
                              >
                                Reset All Filters
                              </button>
                            </div>
                          ) : (
                            <div
                              data-testid="vendor-catalog-grid"
                              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${
                                store.theme.cardDensity === 'compact'
                                  ? 'gap-5'
                                  : 'gap-7'
                              }`}
                            >
                              {filteredVendors.map((vendor) => (
                                <VendorCard
                                  key={vendor.id}
                                  vendor={vendor}
                                  selectedDate={selectedDate}
                                  availability={availabilitySnapshot}
                                  density={store.theme.cardDensity}
                                  onSelect={(v) => setActiveVendorId(v.id)}
                                />
                              ))}
                            </div>
                          )}
                        </section>
                      );
                    }

                    if (sec.id === 'trust_guarantees') {
                      return (
                        <section
                          key={sec.id}
                          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-slate-200/80 dark:border-slate-800/80"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div>
                              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                                01. Double-Booking Protection
                              </h3>
                              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                Selecting a date acquires a live 10-minute server slot hold synchronized via WebSockets so no two families can book the same wedding or gala window.
                              </p>
                            </div>
                            <div>
                              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                                02. Flexible UPI & 25% Token
                              </h3>
                              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                Lock high-demand peak dates with a 25% booking token via Google Pay, PhonePe, Paytm, or cards—complete with itemized 18% GST receipts.
                              </p>
                            </div>
                            <div>
                              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                                03. Direct Vendor Sync
                              </h3>
                              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                Event companies update offline walk-in blocks and custom packages directly from the Vendor Portal, keeping customer calendars accurate to the second.
                              </p>
                            </div>
                          </div>
                        </section>
                      );
                    }

                    if (sec.id === 'localities') {
                      return (
                        <section
                          key={sec.id}
                          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-200/80 dark:border-slate-800/80"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
                                Explore by City
                              </h2>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Jump directly to curated local event specialists in your metro area.
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {cities.map((city) => (
                                <button
                                  key={city}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCity(city);
                                    scrollToCatalog();
                                  }}
                                  className={`min-h-[40px] px-4 text-xs font-medium border ug-control-radius transition-colors cursor-pointer ${
                                    selectedCity === city
                                      ? 'text-white ug-accent-bg ug-accent-border'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-400'
                                  }`}
                                >
                                  {city}
                                </button>
                              ))}
                            </div>
                          </div>
                        </section>
                      );
                    }

                    return null;
                  })}
              </div>
            )}

            {/* MY BOOKINGS VIEW */}
            {activeView === 'bookings' && (
              <MyBookingsView
                bookings={store.bookings}
                onCancelBooking={store.cancelBooking}
                onExplore={() => setActiveView('discover')}
              />
            )}

            {/* VENDOR PORTAL VIEW */}
            {activeView === 'vendor' && (
              <VendorPortalView
                vendors={store.vendors}
                upcomingDates={upcomingDates}
                availability={availabilitySnapshot}
                bookings={store.bookings}
                wsConnected={store.wsConnected}
                onToggleSlotBlock={store.toggleVendorSlotBlock}
                onUpdateBookingStatus={store.updateBookingStatus}
                onAddPackage={store.addVendorPackage}
              />
            )}

            {/* LIVE FRONTEND CUSTOMIZER VIEW */}
            {activeView === 'customize' && (
              <ThemeCustomizerView
                theme={store.theme}
                onPreviewChange={store.setThemePreview}
                onSaveTheme={store.saveTheme}
              />
            )}
          </>
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="hidden md:block border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1522]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span>
            © {new Date().getFullYear()} {store.theme.brandName}. Local Event Management Aggregator.
          </span>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setActiveView('vendor')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Vendor Portal
            </button>
            <button
              type="button"
              onClick={() => setActiveView('customize')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Customize Storefront
            </button>
          </div>
        </div>
      </footer>

      {/* Active Vendor Booking & UPI Payment Modal */}
      {activeVendor && (
        <BookingDrawer
          vendor={activeVendor}
          initialDate={selectedDate}
          upcomingDates={upcomingDates}
          availability={availabilitySnapshot}
          sessionId={store.sessionId}
          paymentGatewayMode={store.paymentGatewayMode}
          onClose={() => setActiveVendorId(null)}
          onHoldSlot={store.holdSlot}
          onReleaseHold={store.releaseHold}
          onCreateOrder={store.createPaymentOrder}
          onVerifyAndBook={store.verifyPaymentAndBook}
          onGoToBookings={() => setActiveView('bookings')}
        />
      )}

      <OfflineIndicator />
    </div>
  );
}
