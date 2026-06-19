create table if not exists user_blocks (
  blocker_id bigint not null references users(id) on delete cascade,
  blocked_id bigint not null references users(id) on delete cascade,
  reason varchar(80) not null default 'seguridad',
  details text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self_check check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_id_idx on user_blocks(blocked_id);
