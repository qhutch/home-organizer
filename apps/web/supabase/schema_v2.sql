-- ============================================================
-- SCHÉMA PRINCIPAL - Home Organizer
-- À exécuter dans l'ordre dans l'éditeur SQL de Supabase
-- ============================================================

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

-- User profiles
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

-- Calendar connections (Google Calendar OAuth)
create table calendar_connections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  calendar_id text,
  calendar_name text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Household invites
create table household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table households enable row level security;
alter table household_members enable row level security;
alter table shopping_items enable row level security;
alter table user_profiles enable row level security;
alter table calendar_connections enable row level security;
alter table household_invites enable row level security;

-- ============================================================
-- RLS: households
-- ============================================================

-- SELECT: members only (direct subquery, pas de fonction récursive)
create policy "Members can view their household"
  on households for select
  using (
    exists (
      select 1 from household_members
      where household_id = id and user_id = auth.uid()
    )
  );

create policy "Owner can update household"
  on households for update
  using (
    exists (
      select 1 from household_members
      where household_id = id and user_id = auth.uid() and role = 'owner'
    )
  );

-- INSERT bloqué côté client - on utilise la fonction SECURITY DEFINER ci-dessous

-- ============================================================
-- RLS: household_members
-- ============================================================

-- SELECT simple: chaque membre voit ses propres lignes
-- (évite la récursion infinie)
create policy "Members can view their own membership"
  on household_members for select
  using (user_id = auth.uid());

create policy "User can join household"
  on household_members for insert
  with check (user_id = auth.uid());

create policy "Owner can delete members"
  on household_members for delete
  using (
    exists (
      select 1 from household_members hm
      where hm.household_id = household_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

-- ============================================================
-- RLS: shopping_items
-- ============================================================

create policy "Members can view shopping items"
  on shopping_items for select
  using (
    exists (
      select 1 from household_members
      where household_id = shopping_items.household_id and user_id = auth.uid()
    )
  );

create policy "Members can insert shopping items"
  on shopping_items for insert
  with check (
    exists (
      select 1 from household_members
      where household_id = shopping_items.household_id and user_id = auth.uid()
    )
    and added_by = auth.uid()
  );

create policy "Members can update shopping items"
  on shopping_items for update
  using (
    exists (
      select 1 from household_members
      where household_id = shopping_items.household_id and user_id = auth.uid()
    )
  );

create policy "Members can delete shopping items"
  on shopping_items for delete
  using (
    exists (
      select 1 from household_members
      where household_id = shopping_items.household_id and user_id = auth.uid()
    )
  );

-- ============================================================
-- RLS: user_profiles
-- ============================================================

create policy "Users can view all profiles"
  on user_profiles for select
  using (true);

create policy "Users can manage their own profile"
  on user_profiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- RLS: calendar_connections
-- ============================================================

create policy "Members can view calendar connections"
  on calendar_connections for select
  using (
    exists (
      select 1 from household_members
      where household_id = calendar_connections.household_id and user_id = auth.uid()
    )
  );

create policy "Members can insert calendar connections"
  on calendar_connections for insert
  with check (
    exists (
      select 1 from household_members
      where household_id = calendar_connections.household_id and user_id = auth.uid()
    )
    and created_by = auth.uid()
  );

create policy "Members can update calendar connections"
  on calendar_connections for update
  using (created_by = auth.uid());

create policy "Members can delete calendar connections"
  on calendar_connections for delete
  using (
    exists (
      select 1 from household_members
      where household_id = calendar_connections.household_id and user_id = auth.uid()
    )
  );

-- ============================================================
-- RLS: household_invites
-- ============================================================

create policy "Members can create invites"
  on household_invites for insert
  with check (
    exists (
      select 1 from household_members
      where household_id = household_invites.household_id and user_id = auth.uid()
    )
    and created_by = auth.uid()
  );

create policy "Anyone can read a valid invite by token"
  on household_invites for select
  using (true);

-- ============================================================
-- FONCTIONS SECURITY DEFINER
-- (contournent le RLS pour les opérations qui en ont besoin)
-- ============================================================

-- Crée un foyer ET ajoute l'utilisateur comme owner en une transaction
create or replace function create_household_for_user(p_name text)
returns void
language plpgsql security definer
as $$
declare
  v_household_id uuid;
begin
  insert into households (name) values (p_name) returning id into v_household_id;
  insert into household_members (household_id, user_id, role)
    values (v_household_id, auth.uid(), 'owner');
end;
$$;

-- Crée ou met à jour le profil utilisateur (appelé à l'inscription)
create or replace function upsert_user_profile(p_display_name text)
returns void
language plpgsql security definer
as $$
begin
  insert into user_profiles (id, display_name, updated_at)
    values (auth.uid(), p_display_name, now())
  on conflict (id) do update
    set display_name = excluded.display_name,
        updated_at = now();
end;
$$;
