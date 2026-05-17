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
```

After saving the variables, push to `main` again or rerun the Pages workflow.

The current SQL allows public read/write access through the browser key. That is fine for a private prototype, but a public production tool should move writes behind Supabase Auth or an Edge Function.

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
