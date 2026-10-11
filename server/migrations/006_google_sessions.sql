-- Google OAuth sessions.
-- session_token is an opaque random token stored in a HttpOnly cookie.
-- google_sub is the stable "sub" claim from the ID token; profile data is cached here.
create table if not exists google_sessions (
  session_token  text        primary key,
  google_sub     text        not null,
  email          text        not null,
  name           text        not null,
  picture_url    text,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default now() + interval '30 days'
);

create index if not exists google_sessions_sub_idx on google_sessions (google_sub);
-- Expired sessions can be cleaned up; we prune them lazily on each login.
