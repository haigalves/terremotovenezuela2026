-- Run if you already created tables without the approved column.

alter table check_requests
  add column if not exists approved boolean not null default false;

alter table verified_situations
  add column if not exists approved boolean not null default false;

create index if not exists check_requests_approved_idx on check_requests (approved, created_at desc);
create index if not exists verified_situations_approved_idx on verified_situations (approved, created_at desc);

drop policy if exists "public read check_requests" on check_requests;
drop policy if exists "public read approved check_requests" on check_requests;
create policy "public read approved check_requests"
  on check_requests for select using (approved = true);

drop policy if exists "public insert check_requests" on check_requests;
drop policy if exists "public insert pending check_requests" on check_requests;
create policy "public insert pending check_requests"
  on check_requests for insert with check (approved = false);

drop policy if exists "public read verified_situations" on verified_situations;
drop policy if exists "public read approved verified_situations" on verified_situations;
create policy "public read approved verified_situations"
  on verified_situations for select using (approved = true);

drop policy if exists "public insert verified_situations" on verified_situations;
drop policy if exists "public insert pending verified_situations" on verified_situations;
create policy "public insert pending verified_situations"
  on verified_situations for insert with check (approved = false);
