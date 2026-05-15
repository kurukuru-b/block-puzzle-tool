alter table public.puzzles
add column if not exists order_index integer,
add column if not exists is_published boolean not null default true,
alter column difficulty set not null,
alter column title set not null,
alter column grid set not null,
alter column placed_shapes set not null;

alter table public.puzzles
drop constraint if exists puzzles_difficulty_check;

alter table public.puzzles
add constraint puzzles_difficulty_check
check (difficulty in ('beginner', 'easy', 'normal', 'hard', 'expert', 'challenge'));

with numbered as (
  select
    id,
    row_number() over (
      partition by difficulty
      order by created_at asc
    ) - 1 as next_order_index
  from public.puzzles
)
update public.puzzles
set order_index = numbered.next_order_index
from numbered
where public.puzzles.id = numbered.id
  and public.puzzles.order_index is null;

update public.puzzles
set is_published = true
where is_published is null;

alter table public.puzzles
alter column order_index set not null,
alter column is_published set not null;

create index if not exists puzzles_published_difficulty_order_idx
on public.puzzles (is_published, difficulty, order_index);
