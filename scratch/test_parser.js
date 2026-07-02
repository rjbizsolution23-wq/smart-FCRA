import fs from 'fs';
import { parseCreditReportText } from '../src/engine/parser.js';

const text = fs.readFileSync('scratch/equifax_text.txt', 'utf8');
const parsed = parseCreditReportText(text);

console.log('Parsed Bureau:', parsed.bureau);
console.log('Parsed Personal Info:', JSON.stringify(parsed.personalInfo, null, 2));
