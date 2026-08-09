/**
 * Tradeline / authorized-user education engine (RJ Business Solutions).
 * Educational content — not legal or scoring guarantees.
 */

export type TradelineLesson = {
  id: string;
  title: string;
  summary: string;
  body: string;
  bullets: string[];
};

export const TRADELINE_EDUCATION: TradelineLesson[] = [
  {
    id: 'tl-what',
    title: 'What is an authorized-user (AU) tradeline?',
    summary: 'A primary cardholder adds you as an authorized user so their revolving account may appear on your credit file.',
    body: `Authorized-user tradelines are revolving credit cards belonging to someone else. When added properly, bureaus may report the account’s history, limit, and balance on your file. RJ Business Solutions sources inventory via TradelineMaster and presents retail pricing with transparent education so you can decide with eyes open.`,
    bullets: [
      'AU is not the same as becoming a joint account holder',
      'Primary must keep the account in good standing',
      'Results vary by bureau and scoring model',
      'Never misrepresent identity or buy “piggyback” products that violate cardholder agreements without disclosure',
    ],
  },
  {
    id: 'tl-how-scores',
    title: 'How AU tradelines can affect scores',
    summary: 'Utilization, average age, and revolving mix are the usual levers — not magic overnight jumps.',
    body: `FICO and VantageScore weigh payment history and amounts owed heavily. A high-limit, low-balance seasoned card can lower aggregate utilization and support average age of accounts. Thin files often see the most noticeable change; thick files with many accounts may see smaller moves.`,
    bullets: [
      'High limit + low reported balance → utilization help',
      'Older open date → age-of-accounts help',
      'Extra revolving line → mix / depth for thin files',
      'Educational impact bands in this app are estimates, not promises',
    ],
  },
  {
    id: 'tl-timing',
    title: 'Statement dates, posting windows, and cycles',
    summary: 'Add before the statement date when possible so the AU posts on the next cycle.',
    body: `Each tradeline has a statement day and a posting window. Inventory also shows “cycles” — how many reporting cycles the spot is reserved for. Plan payment and paperwork so the add happens early enough for the next statement.`,
    bullets: [
      'Statement day = when the card cycles',
      'Posting window = typical bureau update range after statement',
      'Cycles = how long the AU seat is purchased for',
      'Missing the statement can push results 30+ days',
    ],
  },
  {
    id: 'tl-choose',
    title: 'How to choose the best line',
    summary: 'Prioritize age, limit, lender reliability, spots left, and price — matched to your goal.',
    body: `Mortgage-bound clients usually want seasoned (5–10+ year) high-limit lines. Rebuild clients may prioritize limit for utilization. Our matching agent ranks live inventory against your scores, account depth, and goal, then explains why.`,
    bullets: [
      'Age + limit usually beat brand name alone',
      'Confirm spots remaining before sending payment',
      'Compare retail price vs $1,000 of limit (value score)',
      'Stack education + dispute cleanup before applying for new credit',
    ],
  },
  {
    id: 'tl-process',
    title: 'RJ Business Solutions purchase process',
    summary: 'Browse → match → submit client info → pay via tradelines@smartfcra.com → we place the order.',
    body: `1) Browse live inventory (prices include a 12.5% RJ service markup). 2) Use Smart Match against the client’s credit profile. 3) Complete the client + credit-portal credential form. 4) Email confirmation goes to tradelines@smartfcra.com with payment instructions. 5) After funds clear, staff submits the TradelineMaster order and tracks status.`,
    bullets: [
      'Payment & questions: tradelines@smartfcra.com',
      'From address for notices: welcome@tradelines.smartfcra.com',
      'Ledger balance at TradelineMaster must cover wholesale cost to auto-place',
      'Keep ID / agreement docs ready if requested',
    ],
  },
  {
    id: 'tl-risks',
    title: 'Risks, compliance, and expectations',
    summary: 'AU is a tool — not a substitute for FCRA cleanup, on-time payments, or honest applications.',
    body: `Lenders and mortgage underwriters may discount or ignore AU accounts. Card issuers can remove AUs. Buying tradelines does not erase collections or late payments. Pair AU strategy with dispute work, utilization control, and a real income/DTI plan.`,
    bullets: [
      'Disclose AU use honestly when asked by lenders',
      'Do not use stolen identities or synthetic data',
      'Score changes are not guaranteed',
      'This module is educational and operational — not legal advice',
    ],
  },
];

export function listTradelineEducation(): TradelineLesson[] {
  return TRADELINE_EDUCATION.slice();
}

export function getTradelineLesson(id: string): TradelineLesson | undefined {
  return TRADELINE_EDUCATION.find((l) => l.id === id);
}
