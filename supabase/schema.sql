create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 24),
  wpm numeric(5, 1) not null check (wpm >= 0 and wpm <= 250),
  raw_wpm numeric(5, 1) not null check (raw_wpm >= 0 and raw_wpm <= 250),
  accuracy numeric(4, 1) not null check (accuracy >= 0 and accuracy <= 100),
  errors integer not null check (errors >= 0),
  mode text not null,
  created_at timestamptz not null default now()
);

create index if not exists scores_leaderboard_idx
  on public.scores (wpm desc, created_at asc);

alter table public.scores enable row level security;

grant usage on schema public to service_role;
grant select, insert on table public.scores to service_role;
