# Landing Page - Backend & Folder Architecture Plan

## Current State
- Frontend-only Next.js app with static data hardcoded in components
- No API routes, no database, no CMS

## Goal
- Centralized backend structure for this landing page
- Admin-manageable content (testimonials, features, pricing, form submissions)
- Clean folder structure that scales

---

## Folder Structure

```
bizcivitas/
├── public/
│   ├── images/                    # Static images (logos, icons, phones)
│   └── uploads/                   # User-uploaded content (testimonials, etc.)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Landing page (assembles all sections)
│   │   ├── globals.css
│   │   │
│   │   ├── api/                   # -------- API ROUTES --------
│   │   │   ├── testimonials/
│   │   │   │   ├── route.ts       # GET (public), POST (admin)
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts   # GET, PUT, DELETE by ID
│   │   │   │
│   │   │   ├── inquiries/
│   │   │   │   ├── route.ts       # POST (form submission), GET (admin)
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts   # GET, DELETE by ID
│   │   │   │
│   │   │   ├── content/
│   │   │   │   └── route.ts       # GET/PUT landing page content (hero text, pricing, etc.)
│   │   │   │
│   │   │   ├── upload/
│   │   │   │   └── route.ts       # POST image upload
│   │   │   │
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts   # NextAuth.js handler
│   │   │
│   │   └── admin/                 # -------- ADMIN PANEL --------
│   │       ├── layout.tsx         # Admin layout (sidebar, auth guard)
│   │       ├── page.tsx           # Dashboard overview
│   │       ├── testimonials/
│   │       │   └── page.tsx       # Manage testimonials (CRUD + reorder)
│   │       ├── inquiries/
│   │       │   └── page.tsx       # View form submissions
│   │       └── content/
│   │           └── page.tsx       # Edit landing page text/pricing
│   │
│   ├── components/                # -------- UI COMPONENTS --------
│   │   ├── landing/               # Landing page sections
│   │   │   ├── Hero.tsx
│   │   │   ├── StrugglingWith.tsx
│   │   │   ├── StopWaiting.tsx
│   │   │   ├── SuccessStories.tsx
│   │   │   ├── Membership.tsx
│   │   │   ├── WhyBizcivitas.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── modals/                # Modals/Popups
│   │   │   ├── InquiryModal.tsx
│   │   │   └── OfferModal.tsx
│   │   │
│   │   ├── admin/                 # Admin panel components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TestimonialForm.tsx
│   │   │   ├── InquiryTable.tsx
│   │   │   └── ContentEditor.tsx
│   │   │
│   │   └── ui/                    # Shared/reusable UI
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       └── Carousel.tsx
│   │
│   ├── lib/                       # -------- BACKEND LOGIC --------
│   │   ├── db.ts                  # Database connection (Prisma client)
│   │   ├── auth.ts                # NextAuth config
│   │   ├── validations.ts         # Zod schemas for form/API validation
│   │   └── utils.ts               # Helper functions
│   │
│   ├── services/                  # -------- BUSINESS LOGIC --------
│   │   ├── testimonials.service.ts  # CRUD operations for testimonials
│   │   ├── inquiries.service.ts     # Form submission handling + email
│   │   ├── content.service.ts       # Landing page content management
│   │   └── upload.service.ts        # Image upload handling
│   │
│   ├── types/                     # -------- TYPESCRIPT TYPES --------
│   │   ├── testimonial.ts
│   │   ├── inquiry.ts
│   │   └── content.ts
│   │
│   └── hooks/                     # -------- CUSTOM HOOKS --------
│       ├── useTestimonials.ts       # Fetch testimonials
│       └── useContent.ts           # Fetch landing page content
│
├── prisma/                        # -------- DATABASE --------
│   ├── schema.prisma              # Database models
│   ├── seed.ts                    # Seed initial data
│   └── migrations/                # Auto-generated migrations
│
├── .env                           # Environment variables
├── .env.example                   # Template for env vars
└── next.config.ts
```

---

## Database Models (Prisma)

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ---- TESTIMONIALS ----
model Testimonial {
  id            Int      @id @default(autoincrement())
  name          String
  photoUrl      String
  logoUrl       String?
  quote         String
  businessValue String?
  designation   String?
  company       String?
  displayOrder  Int      @default(0)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// ---- FORM SUBMISSIONS ----
model Inquiry {
  id               Int      @id @default(autoincrement())
  fullName         String
  companyName      String
  email            String
  phone            String
  city             String
  state            String
  role             String
  teamSize         String
  consentMessages  Boolean  @default(false)
  consentMarketing Boolean  @default(false)
  source           String   @default("landing_page")  // track which CTA
  status           String   @default("new")           // new, contacted, converted
  notes            String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

// ---- LANDING PAGE CONTENT ----
model LandingContent {
  id          Int      @id @default(autoincrement())
  section     String   @unique   // "hero", "offer", "pricing"
  content     Json                // flexible JSON for each section
  updatedAt   DateTime @updatedAt
}

// ---- ADMIN USERS ----
model AdminUser {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  name      String
  role      String   @default("admin")
  createdAt DateTime @default(now())
}
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│                   LANDING PAGE                       │
│                                                     │
│  Hero ──> "Join BizCivitas" ──> InquiryModal        │
│  WhyBizcivitas ──> "Access Now" ──> InquiryModal    │
│  OfferModal ──> "Access Now" ──> InquiryModal       │
│  SuccessStories ──> Carousel (from API)             │
│                                                     │
└─────────────┬───────────────────────┬───────────────┘
              │                       │
              ▼                       ▼
     POST /api/inquiries      GET /api/testimonials
              │                       │
              ▼                       ▼
        ┌─────────┐           ┌──────────────┐
        │ Inquiry │           │ Testimonial  │
        │  Table  │           │    Table     │
        └────┬────┘           └──────┬───────┘
             │                       │
             ▼                       ▼
    ┌─────────────────────────────────────┐
    │          ADMIN PANEL                │
    │                                     │
    │  /admin/inquiries   (view leads)    │
    │  /admin/testimonials (manage cards) │
    │  /admin/content     (edit text)     │
    └─────────────────────────────────────┘
```

---

## API Route Details

### 1. Inquiries (Form Submissions)

**POST `/api/inquiries`** — Called when user submits the form
```ts
// Validates input with Zod
// Saves to database
// Sends email notification to admin
// Sends confirmation email to user (optional)
// Returns success response
```

**GET `/api/inquiries`** — Admin only
```ts
// Requires auth
// Supports filters: ?status=new&from=2026-01-01&to=2026-03-14
// Supports pagination: ?page=1&limit=20
// Returns list with total count
```

### 2. Testimonials

**GET `/api/testimonials`** — Public
```ts
// Returns active testimonials ordered by displayOrder
// Cached with revalidate (ISR) for performance
```

**POST/PUT/DELETE** — Admin only
```ts
// Full CRUD with image upload support
// Reorder endpoint for drag-and-drop
```

### 3. Content

**GET `/api/content?section=hero`** — Public
```ts
// Returns section content as JSON
// Sections: hero, offer, pricing, struggling, features
```

**PUT `/api/content`** — Admin only
```ts
// Update section content
// Flexible JSON structure per section
```

---

## Content JSON Structure

### Hero Section
```json
{
  "section": "hero",
  "content": {
    "title": "BizCivitas Digital Membership",
    "subtitle": "You don't need more events or workshops...",
    "cta_text": "Join BizCivitas",
    "logo_url": "/images/logo.png",
    "hero_image": "/images/hero-phones.png"
  }
}
```

### Offer Popup
```json
{
  "section": "offer",
  "content": {
    "headline": "Get your Digital Membership at",
    "discount": "20% off",
    "original_price": "₹6,999/-",
    "sale_price": "₹5,599/-",
    "tagline": "Connect. Learn. Grow.",
    "cta_text": "Access Now",
    "auto_show_delay": 5000,
    "is_active": true
  }
}
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/bizcivitas

# Auth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Email (for inquiry notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=admin@bizcivitas.com
SMTP_PASS=app-password

# Image Upload
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# App
NEXT_PUBLIC_SITE_URL=https://bizcivitas.com
ADMIN_EMAIL=admin@bizcivitas.com
```

---

## Implementation Priority

### Phase 1 — Form Submissions (Most Critical)
1. Set up database (Supabase/PlanetScale)
2. Create Prisma schema + migrate
3. Build `POST /api/inquiries` route
4. Connect InquiryModal form to API
5. Set up email notification on new inquiry

### Phase 2 — Testimonials Carousel
1. Seed testimonials data from current hardcoded values
2. Build `GET /api/testimonials` route
3. Install Swiper.js
4. Update SuccessStories to fetch from API + carousel

### Phase 3 — Admin Panel
1. Set up NextAuth.js
2. Build admin layout with sidebar
3. Inquiries dashboard (view, filter, status update)
4. Testimonials management (CRUD, reorder, toggle)

### Phase 4 — CMS Content
1. Build content API routes
2. Seed current landing page text
3. Admin content editor
4. Connect frontend sections to fetch from API

---

## Tech Stack Summary

| Layer        | Technology                    |
|-------------|-------------------------------|
| Framework   | Next.js 16 (App Router)       |
| Database    | PostgreSQL (Supabase)         |
| ORM         | Prisma                        |
| Auth        | NextAuth.js                   |
| Validation  | Zod                           |
| Carousel    | Swiper.js                     |
| Email       | Nodemailer / Resend           |
| Image Store | Cloudinary / Vercel Blob      |
| Hosting     | Vercel                        |
