import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfModule = require('pdf-parse');

console.log('pdfModule keys:', Object.keys(pdfModule));
console.log('pdfModule type:', typeof pdfModule);

const files = [
  "C:\\Users\\ricky\\Downloads\\ACR Folder-20260626T023643Z-3-001\\ACR Folder\\Equifax\\EQ - Vacarria Keller.pdf",
  "C:\\Users\\ricky\\Downloads\\ACR Folder-20260626T023643Z-3-001\\ACR Folder\\Experian\\EX - Vaccaria Keller.pdf",
  "C:\\Users\\ricky\\Downloads\\ACR Folder-20260626T023643Z-3-001\\ACR Folder\\Transunion\\TU - Vacaria Keller.pdf"
];

async function checkFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File does not exist: ${filePath}`);
      return;
    }
    const dataBuffer = fs.readFileSync(filePath);
    
    let parseFunc = pdfModule;
    if (typeof pdfModule !== 'function' && typeof pdfModule.default === 'function') {
      parseFunc = pdfModule.default;
    } else if (typeof pdfModule === 'object' && pdfModule !== null) {
      const keys = Object.keys(pdfModule);
      for (const k of keys) {
        if (typeof pdfModule[k] === 'function') {
          parseFunc = pdfModule[k];
          break;
        }
      }
    }
    
    if (typeof parseFunc !== 'function') {
      console.log('Could not find a valid pdf parse function');
      return;
    }

    const data = await parseFunc(dataBuffer);
    console.log(`File: ${filePath}`);
    console.log(`Pages: ${data.numpages}`);
    console.log(`Text Length: ${data.text.trim().length}`);
    console.log(`Snippet: ${data.text.trim().slice(0, 300).replace(/\s+/g, ' ')}`);
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
}

async function run() {
  for (const f of files) {
    await checkFile(f);
  }
}

run();
