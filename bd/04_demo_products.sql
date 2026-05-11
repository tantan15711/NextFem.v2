insert into users (name, email, password_hash, phone, city, role, business_name, bio)
select
  'Comunidad NextFem',
  'comunidad@nextfem.local',
  'demo_seed_no_login',
  '555 000 0000',
  'Ciudad de Mexico',
  'seller',
  'Red de emprendedoras',
  'Productos y servicios de ejemplo para inspirar nuevas publicaciones.'
where not exists (
  select 1 from users where email = 'comunidad@nextfem.local'
);

insert into products (user_id, category_id, title, description, price, is_free, image_url, city)
select
  u.id,
  c.id,
  seed.title,
  seed.description,
  seed.price,
  seed.is_free,
  seed.image_url,
  seed.city
from users u
join (
  values
    ('Belleza', 'Kit de cosmetica natural', 'Cremas y balsamos elaborados en casa para cuidado personal.', 180.00, false, '/sample-products/cosmetica-natural.svg', 'Puebla'),
    ('Comida', 'Pan artesanal de temporada', 'Pan casero ideal para desayunos, reuniones y pedidos especiales.', 95.00, false, '/sample-products/pan-artesanal.svg', 'Guadalajara'),
    ('Artesanias', 'Aretes tejidos a mano', 'Joyeria ligera hecha con tecnica artesanal y colores personalizados.', 120.00, false, '/sample-products/joyeria.svg', 'Oaxaca'),
    ('Servicios', 'Asesoria para CV y entrevistas', 'Sesion gratuita para mejorar curriculum y preparar entrevistas.', 0.00, true, '/sample-products/asesoria.svg', 'Ciudad de Mexico'),
    ('Ropa', 'Taller de costura basica', 'Servicio de ajustes, composturas y prendas sencillas sobre pedido.', 150.00, false, '/sample-products/taller-costura.svg', 'Merida'),
    ('Educacion', 'Clase online de ventas por redes', 'Acompañamiento para publicar mejor y responder mensajes de clientas.', 0.00, true, '/sample-products/clase-online.svg', 'En linea'),
    ('Apoyo comunitario', 'Cajas de regalo colaborativas', 'Regalos armados con productos de varias emprendedoras locales.', 260.00, false, '/sample-products/regalos.svg', 'Monterrey'),
    ('Artesanias', 'Plantas decorativas para negocio', 'Macetas pequeñas para decorar mostradores, escritorios o stands.', 75.00, false, '/sample-products/plantas.svg', 'Queretaro')
) as seed(category_name, title, description, price, is_free, image_url, city)
  on true
join categories c on c.name = seed.category_name
where u.email = 'comunidad@nextfem.local'
  and not exists (
    select 1 from products p where p.user_id = u.id and p.title = seed.title
  );
