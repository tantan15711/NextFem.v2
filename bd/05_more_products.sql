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
    ('Ropa', 'Blusa casual bordada', 'Prenda ligera con detalles artesanales para uso diario.', 210.00, false, '/sample-products/taller-costura.svg', 'Tapachula'),
    ('Comida', 'Galletas decoradas por pedido', 'Paquetes personalizados para cumpleanos, ferias y detalles de negocio.', 130.00, false, '/sample-products/pan-artesanal.svg', 'Toluca'),
    ('Belleza', 'Set de jabones naturales', 'Jabones artesanales con aromas suaves para regalo o uso personal.', 95.00, false, '/sample-products/cosmetica-natural.svg', 'Morelia'),
    ('Servicios', 'Diseno de publicaciones para redes', 'Plantillas sencillas para promocionar productos en Facebook e Instagram.', 180.00, false, '/sample-products/asesoria.svg', 'En linea'),
    ('Educacion', 'Mentoria basica para precios', 'Apoyo gratuito para calcular costos, margen y precio de venta.', 0.00, true, '/sample-products/clase-online.svg', 'En linea'),
    ('Artesanias', 'Pulseras personalizadas', 'Pulseras con colores a eleccion para regalos o eventos.', 65.00, false, '/sample-products/joyeria.svg', 'Pachuca'),
    ('Apoyo comunitario', 'Mesa compartida para bazar', 'Espacio colaborativo para exponer productos en bazares locales.', 0.00, true, '/sample-products/regalos.svg', 'Ciudad de Mexico'),
    ('Ropa', 'Servicio de compostura express', 'Ajustes de bastillas, cierres y prendas sencillas.', 90.00, false, '/sample-products/taller-costura.svg', 'Merida'),
    ('Comida', 'Mermeladas caseras', 'Frascos de mermelada artesanal para desayunos y regalos.', 85.00, false, '/sample-products/pan-artesanal.svg', 'Xalapa'),
    ('Belleza', 'Rutina facial inicial', 'Asesoria sencilla para elegir productos de cuidado personal.', 0.00, true, '/sample-products/cosmetica-natural.svg', 'En linea'),
    ('Servicios', 'Fotografia de producto sencilla', 'Sesiones basicas para mejorar fotos de articulos y catalogos.', 250.00, false, '/sample-products/asesoria.svg', 'Guadalajara'),
    ('Artesanias', 'Macetas pintadas a mano', 'Macetas decorativas para hogar, oficina o emprendimientos.', 110.00, false, '/sample-products/plantas.svg', 'Queretaro')
) as seed(category_name, title, description, price, is_free, image_url, city)
  on true
join categories c on c.name = seed.category_name
where u.email = 'comunidad@nextfem.local'
  and not exists (
    select 1 from products p where p.user_id = u.id and p.title = seed.title
  );
