# Database Setup

This app can sync registered puzzles to Supabase. If the environment variables are not set, it keeps using browser localStorage.

1. Create a Supabase project.
2. Open the Supabase SQL editor and run `supabase/puzzles.sql`.
3. Run `supabase/puzzles-final-schema.sql` to apply the beta final columns
   and six difficulty ids.
4. Copy `.env.example` to `.env.local`.
5. Set these values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
VITE_SUPABASE_PUZZLE_TABLE=puzzles
VITE_SUPABASE_ADMIN_FUNCTION=manage-puzzles
```

6. Restart the Vite dev server.

## GitHub Pages

GitHub Pages builds the app in GitHub Actions, so `.env.local` is not used there.

Add these repository variables in GitHub:

`Settings` -> `Secrets and variables` -> `Actions` -> `Variables`

If you instead add them as `Environment variables`, use the `github-pages` environment.

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
VITE_SUPABASE_PUZZLE_TABLE=puzzles
VITE_SUPABASE_ADMIN_FUNCTION=manage-puzzles
```

After saving the variables, push to `main` again or rerun the Pages workflow.

The v2 app reads public puzzles directly with the browser key, but puzzle
management writes should go through the `manage-puzzles` Edge Function.

## v2 Write Protection

The recommended v2 setup is:

1. Keep `select` available to the browser key.
2. Remove public `insert`, `update`, and `delete` policies from `public.puzzles`.
3. Deploy `supabase/functions/manage-puzzles`.
4. Store the admin password and service role key as Edge Function secrets.

Run this SQL after confirming the table already has the final schema:

```sql
alter table public.puzzles enable row level security;

drop policy if exists "Public puzzle insert" on public.puzzles;
drop policy if exists "Public puzzle update" on public.puzzles;
drop policy if exists "Public puzzle delete" on public.puzzles;

drop policy if exists "puzzles are readable" on public.puzzles;
create policy "puzzles are readable"
on public.puzzles
for select
to anon
using (is_published = true);
```

Supabase may warn that this query includes destructive operations because it
drops policies. This does not delete puzzle rows; it removes old public write
rules.

Set these Edge Function secrets in Supabase:

```env
ADMIN_PASSWORD_HASH=sha256-hex-admin-password
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`ADMIN_PASSWORD` is also supported for local testing, but prefer
`ADMIN_PASSWORD_HASH` in production. The service role key must never be exposed
to the Vite app or GitHub Pages variables.

Deploy the function with:

```sh
supabase functions deploy manage-puzzles
```

The app's visible admin lock uses `VITE_REGISTER_PASSWORD_HASH` for the browser
prompt. Use the same actual password for the Edge Function's
`ADMIN_PASSWORD_HASH`.

## Beta Final Schema

The beta app uses six difficulty ids:

```text
beginner, easy, normal, hard, expert, challenge
```

It also expects these final management columns:

```text
order_index, is_published
```

If the table was created during alpha, run:

```sql
-- Full version is in supabase/puzzles-final-schema.sql
```

That migration updates the difficulty check, fills missing order values, marks
existing rows as published, and adds the published/order index.

The short difficulty-only SQL is kept here only for reference:

```sql
alter table public.puzzles
drop constraint if exists puzzles_difficulty_check;

alter table public.puzzles
add constraint puzzles_difficulty_check
check (difficulty in ('beginner', 'easy', 'normal', 'hard', 'expert', 'challenge'));
```
