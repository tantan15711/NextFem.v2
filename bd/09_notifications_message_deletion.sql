alter table messages
  add column if not exists deleted_for_everyone_at timestamptz,
  add column if not exists deleted_for_everyone_by bigint references users(id) on delete set null;

create table if not exists message_deletions (
  message_id bigint not null references messages(id) on delete cascade,
  user_id bigint not null references users(id) on delete cascade,
  deleted_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists notifications (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  actor_id bigint references users(id) on delete set null,
  conversation_id bigint references conversations(id) on delete cascade,
  message_id bigint references messages(id) on delete cascade,
  type varchar(40) not null default 'message',
  title varchar(180) not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists message_deletions_user_id_idx on message_deletions(user_id);
create index if not exists messages_deleted_for_everyone_idx on messages(deleted_for_everyone_at);
create index if not exists notifications_user_unread_idx on notifications(user_id, is_read, created_at desc);
create index if not exists notifications_conversation_idx on notifications(conversation_id);
