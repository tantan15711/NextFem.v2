alter table users
  add column if not exists business_name varchar(140),
  add column if not exists bio text,
  add column if not exists avatar_url text;

create table if not exists conversations (
  id bigserial primary key,
  product_id bigint not null references products(id) on delete cascade,
  buyer_id bigint not null references users(id) on delete cascade,
  seller_id bigint not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_people_check check (buyer_id <> seller_id),
  constraint conversations_unique_pair unique (product_id, buyer_id, seller_id)
);

create table if not exists messages (
  id bigserial primary key,
  conversation_id bigint not null references conversations(id) on delete cascade,
  sender_id bigint not null references users(id) on delete cascade,
  body text not null,
  encrypted_body text,
  body_iv text,
  body_auth_tag text,
  body_version varchar(40),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table messages
  add column if not exists encrypted_body text,
  add column if not exists body_iv text,
  add column if not exists body_auth_tag text,
  add column if not exists body_version varchar(40),
  add column if not exists read_at timestamptz;

create index if not exists conversations_buyer_id_idx on conversations(buyer_id);
create index if not exists conversations_seller_id_idx on conversations(seller_id);
create index if not exists conversations_product_id_idx on conversations(product_id);
create index if not exists messages_conversation_id_idx on messages(conversation_id);
create index if not exists messages_sender_id_idx on messages(sender_id);
