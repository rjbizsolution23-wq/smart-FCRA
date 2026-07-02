const fs = require('fs');
const pdf = require('pdf-parse');

const filePath = "C:\\Users\\ricky\\Downloads\\ACR Folder-20260626T023643Z-3-001\\ACR Folder\\Equifax\\Ashley Pointer - EQUIFAX.pdf";

if (!fs.existsSync(filePath)) {
  console.error("File does not exist:", filePath);
  process.exit(1);
}

const dataBuffer = fs.readFileSync(filePath);

pdf(dataBuffer).then(function(data) {
  // Output first 2000 characters of the text
  console.log("=== METADATA ===");
  console.log(data.info);
  console.log("=== TEXT PREVIEW ===");
  console.log(data.text.substring(0, 3000));
}).catch(err => {
  console.error("Error parsing PDF:", err);
});
