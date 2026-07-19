# Vercel deploy

Vercel hosts the Vite frontend and the backend API as a serverless function.

## Project settings

Framework preset: `Vite`

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

## Environment variables in Vercel

Set these in Vercel Project Settings -> Environment Variables for Production and Preview.

Frontend variables:

```env
VITE_SUPABASE_URL=https://ihctfggjwutrzwstawlh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

For the Vercel web app, `VITE_API_URL` can be omitted so web requests use the same origin.

For a mobile APK build, set `VITE_API_URL` locally to the production Vercel URL before rebuilding the APK:

```env
VITE_API_URL=https://ritualnewapp.vercel.app
```

Backend-only variables:

```env
SUPABASE_URL=https://ihctfggjwutrzwstawlh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_backend_only_service_role_key
FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_JSON=
GOOGLE_APPLICATION_CREDENTIALS=
ENABLE_TEST_PUSH=true
```

Never add `SUPABASE_SERVICE_ROLE_KEY` to `VITE_*` variables.

## Supabase Auth URLs

Add the production domain in Supabase:

```text
Authentication -> URL Configuration
Site URL: https://ritualnewapp.vercel.app
Redirect URLs: https://ritualnewapp.vercel.app/**
```

Google and Apple providers must also be enabled in Supabase Authentication providers.
