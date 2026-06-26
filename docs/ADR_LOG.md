# Architecture Decision Records (ADR) — FCRA Supreme Violation Detector

## ADR 1: Cloudflare Workers for Backend
- **Context**: Need for low-latency, globally distributed analysis.
- **Decision**: Use Cloudflare Workers instead of traditional VMs or containers.
- **Consequence**: Sub-second execution at the Edge, scale-to-zero pricing.

## ADR 2: SQLite (D1) for Storage
- **Context**: Need for relational storage with Edge availability.
- **Decision**: Use Cloudflare D1.
- **Consequence**: Managed SQLite reachable from Workers with zero cold starts.

## ADR 3: MyFreeScoreNow (MFSN) as Data Source
- **Context**: Need for high-fidelity 3-Bureau credit reports.
- **Decision**: Primary integration with MFSN.
- **Consequence**: Reliable JSON-first reports with structured violation indicators.

## ADR 4: Stripe for Monetization
- **Context**: Need for robust, multi-tenant billing.
- **Decision**: Stripe Billing with Webhook sync.
- **Consequence**: Enterprise-grade security for PII and standard SaaS billing cycles.
