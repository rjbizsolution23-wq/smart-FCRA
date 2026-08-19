/**
 * Production platform guide — mission, full-app tour, and help knowledge for logged-in users.
 */
import { DEMO_TOUR, CLIENT_PORTAL_GUIDE, type DemoTourStep } from './demo-experience';

export const PLATFORM_MISSION = `
Smart FCRA exists so credit repair organizations, advocacy teams, and operators can do excellent work without needing to be experts in every statute, integration, and process on day one.

Our sole purpose: give the credit industry the most compliant tools, the best workflows, and the clearest client experience — so your team can get the job done right.

We love feedback. Tell us what to build next — integrations, automations, education — and we will keep making Smart FCRA the go-to platform for the industry.
`.trim();

export const PLATFORM_GUIDE_KNOWLEDGE = `
You are the Smart FCRA in-app guide for logged-in users (staff or clients).
Mission: most compliant credit-repair / advocacy software — generated letters from file facts, three-lane comms, Compliance OS, Integration Hub, client portal, MFSN, campaigns, Twilio BYOK, BYOK AI or platform AI credits.
Users can always return to Help & Guide for the full tour, product map, and feedback form.
Never give legal advice. Never promise deletions or score lifts.
If asked how to do something, name the sidebar page and 1-2 concrete steps.
`.trim();

const MISSION_STEP: DemoTourStep = {
  id: 'platform-mission',
  title: 'Welcome — why Smart FCRA exists',
  body: 'We built Smart FCRA so operators can run a compliant credit practice without mastering every statute and integration alone. Generated letters from file facts, three-lane email/SMS, Compliance OS workflows, client portal, and Integration Hub — one workspace. You can restart this tour anytime from Help & Guide.',
  page: 'platform-guide',
  whyBuy: 'Your team gets the job done without being experts on day one — the software carries compliance and process.',
};

const HELP_STEP: DemoTourStep = {
  id: 'platform-help-hub',
  title: 'Help & Guide — always here',
  body: 'Open Help & Guide from the sidebar anytime: full guided tour, ask questions, submit improvements or integration requests, and read our mission. We read every submission — Smart FCRA gets better because operators tell us what they need.',
  page: 'platform-guide',
  whyBuy: 'You are never stuck — answers and feedback live inside the product, not a forgotten support inbox.',
};

/** Staff production tour: mission + full product walk + help hub. */
export const STAFF_PLATFORM_GUIDE_TOUR: DemoTourStep[] = [
  MISSION_STEP,
  ...DEMO_TOUR.map((s) => ({
    ...s,
    body: s.body
      .replace(/guided demo — ask the agent anything, or tap Next/gi, 'logged-in workspace — tap Next')
      .replace(/This demo is not a free production tenant/gi, 'Your production organization')
      .replace(/sample Demo Client/gi, 'your clients')
      .replace(/Demo Client/gi, 'a client file'),
  })),
  HELP_STEP,
];

/** Client portal mini-tour. */
export const CLIENT_PLATFORM_GUIDE_TOUR: DemoTourStep[] = [
  {
    id: 'client-mission',
    title: 'Your Smart FCRA portal',
    body: 'This portal is where you see your credit file progress, confirm facts before disputes, read your rights, and message your advisor. Smart FCRA helps your firm stay compliant — you can always open Help & Guide to ask questions or send feedback.',
    page: 'platform-guide',
    whyBuy: 'Transparency and education built in — not a black-box repair shop.',
  },
  ...CLIENT_PORTAL_GUIDE.map((g) => ({
    id: g.id,
    title: g.title,
    body: g.body,
    page: g.page,
    impersonate: true,
    whyBuy: g.whyBuy,
  })),
  HELP_STEP,
];

export const FEEDBACK_CATEGORIES = [
  { id: 'improvement', label: 'Product improvement' },
  { id: 'integration', label: 'New integration' },
  { id: 'workflow', label: 'Workflow / automation' },
  { id: 'education', label: 'Education / Academy' },
  { id: 'compliance', label: 'Compliance feature' },
  { id: 'bug', label: 'Bug or issue' },
  { id: 'other', label: 'Other' },
] as const;
