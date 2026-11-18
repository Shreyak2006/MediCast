-- 002_hospital_details.sql: adds the organization details collected by the
-- create-organization form to the hospitals table.
--
-- Run after 001_init.sql. Everything runs in a single transaction, so a
-- failure leaves the database unchanged. Plain ALTER TABLE is used (no IF
-- NOT EXISTS), so re-running fails loudly.

begin;

alter table hospitals
    add column pincode text not null constraint hospitals_pincode_check check (pincode ~ '^[1-9][0-9]{5}$'),
    add column hospital_type text not null constraint hospitals_hospital_type_check check (hospital_type in ('government', 'private', 'clinic'));

commit;
