import { CANONICAL_ORIGIN } from './public-origin';

export const MARKETING_ORG = {
  product: 'Smart FCRA',
  company: 'RJ Business Solutions',
  tagline: 'Empowering Generational Wealth',
  email: 'support@rjbusinesssolutions.org',
  web: 'https://rjbusinesssolutions.org',
  site: CANONICAL_ORIGIN,
  logo: 'https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg',
  street: '1342 NM 333',
  city: 'Tijeras',
  region: 'NM',
  regionName: 'New Mexico',
  postal: '87059',
  country: 'US',
  countryName: 'United States',
  geoPlacename: 'Tijeras, New Mexico',
  geoRegion: 'US-NM',
  latitude: '35.0806',
  longitude: '-106.3875',
  areaServed: 'United States',
  foundingDate: '2020',
} as const;

/** High-intent phrases for meta keywords + GEO entity coverage. Visible copy stays natural. */
export const MARKETING_KEYWORDS = [
  'credit repair software',
  'FCRA compliance software',
  'credit repair CRM',
  'dispute letter software',
  'generated FCRA dispute letters',
  'Metro 2 software',
  'e-OSCAR credit repair',
  'FDCPA compliance software',
  'ECOA credit discrimination flags',
  'CROA compliant credit repair platform',
  'credit repair client portal',
  '3 bureau credit report analysis',
  'Experian Equifax TransUnion dispute software',
  'FCRA 611 investigation clocks',
  'FCRA 623 furnisher disputes',
  'Click2Mail certified mail credit repair',
  'MyFreeScoreNow integration',
  'white label credit repair software',
  'credit repair SaaS',
  'litigation credit repair software',
  'New Mexico credit repair software',
  'Albuquerque credit repair technology',
  'Tijeras NM credit repair',
  'United States credit repair operations software',
].join(', ');

export const MARKETING_FAQ: { q: string; a: string }[] = [
  {
    q: 'What is Smart FCRA?',
    a: 'Smart FCRA is credit repair operations software from RJ Business Solutions. It reads Experian, Equifax, and TransUnion files, scores FCRA, FDCPA, ECOA, and Metro 2 findings, generates dispute and demand letters from those facts, and runs a CROA-aware client portal. It is not a fill-in letter template library and not a consumer credit-repair enrollment site.',
  },
  {
    q: 'Who is Smart FCRA for?',
    a: 'Credit repair organizations, consumer-rights firms, and litigation desks in the United States that need FCRA compliance software, a credit repair CRM, generated letters, mailing clocks, and a client portal. Headquarters is Tijeras, New Mexico, near Albuquerque; the product is sold nationwide.',
  },
  {
    q: 'Does Smart FCRA guarantee deletions or score increases?',
    a: 'No. Smart FCRA documents the file, the finding, the letter, and the FCRA § 611 investigation clock. It does not promise deletions, VantageScore or FICO lifts, lending approval, or funding.',
  },
  {
    q: 'Are the letters templates?',
    a: 'No. Letters are generated from selected violations and account evidence on the imported report (bureau § 611, furnisher § 623, method-of-verification, and litigation paths), then branded as PDF under your organization letterhead.',
  },
  {
    q: 'How do I see a live demo?',
    a: 'Open the interactive demo at https://smartfcra.com/demo with your firm name, address, email, and phone. A guided tour walks the operator console and consumer portal. This is not consumer credit-repair signup.',
  },
];

export type MarketingPageId = 'home' | 'demo' | 'pricing' | 'login' | 'compare';

type PageMeta = {
  path: string;
  title: string;
  description: string;
  robots: string;
};

const PAGES: Record<MarketingPageId, PageMeta> = {
  home: {
    path: '/',
    title: 'Smart FCRA Credit Repair Software | FCRA CRM, Generated Dispute Letters & Client Portal',
    description:
      'Smart FCRA by RJ Business Solutions is FCRA compliance and credit repair software for U.S. operators: Credit Compliance Intelligence™ across 15 categories, generated § 611 / § 623 letters, Metro 2 review, CROA client portal, and Click2Mail clocks. Built in Tijeras, New Mexico. Not templates. No deletion guarantees.',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  },
  demo: {
    path: '/demo',
    title: 'Interactive Credit Repair Software Demo | Smart FCRA by RJ Business Solutions',
    description:
      'Book a gated Smart FCRA demo for credit repair companies: guided product tour, voice-and-text operator agent, generated FCRA letters, client portal walkthrough, and one live MyFreeScoreNow pull. Firm identity required. Not consumer enrollment.',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  },
  pricing: {
    path: '/pricing',
    title: 'Credit Repair Software Pricing | Smart FCRA Professional, Unlimited & Enterprise',
    description:
      'Smart FCRA SaaS pricing for credit repair firms: Professional $497/mo, Unlimited $2,500/mo, Enterprise $9,997/mo. Compliance findings engine, generated dispute letters, client portal, MFSN imports, and white-label options. Live Stripe checkout.',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  },
  login: {
    path: '/login',
    title: 'Sign in to Smart FCRA | Credit Repair Operations Software',
    description:
      'Sign in to Smart FCRA by RJ Business Solutions — credit repair CRM, Credit Compliance Intelligence™, generated dispute letters, and client portal for U.S. operators.',
    robots: 'index, follow',
  },
  compare: {
    path: '/compare',
    title: 'Smart FCRA vs Credit Repair Software | Compare CRM, Compliance & Client Portal',
    description:
      'Compare Smart FCRA to template CRMs and dispute-only tools: Credit Compliance Intelligence™, enforced communication lanes, campaign QA, generated FCRA letters, MFSN imports, and CROA client portal.',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  },
};

export function marketingPageUrl(page: MarketingPageId): string {
  return `${CANONICAL_ORIGIN}${PAGES[page].path}`;
}

export function jsonLdForPage(page: MarketingPageId): Record<string, unknown>[] {
  const org = {
    '@type': 'Organization',
    '@id': `${CANONICAL_ORIGIN}/#organization`,
    name: MARKETING_ORG.company,
    legalName: MARKETING_ORG.company,
    url: MARKETING_ORG.web,
    email: MARKETING_ORG.email,
    logo: MARKETING_ORG.logo,
    slogan: MARKETING_ORG.tagline,
    address: {
      '@type': 'PostalAddress',
      streetAddress: MARKETING_ORG.street,
      addressLocality: MARKETING_ORG.city,
      addressRegion: MARKETING_ORG.region,
      postalCode: MARKETING_ORG.postal,
      addressCountry: MARKETING_ORG.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: MARKETING_ORG.latitude,
      longitude: MARKETING_ORG.longitude,
    },
    areaServed: { '@type': 'Country', name: MARKETING_ORG.countryName },
    sameAs: [MARKETING_ORG.web, CANONICAL_ORIGIN],
  };

  const software = {
    '@type': 'SoftwareApplication',
    '@id': `${CANONICAL_ORIGIN}/#software`,
    name: MARKETING_ORG.product,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Credit repair operations and FCRA compliance software',
    operatingSystem: 'Web',
    url: CANONICAL_ORIGIN,
    image: MARKETING_ORG.logo,
    description: PAGES.home.description,
    keywords: MARKETING_KEYWORDS,
    featureList: [
      'FCRA FDCPA ECOA Metro 2 compliance findings',
      'Generated dispute and demand letters from file facts',
      'CROA-aware consumer client portal',
      'Click2Mail FCRA § 611 investigation clocks',
      'MyFreeScoreNow 3-bureau import',
    ],
    offers: [
      { '@type': 'Offer', name: 'Professional', price: '497.00', priceCurrency: 'USD', priceSpecification: { '@type': 'UnitPriceSpecification', price: '497.00', priceCurrency: 'USD', billingDuration: 'P1M' } },
      { '@type': 'Offer', name: 'Unlimited', price: '2500.00', priceCurrency: 'USD', priceSpecification: { '@type': 'UnitPriceSpecification', price: '2500.00', priceCurrency: 'USD', billingDuration: 'P1M' } },
      { '@type': 'Offer', name: 'Enterprise', price: '9997.00', priceCurrency: 'USD', priceSpecification: { '@type': 'UnitPriceSpecification', price: '9997.00', priceCurrency: 'USD', billingDuration: 'P1M' } },
    ],
    provider: { '@id': `${CANONICAL_ORIGIN}/#organization` },
    audience: { '@type': 'Audience', audienceType: 'Credit repair organizations and consumer-rights law firms' },
  };

  const local = {
    '@type': 'ProfessionalService',
    '@id': `${CANONICAL_ORIGIN}/#local`,
    name: `${MARKETING_ORG.product} by ${MARKETING_ORG.company}`,
    url: CANONICAL_ORIGIN,
    image: MARKETING_ORG.logo,
    email: MARKETING_ORG.email,
    priceRange: '$$$',
    address: org.address,
    geo: org.geo,
    areaServed: [
      { '@type': 'Country', name: 'United States' },
      { '@type': 'State', name: 'New Mexico' },
      { '@type': 'City', name: 'Albuquerque' },
      { '@type': 'City', name: 'Tijeras' },
    ],
    knowsAbout: [
      'Fair Credit Reporting Act',
      'credit repair software',
      'Metro 2',
      'FDCPA',
      'CROA',
    ],
    parentOrganization: { '@id': `${CANONICAL_ORIGIN}/#organization` },
  };

  const website = {
    '@type': 'WebSite',
    '@id': `${CANONICAL_ORIGIN}/#website`,
    url: CANONICAL_ORIGIN,
    name: MARKETING_ORG.product,
    description: PAGES.home.description,
    inLanguage: 'en-US',
    publisher: { '@id': `${CANONICAL_ORIGIN}/#organization` },
  };

  const webpage = {
    '@type': 'WebPage',
    '@id': `${marketingPageUrl(page)}#webpage`,
    url: marketingPageUrl(page),
    name: PAGES[page].title,
    description: PAGES[page].description,
    isPartOf: { '@id': `${CANONICAL_ORIGIN}/#website` },
    about: { '@id': `${CANONICAL_ORIGIN}/#software` },
    inLanguage: 'en-US',
  };

  const faq = {
    '@type': 'FAQPage',
    '@id': `${CANONICAL_ORIGIN}/#faq`,
    mainEntity: MARKETING_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  const graph = [org, software, local, website, webpage];
  if (page === 'home' || page === 'pricing' || page === 'demo') graph.push(faq);
  return graph;
}

export function seoHeadTags(page: MarketingPageId): string {
  const meta = PAGES[page];
  const url = marketingPageUrl(page);
  const ld = {
    '@context': 'https://schema.org',
    '@graph': jsonLdForPage(page),
  };
  const keywords = MARKETING_KEYWORDS;
  return `
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeAttr(meta.description)}" />
  <meta name="keywords" content="${escapeAttr(keywords)}" />
  <meta name="author" content="${escapeAttr(MARKETING_ORG.company)}" />
  <meta name="robots" content="${escapeAttr(meta.robots)}" />
  <meta name="googlebot" content="${escapeAttr(meta.robots)}" />
  <meta name="bingbot" content="index, follow" />
  <link rel="canonical" href="${escapeAttr(url)}" />
  <link rel="alternate" href="${escapeAttr(url)}" hreflang="en-US" />
  <link rel="alternate" href="${escapeAttr(url)}" hreflang="x-default" />
  <meta name="theme-color" content="#2563eb" />
  <link rel="icon" href="${escapeAttr(MARKETING_ORG.logo)}" />
  <link rel="apple-touch-icon" href="${escapeAttr(MARKETING_ORG.logo)}" />
  <meta property="og:type" content="${page === 'demo' ? 'website' : 'website'}" />
  <meta property="og:site_name" content="Smart FCRA" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:url" content="${escapeAttr(url)}" />
  <meta property="og:title" content="${escapeAttr(meta.title)}" />
  <meta property="og:description" content="${escapeAttr(meta.description)}" />
  <meta property="og:image" content="${escapeAttr(MARKETING_ORG.logo)}" />
  <meta property="og:image:alt" content="Smart FCRA by RJ Business Solutions" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(meta.title)}" />
  <meta name="twitter:description" content="${escapeAttr(meta.description)}" />
  <meta name="twitter:image" content="${escapeAttr(MARKETING_ORG.logo)}" />
  <meta name="geo.region" content="${MARKETING_ORG.geoRegion}" />
  <meta name="geo.placename" content="${escapeAttr(MARKETING_ORG.geoPlacename)}" />
  <meta name="geo.position" content="${MARKETING_ORG.latitude};${MARKETING_ORG.longitude}" />
  <meta name="ICBM" content="${MARKETING_ORG.latitude}, ${MARKETING_ORG.longitude}" />
  <meta name="language" content="en-US" />
  <meta name="rating" content="general" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <link rel="sitemap" type="application/xml" href="${CANONICAL_ORIGIN}/sitemap.xml" />
  <link rel="describedby" href="${CANONICAL_ORIGIN}/llms.txt" />
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
  ${footerCss()}`;
}

export function siteFooterHtml(): string {
  const year = new Date().getUTCFullYear();
  return `<footer class="sf-footer" role="contentinfo">
  <div class="sf-footer-inner">
    <div class="sf-footer-grid">
      <div class="sf-footer-brand">
        <img src="${escapeAttr(MARKETING_ORG.logo)}" width="48" height="48" alt="RJ Business Solutions" />
        <h2>Smart FCRA</h2>
        <p>Credit repair operations software by ${MARKETING_ORG.company}. FCRA / FDCPA / ECOA / Metro 2 compliance intelligence, generated dispute letters, and a CROA-aware client portal for U.S. firms.</p>
        <p class="sf-nap">${MARKETING_ORG.street}<br>${MARKETING_ORG.city}, ${MARKETING_ORG.region} ${MARKETING_ORG.postal}<br>${MARKETING_ORG.countryName}</p>
        <p><a href="mailto:${MARKETING_ORG.email}">${MARKETING_ORG.email}</a></p>
      </div>
      <div>
        <h3>Product</h3>
        <ul>
          <li><a href="/#violations">Credit Compliance Intelligence™</a></li>
          <li><a href="/#portal">Credit repair client portal</a></li>
          <li><a href="/pricing">Software pricing</a></li>
          <li><a href="/demo">Interactive demo</a></li>
          <li><a href="/login?mode=register">Start organization</a></li>
          <li><a href="/login">Sign in</a></li>
        </ul>
      </div>
      <div>
        <h3>Keywords &amp; coverage</h3>
        <ul>
          <li><a href="/#violations">Dispute letter software</a></li>
          <li><a href="/#violations">Metro 2 &amp; e-OSCAR ops</a></li>
          <li><a href="/#portal">CROA compliant portal</a></li>
          <li><a href="/demo">MyFreeScoreNow demo pull</a></li>
          <li><a href="/api/docs">Partner API docs</a></li>
        </ul>
      </div>
      <div>
        <h3>Company &amp; legal</h3>
        <ul>
          <li><a href="${MARKETING_ORG.web}" rel="noopener">RJ Business Solutions</a></li>
          <li><a href="/legal/terms">Terms of service</a></li>
          <li><a href="/legal/privacy">Privacy policy</a></li>
          <li><a href="/legal/disclaimers">Compliance disclaimers</a></li>
          <li><a href="/llms.txt">AI / GEO index (llms.txt)</a></li>
        </ul>
      </div>
    </div>
    <div class="sf-footer-bottom">
      <p>© ${year} ${MARKETING_ORG.company}. ${MARKETING_ORG.product}. ${MARKETING_ORG.tagline}.</p>
      <p>Software for operators. Not a law firm. Not legal advice. No guaranteed deletions, score increases, or credit approval. Serving credit repair companies nationwide from ${MARKETING_ORG.geoPlacename}.</p>
    </div>
  </div>
</footer>`;
}

export function faqSectionHtml(): string {
  return `<section class="sf-faq" id="faq" aria-labelledby="faq-title">
  <div class="wrap">
    <p class="section-kicker">FAQ · SEO / GEO</p>
    <h2 class="section-title" id="faq-title">Credit repair software questions operators actually ask.</h2>
    <p class="section-support">Smart FCRA is built in ${MARKETING_ORG.geoPlacename} and used by credit repair organizations across the ${MARKETING_ORG.countryName}. These answers are written for humans, search, and AI overviews — without deletion promises.</p>
    <dl class="sf-faq-list">
      ${MARKETING_FAQ.map((item) => `<div class="sf-faq-item"><dt>${escapeHtml(item.q)}</dt><dd>${escapeHtml(item.a)}</dd></div>`).join('')}
    </dl>
  </div>
</section>`;
}

export function applyMarketingChrome(html: string, page: MarketingPageId): string {
  let out = String(html || '');
  out = out.replace(/<title>[\s\S]*?<\/title>/i, '');
  out = out.replace(/<meta name="description"[^>]*>/gi, '');
  out = out.replace(/<meta name="theme-color"[^>]*>/gi, '');
  out = out.replace(/<link rel="canonical"[^>]*>/gi, '');
  out = out.replace(/<meta property="og:[^"]+"[^>]*>/gi, '');
  out = out.replace(/<link rel="icon"[^>]*>/gi, '');
  if (out.includes('</head>')) {
    out = out.replace('</head>', `${seoHeadTags(page)}\n</head>`);
  }
  if (!out.includes('id="faq"') && (page === 'home' || page === 'pricing')) {
    if (/<footer[\s\S]*?<\/footer>/i.test(out)) {
      out = out.replace(/<footer[\s\S]*?<\/footer>/i, `${faqSectionHtml()}\n${siteFooterHtml()}`);
    } else {
      out = out.replace('</body>', `${faqSectionHtml()}\n${siteFooterHtml()}\n</body>`);
    }
  } else if (/<footer[\s\S]*?<\/footer>/i.test(out)) {
    out = out.replace(/<footer[\s\S]*?<\/footer>/i, siteFooterHtml());
  } else {
    out = out.replace('</body>', `${siteFooterHtml()}\n</body>`);
  }
  if (out.includes('<html ') && !/prefix=/i.test(out)) {
    out = out.replace('<html lang="en">', '<html lang="en-US">');
  }
  return out;
}

export const SITEMAP_PATHS = [
  '/',
  '/pricing',
  '/demo',
  '/compare',
  '/login',
  '/legal/terms',
  '/legal/privacy',
  '/legal/disclaimers',
] as const;

export function sitemapXml(): string {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = SITEMAP_PATHS.map((path) => {
    const loc = `${CANONICAL_ORIGIN}${path}`;
    const priority = path === '/' ? '1.0' : path === '/demo' || path === '/pricing' ? '0.9' : '0.6';
    const changefreq = path === '/' ? 'weekly' : 'monthly';
    return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Allow: /demo',
    'Allow: /pricing',
    'Allow: /compare',
    'Allow: /login',
    'Allow: /legal/',
    'Allow: /llms.txt',
    'Allow: /llms-full.txt',
    'Disallow: /api/',
    'Allow: /api/public/',
    'Allow: /api/docs',
    'Allow: /api/openapi.json',
    'Disallow: /app',
    'Disallow: /static/brand/founder/',
    '',
    'User-agent: GPTBot',
    'Allow: /',
    'User-agent: ChatGPT-User',
    'Allow: /',
    'User-agent: ClaudeBot',
    'Allow: /',
    'User-agent: anthropic-ai',
    'Allow: /',
    'User-agent: PerplexityBot',
    'Allow: /',
    'User-agent: Google-Extended',
    'Allow: /',
    'User-agent: Applebot-Extended',
    'Allow: /',
    'User-agent: Bytespider',
    'Allow: /',
    '',
    `Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`,
    `# GEO / generative engines: ${CANONICAL_ORIGIN}/llms.txt`,
    '',
  ].join('\n');
}

export function llmsTxt(): string {
  return `# Smart FCRA

> Credit repair operations software by RJ Business Solutions. Detects FCRA, FDCPA, ECOA, and Metro 2 issues on Experian / Equifax / TransUnion files, generates dispute and demand letters from those facts (not fill-in templates), and runs a CROA-aware client portal. Headquarters: Tijeras, New Mexico, United States. Sold nationwide to credit repair organizations and consumer-rights firms. Does not guarantee deletions, score increases, lending, or funding.

Smart FCRA is operator software, not consumer credit-repair enrollment and not a law firm.

## Product

- [Smart FCRA home](${CANONICAL_ORIGIN}/): FCRA compliance software, credit repair CRM, generated § 611 / § 623 letters, client portal
- [Interactive demo](${CANONICAL_ORIGIN}/demo): Gated product tour for credit repair companies (firm identity required)
- [Pricing](${CANONICAL_ORIGIN}/pricing): Professional $497/mo, Unlimited $2,500/mo, Enterprise $9,997/mo
- [Sign in](${CANONICAL_ORIGIN}/login): Operator and client login
- [API docs](${CANONICAL_ORIGIN}/api/docs): Partner OpenAPI

## Legal

- [Terms of service](${CANONICAL_ORIGIN}/legal/terms)
- [Privacy policy](${CANONICAL_ORIGIN}/legal/privacy)
- [Compliance disclaimers](${CANONICAL_ORIGIN}/legal/disclaimers)

## Entity

- Company: ${MARKETING_ORG.company}
- Product: ${MARKETING_ORG.product}
- Address: ${MARKETING_ORG.street}, ${MARKETING_ORG.city}, ${MARKETING_ORG.region} ${MARKETING_ORG.postal}, ${MARKETING_ORG.countryName}
- Email: ${MARKETING_ORG.email}
- Parent site: ${MARKETING_ORG.web}

## Optional

- [Full GEO brief](${CANONICAL_ORIGIN}/llms-full.txt)
`;
}

export function llmsFullTxt(): string {
  const faq = MARKETING_FAQ.map((item) => `### ${item.q}\n\n${item.a}`).join('\n\n');
  return `${llmsTxt()}

## Full product brief

${PAGES.home.description}

Keywords: ${MARKETING_KEYWORDS}

${faq}
`;
}

export function loginSeoHead(): string {
  return seoHeadTags('login');
}

function footerCss(): string {
  return `<style id="sf-footer-css">
.sf-footer{background:#0f172a;color:#94a3b8;padding:4.25rem 0 2rem;border-top:1px solid rgba(148,163,184,.18)}
.sf-footer-inner{width:min(1120px,calc(100% - 2.5rem));margin-inline:auto}
.sf-footer-grid{display:grid;grid-template-columns:1.4fr .9fr .9fr .9fr;gap:2.4rem;padding-bottom:2.4rem;border-bottom:1px solid rgba(148,163,184,.16)}
.sf-footer-brand img{width:48px;height:48px;border-radius:12px;object-fit:cover;margin-bottom:.85rem}
.sf-footer-brand h2,.sf-footer h3{font-family:var(--font-head),Inter,sans-serif;color:#fff;margin:0 0 .75rem;letter-spacing:-.03em}
.sf-footer-brand h2{font-size:1.35rem}
.sf-footer h3{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#7dd3fc}
.sf-footer p,.sf-footer li{font-size:.9rem;line-height:1.55}
.sf-footer ul{list-style:none;margin:0;padding:0}
.sf-footer li{padding:.22rem 0}
.sf-footer a{color:#cbd5e1;text-decoration:none}
.sf-footer a:hover{color:#fff}
.sf-nap{color:#64748b;font-size:.82rem}
.sf-footer-bottom{padding-top:1.4rem;display:grid;gap:.45rem;font-size:.75rem;color:#64748b}
.sf-faq{padding:4.5rem 0;background:#fff;border-top:1px solid #dbe3f0}
.sf-faq-list{display:grid;gap:1rem;margin:1.75rem 0 0;padding:0}
.sf-faq-item{background:#f8fafc;border:1px solid #dbe3f0;border-radius:14px;padding:1.1rem 1.2rem}
.sf-faq-item dt{font-family:var(--font-head),Inter,sans-serif;font-weight:650;color:#0f172a;margin:0 0 .4rem}
.sf-faq-item dd{margin:0;color:#475569;line-height:1.55}
@media (max-width:900px){.sf-footer-grid{grid-template-columns:1fr 1fr}.sf-footer-brand{grid-column:1/-1}}
@media (max-width:640px){.sf-footer-grid{grid-template-columns:1fr}}
</style>`;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}
