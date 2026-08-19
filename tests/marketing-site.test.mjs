/**
 * Public sales/demo SEO, GEO, and footer chrome.
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const {
  MARKETING_KEYWORDS,
  MARKETING_ORG,
  applyMarketingChrome,
  llmsTxt,
  robotsTxt,
  sitemapXml,
  siteFooterHtml,
} = await import(pathToFileURL(path.join(root, 'src/lib/marketing-site.ts')).href);

assert(MARKETING_KEYWORDS.includes('credit repair software'), 'primary keyword');
assert(MARKETING_KEYWORDS.includes('Tijeras NM'), 'geo keyword');
assert(MARKETING_ORG.city === 'Tijeras', 'HQ city');

const home = applyMarketingChrome('<!DOCTYPE html><html lang="en"><head><title>x</title></head><body><footer>old</footer></body></html>', 'home');
assert(home.includes('application/ld+json'), 'json-ld');
assert(home.includes('geo.region'), 'geo meta');
assert(home.includes('FAQPage'), 'faq schema');
assert(home.includes('sf-footer'), 'professional footer');
assert(home.includes('/legal/privacy'), 'privacy in footer');
assert(home.includes('id="faq"'), 'faq section');
assert(!home.includes('/brand">Brand library'), 'owner brand hub not in public footer');

const compare = applyMarketingChrome('<!DOCTYPE html><html lang="en"><head><title>c</title></head><body><footer>old</footer></body></html>', 'compare');
assert(compare.includes('Compare CRM'), 'compare title');
assert(compare.includes('sf-footer'), 'compare footer');

const robots = robotsTxt();
assert(robots.includes('Sitemap: https://smartfcra.com/sitemap.xml'), 'robots sitemap');
assert(robots.includes('GPTBot'), 'allow generative crawlers');
assert(robots.includes('llms.txt'), 'robots points at llms');

const xml = sitemapXml();
assert(xml.includes('https://smartfcra.com/demo'), 'sitemap demo');
assert(xml.includes('https://smartfcra.com/compare'), 'sitemap compare');
assert(xml.includes('https://smartfcra.com/legal/terms'), 'sitemap terms');
assert(!xml.includes('https://smartfcra.com/app<'), 'app is not indexed');

const llms = llmsTxt();
assert(llms.startsWith('# Smart FCRA'), 'llms h1');
assert(llms.includes('> Credit repair operations software'), 'llms summary');
assert(llms.includes('https://smartfcra.com/demo'), 'llms demo link');

const footer = siteFooterHtml();
assert(footer.includes('1342 NM 333'), 'NAP street');
assert(footer.includes('support@rjbusinesssolutions.org'), 'NAP email');

console.log('marketing-site.test.mjs OK');
