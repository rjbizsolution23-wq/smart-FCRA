# Demo Walkthrough — Smart FCRA by RJ Business Solutions

**Interactive demo (preferred):** https://smart-fcra-v2.pages.dev/demo  
Requires work email, phone, **business name**, and **business address**. Then a popup tour walks the product and a text/voice agent answers questions and drives screens.

**Live MyFreeScoreNow:** one report, one person, per demo account (member email + MAPIK#). Repeat pulls are blocked.

Staff sandbox logins still exist for internal use:

## Logins (sandbox)

| Role | Email | Password |
|------|-------|----------|
| Staff admin | `demo@example.com` | `demo123456` |
| Client portal | `salisha.mcdowell@example.com` | `demo123456` |

On the sign-in screen, use the **Live demo logins** one-click buttons after this branch is deployed.

## Fastest path (staff → client portal preview)

1. Open https://smart-fcra-v2.pages.dev
2. Sign in as **Staff admin**
3. On **Dashboard**, click **Prepare Demo Now** (resets portal password + ensures Salisha’s case)
4. Click **Preview Client Portal** (or Clients → Salisha → **Preview Portal**)
5. Walk:
   - **My Cockpit** — scores, journey, next actions
   - **Fundability** — readiness pillars + **Funding Cockpit** lender matches
   - **Documents / Messages / Education** — client experience
6. **Exit Preview** to return to staff CRM
7. Optional: show **Violations**, **Reports**, recovery damages on the staff dashboard

## Alternate: login as the client

Sign out, then use the **Client portal (Salisha)** button / credentials above.

## Local sandbox

```bash
cp .dev.vars.example .dev.vars
npm install
npm run db:reset
npm run build
npm run preview
# open http://localhost:3000
```

## Notes

- Production already has Salisha McDowell with reports/violations; Prepare Demo keeps credentials predictable for walkthroughs.
- Live MFSN pulls need `MFSN_*` secrets (see `docs/funding/MFSN_INTEGRATION.md`) — demos use the bundled sample case.
- Rotate demo passwords before sharing a public staging URL outside your team.
