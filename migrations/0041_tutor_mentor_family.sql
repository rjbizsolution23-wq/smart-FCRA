-- Client tutor "mentor family" — lets a client pick a topic-specialist
-- persona (Maya Chen: accuracy/disputes, Jordan Blake: funding readiness)
-- while keeping the SAME shared tutor-growth profile (level/XP/rank) as
-- the default generalist Alex Rivera. Only tracks the client's last
-- selected persona; growth stays on the existing tutor_memory row.
ALTER TABLE tutor_memory ADD COLUMN active_mentor_id TEXT DEFAULT 'personal-finance-tutor';
