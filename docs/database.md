# Database Setup

This app can sync registered puzzles to Supabase. If the environment variables are not set, it keeps using browser localStorage.

1. Create a Supabase project.
2. Open the Supabase SQL editor and run `supabase/puzzles.sql`.
3. Copy `.env.example` to `.env.local`.
4. Set these values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
VITE_SUPABASE_PUZZLE_TABLE=puzzles
```

5. Restart the Vite dev server.

## GitHub Pages

GitHub Pages builds the app in GitHub Actions, so `.env.local` is not used there.

Add these repository variables in GitHub:

`Settings` -> `Secrets and variables` -> `Actions` -> `Variables`

If you instead add them as `Environment variables`, use the `github-pages` environment.

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
VITE_SUPABASE_PUZZLE_TABLE=puzzles
```

After saving the variables, push to `main` again or rerun the Pages workflow.

The current SQL allows public read/write access through the browser key. That is fine for a private prototype, but a public production tool should move writes behind Supabase Auth or an Edge Function.
