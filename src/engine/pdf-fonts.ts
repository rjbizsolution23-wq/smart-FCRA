import type { jsPDF } from 'jspdf';
import { SPACE_GROTESK_BOLD, SPACE_GROTESK_REGULAR } from './fonts/space-grotesk';

export const PDF_BRAND_FONT = 'SpaceGrotesk';

/**
 * Register Latin-subset Space Grotesk on a jsPDF instance (Workers-safe, no fetch).
 * Falls back to Helvetica if the TTF cannot be parsed.
 */
export function registerBrandFonts(doc: jsPDF): string {
  try {
    const list = doc.getFontList?.() || {};
    if (!list[PDF_BRAND_FONT]) {
      doc.addFileToVFS('SpaceGrotesk-Regular.ttf', SPACE_GROTESK_REGULAR);
      doc.addFileToVFS('SpaceGrotesk-Bold.ttf', SPACE_GROTESK_BOLD);
      doc.addFont('SpaceGrotesk-Regular.ttf', PDF_BRAND_FONT, 'normal');
      doc.addFont('SpaceGrotesk-Bold.ttf', PDF_BRAND_FONT, 'bold');
    }
    return PDF_BRAND_FONT;
  } catch (e) {
    console.warn('[pdf] Space Grotesk unavailable, using Helvetica', e);
    return 'Helvetica';
  }
}

export function setPdfFont(doc: jsPDF, family: string, style: 'normal' | 'bold' = 'normal'): void {
  try {
    doc.setFont(family, style);
  } catch {
    doc.setFont('Helvetica', style === 'bold' ? 'bold' : 'normal');
  }
}
