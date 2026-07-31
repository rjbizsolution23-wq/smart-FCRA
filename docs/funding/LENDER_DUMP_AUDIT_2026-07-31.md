# Lender Dump Audit — 2026-07-31

## Claim vs truth

| Field | Value |
|-------|--------|
| Dump claim | `total_lenders: 1656` |
| Curated import | **65** (`src/data/funding/lenders-catalog.ts`) |
| Rejected | **1591** (~96%) |

## Accepted (ids 1–65)

Source: `lenders-database.ts` — real product / institution names.

| Type | Count | Examples |
|------|------:|----------|
| RENT_REPORTER | 3 | RentReporters, BoomPay, Rental Kharma |
| PRIMARY_TRADELINE | 6 | Self, Kickoff, Credit Strong, Ava, Chime, Extra |
| BUSINESS_CARD | 6 | Chase Ink, Amex Blue Business+, BofA, US Bank, PNC |
| CREDIT_UNION | 10 | NFCU, PenFed, DCU, Alliant, First Tech, BECU, … |
| FINANCIAL_INSTITUTION | 40 | Golden 1, SchoolsFirst, VyStar, ICCU, … |

## Rejected pollution (ids 66–1656)

Sources: `master_credit_unions_and_tradelines_database.md`, `jonnie_white_october_tradelines_master_dataset.md` — **heading / field / menu / stack scrape**, not lenders.

Examples of false “lenders”:

- Roadmap: `Week 1-2: Foundation`, `LAYER 1`, `PHASE 1`
- Protocol noise: `SEARCH EXECUTED`, `CLOUDFLARE STACK`
- Fighting-game moves: `Punch`, `Kick`, `Headbutt`, `Piledriver`
- Restaurant menu: `6 pc Shrimp Basket - $13.99`, `Blackened`
- Tech stacks: `Framer Motion`, `OpenAI Sora`, `HAPI FHIR`, `BioBERT`
- Ops / SEO / music: `Deploy to Netlify`, `Track 1`, `FL Studio`
- Field labels: `SSN Last 4`, `Baseline Equifax Score`, `USDOT Number`

## Curation rule

1. Never treat dump `total_lenders` as truth without a name/type sanity pass.
2. Deterministic `matchLenders()` only scores the curated catalog.
3. When real source files (`lenders-database.ts`, SUIA, tradeline masters) land on the VM, merge via `looksLikeRealLenderName()` + human review — do not re-import the polluted markdown scrape.
