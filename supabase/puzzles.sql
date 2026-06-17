create table if not exists public.puzzles (
  id text primary key,
  difficulty text not null check (difficulty in ('beginner', 'easy', 'normal', 'hard', 'expert', 'challenge')),
  title text not null,
  order_index integer not null default 0,
  is_published boolean not null default true,
  grid jsonb not null,
  placed_shapes jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.puzzles enable row level security;

grant select on table public.puzzles to anon;

drop policy if exists "Public puzzle read" on public.puzzles;
drop policy if exists "puzzles are readable" on public.puzzles;
create policy "puzzles are readable"
  on public.puzzles
  for select
  to anon
  using (is_published = true);

drop policy if exists "Public puzzle insert" on public.puzzles;
drop policy if exists "Public puzzle update" on public.puzzles;
drop policy if exists "Public puzzle delete" on public.puzzles;

create index if not exists puzzles_published_difficulty_order_idx
on public.puzzles (is_published, difficulty, order_index);
