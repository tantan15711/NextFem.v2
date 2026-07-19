-- NextFem - ajustes finales para soporte, hashtags y panel administrativo.
-- Ejecutar en Supabase SQL Editor con rol postgres.

alter table public.products
add column if not exists hashtags text[] not null default '{}';

alter table public.profiles
add column if not exists is_disabled boolean not null default false;

alter table public.product_reports
add column if not exists status text not null default 'pending';

alter table public.product_reports
add column if not exists updated_at timestamptz not null default now();

create index if not exists products_hashtags_gin_idx on public.products using gin (hashtags);
create index if not exists product_reports_status_idx on public.product_reports(status);
create index if not exists profiles_role_idx on public.profiles(role);

drop policy if exists "products admin read all" on public.products;
create policy "products admin read all"
on public.products
for select
using (
  status <> 'deleted'
  or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
      and coalesce(admin_profile.is_disabled, false) = false
  )
);

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update"
on public.profiles
for update
using (
  auth.uid() = id
  or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
      and coalesce(admin_profile.is_disabled, false) = false
  )
)
with check (
  auth.uid() = id
  or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
      and coalesce(admin_profile.is_disabled, false) = false
  )
);

drop policy if exists "products seller update" on public.products;
create policy "products seller update"
on public.products
for update
using (
  auth.uid() = seller_id
  or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
      and coalesce(admin_profile.is_disabled, false) = false
  )
)
with check (
  auth.uid() = seller_id
  or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
      and coalesce(admin_profile.is_disabled, false) = false
  )
);

drop policy if exists "products seller delete" on public.products;
create policy "products seller delete"
on public.products
for delete
using (
  auth.uid() = seller_id
  or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
      and coalesce(admin_profile.is_disabled, false) = false
  )
);

drop policy if exists "reports admin read" on public.product_reports;
create policy "reports admin read"
on public.product_reports
for select
using (
  auth.uid() = reporter_id
  or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
      and coalesce(admin_profile.is_disabled, false) = false
  )
);

drop policy if exists "reports admin update" on public.product_reports;
create policy "reports admin update"
on public.product_reports
for update
using (
  exists (
    select 1 from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
      and coalesce(admin_profile.is_disabled, false) = false
  )
)
with check (
  exists (
    select 1 from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
      and coalesce(admin_profile.is_disabled, false) = false
  )
);

-- Cuenta de soporte solicitada.
-- Primero registra este correo desde la app si aun no existe.
update public.profiles
set role = 'admin',
    is_disabled = false,
    updated_at = now()
where lower(email) = lower('support10team@gmail.com');
