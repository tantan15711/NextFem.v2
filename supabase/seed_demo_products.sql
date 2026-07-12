-- Productos demo para NextFem con Supabase.
-- Ejecuta este archivo en Supabase SQL Editor despues de schema.sql.

do $$
declare
  demo_user_id uuid;
begin
  select id
  into demo_user_id
  from auth.users
  where email = 'demo.vendedora.nextfem@gmail.com'
  limit 1;

  if demo_user_id is null then
    demo_user_id := '11111111-1111-4111-8111-111111111111';

    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    values (
      demo_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'demo.vendedora.nextfem@gmail.com',
      crypt('NextFemDemo123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Comunidad NextFem","business_name":"Demo Vendedora"}'::jsonb,
      false,
      '',
      '',
      '',
      ''
    );
  end if;

  insert into public.profiles (
    id,
    email,
    name,
    business_name,
    phone,
    city,
    bio,
    role
  )
  values (
    demo_user_id,
    'demo.vendedora.nextfem@gmail.com',
    'Comunidad NextFem',
    'Demo Vendedora',
    '962 000 0000',
    'Tapachula',
    'Cuenta demo para mostrar productos iniciales de NextFem.',
    'seller'
  )
  on conflict (id) do update set
    name = excluded.name,
    business_name = excluded.business_name,
    phone = excluded.phone,
    city = excluded.city,
    bio = excluded.bio;
end $$;

with demo_products(title, description, price, city, slug, image_url) as (
  values
    ('Blusa bordada artesanal', 'Blusa hecha a mano con detalles bordados, fresca y elegante para uso diario.', 280, 'Tapachula', 'ropa', '/sample-products/taller-costura.svg'),
    ('Pan artesanal dulce', 'Pan de temporada elaborado en casa, ideal para reuniones y pedidos por encargo.', 85, 'Tapachula', 'comida', '/sample-products/pan-artesanal.svg'),
    ('Pulsera de cuentas naturales', 'Accesorio artesanal con colores suaves, perfecto para regalo.', 120, 'Tuxtla Gutierrez', 'artesanias', '/sample-products/joyeria.svg'),
    ('Cosmetica natural de cuidado facial', 'Kit basico de cuidado con ingredientes naturales para rutina diaria.', 190, 'San Cristobal', 'belleza', '/sample-products/cosmetica-natural.svg'),
    ('Asesoria para emprendedoras', 'Sesion de orientacion para organizar precios, catalogo y primeras ventas.', 0, 'En linea', 'servicios', '/sample-products/asesoria.svg'),
    ('Clase online de redes sociales', 'Aprende a crear publicaciones claras para promocionar tu negocio.', 150, 'En linea', 'educacion', '/sample-products/clase-online.svg'),
    ('Regalos personalizados', 'Detalles personalizados para eventos, cumpleaños y agradecimientos.', 210, 'Tapachula', 'artesanias', '/sample-products/regalos.svg'),
    ('Plantas decorativas', 'Plantas pequenas para decorar casa, negocio o escritorio.', 95, 'Tuxtla Gutierrez', 'apoyo-comunitario', '/sample-products/plantas.svg'),
    ('Aretes dorados hechos a mano', 'Aretes ligeros con acabado dorado para combinar con ropa casual o elegante.', 135, 'Tapachula', 'artesanias', '/sample-products/joyeria.svg'),
    ('Taller de costura basica', 'Clase para aprender ajustes simples, dobladillos y composturas para iniciar un servicio local.', 180, 'En linea', 'educacion', '/sample-products/taller-costura.svg'),
    ('Kit de cafe molido local', 'Cafe molido de origen local en presentacion para regalo o consumo diario.', 140, 'Tapachula', 'comida', '/sample-products/pan-artesanal.svg'),
    ('Paquete de plantas para escritorio', 'Tres plantas pequenas faciles de cuidar para decorar espacios de trabajo.', 160, 'Tuxtla Gutierrez', 'apoyo-comunitario', '/sample-products/plantas.svg')
),
inserted as (
  insert into public.products (
    seller_id,
    category_id,
    title,
    description,
    price,
    is_free,
    city,
    status,
    image_url,
    published_at
  )
  select
    (select id from auth.users where email = 'demo.vendedora.nextfem@gmail.com' limit 1),
    c.id,
    dp.title,
    dp.description,
    dp.price,
    dp.price = 0,
    dp.city,
    'active',
    dp.image_url,
    now()
  from demo_products dp
  left join public.categories c on c.slug = dp.slug
  where not exists (
    select 1 from public.products p where p.title = dp.title
  )
  returning id, title, image_url
)
insert into public.product_media (
  product_id,
  url,
  media_type,
  mime_type,
  name,
  sort_order
)
select
  id,
  image_url,
  'image',
  'image/svg+xml',
  title,
  0
from inserted
on conflict do nothing;
