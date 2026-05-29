// ─────────────────────────────────────────────────────────────
//  TestCertificatePDF.ts
//  Redesigned PDF certificate for MapReducer Mock Test
//  Visual style: colorful geometric corners, dot patterns,
//  clean white background — matching the uploaded reference.
// ─────────────────────────────────────────────────────────────

import jsPDF from "jspdf";

export interface CertificateData {
  percentage: number;
  score: number;
  totalQuestions: number;
  timeTaken: number;
  strongAreas: string[];
  weakAreas: string[];
  recipientName?: string;
}

export function formatTimeTaken(s: number): string {
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ── Colour palette (matches reference image) ─────────────────
const ORANGE  = [255, 140,  60] as const;
const YELLOW  = [255, 210,  60] as const;
const PINK    = [230,  80, 160] as const;
const PURPLE  = [150,  60, 200] as const;
const DARK    = [ 30,  30,  30] as const;
const GREY    = [120, 120, 120] as const;
const LIGHT   = [230, 230, 230] as const;
const WHITE   = [255, 255, 255] as const;

export function generateCertificatePDF(data: CertificateData): void {
  const {
    percentage,
    score,
    totalQuestions,
    timeTaken,
    strongAreas,
    weakAreas,
    recipientName  = "MapReducer Student",
  } = data;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297, H = 210;

  // ── White background ─────────────────────────────────────────
  doc.setFillColor(...WHITE);
  doc.rect(0, 0, W, H, "F");

  // ── Light border ─────────────────────────────────────────────
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(1);
  doc.rect(6, 6, W - 12, H - 12, "S");

  // ────────────────────────────────────────────────────────────
  //  TOP-LEFT CORNER  — stacked orange / yellow triangles + small square
  // ────────────────────────────────────────────────────────────
  // Large orange triangle (pointing right-down)
  doc.setFillColor(...ORANGE);
  doc.triangle(0, 0, 52, 0, 0, 52, "F");

  // Yellow triangle on top of it (smaller, offset)
  doc.setFillColor(...YELLOW);
  doc.triangle(22, 0, 60, 0, 22, 38, "F");

  // White square cutout illusion (the white rectangle in the reference)
  doc.setFillColor(...WHITE);
  doc.rect(12, 12, 26, 26, "F");

  // ────────────────────────────────────────────────────────────
  //  TOP-RIGHT CORNER  — yellow / orange triangles
  // ────────────────────────────────────────────────────────────
  doc.setFillColor(...YELLOW);
  doc.triangle(W, 0, W - 48, 0, W, 48, "F");

  doc.setFillColor(...ORANGE);
  doc.triangle(W, 0, W - 28, 0, W, 28, "F");

  // ────────────────────────────────────────────────────────────
  //  BOTTOM-RIGHT CORNER  — pink / purple triangles
  // ────────────────────────────────────────────────────────────
  doc.setFillColor(...PINK);
  doc.triangle(W, H, W - 48, H, W, H - 48, "F");

  doc.setFillColor(...PURPLE);
  doc.triangle(W, H, W - 28, H, W, H - 28, "F");

  // ────────────────────────────────────────────────────────────
  //  BOTTOM-LEFT CORNER  — orange accent
  // ────────────────────────────────────────────────────────────
  doc.setFillColor(...ORANGE);
  doc.triangle(0, H, 36, H, 0, H - 36, "F");

  // ────────────────────────────────────────────────────────────
  //  DOT GRID — top-right area  (small yellow dots)
  // ────────────────────────────────────────────────────────────
  doc.setFillColor(...YELLOW);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      doc.circle(W - 75 + col * 8, 18 + row * 8, 1, "F");
    }
  }

  // ────────────────────────────────────────────────────────────
  //  DOT GRID — bottom-left area  (small orange dots)
  // ────────────────────────────────────────────────────────────
  doc.setFillColor(...ORANGE);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      doc.circle(16 + col * 8, H - 58 + row * 8, 1, "F");
    }
  }

  // ────────────────────────────────────────────────────────────
  //  TITLE
  // ────────────────────────────────────────────────────────────
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Certificate of Achievement", W / 2, 46, { align: "center" });

  // Sub-title
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREY);
  doc.text("This Certificate is Awarded to", W / 2, 58, { align: "center" });

  // ────────────────────────────────────────────────────────────
  //  RECIPIENT NAME  (large, cursive-style via "times bolditalic")
  // ────────────────────────────────────────────────────────────
  doc.setFontSize(38);
  doc.setFont("times", "bolditalic");
  doc.setTextColor(...DARK);
  doc.text(recipientName, W / 2, 82, { align: "center" });

  // Underline beneath name
  const nameWidth = doc.getTextWidth(recipientName);
  const nameUnderY = 86;
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(0.6);
  doc.line(W / 2 - nameWidth / 2 - 5, nameUnderY, W / 2 + nameWidth / 2 + 5, nameUnderY);

  // ────────────────────────────────────────────────────────────
  //  BODY TEXT
  // ────────────────────────────────────────────────────────────
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70, 70, 70);

  const line1 = `In recognition of successfully completing an AI-powered mock test with a score of ${percentage}%`;
  const line2 = `(${score}/${totalQuestions} correct) on ${dateStr}.  Time taken: ${formatTimeTaken(timeTaken)}.`;
  doc.text(line1, W / 2, 98, { align: "center" });
  doc.text(line2, W / 2, 106, { align: "center" });

  // ────────────────────────────────────────────────────────────
  //  SCORE BADGE
  // ────────────────────────────────────────────────────────────
  doc.setFillColor(...ORANGE);
  doc.roundedRect(W / 2 - 22, 110, 44, 12, 3, 3, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text(`${percentage}%  ·  ${score}/${totalQuestions}`, W / 2, 118, { align: "center" });

  // ────────────────────────────────────────────────────────────
  //  SKILL AREAS
  // ────────────────────────────────────────────────────────────
  let skillY = 128;
  if (strongAreas.length > 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 120, 60);
    doc.text("Strong Areas:", W / 2 - 60, skillY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(22, 120, 60);
    doc.text(strongAreas.slice(0, 5).join("  •  "), W / 2 - 22, skillY);
    skillY += 8;
  }
  if (weakAreas.length > 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 40, 40);
    doc.text("Focus Areas:", W / 2 - 60, skillY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 40, 40);
    doc.text(weakAreas.slice(0, 5).join("  •  "), W / 2 - 22, skillY);
  }

  // ────────────────────────────────────────────────────────────
  //  TWO SIGNATURE BLOCKS  (like the reference image)
  // ────────────────────────────────────────────────────────────
  const sigY = 162;
  const sig1X = W / 2 - 60;
  const sig2X = W / 2 + 30;

  // ────────────────────────────────────────────────────────────
  //  FOOTER
  // ────────────────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREY);
  doc.text(
    `Generated by MapReducer  •  ${new Date().toLocaleDateString()}  •  MapReducer.com`,
    W / 2,
    H - 8,
    { align: "center" }
  );
  doc.save("mapreducer_Certificate.pdf");
}