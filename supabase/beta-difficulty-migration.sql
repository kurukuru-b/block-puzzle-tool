alter table public.puzzles
drop constraint if exists puzzles_difficulty_check;

alter table public.puzzles
add constraint puzzles_difficulty_check
check (difficulty in ('beginner', 'easy', 'normal', 'hard', 'expert', 'challenge'));
