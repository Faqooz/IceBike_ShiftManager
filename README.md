# Shift Management System

A mobile-first Next.js app for managing kiosk employee shifts. Built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase.

---

## Local Setup

### Prerequisites
- Node.js 18+
- A Supabase project with the shift management schema already deployed

### Steps

```bash
# 1. Clone and install
git clone <repo-url>
cd shift-app
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in your Supabase URL and anon key

# 3. Run the dev server
npm run dev
# App runs at http://localhost:3000
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (found in project Settings > API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key (found in project Settings > API) |

---

## Setting Up the First Manager

The schema does not include a self-signup flow with role selection. To create the first manager:

1. Create a user via **Supabase Dashboard → Authentication → Users → Add user** (or via `supabase auth admin createuser` CLI).
2. The `profiles` table should have a trigger that inserts a row on `auth.users` insert. If not, insert manually:

```sql
INSERT INTO profiles (id, full_name, role, kiosk_id)
VALUES ('<auth-user-uuid>', 'Admin Name', 'manager', NULL);
```

3. Managers may have `kiosk_id = NULL`. Employees must have a valid `kiosk_id`.
4. Log in at `/login` with the manager credentials.

---

## Roles & Flows

### Manager
- Creates **draft shifts** (`/shifts/new`)
- Edits drafts (`/shifts/[id]`)
- Publishes, hides, weather-closes, or cancels shifts
- Reviews the request queue (`/requests`) and approves or rejects each request
- Approving a request creates exactly one assignment per shift
- Manages employee profiles (`/employees`) — can change name, role, kiosk
- Views all hours across employees (`/hours`)
- Views the full audit log (`/audit`)

### Employee
- Sees only **published** shifts for their own kiosk (`/shifts`)
- Requests available shifts; withdraws pending requests
- Views their own request history (`/requests`)
- Views their own approved hours (`/hours`)
- Updates their own name (`/profile`)

---

## Key Design Decisions

- **No optimistic updates**: All mutations refetch from the server to stay honest about backend state.
- **No realtime subscriptions** in v1 — use manual refresh or reload.
- **RLS is the real security layer** — the frontend role checks are UX-only.
- **Timestamps stored in UTC**, displayed in browser local timezone.
- **Single assignment per shift** — the `shift_assignments.shift_id` unique constraint enforces this at the DB level.

---

## Folder Structure

```
src/
  app/
    (auth)/login/         Login page
    (app)/
      layout.tsx          App shell with nav
      dashboard/          Role-aware dashboard
      shifts/             Shift list + new + detail
      requests/           Request queue / history
      employees/          Manager: employee list + edit
      hours/              Hours summary
      profile/            Current user profile
      audit/              Manager: audit log
  components/
    ui/                   Low-level primitives
    shared/               Domain-specific reusable components
  lib/
    supabase/             Client init + typed helpers
    utils.ts              Date, duration, status formatting
    auth.ts               Session helpers
  types/
    index.ts              All TypeScript types
```
