import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const reportId = 'mr2ytbmc3jg5vpgy';
console.log(`Dumping raw_text for report ${reportId} from remote D1...`);

try {
  const output = execSync(
    `npx wrangler d1 execute fcra-detector-production --remote --command="SELECT raw_text FROM credit_reports WHERE id = '${reportId}'" --json`,
    { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 }
  );

  const parsed = JSON.parse(output);
  const rawText = parsed[0].results[0].raw_text;
  
  const destPath = path.join('scratch', 'eq_report.txt');
  fs.mkdirSync('scratch', { recursive: true });
  fs.writeFileSync(destPath, rawText, 'utf-8');
  console.log(`Successfully dumped ${rawText.length} characters to ${destPath}`);
} catch (err) {
  console.error('Failed to dump report:', err.message);
}
