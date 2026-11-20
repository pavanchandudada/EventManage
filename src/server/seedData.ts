import { getUpcomingDates } from '../lib/bookingEngine';
import type { BlockedSlot, Booking, Vendor } from '../lib/types';

export const HERO_BANNER_IMAGE =
  '/src/assets/images/hero_indian_event_gala_1795155678826.jpg';

export function createSeedVendors(): Vendor[] {
  return [
    {
      id: 'vnd-kala-mandap',
      name: 'Kala Mandap Atelier',
      tagline: 'Architectural floral mandaps and sunlit botanical wedding scenography',
      category: 'Wedding Decor',
      city: 'Bengaluru',
      locality: 'Indiranagar',
      pincode: '560038',
      rating: 4.9,
      reviewCount: 142,
      verified: true,
      responseMinutes: 12,
      guestCapacityMin: 60,
      guestCapacityMax: 1200,
      coverImage: '/src/assets/images/vendor_floral_mandap_1795155679128.jpg',
      about:
        'Founded by architects and floral designers in Indiranagar, Kala Mandap Atelier crafts sustainably sourced teakwood mandaps, fresh jasmine drapes, and warm ambient lighting for South and North Indian weddings across Bengaluru.',
      highlights: [
        'In-house 3D venue walkthrough before installation',
        '100% locally sourced Mysuru jasmine and Dutch roses',
        'Dedicated overnight teardown crew included',
      ],
      packages: [
        {
          id: 'pkg-km-signature',
          name: 'Garden Pergola Mandap',
          description:
            'Full floral mandap styling, entrance archway, aisle runners, and warm architectural uplighting.',
          basePriceInr: 145000,
          perGuestPriceInr: 250,
          includedGuests: 200,
          deliverables: [
            'Custom 16×16 ft teakwood mandap with fresh floral canopy',
            'Welcome arch and brass lamp foyer styling',
            'Warm 2700K architectural uplighting across venue',
            'On-site lead designer from setup to ceremony close',
          ],
          addons: [
            {
              id: 'add-km-sangeet',
              name: 'Sangeet Stage & Acoustic Draping',
              priceInr: 45000,
              unitLabel: 'per event',
            },
            {
              id: 'add-km-seating',
              name: 'Cane & Linen Lounge Clusters (4 sets)',
              priceInr: 28000,
              unitLabel: 'per event',
            },
          ],
        },
        {
          id: 'pkg-km-intimate',
          name: 'Courtyard Haldi & Mehendi',
          description:
            'Vibrant marigold installations, shaded seating canopies, and hand-painted welcome signage.',
          basePriceInr: 72000,
          perGuestPriceInr: 180,
          includedGuests: 120,
          deliverables: [
            'Fresh marigold & mogra backdrop installation',
            'Low diwan bolster seating for 40 guests',
            'Custom floral seating signage and photo corner',
          ],
          addons: [
            {
              id: 'add-km-dhol',
              name: 'Traditional Shehnai & Dhol Ensemble',
              priceInr: 18000,
              unitLabel: '3 hours',
            },
          ],
        },
      ],
    },
    {
      id: 'vnd-saffron-brass',
      name: 'Saffron & Brass Kitchen',
      tagline: 'Heirloom regional Indian banquets and live culinary stations',
      category: 'Artisan Catering',
      city: 'Mumbai',
      locality: 'Bandra West',
      pincode: '400050',
      rating: 4.8,
      reviewCount: 218,
      verified: true,
      responseMinutes: 15,
      guestCapacityMin: 50,
      guestCapacityMax: 1500,
      coverImage: '/src/assets/images/vendor_artisan_catering_1795155680155.jpg',
      about:
        'A chef-led boutique catering house serving slow-cooked Awadhi, coastal Konkan, and contemporary vegetarian tasting menus plated in hammered brassware with FSSAI-certified mobile kitchens.',
      highlights: [
        'Complimentary 6-dish private menu tasting on token booking',
        'Separate pure-veg and Jain preparation kitchens',
        'Uniformed hospitality captains and live chaat counters',
      ],
      packages: [
        {
          id: 'pkg-sb-royal',
          name: 'Royal Brass Banquet (18 Courses)',
          description:
            'Live chaat atelier, 4 appetizers, 6 regional mains, artisan breads, and slow-cooked desserts.',
          basePriceInr: 115000,
          perGuestPriceInr: 1150,
          includedGuests: 100,
          deliverables: [
            '18-item curated Indian & Pan-Asian menu',
            'Hammered brass chafing vessels and stoneware plates',
            '1 hospitality steward per 18 guests',
            'Live artisanal mocktail and filter coffee bar',
          ],
          addons: [
            {
              id: 'add-sb-mithai',
              name: 'Live Jalebi & Saffron Rabri Counter',
              priceInr: 22000,
              unitLabel: 'per event',
            },
            {
              id: 'add-sb-jain',
              name: 'Dedicated Jain Specialty Buffet Line',
              priceInr: 18000,
              unitLabel: 'per event',
            },
          ],
        },
        {
          id: 'pkg-sb-cocktail',
          name: 'Artisanal Grazing & Small Plates',
          description:
            'Curated passed hors d’oeuvres and gourmet regional tapas for cocktail evenings and launches.',
          basePriceInr: 68000,
          perGuestPriceInr: 780,
          includedGuests: 80,
          deliverables: [
            '8 passed gourmet small plates + 2 live counters',
            'Artisanal dessert tasting bar',
            'Full crockery, glassware, and service staff',
          ],
          addons: [
            {
              id: 'add-sb-barista',
              name: 'Specialty Pour-Over & Chai Bar',
              priceInr: 14000,
              unitLabel: 'per event',
            },
          ],
        },
      ],
    },
    {
      id: 'vnd-surya-frame',
      name: 'Surya Frame Collective',
      tagline: 'Documentary wedding photography and editorial 4K event films',
      category: 'Photography & Film',
      city: 'Hyderabad',
      locality: 'Jubilee Hills',
      pincode: '500033',
      rating: 4.9,
      reviewCount: 96,
      verified: true,
      responseMinutes: 10,
      guestCapacityMin: 20,
      guestCapacityMax: 2000,
      coverImage: '/src/assets/images/vendor_candid_photography_1795155681866.jpg',
      about:
        'An editorial visual studio capturing unscripted family moments and heritage celebrations across Hyderabad and Telangana with same-day social previews and archival linen albums.',
      highlights: [
        '48-hour express highlight gallery delivery',
        'DGCA-certified drone pilots for outdoor venues',
        'Dual-slot encrypted cloud backup during shoot',
      ],
      packages: [
        {
          id: 'pkg-sf-documentary',
          name: 'Editorial Stills + Cinema Film',
          description:
            '2 lead candid photographers, 2 cinematographers, drone coverage, and archival linen photo book.',
          basePriceInr: 95000,
          perGuestPriceInr: 0,
          includedGuests: 500,
          deliverables: [
            '600+ color-graded high-resolution stills',
            '4-minute cinematic highlight reel in 4K',
            'Same-evening curated set of 25 preview photos',
            '40-spread handcrafted archival linen album',
          ],
          addons: [
            {
              id: 'add-sf-drone',
              name: 'Aerial Drone Coverage (DGCA Certified)',
              priceInr: 16000,
              unitLabel: 'per session',
            },
            {
              id: 'add-sf-live',
              name: 'Multi-Camera Private YouTube Livestream',
              priceInr: 24000,
              unitLabel: 'per event',
            },
          ],
        },
        {
          id: 'pkg-sf-stills',
          name: 'Candid Photography Essentials',
          description:
            '1 lead documentary photographer and 1 traditional portrait specialist for intimate ceremonies.',
          basePriceInr: 52000,
          perGuestPriceInr: 0,
          includedGuests: 250,
          deliverables: [
            '350+ edited high-resolution digital photographs',
            'Private online gallery with family download links',
          ],
          addons: [
            {
              id: 'add-sf-album',
              name: 'Extra Parent Archival Photo Book',
              priceInr: 12000,
              unitLabel: 'per book',
            },
          ],
        },
      ],
    },
    {
      id: 'vnd-apex-stagecraft',
      name: 'Apex Stagecraft India',
      tagline: 'Turnkey corporate summits, LED stage production, and acoustic engineering',
      category: 'Corporate Production',
      city: 'Mumbai',
      locality: 'Lower Parel',
      pincode: '400013',
      rating: 4.8,
      reviewCount: 84,
      verified: true,
      responseMinutes: 20,
      guestCapacityMin: 80,
      guestCapacityMax: 2500,
      coverImage: '/src/assets/images/vendor_corporate_stage_1795155722111.jpg',
      about:
        'Enterprise event production specialists in Lower Parel delivering keynote stages, P2.6 fine-pitch LED walls, JBL line-array acoustics, and seamless hybrid conference broadcasts.',
      highlights: [
        'Redundant power & audio failover systems on every stage',
        'GST-compliant corporate invoicing & PO billing support',
        'Dedicated show-caller and stage technical director',
      ],
      packages: [
        {
          id: 'pkg-as-summit',
          name: 'Executive Summit Stage Suite',
          description:
            '24×10 ft P2.6 LED backdrop, concert-grade audio, wireless lapel mics, and podium lighting.',
          basePriceInr: 185000,
          perGuestPriceInr: 150,
          includedGuests: 300,
          deliverables: [
            '24×10 ft seamless P2.6 LED video wall with switcher',
            'Line-array PA system + 6 Shure wireless microphones',
            'Architectural stage wash and keynote spotlighting',
            'Show-caller, AV engineer, and rehearsal check',
          ],
          addons: [
            {
              id: 'add-as-checkin',
              name: 'QR Badge Printing & Check-in Desks (3 kiosks)',
              priceInr: 32000,
              unitLabel: 'per day',
            },
            {
              id: 'add-as-stream',
              name: 'Broadcast Switching & Recording Rig',
              priceInr: 38000,
              unitLabel: 'per day',
            },
          ],
        },
      ],
    },
    {
      id: 'vnd-verandah-soiree',
      name: 'Verandah Soirée Studio',
      tagline: 'Intimate rooftop milestones, sangeet lounges, and private soirées',
      category: 'Boutique Celebrations',
      city: 'Bengaluru',
      locality: 'Koramangala',
      pincode: '560034',
      rating: 4.7,
      reviewCount: 112,
      verified: true,
      responseMinutes: 14,
      guestCapacityMin: 25,
      guestCapacityMax: 250,
      coverImage: '/src/assets/images/vendor_boutique_celebration_1795155695157.jpg',
      about:
        'Boutique celebration stylists transforming Bengaluru terraces, villas, and clubhouses with warm festoon canopies, curated cane lounge furniture, acoustic musicians, and custom tablescapes.',
      highlights: [
        '4-hour rapid terrace transformation & zero-trace cleanup',
        'Curated acoustic indie & Sufi performers roster',
        'Ideal for milestone birthdays, anniversaries, and cocktail nights',
      ],
      packages: [
        {
          id: 'pkg-vs-terrace',
          name: 'Twilight Terrace Lounge',
          description:
            'Overhead festoon lights, woven cane lounge seating, brass lanterns, and bespoke bar styling.',
          basePriceInr: 58000,
          perGuestPriceInr: 220,
          includedGuests: 60,
          deliverables: [
            'Warm overhead Edison festoon canopy lighting',
            'Cane lounge seating for 35 + high cocktail tables',
            'Fresh botanical table centerpieces & brass lanterns',
            'Curated ambient sound system with Bluetooth/DJ deck',
          ],
          addons: [
            {
              id: 'add-vs-acoustic',
              name: 'Live Acoustic Duo (3-hour set)',
              priceInr: 21000,
              unitLabel: 'per evening',
            },
            {
              id: 'add-vs-mixology',
              name: 'Craft Mocktail & Mixologist Setup',
              priceInr: 19000,
              unitLabel: 'per event',
            },
          ],
        },
      ],
    },
    {
      id: 'vnd-aangan-heritage',
      name: 'Aangan Heritage Events',
      tagline: 'End-to-end luxury wedding production, hospitality, and artist curation',
      category: 'Full-Service Planning',
      city: 'Delhi NCR',
      locality: 'Gurugram',
      pincode: '122002',
      rating: 4.9,
      reviewCount: 164,
      verified: true,
      responseMinutes: 18,
      guestCapacityMin: 100,
      guestCapacityMax: 1800,
      coverImage: '/src/assets/images/hero_indian_event_gala_1795155678826.jpg',
      about:
        'Full-spectrum celebration management across Delhi NCR and Jaipur handling RSVP concierge, venue production, multi-vendor timelines, hospitality desks, and artist logistics under one roof.',
      highlights: [
        'Dedicated WhatsApp guest RSVP & airport transfer concierge',
        'Single unified GST invoice across decor, hospitality & entertainment',
        'On-ground 8-member shadow coordination team',
      ],
      packages: [
        {
          id: 'pkg-ah-turnkey',
          name: 'Complete Celebration Direction',
          description:
            'End-to-end event direction, vendor orchestration, guest hospitality desk, and heritage decor supervision.',
          basePriceInr: 210000,
          perGuestPriceInr: 300,
          includedGuests: 250,
          deliverables: [
            'Dedicated lead planner + 6 hospitality shadow coordinators',
            'Digital RSVP tracking and welcome hamper logistics',
            'Master minute-by-minute production run sheet',
            'Vendor payment milestone auditing and quality sign-off',
          ],
          addons: [
            {
              id: 'add-ah-hospitality',
              name: 'Airport Concierge & Fleet Coordination',
              priceInr: 42000,
              unitLabel: 'per event',
            },
          ],
        },
      ],
    },
  ];
}

export function createSeedBlockedSlots(): BlockedSlot[] {
  const dates = getUpcomingDates(10);
  return [
    {
      vendorId: 'vnd-kala-mandap',
      eventDate: dates[1],
      slotWindow: 'morning',
      reason: 'Private heritage temple wedding (offline)',
    },
    {
      vendorId: 'vnd-saffron-brass',
      eventDate: dates[2],
      slotWindow: 'full_day',
      reason: 'Corporate annual gala buyout',
    },
    {
      vendorId: 'vnd-apex-stagecraft',
      eventDate: dates[0],
      slotWindow: 'morning',
      reason: 'Fintech summit keynote setup',
    },
  ];
}

export function createSeedBookings(): Booking[] {
  const dates = getUpcomingDates(10);
  return [
    {
      id: 'bkg-seed-1001',
      bookingCode: 'UG-2026-4819',
      vendorId: 'vnd-verandah-soiree',
      vendorName: 'Verandah Soirée Studio',
      vendorCity: 'Bengaluru',
      vendorLocality: 'Koramangala',
      packageId: 'pkg-vs-terrace',
      packageName: 'Twilight Terrace Lounge',
      eventDate: dates[3],
      slotWindow: 'evening',
      guestCount: 75,
      selectedAddonIds: ['add-vs-acoustic'],
      selectedAddonNames: ['Live Acoustic Duo (3-hour set)'],
      customerName: 'Rohan Deshmukh',
      customerPhone: '9845123490',
      customerEmail: 'rohan.deshmukh@example.in',
      venueAddress: '3rd Block Rooftop Terrace, Koramangala, Bengaluru',
      paymentPlan: 'token_25',
      paymentMethod: 'upi_gpay',
      subtotalInr: 82300,
      gstInr: 14814,
      totalInr: 97114,
      amountPaidInr: 24279,
      balanceDueInr: 72835,
      razorpayOrderId: 'order_UG4819SEED',
      razorpayPaymentId: 'pay_UPI88412901',
      paymentMode: 'offline_upi_sandbox',
      status: 'confirmed',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
  ];
}
