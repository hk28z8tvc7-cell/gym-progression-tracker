create extension if not exists pgcrypto;

create table if not exists public.exercises (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  target_sets integer not null default 3,
  rep_min integer not null default 8,
  rep_max integer not null default 10,
  default_weight numeric not null default 0,
  increment numeric not null default 5,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_templates (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  favorite boolean not null default false,
  exercise_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_name text not null,
  workout_date date not null,
  favorite boolean not null default false,
  notes text not null default '',
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exercises enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_sessions enable row level security;

create index if not exists exercises_user_id_idx on public.exercises(user_id);
create index if not exists workout_templates_user_id_idx on public.workout_templates(user_id);
create index if not exists workout_sessions_user_id_idx on public.workout_sessions(user_id);

drop policy if exists "Users can read their exercises" on public.exercises;
drop policy if exists "Users can insert their exercises" on public.exercises;
drop policy if exists "Users can update their exercises" on public.exercises;
drop policy if exists "Users can delete their exercises" on public.exercises;

create policy "Users can read their exercises" on public.exercises for select using ((select auth.uid()) = user_id);
create policy "Users can insert their exercises" on public.exercises for insert with check ((select auth.uid()) = user_id);
create policy "Users can update their exercises" on public.exercises for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their exercises" on public.exercises for delete using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their workout templates" on public.workout_templates;
drop policy if exists "Users can insert their workout templates" on public.workout_templates;
drop policy if exists "Users can update their workout templates" on public.workout_templates;
drop policy if exists "Users can delete their workout templates" on public.workout_templates;

create policy "Users can read their workout templates" on public.workout_templates for select using ((select auth.uid()) = user_id);
create policy "Users can insert their workout templates" on public.workout_templates for insert with check ((select auth.uid()) = user_id);
create policy "Users can update their workout templates" on public.workout_templates for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their workout templates" on public.workout_templates for delete using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their workout sessions" on public.workout_sessions;
drop policy if exists "Users can insert their workout sessions" on public.workout_sessions;
drop policy if exists "Users can update their workout sessions" on public.workout_sessions;
drop policy if exists "Users can delete their workout sessions" on public.workout_sessions;

create policy "Users can read their workout sessions" on public.workout_sessions for select using ((select auth.uid()) = user_id);
create policy "Users can insert their workout sessions" on public.workout_sessions for insert with check ((select auth.uid()) = user_id);
create policy "Users can update their workout sessions" on public.workout_sessions for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their workout sessions" on public.workout_sessions for delete using ((select auth.uid()) = user_id);

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and pg_get_function_arguments(p.oid) = ''
  ) then
    revoke execute on function public.rls_auto_enable() from anon;
    revoke execute on function public.rls_auto_enable() from authenticated;
    revoke execute on function public.rls_auto_enable() from public;
  end if;
end $$;
