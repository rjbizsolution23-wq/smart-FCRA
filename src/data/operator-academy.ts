/**
 * OPERATOR ACADEMY — Systems & Business Courses
 * Real, multi-lesson curriculum (teaching content BEFORE quiz) replacing the
 * previous single-lesson RICK_COURSES stubs. Every course ties back to a
 * capability that already exists inside Smart FCRA (Integration Hub, GHL,
 * MFSN, Twilio, Zapier, Zoom, Compliance OS) so operators learn the platform
 * by learning the underlying skill.
 *
 * Owner: Rick Jefferson | RJ Business Solutions
 * All lessons, "Rick's Rule" callouts, and certificates are authored/branded
 * to Rick Jefferson — consistent with the FCRA knowledge base attribution.
 */

export type AcademyTrack = 'systems' | 'growth' | 'ai' | 'operations';

export type AcademyQuizQuestion = {
  q: string;
  choices: string[];
  answer: number;
};

export type AcademyLesson = {
  id: string;
  title: string;
  /** One-line teaser shown on the lesson list. */
  summary: string;
  /** Real teaching content — read BEFORE the quiz. Multi-paragraph, plain-text (rendered pre-wrap). */
  content: string;
  objectives: string[];
  takeaways: string[];
  practice: string;
  minutes: number;
  ricksRule: string;
  /** Optional: ties the lesson to a real in-app destination the learner can jump to. */
  platformAction?: { label: string; page: string };
  quiz: AcademyQuizQuestion[];
};

export type AcademyCourse = {
  id: string;
  track: AcademyTrack;
  title: string;
  desc: string;
  icon: string;
  badgeId: string;
  lessons: AcademyLesson[];
};

export const ACADEMY_BADGES: Record<string, { label: string; icon: string; description: string }> = {
  'badge-website-systems': { label: 'Site Systems Builder', icon: 'fa-globe', description: 'Completed Website Systems That Convert.' },
  'badge-landing-pages': { label: 'Conversion Copywriter', icon: 'fa-rocket', description: 'Completed Landing Pages That Move People.' },
  'badge-ai-automation': { label: 'Automation Operator', icon: 'fa-cogs', description: 'Completed AI Automation For Operators.' },
  'badge-ai-agents': { label: 'Agent Architect', icon: 'fa-robot', description: 'Completed AI Agent Systems.' },
  'badge-funnels': { label: 'Funnel Engineer', icon: 'fa-funnel-dollar', description: 'Completed Funnel Building From Zero.' },
  'badge-crm': { label: 'Pipeline Pro', icon: 'fa-address-card', description: 'Completed CRM And Follow-Up Systems.' },
  'badge-prompting': { label: 'Prompt Craftsman', icon: 'fa-keyboard', description: 'Completed Prompt Engineering For Builders.' },
  'badge-launch': { label: 'Launch Commander', icon: 'fa-file-invoice-dollar', description: 'Completed Digital Product Launch Systems.' },
  'badge-local': { label: 'Local Growth Strategist', icon: 'fa-map-marked-alt', description: 'Completed Local Business Growth Infrastructure.' },
  'badge-founder-os': { label: 'Founder OS Certified', icon: 'fa-toolbox', description: 'Completed Founder Operating System.' },
  // Cross-course / streak badges
  'badge-first-lesson': { label: 'First Rep', icon: 'fa-seedling', description: 'Completed your first Academy lesson.' },
  'badge-perfect-quiz': { label: 'Sharp Shooter', icon: 'fa-bullseye', description: 'Scored a perfect quiz on the first try.' },
  'badge-streak-3': { label: '3-Day Builder Streak', icon: 'fa-fire', description: 'Completed lessons on 3 different days.' },
  'badge-halfway': { label: 'Halfway Operator', icon: 'fa-flag-checkered', description: 'Completed 5 of the 10 Systems & Business courses.' },
  'badge-all-courses': { label: 'Operator OS Graduate', icon: 'fa-crown', description: 'Completed every Systems & Business course. Authorized by Rick Jefferson.' },
};

export const ACADEMY_COURSES: AcademyCourse[] = [
  // ── COURSE 1 ──────────────────────────────────────────────────
  {
    id: 'course-1',
    track: 'systems',
    title: 'Website Systems That Convert',
    desc: 'Build a clean business website that explains the offer, captures leads, and supports sales.',
    icon: 'fa-globe',
    badgeId: 'badge-website-systems',
    lessons: [
      {
        id: 'c1-l1',
        title: 'The Anatomy of a High-Conversion Offer',
        summary: 'Why a website is a sales machine, not an art project.',
        minutes: 8,
        content: `Most small-business websites fail for one reason: they try to say everything, so they say nothing. A conversion-focused website has a single job — take a visitor who does not know you and move them to ONE clear next action (book a call, start a form, or buy).

Before you touch a page builder, write down: (1) who lands here, (2) what pain they have right now, and (3) the one action you want them to take. Every section on the page should serve that action. If a section does not move the visitor closer to the action, cut it.

This is the same discipline Smart FCRA uses on its own tenant portals: the Tenant Blueprint auto-generates a portal with one welcome message, one primary color, and one clear "next action" for every new client — no clutter, no guessing.`,
        objectives: [
          'State the single conversion outcome for a page before designing it',
          'Identify and remove sections that do not serve that outcome',
          'Map a clear, linear visitor flow from headline to action',
        ],
        takeaways: [
          'One page, one outcome — mixed goals split attention and kill conversion',
          'Cut before you add — most pages convert better with less',
          'Every visitor should always know what to do next',
        ],
        practice: 'Write the single sentence: "This page exists so that a [visitor type] will [one action]." Then list every section on your current homepage and mark which ones do NOT support that sentence.',
        ricksRule: 'The website is not an art project. It is a sales machine.',
        quiz: [
          { q: 'What is the primary objective of a conversion-focused website?', choices: ['Expressive artistic freedom', 'To guide the visitor to a single, high-value business action', 'To maximize total page size and scripts'], answer: 1 },
          { q: 'Before designing a page, you should first define:', choices: ['The color palette', 'The single outcome and who the page is for', 'How many images to use'], answer: 1 },
        ],
      },
      {
        id: 'c1-l2',
        title: 'Navigation and Information Architecture',
        summary: 'Fewer links, clearer paths, higher conversion.',
        minutes: 7,
        content: `Navigation menus are conversion leaks disguised as helpfulness. Every extra link is an exit door. A lead-generation site rarely needs more than: Home, Services/Offer, About, Contact — plus the CTA button.

Strip redundant links (multiple paths to the same page), remove "under construction" pages, and never let the nav out-compete the CTA button visually. The CTA should be the highest-contrast, most obvious clickable element on every page.

For service businesses, add a sticky header CTA ("Book a Free Consult" or "Get Started") so the action is always one click away, no matter how far the visitor scrolls.`,
        objectives: [
          'Strip navigation down to the minimum needed paths',
          'Make the primary CTA the highest-contrast element on the page',
          'Use a sticky header CTA for long pages',
        ],
        takeaways: [
          'Every nav link is a decision point that can lose the visitor',
          'Contrast and repetition drive clicks more than clever copy',
          'Sticky CTAs recover scroll-away visitors',
        ],
        practice: 'Audit your site nav. Remove or merge any item that does not directly support the single conversion outcome from Lesson 1.',
        ricksRule: 'Strip out redundant navigation links — clarity converts, clutter costs.',
        quiz: [
          { q: 'Why is a large navigation menu often a conversion risk?', choices: ['It looks unprofessional', 'Each link is a potential exit from the conversion path', 'It slows down page load only'], answer: 1 },
          { q: 'A sticky header CTA is useful because it:', choices: ['Adds visual noise', 'Keeps the action available no matter how far the visitor scrolls', 'Replaces the need for a homepage'], answer: 1 },
        ],
      },
      {
        id: 'c1-l3',
        title: 'Trust Signals and Social Proof Placement',
        summary: 'Where testimonials, logos, and guarantees actually move the needle.',
        minutes: 7,
        content: `Trust signals work only when placed at the exact moment of hesitation. A testimonial buried at the bottom of the page does nothing — the visitor already left. Put proof immediately after every claim that could trigger doubt.

Three placements matter most: (1) directly under the hero headline (a short trust line: "Trusted by 500+ small businesses"), (2) right before the CTA (a testimonial that addresses the most common objection), and (3) near pricing (a guarantee or risk-reversal statement).

Specificity beats polish. "Sarah cut her dispute response time from 45 to 12 days" builds more trust than a generic five-star badge with no story attached.`,
        objectives: [
          'Place trust signals at moments of buyer hesitation, not just anywhere',
          'Use specific, story-based proof over generic badges',
          'Add a risk-reversal statement near your pricing or CTA',
        ],
        takeaways: [
          'Timing of proof matters more than volume of proof',
          'Specific outcomes beat vague five-star claims',
          'Risk reversal (guarantees) reduces the "what if" objection right before the ask',
        ],
        practice: 'Find your single strongest client story. Rewrite it as a two-sentence specific-outcome testimonial and place it directly above your main CTA.',
        ricksRule: 'Proof placed at the wrong moment is proof wasted.',
        quiz: [
          { q: 'The best place for a testimonial addressing a common objection is:', choices: ['The footer only', 'Right before the CTA it is meant to unblock', 'On a separate, hard-to-find page'], answer: 1 },
          { q: 'Specific, story-based proof generally outperforms:', choices: ['Generic five-star badges with no context', 'Any proof at all', 'Video testimonials'], answer: 0 },
        ],
      },
      {
        id: 'c1-l4',
        title: 'Speed, Mobile, and the First 3 Seconds',
        summary: 'Technical basics that make or break conversion before copy even matters.',
        minutes: 6,
        content: `Over half of small-business site traffic is mobile. If your hero section does not render correctly and load fast on a phone, none of your copywriting work matters — the visitor bounces before reading a word.

Three checks before launch: (1) does the page load in under ~3 seconds on a mobile connection, (2) is the CTA button thumb-reachable without pinch-zooming, (3) does the headline fit on one or two lines on a 375px-wide screen.

Compress images, avoid autoplay video backgrounds on mobile, and always test on a real phone — not just a browser resize.`,
        objectives: [
          'Test real mobile load time and layout before launch',
          'Ensure the primary CTA is thumb-reachable on mobile',
          'Compress images and avoid heavy autoplay assets on mobile',
        ],
        takeaways: [
          'Mobile is the default experience for most visitors, not the edge case',
          'Speed is a conversion factor, not just a technical nice-to-have',
          'Always test on a real device, not just a resized browser window',
        ],
        practice: 'Open your site on your own phone on cellular data (not wifi). Time how long it takes to see the headline and CTA. If it is over 3 seconds, compress your hero image first.',
        ricksRule: 'If it does not work on a phone in three seconds, it does not work.',
        quiz: [
          { q: 'What is the recommended maximum mobile load time before visitors start bouncing?', choices: ['About 3 seconds', '15 seconds', 'There is no meaningful limit'], answer: 0 },
          { q: 'The best way to test mobile experience is to:', choices: ['Resize a desktop browser window', 'Test on a real phone over a real connection', 'Assume desktop testing covers it'], answer: 1 },
        ],
      },
    ],
  },

  // ── COURSE 2 ──────────────────────────────────────────────────
  {
    id: 'course-2',
    track: 'systems',
    title: 'Landing Pages That Move People',
    desc: 'Create focused landing pages with strong messaging, clean CTAs, and no wasted sections.',
    icon: 'fa-rocket',
    badgeId: 'badge-landing-pages',
    lessons: [
      {
        id: 'c2-l1',
        title: 'Headline Formulations That Hold Attention',
        summary: 'Write headlines that state outcome, not features.',
        minutes: 7,
        content: `A landing page headline has one job: tell the right visitor, in under 3 seconds, that this page is for them. Weak headlines describe the company ("Welcome to Acme Credit Solutions"). Strong headlines state a specific, measurable outcome ("Get accurate items removed from your credit file in 30-45 days — or your consult is free").

Structure: [specific outcome] + [for whom] + [what makes it credible/different]. The sub-headline should address the most common hesitation directly — cost, time, or trust.

Test headlines against one question: "If a stranger read only this line, would they know exactly what they get and why they should care?" If not, rewrite it.`,
        objectives: [
          'State a specific, measurable outcome in the main headline',
          'Address the top objection directly in the sub-headline',
          'Avoid company-name-first, feature-first headlines',
        ],
        takeaways: [
          'Outcome-first headlines outperform feature-first or brand-first headlines',
          'The sub-headline is where you kill the #1 objection early',
          'A headline should pass the "stranger test" — instantly clear, no jargon',
        ],
        practice: 'Rewrite your current landing page headline using: [specific outcome] + [for whom] + [credibility marker]. Compare it side by side with the original.',
        ricksRule: 'If the offer is messy, the funnel will expose it.',
        quiz: [
          { q: 'What should be the main focal point of a direct response landing page?', choices: ['A large interactive grid of miscellaneous links', 'The core headline and a singular CTA', 'An elaborate multi-page navigation tree'], answer: 1 },
          { q: 'A strong headline formula generally includes:', choices: ['Company history and founding year', 'A specific outcome, audience, and credibility marker', 'A long list of every feature offered'], answer: 1 },
        ],
      },
      {
        id: 'c2-l2',
        title: 'The Single-CTA Discipline',
        summary: 'One page, one ask — every time.',
        minutes: 6,
        content: `Every additional call-to-action on a landing page dilutes the conversion rate of the primary one. "Book a call" AND "Download our guide" AND "Follow us on social" competing for attention means visitors do none of them well.

Pick ONE primary action per page. If you truly need a secondary path (e.g., "not ready yet? get the free guide"), make it visually and hierarchically secondary — smaller, lower contrast, positioned after the primary CTA has already been offered at least once.

Repeat the primary CTA button 3-4 times down a long page (hero, mid-page after proof, end of page) — but it must always be the SAME action, worded consistently.`,
        objectives: [
          'Commit to one primary CTA per landing page',
          'Subordinate any secondary offer visually and positionally',
          'Repeat the same primary CTA at multiple scroll depths',
        ],
        takeaways: [
          'Competing CTAs reduce total conversions, not increase optionality',
          'Secondary offers should never outrank the primary ask visually',
          'Repetition of one consistent CTA outperforms variety',
        ],
        practice: 'Count every clickable action on your landing page. If you have more than one primary CTA, pick the winner and demote the rest.',
        ricksRule: 'A confused visitor never converts — give them one door, not five.',
        quiz: [
          { q: 'What happens when a landing page has multiple competing primary CTAs?', choices: ['Conversion rate typically improves', 'Visitors are given more choice and convert more', 'Attention splits and overall conversion typically drops'], answer: 2 },
          { q: 'A secondary offer on a landing page should be:', choices: ['Equal in size and prominence to the primary CTA', 'Visually and positionally subordinate to the primary CTA', 'Removed from all pages entirely'], answer: 1 },
        ],
      },
      {
        id: 'c2-l3',
        title: 'Objection-Handling Sections',
        summary: 'Structure the page to answer doubts in the order they arise.',
        minutes: 7,
        content: `Visitors move through a predictable doubt sequence: "Is this for me?" → "Does this actually work?" → "Can I trust this company?" → "Is it worth the cost/effort?" → "What happens after I click?"

Structure your page sections to answer these in order: headline/subhead (for me?), proof/results (does it work?), credibility/about (trust?), pricing/guarantee (worth it?), and a clear "here's what happens next" section right before the final CTA to remove last-click anxiety.

Skipping a step in this sequence — like jumping straight from headline to pricing with no proof — causes silent drop-off you will never see in analytics unless you map the doubt sequence explicitly.`,
        objectives: [
          'Map the standard visitor doubt sequence',
          'Order landing page sections to match that sequence',
          'Add a "what happens next" section before the final CTA',
        ],
        takeaways: [
          'Doubts arrive in a predictable order — design around that order',
          'Skipping proof before pricing causes invisible drop-off',
          'Reducing last-click anxiety with a clear next-step explanation lifts conversion',
        ],
        practice: 'List your page sections top to bottom. Match each one to a doubt in the sequence above. Note any gaps.',
        ricksRule: 'Answer the objection before the visitor has to ask it.',
        quiz: [
          { q: 'Visitors generally move through doubts in which rough order?', choices: ['Cost first, then everything else', 'Fit, proof, trust, cost, then next-step clarity', 'There is no predictable order'], answer: 1 },
          { q: 'A "what happens next" section right before the CTA primarily helps:', choices: ['SEO rankings', 'Reduce last-click anxiety', 'Increase page length for its own sake'], answer: 1 },
        ],
      },
    ],
  },

  // ── COURSE 3 — AI AUTOMATION (grounded in real Integration Hub) ─
  {
    id: 'course-3',
    track: 'ai',
    title: 'AI Automation For Operators',
    desc: 'Use AI to remove repetitive work, route information, and support business execution — using the integrations already inside your platform.',
    icon: 'fa-cogs',
    badgeId: 'badge-ai-automation',
    lessons: [
      {
        id: 'c3-l1',
        title: 'Map the Manual Process Before You Automate It',
        summary: 'Automation amplifies whatever process you feed it — clean it up first.',
        minutes: 7,
        content: `The most common automation mistake is automating a messy process, which just produces mess faster. Before touching any tool, write the manual steps of the process exactly as a human does them today: trigger → decision points → outputs → who gets notified.

Inside Smart FCRA, this is exactly why the Integration Hub (Settings → Integration Hub) separates connections (GHL, MFSN, Twilio) from jobs and events — every automated action traces back to a clean, auditable trigger. You can see this yourself: open Integration Hub and look at "Recent Platform Events" — every automated action logs there.

Only once the manual map is clean should you ask: which step is repetitive, rule-based, and safe to hand to a system?`,
        objectives: [
          'Document a manual process end-to-end before automating it',
          'Identify which steps are repetitive and rule-based vs. judgment-based',
          'Locate the Integration Hub event log to see automation traceability',
        ],
        takeaways: [
          'Automation makes a bad process worse, faster — clean up first',
          'Rule-based, repetitive steps are good automation candidates; judgment calls are not (yet)',
          'Every real automation should leave an auditable trail',
        ],
        practice: 'Pick one repetitive task you do weekly. Write out every step by hand, and mark which steps are pure rule-following vs. which require judgment.',
        platformAction: { label: 'Open Integration Hub', page: 'integration-os' },
        ricksRule: 'Clarity first. Automation second. Scale third.',
        quiz: [
          { q: 'What is the golden rule of workflow automation?', choices: ['Automate everything instantly before documenting', 'Ensure the manual system is clear and clean first', 'Always use the most expensive API available'], answer: 1 },
          { q: 'In Smart FCRA, where can you see a log of automated actions that already ran?', choices: ['Recent Platform Events in Integration Hub', 'There is no such log', 'Only in raw database exports'], answer: 0 },
        ],
      },
      {
        id: 'c3-l2',
        title: 'Connecting Your First Real Integration (GoHighLevel)',
        summary: 'A hands-on walkthrough of a real connection your platform supports today.',
        minutes: 8,
        content: `GoHighLevel (GHL) sync is a real, working integration in this platform — not a mockup. To connect it: go to Settings → "Your GHL & MFSN credentials" and paste in a GHL Private Integration Token (PIT) plus your GHL Location ID. Click "Test GHL connection" before saving anything else — this confirms the token actually authenticates against your location before it is used anywhere else in the system.

Once connected, safe sync fields flow one direction into GHL (contact name, tags, stage) — the platform deliberately blocks sensitive fields (SSNs, full credit file data) from ever leaving to a third-party CRM. You can see exactly what syncs and what is blocked on the Integration Hub GoHighLevel card.

This is the same pattern for every third-party connection on this platform: credentials live encrypted per-organization, a test button confirms the connection before go-live, and a docs card tells you exactly what data does and does not leave the system.`,
        objectives: [
          'Locate and use the GHL PIT + Location ID fields in Settings',
          'Test a connection before relying on it',
          'Understand what data is allowed vs. blocked from syncing to GHL',
        ],
        takeaways: [
          'Always test a new integration connection before building automations on top of it',
          'Sensitive data (SSNs, full report data) is deliberately blocked from third-party CRM sync',
          'The Integration Hub GHL card shows real-time connection status, not a static setting',
        ],
        practice: 'Open Settings → your GHL & MFSN credentials panel. Even without a real GHL account, walk through where you would paste the PIT token and click "Test GHL connection" to see the response.',
        platformAction: { label: 'Open Settings', page: 'settings' },
        ricksRule: 'Test the connection before you trust the automation.',
        quiz: [
          { q: 'What must you do before relying on a new GHL connection?', choices: ['Nothing, connections are always instantly reliable', 'Click "Test GHL connection" to confirm it authenticates', 'Only test it after building 10 automations on top of it'], answer: 1 },
          { q: 'What kind of data is deliberately BLOCKED from syncing to GHL?', choices: ['Contact name and tags', 'Sensitive data like SSNs and full credit file details', 'Pipeline stage'], answer: 1 },
        ],
      },
      {
        id: 'c3-l3',
        title: 'Webhooks and Zapier: Connecting Anything Else',
        summary: 'Use the built-in webhook/API-key system to reach tools with no native integration.',
        minutes: 7,
        content: `Not every tool you use will have a native "Connect" button. That is what the Integration Hub's Zapier/Webhooks panel is for. From Settings → "Lob Mail, Zapier & Webhooks," you can create an API key (scoped read/write/webhooks) and register outbound webhooks that fire on real platform events: client.created, report.imported, letter.sent, ticket.created, complaint.created.

To connect Zapier specifically: create an API key labeled "Zapier production," then either give Zapier that key directly, or register a webhook pointed at your Zapier "Catch Hook" URL and select which events should trigger it. Always click "Test Ping" after setting up a new webhook — this fires a synthetic event so you can confirm Zapier (or Make, or any custom receiver) is actually receiving it before you build downstream steps.

This pattern — typed events, scoped API keys, a test button — is deliberate. It means you never have to guess whether an automation is "probably working."`,
        objectives: [
          'Create a scoped API key for an external automation tool',
          'Register a webhook against a specific, real platform event',
          'Use Test Ping to confirm delivery before building downstream automation',
        ],
        takeaways: [
          'API keys are scoped (read/write/webhooks) — only grant what the integration needs',
          'Webhooks fire on named, real events, not generic "everything"',
          'Test Ping removes the guesswork of "is this actually connected?"',
        ],
        practice: 'In Settings, locate the webhook panel. Note the five event types listed (client.created, report.imported, letter.sent, ticket.created, complaint.created) and pick which one you would use first for a follow-up automation.',
        platformAction: { label: 'Open Settings', page: 'settings' },
        ricksRule: 'An automation you have not tested is a guess wearing a suit.',
        quiz: [
          { q: 'What should you always do right after creating a new webhook?', choices: ['Immediately delete it', 'Click Test Ping to confirm delivery', 'Nothing — webhooks are self-verifying'], answer: 1 },
          { q: 'Which of these is a real, named platform event you can hook into?', choices: ['letter.sent', 'universe.expanded', 'random.thing'], answer: 0 },
        ],
      },
      {
        id: 'c3-l4',
        title: 'Structured Outputs: Making AI Automation Reliable',
        summary: 'Why JSON schemas beat free-text when AI feeds another system.',
        minutes: 6,
        content: `When AI output feeds directly into another automated step (a CRM field, a webhook payload, a database row), free-text responses break things. "The client seems ready, maybe medium risk" cannot be parsed reliably. A structured output like {"readiness": "medium", "confidence": 0.72} can.

The fix: always specify the exact output shape you need, with explicit field names and allowed values, inside the prompt or system instructions. Provide 1-2 example outputs (few-shot) so the model has a concrete pattern to match, and validate the output server-side before it ever reaches a downstream automation step.

This is the same discipline behind every AI feature already in this platform — violation detection, letter drafting, and mentor chat all return structured, validated data, not just prose, before anything gets stored or displayed.`,
        objectives: [
          'Explain why free-text AI output is risky for automated pipelines',
          'Specify explicit output schemas with allowed values in prompts',
          'Add server-side validation before trusting AI output downstream',
        ],
        takeaways: [
          'Free text is for humans; structured data is for machines',
          'Few-shot examples make output format far more consistent',
          'Always validate AI output server-side — never trust it blindly',
        ],
        practice: 'Take one AI prompt you currently use for a business task. Rewrite it to demand a specific JSON shape with named fields and a fixed set of allowed values.',
        ricksRule: 'Structured prompts yield structured outcomes — and structured outcomes are the only ones automation can trust.',
        quiz: [
          { q: 'Why is free-text AI output risky when feeding another automated system?', choices: ['It cannot be parsed reliably by downstream logic', 'It is always factually wrong', 'It takes longer to generate'], answer: 0 },
          { q: 'A good practice before trusting AI output in an automation is to:', choices: ['Skip validation to save time', 'Validate the output server-side against an expected schema', 'Assume the model always returns valid JSON'], answer: 1 },
        ],
      },
    ],
  },

  // ── COURSE 4 — AI AGENT SYSTEMS ──────────────────────────────
  {
    id: 'course-4',
    track: 'ai',
    title: 'AI Agent Systems',
    desc: 'Design practical AI agents that take tasks, use tools, remember context, and report cleanly.',
    icon: 'fa-robot',
    badgeId: 'badge-ai-agents',
    lessons: [
      {
        id: 'c4-l1',
        title: 'Defining Scope and System Instructions',
        summary: 'An agent without boundaries is a liability, not a feature.',
        minutes: 7,
        content: `An AI agent is only as safe as its constraints. Before giving an agent any tool access, define explicitly: what it IS allowed to do, what it is NEVER allowed to do, and what requires human approval before executing.

Look at how the mentor system in this platform is built — each mentor (FCRA Mentor, Dispute Strategist, Client Coach, etc.) has a distinct, narrow system prompt and knowledge scope. None of them can take destructive actions; they can only produce guidance and drafts a human reviews. That narrow scoping is deliberate architecture, not a limitation.

Write your agent's system instructions as a contract: role, allowed tools, forbidden actions, and escalation rules for anything ambiguous.`,
        objectives: [
          'Write explicit allowed/forbidden action lists before deploying an agent',
          'Identify which actions require human approval vs. full autonomy',
          'Recognize narrow-scope agent design as a safety feature, not a limitation',
        ],
        takeaways: [
          'Unscoped agents are unpredictable and potentially costly',
          'Narrow, single-purpose agents are safer and easier to debug than general-purpose ones',
          'Escalation rules for ambiguous cases prevent silent bad decisions',
        ],
        practice: 'Draft a one-paragraph "contract" for an agent you want to build: its role, 3 things it may do, 3 things it may never do, and what triggers human review.',
        platformAction: { label: 'Open AI Studio', page: 'ai-studio' },
        ricksRule: 'The tool does not save the business. The system does.',
        quiz: [
          { q: 'What is the risk of giving an AI agent unrestricted wildcard tools?', choices: ['It will complete tasks too quickly', 'Unpredictable, costly, and potentially destructive operations', 'None, LLMs are 100% deterministic'], answer: 1 },
          { q: 'Why do this platform\'s mentors have narrow, distinct system prompts instead of one general-purpose prompt?', choices: ['To make the code longer', 'Narrow scoping improves safety and predictability', 'It has no functional benefit'], answer: 1 },
        ],
      },
      {
        id: 'c4-l2',
        title: 'Tools, Memory, and Grounded Context',
        summary: 'Give an agent facts to reason over, not a blank page.',
        minutes: 7,
        content: `An agent without memory repeats itself and forgets context between sessions. An agent with unlimited, ungrounded memory hallucinates confidently. The fix is grounded, scoped memory: give the agent specific, retrieved facts relevant to the current task, and instruct it to say "I don't know" rather than invent details.

The client tutor in this platform demonstrates this well: it pulls the client's actual journey phase, scores, violation count, and uploaded document summaries into context before every reply, and is explicitly instructed never to fabricate numbers that were not in that retrieved context.

When building your own agent, separate "what the agent knows for certain" (retrieved, verified data) from "what the agent may suggest" (recommendations built on top of that data) — and never let the two blur together in the output.`,
        objectives: [
          'Distinguish grounded facts from agent-generated suggestions',
          'Retrieve only task-relevant context rather than dumping everything',
          'Instruct agents to explicitly acknowledge missing information',
        ],
        takeaways: [
          'Grounded context prevents hallucination far better than a bigger model does',
          'Separate verified facts from suggestions in both the prompt and the output',
          '"I don\'t know" is a valid and important agent response',
        ],
        practice: 'For a task you want an agent to help with, list the 3-5 specific facts it needs to be grounded in, and where those facts would come from (a database, a form, an upload).',
        ricksRule: 'An agent with no ground truth is just a confident guesser.',
        quiz: [
          { q: 'What is the main risk of an agent with unlimited, ungrounded memory?', choices: ['It becomes too slow', 'It may hallucinate details confidently', 'It uses too much disk space'], answer: 1 },
          { q: 'A well-grounded agent should be instructed to:', choices: ['Always provide a confident-sounding answer even without data', 'Acknowledge when information is missing rather than invent it', 'Ignore retrieved context in favor of general knowledge'], answer: 1 },
        ],
      },
      {
        id: 'c4-l3',
        title: 'Deterministic Validation After Every Agent Action',
        summary: 'Never let an agent be both the actor and the only judge of its own work.',
        minutes: 6,
        content: `A reliable agent system checks its own output the same way good software checks user input: with deterministic, non-AI validation after the AI step, not instead of it. If an agent drafts a value, format, or decision, run it through explicit rules before it is used anywhere consequential.

This platform's dispute-letter and violation-detection features work this way: AI drafts content, but rule-based checks (prohibited-phrase scans, fact-check gates, compliance gates) run afterward before anything reaches a client or gets mailed. The AI proposes; deterministic code disposes.

When you design your own agent pipeline, always ask: "What is the non-AI check that catches this agent's most likely failure mode?" Build that check even if it feels redundant — it is your safety net.`,
        objectives: [
          'Add deterministic, rule-based validation after every AI-generated action',
          'Identify the most likely failure mode for a given agent task',
          'Separate the "propose" step (AI) from the "dispose" step (validated logic)',
        ],
        takeaways: [
          'AI proposes, deterministic code disposes — never skip the second half',
          'This platform already validates AI-drafted letters against compliance and fact-check gates before sending',
          'Always design the safety net for the agent\'s most likely failure, not just its intended success',
        ],
        practice: 'For an agent action you are designing, write the one deterministic rule-based check that would catch its most likely mistake.',
        ricksRule: 'Trust, but verify — with code, not vibes.',
        quiz: [
          { q: 'In a reliable agent pipeline, deterministic validation should run:', choices: ['Never — trust the model fully', 'Before the AI step only', 'After the AI step, before the output is used consequentially'], answer: 2 },
          { q: 'What is an example of this platform validating AI output before it reaches a client?', choices: ['Prohibited-phrase scans and fact-check gates on dispute letters', 'There is no such validation', 'Only spelling checks'], answer: 0 },
        ],
      },
    ],
  },

  // ── COURSE 5 — FUNNELS ──────────────────────────────────────
  {
    id: 'course-5',
    track: 'growth',
    title: 'Funnel Building From Zero',
    desc: 'Turn traffic into leads, leads into calls, and calls into revenue with a clean funnel path.',
    icon: 'fa-funnel-dollar',
    badgeId: 'badge-funnels',
    lessons: [
      {
        id: 'c5-l1',
        title: 'The Value-Bridge Landing Protocol',
        summary: 'Give before you ask — the sequence that earns the next step.',
        minutes: 7,
        content: `A funnel is a sequence of small commitments, each earning the right to ask for the next one. The most common funnel failure is asking for too much too soon — a cold visitor asked to "Book a $2,000 consult" on their first touch will almost always decline.

The value-bridge sequence: (1) an immediately useful, low-friction lead magnet (checklist, calculator, mini-guide) in exchange for an email or phone number, (2) a short automated follow-up sequence that delivers real value and builds trust, (3) THEN a direct offer to book a call or buy, once trust has been established.

Each step should feel like a fair trade, not a trap. If the lead magnet is genuinely useful on its own, people trust the next ask more.`,
        objectives: [
          'Design a lead magnet that delivers genuine value on its own',
          'Sequence asks from low-commitment to high-commitment',
          'Avoid asking for a high-commitment action on a cold first touch',
        ],
        takeaways: [
          'Funnels are a sequence of fair trades, not one big ask',
          'A genuinely useful lead magnet earns trust for the next step',
          'Asking for too much too soon is the most common funnel failure',
        ],
        practice: 'List your current first ask to a brand-new visitor. If it requires high commitment (money, a long call), design one smaller lead-magnet step to insert before it.',
        ricksRule: 'Build the system before you chase the traffic.',
        quiz: [
          { q: 'Why do most multi-step funnels leak leads?', choices: ['Because traffic is inherently low-quality', 'Friction, cognitive load, and over-complicated steps', 'They do not feature enough flash animations'], answer: 1 },
          { q: 'A value-bridge funnel typically starts with:', choices: ['A high-commitment purchase offer', 'A low-friction, genuinely useful lead magnet', 'A request for a testimonial'], answer: 1 },
        ],
      },
      {
        id: 'c5-l2',
        title: 'Automated Follow-Up That Does Not Feel Automated',
        summary: 'Sequencing emails/texts so trust builds instead of eroding.',
        minutes: 6,
        content: `A follow-up sequence fails when every message asks for something. The fix: a 3-part rhythm — deliver value, deliver value, THEN ask. Two genuinely helpful messages for every one sales message keeps trust climbing instead of triggering unsubscribes.

Personalize using data you already have — name, the specific lead magnet they downloaded, or their stated goal — rather than generic blasts. CRM tagging (covered in Course 6) is what makes this personalization possible at scale without manual work.

Every automated message should read like it was written by a person who remembers the last interaction, even though a system sent it.`,
        objectives: [
          'Apply a 2-value-messages-to-1-ask rhythm in follow-up sequences',
          'Personalize automated messages using existing lead data',
          'Avoid follow-up sequences that ask for something in every message',
        ],
        takeaways: [
          'A 2:1 value-to-ask ratio keeps trust climbing in automated sequences',
          'Personalization from existing data beats generic blasts',
          'Good automation should feel remembered, not robotic',
        ],
        practice: 'Audit your last 5 automated follow-up messages. Count how many delivered value vs. asked for something. Adjust toward a 2:1 ratio.',
        ricksRule: 'Automated does not mean impersonal — it means consistent.',
        quiz: [
          { q: 'A healthy follow-up sequence rhythm is roughly:', choices: ['Ask, ask, ask', 'Two value-messages for every one ask', 'One message total, then silence'], answer: 1 },
          { q: 'What makes personalization possible at scale in automated follow-up?', choices: ['Guessing', 'CRM tagging and existing lead data', 'Sending identical messages to everyone'], answer: 1 },
        ],
      },
      {
        id: 'c5-l3',
        title: 'Routing Qualified Leads to a Real Human Fast',
        summary: 'The handoff moment is where funnels win or lose deals.',
        minutes: 6,
        content: `A funnel's final job is to hand off a warm, qualified lead to a human at exactly the right moment — not too early (before trust exists) and not too late (after interest has cooled). The mechanism matters: a direct calendar link (e.g., Calendly) removes the back-and-forth scheduling friction that kills momentum.

Route by qualification signal, not just by form submission. Someone who read three emails and clicked the pricing page is a hotter lead than someone who just filled out the first form — route the former to a faster response SLA.

Track the handoff moment as a funnel metric on its own: time from "lead qualified" to "first human contact." This single number often predicts close rate better than any top-of-funnel metric.`,
        objectives: [
          'Use a direct calendar link to remove scheduling friction at handoff',
          'Route leads by qualification signal, not just form completion',
          'Track time-to-first-human-contact as a core funnel metric',
        ],
        takeaways: [
          'The handoff moment is a make-or-break point in the funnel, worth measuring directly',
          'Direct scheduling links reduce friction and lost momentum',
          'Not all leads deserve the same response speed — route by signal strength',
        ],
        practice: 'Calculate (or estimate) your current average time from "lead qualified" to "first human contact." Set a target to cut it by half.',
        ricksRule: 'Speed to lead is the only metric that matters at the handoff.',
        quiz: [
          { q: 'What metric often predicts close rate better than top-of-funnel numbers?', choices: ['Number of page visits', 'Time from lead qualification to first human contact', 'Number of social media followers'], answer: 1 },
          { q: 'Routing leads by qualification signal means:', choices: ['Treating every lead identically', 'Giving faster response SLAs to hotter, more-engaged leads', 'Ignoring engagement data entirely'], answer: 1 },
        ],
      },
    ],
  },

  // ── COURSE 6 — CRM ───────────────────────────────────────────
  {
    id: 'course-6',
    track: 'growth',
    title: 'CRM And Follow-Up Systems',
    desc: 'Build the pipeline, tags, automations, and follow-up flows that stop leads from leaking.',
    icon: 'fa-address-card',
    badgeId: 'badge-crm',
    lessons: [
      {
        id: 'c6-l1',
        title: 'Designing Pipeline Stages That Match Reality',
        summary: 'Stages should mirror decisions, not vanity milestones.',
        minutes: 6,
        content: `A pipeline with stages like "New," "Contacted," "Interested," "Closed" tells you almost nothing actionable. Good pipeline stages represent a decision point that changes what happens next: "Needs qualifying call," "Proposal sent — awaiting decision," "Payment link sent — awaiting payment."

Each stage should have a defined maximum time a lead is allowed to sit there before it triggers a follow-up action. A lead stuck in "Proposal sent" for two weeks with no automated nudge is a lead you are silently losing.

In this platform, Client Management and the CRM stages are visible per-organization — when you "Work in tenant" as platform owner, you are looking at the same real pipeline that tenant's staff use daily.`,
        objectives: [
          'Design pipeline stages around decision points, not vague labels',
          'Set a maximum dwell time per stage that triggers automated follow-up',
          'Recognize vanity-stage pipelines that provide no actionable signal',
        ],
        takeaways: [
          'Stages should answer "what happens next," not just "where are they"',
          'Every stage needs a maximum dwell time with an automated nudge attached',
          'Vague stages hide the exact place where leads are leaking',
        ],
        practice: 'List your current pipeline stages. For each, write the specific next action a rep should take and the maximum time before that action should be forced by automation.',
        ricksRule: 'Named right. Built right. Shipped clean.',
        quiz: [
          { q: 'A well-designed pipeline stage should represent:', choices: ['A vague progress label', 'A decision point with a clear next action', 'A random checkpoint with no defined trigger'], answer: 1 },
          { q: 'What should happen when a lead sits in a stage past its maximum dwell time?', choices: ['Nothing — dwell time is not tracked', 'An automated follow-up or alert should trigger', 'The lead should be automatically deleted'], answer: 1 },
        ],
      },
      {
        id: 'c6-l2',
        title: 'Tagging Discipline: The Real Engine of Personalization',
        summary: 'Clean tags make automation and personalization possible; messy tags make both impossible.',
        minutes: 6,
        content: `Tags are the difference between a CRM that can automate intelligently and one that can only send blasts. A tag like "auto-loan-interest" lets you branch follow-up content specifically for that goal; an untagged contact gets generic messaging by default.

Discipline matters more than volume. A small, consistent tag taxonomy (source, goal, stage-history, engagement-level) beats hundreds of one-off tags nobody remembers the meaning of six months later. Document your tag list somewhere every team member can see.

Retag or archive stale tags quarterly — a CRM's tag list rots just like a shared folder does, and rotten tags quietly break automations that filter by them.`,
        objectives: [
          'Build a small, consistent tag taxonomy instead of ad-hoc tags',
          'Use tags to branch automated follow-up content by goal/source',
          'Periodically audit and retire stale tags',
        ],
        takeaways: [
          'Tag discipline, not tag volume, is what enables real personalization',
          'A documented, shared tag taxonomy prevents team drift',
          'Stale tags silently break filtered automations — audit them regularly',
        ],
        practice: 'Write your ideal 4-category tag taxonomy (e.g., source, goal, engagement, stage-history) and list 3 example tags per category.',
        ricksRule: 'A messy tag list is a broken automation waiting to happen.',
        quiz: [
          { q: 'What enables real personalization at scale in a CRM?', choices: ['Sending identical messages to everyone', 'A small, consistent, documented tag taxonomy', 'Having as many tags as possible with no structure'], answer: 1 },
          { q: 'Why should tags be audited periodically?', choices: ['Tags never need review once created', 'Stale tags can silently break filtered automations', 'Audits are only cosmetic'], answer: 1 },
        ],
      },
      {
        id: 'c6-l3',
        title: 'Cross-Platform Sync Without Data Leakage',
        summary: 'Sync what helps sales move; block what should never leave the system.',
        minutes: 7,
        content: `Syncing your CRM to other tools (marketing platforms, spreadsheets, GHL) speeds up work — but every synced field is a new place sensitive data could leak. The rule: only sync fields that are operationally necessary for the receiving tool's job.

This platform enforces that rule structurally: GHL sync explicitly allows safe operational fields (name, tags, stage) while blocking sensitive data (SSNs, full credit report contents) at the code level — it is not a manual policy staff have to remember, it is a hard boundary in the sync logic itself.

When you design your own cross-platform sync, ask for every field: "Does the receiving tool need this to do its job, or are we sending it just because it's available?" Default to withholding.`,
        objectives: [
          'Apply the "operationally necessary" test to every synced field',
          'Understand how this platform hard-blocks sensitive fields from CRM sync',
          'Default to withholding data unless a clear operational need exists',
        ],
        takeaways: [
          'Every synced field is a potential leakage point — sync only what is necessary',
          'Structural blocks (in code) are more reliable than policy reminders',
          '"Available" is not the same as "necessary" when deciding what to sync',
        ],
        practice: 'List every field currently synced from your CRM to another tool. For each, write the specific operational reason the receiving tool needs it.',
        platformAction: { label: 'Open Integration Hub', page: 'integration-os' },
        ricksRule: 'If a field does not need to leave, do not let it leave.',
        quiz: [
          { q: 'What is the correct test before syncing a field to another platform?', choices: ['Sync everything available by default', 'Does the receiving tool operationally need this field?', 'Sync nothing, ever'], answer: 1 },
          { q: 'How does this platform prevent sensitive data leakage on GHL sync?', choices: ['Staff manually remember not to type it in', 'Sensitive fields are structurally blocked in the sync logic itself', 'There is no protection'], answer: 1 },
        ],
      },
    ],
  },

  // ── COURSE 7 — PROMPT ENGINEERING ────────────────────────────
  {
    id: 'course-7',
    track: 'ai',
    title: 'Prompt Engineering For Builders',
    desc: 'Write prompts that make AI useful, structured, testable, and aligned with business outcomes.',
    icon: 'fa-keyboard',
    badgeId: 'badge-prompting',
    lessons: [
      {
        id: 'c7-l1',
        title: 'Role, Task, Constraints: The Three-Part Prompt',
        summary: 'A reliable structure for any business prompt.',
        minutes: 6,
        content: `Most weak prompts skip straight to the task ("write me an email") with no role or constraints, so the model guesses at tone, length, and rules — and guesses differently every time. A reliable prompt has three parts: Role ("You are a credit-dispute writing assistant for a compliance-first platform"), Task (the specific thing to produce), and Constraints (length, tone, forbidden phrases, required structure).

The mentor system prompts in this platform follow exactly this structure — each mentor's system prompt defines a role, a scope of allowed topics, and explicit constraints (no guaranteed-outcome language, no fabricated facts) before any user message is even seen.

Write your prompts the same way, every time, even for "simple" tasks — consistency in structure produces consistency in output.`,
        objectives: [
          'Structure prompts using Role, Task, and Constraints',
          'Recognize how this platform\'s mentor prompts use this structure',
          'Apply consistent structure even to simple, one-off prompts',
        ],
        takeaways: [
          'Missing role and constraints causes inconsistent, unpredictable output',
          'The three-part structure (Role/Task/Constraints) is reusable across nearly any business prompt',
          'Consistency of structure produces consistency of output',
        ],
        practice: 'Take a prompt you use often. Rewrite it with an explicit Role line, a specific Task line, and at least 2 Constraints.',
        ricksRule: 'Structured prompts yield structured outcomes.',
        quiz: [
          { q: 'What three elements make a business prompt reliable?', choices: ['Role, Task, Constraints', 'Length, font, color', 'Just the task, nothing else'], answer: 0 },
          { q: 'This platform\'s mentor system prompts define, before any user message:', choices: ['Nothing — they are blank until the user writes', 'A role, topic scope, and explicit constraints', 'Only a greeting'], answer: 1 },
        ],
      },
      {
        id: 'c7-l2',
        title: 'Few-Shot Examples and Output Control',
        summary: 'Show, don\'t just tell, for consistent formatting.',
        minutes: 6,
        content: `Telling a model "respond in JSON" is weaker than showing it exactly what that JSON should look like. Few-shot prompting — including 1-3 concrete input/output examples in the prompt — dramatically improves format consistency, especially for structured data an automation will consume downstream.

Pick examples that cover edge cases, not just the easy case. If your real data sometimes has missing fields, include an example showing how the model should handle a missing field (null? omit it? a default value?) — don't leave that judgment call to chance at runtime.

When the format still drifts, tighten constraints further: specify field order, exact key names, and explicitly forbid extra commentary outside the structured output.`,
        objectives: [
          'Use few-shot examples to improve output format consistency',
          'Include edge-case examples, not only the easy case',
          'Tighten constraints further when format drift persists',
        ],
        takeaways: [
          'Showing examples is more reliable than describing format in words alone',
          'Edge cases in examples prevent runtime surprises',
          'Persistent format drift means constraints need to be more explicit, not that AI is unreliable',
        ],
        practice: 'Add one edge-case example to a prompt you use for structured output — specifically show how a missing or unusual field should be handled.',
        ricksRule: 'Show the model what "right" looks like — do not just describe it.',
        quiz: [
          { q: 'What is the best way to enforce JSON outputs from an LLM?', choices: ['Ask nicely in the prompt', 'Provide explicit schema and few-shot formatting examples', 'There is no way to control output structure'], answer: 1 },
          { q: 'Few-shot examples should ideally include:', choices: ['Only the easiest possible case', 'At least one edge case, like a missing field', 'No examples at all, just instructions'], answer: 1 },
        ],
      },
      {
        id: 'c7-l3',
        title: 'Testing Prompts Like You Test Code',
        summary: 'A prompt without test cases is a hope, not a system.',
        minutes: 6,
        content: `Treat a business-critical prompt the way you would treat a function: build a small set of test inputs (including tricky/edge-case inputs) and check the output against expectations every time you change the prompt. A prompt that works on your first try but breaks on the tenth real input is not production-ready.

Keep a running log of failure cases you discover — an input that produced a wrong or malformed output — and re-test against that log every time you revise the prompt. This prevents "fixing" one case while silently breaking another that used to work.

This discipline is exactly why the letter-drafting and violation-detection systems in this platform run through fact-check and compliance gates on every single output, every time — not just when it "seems risky."`,
        objectives: [
          'Build a small test-input set for business-critical prompts',
          'Maintain a running failure-case log to prevent regressions',
          'Re-test against known failure cases after every prompt revision',
        ],
        takeaways: [
          'A prompt that works once is not the same as a prompt that works reliably',
          'Failure-case logs prevent "fixing" one bug while creating another',
          'Automated gates on every output (not just risky-seeming ones) are the safest default',
        ],
        practice: 'Write down the 3 trickiest real inputs you can imagine for a prompt you use, and check what the current prompt outputs for each.',
        ricksRule: 'If you would not ship code without tests, do not ship a prompt without them.',
        quiz: [
          { q: 'What should you maintain to prevent regressions when revising a prompt?', choices: ['Nothing — memory is enough', 'A running log of known failure cases to re-test against', 'A single test that never changes'], answer: 1 },
          { q: 'Compliance/fact-check gates on AI-drafted letters in this platform run:', choices: ['Only when a human flags something as risky', 'On every output, every time', 'Never — output is trusted by default'], answer: 1 },
        ],
      },
    ],
  },

  // ── COURSE 8 — LAUNCH SYSTEMS ─────────────────────────────────
  {
    id: 'course-8',
    track: 'growth',
    title: 'Digital Product Launch Systems',
    desc: 'Package knowledge, build the offer, create the sales page, and launch without chaos.',
    icon: 'fa-file-invoice-dollar',
    badgeId: 'badge-launch',
    lessons: [
      {
        id: 'c8-l1',
        title: 'Packaging Experience Into a Sellable Asset',
        summary: 'The gap between "I know this" and "I can sell this."',
        minutes: 6,
        content: `Expertise becomes a sellable product only when it is packaged into a specific, bounded promise: what transformation the buyer gets, in what timeframe, through what specific steps. "Everything I know about credit repair" is not a product. "A 5-module system to prepare a client-ready dispute strategy in one weekend" is.

Start by outlining the exact sequence of steps a beginner needs, in order, with nothing assumed. Every gap in that sequence is where a buyer gets stuck and refunds. Package format (video course, PDF system, template pack) matters far less than sequence clarity.

Ship the smallest version that delivers the core transformation, then expand based on real buyer questions — not imagined ones.`,
        objectives: [
          'Define a specific, bounded transformation promise for the product',
          'Outline a complete beginner-friendly step sequence with no assumed knowledge',
          'Ship a minimum viable version before over-building',
        ],
        takeaways: [
          'A bounded promise sells better than "everything I know"',
          'Gaps in the step sequence are where buyers get stuck and refund',
          'Real buyer questions after launch are better guidance than pre-launch guessing',
        ],
        practice: 'Write your product\'s promise in one sentence: "[Buyer] gets [specific transformation] in [timeframe] through [format]."',
        ricksRule: 'Ship the course before you write the textbook.',
        quiz: [
          { q: 'What makes expertise into a sellable product?', choices: ['Volume of content alone', 'A specific, bounded transformation promise', 'Using the most expensive production equipment'], answer: 1 },
          { q: 'What should guide expanding a product after initial launch?', choices: ['Pure guessing about what might be wanted', 'Real buyer questions and feedback after launch', 'Never expanding at all'], answer: 1 },
        ],
      },
      {
        id: 'c8-l2',
        title: 'Pre-Order Validation Before Full Production',
        summary: 'Sell before you build everything — data beats assumptions.',
        minutes: 6,
        content: `The riskiest way to launch a digital product is to spend months in full production before a single dollar has confirmed demand. A pre-order or "founding cohort" sale — selling access before the full asset is finished, with a clear delivery date — validates real demand with real money, not survey answers.

Build a simple, high-converting sales page describing the transformation and the delivery timeline, connect a checkout (Stripe is the standard here), and set a real cap on early-bird spots to create honest urgency. If pre-orders do not hit a minimum threshold, you saved months of wasted production time.

Treat every pre-order buyer as a beta partner — their real usage and questions become the improvement roadmap for the full version.`,
        objectives: [
          'Use pre-orders to validate demand before full production',
          'Set up a checkout flow with a clear delivery timeline commitment',
          'Treat early buyers as beta partners whose feedback shapes the final product',
        ],
        takeaways: [
          'Real money pre-committed is stronger validation than any survey',
          'A pre-order threshold protects you from months of wasted production',
          'Early buyers double as product-improvement partners',
        ],
        practice: 'Draft the one-paragraph pre-order pitch for your product idea, including the delivery timeline you would commit to.',
        ricksRule: 'Secure pre-orders using a high-converting sales page before you build the whole thing.',
        quiz: [
          { q: 'What is the most effective launch validation method?', choices: ['Spending months filming high-production videos', 'Securing pre-orders using a high-converting sales page', 'Relying entirely on organic word of mouth'], answer: 1 },
          { q: 'Early pre-order buyers are best treated as:', choices: ['Just a transaction, nothing more', 'Beta partners whose feedback shapes the final product', 'A group to be ignored until launch'], answer: 1 },
        ],
      },
      {
        id: 'c8-l3',
        title: 'The Fulfillment Sequence: Delivering Without Chaos',
        summary: 'A clean automated delivery flow protects trust after the sale.',
        minutes: 6,
        content: `A launch can convert well and still damage trust if fulfillment is chaotic — buyers waiting, confused about access, or receiving nothing after payment. Design a single-path fulfillment sequence: payment confirmation → automated access-granting email → a short "how to start" message → a check-in a few days later.

Every step should be automated and tested BEFORE launch day, using a real test purchase, not just a mental walkthrough. The few minutes it takes to run a real test transaction catches the broken-link or missing-email failures that otherwise surface publicly on launch day.

Treat the first week post-purchase as part of the product experience, not an afterthought — it strongly influences refund rates and referrals.`,
        objectives: [
          'Design a single automated fulfillment sequence from payment to onboarding',
          'Run a real test purchase before launch day, not just a mental check',
          'Treat the first post-purchase week as part of the product experience',
        ],
        takeaways: [
          'Fulfillment chaos can undo a great sales page\'s trust',
          'Always run a real test transaction before go-live',
          'The first week after purchase influences refunds and referrals directly',
        ],
        practice: 'Map your fulfillment sequence step by step, then run one real test purchase through it before your next launch.',
        ricksRule: 'A confused buyer after the sale is a refund waiting to happen.',
        quiz: [
          { q: 'What should always happen before launch day to validate fulfillment?', choices: ['A mental walkthrough only', 'A real test purchase run through the full flow', 'Nothing — trust the design'], answer: 1 },
          { q: 'Why does the first week after purchase matter for a digital product launch?', choices: ['It has no measurable impact', 'It strongly influences refund rates and referrals', 'Only the sales page matters, not what happens after'], answer: 1 },
        ],
      },
    ],
  },

  // ── COURSE 9 — LOCAL BUSINESS GROWTH ─────────────────────────
  {
    id: 'course-9',
    track: 'operations',
    title: 'Local Business Growth Infrastructure',
    desc: 'Set up the pages, automations, offers, and tracking local businesses need to grow.',
    icon: 'fa-map-marked-alt',
    badgeId: 'badge-local',
    lessons: [
      {
        id: 'c9-l1',
        title: 'Speed-to-Lead: The Local Advantage',
        summary: 'Local buyers decide fast — respond faster.',
        minutes: 6,
        content: `Local service buyers usually contact 2-4 competitors within minutes of a triggering event (a leak, a car problem, a legal question) and typically go with whoever responds first and clearly. Response speed is not a nice-to-have for local business — it is often the single biggest lever available.

Set up an immediate auto-reply on every inbound channel (SMS, missed call, web form) confirming receipt and setting an expectation ("We got your request — a team member will call within 15 minutes"). This buys time for a human to respond while preventing the silent drop-off of a lead who assumes no one saw their message.

Twilio SMS integration (already available in this platform's Integration Hub) is the mechanism most local operators use for this instant-response layer.`,
        objectives: [
          'Recognize response speed as a primary competitive lever for local business',
          'Set up immediate auto-reply on all inbound lead channels',
          'Use SMS auto-response to buy time for human follow-up',
        ],
        takeaways: [
          'Local buyers often choose based on who responds fastest and clearest',
          'An auto-reply prevents leads from assuming they were ignored',
          'Twilio SMS is the standard mechanism for this instant-response layer',
        ],
        practice: 'Draft the exact auto-reply text you would send within seconds of a new local lead inquiry, including a specific response-time promise.',
        platformAction: { label: 'Open Integration Hub', page: 'integration-os' },
        ricksRule: 'What is the optimal response time for local inbound leads? Within 5 minutes.',
        quiz: [
          { q: 'What is the optimal response time for local inbound leads?', choices: ['Within 5 minutes', 'Within 24 to 48 hours', 'During the weekly business review'], answer: 0 },
          { q: 'What does an SMS auto-reply primarily accomplish?', choices: ['Replaces the need for a human response entirely', 'Buys time for a human response while preventing silent lead drop-off', 'Has no measurable effect on conversion'], answer: 1 },
        ],
      },
      {
        id: 'c9-l2',
        title: 'The Automated Reputation Loop',
        summary: 'Reviews compound — build the ask into the workflow.',
        minutes: 6,
        content: `Local businesses live and die by review volume and recency. Manually remembering to ask every customer for a review after a job fails constantly — automation is the only reliable path. Trigger a review-request message automatically a set time after a job is marked complete (same-day for fast-turn services, 1-2 days for larger jobs).

Route the ask smartly: happy customers to the public review platform, and unhappy ones to a private feedback form first (so complaints get resolved before they become public one-star reviews). This "review gate" pattern protects your public reputation while still surfacing real problems internally.

Track review velocity as an ongoing metric, not a one-time project — a strong review count from two years ago fades in weight against competitors adding fresh ones weekly.`,
        objectives: [
          'Automate review requests triggered by job completion',
          'Route unhappy customers to private feedback before public review platforms',
          'Track review velocity as an ongoing operational metric',
        ],
        takeaways: [
          'Automated, timely review requests outperform manual, inconsistent asking',
          'Routing dissatisfaction to a private channel first protects public reputation',
          'Review recency and velocity matter as much as total count',
        ],
        practice: 'Design your review-request trigger: what event fires it, how long after, and where unhappy customers get routed first.',
        ricksRule: 'Reputation compounds automatically only if the ask is automatic too.',
        quiz: [
          { q: 'What is the purpose of routing unhappy customers to a private feedback form first?', choices: ['To ignore their complaints entirely', 'To resolve issues before they become public negative reviews', 'It serves no real purpose'], answer: 1 },
          { q: 'Review requests are most effective when triggered:', choices: ['Randomly, with no connection to job completion', 'Automatically, tied to job completion timing', 'Only once a year in a bulk campaign'], answer: 1 },
        ],
      },
      {
        id: 'c9-l3',
        title: 'Tracking Lead Sources Without Guesswork',
        summary: 'You cannot scale what you cannot attribute.',
        minutes: 6,
        content: `Local operators frequently cannot answer "which marketing channel actually produced this job?" — and without that answer, budget decisions are guesses. Set up source tracking at the point of lead capture: unique tracking numbers per channel (one number for Google ads, another for the website form, another for a specific print ad), and a required "source" field logged in the CRM for every new lead.

Review source performance monthly, not just at the surface level (raw lead count) but at the outcome level (which sources actually convert to paid jobs, not just inquiries). A channel producing many cheap-but-low-quality leads can quietly cost more than a channel producing fewer, better ones.

This tracking discipline turns marketing spend from a hope into a measurable, improvable system.`,
        objectives: [
          'Assign unique tracking per marketing channel at the point of capture',
          'Log a required source field for every new lead in the CRM',
          'Evaluate sources by conversion outcome, not just raw lead volume',
        ],
        takeaways: [
          'Untracked lead sources make budget decisions a guess',
          'Outcome-level tracking (paid jobs, not just inquiries) reveals true channel value',
          'A cheap-lead channel can be more expensive than it looks if quality is low',
        ],
        practice: 'List your current marketing channels. For each, note whether you can currently trace a specific closed job back to that exact channel.',
        ricksRule: 'Track lead sources precisely inside CRM — guessing is not a growth strategy.',
        quiz: [
          { q: 'What should determine whether a marketing channel is truly worth the spend?', choices: ['Raw lead count only', 'Outcome-level conversion to actual paid jobs', 'How the channel feels intuitively'], answer: 1 },
          { q: 'A required "source" field on every new lead primarily enables:', choices: ['Nothing useful', 'Accurate attribution of results back to marketing spend', 'Faster page load times'], answer: 1 },
        ],
      },
    ],
  },

  // ── COURSE 10 — FOUNDER OPERATING SYSTEM ─────────────────────
  {
    id: 'course-10',
    track: 'operations',
    title: 'Founder Operating System',
    desc: 'Build the personal workflow, dashboards, SOPs, and decision systems that keep execution clean.',
    icon: 'fa-toolbox',
    badgeId: 'badge-founder-os',
    lessons: [
      {
        id: 'c10-l1',
        title: 'The Metric-Driven Morning Ritual',
        summary: 'Start the day on signal, not on your inbox.',
        minutes: 6,
        content: `Founders who start each day in their inbox let other people's priorities set their agenda. A metric-driven morning ritual flips that: open your core dashboard first (cash position, pipeline health, urgent client/compliance items), identify the ONE highest-leverage action for the day, and only then open communications.

In this platform, that dashboard already exists for operators — the Executive Overview shows violations-vs-reports ratios, document generation trends, urgent items, and revenue by month in one screen. Make checking it, before email, part of the actual daily ritual, not an occasional glance.

The goal is not to look at more data — it is to make one clear decision about where today's limited attention goes, based on real numbers instead of whichever message arrived first.`,
        objectives: [
          'Check core operating metrics before opening communications each day',
          'Identify one highest-leverage action for the day from real dashboard data',
          'Avoid letting inbox order set the day\'s priorities',
        ],
        takeaways: [
          'Starting on metrics, not inbox, keeps priorities founder-driven',
          'This platform\'s Executive Overview is built to support exactly this ritual',
          'The goal is one clear decision, not more data consumption',
        ],
        practice: 'Tomorrow morning, open your dashboard before your inbox. Write down the single highest-leverage action the numbers point to.',
        platformAction: { label: 'Open Executive Overview', page: 'admin-overview' },
        ricksRule: 'Control your inputs to dominate your outputs.',
        quiz: [
          { q: 'What represents the core of a Founder Operating System?', choices: ['Checking emails continuously', 'Metrics-driven execution checklists and systematic SOPs', 'Delegating decisions without oversight'], answer: 1 },
          { q: 'A metric-driven morning ritual typically starts with:', choices: ['Opening the inbox first', 'Checking core operating metrics before communications', 'Skipping planning entirely'], answer: 1 },
        ],
      },
      {
        id: 'c10-l2',
        title: 'Writing SOPs That Actually Get Followed',
        summary: 'An SOP nobody reads is not a system — it is a document.',
        minutes: 6,
        content: `Most SOPs fail because they read like documentation instead of instructions — long paragraphs describing philosophy instead of numbered, literal steps a new team member could follow without asking a single clarifying question. Rewrite every SOP as: trigger (when does this apply), numbered steps (exact actions in order), and a definition of "done" (how you know the task is actually complete).

Test every SOP by having someone unfamiliar with the task follow it literally, step by step, with no verbal help. Every place they hesitate or ask "wait, what do I do here?" is a gap in the SOP, not a gap in the person.

Store SOPs somewhere the team actually opens during work, not somewhere they collect dust after being written once during onboarding.`,
        objectives: [
          'Write SOPs as trigger + numbered steps + definition of done',
          'Test SOPs by having someone unfamiliar follow them literally',
          'Store SOPs where the team actually references them during real work',
        ],
        takeaways: [
          'Philosophy-style SOPs get skipped; numbered-step SOPs get followed',
          'Every point of hesitation during a literal test run reveals a real gap',
          'An SOP that is never opened during work is not an active system',
        ],
        practice: 'Pick one recurring task. Rewrite its SOP as trigger + numbered steps + definition of done, then have a teammate follow it literally and note every hesitation point.',
        ricksRule: 'Named right. Built right. Shipped clean — that applies to your SOPs too.',
        quiz: [
          { q: 'A good SOP should be structured as:', choices: ['A long philosophical explanation', 'Trigger, numbered steps, and a definition of done', 'A single vague sentence'], answer: 1 },
          { q: 'What does a hesitation point during a literal SOP test reveal?', choices: ['A gap in the SOP, not the person following it', 'That the person is not capable', 'Nothing meaningful'], answer: 0 },
        ],
      },
      {
        id: 'c10-l3',
        title: 'Delegation With Oversight, Not Abdication',
        summary: 'Delegate the task, not the accountability.',
        minutes: 6,
        content: `Founders often swing between two failure modes: doing everything themselves (bottleneck) or delegating and disappearing entirely (abdication). The sustainable middle: delegate the execution of a task fully, while keeping a lightweight, scheduled checkpoint on the outcome — not on every step.

Define delegation clearly: what decision authority the person has, what must be escalated back to you, and on what cadence you will review outcomes (not micromanage process). Written this way, delegation actually frees founder time instead of creating a constant stream of "quick questions."

Review outcomes against the definition of done from the relevant SOP — this closes the loop between Lesson 2's systems work and real delegated execution.`,
        objectives: [
          'Delegate execution fully while keeping scheduled outcome checkpoints',
          'Define explicit decision authority and escalation triggers up front',
          'Review delegated outcomes against a written definition of done',
        ],
        takeaways: [
          'Effective delegation avoids both micromanagement and total abdication',
          'Clear decision authority and escalation rules prevent constant interruption',
          'Outcome reviews should be scheduled and tied to a defined "done," not ad hoc',
        ],
        practice: 'For one task you currently do yourself, write the exact decision authority you would hand off, the one thing that must escalate back to you, and your review cadence.',
        ricksRule: 'Delegating decisions without oversight — that is what breaks founders and businesses alike. Do neither extreme.',
        quiz: [
          { q: 'What is the sustainable middle ground for delegation?', choices: ['Doing everything yourself to avoid risk', 'Delegating execution fully while keeping scheduled outcome checkpoints', 'Delegating and never checking in again'], answer: 1 },
          { q: 'Delegated outcomes should be reviewed against:', choices: ['Nothing in particular', 'A written definition of done from the relevant SOP', 'Pure gut feeling only'], answer: 1 },
        ],
      },
    ],
  },
];

export function getAcademyCourseById(id: string): AcademyCourse | undefined {
  return ACADEMY_COURSES.find((c) => c.id === id);
}

export function getAcademyLesson(courseId: string, lessonId: string): { course: AcademyCourse; lesson: AcademyLesson } | undefined {
  const course = getAcademyCourseById(courseId);
  if (!course) return undefined;
  const lesson = course.lessons.find((l) => l.id === lessonId);
  if (!lesson) return undefined;
  return { course, lesson };
}

export function academyTotalLessons(): number {
  return ACADEMY_COURSES.reduce((sum, c) => sum + c.lessons.length, 0);
}
