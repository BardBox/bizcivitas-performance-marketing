# Backend Documentation: Testimonials Carousel

## Overview
This document outlines the backend setup needed to make the "Our Members Success Stories" section dynamic with a carousel/slider, so testimonials can be managed from an admin panel or CMS.

---

## 1. Database Schema

### Table: `testimonials`

| Column        | Type         | Description                          |
|---------------|--------------|--------------------------------------|
| id            | UUID / INT   | Primary key                          |
| name          | VARCHAR(100) | Member name (e.g., "Jaimi Panchal")  |
| photo_url     | TEXT         | URL to member's profile photo        |
| logo_url      | TEXT         | URL to member's business logo        |
| quote         | TEXT         | Testimonial quote                    |
| business_value| VARCHAR(50)  | e.g., "Rs.8,00,000/-"               |
| designation   | VARCHAR(100) | Role/title (optional)               |
| company       | VARCHAR(100) | Company name (optional)             |
| order         | INT          | Display order in carousel            |
| is_active     | BOOLEAN      | Show/hide toggle                     |
| created_at    | TIMESTAMP    | Auto-generated                       |
| updated_at    | TIMESTAMP    | Auto-generated                       |

### SQL (PostgreSQL)

```sql
CREATE TABLE testimonials (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  photo_url     TEXT NOT NULL,
  logo_url      TEXT,
  quote         TEXT NOT NULL,
  business_value VARCHAR(50),
  designation   VARCHAR(100),
  company       VARCHAR(100),
  display_order INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

---

## 2. API Endpoints

### Base URL: `/api/testimonials`

| Method | Endpoint               | Description                  | Auth Required |
|--------|------------------------|------------------------------|---------------|
| GET    | `/api/testimonials`    | Fetch all active testimonials| No            |
| GET    | `/api/testimonials/:id`| Fetch single testimonial     | No            |
| POST   | `/api/testimonials`    | Create new testimonial       | Yes (Admin)   |
| PUT    | `/api/testimonials/:id`| Update testimonial           | Yes (Admin)   |
| DELETE | `/api/testimonials/:id`| Delete testimonial           | Yes (Admin)   |
| PATCH  | `/api/testimonials/reorder` | Update display order    | Yes (Admin)   |

### GET `/api/testimonials` Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Jaimi Panchal",
      "photo_url": "/images/jaimi.jpg",
      "logo_url": "/images/jaimi-logo.jpg",
      "quote": "Has Received Rs.8,00,000/- Worth of Business.",
      "business_value": "Rs.8,00,000/-",
      "designation": "Founder",
      "company": "BardBox",
      "display_order": 1,
      "is_active": true
    },
    {
      "id": 2,
      "name": "Deven Oza",
      "photo_url": "/images/deven.jpg",
      "logo_url": "/images/jaimi-logo.jpg",
      "quote": "Has Received Rs. 4,00,000/- Worth of Business.",
      "business_value": "Rs.4,00,000/-",
      "designation": "CEO",
      "company": "BardBox",
      "display_order": 2,
      "is_active": true
    }
  ]
}
```

### POST `/api/testimonials` Request Body

```json
{
  "name": "New Member",
  "photo_url": "https://example.com/photo.jpg",
  "logo_url": "https://example.com/logo.jpg",
  "quote": "Got amazing business referrals!",
  "business_value": "Rs.5,00,000/-",
  "designation": "Founder",
  "company": "Acme Corp",
  "display_order": 4,
  "is_active": true
}
```

---

## 3. Next.js API Route (App Router)

### File: `src/app/api/testimonials/route.ts`

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // your DB connection (Prisma, Drizzle, etc.)

// GET - Fetch all active testimonials
export async function GET() {
  const testimonials = await db.testimonial.findMany({
    where: { is_active: true },
    orderBy: { display_order: "asc" },
  });
  return NextResponse.json({ success: true, data: testimonials });
}

// POST - Create new testimonial (admin only)
export async function POST(req: Request) {
  // Add auth check here
  const body = await req.json();
  const testimonial = await db.testimonial.create({ data: body });
  return NextResponse.json({ success: true, data: testimonial }, { status: 201 });
}
```

---

## 4. Frontend Carousel Implementation

### Recommended Libraries
- **Swiper.js** (`swiper`) - Most popular, touch-friendly
- **Embla Carousel** (`embla-carousel-react`) - Lightweight, performant
- **Splide** (`@splidejs/react-splide`) - Simple API

### Install (Swiper example)

```bash
npm install swiper
```

### Component: `src/components/SuccessStories.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

interface Testimonial {
  id: number;
  name: string;
  photo_url: string;
  logo_url: string;
  quote: string;
}

export default function SuccessStories() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    fetch("/api/testimonials")
      .then((res) => res.json())
      .then((data) => setTestimonials(data.data));
  }, []);

  return (
    <section className="py-16 px-6 md:px-12 lg:px-24 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-navy text-center mb-12">
          Our Members Success Stories
        </h2>

        <Swiper
          modules={[Autoplay, Pagination, Navigation]}
          spaceBetween={30}
          slidesPerView={1}
          breakpoints={{
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          navigation
          loop
        >
          {testimonials.map((t) => (
            <SwiperSlide key={t.id}>
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden">
                  <img src={t.photo_url} alt={t.name} className="w-full h-full object-cover" />
                </div>
                <div className="h-10 flex items-center justify-center mb-3">
                  <img src={t.logo_url} alt="logo" className="h-10 w-auto object-contain" />
                </div>
                <h3 className="font-semibold text-navy text-lg mb-1">{t.name}</h3>
                <p className="text-gray-500 text-sm">{t.quote}</p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
```

---

## 5. Carousel Configuration Options

| Setting            | Value      | Description                              |
|--------------------|------------|------------------------------------------|
| slidesPerView      | 1/2/3      | Cards visible (responsive breakpoints)   |
| autoplay.delay     | 3000ms     | Time between auto-slides                 |
| loop               | true       | Infinite loop                            |
| pagination         | clickable  | Dot indicators below                     |
| navigation         | true       | Left/right arrow buttons                 |
| spaceBetween       | 30px       | Gap between cards                        |

---

## 6. Image Upload (Optional)

For admin to upload member photos/logos:

### Option A: Local Upload
- Store in `public/uploads/testimonials/`
- Use `multer` or Next.js API route with `formData`

### Option B: Cloud Storage (Recommended)
- **Cloudinary** - Free tier, auto-optimization
- **AWS S3** - Scalable, cost-effective
- **Vercel Blob** - Native to Vercel deployments

### Upload API: `POST /api/upload`

```ts
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File;
  const blob = await put(file.name, file, { access: "public" });
  return NextResponse.json({ url: blob.url });
}
```

---

## 7. Admin Panel Checklist

To manage testimonials from an admin panel, you'll need:

- [ ] Auth system (NextAuth.js / Clerk / custom JWT)
- [ ] Admin dashboard page (`/admin/testimonials`)
- [ ] CRUD form (create/edit testimonial)
- [ ] Image upload with preview
- [ ] Drag-and-drop reorder
- [ ] Active/inactive toggle
- [ ] Delete with confirmation

---

## 8. Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host:5432/bizcivitas
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx    # if using Vercel Blob
ADMIN_SECRET=your_admin_secret            # for admin auth
```

---

## Quick Start Steps

1. Set up database (PostgreSQL / PlanetScale / Supabase)
2. Install ORM: `npm install prisma @prisma/client`
3. Create schema & migrate: `npx prisma migrate dev`
4. Seed initial testimonials data
5. Create API routes
6. Install Swiper: `npm install swiper`
7. Update `SuccessStories.tsx` to fetch from API + use Swiper
8. Build admin panel for managing testimonials
