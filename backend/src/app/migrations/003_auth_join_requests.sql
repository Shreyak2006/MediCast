-- 003_auth_join_requests.sql: schema changes needed by the backend-backed
-- authentication, organization, and join-request flows.
--
-- Run after 001_init.sql and 002_hospital_details.sql. Everything runs in a
-- single transaction, so a failure leaves the database unchanged.
--
-- 1. users.hospital_id becomes nullable: an account is created at signup,
--    before the user creates or joins an organization.
-- 2. sessions stores opaque bearer tokens issued at login/signup.
-- 3. join_requests records requests to join a hospital until an admin resolves
--    them. Only one pending request per (hospital, user) is allowed.

begin;

alter table users
    alter column hospital_id drop not null;

create table sessions (
    token text primary key,
    user_id integer not null references users (id) on delete cascade,
    created_at timestamptz not null default now()
);

create index sessions_user_id_idx on sessions (user_id);

create table join_requests (
    id integer generated always as identity primary key,
    hospital_id integer not null references hospitals (id) on delete cascade,
    user_id integer not null references users (id) on delete cascade,
    status text not null default 'pending' constraint join_requests_status_check check (status in ('pending', 'approved', 'rejected')),
    created_at timestamptz not null default now(),
    resolved_at timestamptz
);

create unique index join_requests_pending_unique_idx
    on join_requests (hospital_id, user_id)
    where status = 'pending';

create index join_requests_hospital_status_idx
    on join_requests (hospital_id, status);

commit;
