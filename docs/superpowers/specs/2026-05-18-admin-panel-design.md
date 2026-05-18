# Admin Panel Design

**Date:** 2026-05-18  
**Status:** Approved

## Overview

A dedicated admin panel at `/admin` for managing the Confera conference platform. Separate from the user-facing app (no AppShell). Scope is limited to what the backend currently exposes — no new backend endpoints.

## Routes

| Route | Description |
|---|---|
| `/admin` | Redirects to `/admin/role-requests` |
| `/admin/role-requests` | List pending role requests, approve/reject |

## Architecture

### `app/admin/layout.tsx` — AdminShell

A purpose-built layout component wrapping all `/admin` pages. Responsibilities:

- **Auth guard**: reads `user.role` from `useStoredUser()`. If not `admin`, redirects to `/home`.
- **Light sidebar**: Confera Admin branding (logo + label), `ADMIN_NAV` array for nav items (active state, badge support), "Back to app" link, logged-in admin name/email at bottom.
- **No right sidebar**: admin content takes the full remaining width.
- **Extensibility**: adding a new admin section = add one entry to `ADMIN_NAV` + create `app/admin/<section>/page.tsx`. Nothing else changes.

### `app/admin/page.tsx`

Renders `<Redirect to="/admin/role-requests" />` (or Next.js `redirect()`).

### `app/admin/role-requests/page.tsx`

Fetches `GET /role-requests` (Bearer token, admin only). Displays:

- **Stats strip**: 1 card — Pending count (live, from API response length). Approved/rejected counts are not available without a new backend endpoint — omitted.
- **Request list**: one card per pending request showing:
  - Initials avatar (color-coded by first letter)
  - Display name + email
  - Role transition: `participant → organizer/industry` (role label colored)
  - Reason text (italic, gray background) — omitted if absent
  - Timestamp ("X days ago")
  - Approve / Reject buttons
- **Actions**: `PATCH /role-requests/:id/approve` and `PATCH /role-requests/:id/reject`. On success, remove the request from the pending list optimistically.
- **Empty state**: shown when no pending requests remain.
- **Error state**: shown on fetch or action failure.

## Visual Design

- Light sidebar (`#f7f7f7` background, `1px` right border)
- Active nav item: black background, white text (matches app's button style)
- Content area: white, `24px 28px` padding
- Request cards: `1px #f0f0f0` border, `12px` radius
- Approve button: black fill; Reject button: gray fill
- Role labels color-coded: organizer = purple, industry = blue

## Data Flow

```
AdminShell (layout.tsx)
  └─ checks user.role → redirect if not admin
  └─ renders sidebar + <main>{children}</main>

RoleRequestsPage (role-requests/page.tsx)
  └─ GET /role-requests → RoleRequest[]
  └─ derive stats (count by status)
  └─ render pending requests
  └─ approve → PATCH /:id/approve → remove from list
  └─ reject  → PATCH /:id/reject  → remove from list
```

## Extensibility Pattern

```ts
// In AdminShell — adding a new section:
const ADMIN_NAV = [
  { label: 'Role Requests', href: '/admin/role-requests', icon: 'check', badge: pendingCount },
  { label: 'Users',         href: '/admin/users',         icon: 'users' },  // add this line
];
// Then create app/admin/users/page.tsx — done.
```

## Out of Scope

- No backend changes
- No user list page (no backend endpoint exists yet)
- No analytics page (placeholder nav item only, marked "soon")
