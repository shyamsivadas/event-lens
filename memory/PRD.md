# SnapShare - Product Requirements Document

## Overview
SnapShare is a full-stack application that allows event hosts to collect photos from guests through a unique shareable link. Guests can use their phones to capture and upload photos with live filters, while hosts can view all photos in a gallery and generate professional flipbooks.

## User Personas

### Event Host (Authenticated)
- Creates and manages events
- Shares unique camera links/QR codes with guests
- Views live photo gallery
- Downloads photos and generates flipbooks
- Requires Google OAuth login

### Guest (Unauthenticated)
- Accesses unique event links
- Takes photos with live camera filters
- Has a per-device photo limit
- No account required

## Core Features

### Authentication
- [x] Google OAuth via Emergent-managed social login
- [x] Session-based authentication with cookies
- [x] Protected routes for host dashboard

### Event Management
- [x] Create events with name, date, logo, filter type, max photos
- [x] Selectable flipbook gallery style (3 options)
- [x] Unique shareable URL and QR code generation
- [x] Event deletion

### Guest Camera Experience
- [x] Direct camera access via unique URL
- [x] Live filter preview (warm, party, wedding, corporate, vintage)
- [x] Front/back camera toggle
- [x] Flash control
- [x] Photo limit enforcement per device
- [x] Auto-upload to cloud storage

### Photo Storage & Gallery
- [x] Cloudflare R2 cloud storage integration
- [x] Presigned URLs for secure upload/download
- [x] Pixieset-inspired professional gallery
- [x] Lightbox viewer for individual photos
- [x] Auto-refresh (10-second polling)

### Flipbook Generation
- [x] Heyzine API integration
- [x] Three selectable gallery styles:
  - **Memory Archive**: Documentary style with polaroid-frame scattered grid layout, dark cinematic theme
  - **Typography Collage**: Bold text overlays with vibrant yellow/gold backgrounds, artistic arrangement
  - **Minimalist Story**: Clean Instagram-style with white backgrounds, progress bars, organized layout
- [x] PDF generation with ReportLab
- [x] Custom template support

## Tech Stack
- **Frontend**: React, React Router, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: Emergent-managed Google OAuth
- **File Storage**: Cloudflare R2 (via boto3)
- **PDF Generation**: ReportLab
- **Flipbook Service**: Heyzine API

## API Endpoints

### Authentication
- `POST /api/auth/session` - Process OAuth session
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Events
- `POST /api/events` - Create event
- `GET /api/events` - List user's events
- `GET /api/events/{event_id}` - Get event details
- `DELETE /api/events/{event_id}` - Delete event
- `GET /api/events/{event_id}/photos` - Get event photos
- `POST /api/events/{event_id}/create-flipbook` - Generate flipbook

### Guest
- `GET /api/guest/{share_url}` - Get event for guests
- `GET /api/guest/{share_url}/limit` - Check device photo limit
- `POST /api/guest/{share_url}/presigned-url` - Get upload URL
- `POST /api/guest/{share_url}/track-upload` - Track uploaded photo

## Database Schema

### users
```json
{
  "user_id": "string",
  "email": "string",
  "name": "string",
  "picture": "string (optional)",
  "created_at": "datetime"
}
```

### events
```json
{
  "event_id": "string",
  "host_id": "string",
  "name": "string",
  "date": "string",
  "logo_url": "string (optional)",
  "filter_type": "string",
  "max_photos": "number",
  "flipbook_style": "string (memory_archive|typography_collage|minimalist_story)",
  "share_url": "string",
  "created_at": "datetime",
  "flipbook_url": "string (optional)",
  "flipbook_created_at": "datetime (optional)"
}
```

### photos
```json
{
  "photo_id": "string",
  "event_id": "string",
  "device_id": "string",
  "filename": "string",
  "s3_key": "string",
  "uploaded_at": "datetime"
}
```

## What's Been Implemented (as of Jan 14, 2026)

### Completed Features
1. Full authentication flow with Google OAuth
2. Event CRUD operations
3. Guest camera with live filters
4. Cloudflare R2 photo storage
5. Professional photo gallery with lightbox
6. Heyzine flipbook integration
7. **Three selectable flipbook gallery styles** (LATEST)
   - Memory Archive (default)
   - Typography Collage
   - Minimalist Story
8. Professional landing page
9. Dark cinematic theme throughout

### Recent Bug Fixes
- Fixed input field text visibility on light backgrounds
- Fixed R2 upload permission/CORS issues
- Fixed empty flipbook creation (PDF URL accessibility)
- Fixed browser clipboard permission errors
- Fixed Event Pydantic model missing flipbook_style field

## Upcoming Tasks (Priority Order)

### P0 - High Priority
- [ ] **SaaS Subscription Model**: Integrate Stripe, create subscription tiers (Free, Starter, Pro)
- [ ] **Billing Dashboard**: Payment history, plan management

### P1 - Medium Priority
- [ ] **Usage Limits**: Enforce plan-based limits (events, photos)
- [ ] **Account Settings**: Profile management, subscription info

### P2 - Lower Priority
- [ ] **Legal Pages**: Terms of Service, Privacy Policy

## Future/Backlog

- Admin dashboard for business management
- Email system integration (Resend/SendGrid)
- Customer support system
- Gallery enhancements (watermarking, client proofing, comments)
- Photo download as ZIP
- Event analytics (views, upload stats)

## Environment Variables Required

### Backend (.env)
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name
- `R2_ACCOUNT_ID` - Cloudflare R2 account
- `R2_ACCESS_KEY_ID` - R2 access key
- `R2_SECRET_ACCESS_KEY` - R2 secret key
- `R2_BUCKET_NAME` - R2 bucket name
- `R2_PUBLIC_URL` - R2 public URL for PDFs
- `HEYZINE_API_KEY` - Heyzine API key
- `HEYZINE_CLIENT_ID` - Heyzine client ID

### Frontend (.env)
- `REACT_APP_BACKEND_URL` - Backend API URL
