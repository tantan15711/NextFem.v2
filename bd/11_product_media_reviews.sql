create table if not exists product_media (
  id bigserial primary key,
  product_id bigint not null references products(id) on delete cascade,
  url text not null,
  media_type varchar(20) not null default 'image',
  mime_type varchar(120),
  file_name varchar(220),
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint product_media_type_check check (media_type in ('image', 'video'))
);

create index if not exists product_media_product_id_idx on product_media(product_id);
create index if not exists product_media_primary_idx on product_media(product_id, is_primary desc, sort_order);

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'seller_reviews'
      and constraint_name = 'seller_reviews_unique'
  ) then
    alter table seller_reviews drop constraint seller_reviews_unique;
  end if;
end $$;

create index if not exists seller_reviews_reviewer_seller_idx
  on seller_reviews(reviewer_id, seller_id, created_at desc);
