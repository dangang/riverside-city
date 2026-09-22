# Riverside — Living City

Browser city-tycoon vertical slice: build Riverside, watch citizens live, upgrade, events, Pulse feed, offline income.

**Repo:** https://github.com/dangang/riverside-city

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Custom CSS/SVG isometric city + Pass 2 juice (SFX, FX, day/night)
- Supabase Auth + Postgres (RLS) when configured
- Guest mode with localStorage (+ guest→account transfer on signup)
- Render-ready via `render.yaml`

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000 → **Play now**.

## Deploy / Supabase

See [DEPLOY.md](DEPLOY.md).

## Play loop (~10 min)

Name city → house → citizens → grocery → jobs/taxes → upgrade → MAX → event → Pulse → park campaign → goals → offline collect.
