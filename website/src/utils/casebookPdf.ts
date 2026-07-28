import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";

const PAGE_WIDTH = 595.27;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLORS = {
  tealDark: rgb(0x0b / 255, 0x5c / 255, 0x5c / 255),
  tealPrimary: rgb(0x0f / 255, 0x76 / 255, 0x6e / 255),
  tealLight: rgb(0xf0 / 255, 0xfd / 255, 0xfa / 255),
  tealBorder: rgb(0x99 / 255, 0xf6 / 255, 0xe4 / 255),
  textPrimary: rgb(0x0f / 255, 0x17 / 255, 0x2a / 255),
  textSecondary: rgb(0x33 / 255, 0x41 / 255, 0x55 / 255),
  textMuted: rgb(0x64 / 255, 0x74 / 255, 0x8b / 255),
  textFaint: rgb(0x94 / 255, 0xa3 / 255, 0xb8 / 255),
  borderLight: rgb(0xe2 / 255, 0xe8 / 255, 0xf0 / 255),
  bgCard: rgb(0xf8 / 255, 0xfa / 255, 0xfc / 255),
  white: rgb(1, 1, 1),
};

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (!text) return [""];
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
  visits?: CasebookVisit[];
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
    if (y - needed < MARGIN + 35) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  // ── Header Banner ──
  page.drawRectangle({
    x: MARGIN,
    y: y - 48,
    width: CONTENT_WIDTH,
    height: 48,
    color: COLORS.tealDark,
  });

  page.drawText("PATIENT CASEBOOK & CLINICAL HISTORY", {
    x: MARGIN + 14,
    y: y - 24,
    size: 13,
    font: fontBold,
    color: COLORS.white,
  });

  const clinicStr = input.clinicName || "PrescoPad AI Clinic";
  const clinicWidth = fontRegular.widthOfTextAtSize(clinicStr, 9);
  page.drawText(clinicStr, {
    x: MARGIN + CONTENT_WIDTH - clinicWidth - 14,
    y: y - 24,
    size: 9,
    font: fontRegular,
    color: COLORS.white,
  });

  y -= 64;

  // ── Patient Info Card ──
  page.drawRectangle({
    x: MARGIN,
    y: y - 56,
    width: CONTENT_WIDTH,
    height: 56,
    color: COLORS.bgCard,
    borderColor: COLORS.borderLight,
    borderWidth: 1,
  });

  page.drawText(input.patientName, {
    x: MARGIN + 12,
    y: y - 20,
    size: 13,
    font: fontBold,
    color: COLORS.tealDark,
  });

  const subInfo = [
    `Age: ${input.patientAge ?? "—"}`,
    `Gender: ${input.patientGender ?? "—"}`,
    `Blood Group: ${input.bloodGroup || "—"}`,
    `Allergies: ${input.allergies || "None"}`,
  ].join("   ·   ");

  page.drawText(subInfo, {
    x: MARGIN + 12,
    y: y - 40,
    size: 9.5,
    font: fontRegular,
    color: COLORS.textSecondary,
  });

  y -= 72;

  // ── Consolidated AI Case Overview ──
  if (input.caseSummary && input.caseSummary.trim()) {
    page.drawText("CONSOLIDATED AI CASE SUMMARY", {
      x: MARGIN,
      y,
      size: 10,
      font: fontBold,
      color: COLORS.tealPrimary,
    });
    y -= 14;

    const summaryLines = wrapText(input.caseSummary, fontRegular, 9.5, CONTENT_WIDTH - 24);
    const boxHeight = summaryLines.length * 13 + 16;

    newPageIfNeeded(boxHeight + 10);

    page.drawRectangle({
      x: MARGIN,
      y: y - boxHeight + 10,
      width: CONTENT_WIDTH,
      height: boxHeight,
      color: COLORS.tealLight,
      borderColor: COLORS.tealBorder,
      borderWidth: 1,
    });

    let innerY = y - 4;
    for (const line of summaryLines) {
      page.drawText(line, {
        x: MARGIN + 12,
        y: innerY,
        size: 9.5,
        font: fontRegular,
        color: COLORS.textPrimary,
      });
      innerY -= 13;
    }
    y = innerY - 14;
  }

  // ── Visit History Timeline ──
  if (input.visits && input.visits.length > 0) {
    newPageIfNeeded(30);
    page.drawText(`VISIT HISTORY TIMELINE (${input.visits.length} VISITS)`, {
      x: MARGIN,
      y,
      size: 10,
      font: fontBold,
      color: COLORS.tealPrimary,
    });
    y -= 18;

    const sortedVisits = [...input.visits].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (let index = 0; index < sortedVisits.length; index++) {
      const visit = sortedVisits[index];
      newPageIfNeeded(70);

      // Date Header Bar for Visit
      page.drawRectangle({
        x: MARGIN,
        y: y - 20,
        width: CONTENT_WIDTH,
        height: 20,
        color: COLORS.tealLight,
        borderColor: COLORS.tealBorder,
        borderWidth: 0.5,
      });

      const formattedDate = visit.date
        ? new Date(visit.date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "—";

      page.drawText(`Visit #${sortedVisits.length - index}  ·  ${formattedDate}`, {
        x: MARGIN + 10,
        y: y - 14,
        size: 9.5,
        font: fontBold,
        color: COLORS.tealDark,
      });

      if (visit.diagnosis) {
        const dxStr = `Diagnosis: ${visit.diagnosis}`;
        const dxWidth = fontBold.widthOfTextAtSize(dxStr, 9.5);
        page.drawText(dxStr, {
          x: MARGIN + CONTENT_WIDTH - dxWidth - 10,
          y: y - 14,
          size: 9.5,
          font: fontBold,
          color: COLORS.textPrimary,
        });
      }

      y -= 28;

      // 1. Symptoms Block
      if (visit.symptoms && visit.symptoms.length > 0) {
        newPageIfNeeded(16);
        const symptomsStr = visit.symptoms.join(", ");
        const symLines = wrapText(symptomsStr, fontRegular, 9, CONTENT_WIDTH - 80);

        page.drawText("Symptoms:", {
          x: MARGIN + 10,
          y,
          size: 9,
          font: fontBold,
          color: COLORS.tealPrimary,
        });

        let lineY = y;
        for (let lIdx = 0; lIdx < symLines.length; lIdx++) {
          if (lIdx > 0) {
            lineY -= 12;
            newPageIfNeeded(14);
          }
          page.drawText(symLines[lIdx], {
            x: MARGIN + 75,
            y: lineY,
            size: 9,
            font: fontRegular,
            color: COLORS.textPrimary,
          });
        }
        y = lineY - 14;
      }

      // 2. Prescribed Medicines Block
      if (visit.medicines && visit.medicines.length > 0) {
        newPageIfNeeded(16);
        page.drawText("Medicines:", {
          x: MARGIN + 10,
          y,
          size: 9,
          font: fontBold,
          color: COLORS.tealPrimary,
        });
        y -= 14;

        for (const med of visit.medicines) {
          newPageIfNeeded(14);
          const medLines = wrapText(`• ${med}`, fontRegular, 9, CONTENT_WIDTH - 30);
          for (const mLine of medLines) {
            page.drawText(mLine, {
              x: MARGIN + 20,
              y,
              size: 9,
              font: fontRegular,
              color: COLORS.textSecondary,
            });
            y -= 12;
          }
        }
        y -= 2;
      }

      // 3. Lab Tests Block
      if (visit.labTests && visit.labTests.length > 0) {
        newPageIfNeeded(16);
        const testsStr = visit.labTests.join(", ");
        const testLines = wrapText(testsStr, fontRegular, 9, CONTENT_WIDTH - 80);

        page.drawText("Lab Tests:", {
          x: MARGIN + 10,
          y,
          size: 9,
          font: fontBold,
          color: COLORS.tealPrimary,
        });

        let lineY = y;
        for (let lIdx = 0; lIdx < testLines.length; lIdx++) {
          if (lIdx > 0) {
            lineY -= 12;
            newPageIfNeeded(14);
          }
          page.drawText(testLines[lIdx], {
            x: MARGIN + 75,
            y: lineY,
            size: 9,
            font: fontRegular,
            color: COLORS.textPrimary,
          });
        }
        y = lineY - 14;
      }

      // 4. Advice Block
      if (visit.advice && visit.advice.trim()) {
        newPageIfNeeded(16);
        const adviceLines = wrapText(visit.advice, fontRegular, 9, CONTENT_WIDTH - 80);

        page.drawText("Advice:", {
          x: MARGIN + 10,
          y,
          size: 9,
          font: fontBold,
          color: COLORS.tealPrimary,
        });

        let lineY = y;
        for (let lIdx = 0; lIdx < adviceLines.length; lIdx++) {
          if (lIdx > 0) {
            lineY -= 12;
            newPageIfNeeded(14);
          }
          page.drawText(adviceLines[lIdx], {
            x: MARGIN + 75,
            y: lineY,
            size: 9,
            font: fontRegular,
            color: COLORS.textSecondary,
          });
        }
        y = lineY - 14;
      }

      // 5. Follow-up / Referred
      if (visit.followUpDate || visit.referredTo) {
        newPageIfNeeded(14);
        const extras = [];
        if (visit.followUpDate) {
          const fDate = new Date(visit.followUpDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          extras.push(`Follow-up Date: ${fDate}`);
        }
        if (visit.referredTo) {
          extras.push(`Referred To: ${visit.referredTo}`);
        }

        page.drawText(extras.join("   ·   "), {
          x: MARGIN + 10,
          y,
          size: 8.5,
          font: fontBold,
          color: COLORS.tealDark,
        });
        y -= 14;
      }

      y -= 6;
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: MARGIN + CONTENT_WIDTH, y },
        thickness: 0.5,
        color: COLORS.borderLight,
      });
      y -= 14;
    }
  }

  // Footer
  newPageIfNeeded(20);
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_WIDTH, y },
    thickness: 0.5,
    color: COLORS.borderLight,
  });
  y -= 14;
  const footerText = "Generated by PrescoPad AI Clinic System";
  const footerWidth = fontRegular.widthOfTextAtSize(footerText, 8);
  page.drawText(footerText, {
    x: MARGIN + (CONTENT_WIDTH - footerWidth) / 2,
    y,
    size: 8,
    font: fontRegular,
    color: COLORS.textFaint,
  });

  return doc.save();
}
