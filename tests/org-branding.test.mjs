/**
 * Org letterhead → PDF/email branding wiring
 * Run: npx tsx tests/org-branding.test.mjs
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
  normalizeOrgLetterhead,
  mergeLetterheadIntoSettings,
  brandLetterContent,
  buildFirmLetterheadBlock,
} = await import(pathToFileURL(path.join(root, 'src/lib/org-branding.ts')).href);

{
  const settings = {
    letterhead: {
      firmName: 'Jefferson Credit Advocacy',
      attorneyName: 'Rick Jefferson',
      address: '1342 NM 333',
      city: 'Tijeras',
      state: 'NM',
      zip: '87059',
      phone: '505-555-0100',
      email: 'ops@example.com',
      barNumber: 'NM-12345',
      logoBase64: 'data:image/png;base64,' + 'A'.repeat(80),
      isHiredAdvocate: true,
    },
  };
  const { letterhead, flatPatch } = normalizeOrgLetterhead(settings, 'Org Display');
  assert(letterhead.firmName === 'Jefferson Credit Advocacy', 'firm name');
  assert(letterhead.configured === true, 'configured');
  assert(letterhead.isHiredAdvocate === true, 'advocate');
  assert(!!flatPatch.letterhead_logo_base64, 'logo flattened');
  assert(flatPatch.company_name === 'Jefferson Credit Advocacy', 'company_name flat');
  assert(String(flatPatch.letterhead_subtext).includes('Tijeras'), 'subtext has city');
  console.log('✓ nested letterhead → flat PDF keys');
}

{
  const next = mergeLetterheadIntoSettings({}, {
    firmName: 'CRO Firm LLC',
    address: '100 Main St',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    email: 'hello@cro.test',
  }, 'CRO Firm LLC');
  assert(next.letterhead.firmName === 'CRO Firm LLC', 'nested saved');
  assert(next.company_name === 'CRO Firm LLC', 'flat company');
  assert(!!next.letterhead_title, 'title');
  assert(String(next.business_address).includes('Austin'), 'address flat');
  console.log('✓ mergeLetterheadIntoSettings flattens keys');
}

{
  const lh = normalizeOrgLetterhead({
    letterhead: { firmName: 'Acme Advocacy', attorneyName: 'Jane Doe', phone: '555-0100' },
  }).letterhead;
  const body = 'John Client\n1 Main St\n\nDear Bureau:';
  const branded = brandLetterContent(body, lh);
  assert(branded.startsWith('ACME ADVOCACY'), 'header prepended');
  assert(branded.includes('Jane Doe'), 'attorney');
  assert(branded.includes('Dear Bureau:'), 'body kept');
  assert(brandLetterContent(branded, lh) === branded, 'idempotent');
  console.log('✓ brandLetterContent prepends once');
}

{
  const lh = normalizeOrgLetterhead({}).letterhead;
  assert(buildFirmLetterheadBlock(lh) === '', 'empty when unconfigured');
  console.log('✓ unconfigured letterhead is empty');
}

console.log('org-branding tests passed');
