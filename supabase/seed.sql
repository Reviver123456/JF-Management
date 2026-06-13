-- Sample data for local development.
-- The app has no UI to create sites from scratch (sites are provisioned externally),
-- so this seed provides a starting site so the schedule / PM job flows are usable locally.
insert into public.sites (id, site, customer, contact, phone, province, region, owner)
values (
  'SITE-001',
  'Bangkok General Hospital',
  'BGH Co., Ltd.',
  'Somchai',
  '021234567',
  'Bangkok',
  'Central',
  'Field Technician'
)
on conflict (id) do nothing;
