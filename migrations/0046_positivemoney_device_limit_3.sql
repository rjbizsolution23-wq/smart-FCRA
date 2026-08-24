-- Raise Positive Money Financial Services' device-lock limit from 1 to 3
-- concurrent devices, per owner instruction. This is a per-tenant setting
-- (organizations.settings.device_lock) — each org keeps its own value;
-- only the platform owner can change any org's value (see
-- PUT /api/team/devices/policy, gated by isPlatformOwnerUser in src/index.tsx).
--
-- Already applied live in production directly via the API on 2026-08-24
-- (before this migration existed) so this is idempotent / for fresh
-- deploys, local dev seeding, and to keep migration history accurate.

UPDATE organizations
SET settings = json_set(settings, '$.device_lock', json('{"enabled":true,"maxDevices":3}'))
WHERE id = 'org_mt3tnhq0csxj74af';
