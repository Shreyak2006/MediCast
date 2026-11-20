-- 003_auth_join_requests.down.sql: reverses 003_auth_join_requests.sql.
-- Drops sessions and join_requests, then restores the NOT NULL constraint on
-- users.hospital_id. That last step fails if any user still has no hospital,
-- so remove or assign those users before running this file.

begin;

drop index join_requests_hospital_status_idx;
drop index join_requests_pending_unique_idx;
drop table join_requests;

drop index sessions_user_id_idx;
drop table sessions;

alter table users
    alter column hospital_id set not null;

commit;
