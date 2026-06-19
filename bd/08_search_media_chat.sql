create table if not exists product_search_events (
  id bigserial primary key,
  user_id bigint references users(id) on delete set null,
  product_id bigint references products(id) on delete cascade,
  query text,
  event_type varchar(40) not null default 'search',
  created_at timestamptz not null default now(),
  constraint product_search_events_type_check check (
    event_type in ('search', 'view', 'open_image', 'contact', 'similar')
  )
);

alter table messages
  add column if not exists message_type varchar(30) not null default 'text',
  add column if not exists media_url text,
  add column if not exists media_mime varchar(120),
  add column if not exists media_name varchar(180),
  add column if not exists location_lat numeric(10, 7),
  add column if not exists location_lng numeric(10, 7),
  add column if not exists location_label text,
  add column if not exists location_live boolean not null default false,
  add column if not exists location_expires_at timestamptz;

alter table messages
  drop constraint if exists messages_type_check;

alter table messages
  add constraint messages_type_check check (
    message_type in ('text', 'image', 'video', 'audio', 'file', 'location')
  );

create index if not exists product_search_events_product_id_idx on product_search_events(product_id);
create index if not exists product_search_events_query_idx on product_search_events(query);
create index if not exists product_search_events_created_at_idx on product_search_events(created_at);
create index if not exists messages_message_type_idx on messages(message_type);
