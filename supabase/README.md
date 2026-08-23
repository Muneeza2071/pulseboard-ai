# PulseBoard Supabase Setup

The migration in `migrations/202608230001_pulseboard_foundation.sql` creates a fully isolated `pulseboard_*` schema inside the existing Supabase project. It does not modify any DevDesk table, policy, or data.

## Public frontend variables

Copy `.env.example` to `.env.local` for local development and supply only the browser-safe values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>
```

Never add a `service_role` key to the browser, a public environment variable, or GitHub. The app only uses Supabase's browser publishable key and relies on Row Level Security for user access.

## Data boundary

Every business table includes `workspace_id`; policies validate membership with `auth.uid()` through a narrow security-definer helper. This lets multiple users share a PulseBoard workspace without being able to read another workspace's customers, deals, metrics, activity, or audit records.
