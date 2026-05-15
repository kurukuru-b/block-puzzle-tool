alter table public.puzzles
add column if not exists order_index integer;

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

create index if not exists puzzles_difficulty_order_index_idx
on public.puzzles (difficulty, order_index);
