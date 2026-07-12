-- NextFem con Supabase
-- Ejecuta este archivo en Supabase SQL Editor.
-- Requisitos en Supabase:
-- 1. Authentication > Providers > Email habilitado.
-- 2. Storage: crea buckets publicos llamados nextfem-products, nextfem-avatars y nextfem-chat.
-- 3. Database > Replication: activa realtime para conversations, messages y notifications.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  business_name text,
  phone text,
  city text,
  bio text,
  avatar_url text,
  role text not null default 'seller' check (role in ('seller', 'buyer', 'admin')),
  sales_count integer not null default 0 check (sales_count >= 0),
  completed_all_courses boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id bigserial primary key,
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id bigserial primary key,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  category_id bigint references public.categories(id) on delete set null,
  title text not null,
  description text not null,
  price numeric(10, 2) not null default 0 check (price >= 0),
  is_free boolean not null default false,
  image_url text,
  city text,
  status text not null default 'active' check (status in ('active', 'paused', 'sold', 'deleted')),
  published_at timestamptz not null default now(),
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_media (
  id bigserial primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  mime_type text,
  name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.seller_reviews (
  id bigserial primary key,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  rating numeric(2, 1) not null check (rating >= 0.5 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.product_reports (
  id bigserial primary key,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  reason text not null,
  details text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  details text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.seller_followers (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, seller_id),
  check (follower_id <> seller_id)
);

create table if not exists public.course_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_url text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, course_url)
);

create table if not exists public.conversations (
  id bigserial primary key,
  product_id bigint references public.products(id) on delete set null,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, buyer_id, seller_id),
  check (buyer_id <> seller_id)
);

create table if not exists public.messages (
  id bigserial primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  message_type text not null default 'text' check (message_type in ('text', 'image', 'video', 'audio', 'file', 'location')),
  media_url text,
  media_mime text,
  media_name text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  location_label text,
  location_mode text check (location_mode in ('fixed', 'realtime')),
  read_at timestamptz,
  is_deleted_for_everyone boolean not null default false,
  deleted_for_everyone_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.message_deletions (
  message_id bigint not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  deleted_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  product_id bigint references public.products(id) on delete cascade,
  conversation_id bigint references public.conversations(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.product_events (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete set null,
  product_id bigint references public.products(id) on delete cascade,
  query text,
  event_type text not null default 'view',
  created_at timestamptz not null default now()
);

create index if not exists products_published_at_idx on public.products(published_at desc);
create index if not exists products_status_idx on public.products(status);
create index if not exists products_seller_id_idx on public.products(seller_id);
create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists favorites_product_id_idx on public.favorites(product_id);
create index if not exists seller_reviews_seller_id_idx on public.seller_reviews(seller_id);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id, created_at);
create index if not exists notifications_user_id_idx on public.notifications(user_id, is_read, created_at desc);
create index if not exists seller_followers_seller_id_idx on public.seller_followers(seller_id);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_media enable row level security;
alter table public.favorites enable row level security;
alter table public.seller_reviews enable row level security;
alter table public.product_reports enable row level security;
alter table public.user_blocks enable row level security;
alter table public.seller_followers enable row level security;
alter table public.course_progress enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_deletions enable row level security;
alter table public.notifications enable row level security;
alter table public.product_events enable row level security;

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select using (true);
drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "categories readable" on public.categories;
create policy "categories readable" on public.categories for select using (true);

drop policy if exists "products readable active" on public.products;
create policy "products readable active" on public.products for select using (status <> 'deleted');
drop policy if exists "products seller insert" on public.products;
create policy "products seller insert" on public.products for insert with check (auth.uid() = seller_id);
drop policy if exists "products seller update" on public.products;
create policy "products seller update" on public.products for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
drop policy if exists "products seller delete" on public.products;
create policy "products seller delete" on public.products for delete using (auth.uid() = seller_id);

drop policy if exists "media readable" on public.product_media;
create policy "media readable" on public.product_media for select using (true);
drop policy if exists "media product owner insert" on public.product_media;
create policy "media product owner insert" on public.product_media for insert with check (
  exists (select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid())
);
drop policy if exists "media product owner delete" on public.product_media;
create policy "media product owner delete" on public.product_media for delete using (
  exists (select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid())
);

drop policy if exists "favorites own read" on public.favorites;
create policy "favorites own read" on public.favorites for select using (auth.uid() = user_id);
drop policy if exists "favorites own insert" on public.favorites;
create policy "favorites own insert" on public.favorites for insert with check (auth.uid() = user_id);
drop policy if exists "favorites own delete" on public.favorites;
create policy "favorites own delete" on public.favorites for delete using (auth.uid() = user_id);

drop policy if exists "reviews readable" on public.seller_reviews;
create policy "reviews readable" on public.seller_reviews for select using (true);
drop policy if exists "reviews auth insert" on public.seller_reviews;
create policy "reviews auth insert" on public.seller_reviews for insert with check (auth.uid() = reviewer_id and auth.uid() <> seller_id);

drop policy if exists "reports auth insert" on public.product_reports;
create policy "reports auth insert" on public.product_reports for insert with check (auth.uid() = reporter_id);

drop policy if exists "blocks own" on public.user_blocks;
create policy "blocks own" on public.user_blocks for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

drop policy if exists "followers own read" on public.seller_followers;
create policy "followers own read" on public.seller_followers for select using (auth.uid() = follower_id or auth.uid() = seller_id);
drop policy if exists "followers own insert" on public.seller_followers;
create policy "followers own insert" on public.seller_followers for insert with check (auth.uid() = follower_id);
drop policy if exists "followers own delete" on public.seller_followers;
create policy "followers own delete" on public.seller_followers for delete using (auth.uid() = follower_id);

drop policy if exists "course progress own" on public.course_progress;
create policy "course progress own" on public.course_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "conversations participant" on public.conversations;
create policy "conversations participant" on public.conversations for select using (auth.uid() in (buyer_id, seller_id));
drop policy if exists "conversations buyer insert" on public.conversations;
create policy "conversations buyer insert" on public.conversations for insert with check (auth.uid() = buyer_id);
drop policy if exists "conversations participant update" on public.conversations;
create policy "conversations participant update" on public.conversations for update using (auth.uid() in (buyer_id, seller_id));

drop policy if exists "messages participant read" on public.messages;
create policy "messages participant read" on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id))
);
drop policy if exists "messages participant insert" on public.messages;
create policy "messages participant insert" on public.messages for insert with check (
  auth.uid() = sender_id and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id))
);
drop policy if exists "messages participant update" on public.messages;
create policy "messages participant update" on public.messages for update using (
  exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id))
);

drop policy if exists "message deletions own" on public.message_deletions;
create policy "message deletions own" on public.message_deletions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notifications own" on public.notifications;
drop policy if exists "notifications own select" on public.notifications;
create policy "notifications own select" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "notifications authenticated insert" on public.notifications;
create policy "notifications authenticated insert" on public.notifications for insert with check (
  auth.uid() is not null and (actor_id = auth.uid() or actor_id is null)
);

drop policy if exists "events auth insert" on public.product_events;
create policy "events auth insert" on public.product_events for insert with check (auth.uid() = user_id or user_id is null);
drop policy if exists "events own read" on public.product_events;
create policy "events own read" on public.product_events for select using (true);

insert into public.categories (name, slug) values
  ('Ropa', 'ropa'),
  ('Comida', 'comida'),
  ('Servicios', 'servicios'),
  ('Artesanias', 'artesanias'),
  ('Belleza', 'belleza'),
  ('Educacion', 'educacion'),
  ('Apoyo comunitario', 'apoyo-comunitario'),
  ('Electrónica', 'electronica'),
  ('Electrodomésticos', 'electrodomesticos')
on conflict (slug) do nothing;
