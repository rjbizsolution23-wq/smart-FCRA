import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfModule = require('pdf-parse');

const filePath = "C:\\Users\\ricky\\Downloads\\ACR Folder-20260626T023643Z-3-001\\ACR Folder\\Equifax\\EQ - Vacarria Keller.pdf";

async function run() {
  try {
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
    
    // In our previous step, pdfModule.PDFParse was a constructor
    if (pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse();
      const doc = await parser.load(dataBuffer); // Wait, how to use PDFParse? Let's check how pdfModule is structured.
    }
    
    // Let's use a simpler tool: we can run a powershell command to find the text if we can, or let's use node with pdf-parse if it has default export or similar
    // Wait, the error in the previous run was "Class constructor gr cannot be invoked without 'new'".
    // That means "parseFunc" was called without 'new', but it was a class constructor!
    // Yes! pdfModule.PDFParse is a class constructor, or pdfModule is itself some class.
    // Let's inspect pdfModule keys again.
    
  } catch (err) {
    console.error(err);
  }
}

run();
