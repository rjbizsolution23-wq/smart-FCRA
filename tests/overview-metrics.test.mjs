import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const { fillSixMonthSeries, sparklinePath, lastSixMonthKeys } = await import(
  pathToFileURL(path.join(root, 'src/lib/overview-metrics.ts')).href
);
const { resolveTenantTheme, RJ_THEME_DEFAULTS } = await import(
  pathToFileURL(path.join(root, 'src/lib/tenant-theme.ts')).href
);
const { turnstilePublicConfig, verifyTurnstileToken } = await import(
  pathToFileURL(path.join(root, 'src/lib/turnstile.ts')).href
);
const { resolveVendor } = await import(
  pathToFileURL(path.join(root, 'src/lib/ron-service.ts')).href
);

const now = new Date(Date.UTC(2026, 7, 13)); // Aug 2026
const keys = lastSixMonthKeys(now);
assert(keys.length === 6 && keys[5] === '2026-08', 'six month keys end on current month');
const series = fillSixMonthSeries({ '2026-08': 12500, '2026-03': 500000 }, now);
assert(series.length === 6, 'six points');
assert(series[0].month === '2026-03' && series[0].value === 5000, 'march cents in first bucket');
assert(series[5].month === '2026-08' && series[5].value === 125, 'august cents');
assert(series[1].value === 0, 'empty months are zero');

const spark = sparklinePath(series.map((p) => p.value));
assert(spark.line.startsWith('M '), 'svg path');
assert(spark.area.includes('100 Z') || spark.area.endsWith('Z'), 'closed area');
assert(spark.max >= 5000, 'max from series');

const theme = resolveTenantTheme({ branding: { primary: '#112233', companyName: 'Acme CRO' } }, 'Org');
assert(theme.primary === '#112233', 'tenant primary');
assert(theme.companyName === 'Acme CRO', 'tenant name');
assert(resolveTenantTheme({}).primary === RJ_THEME_DEFAULTS.primary, 'rj default');
assert(resolveTenantTheme({ branding: { primary: 'red' } }).primary === RJ_THEME_DEFAULTS.primary, 'reject invalid hex');

const pub = turnstilePublicConfig({});
assert(pub.enabled === false && pub.siteKey === null, 'turnstile off without keys');
const skip = await verifyTurnstileToken({}, '');
assert(skip.ok && skip.skipped, 'skip verify when secret missing');
const deny = await verifyTurnstileToken({ TURNSTILE_SECRET_KEY: 'secret' }, '');
assert(!deny.ok, 'require token when secret set');

assert(resolveVendor({}) === 'sandbox', 'ron sandbox default');
assert(resolveVendor({ RON_VENDOR: 'proof' }) === 'sandbox', 'proof without key is still sandbox');
assert(resolveVendor({ RON_VENDOR: 'proof', RON_VENDOR_API_KEY: 'k' }) === 'proof', 'live vendor');

console.log('overview-metrics.test.mjs: OK');
