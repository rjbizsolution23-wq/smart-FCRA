# ⚡ SLASH COMMANDS REFERENCE
# API Integration Master — Quick Command Guide
# ═══════════════════════════════════════════════════════════════════════

## 🔄 BRAIN REFRESH COMMANDS

| Command | Description | Duration |
|---------|-------------|----------|
| `/refresh-brain` | Full 10-domain knowledge refresh | 15-20 min |
| `/refresh [N]` | Refresh single capability domain (1-10) | 2-3 min |
| `/verify [claim]` | Live-verify a specific claim or fact | 30 sec |
| `/datecheck` | Re-anchor temporal context to today | 10 sec |

## 📦 PACKAGE VERIFICATION COMMANDS

| Command | Description | Duration |
|---------|-------------|----------|
| `/pkg-check [name]` | Run full package recency gate | 30 sec |
| `/version-drift [pkg]` | Cross-source version verification | 1 min |
| `/stack-snapshot` | Output current verified stack table | Instant |

## 🔒 SECURITY COMMANDS

| Command | Description | Duration |
|---------|-------------|----------|
| `/cve-check` | Pull active CISA + NVD security alerts | 2 min |
| `/security-audit` | Full security posture review | 5 min |

## 📊 AUDIT COMMANDS

| Command | Description | Duration |
|---------|-------------|----------|
| `/capability-audit` | Recency status of all 10 domains | 1 min |
| `/staleness-report` | List facts >90 days old in context | 30 sec |
| `/confidence-check` | Review confidence scores of recent claims | 30 sec |

---

## 🎯 10 CAPABILITY DOMAINS

Use with `/refresh [N]` command:

| # | Domain | Primary Sources |
|---|--------|-----------------|
| 1 | Master Architect | martinfowler.com, AWS, ThoughtWorks |
| 2 | Frontend Specialist | nextjs.org, react.dev, npm |
| 3 | Backend Engineer | pypi.org, hono.dev, nodejs.org |
| 4 | Database Architect | postgresql.org, supabase.com, neon.tech |
| 5 | DevOps Automation | kubernetes.io, docker.com, github.blog |
| 6 | QA Testing | playwright.dev, vitest.dev, owasp.org |
| 7 | UI/UX Designer | w3.org/WAI, web.dev |
| 8 | Security Posture | cisa.gov, nvd.nist.gov ⚠️ CRITICAL |
| 9 | AI/ML Integration | anthropic.com, openai.com, vercel.com |
| 10 | Deployment & Observability | sentry.io, opentelemetry.io |

---

## 📋 EXAMPLE USAGE

```
User: /pkg-check axios
Agent: 
📦 PACKAGE GATE: axios
✅ Latest: 1.7.2 (npm registry)
✅ Downloads: 45M/week
⚠️ ALERT: Supply chain incident Apr 2026 (CISA)
🔴 RECOMMENDATION: Use fetch API or ky instead
```

```
User: /verify "Next.js 16.2 is the latest version"
Agent:
🔍 VERIFICATION: Next.js version
✅ CONFIRMED: 16.2 is latest stable
📅 Released: Mar 18, 2026
🔗 Source: https://nextjs.org/blog/next-16-2
🟢 CONFIDENCE: HIGH
```

```
User: /refresh 8
Agent:
🔄 REFRESHING: Domain 8 - Security Posture
📡 Checking: cisa.gov, nvd.nist.gov, github.com/advisories
⚠️ NEW ALERT: [details]
✅ Domain 8 refresh complete
📅 Last updated: [today]
```

---

## 🚨 EMERGENCY COMMANDS

| Command | When to Use |
|---------|-------------|
| `/security-halt` | Stop all recommendations on security concern |
| `/rollback [topic]` | Revert to last known-good recommendation |
| `/escalate` | Flag issue for human review |

---

## 💡 TIPS

1. **Start sessions with**: `/datecheck` to anchor temporal context
2. **Before any install**: `/pkg-check [package-name]`
3. **Weekly maintenance**: `/refresh-brain` (Sunday recommended)
4. **On security news**: `/cve-check` immediately
5. **When versions conflict**: `/version-drift [package]`

---

# ═══════════════════════════════════════════════════════════════════════
# "Memory is suspect. Live search is law." 🔥
# ═══════════════════════════════════════════════════════════════════════
