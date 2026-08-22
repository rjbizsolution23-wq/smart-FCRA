-- Positive Money Financial Services — remove AI token metering/limits.
-- Owner instruction: "take the model tokens out of this ... I need it all
-- working like the other [tenant]" — i.e. match the 1028wealth comped
-- pattern exactly: unlimited AI usage, no credit-balance gating, billing
-- deferred (comped) until Stripe is wired up for this tenant.

UPDATE org_ai_credits
SET balance = 500000,
    lifetime_purchased = 500000,
    free_ai_override = 1,
    updated_at = datetime('now')
WHERE org_id = 'org_mt3tnhq0csxj74af';

-- Mark org as billing-comped (same flag 1028wealth uses) so any comped-aware
-- billing checks (e.g. mail-postage) treat this tenant the same way until
-- the owner provides a Stripe key and wants metering/billing turned on.
UPDATE organizations
SET settings = json_set(settings, '$.billing_comped', json('true'))
WHERE id = 'org_mt3tnhq0csxj74af';
