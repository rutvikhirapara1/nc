# Vendor Pay Hub

A production-oriented vendor payment and bill reminder portal based on the supplied PRD.

## Stack
- Next.js App Router + TypeScript + Tailwind CSS
- Supabase Auth + PostgreSQL + Row Level Security
- SheetJS Excel export

## Setup
1. Create a Supabase project.
2. Open Supabase SQL Editor and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local` and set your Supabase URL and anon key.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

## Deploy to Vercel
Import the GitHub repository into Vercel and add:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

The middleware protects dashboard/vendor/bill routes and redirects unauthenticated users to `/login`.

## Included
- Email/password sign up and login
- User-isolated Supabase RLS
- Vendor create/edit/archive/search
- Bill entry with automatic due-date calculation
- Pending/paid state and paid date
- Overdue / critical / upcoming / safe visual statuses
- Dashboard KPI cards and aging snapshot
- Bill search and filters
- Client-side Excel export


### Vercel environment variables

Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel. The app keeps these names private on the server and exposes only the Supabase URL + anon/publishable key through `/api/supabase-config` for browser authentication and database access. Do not use the Supabase `service_role` key.

## Vercel environment variables

Add these variables in **Development, Preview, and Production**:

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_ANON_KEY` — your Supabase anon/publishable key

Do not commit a real `.env` file or Supabase service-role key to GitHub.
