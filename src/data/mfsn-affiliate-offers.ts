/**
 * Rick Jefferson / RJ Business Solutions — MyFreeScoreNow affiliate offers.
 * Only members enrolled under these links are accepted for public signup / report pull.
 * Affiliate ID suffix: A8289
 */

export const MFSN_AFFILIATE_ID = 'A8289';

export type MfsnAffiliateOffer = {
  code: string;
  enrollUrl: string;
  price: number;
  trialDays: number;
  monthlyCommission: number;
  /** Partner payout share shown in MFSN portal (when different from monthlyCommission). */
  commissionNote?: string;
  billing: 'monthly';
  label: string;
  recommended?: boolean;
};

/** Canonical allowed enroll offers — public signup must pick one of these codes. */
export const MFSN_AFFILIATE_OFFERS: MfsnAffiliateOffer[] = [
  {
    code: 'B01A8289',
    enrollUrl: 'https://app.myfreescorenow.com/enroll/B01A8289',
    price: 29.9,
    trialDays: 7,
    monthlyCommission: 12.8,
    commissionNote: '$11/mo plan · $12.80/mo commission',
    billing: 'monthly',
    label: '$29.90 · 7-day trial',
    recommended: true,
  },
  {
    code: 'B02A8289',
    enrollUrl: 'https://app.myfreescorenow.com/enroll/B02A8289',
    price: 29.9,
    trialDays: 0,
    monthlyCommission: 13.8,
    commissionNote: '$12.25/mo plan · $13.80/mo commission',
    billing: 'monthly',
    label: '$29.90 · no trial',
  },
  {
    code: 'B03A8289',
    enrollUrl: 'https://app.myfreescorenow.com/enroll/B03A8289',
    price: 29.9,
    trialDays: 0,
    monthlyCommission: 13.8,
    commissionNote: '$12.25/mo plan · $13.80/mo commission',
    billing: 'monthly',
    label: '$29.90 · no trial (B03)',
  },
  {
    code: 'B04A8289',
    enrollUrl: 'https://app.myfreescorenow.com/enroll/B04A8289',
    price: 29.9,
    trialDays: 7,
    monthlyCommission: 12.8,
    commissionNote: '$11/mo plan · $12.80/mo commission',
    billing: 'monthly',
    label: '$29.90 · 7-day trial (B04)',
  },
  {
    code: 'B05A8289',
    enrollUrl: 'https://app.myfreescorenow.com/enroll/B05A8289',
    price: 24.97,
    trialDays: 7,
    monthlyCommission: 8.9,
    commissionNote: '$7/mo plan · $8.90/mo commission',
    billing: 'monthly',
    label: '$24.97 · 7-day trial',
  },
  {
    code: 'B06A8289',
    enrollUrl: 'https://app.myfreescorenow.com/enroll/B06A8289',
    price: 29.9,
    trialDays: 7,
    monthlyCommission: 12.8,
    commissionNote: '$11/mo plan · $12.80/mo commission',
    billing: 'monthly',
    label: '$29.90 · 7-day trial (B06)',
  },
  {
    code: 'B07A8289',
    enrollUrl: 'https://app.myfreescorenow.com/enroll/B07A8289',
    price: 39.9,
    trialDays: 0,
    monthlyCommission: 20.8,
    commissionNote: '$16/mo plan · $20.80/mo commission',
    billing: 'monthly',
    label: '$39.90 · no trial',
  },
  {
    code: 'C02A8289',
    enrollUrl: 'https://app.myfreescorenow.com/enroll/C02A8289',
    price: 99.95,
    trialDays: 0,
    monthlyCommission: 62.8,
    commissionNote: '$62.80/mo plan · $62.80/mo commission',
    billing: 'monthly',
    label: '$99.95 · premium · no trial',
  },
];

const byCode = new Map(MFSN_AFFILIATE_OFFERS.map((o) => [o.code.toUpperCase(), o]));

export function normalizeAffiliateOfferCode(code: string | null | undefined): string {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function getAffiliateOffer(code: string | null | undefined): MfsnAffiliateOffer | null {
  const n = normalizeAffiliateOfferCode(code);
  return byCode.get(n) || null;
}

export function isAllowedAffiliateOfferCode(code: string | null | undefined): boolean {
  return getAffiliateOffer(code) != null;
}

/** Public-safe offer list (no commission amounts). */
export function listPublicAffiliateOffers(): Array<{
  code: string;
  enrollUrl: string;
  price: number;
  trialDays: number;
  label: string;
  recommended?: boolean;
}> {
  return MFSN_AFFILIATE_OFFERS.map(({ code, enrollUrl, price, trialDays, label, recommended }) => ({
    code,
    enrollUrl,
    price,
    trialDays,
    label,
    recommended,
  }));
}

/** Staff-only catalog including commission. */
export function listStaffAffiliateOffers(): MfsnAffiliateOffer[] {
  return MFSN_AFFILIATE_OFFERS.slice();
}

export function offerBelongsToAffiliate(code: string | null | undefined, affiliateId = MFSN_AFFILIATE_ID): boolean {
  const n = normalizeAffiliateOfferCode(code);
  return n.endsWith(String(affiliateId).toUpperCase()) && isAllowedAffiliateOfferCode(n);
}
