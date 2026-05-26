// ─────────────────────────────────────────────────────────────
//  TestCertificatePDF.ts
//  Standalone PDF certificate generator for MapReducer Mock Test
// ─────────────────────────────────────────────────────────────

import jsPDF from "jspdf";

export interface CertificateData {
  percentage: number;
  score: number;
  totalQuestions: number;
  timeTaken: number;
  strongAreas: string[];
  weakAreas: string[];
}

export function formatTimeTaken(s: number): string {
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function generateCertificatePDF(data: CertificateData): void {
  const { percentage, score, totalQuestions, timeTaken, strongAreas, weakAreas } = data;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297, H = 210;

  // ── Background & Border ──────────────────────────────────────
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, "F");

  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, 28, H, "F");

  doc.setDrawColor(197, 160, 80);
  doc.setLineWidth(5);
  doc.ellipse(14, H / 2, 20, 55, "S");

  doc.setDrawColor(197, 160, 80);
  doc.setLineWidth(2.5);
  doc.rect(4, 4, W - 8, H - 8, "S");
  doc.setLineWidth(0.5);
  doc.rect(8, 8, W - 16, H - 16, "S");

  // ── Wax Seal ─────────────────────────────────────────────────
  const sealX = 52, sealY = 38, sealR = 13;
  doc.setFillColor(197, 160, 80);
  for (let i = 0; i < 16; i++) {
    const a1 = (i * 22.5 * Math.PI) / 180;
    const a2 = ((i + 0.5) * 22.5 * Math.PI) / 180;
    doc.triangle(
      sealX, sealY,
      sealX + (sealR + 5) * Math.cos(a1), sealY + (sealR + 5) * Math.sin(a1),
      sealX + sealR * Math.cos(a2), sealY + sealR * Math.sin(a2),
      "F"
    );
  }
  doc.setFillColor(218, 185, 100);
  doc.circle(sealX, sealY, sealR, "F");
  doc.setFillColor(197, 160, 80);
  doc.circle(sealX, sealY, sealR - 3, "F");

  // Checkmark inside seal
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.5);
  doc.line(sealX - 4, sealY + 1, sealX - 1, sealY + 5);
  doc.line(sealX - 1, sealY + 5, sealX + 5, sealY - 4);

  // Ribbon below seal
  doc.setFillColor(197, 160, 80);
  doc.rect(sealX - 5, sealY + sealR - 1, 4, 11, "F");
  doc.rect(sealX + 1, sealY + sealR - 1, 4, 11, "F");

  // ── MapReducer Brand Badge ────────────────────────────────────
  doc.setFillColor(197, 160, 80);
  doc.roundedRect(W - 52, 12, 42, 18, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text("MapReducer", W - 48, 22);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("AI-Powered Assessment", W - 48, 27);

  // ── Title ────────────────────────────────────────────────────
  doc.setFontSize(38);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text("CERTIFICATE", W / 2, 50, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110, 110, 110);
  doc.text("OF ACHIEVEMENT", W / 2, 59, { align: "center" });

  doc.setDrawColor(197, 160, 80);
  doc.setLineWidth(0.7);
  doc.line(W / 2 - 55, 64, W / 2 + 55, 64);

  // ── Recipient ────────────────────────────────────────────────
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(90, 90, 90);
  doc.text("THIS CERTIFICATE IS PRESENTED TO", W / 2, 74, { align: "center" });

  doc.setFontSize(28);
  doc.setFont("times", "bolditalic");
  doc.setTextColor(197, 160, 80);
  doc.text("MapReducer Student", W / 2, 90, { align: "center" });

  doc.setDrawColor(197, 160, 80);
  doc.setLineWidth(0.5);
  doc.line(W / 2 - 65, 94, W / 2 + 65, 94);

  // ── Score Description ────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(
    `In recognition of successfully completing an AI-powered mock test with a score of`,
    W / 2, 103, { align: "center" }
  );
  doc.text(
    `${percentage}% (${score}/${totalQuestions} correct) on ${new Date().toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    })}.`,
    W / 2, 110, { align: "center" }
  );

  // ── Score Badge ──────────────────────────────────────────────
  doc.setFillColor(197, 160, 80);
  doc.roundedRect(W / 2 - 24, 116, 48, 14, 3, 3, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text(`${percentage}%  |  ${score}/${totalQuestions}`, W / 2, 125, { align: "center" });

  // ── Skill Areas ──────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  if (strongAreas.length > 0) {
    doc.setTextColor(22, 101, 52);
    doc.text(`Strong: ${strongAreas.slice(0, 5).join("  •  ")}`, W / 2, 137, { align: "center" });
  }
  if (weakAreas.length > 0) {
    doc.setTextColor(153, 27, 27);
    doc.text(`Focus on: ${weakAreas.slice(0, 5).join("  •  ")}`, W / 2, 143, { align: "center" });
  }

  // ── Time Taken ───────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Time taken: ${formatTimeTaken(timeTaken)}`, W / 2, 150, { align: "center" });

  // ── Signature Line ───────────────────────────────────────────
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 30, 168, W / 2 + 30, 168);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text("MapReducer Platform", W / 2, 174, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110, 110, 110);
  doc.text("Certified AI Assessment", W / 2, 179, { align: "center" });

  // ── Footer Bar ───────────────────────────────────────────────
  doc.setFillColor(197, 160, 80);
  doc.rect(0, H - 11, W, 11, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 20, 20);
  doc.text(
    `Generated by MapReducer  •  ${new Date().toLocaleDateString()}  •  MapReducer.com`,
    W / 2, H - 3.5, { align: "center" }
  );

  doc.save("mapreducer_Certificate.pdf");
}