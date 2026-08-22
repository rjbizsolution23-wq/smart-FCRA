-- Device/session lock — "no password sharing" enforcement.
-- Default OFF for every existing tenant (zero behavior change platform-wide).
-- Org admins opt in per-org via organizations.settings.device_lock = {enabled, maxDevices}.
-- Positive Money is turned ON below per owner instruction:
--   "I only want one login at a time ... they have to pay for extra users
--    ... I'll flip the switch in my admin panel and let them have multiple locations."

ALTER TABLE sessions ADD COLUMN device_id TEXT;
ALTER TABLE sessions ADD COLUMN device_label TEXT;
CREATE INDEX IF NOT EXISTS idx_sessions_user_device ON sessions(user_id, device_id);

-- Admin-triggered account pause/lockout (distinct from org-level `suspended` and from
-- is_active/email-verification). Locked user cannot log in or use an existing session
-- until an admin clears locked_at via the Security & Devices admin panel.
ALTER TABLE users ADD COLUMN locked_at TEXT;
ALTER TABLE users ADD COLUMN locked_reason TEXT;

-- Turn ON device lock for Positive Money Financial Services: 1 concurrent device per
-- user by default. Admin can raise maxDevices or disable in Settings -> Security & Devices.
UPDATE organizations
SET settings = json_set(settings, '$.device_lock', json('{"enabled":true,"maxDevices":1}'))
WHERE id = 'org_mt3tnhq0csxj74af';
