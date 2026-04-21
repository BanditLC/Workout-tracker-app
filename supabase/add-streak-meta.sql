create table public.streak_meta (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  last_workout_timestamp timestamptz,
  updated_at             timestamptz not null default now()
);

alter table public.streak_meta enable row level security;

create policy "Users can read own streak meta"
  on public.streak_meta for select using (user_id = auth.uid());
create policy "Users can insert own streak meta"
  on public.streak_meta for insert with check (user_id = auth.uid());
create policy "Users can update own streak meta"
  on public.streak_meta for update using (user_id = auth.uid());

-- Seed streak_meta for existing users who already have a profile
insert into public.streak_meta (user_id)
select id from auth.users
on conflict do nothing;

-- Update the signup trigger to also create streak_meta
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  insert into public.points (user_id)
  values (new.id);
  insert into public.streak_meta (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;
