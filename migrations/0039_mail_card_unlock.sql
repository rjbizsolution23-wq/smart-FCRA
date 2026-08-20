-- Self-serve card unlock for org mailing (Stripe customer holds the card — never in repo secrets).

ALTER TABLE org_mail_credits ADD COLUMN card_on_file INTEGER NOT NULL DEFAULT 0;
ALTER TABLE org_mail_credits ADD COLUMN mail_unlocked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE org_mail_credits ADD COLUMN default_payment_method_id TEXT;
