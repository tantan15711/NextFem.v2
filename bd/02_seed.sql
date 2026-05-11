insert into categories (name, slug)
values
  ('Ropa', 'ropa'),
  ('Comida', 'comida'),
  ('Servicios', 'servicios'),
  ('Artesanias', 'artesanias'),
  ('Belleza', 'belleza'),
  ('Educacion', 'educacion'),
  ('Apoyo comunitario', 'apoyo-comunitario')
on conflict (slug) do nothing;
