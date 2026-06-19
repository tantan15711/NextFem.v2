create table if not exists product_favorites (
  user_id bigint not null references users(id) on delete cascade,
  product_id bigint not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists product_reports (
  id bigserial primary key,
  reporter_id bigint references users(id) on delete set null,
  product_id bigint not null references products(id) on delete cascade,
  reason varchar(80) not null,
  details text,
  status varchar(30) not null default 'new',
  created_at timestamptz not null default now(),
  constraint product_reports_status_check check (status in ('new', 'reviewing', 'resolved', 'dismissed'))
);

create table if not exists user_reports (
  id bigserial primary key,
  reporter_id bigint references users(id) on delete set null,
  reported_user_id bigint not null references users(id) on delete cascade,
  reason varchar(80) not null,
  details text,
  status varchar(30) not null default 'new',
  created_at timestamptz not null default now(),
  constraint user_reports_status_check check (status in ('new', 'reviewing', 'resolved', 'dismissed'))
);

create table if not exists seller_reviews (
  id bigserial primary key,
  reviewer_id bigint not null references users(id) on delete cascade,
  seller_id bigint not null references users(id) on delete cascade,
  product_id bigint references products(id) on delete set null,
  rating integer not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_reviews_rating_check check (rating between 1 and 5),
  constraint seller_reviews_people_check check (reviewer_id <> seller_id),
  constraint seller_reviews_unique unique (reviewer_id, seller_id, product_id)
);

create index if not exists product_favorites_product_id_idx on product_favorites(product_id);
create index if not exists product_reports_product_id_idx on product_reports(product_id);
create index if not exists user_reports_reported_user_id_idx on user_reports(reported_user_id);
create index if not exists seller_reviews_seller_id_idx on seller_reviews(seller_id);
