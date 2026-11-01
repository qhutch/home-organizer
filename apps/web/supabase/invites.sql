create table household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

alter table household_invites enable row level security;

create policy "Members can create invites"
  on household_invites for insert
  with check (is_household_member(household_id) and created_by = auth.uid());

create policy "Anyone can read a valid invite by token"
  on household_invites for select
  using (true);
