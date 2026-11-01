-- Households
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Household members
create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')) default 'member',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Shopping items
create table shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  notes text,
  in_list boolean not null default true,
  added_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- One-time reminders
create table reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  completed boolean not null default false,
  assigned_to uuid references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Recurring reminders
create table recurring_reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  recurrence text not null, -- e.g. 'daily', 'weekly:monday', 'monthly:15'
  assigned_to uuid references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Recurring reminder completions
create table recurring_reminder_completions (
  id uuid primary key default gen_random_uuid(),
  recurring_reminder_id uuid not null references recurring_reminders(id) on delete cascade,
  completed_at timestamptz not null default now(),
  completed_by uuid not null references auth.users(id)
);

-- Row Level Security
alter table households enable row level security;
alter table household_members enable row level security;
alter table shopping_items enable row level security;
alter table reminders enable row level security;
alter table recurring_reminders enable row level security;
alter table recurring_reminder_completions enable row level security;

-- Helpers
create or replace function is_household_member(hid uuid)
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

-- RLS Policies: households
create policy "Members can view their household"
  on households for select
  using (is_household_member(id));

create policy "Owner can update household"
  on households for update
  using (
    exists (
      select 1 from household_members
      where household_id = id and user_id = auth.uid() and role = 'owner'
    )
  );

create policy "Authenticated users can create a household"
  on households for insert
  with check (auth.uid() is not null);

-- RLS Policies: household_members
create policy "Members can view household members"
  on household_members for select
  using (is_household_member(household_id));

create policy "Owner can manage members"
  on household_members for all
  using (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_id and hm.user_id = auth.uid() and hm.role = 'owner'
    )
  );

create policy "User can join household"
  on household_members for insert
  with check (user_id = auth.uid());

-- RLS Policies: shopping_items
create policy "Members can view shopping items"
  on shopping_items for select
  using (is_household_member(household_id));

create policy "Members can insert shopping items"
  on shopping_items for insert
  with check (is_household_member(household_id) and added_by = auth.uid());

create policy "Members can update shopping items"
  on shopping_items for update
  using (is_household_member(household_id));

create policy "Members can delete shopping items"
  on shopping_items for delete
  using (is_household_member(household_id));

-- RLS Policies: reminders
create policy "Members can view reminders"
  on reminders for select
  using (is_household_member(household_id));

create policy "Members can insert reminders"
  on reminders for insert
  with check (is_household_member(household_id) and created_by = auth.uid());

create policy "Members can update reminders"
  on reminders for update
  using (is_household_member(household_id));

create policy "Members can delete reminders"
  on reminders for delete
  using (is_household_member(household_id));

-- RLS Policies: recurring_reminders
create policy "Members can view recurring reminders"
  on recurring_reminders for select
  using (is_household_member(household_id));

create policy "Members can insert recurring reminders"
  on recurring_reminders for insert
  with check (is_household_member(household_id) and created_by = auth.uid());

create policy "Members can update recurring reminders"
  on recurring_reminders for update
  using (is_household_member(household_id));

create policy "Members can delete recurring reminders"
  on recurring_reminders for delete
  using (is_household_member(household_id));

-- RLS Policies: recurring_reminder_completions
create policy "Members can view completions"
  on recurring_reminder_completions for select
  using (
    exists (
      select 1 from recurring_reminders rr
      where rr.id = recurring_reminder_id and is_household_member(rr.household_id)
    )
  );

create policy "Members can insert completions"
  on recurring_reminder_completions for insert
  with check (
    completed_by = auth.uid() and
    exists (
      select 1 from recurring_reminders rr
      where rr.id = recurring_reminder_id and is_household_member(rr.household_id)
    )
  );
