create table if not exists users (
  id bigserial primary key,
  name varchar(120) not null,
  email varchar(160) not null unique,
  password_hash text not null,
  phone varchar(40),
  city varchar(100),
  role varchar(30) not null default 'seller',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_role_check check (role in ('seller', 'buyer', 'admin'))
);

create table if not exists categories (
  id bigserial primary key,
  name varchar(100) not null unique,
  slug varchar(120) not null unique,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  category_id bigint references categories(id) on delete set null,
  title varchar(160) not null,
  description text not null,
  price numeric(10, 2) not null default 0,
  is_free boolean not null default true,
  image_url text,
  city varchar(100),
  status varchar(30) not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_status_check check (status in ('active', 'paused', 'deleted')),
  constraint products_price_check check (price >= 0)
);

create index if not exists products_category_id_idx on products(category_id);
create index if not exists products_user_id_idx on products(user_id);
create index if not exists products_city_idx on products(city);
create index if not exists products_status_idx on products(status);
