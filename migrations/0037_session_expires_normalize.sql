-- Normalize ISO session expiry timestamps for reliable SQLite datetime comparison
UPDATE sessions
SET expires_at = replace(substr(expires_at, 1, 19), 'T', ' ')
WHERE expires_at LIKE '%T%';

UPDATE demo_sessions
SET expires_at = replace(substr(expires_at, 1, 19), 'T', ' ')
WHERE expires_at LIKE '%T%';

UPDATE email_verification_tokens
SET expires_at = replace(substr(expires_at, 1, 19), 'T', ' ')
WHERE expires_at LIKE '%T%';

UPDATE password_reset_tokens
SET expires_at = replace(substr(expires_at, 1, 19), 'T', ' ')
WHERE expires_at LIKE '%T%';

UPDATE mfa_challenges
SET expires_at = replace(substr(expires_at, 1, 19), 'T', ' ')
WHERE expires_at LIKE '%T%';
