// Casebook PDF renderer — the new consolidated per-patient case summary
// brief (Track B redesign), replacing the old per-prescription
// casebook_entries[] timeline. Multi-section: patient info, one consolidated
// overview paragraph, then a chronological visit history with diagnosis +
// medicines per visit.
import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";

const PAGE_WIDTH = 595.27;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLORS = {
  tealPrimary: rgb(0x0b / 255, 0x6e / 255, 0x6e / 255),
  tealLight: rgb(0xf0 / 255, 0xf7 / 255, 0xf7 / 255),
  textPrimary: rgb(0x11 / 255, 0x18 / 255, 0x27 / 255),
  textMuted: rgb(0x6b / 255, 0x72 / 255, 0x80 / 255),
  textFaint: rgb(0x9c / 255, 0xa3 / 255, 0xaf / 255),
  gridLine: rgb(0xe5 / 255, 0xe7 / 255, 0xeb / 255),
};

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(trial, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export interface CasebookVisit {
  date: string;
  diagnosis?: string;
  symptoms?: string[];
  medicines: string[];
  labTests?: string[];
  advice?: string;
  referredTo?: string;
  followUpDate?: string;
}

export interface CasebookPdfInput {
  clinicName: string;
  patientName: string;
  patientAge?: number | string;
  patientGender?: string;
  bloodGroup?: string;
  allergies?: string;
  caseSummary?: string;
  visits: CasebookVisit[];
  logoPngBytes?: Uint8Array;
}

export async function renderCasebookPdf(input: CasebookPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Case Summary - ${input.patientName}`);
  doc.setCreator("PrescoPad");

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE_HEIGHT - MARGIN;

  const newPageIfNeeded = (needed: number) => {
    if (y - needed < MARGIN + 40) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  if (input.logoPngBytes) {
    try {
      const logoImage = await doc.embedPng(input.logoPngBytes);
      const scaled = logoImage.scaleToFit(44, 44);
      page.drawImage(logoImage, { x: MARGIN, y: y - scaled.height, width: scaled.width, height: scaled.height });
    } catch {
      // Skip silently on corrupt logo bytes.
    }
  }
  y -= 50;

  page.drawText("Case Summary", { x: MARGIN, y, size: 20, font: fontBold, color: COLORS.tealPrimary });
  y -= 20;
  page.drawText(input.clinicName, { x: MARGIN, y, size: 11, font: fontRegular, color: COLORS.textMuted });
  y -= 20;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_WIDTH, y }, thickness: 2, color: COLORS.tealPrimary });
  y -= 20;

  // ── Patient info ──
  page.drawText("Patient Information", { x: MARGIN, y, size: 12, font: fontBold, color: COLORS.tealPrimary });
  y -= 16;
  const infoLine = `${input.patientName}   |   Age: ${input.patientAge ?? "-"}   |   Gender: ${input.patientGender ?? "-"}${input.bloodGroup ? `   |   Blood Group: ${input.bloodGroup}` : ""}`;
  page.drawText(infoLine, { x: MARGIN, y, size: 10, font: fontRegular, color: COLORS.textPrimary });
  y -= 14;
  if (input.allergies) {
    page.drawText(`Allergies: ${input.allergies}`, { x: MARGIN, y, size: 10, font: fontRegular, color: COLORS.textPrimary });
    y -= 14;
  }
  y -= 10;

  // ── Overview ──
  if (input.caseSummary) {
    page.drawText("Overview", { x: MARGIN, y, size: 12, font: fontBold, color: COLORS.tealPrimary });
    y -= 16;
    const lines = wrapText(input.caseSummary, fontRegular, 10, CONTENT_WIDTH - 20);
    const boxHeight = lines.length * 14 + 16;
    page.drawRectangle({ x: MARGIN, y: y - boxHeight + 12, width: CONTENT_WIDTH, height: boxHeight, color: COLORS.tealLight });
    let innerY = y;
    for (const line of lines) {
      page.drawText(line, { x: MARGIN + 10, y: innerY, size: 10, font: fontRegular, color: COLORS.textPrimary });
      innerY -= 14;
    }
    y = innerY - 10;
  }

  // ── Visit history ──
  newPageIfNeeded(30);
  page.drawText("Visit History", { x: MARGIN, y, size: 12, font: fontBold, color: COLORS.tealPrimary });
  y -= 18;

  const sorted = [...input.visits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (const visit of sorted) {
    newPageIfNeeded(60);
    const dateStr = new Date(visit.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    // Visit header row with teal background
    page.drawRectangle({ x: MARGIN, y: y - 3, width: CONTENT_WIDTH, height: 17, color: COLORS.tealLight });
    page.drawText(dateStr, { x: MARGIN + 4, y, size: 10, font: fontBold, color: COLORS.tealPrimary });
    if (visit.diagnosis) {
      const dxText = `Dx: ${visit.diagnosis}`;
      page.drawText(dxText, { x: MARGIN + 130, y, size: 10, font: fontBold, color: COLORS.textPrimary });
    }
    y -= 18;

    // Symptoms
    if (visit.symptoms && visit.symptoms.length > 0) {
      newPageIfNeeded(14);
      const lines = wrapText(`Symptoms: ${visit.symptoms.join(", ")}`, fontRegular, 9, CONTENT_WIDTH - 16);
      for (const line of lines) {
        page.drawText(line, { x: MARGIN + 8, y, size: 9, font: fontRegular, color: COLORS.textMuted });
        y -= 12;
      }
    }

    // Medicines
    if (visit.medicines.length) {
      newPageIfNeeded(14);
      page.drawText("Medicines:", { x: MARGIN + 8, y, size: 9, font: fontBold, color: COLORS.textMuted });
      y -= 12;
      const lines = wrapText(visit.medicines.join(", "), fontRegular, 9, CONTENT_WIDTH - 20);
      for (const line of lines) {
        newPageIfNeeded(12);
        page.drawText(`  • ${line}`, { x: MARGIN + 12, y, size: 9, font: fontRegular, color: COLORS.textMuted });
        y -= 12;
      }
    }

    // Lab Tests
    if (visit.labTests && visit.labTests.length > 0) {
      newPageIfNeeded(14);
      const lines = wrapText(`Tests: ${visit.labTests.join(", ")}`, fontRegular, 9, CONTENT_WIDTH - 16);
      for (const line of lines) {
        page.drawText(line, { x: MARGIN + 8, y, size: 9, font: fontRegular, color: COLORS.textMuted });
        y -= 12;
      }
    }

    // Advice
    if (visit.advice) {
      newPageIfNeeded(14);
      const lines = wrapText(`Advice: ${visit.advice}`, fontRegular, 9, CONTENT_WIDTH - 16);
      for (const line of lines) {
        page.drawText(line, { x: MARGIN + 8, y, size: 9, font: fontRegular, color: COLORS.textMuted });
        y -= 12;
      }
    }

    // Referred / Follow-up
    if (visit.referredTo) {
      newPageIfNeeded(12);
      page.drawText(`Referred to: ${visit.referredTo}`, { x: MARGIN + 8, y, size: 9, font: fontRegular, color: COLORS.textMuted });
      y -= 12;
    }
    if (visit.followUpDate) {
      newPageIfNeeded(12);
      page.drawText(`Follow-up: ${visit.followUpDate}`, { x: MARGIN + 8, y, size: 9, font: fontRegular, color: COLORS.textMuted });
      y -= 12;
    }

    y -= 8;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_WIDTH, y }, thickness: 0.3, color: COLORS.gridLine });
    y -= 10;
  }

  newPageIfNeeded(20);
  y -= 6;
  const footerText = "Generated by PrescoPad — Digital Clinic System";
  const footerWidth = fontRegular.widthOfTextAtSize(footerText, 8);
  page.drawText(footerText, { x: MARGIN + (CONTENT_WIDTH - footerWidth) / 2, y, size: 8, font: fontRegular, color: COLORS.textFaint });

  return doc.save();
}
