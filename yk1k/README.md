# YK1K Brand Site Redesign

Static brand + conversion site implementing the YK1K Growth Blueprint website priorities.

**Live Shopify store (checkout):** https://www.yk1kllc.com/  
**This redesign:** marketing/brand funnel + trust pages, ready to host on Pages/Netlify or mirror into Shopify theme sections.

## Positioning

> Dallas-born legacy streetwear celebrating culture, schools, cities, history and the people who built them.

**Culture. Legacy. City. School.**

## Homepage hierarchy

1. Hero — MADE FROM LEGACY / BUILT FOR THE CULTURE / BORN IN DALLAS  
   CTAs: Shop New Drop · Shop Your School  
2. Best Sellers  
3. Shop Your City (Dallas · Houston · next cities)  
4. Rep Your School (HBCUs · Colleges · Dallas HS)  
5. The YK1K Story  
6. Seen On / Press marquee  
7. Customer reviews  
8. Kings List VIP — **$10 off + early access** (not a generic newsletter)

## Trust / company pages

About · Our Story · FAQ · Shipping · Sizing · Track Order · Contact · Refund Policy (unified; Contact no longer says “all sales final / no returns”) · Wholesale · Custom · School Orders · Collaborations · Press · School House · Grambling microsite example · Dallas · Originals · VIP

## Local preview

```bash
cd yk1k
python3 -m http.server 4173
# open http://localhost:4173
```

Regenerate pages after content edits:

```bash
python3 build.py
```

## Notes

- Product imagery pulled from public YK1K Shopify CDN for design fidelity; checkout links out to the live store.
- Celebrity “worn by” names are not featured as endorsements unless licensed — press coverage is used instead.
- Refund copy matches the formal policy (5-day credit/exchange, 14-day refund, sale items final).
