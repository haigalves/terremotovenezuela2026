-- Run this in the Supabase SQL editor for a new project.

create extension if not exists "pgcrypto";

create table if not exists check_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  person_name text not null check (char_length(trim(person_name)) >= 2),
  last_seen_area text not null check (char_length(trim(last_seen_area)) >= 2),
  description text,
  contact_info text not null check (char_length(trim(contact_info)) >= 3),
  status text not null default 'pending'
    check (status in ('pending', 'being_checked', 'found', 'not_found')),
  approved boolean not null default false
);

create table if not exists verified_situations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  area_name text not null check (char_length(trim(area_name)) >= 2),
  title text not null check (char_length(trim(title)) >= 3),
  description text,
  video_url text not null,
  source_url text,
  situation_type text not null default 'damage'
    check (situation_type in ('damage', 'rescue', 'evacuation', 'infrastructure', 'other')),
  approved boolean not null default false
);

create index if not exists check_requests_created_at_idx on check_requests (created_at desc);
create index if not exists check_requests_approved_idx on check_requests (approved, created_at desc);
create index if not exists verified_situations_created_at_idx on verified_situations (created_at desc);
create index if not exists verified_situations_approved_idx on verified_situations (approved, created_at desc);

alter table check_requests enable row level security;
alter table verified_situations enable row level security;

drop policy if exists "public read approved check_requests" on check_requests;
create policy "public read approved check_requests"
  on check_requests for select using (approved = true);

drop policy if exists "public insert pending check_requests" on check_requests;
create policy "public insert pending check_requests"
  on check_requests for insert with check (approved = false);

drop policy if exists "public read approved verified_situations" on verified_situations;
create policy "public read approved verified_situations"
  on verified_situations for select using (approved = true);

drop policy if exists "public insert pending verified_situations" on verified_situations;
create policy "public insert pending verified_situations"
  on verified_situations for insert with check (approved = false);
