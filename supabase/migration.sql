-- ============================================================================
-- Workout Tracker — Supabase Migration
-- Run this in the Supabase SQL Editor to set up all tables, RLS, and triggers.
-- ============================================================================

-- ─── Profiles ────────────────────────────────────────────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  goal        text not null default 'Build Muscle',
  age         text not null default '',
  weight      text not null default '',
  height      text not null default '',
  picture_url text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (id = auth.uid());
create policy "Users can insert own profile"
  on public.profiles for insert with check (id = auth.uid());
create policy "Users can update own profile"
  on public.profiles for update using (id = auth.uid());

-- ─── Routines ────────────────────────────────────────────────────────────────

create table public.routines (
  id          text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  tag         text not null default '',
  exercises   jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (id, user_id)
);

alter table public.routines enable row level security;

create policy "Users can read own routines"
  on public.routines for select using (user_id = auth.uid());
create policy "Users can insert own routines"
  on public.routines for insert with check (user_id = auth.uid());
create policy "Users can update own routines"
  on public.routines for update using (user_id = auth.uid());
create policy "Users can delete own routines"
  on public.routines for delete using (user_id = auth.uid());

-- ─── Schedules ───────────────────────────────────────────────────────────────

create table public.schedules (
  user_id     uuid not null references auth.users(id) on delete cascade,
  day         text not null,
  routine_id  text,
  primary key (user_id, day)
);

alter table public.schedules enable row level security;

create policy "Users can read own schedule"
  on public.schedules for select using (user_id = auth.uid());
create policy "Users can insert own schedule"
  on public.schedules for insert with check (user_id = auth.uid());
create policy "Users can update own schedule"
  on public.schedules for update using (user_id = auth.uid());
create policy "Users can delete own schedule"
  on public.schedules for delete using (user_id = auth.uid());

-- ─── Workout Logs ────────────────────────────────────────────────────────────

create table public.workout_logs (
  id          text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  date        text not null,
  date_label  text not null default '',
  duration    text not null default '',
  exercises   jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  primary key (id, user_id)
);

alter table public.workout_logs enable row level security;

create policy "Users can read own workout logs"
  on public.workout_logs for select using (user_id = auth.uid());
create policy "Users can insert own workout logs"
  on public.workout_logs for insert with check (user_id = auth.uid());
create policy "Users can update own workout logs"
  on public.workout_logs for update using (user_id = auth.uid());
create policy "Users can delete own workout logs"
  on public.workout_logs for delete using (user_id = auth.uid());

-- ─── Points ──────────────────────────────────────────────────────────────────

create table public.points (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  total_points integer not null default 0,
  updated_at   timestamptz not null default now()
);

alter table public.points enable row level security;

create policy "Users can read own points"
  on public.points for select using (user_id = auth.uid());
create policy "Users can insert own points"
  on public.points for insert with check (user_id = auth.uid());
create policy "Users can update own points"
  on public.points for update using (user_id = auth.uid());

-- ─── Points History ──────────────────────────────────────────────────────────

create table public.points_history (
  workout_id        text not null,
  user_id           uuid not null references auth.users(id) on delete cascade,
  date              text not null,
  workout_name      text not null,
  volume_points     integer not null default 0,
  improvement_bonus integer not null default 0,
  streak_bonus      integer not null default 0,
  consistency_bonus integer not null default 0,
  total             integer not null default 0,
  improvements      jsonb not null default '[]',
  volume            integer not null default 0,
  streak_days       integer not null default 0,
  primary key (workout_id, user_id)
);

alter table public.points_history enable row level security;

create policy "Users can read own points history"
  on public.points_history for select using (user_id = auth.uid());
create policy "Users can insert own points history"
  on public.points_history for insert with check (user_id = auth.uid());
create policy "Users can update own points history"
  on public.points_history for update using (user_id = auth.uid());

-- ─── Auto-create profile + points on signup ──────────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  insert into public.points (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Avatars Storage Bucket ──────────────────────────────────────────────────
-- Create the bucket manually in Dashboard > Storage, then run these policies:

create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Public avatar read"
  on storage.objects for select
  using (bucket_id = 'avatars');
