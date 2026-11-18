-- 002_hospital_details.down.sql: reverses 002_hospital_details.sql.
-- Drops the pincode and hospital_type columns (and their check constraints)
-- from hospitals. Drops nothing else.
--
-- How to run: in pgAdmin, connect to the Medicast database, open the Query Tool,
-- paste this file, and execute it. Everything runs in a single transaction, so
-- a failure leaves the database unchanged. Plain DROP statements are used (no
-- IF EXISTS), so re-running fails loudly.

begin;

alter table hospitals
    drop column hospital_type,
    drop column pincode;

commit;
