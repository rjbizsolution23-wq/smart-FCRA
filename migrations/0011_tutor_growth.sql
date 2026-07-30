-- Tutor growth columns — companion levels up with the client
ALTER TABLE tutor_memory ADD COLUMN level INTEGER DEFAULT 1;
ALTER TABLE tutor_memory ADD COLUMN xp INTEGER DEFAULT 0;
ALTER TABLE tutor_memory ADD COLUMN rank_title TEXT;
ALTER TABLE tutor_memory ADD COLUMN growth_json TEXT;
