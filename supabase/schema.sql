-- RatelyPH — Supabase schema
-- Run this whole file once in: Supabase Dashboard > SQL Editor > New query.
-- Safe to re-run (idempotent).
--
-- Model:
--   profiles  = ang laman at itsura ng isang customer page (pangalan, socials, services, theme)
--   nfc_tags  = ang bawat pisikal na NFC card; may sarili itong 5-char code (/k7x2m)
--               at naka-assign sa isang profile. Maraming tag pwede sa iisang profile,
--               at pwedeng i-reassign kahit kailan.
--   admins    = sino ang pwedeng mag-login sa /admin
-- Public (anon) users can ONLY call get_card(code). They cannot read the tables.

-- ───────────────────────────── Tables ─────────────────────────────

create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  handle      text,
  location    text,
  tagline     text,
  initials    text check (initials is null or char_length(initials) <= 3),
  photo_url   text,
  phone       text,
  email       text,
  maps_url    text,
  review_url  text,
  socials     jsonb not null default '[]'::jsonb check (jsonb_typeof(socials)  = 'array'),
  services    jsonb not null default '[]'::jsonb check (jsonb_typeof(services) = 'array'),
  theme       jsonb not null default '{}'::jsonb check (jsonb_typeof(theme)    = 'object'),
  notes       text,                       -- internal, never sent to the public page
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Random 5-character code. No 0/o/1/l/i so it is easy to read and type.
create or replace function public.gen_tag_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  c text;
  i int;
begin
  loop
    c := '';
    for i in 1..5 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when c <> all (array['admin']) and not exists (select 1 from public.nfc_tags where code = c);
  end loop;
  return c;
end;
$$;

create table if not exists public.nfc_tags (
  code          text primary key default public.gen_tag_code(),
  profile_id    uuid references public.profiles(id) on delete set null,
  label         text,                     -- e.g. "Card #1 – Marites", "Stand sa counter"
  active        boolean not null default true,
  scan_count    integer not null default 0,
  last_scan_at  timestamptz,
  created_at    timestamptz not null default now(),
  -- exactly 5 lowercase letters/digits, and reserved words are blocked
  constraint nfc_tags_code_format   check (code ~ '^[a-z0-9]{5}$'),
  constraint nfc_tags_code_reserved check (code <> all (array['admin']))
);

create index if not exists nfc_tags_profile_idx on public.nfc_tags(profile_id);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- keep profiles.updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ───────────────────────────── Security ─────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

alter table public.profiles enable row level security;
alter table public.nfc_tags enable row level security;
alter table public.admins   enable row level security;   -- no policies = nobody can read it directly

drop policy if exists "admin full access" on public.profiles;
create policy "admin full access" on public.profiles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin full access" on public.nfc_tags;
create policy "admin full access" on public.nfc_tags
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────────── Public API ─────────────────────────────
-- The only thing the public site can do: look up one card by its code.
-- Returns:  null                          -> code doesn't exist (or tag is switched off)
--           {"status":"unassigned"}       -> tag exists but no customer is assigned yet
--           {"status":"ok","profile":{…},"theme":{…}}
-- Counts a scan for every successful lookup.

create or replace function public.get_card(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  t public.nfc_tags;
  p public.profiles;
begin
  select * into t from public.nfc_tags where code = lower(trim(p_code));
  if not found or not t.active then
    return null;
  end if;

  if t.profile_id is null then
    return jsonb_build_object('status', 'unassigned');
  end if;

  select * into p from public.profiles where id = t.profile_id;
  if not found then
    return jsonb_build_object('status', 'unassigned');
  end if;

  update public.nfc_tags
     set scan_count = scan_count + 1, last_scan_at = now()
   where code = t.code;

  return jsonb_build_object(
    'status', 'ok',
    'profile', jsonb_build_object(
      'name',       p.name,
      'handle',     p.handle,
      'location',   p.location,
      'tagline',    p.tagline,
      'initials',   p.initials,
      'photo_url',  p.photo_url,
      'phone',      p.phone,
      'email',      p.email,
      'maps_url',   p.maps_url,
      'review_url', p.review_url,
      'socials',    p.socials,
      'services',   p.services
    ),
    'theme', p.theme
  );
end;
$$;

revoke all on function public.get_card(text) from public;
grant execute on function public.get_card(text) to anon, authenticated;

-- ───────────────────────────── Make yourself admin ─────────────────────────────
-- 1. Dashboard > Authentication > Users > "Add user" (email + password, tick "Auto Confirm").
-- 2. Dashboard > Authentication > Providers > Email: turn OFF "Allow new users to sign up"
--    (para walang ibang makagawa ng account).
-- 3. Then run this with YOUR email:
--
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'you@example.com'
-- on conflict do nothing;

-- ───────────────────────────── Optional sample data ─────────────────────────────
-- Uncomment to get one demo customer + one NFC tag you can open right away.
--
-- with p as (
--   insert into public.profiles (name, handle, location, tagline, initials, phone, email, maps_url, review_url, socials, services, theme)
--   values (
--     'Marites Home Bakes', '@maritesbakes', 'Quezon City',
--     'Homemade cakes and pastries, baked fresh to order.', 'MH',
--     '0917 123 4567', 'hello@maritesbakes.example',
--     'https://www.google.com/maps', 'https://www.google.com/',
--     '[{"type":"facebook","label":"Facebook","handle":"@maritesbakes","url":"https://www.facebook.com/"},
--       {"type":"instagram","label":"Instagram","handle":"@maritesbakes","url":"https://www.instagram.com/"},
--       {"type":"tiktok","label":"TikTok","handle":"@maritesbakes","url":"https://www.tiktok.com/"},
--       {"type":"messenger","label":"Messenger","handle":"Message us","url":"https://www.messenger.com/"}]',
--     '[{"title":"Custom cakes","desc":"Birthdays, christenings and weddings. Order 3 days ahead."},
--       {"title":"Cupcake boxes","desc":"Boxes of 6 or 12 for gifts and office treats."},
--       {"title":"Party packages","desc":"Cake, cupcakes and dessert table for small gatherings."}]',
--     '{"scheme":"auto","font":"grotesk","layout":"left","bg":"orbs"}'
--   )
--   returning id
-- )
-- insert into public.nfc_tags (profile_id, label) select id, 'Demo card' from p;
-- select code from public.nfc_tags order by created_at desc limit 1;
