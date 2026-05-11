create table if not exists public.puzzles (
  id text primary key,
  difficulty text not null check (difficulty in ('easy', 'normal', 'hard', 'challenge')),
  title text not null,
  grid jsonb not null,
  placed_shapes jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.puzzles enable row level security;

grant select, insert, update, delete on table public.puzzles to anon;

drop policy if exists "Public puzzle read" on public.puzzles;
create policy "Public puzzle read"
  on public.puzzles
  for select
  to anon
  using (true);

drop policy if exists "Public puzzle insert" on public.puzzles;
create policy "Public puzzle insert"
  on public.puzzles
  for insert
  to anon
  with check (true);

drop policy if exists "Public puzzle update" on public.puzzles;
create policy "Public puzzle update"
  on public.puzzles
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "Public puzzle delete" on public.puzzles;
create policy "Public puzzle delete"
  on public.puzzles
  for delete
  to anon
  using (true);
