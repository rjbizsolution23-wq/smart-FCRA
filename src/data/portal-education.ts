/**
 * Client education tracks — financial literacy → credit expertise → fundability.
 */
export type EducationTrack = 'literacy' | 'credit' | 'fundability' | 'expert';

export type Lesson = {
  id: string;
  track: EducationTrack;
  level: number;
  title: string;
  summary: string;
  content: string;
  objectives?: string[];
  takeaways?: string[];
  practice?: string;
  minutes?: number;
  quiz: { q: string; choices: string[]; answer: number }[];
};

export const EDUCATION_LIBRARY: Lesson[] = [
  {
    id: 'lit-01',
    track: 'literacy',
    level: 1,
    title: 'Money Basics: Income, Expenses, Cash Flow',
    summary: 'Build a simple monthly cash-flow picture.',
    content: `Cash flow = money in − money out. List every paycheck and every bill. Pay yourself first (savings), then essentials, then goals. Fundability starts with predictable cash flow lenders can trust.`,
    quiz: [
      { q: 'Cash flow equals:', choices: ['Assets − liabilities', 'Income − expenses', 'Credit score − utilization', 'Debt × interest'], answer: 1 },
      { q: 'Best first habit:', choices: ['Ignore small bills', 'Track income and expenses', 'Max every card', 'Close old accounts'], answer: 1 },
    ],
  },
  {
    id: 'lit-02',
    track: 'literacy',
    level: 2,
    title: 'Emergency Fund & Budget Buckets',
    summary: 'Protect approvals with a 1–3 month cushion.',
    content: `Aim for $1,000 starter emergency fund, then 1–3 months of essentials. Use buckets: Housing, Transport, Food, Debt, Growth. Lenders stress-test payment shock — cushions reduce risk.`,
    quiz: [
      { q: 'A starter emergency fund target is often:', choices: ['$50', '$1,000', '$50,000', '0'], answer: 1 },
    ],
  },
  {
    id: 'cred-01',
    track: 'credit',
    level: 1,
    title: 'FICO Building Blocks',
    summary: 'Payment history, utilization, age, mix, inquiries.',
    content: `Payment history (~35%) and amounts owed/utilization (~30%) dominate FICO. Keep revolving utilization under 30% (ideally under 10%). Never miss a payment. Authorized-user and installment mix can help when legitimate.`,
    quiz: [
      { q: 'Largest FICO factor typically is:', choices: ['Inquiries', 'Payment history', 'Age of file', 'Credit mix'], answer: 1 },
      { q: 'Ideal revolving utilization is often under:', choices: ['90%', '70%', '30%', '100%'], answer: 2 },
    ],
  },
  {
    id: 'cred-02',
    track: 'credit',
    level: 2,
    title: 'Your FCRA Rights (§1681)',
    summary: 'Accuracy, disputes, and 30-day reinvestigation.',
    content: `Under 15 U.S.C. § 1681i, CRAs generally must complete a reasonable reinvestigation within 30 days. Unverified items must be deleted. Keep certified-mail proof. This is education — not legal advice.`,
    quiz: [
      { q: 'Typical CRA reinvestigation window:', choices: ['7 days', '30 days', '1 year', 'No deadline'], answer: 1 },
    ],
  },
  {
    id: 'fund-01',
    track: 'fundability',
    level: 1,
    title: 'What Lenders Actually Underwrite',
    summary: 'DTI, reserves, tradelines, and profile fit.',
    content: `Approvals hinge on debt-to-income (DTI), stable income, credit depth, and clean recent history. Thin files struggle. Positive rent/utilities reporting and seasoned installment tradelines can deepen a profile when legitimate.`,
    quiz: [
      { q: 'DTI stands for:', choices: ['Debt-to-Income', 'Deposit-to-Interest', 'Default-to-Inquiry', 'Draw-to-Interest'], answer: 0 },
    ],
  },
  {
    id: 'fund-02',
    track: 'fundability',
    level: 2,
    title: 'Mortgage Roadmap Essentials',
    summary: 'Score floors, reserves, and documentation.',
    content: `Conventional often wants mid-600s+ with compensating factors; many programs prefer 680–720+. Gather W-2s/1099s, bank statements, ID, and letter of explanation for derogatories. Season positive payment history 6–12 months before applying.`,
    quiz: [
      { q: 'Before mortgage apply, you should usually:', choices: ['Open 10 new cards', 'Season clean payments & gather docs', 'Close all accounts', 'Max utilization'], answer: 1 },
    ],
  },
  {
    id: 'fund-03',
    track: 'fundability',
    level: 2,
    title: 'Auto Loan Roadmap',
    summary: 'Down payment, term length, and payment fit.',
    content: `Auto approvals weigh score, income, and down payment. Shorter terms cost less interest. Avoid stacking inquiries. Keep DTI healthy so the payment fits.`,
    quiz: [
      { q: 'A healthier auto strategy is usually:', choices: ['0% down + 84 months always', 'Reasonable down payment + affordable term', 'Ignore income', 'Max every card first'], answer: 1 },
    ],
  },
  {
    id: 'exp-01',
    track: 'expert',
    level: 3,
    title: 'Profile Optimization for Approvals',
    summary: 'Sequence: disputes → utilization → positive data → apply.',
    content: `Sequence matters: (1) fix accuracy/disputes, (2) pay revolving balances down, (3) add legitimate positive data (rent reporting / responsible installment), (4) freeze unnecessary inquiries, (5) apply to best-fit products only.`,
    quiz: [
      { q: 'Best sequence starts with:', choices: ['Apply everywhere', 'Fix inaccuracies then utilization', 'Buy AU tradelines blindly', 'Close oldest cards'], answer: 1 },
    ],
  },
  {
    id: 'lit-03',
    track: 'literacy',
    level: 3,
    title: 'Debt Snowball vs Avalanche',
    summary: 'Pick a payoff method that matches cash flow and psychology.',
    content: `Snowball: pay smallest balance first for momentum. Avalanche: pay highest APR first for minimum interest. Both work if you stop adding new debt. Lenders care that revolving utilization drops — not which method you chose. Track minimums on everything; put extra toward your target account.`,
    quiz: [
      { q: 'Avalanche prioritizes:', choices: ['Smallest balance', 'Highest interest rate', 'Oldest account', 'Random order'], answer: 1 },
      { q: 'Both methods require:', choices: ['Closing all cards', 'Paying all minimums on time', 'Skipping payments on small cards', 'New credit cards'], answer: 1 },
    ],
  },
  {
    id: 'cred-03',
    track: 'credit',
    level: 3,
    title: 'Metro 2 & Furnisher Disputes (§623)',
    summary: 'When the CRA reinvestigation fails, go to the source.',
    content: `After a bureau investigation, you may dispute directly with the furnisher under FCRA §1681s-2. Metro 2 is the data format furnishers use — inconsistencies across bureaus can signal reporting errors. Document: account number, balance disputes, date opened, status codes. This lesson is educational — your advisor generates furnisher challenges from your file facts, not blank forms.`,
    quiz: [
      { q: 'Furnisher disputes follow:', choices: ['FDCPA only', 'FCRA §1681s-2', 'CROA §404', 'State usury law'], answer: 1 },
    ],
  },
  {
    id: 'fund-04',
    track: 'fundability',
    level: 3,
    title: 'Business Credit Separation',
    summary: 'Keep consumer cleanup separate from business fundability.',
    content: `Personal credit repair and business credit are different lanes. EIN, business bank account, and vendor net-30 accounts build a business file — not piggybacking on consumer AU tradelines alone. Smart FCRA Readiness cockpit shows deterministic education; it does not promise lending approval.`,
    quiz: [
      { q: 'Business credit typically starts with:', choices: ['Personal AU only', 'EIN + business bank + vendor accounts', 'Closing all personal cards', 'Hard inquiries'], answer: 1 },
    ],
  },
  {
    id: 'comp-01',
    track: 'expert',
    level: 4,
    title: 'CROA, TSR & Your Rights in the Portal',
    summary: 'Why Cancel Services and consents are product features.',
    content: `The Credit Repair Organizations Act requires clear contracts, cancellation rights, and bans advance fees for promised deletions. The Telemarketing Sales Rule adds cooling-off and disclosure requirements. Smart FCRA stores consents with timestamps, blocks marketing when consumer-rights lane is active, and exposes Cancel Services in the portal — not buried in email. You can revoke marketing SMS/email in Privacy & Security without losing case-status messages. Your firm's contract also adds a voluntary six-month billing hold: no invoice or charge for covered credit-repair services until six months after that service is recorded as completed — enforced automatically by the billing engine, not just promised in writing.`,
    quiz: [
      { q: 'CROA requires:', choices: ['Guaranteed deletions', 'Written contract + cancel rights', 'Upfront fees before work', 'No disclosures'], answer: 1 },
      { q: 'Marketing messages require:', choices: ['No consent', 'Separate opt-in per lane', 'Only verbal OK', 'Staff SMS'], answer: 1 },
      { q: 'This contract\'s billing hold after service completion is:', choices: ['Immediate', 'Six months (180 days)', 'One week', 'Not disclosed'], answer: 1 },
    ],
  },
  {
    id: 'comms-01',
    track: 'literacy',
    level: 2,
    title: 'Email, SMS & Communication Preferences',
    summary: 'Three lanes: marketing, transactional, compliance.',
    content: `Your firm sends case updates (transactional), educational newsletters only if you opted in (marketing), and contract/cancel notices on the compliance lane. SMS includes a STOP footer. You control preferences in Portal → Privacy & Security. Staff cannot blast marketing over a consumer-rights message — Smart FCRA enforces lane separation.`,
    quiz: [
      { q: 'Marketing SMS requires:', choices: ['No opt-in', 'Explicit marketing consent', 'Any phone on file', 'Staff discretion only'], answer: 1 },
    ],
  },
  {
    id: 'workflow-01',
    track: 'credit',
    level: 2,
    title: 'How Your Automated Workflows Work',
    summary: 'Welcome series, reminders, and compliance nudges.',
    content: `After intake, your firm may run prebuilt workflows: welcome email, document reminders, investigation clock alerts, and education links. Each step respects your consent lane. Workflows use your firm's brand — not generic Smart FCRA copy. You can opt out of marketing while still receiving case-status updates.`,
    quiz: [
      { q: 'Case-status emails are usually:', choices: ['Marketing lane', 'Transactional lane', 'Spam', 'Optional only'], answer: 1 },
    ],
  },
  {
    id: 'campaign-01',
    track: 'expert',
    level: 3,
    title: 'Compliant Campaigns (What Firms Send)',
    summary: 'Maker-checker approval before any blast goes live.',
    content: `Operators build campaigns from segments (inactive clients, onboarding, clock expiring). Copy QA blocks prohibited guarantees. A second reviewer approves before send. Email uses your letterhead shell; SMS uses your Twilio number with STOP language. This protects consumers and your firm during exams.`,
    quiz: [
      { q: 'Before a marketing blast sends, Smart FCRA requires:', choices: ['Nothing', 'Compliance approval + copy QA', 'Client verbal OK only', 'Auto-send'], answer: 1 },
    ],
  },
  {
    id: 'dispute-01',
    track: 'credit',
    level: 3,
    title: 'Disputes in the Portal (Not Blank Forms)',
    summary: 'Attest facts → staff QA → generated letters.',
    content: `You confirm facts before disputes go out. Letters are generated from your file — account numbers, statutes, and round strategy — not downloaded Word templates. Metro 2 observations stay in REVIEW until staff owns them. Progress shows measured changes, not promised deletions.`,
    quiz: [
      { q: 'Dispute letters in Smart FCRA are:', choices: ['Blank PDF downloads', 'Generated from your file facts', 'Guaranteed deletions', 'Staff free-text only'], answer: 1 },
    ],
  },
  {
    id: 'lit-04',
    track: 'literacy',
    level: 2,
    title: 'Reading a Bank Statement with Your Tutor',
    summary: 'Upload statements so coaching uses your numbers.',
    content: `Your Documents vault accepts bank statements, paystubs, and W-2/1099 text. The system estimates income, outflows, and DTI from what you upload. Your tutor (Alex Rivera) then coaches three actions — never invented balances. Redact full account numbers if you paste text. This is education for fundability, not a lender decision.`,
    objectives: ['Upload or paste a recent statement', 'Know what DTI means', 'Ask the tutor one cash-flow question'],
    takeaways: ['Numbers come from your file', 'DTI is debts ÷ income', 'The tutor will not invent balances'],
    practice: 'Open Documents, choose Bank Statement, paste one month of transactions or upload a PDF with OCR text, then tap Ask tutor.',
    minutes: 8,
    quiz: [
      { q: 'Where should bank statements go?', choices: ['Personal Gmail with SSN', 'Portal Documents vault', 'Public Dropbox', 'SMS to staff'], answer: 1 },
      { q: 'The tutor should:', choices: ['Invent a balance if missing', 'Coach from uploaded numbers', 'Approve a mortgage', 'Guarantee a score'], answer: 1 },
    ],
  },
  {
    id: 'cred-04',
    track: 'credit',
    level: 2,
    title: 'Hard vs Soft Inquiries',
    summary: 'Know which pulls can affect a score.',
    content: `Hard inquiries usually happen when you apply for new credit. Soft inquiries (your own pulls, some pre-screens) typically do not. Rate-shopping similar loans in a short window is often treated more gently than scattering applications all year. Seeing an inquiry is not automatically a FCRA violation.`,
    objectives: ['Tell hard from soft', 'Avoid stacking random applications', 'Review new inquiries in My Credit'],
    takeaways: ['Hard pulls can affect scores for a time', 'Shopping similar loans close together is different from random apps', 'Ask before applying'],
    practice: 'Open My Credit → inquiries. Mark any you do not recognize and message your advisor with facts you personally know.',
    minutes: 6,
    quiz: [
      { q: 'A hard inquiry usually happens when:', choices: ['You check your own report', 'You apply for new credit', 'A friend looks at your score', 'You complete Academy'], answer: 1 },
    ],
  },
  {
    id: 'cred-05',
    track: 'credit',
    level: 3,
    title: 'Credit Freeze & Fraud Alert',
    summary: 'Two different tools — neither deletes accurate accounts.',
    content: `A security freeze restricts most new credit. A fraud alert tells lenders to take extra steps. Unfreezing is required when you actually apply. These tools do not remove accurate negative items. Identity theft still needs your own attestation and supporting reports.`,
    objectives: ['Know freeze vs alert', 'Plan unfreeze before applying', 'Never confuse freeze with deletion'],
    takeaways: ['Freeze ≠ delete', 'You control PIN/unfreeze', 'ID theft is a separate attestation'],
    practice: 'Write down which bureaus you have frozen (if any) in Messages so staff does not assume you can pull new credit tomorrow.',
    minutes: 7,
    quiz: [
      { q: 'A credit freeze:', choices: ['Deletes collections', 'Restricts most new credit', 'Raises FICO 100 points', 'Is the same as a dispute'], answer: 1 },
    ],
  },
  {
    id: 'fund-05',
    track: 'fundability',
    level: 2,
    title: 'DTI in Plain Language',
    summary: 'Debts versus income — what underwriters glance at.',
    content: `Debt-to-income (DTI) is monthly debt payments divided by gross monthly income. Front-end often looks at housing; back-end includes other debts. Uploading statements and paystubs lets the tutor estimate a range. Smart FCRA does not issue loans or pre-approvals.`,
    objectives: ['Compute a rough DTI', 'See why extra cards raise DTI', 'Upload income proof'],
    takeaways: ['DTI is a ratio, not a score', 'Lower is generally easier for approvals', 'Estimates ≠ lender decision'],
    practice: 'Upload a paystub and a bank statement, then ask the tutor: “Walk me through my estimated DTI.”',
    minutes: 8,
    quiz: [
      { q: 'DTI is roughly:', choices: ['Score ÷ inquiries', 'Monthly debts ÷ monthly income', 'Limit × utilization', 'Age of file'], answer: 1 },
    ],
  },
  {
    id: 'rights-01',
    track: 'credit',
    level: 1,
    title: 'FDCPA: Collector Communication Basics',
    summary: 'Validation, cease communication, and keeping records.',
    content: `Collectors generally must provide validation information. You can request it in writing and keep proof. Cease-communication is a different tool from disputing accuracy on a credit report. Neither is a magic delete button. Educational only — not legal advice.`,
    objectives: ['Know validation vs cease', 'Keep copies of letters', 'Use the portal vault'],
    takeaways: ['Write, don’t just call', 'Report disputes and collection rights are related but not identical', 'No guaranteed wipe'],
    practice: 'If a collector contacted you, upload the letter under Documents and describe the facts in Confirm Facts.',
    minutes: 7,
    quiz: [
      { q: 'Asking a collector to validate is:', choices: ['The same as a bureau dispute', 'A written consumer right in many cases', 'A guaranteed deletion', 'Illegal'], answer: 1 },
    ],
  },
  {
    id: 'idtheft-01',
    track: 'expert',
    level: 3,
    title: 'Identity Theft: Your Facts Only',
    summary: 'You describe what happened. Staff and AI do not invent it.',
    content: `Identity-theft disputes require your attestation. Typical supporting items: FTC IdentityTheft.gov report, police report where applicable, and a list of accounts that are not yours. Smart FCRA will not sign an affidavit containing facts you did not supply.`,
    objectives: ['Separate ID theft from “I dislike this account”', 'Gather your own reports', 'Use the identity-theft form only when true'],
    takeaways: ['Consumer supplies facts', 'Separate from normal disputes', 'No invented affidavits'],
    practice: 'If this applies, complete Identity Theft attestation in Confirm Facts and upload your FTC report to the vault.',
    minutes: 8,
    quiz: [
      { q: 'Who must supply identity-theft facts?', choices: ['The AI tutor', 'The consumer', 'The CRO owner automatically', 'The bureau'], answer: 1 },
    ],
  },
  {
    id: 'habit-01',
    track: 'literacy',
    level: 1,
    title: 'The Weekly Money Hour',
    summary: 'A 60-minute ritual that compounds.',
    content: `Pick one hour a week: (1) check portal Messages, (2) pay cards that report soon, (3) one Academy lesson or tutor quiz, (4) journey check-in. Consistency beats intensity. Lenders notice clean recent history more than a heroic weekend.`,
    objectives: ['Schedule a weekly hour', 'Tie it to portal tasks', 'Protect on-time payments'],
    takeaways: ['Ritual > binge', 'Portal is the hub', 'Recent history matters'],
    practice: 'Set a recurring calendar event named Money Hour and complete today’s journey check-in.',
    minutes: 5,
    quiz: [
      { q: 'A weekly money hour should include:', choices: ['Opening 10 new cards', 'On-time payments + one learning action', 'Ignoring the portal', 'Closing oldest accounts'], answer: 1 },
    ],
  },
];

export const TRADELINE_CATALOG = [
  {
    id: 'rent-reporter-primary',
    category: 'rent_reporter',
    name: 'Primary Rent Reporter',
    monthlyFee: 9.95,
    reportsTo: ['Equifax', 'TransUnion'],
    bestFor: ['thin_file', 'mortgage', 'renter'],
    impact: 'Builds payment history from rent — high value for thin files seeking mortgage.',
    url: 'https://www.rentrepayers.com/',
  },
  {
    id: 'rent-reporter-plus',
    category: 'rent_reporter',
    name: 'Tri-Bureau Rent Boost',
    monthlyFee: 14.95,
    reportsTo: ['Equifax', 'Experian', 'TransUnion'],
    bestFor: ['thin_file', 'mortgage', 'auto'],
    impact: 'Stronger visibility when all three bureaus see on-time rent.',
    url: 'https://www.rentrepayers.com/',
  },
  {
    id: 'utility-reporter',
    category: 'alternative_data',
    name: 'Utility & Telecom Reporter',
    monthlyFee: 6.95,
    reportsTo: ['Equifax', 'TransUnion'],
    bestFor: ['thin_file', 'rebuild'],
    impact: 'Adds alternative payment history when revolving history is thin.',
    url: 'https://www.experian.com/consumer-products/credit-boost.html',
  },
  {
    id: 'secured-card-path',
    category: 'revolving',
    name: 'Secured Card Starter Path',
    monthlyFee: 0,
    reportsTo: ['Equifax', 'Experian', 'TransUnion'],
    bestFor: ['rebuild', 'utilization'],
    impact: 'Legitimate revolving tradeline you control — keep utilization under 10%.',
    url: 'https://www.discover.com/credit-cards/secured/',
  },
  {
    id: 'credit-builder-loan',
    category: 'installment',
    name: 'Credit Builder Installment',
    monthlyFee: 25,
    reportsTo: ['Equifax', 'Experian', 'TransUnion'],
    bestFor: ['thin_file', 'mix', 'auto', 'mortgage'],
    impact: 'Adds installment mix lenders like to see alongside revolving.',
    url: 'https://www.self.inc/',
  },
];

export function getLessonById(id: string): Lesson | undefined {
  return EDUCATION_LIBRARY.find((l) => l.id === id);
}

export function recommendTradelines(profile: {
  avgScore: number;
  accountCount: number;
  collectionCount: number;
  goal?: string;
}) {
  const tags = new Set<string>();
  if (profile.avgScore < 640 || profile.accountCount < 3) tags.add('thin_file');
  if (profile.collectionCount > 0 || profile.avgScore < 620) tags.add('rebuild');
  if ((profile.goal || '').includes('mortgage')) tags.add('mortgage');
  if ((profile.goal || '').includes('auto')) tags.add('auto');
  tags.add('utilization');
  tags.add('mix');
  tags.add('renter');

  return TRADELINE_CATALOG.map((t) => {
    const overlap = t.bestFor.filter((b) => tags.has(b)).length;
    const scoreFit = profile.avgScore < 660 && t.category === 'rent_reporter' ? 2 : 0;
    const rank = overlap * 3 + scoreFit + (t.category === 'installment' && profile.accountCount < 4 ? 2 : 0);
    return { ...t, matchScore: rank, recommended: rank >= 3 };
  }).sort((a, b) => b.matchScore - a.matchScore);
}
