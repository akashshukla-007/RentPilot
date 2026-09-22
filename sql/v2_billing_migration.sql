-- RentPilot V2 billing migration
-- Run this in Supabase SQL Editor after the original schema.
-- It preserves existing data and adds the fields needed for meter-based billing.

alter table if exists bills add column if not exists previous_reading numeric default 0;
alter table if exists bills add column if not exists current_reading numeric default 0;
alter table if exists bills add column if not exists units_consumed numeric default 0;
alter table if exists bills add column if not exists electricity_amount numeric default 0;
alter table if exists bills add column if not exists total_amount numeric default 0;
alter table if exists bills add column if not exists total_due numeric default 0;
alter table if exists bills add column if not exists status text default 'due';

-- Helpful index for latest reading lookup.
create index if not exists bills_owner_flat_month_idx on bills(owner_id, flat_id, month desc);

-- Backfill total_due for existing bills where possible.
update bills
set total_due = coalesce(total_amount,0)
where total_due is null;

-- IMPORTANT:
-- Your existing create_monthly_bill RPC remains the source of truth for bill creation.
-- The V2 frontend calculates and displays the expected amount before submission,
-- while the RPC should calculate previous_reading, units_consumed,
-- electricity_amount and total_amount using the flat's electricity_rate.
