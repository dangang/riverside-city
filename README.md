# Riverside — Living City

Browser city-tycoon vertical slice: build Riverside, watch citizens live, upgrade, events, social feed, offline income.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Custom CSS/SVG isometric city (project-owned art)
- Supabase Auth + Postgres (RLS) when configured
- Guest mode with localStorage for instant play
- Render-ready via `render.yaml`

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000 → **Play now**.

## Supabase (optional for guest play)

1. Create a project at https://supabase.com
2. Run SQL in `supabase/migrations/001_riverside.sql`
3. Copy `.env.example` → `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Enable Email auth in Supabase dashboard

## Deploy (Render)

Connect the repo and use `render.yaml`, or create a Web Service:

- Build: `npm install && npm run build`
- Start: `npm start` (binds `0.0.0.0:$PORT`)
- Set the same Supabase env vars

## Play loop

Name city → build house → citizens arrive → grocery → jobs/taxes → upgrade → MAX → events → feed/promote → goals/history → offline collect.
