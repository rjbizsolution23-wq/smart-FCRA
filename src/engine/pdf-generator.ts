import { jsPDF } from 'jspdf';

export interface PDFReportData {
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientZip: string;
  clientSSNLast4?: string;
  clientDOB?: string;
  clientEmail?: string;
  reportDate: string;
  bureau: string;
  violations: any[];
  litigationScore: number;
  generatedDate: string;
  reportId: string;
  orgName: string;
}

export function generatePDFReport(data: PDFReportData): Uint8Array {
  // Create jsPDF instance (standard portrait, mm, a4)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  let y = margin;

  // Premium Palette
  const primaryBlue = [10, 102, 255]; // #0A66FF
  const deepBlue = [0, 59, 143];      // #003B8F
  const darkGray = [11, 18, 32];      // #0B1220
  const lightGray = [240, 244, 250];  // #F0F4FA
  const borderGray = [220, 225, 230]; // #DCE1E6
  const alertRed = [239, 68, 68];     // #EF4444

  const setTextColor = (color: number[]) => {
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const setDrawColor = (color: number[]) => {
    doc.setDrawColor(color[0], color[1], color[2]);
  };

  const setFillColor = (color: number[]) => {
    doc.setFillColor(color[0], color[1], color[2]);
  };

  // Header Block
  setFillColor(deepBlue);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('FCRA SUPREME AUDIT REPORT', margin, 15);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('RJ Business Solutions • High-Precision Violation Engine', margin, 22);
  doc.text(`Report ID: ${data.reportId}`, pageWidth - margin - 50, 15, { align: 'left' });
  doc.text(`Generated: ${data.generatedDate}`, pageWidth - margin - 50, 22, { align: 'left' });

  y = 50;

  // Metadata Panel (Client Info vs Audit Meta)
  setFillColor(lightGray);
  doc.rect(margin, y, contentWidth, 38, 'F');
  setDrawColor(borderGray);
  doc.rect(margin, y, contentWidth, 38, 'D');

  // Client Details
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  setTextColor(deepBlue);
  doc.text('CLIENT INFORMATION', margin + 5, y + 6);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  setTextColor(darkGray);
  doc.text(`Name: ${data.clientName}`, margin + 5, y + 14);
  doc.text(`Address: ${data.clientAddress}`, margin + 5, y + 20);
  doc.text(`City/ST/Zip: ${data.clientCity}, ${data.clientState} ${data.clientZip}`, margin + 5, y + 26);
  doc.text(`Email: ${data.clientEmail || 'N/A'}`, margin + 5, y + 32);

  // Report Details
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  setTextColor(deepBlue);
  doc.text('AUDIT METADATA', margin + 100, y + 6);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  setTextColor(darkGray);
  doc.text(`Credit Bureau: ${data.bureau.toUpperCase()}`, margin + 100, y + 14);
  doc.text(`Report Date: ${data.reportDate}`, margin + 100, y + 20);
  doc.text(`DOB: ${data.clientDOB || 'N/A'}`, margin + 100, y + 26);
  doc.text(`SSN (Last 4): ${data.clientSSNLast4 ? `***-**-${data.clientSSNLast4}` : 'N/A'}`, margin + 100, y + 32);

  y += 48;

  // Score Banner
  setFillColor(primaryBlue);
  doc.rect(margin, y, contentWidth, 14, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(`LITIGATION VIABILITY SCORE: ${data.litigationScore} / 100`, margin + 5, y + 9);

  // Status Badge right-aligned in banner
  const scoreStatus = data.litigationScore >= 70 ? 'HIGH PROBABILITY' : data.litigationScore >= 40 ? 'MEDIUM PROBABILITY' : 'LOW PROBABILITY';
  doc.text(scoreStatus, pageWidth - margin - 5, y + 9, { align: 'right' });

  y += 24;

  // Violations Header
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  setTextColor(deepBlue);
  doc.text('IDENTIFIED STATUTORY VIOLATIONS', margin, y);

  // Horizontal separator line
  setDrawColor(primaryBlue);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);

  y += 8;

  if (!data.violations || data.violations.length === 0) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    setTextColor(darkGray);
    doc.text('No statutory or regulatory violations were detected in this credit report segment.', margin, y + 5);
  } else {
    data.violations.forEach((violation: any, index: number) => {
      // Clean raw markdown if present in any of the fields
      const cleanCategory = stripMarkdown(violation.category || 'FCRA Inaccuracy');
      const cleanAccount = stripMarkdown(violation.accountName || violation.creditorName || 'Inquiry / Demographic File');
      const cleanDescription = stripMarkdown(violation.description || 'Statutory inaccuracy detected.');

      // Split description text and calculate dynamic card size
      const descLines = doc.splitTextToSize(cleanDescription, contentWidth - 15);
      const lineCount = descLines.length;
      const cardHeight = 18 + (lineCount * 4.0); // 26mm height if lineCount is 2, matching the premium spacing perfectly

      // Check for page overflow dynamically based on calculated height
      if (y + cardHeight + 10 > pageHeight - margin) {
        doc.addPage();
        y = margin + 10;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        setTextColor(deepBlue);
        doc.text('IDENTIFIED STATUTORY VIOLATIONS (CONTINUED)', margin, y);
        setDrawColor(primaryBlue);
        doc.line(margin, y + 2, pageWidth - margin, y + 2);
        y += 10;
      }

      // Draw violation card background
      setFillColor(lightGray);
      doc.rect(margin, y, contentWidth, cardHeight, 'F');
      setDrawColor(borderGray);
      doc.rect(margin, y, contentWidth, cardHeight, 'D');

      // Violation Indicator Badge (Red bar)
      setFillColor(alertRed);
      doc.rect(margin, y, 2, cardHeight, 'F');

      // Index and Category
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      setTextColor(alertRed);
      doc.text(`Violation #${index + 1}: ${cleanCategory}`, margin + 5, y + 6);

      // Account / Creditor Name
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      setTextColor(darkGray);
      doc.text(`Account / Item: ${cleanAccount}`, margin + 5, y + 12);

      // Description text (Split long text to fit)
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      setTextColor(darkGray);
      doc.text(descLines, margin + 5, y + 18);

      y += cardHeight + 6; // Spacing of 6mm between cards
    });
  }

  // Draw Footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    setDrawColor(borderGray);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    setTextColor(darkGray);
    doc.text('Built by Rick Jefferson | Powered by RJ Business Solutions', margin, pageHeight - 10);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  // Output Uint8Array
  return new Uint8Array(doc.output('arraybuffer'));
}

/**
 * Robustly strips out standard markdown formatting syntax to ensure plain text accuracy.
 */
function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')        // Bold double asterisks
    .replace(/\*([^*]+)\*/g, '$1')            // Italic single asterisk
    .replace(/_([^_]+)_/g, '$1')              // Italic single underscore
    .replace(/`([^`]+)`/g, '$1')              // Monospace backticks
    .replace(/#+\s+/g, '')                    // Markdown Headers
    .replace(/[-*+]\s+/g, '')                 // List bullet points at line starts
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // Markdown links [text](url) -> text
    .trim();
}

