# Deploy & Supabase setup

## GitHub

Repo: https://github.com/dangang/riverside-city

## Supabase (required for cloud save / auth)

1. Create a project at https://supabase.com
2. SQL Editor → paste and run [`supabase/migrations/001_riverside.sql`](supabase/migrations/001_riverside.sql)
3. Authentication → Providers → Email enabled
4. Authentication → URL Configuration → add site URLs:
   - `http://localhost:3000`
   - your Render URL (e.g. `https://riverside-city.onrender.com`)
5. Project Settings → API → copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Local: copy `.env.example` → `.env.local` and fill values
7. **Never** put the `service_role` key in the browser or `NEXT_PUBLIC_*` vars

### Guest → Sign up

If the player built something as a guest, signup calls `importGuestCity` to transfer that city into the new account (only when the cloud city is empty/new).

## Render

[`render.yaml`](render.yaml) defines a Node web service.

1. Connect the GitHub repo in Render
2. New → Blueprint → select repo, or Web Service with:
   - Build: `npm install && npm run build`
   - Start: `npm start` (binds `0.0.0.0:$PORT`)
3. Environment:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

Render MCP was unauthorized in this session — create the service from the dashboard or re-auth the Render MCP, then we can wire env vars via tools.
