alter table seller_reviews
  alter column rating type numeric(2, 1)
  using rating::numeric;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'seller_reviews'
      and constraint_name = 'seller_reviews_rating_check'
  ) then
    alter table seller_reviews drop constraint seller_reviews_rating_check;
  end if;
end $$;

alter table seller_reviews
  add constraint seller_reviews_rating_check
  check (rating >= 0.5 and rating <= 5 and mod((rating * 10)::integer, 5) = 0);
