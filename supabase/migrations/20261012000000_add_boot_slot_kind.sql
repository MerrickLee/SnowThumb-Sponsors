-- Extend slot_kind enum to include 'boot'
-- PostgreSQL requirement: new enum values cannot be referenced within the same transaction
-- block in which they are added (error 55P04). This migration must run and commit before
-- any subsequent migrations that insert or query values of kind 'boot'.
alter type public.slot_kind add value if not exists 'boot';
