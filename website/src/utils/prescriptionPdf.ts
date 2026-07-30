import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

const PAGE_WIDTH = 595.27;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLORS = {
  tealPrimary: rgb(0x0b / 255, 0x6e / 255, 0x6e / 255),
  tealLight: rgb(0xf0 / 255, 0xf7 / 255, 0xf7 / 255),
  textPrimary: rgb(0x11 / 255, 0x18 / 255, 0x27 / 255),
  textSecondary: rgb(0x55 / 255, 0x55 / 255, 0x55 / 255),
  textMuted: rgb(0x6b / 255, 0x72 / 255, 0x80 / 255),
  textFaint: rgb(0x9c / 255, 0xa3 / 255, 0xaf / 255),
  diagBg: rgb(0xf0 / 255, 0xf9 / 255, 0xff / 255),
  diagBorder: rgb(0x1d / 255, 0x6f / 255, 0xa4 / 255),
  adviceBg: rgb(0xff / 255, 0xfb / 255, 0xeb / 255),
  adviceBorder: rgb(0xd9 / 255, 0x76 / 255, 0x06 / 255),
  redAccent: rgb(0xdc / 255, 0x26 / 255, 0x26 / 255),
  gridLine: rgb(0xe5 / 255, 0xe7 / 255, 0xeb / 255),
  hashColor: rgb(0xd1 / 255, 0xd5 / 255, 0xdb / 255),
  white: rgb(1, 1, 1),
};

export interface Medicine {
  medicineName?: string;
  medicine_name?: string;
  name?: string;
  type?: string;
  frequency?: string;
  duration?: string;
  timing?: string;
  notes?: string;
}

export interface LabTest {
  testName?: string;
  test_name?: string;
  notes?: string;
}

export interface PrescriptionPdfInput {
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  doctorName: string;
  qualification?: string;
  regNumber?: string;
  patientName: string;
  patientAge?: number | string;
  patientGender?: string;
  date: Date;
  consultationType?: string; // "New Consultation" | "Follow-up"
  symptoms?: string[];
  diagnosis?: string;
  medicines?: Medicine[];
  labTests?: LabTest[];
  advice?: string;
  referredTo?: string;
  followUpDate?: string;
  signatureSvgPath?: string; // "M x y L x y ..."
  pdfHash?: string;
  logoPngBytes?: Uint8Array;
  qrPngBytes?: Uint8Array;
  isMlc?: boolean;
  attachCertificate?: CertificatePdfInput;
  attachReceipt?: ReceiptPdfInput;
}


function sanitizeWinAnsi(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/₹/g, "Rs.")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/•/g, "-")
    .replace(/…/g, "...")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x00-\xFF]/g, "");
}

function wrapText(rawText: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const text = sanitizeWinAnsi(rawText);
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

function parseSignaturePath(path: string): { x: number; y: number }[][] {
  const tokens = path.trim().split(/\s+/);
  const strokes: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i];
    if (cmd === "M") {
      if (current.length) strokes.push(current);
      current = [{ x: parseFloat(tokens[i + 1]), y: parseFloat(tokens[i + 2]) }];
      i += 3;
    } else if (cmd === "L") {
      current.push({ x: parseFloat(tokens[i + 1]), y: parseFloat(tokens[i + 2]) });
      i += 3;
    } else {
      i += 1;
    }
  }
  if (current.length) strokes.push(current);
  return strokes;
}

function drawSignature(
  page: PDFPage,
  path: string,
  box: { x: number; y: number; width: number; height: number },
) {
  const strokes = parseSignaturePath(path);
  const allPoints = strokes.flat();
  if (!allPoints.length) return;

  const minX = Math.min(...allPoints.map((p) => p.x));
  const maxX = Math.max(...allPoints.map((p) => p.x));
  const minY = Math.min(...allPoints.map((p) => p.y));
  const maxY = Math.max(...allPoints.map((p) => p.y));
  const srcWidth = Math.max(maxX - minX, 1);
  const srcHeight = Math.max(maxY - minY, 1);

  const scale = Math.min(box.width / srcWidth, box.height / srcHeight);
  const drawnWidth = srcWidth * scale;
  const drawnHeight = srcHeight * scale;
  const offsetX = box.x + (box.width - drawnWidth) / 2;
  const offsetY = box.y + (box.height - drawnHeight) / 2;

  for (const stroke of strokes) {
    for (let i = 0; i < stroke.length - 1; i++) {
      const a = stroke[i];
      const b = stroke[i + 1];
      page.drawLine({
        start: {
          x: offsetX + (a.x - minX) * scale,
          y: offsetY + drawnHeight - (a.y - minY) * scale,
        },
        end: {
          x: offsetX + (b.x - minX) * scale,
          y: offsetY + drawnHeight - (b.y - minY) * scale,
        },
        thickness: 1.5,
        color: rgb(0x0f / 255, 0x17 / 255, 0x2a / 255),
      });
    }
  }
}

export async function renderPrescriptionPdf(input: PrescriptionPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Prescription - ${input.patientName}`);
  doc.setAuthor(`Dr. ${input.doctorName}`);
  doc.setSubject("Medical Prescription");
  doc.setCreator("PrescoPad");

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  let y = PAGE_HEIGHT - MARGIN;

  const newPageIfNeeded = (needed: number) => {
    if (y - needed < MARGIN + 80) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const drawLine = (opts: { x1: number; y1: number; x2: number; y2: number; thickness: number; color: ReturnType<typeof rgb> }) => {
    page.drawLine({
      start: { x: opts.x1, y: opts.y1 },
      end: { x: opts.x2, y: opts.y2 },
      thickness: opts.thickness,
      color: opts.color,
    });
  };

  if (input.logoPngBytes) {
    try {
      const logoImage = await doc.embedPng(input.logoPngBytes);
      const logoSize = 44;
      const scaled = logoImage.scaleToFit(logoSize, logoSize);
      page.drawImage(logoImage, {
        x: MARGIN,
        y: y - scaled.height,
        width: scaled.width,
        height: scaled.height,
      });
    } catch {
      // Skip silently
    }
  }
  y -= 50;

  const clinicNameSize = 20;
  const clinicNameWidth = fontBold.widthOfTextAtSize(input.clinicName, clinicNameSize);
  page.drawText(input.clinicName, {
    x: MARGIN + (CONTENT_WIDTH - clinicNameWidth) / 2,
    y,
    size: clinicNameSize,
    font: fontBold,
    color: COLORS.tealPrimary,
  });
  y -= 24;

  const doctorLineParts = [`Dr. ${input.doctorName}`];
  if (input.qualification) doctorLineParts.push(input.qualification);
  if (input.regNumber) doctorLineParts.push(`Reg: ${input.regNumber}`);
  const doctorLine = doctorLineParts.join("  |  ");
  const doctorLineWidth = fontBold.widthOfTextAtSize(doctorLine, 13);
  page.drawText(doctorLine, {
    x: MARGIN + (CONTENT_WIDTH - doctorLineWidth) / 2,
    y,
    size: 13,
    font: fontBold,
    color: COLORS.textPrimary,
  });
  y -= 18;

  if (input.clinicAddress) {
    const w = fontRegular.widthOfTextAtSize(input.clinicAddress, 9);
    page.drawText(input.clinicAddress, {
      x: MARGIN + (CONTENT_WIDTH - w) / 2,
      y,
      size: 9,
      font: fontRegular,
      color: COLORS.textMuted,
    });
    y -= 13;
  }
  const contactParts = [input.clinicPhone, input.clinicEmail].filter(Boolean);
  if (contactParts.length) {
    const contactLine = contactParts.join("  |  ");
    const w = fontRegular.widthOfTextAtSize(contactLine, 9);
    page.drawText(contactLine, {
      x: MARGIN + (CONTENT_WIDTH - w) / 2,
      y,
      size: 9,
      font: fontRegular,
      color: COLORS.textMuted,
    });
    y -= 13;
  }

  y -= 6;
  drawLine({ x1: MARGIN, y1: y, x2: MARGIN + CONTENT_WIDTH, y2: y, thickness: 2, color: COLORS.tealPrimary });
  y -= 14;

  if (input.consultationType) {
    page.drawText(input.consultationType, {
      x: MARGIN,
      y,
      size: 9,
      font: fontBold,
      color: COLORS.tealPrimary,
    });
    y -= 16;
  }

  const patientLeft = `Patient: ${input.patientName}     Age: ${input.patientAge ?? ""}     Gender: ${input.patientGender ?? ""}`;
  const dateStr = input.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const patientRight = `Date: ${dateStr}`;
  drawLine({ x1: MARGIN, y1: y + 8, x2: MARGIN + CONTENT_WIDTH, y2: y + 8, thickness: 0.5, color: COLORS.gridLine });
  page.drawText(patientLeft, { x: MARGIN, y, size: 10, font: fontRegular, color: COLORS.textPrimary });
  const rightWidth = fontRegular.widthOfTextAtSize(patientRight, 10);
  page.drawText(patientRight, { x: MARGIN + CONTENT_WIDTH - rightWidth, y, size: 10, font: fontRegular, color: COLORS.textMuted });
  y -= 8;
  drawLine({ x1: MARGIN, y1: y, x2: MARGIN + CONTENT_WIDTH, y2: y, thickness: 0.5, color: COLORS.gridLine });
  y -= 16;

  const drawSectionTitle = (title: string) => {
    newPageIfNeeded(24);
    page.drawText(title, { x: MARGIN, y, size: 12, font: fontBold, color: COLORS.tealPrimary });
    y -= 16;
  };

  const drawWrappedParagraph = (text: string, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; maxWidth?: number; x?: number } = {}) => {
    const size = opts.size ?? 10;
    const font = opts.font ?? fontRegular;
    const color = opts.color ?? COLORS.textPrimary;
    const maxWidth = opts.maxWidth ?? CONTENT_WIDTH;
    const x = opts.x ?? MARGIN;
    const lines = wrapText(text, font, size, maxWidth);
    for (const line of lines) {
      newPageIfNeeded(14);
      page.drawText(line, { x, y, size, font, color });
      y -= 14;
    }
  };

  if (input.symptoms?.length) {
    drawSectionTitle("Symptoms");
    drawWrappedParagraph(input.symptoms.join(", "));
    y -= 6;
  }

  if (input.diagnosis) {
    drawSectionTitle("Diagnosis");
    newPageIfNeeded(30);
    const boxTop = y + 8;
    const lines = wrapText(input.diagnosis, fontRegular, 10, CONTENT_WIDTH - 24);
    const boxHeight = lines.length * 14 + 16;
    page.drawRectangle({ x: MARGIN, y: boxTop - boxHeight, width: CONTENT_WIDTH, height: boxHeight, color: COLORS.diagBg });
    page.drawRectangle({ x: MARGIN, y: boxTop - boxHeight, width: 3, height: boxHeight, color: COLORS.diagBorder });
    let innerY = boxTop - 12;
    for (const line of lines) {
      page.drawText(line, { x: MARGIN + 12, y: innerY, size: 10, font: fontRegular, color: COLORS.textPrimary });
      innerY -= 14;
    }
    y = boxTop - boxHeight - 10;
  }

  if (input.medicines?.length) {
    newPageIfNeeded(40);
    page.drawText("Rx  Medicines", { x: MARGIN, y, size: 16, font: fontBold, color: COLORS.tealPrimary });
    y -= 20;

    const colWidths = [0.05, 0.28, 0.18, 0.12, 0.20, 0.17].map((f) => f * CONTENT_WIDTH);
    const headers = ["#", "Medicine Name", "Dosage", "Duration", "Food Timing", "Instructions"];
    const rowHeight = 20;

    const drawTableHeader = () => {
      let colX = MARGIN;
      page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: CONTENT_WIDTH, height: rowHeight, color: COLORS.tealPrimary });
      for (let c = 0; c < headers.length; c++) {
        page.drawText(headers[c], { x: colX + 6, y: y - 14, size: 9, font: fontBold, color: COLORS.white });
        colX += colWidths[c];
      }
      y -= rowHeight;
    };

    drawTableHeader();

    input.medicines.forEach((m, idx) => {
      newPageIfNeeded(rowHeight + 10);
      if (y === PAGE_HEIGHT - MARGIN) drawTableHeader();

      const medName = m.medicineName || m.medicine_name || m.name || "";
      const medDisplay = m.type ? `${medName}, ${m.type}` : medName;
      const cells = [String(idx + 1), medDisplay, m.frequency ?? "", m.duration ?? "", m.timing ?? "", m.notes ?? ""];

      if (idx % 2 === 1) {
        page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: CONTENT_WIDTH, height: rowHeight, color: COLORS.tealLight });
      }
      let colX = MARGIN;
      for (let c = 0; c < cells.length; c++) {
        const safeCell = sanitizeWinAnsi(cells[c]);
        const truncated = fontRegular.widthOfTextAtSize(safeCell, 9) > colWidths[c] - 10
          ? safeCell.slice(0, Math.max(3, Math.floor((colWidths[c] - 10) / 5))) + "..."
          : safeCell;
        page.drawText(truncated, {
          x: colX + 6,
          y: y - 14,
          size: 9,
          font: c === 1 ? fontBold : fontRegular,
          color: COLORS.textPrimary,
        });
        colX += colWidths[c];
      }
      drawLine({ x1: MARGIN, y1: y - rowHeight, x2: MARGIN + CONTENT_WIDTH, y2: y - rowHeight, thickness: 0.5, color: COLORS.gridLine });
      y -= rowHeight;
    });
    y -= 10;
  }

  if (input.labTests?.length) {
    drawSectionTitle("Lab Tests / Investigations");
    for (const t of input.labTests) {
      newPageIfNeeded(16);
      const testName = sanitizeWinAnsi(t.testName || t.test_name || "");
      const notes = sanitizeWinAnsi(t.notes);
      const line = notes ? `- ${testName} - ${notes}` : `- ${testName}`;
      page.drawText(line, { x: MARGIN + 4, y, size: 10, font: fontRegular, color: COLORS.textPrimary });
      y -= 16;
    }
    y -= 4;
  }

  if (input.advice) {
    drawSectionTitle("Special Instructions / Doctor's Notes");
    newPageIfNeeded(30);
    const boxTop = y + 8;
    const lines = wrapText(input.advice, fontRegular, 10, CONTENT_WIDTH - 20);
    const boxHeight = lines.length * 14 + 16;
    page.drawRectangle({ x: MARGIN, y: boxTop - boxHeight, width: CONTENT_WIDTH, height: boxHeight, color: COLORS.tealLight, borderColor: COLORS.tealPrimary, borderWidth: 1 });
    let innerY = boxTop - 12;
    for (const line of lines) {
      page.drawText(line, { x: MARGIN + 10, y: innerY, size: 10, font: fontRegular, color: COLORS.textPrimary });
      innerY -= 14;
    }
    y = boxTop - boxHeight - 10;
  }

  if (input.referredTo) {
    drawSectionTitle("Referred To");
    page.drawText(input.referredTo, { x: MARGIN, y, size: 10, font: fontBold, color: COLORS.textPrimary });
    y -= 16;
  }

  if (input.followUpDate) {
    newPageIfNeeded(20);
    let followUpStr = input.followUpDate;
    try {
      followUpStr = new Date(input.followUpDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      // Keep raw string
    }
    page.drawText(`Follow-up: ${followUpStr}`, { x: MARGIN, y, size: 11, font: fontBold, color: COLORS.redAccent });
    y -= 20;
  }

  newPageIfNeeded(90);
  y -= 10;
  drawLine({ x1: MARGIN, y1: y, x2: MARGIN + CONTENT_WIDTH, y2: y, thickness: 0.5, color: COLORS.gridLine });
  y -= 8;

  const sigBlockTop = y;
  const sigBoxHeight = 60;

  if (input.qrPngBytes) {
    try {
      const qrImage = await doc.embedPng(input.qrPngBytes);
      const qrSize = 60;
      page.drawImage(qrImage, { x: MARGIN, y: sigBlockTop - qrSize, width: qrSize, height: qrSize });
      page.drawText("Scan for Payment / Details", { x: MARGIN, y: sigBlockTop - qrSize - 10, size: 7, font: fontRegular, color: COLORS.textFaint });
    } catch {
      // Skip
    }
  }

  if (input.signatureSvgPath) {
    drawSignature(page, input.signatureSvgPath, {
      x: MARGIN + CONTENT_WIDTH - 150,
      y: sigBlockTop - sigBoxHeight,
      width: 150,
      height: sigBoxHeight,
    });
  }

  const sigNameY = sigBlockTop - sigBoxHeight - 12;
  const sigName = `Dr. ${input.doctorName}`;
  const sigNameWidth = fontBold.widthOfTextAtSize(sigName, 11);
  page.drawText(sigName, { x: MARGIN + CONTENT_WIDTH - sigNameWidth, y: sigNameY, size: 11, font: fontBold, color: COLORS.textPrimary });
  let footerLineY = sigNameY - 14;
  if (input.qualification) {
    const w = fontRegular.widthOfTextAtSize(input.qualification, 9);
    page.drawText(input.qualification, { x: MARGIN + CONTENT_WIDTH - w, y: footerLineY, size: 9, font: fontRegular, color: COLORS.textMuted });
    footerLineY -= 12;
  }
  if (input.regNumber) {
    const regText = `Reg. No: ${input.regNumber}`;
    const w = fontRegular.widthOfTextAtSize(regText, 9);
    page.drawText(regText, { x: MARGIN + CONTENT_WIDTH - w, y: footerLineY, size: 9, font: fontRegular, color: COLORS.textMuted });
    footerLineY -= 12;
  }

  // MLC Banner if Medico-Legal Case
  if (input.isMlc) {
    const mlcBannerText = "[ MEDICO-LEGAL CASE (MLC) ]";
    page.drawRectangle({
      x: MARGIN,
      y: y - 2,
      width: CONTENT_WIDTH,
      height: 18,
      color: rgb(0xfe / 255, 0xf2 / 255, 0xf2 / 255),
      borderColor: COLORS.redAccent,
      borderWidth: 1,
    });
    const mlcW = fontBold.widthOfTextAtSize(mlcBannerText, 10);
    page.drawText(mlcBannerText, {
      x: MARGIN + (CONTENT_WIDTH - mlcW) / 2,
      y: y + 2,
      size: 10,
      font: fontBold,
      color: COLORS.redAccent,
    });
    y -= 24;
  }

  y = Math.min(footerLineY, sigBlockTop - sigBoxHeight - 12) - 16;

  newPageIfNeeded(24);
  drawLine({ x1: MARGIN, y1: y, x2: MARGIN + CONTENT_WIDTH, y2: y, thickness: 0.5, color: COLORS.gridLine });
  y -= 12;
  const footerText = "Generated by PrescoPad - Digital Prescription System";
  const footerWidth = fontRegular.widthOfTextAtSize(footerText, 8);
  page.drawText(footerText, { x: MARGIN + (CONTENT_WIDTH - footerWidth) / 2, y, size: 8, font: fontRegular, color: COLORS.textFaint });
  y -= 11;
  if (input.pdfHash) {
    const hashText = `Verification Hash: ${input.pdfHash}`;
    const hashWidth = fontMono.widthOfTextAtSize(hashText, 7);
    page.drawText(hashText, { x: MARGIN + (CONTENT_WIDTH - hashWidth) / 2, y, size: 7, font: fontMono, color: COLORS.hashColor });
  }

  // Append attached Medical Certificate (Page 2) if checked
  if (input.attachCertificate) {
    await drawCertificatePage(doc, input.attachCertificate);
  }

  // Append attached Receipt (Page 3) if checked
  if (input.attachReceipt) {
    await drawReceiptPage(doc, input.attachReceipt);
  }

  return doc.save();
}

export async function drawCertificatePage(doc: PDFDocument, input: CertificatePdfInput) {
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  let y = PAGE_HEIGHT - MARGIN;

  // Header
  const title = sanitizeWinAnsi(input.clinicName);
  const titleW = fontBold.widthOfTextAtSize(title, 18);
  page.drawText(title, { x: MARGIN + (CONTENT_WIDTH - titleW) / 2, y, size: 18, font: fontBold, color: COLORS.tealPrimary });
  y -= 22;

  const sub = 'MEDICAL CERTIFICATE';
  const subW = fontBold.widthOfTextAtSize(sub, 13);
  page.drawText(sub, { x: MARGIN + (CONTENT_WIDTH - subW) / 2, y, size: 13, font: fontBold, color: COLORS.textPrimary });
  y -= 16;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_WIDTH, y }, thickness: 1, color: COLORS.tealPrimary });
  y -= 24;

  // Body text
  const date = new Date(input.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const lines = [
    `This is to certify that Mr./Mrs. ${sanitizeWinAnsi(input.patientName)} (Age: ${input.patientAge || '--'}, Sex: ${sanitizeWinAnsi(input.patientGender) || '--'})`,
    `has been under my medical treatment for ${sanitizeWinAnsi(input.diagnosis || 'Acute Illness')}.`,
    '',
    `I advise medical leave / rest for a period of ${input.restDays} Day(s) starting from ${date}.`,
    '',
    `Status: ${input.fitnessStatus === 'fit' ? 'FIT TO RESUME DUTIES' : 'UNFIT FOR DUTY'}`,
  ];

  for (const line of lines) {
    if (!line) { y -= 10; continue; }
    const isBold = line.startsWith('Status:');
    const color = isBold ? (input.fitnessStatus === 'fit' ? rgb(0.09, 0.56, 0.31) : COLORS.redAccent) : COLORS.textPrimary;
    page.drawText(line, { x: MARGIN, y, size: 11, font: isBold ? fontBold : fontRegular, color });
    y -= 18;
  }

  y -= 40;
  page.drawLine({ start: { x: PAGE_WIDTH - MARGIN - 140, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.5, color: COLORS.textMuted });
  y -= 14;
  page.drawText(`Dr. ${sanitizeWinAnsi(input.doctorName)}`, { x: PAGE_WIDTH - MARGIN - 140, y, size: 11, font: fontBold, color: COLORS.textPrimary });
  if (input.regNumber) {
    y -= 14;
    page.drawText(`Reg. No: ${input.regNumber}`, { x: PAGE_WIDTH - MARGIN - 140, y, size: 9, font: fontRegular, color: COLORS.textMuted });
  }
}

export async function drawReceiptPage(doc: PDFDocument, input: ReceiptPdfInput) {
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  let y = PAGE_HEIGHT - MARGIN;

  // Header
  const title = sanitizeWinAnsi(input.clinicName);
  const titleW = fontBold.widthOfTextAtSize(title, 16);
  page.drawText(title, { x: MARGIN + (CONTENT_WIDTH - titleW) / 2, y, size: 16, font: fontBold, color: COLORS.tealPrimary });
  y -= 20;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_WIDTH, y }, thickness: 1.5, color: COLORS.tealPrimary });
  y -= 14;

  const sub = 'PAYMENT RECEIPT';
  const subW = fontBold.widthOfTextAtSize(sub, 13);
  page.drawText(sub, { x: MARGIN + (CONTENT_WIDTH - subW) / 2, y, size: 13, font: fontBold, color: COLORS.textPrimary });
  y -= 20;

  // No + Date row
  page.drawText(`Receipt No: ${input.receiptNo}`, { x: MARGIN, y, size: 10, font: fontBold, color: COLORS.textPrimary });
  const dateText = `Date: ${input.date}`;
  const dateW = fontBold.widthOfTextAtSize(dateText, 10);
  page.drawText(dateText, { x: MARGIN + CONTENT_WIDTH - dateW, y, size: 10, font: fontBold, color: COLORS.textPrimary });
  y -= 18;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_WIDTH, y }, thickness: 0.5, color: COLORS.gridLine });
  y -= 14;

  const rows = [
    `Received with thanks from Mr./Mrs.: ${sanitizeWinAnsi(input.patientName)}`,
    `the Sum of Rupees: ${numToWords(Math.floor(input.amount))} Only`,
    `by: ${input.paymentMode.toUpperCase()}`,
    `towards: ${sanitizeWinAnsi(input.towards)}`,
  ];
  for (const row of rows) {
    page.drawText(row, { x: MARGIN, y, size: 11, font: fontRegular, color: COLORS.textPrimary });
    y -= 18;
  }

  y -= 10;
  const amtText = `Rs. ${input.amount.toFixed(2)}`;
  page.drawRectangle({ x: MARGIN, y: y - 6, width: 120, height: 24, color: COLORS.tealLight, borderColor: COLORS.tealPrimary, borderWidth: 1 });
  page.drawText(amtText, { x: MARGIN + 10, y, size: 13, font: fontBold, color: COLORS.tealPrimary });

  y -= 36;
  page.drawLine({ start: { x: PAGE_WIDTH - MARGIN - 140, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.5, color: COLORS.textMuted });
  y -= 14;
  page.drawText(`For Dr. ${sanitizeWinAnsi(input.doctorName)}`, { x: PAGE_WIDTH - MARGIN - 140, y, size: 10, font: fontBold, color: COLORS.textPrimary });
}


// ─── Certificate PDF ─────────────────────────────────────────────────────────

export interface CertificatePdfInput {
  clinicName: string;
  doctorName: string;
  regNumber?: string;
  patientName: string;
  patientAge?: number | string;
  patientGender?: string;
  diagnosis: string;
  restDays: string;
  startDate: string;
  fitnessStatus: 'fit' | 'unfit';
}

export async function renderCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  let y = PAGE_HEIGHT - MARGIN;

  // Header
  const title = sanitizeWinAnsi(input.clinicName);
  const titleW = fontBold.widthOfTextAtSize(title, 18);
  page.drawText(title, { x: MARGIN + (CONTENT_WIDTH - titleW) / 2, y, size: 18, font: fontBold, color: COLORS.tealPrimary });
  y -= 22;

  const sub = 'MEDICAL CERTIFICATE';
  const subW = fontBold.widthOfTextAtSize(sub, 13);
  page.drawText(sub, { x: MARGIN + (CONTENT_WIDTH - subW) / 2, y, size: 13, font: fontBold, color: COLORS.textPrimary });
  y -= 16;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_WIDTH, y }, thickness: 1, color: COLORS.tealPrimary });
  y -= 24;

  // Body text
  const date = new Date(input.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const lines = [
    `This is to certify that Mr./Mrs. ${sanitizeWinAnsi(input.patientName)} (Age: ${input.patientAge || '--'}, Sex: ${sanitizeWinAnsi(input.patientGender) || '--'})`,
    `has been under my medical treatment for ${sanitizeWinAnsi(input.diagnosis)}.`,
    '',
    `I advise medical leave / rest for a period of ${input.restDays} Day(s) starting from ${date}.`,
    '',
    `Status: ${input.fitnessStatus === 'fit' ? 'FIT TO RESUME DUTIES' : 'UNFIT FOR DUTY'}`,
  ];

  for (const line of lines) {
    if (!line) { y -= 10; continue; }
    const isBold = line.startsWith('Status:');
    const color = isBold ? (input.fitnessStatus === 'fit' ? rgb(0.09, 0.56, 0.31) : COLORS.redAccent) : COLORS.textPrimary;
    page.drawText(line, { x: MARGIN, y, size: 11, font: isBold ? fontBold : fontRegular, color });
    y -= 18;
  }

  y -= 40;
  page.drawLine({ start: { x: PAGE_WIDTH - MARGIN - 140, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.5, color: COLORS.textMuted });
  y -= 14;
  page.drawText(`Dr. ${sanitizeWinAnsi(input.doctorName)}`, { x: PAGE_WIDTH - MARGIN - 140, y, size: 11, font: fontBold, color: COLORS.textPrimary });
  if (input.regNumber) {
    y -= 14;
    page.drawText(`Reg. No: ${input.regNumber}`, { x: PAGE_WIDTH - MARGIN - 140, y, size: 9, font: fontRegular, color: COLORS.textMuted });
  }

  return doc.save();
}

// ─── Receipt PDF ─────────────────────────────────────────────────────────────

export interface ReceiptPdfInput {
  clinicName: string;
  doctorName: string;
  patientName: string;
  receiptNo: string;
  date: string;
  amount: number;
  paymentMode: string;
  towards: string;
}

function numToWords(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (n === 0) return 'Zero';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
  if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
  return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
}

export async function renderReceiptPdf(input: ReceiptPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT / 2]); // half A4 for receipt
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const H = PAGE_HEIGHT / 2;
  let y = H - MARGIN;

  // Header
  const title = sanitizeWinAnsi(input.clinicName);
  const titleW = fontBold.widthOfTextAtSize(title, 16);
  page.drawText(title, { x: MARGIN + (CONTENT_WIDTH - titleW) / 2, y, size: 16, font: fontBold, color: COLORS.tealPrimary });
  y -= 20;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_WIDTH, y }, thickness: 1.5, color: COLORS.tealPrimary });
  y -= 4;

  // No + Date row
  page.drawText(`Receipt No: ${input.receiptNo}`, { x: MARGIN, y, size: 10, font: fontBold, color: COLORS.textPrimary });
  const dateText = `Date: ${input.date}`;
  const dateW = fontBold.widthOfTextAtSize(dateText, 10);
  page.drawText(dateText, { x: MARGIN + CONTENT_WIDTH - dateW, y, size: 10, font: fontBold, color: COLORS.textPrimary });
  y -= 18;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_WIDTH, y }, thickness: 0.5, color: COLORS.gridLine });
  y -= 14;

  const rows = [
    `Received with thanks from Mr./Mrs.: ${sanitizeWinAnsi(input.patientName)}`,
    `the Sum of Rupees: ${numToWords(Math.floor(input.amount))} Only`,
    `by: ${input.paymentMode.toUpperCase()}`,
    `towards: ${sanitizeWinAnsi(input.towards)}`,
  ];
  for (const row of rows) {
    page.drawText(row, { x: MARGIN, y, size: 11, font: fontRegular, color: COLORS.textPrimary });
    y -= 18;
  }

  y -= 10;
  const amtText = `Rs. ${input.amount.toFixed(2)}`;
  page.drawRectangle({ x: MARGIN, y: y - 6, width: 100, height: 22, color: COLORS.tealLight, borderColor: COLORS.tealPrimary, borderWidth: 1 });
  page.drawText(amtText, { x: MARGIN + 8, y, size: 13, font: fontBold, color: COLORS.tealPrimary });

  y -= 36;
  page.drawLine({ start: { x: PAGE_WIDTH - MARGIN - 120, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.5, color: COLORS.textMuted });
  y -= 14;
  page.drawText(`For Dr. ${sanitizeWinAnsi(input.doctorName)}`, { x: PAGE_WIDTH - MARGIN - 120, y, size: 10, font: fontBold, color: COLORS.textPrimary });

  return doc.save();
}

