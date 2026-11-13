"use client";

/**
 * Moteur PDF DevisBTP CI
 * - A4 / A3
 * - rendu imprimable et hiérarchisé
 * - page de garde premium, tableaux lisibles, signature/cachet, pagination robuste
 */

export type FormatPapier = "A4" | "A3";

export function formatPapierInfo(f: FormatPapier) {
  return f === "A3" ? { format: "a3", W: 297, H: 420 } : { format: "a4", W: 210, H: 297 };
}

const C = {
  ink: [15, 23, 42] as [number, number, number],
  slate: [71, 85, 105] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  pale: [248, 250, 252] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  amberDark: [180, 83, 9] as [number, number, number],
  green: [16, 185, 129] as [number, number, number],
  greenPale: [236, 253, 245] as [number, number, number],
  violet: [109, 40, 217] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const clean = (s: unknown) => String(s ?? "")
  .replace(/œ/g, "oe")
  .replace(/Œ/g, "OE")
  .replace(/[’‘]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/✓/g, "OK")
  .replace(/[\u{1F300}-\u{1FAFF}]/gu, "");

const money = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));
const fmtN = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(n) || 0);

type Doc = any;

export type PdfEntreprise = {
  nom?: string;
  proprietaire?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  ville?: string;
  rccm?: string;
  compteContribuable?: string;
  logoData?: string;
  signatureData?: string;
  cachetData?: string;
};

type LignePdf = {
  section?: string;
  designation: string;
  detail?: string | null;
  unite: string;
  quantite: number;
  prixUnitaire: number;
};

function addImg(doc: Doc, data: string | undefined, x: number, y: number, w: number, h: number) {
  if (!data) return;
  try {
    doc.addImage(data, data.includes("image/png") ? "PNG" : "JPEG", x, y, w, h, undefined, "FAST");
  } catch {
    // image optionnelle, ignorée si illisible
  }
}

function text(doc: Doc, value: unknown, x: number, y: number, options?: Record<string, unknown>) {
  doc.text(clean(value), x, y, options);
}

function roundedCard(doc: Doc, x: number, y: number, w: number, h: number, fill: [number, number, number], stroke?: [number, number, number]) {
  doc.setFillColor(...fill);
  if (stroke) {
    doc.setDrawColor(...stroke);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, 2.5, 2.5, "FD");
  } else {
    doc.roundedRect(x, y, w, h, 2.5, 2.5, "F");
  }
}

function line(doc: Doc, x1: number, y1: number, x2: number, y2: number, color = C.line, width = 0.35) {
  doc.setDrawColor(...color);
  doc.setLineWidth(width);
  doc.line(x1, y1, x2, y2);
}

function pageCouvertureDevis(doc: Doc, ent: PdfEntreprise | null | undefined, devis: any, tot: any, W: number, H: number, M: number) {
  const bg = [250, 252, 255] as [number, number, number];
  doc.setFillColor(...bg);
  doc.rect(0, 0, W, H, "F");

  doc.setFillColor(...C.ink);
  doc.rect(0, 0, W, 32, "F");
  doc.setFillColor(...C.amber);
  doc.rect(0, 32, W, 2.4, "F");

  if (ent?.logoData) {
    roundedCard(doc, M, 8, 23, 23, C.white, C.line);
    addImg(doc, ent.logoData, M + 1.5, 9.5, 20, 20);
  }

  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  text(doc, ent?.nom || "DevisBTP CI", ent?.logoData ? M + 30 : M, 16);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  const meta = [ent?.ville || "Abidjan, Côte d’Ivoire", ent?.telephone, ent?.email].filter(Boolean).join("  •  ");
  text(doc, meta, ent?.logoData ? M + 30 : M, 22, { maxWidth: W * 0.55 });

  const right = W - M;
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  text(doc, "DEVIS QUANTITATIF ESTIMATIF", right, 12, { align: "right" });
  doc.setFontSize(14);
  text(doc, devis?.numero || "DEVIS", right, 20, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const dateVal = new Date(devis?.createdAt || Date.now()).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  text(doc, `Émis le ${dateVal}`, right, 27, { align: "right" });

  const titleX = M;
  const titleW = W - 2 * M;
  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  text(doc, "Devis de travaux", titleX, 52);
  doc.setFontSize(11.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.slate);
  text(doc, devis?.natureTravaux || "Travaux de construction", titleX, 62, { maxWidth: titleW - 10 });

  roundedCard(doc, M, 70, W - 2 * M, 42, C.white, C.line);
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  text(doc, "CLIENT", M + 6, 78);
  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  text(doc, devis?.clientNom || "Client", M + 6, 88);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...C.slate);
  text(doc, `${devis?.clientTel || "Téléphone non renseigné"}  •  ${devis?.lieu || "Chantier non renseigné"}`, M + 6, 97);

  const totalBoxX = W * 0.63;
  const totalBoxW = W * 0.26;
  roundedCard(doc, totalBoxX, 75, totalBoxW, 32, C.ink);
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  text(doc, "TOTAL TTC", totalBoxX + 6, 84);
  doc.setFontSize(18);
  text(doc, `${money(tot?.ttc || 0)} FCFA`, totalBoxX + 6, 96, { maxWidth: totalBoxW - 12 });

  const stats = [
    { label: "Surface", value: `${devis?.surface || "—"} m²` },
    { label: "Pièces", value: `${devis?.nbPieces || "—"}` },
    { label: "Étages", value: `${devis?.nbEtages || "—"}` },
    { label: "Validité", value: `${devis?.validiteJours || 30} jours` },
  ];
  const statW = (W - 2 * M - 16) / 4;
  stats.forEach((s, index) => {
    const x = M + index * (statW + 4);
    roundedCard(doc, x, 118, statW, 22, C.white, C.line);
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    text(doc, s.label.toUpperCase(), x + 5, 126);
    doc.setTextColor(...C.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    text(doc, s.value, x + 5, 134);
  });

  const recapX = M;
  const recapY = 150;
  const recapW = W - 2 * M;
  roundedCard(doc, recapX, recapY, recapW, 66, [255, 249, 240], [253, 186, 116]);
  doc.setTextColor(...C.amberDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  text(doc, "RÉCAPITULATIF", recapX + 6, recapY + 7);
  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  const rows = [
    ["Matières / fournitures", `${money(tot?.materiaux || 0)} FCFA`],
    ["Main d’œuvre", `${money(tot?.mo || 0)} FCFA`],
    ["TVA", `${money(tot?.tva || 0)} FCFA`],
    ["Montant total TTC", `${money(tot?.ttc || 0)} FCFA`],
  ];
  rows.forEach(([label, value], i) => {
    const y = recapY + 15 + i * 12;
    doc.setTextColor(...C.slate);
    text(doc, label, recapX + 6, y);
    doc.setTextColor(...C.ink);
    doc.setFont("helvetica", "bold");
    text(doc, value, recapX + recapW - 6, y, { align: "right" });
    doc.setFont("helvetica", "normal");
  });

  const bottom = H - 30;
  const legal = [ent?.nom || "", ent?.rccm ? `RCCM ${ent.rccm}` : "", ent?.compteContribuable ? `CC ${ent.compteContribuable}` : "", ent?.adresse || ent?.ville || ""].filter(Boolean).join("  •  ");
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  text(doc, clean(legal), W / 2, bottom, { align: "center", maxWidth: W - 2 * M });
  doc.setTextColor(...C.ink);
  doc.setFontSize(7);
  text(doc, "Document généré par DevisBTP CI", W / 2, H - 12, { align: "center" });
}

function pageCouvertureFacture(doc: Doc, ent: PdfEntreprise | null | undefined, facture: any, devis: any, W: number, H: number, M: number) {
  doc.setFillColor(250, 252, 255);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...C.ink);
  doc.rect(0, 0, W, 30, "F");
  doc.setFillColor(...C.amber);
  doc.rect(0, 30, W, 2.5, "F");

  if (ent?.logoData) {
    roundedCard(doc, M, 8, 22, 22, C.white, C.line);
    addImg(doc, ent.logoData, M + 1.5, 9, 19, 19);
  }
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  text(doc, ent?.nom || "DevisBTP CI", ent?.logoData ? M + 28 : M, 15);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  text(doc, ent?.ville || "Abidjan, Côte d’Ivoire", ent?.logoData ? M + 28 : M, 22);

  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  text(doc, "FACTURE D’ACOMPTE", W - M, 12, { align: "right" });
  doc.setFontSize(14);
  text(doc, facture?.numero || "FACTURE", W - M, 21, { align: "right" });

  roundedCard(doc, M, 48, W - 2 * M, 52, C.white, C.line);
  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  text(doc, `Acompte de ${facture?.pct || 0} %`, M + 6, 66);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.slate);
  text(doc, `Client : ${devis?.clientNom || "—"}`, M + 6, 76);
  text(doc, `Chantier : ${devis?.lieu || "—"}`, M + 6, 84);
  text(doc, `Devis associé : ${devis?.numero || "—"}`, M + 6, 92);

  const totalY = 108;
  roundedCard(doc, M, totalY, W - 2 * M, 38, C.ink);
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  text(doc, "MONTANT À PAYER", M + 6, totalY + 9);
  doc.setFontSize(20);
  text(doc, `${money(facture?.montant || 0)} FCFA`, W - M - 6, totalY + 25, { align: "right" });

  const boxY = 158;
  roundedCard(doc, M, boxY, W - 2 * M, 54, [255, 249, 240], [253, 186, 116]);
  doc.setTextColor(...C.amberDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  text(doc, "DÉTAIL DE L’ACOMPTE", M + 6, boxY + 8);
  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  const rows = [
    ["Total devis TTC", `${money(facture?.totalDevisTTC || 0)} FCFA`],
    [`Acompte demandé (${facture?.pct || 0} %)`, `${money(facture?.montant || 0)} FCFA`],
    ["Déjà facturé", `${money(facture?.dejaFacture || 0)} FCFA`],
    ["Solde restant", `${money(facture?.soldeRestant || 0)} FCFA`],
  ];
  rows.forEach(([label, val], idx) => {
    const y = boxY + 15 + idx * 10;
    text(doc, label, M + 6, y);
    doc.setFont("helvetica", "bold");
    text(doc, val, W - M - 6, y, { align: "right" });
    doc.setFont("helvetica", "normal");
  });

  doc.setTextColor(...C.muted);
  doc.setFontSize(7.5);
  const note = doc.splitTextToSize("Paiement par Wave, Orange Money ou virement. Cette facture d’acompte vient en déduction du montant total du devis.", W - 2 * M - 12);
  text(doc, note, M + 6, boxY + 48);

  const legal = [ent?.nom || "", ent?.rccm ? `RCCM ${ent.rccm}` : "", ent?.compteContribuable ? `CC ${ent.compteContribuable}` : ""].filter(Boolean).join("  •  ");
  doc.setTextColor(...C.muted);
  doc.setFontSize(6.8);
  text(doc, legal, W / 2, H - 12, { align: "center" });
}

function pageCouvertureAvenant(doc: Doc, ent: PdfEntreprise | null | undefined, avenant: any, devis: any, W: number, H: number, M: number) {
  doc.setFillColor(250, 252, 255);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(...C.ink);
  doc.rect(0, 0, W, 30, "F");
  doc.setFillColor(...C.amber);
  doc.rect(0, 30, W, 2.5, "F");

  if (ent?.logoData) {
    roundedCard(doc, M, 8, 22, 22, C.white, C.line);
    addImg(doc, ent.logoData, M + 1.5, 9, 19, 19);
  }
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  text(doc, ent?.nom || "DevisBTP CI", ent?.logoData ? M + 28 : M, 15);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  text(doc, ent?.ville || "Abidjan, Côte d’Ivoire", ent?.logoData ? M + 28 : M, 22);

  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  text(doc, "AVENANT AU DEVIS", W - M, 12, { align: "right" });
  doc.setFontSize(14);
  text(doc, avenant?.numero || "AVENANT", W - M, 21, { align: "right" });

  roundedCard(doc, M, 52, W - 2 * M, 60, C.white, C.line);
  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  text(doc, avenant?.titre || "Travaux supplémentaires", M + 6, 66);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.slate);
  text(doc, `Devis d’origine : ${devis?.numero || "—"}`, M + 6, 78);
  text(doc, `Client : ${devis?.clientNom || "—"}`, M + 6, 86);
  text(doc, `Chantier : ${devis?.lieu || "—"}`, M + 6, 94);
  text(doc, `Motif : ${avenant?.description || "Avenant de travaux complémentaires"}`, M + 6, 102, { maxWidth: W - 2 * M - 12 });

  roundedCard(doc, M, 128, W - 2 * M, 46, [255, 247, 237], [253, 186, 116]);
  doc.setTextColor(...C.amberDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  text(doc, "NOUVEAU MONTANT TTC", M + 6, 138);
  doc.setTextColor(...C.ink);
  doc.setFontSize(20);
  text(doc, `${money((devis?.totalTTC || 0) + (avenant?.totalTTC || 0))} FCFA`, W - M - 6, 146, { align: "right" });

  const detailY = 188;
  roundedCard(doc, M, detailY, W - 2 * M, 48, C.pale, C.line);
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  text(doc, "DÉTAIL AVENANT", M + 6, detailY + 8);
  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  text(doc, `Nombre de lignes : ${Array.isArray(avenant?.lignes) ? avenant.lignes.length : 0}`, M + 6, detailY + 18);
  text(doc, `TVA appliquée : ${devis?.tvaPct ?? 18} %`, M + 6, detailY + 28);
  text(doc, `Total HT : ${money(avenant?.totalHT || 0)} FCFA`, W - M - 6, detailY + 18, { align: "right" });
  text(doc, `Total TTC : ${money(avenant?.totalTTC || 0)} FCFA`, W - M - 6, detailY + 28, { align: "right" });

  const legal = [ent?.nom || "", ent?.rccm ? `RCCM ${ent.rccm}` : "", ent?.compteContribuable ? `CC ${ent.compteContribuable}` : ""].filter(Boolean).join("  •  ");
  doc.setTextColor(...C.muted);
  doc.setFontSize(6.8);
  text(doc, legal, W / 2, H - 12, { align: "center" });
}

function entete(doc: Doc, ent: PdfEntreprise | null | undefined, titreDoc: string, numero: string, dateDoc: string, lieu: string, W: number) {
  const M = 14;
  doc.setFillColor(...C.ink);
  doc.rect(0, 0, W, 34, "F");
  doc.setFillColor(...C.amber);
  doc.rect(0, 34, W, 2.4, "F");

  const logoOk = !!ent?.logoData;
  if (logoOk) {
    roundedCard(doc, M, 7, 22, 22, C.white, C.line);
    addImg(doc, ent!.logoData, M + 1.5, 8, 19, 19);
  }

  const tx = logoOk ? M + 27 : M;
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  text(doc, ent?.nom || "DevisBTP CI", tx, 13);
  doc.setFontSize(7.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  const adr = clean([ent?.adresse || ent?.ville || "Abidjan, Côte d’Ivoire", ent?.telephone, ent?.email].filter(Boolean).join("  •  "));
  const adrLines = doc.splitTextToSize(adr, W * 0.52);
  text(doc, adrLines.slice(0, 2), tx, 19.5);

  const legal = [ent?.rccm ? `RCCM ${ent.rccm}` : "", ent?.compteContribuable ? `CC ${ent.compteContribuable}` : ""].filter(Boolean).join("  •  ");
  if (legal) {
    doc.setFontSize(7.4);
    text(doc, clean(legal), tx, 28.5);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  text(doc, clean(titreDoc), tx, 31.5);

  doc.setTextColor(...C.white);
  doc.setFontSize(13.5);
  doc.setFont("helvetica", "bold");
  text(doc, clean(numero), W - M, 14, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  text(doc, `Date : ${dateDoc}`, W - M, 21, { align: "right" });
  text(doc, clean(`Chantier : ${lieu}`), W - M, 27, { align: "right", maxWidth: W * 0.38 });
}

function blocClient(doc: Doc, M: number, W: number, y: number, d: any) {
  const w = W - 2 * M;
  roundedCard(doc, M, y, w, 31, C.pale, C.line);
  const half = w * 0.5;

  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  text(doc, "CLIENT", M + 5, y + 6);

  doc.setTextColor(...C.ink);
  doc.setFontSize(11.5);
  text(doc, d.clientNom || "Client", M + 5, y + 13.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(...C.slate);
  text(doc, `${d.clientTel || "—"}  •  ${d.lieu || "Chantier non renseigné"}`, M + 5, y + 20.5);

  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  text(doc, "OBJET", M + half + 5, y + 6);
  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);
  const obj = doc.splitTextToSize(clean(d.natureTravaux || "Travaux de construction"), w - half - 12);
  text(doc, obj.slice(0, 2), M + half + 5, y + 13.5);
  doc.setTextColor(...C.muted);
  doc.setFontSize(7.5);
  text(doc, `${d.surface || "—"} m²  •  ${d.nbPieces || "—"} pièces  •  ${d.nbEtages || 1} niveau(x)`, M + half + 5, y + 25.5);

  return y + 38;
}

function sectionTitre(doc: Doc, label: string, M: number, y: number, W: number, accent: [number, number, number] = C.amber) {
  roundedCard(doc, M, y, W - 2 * M, 9, C.ink);
  doc.setFillColor(...accent);
  doc.roundedRect(M, y, 2.5, 9, 1.2, 1.2, "F");
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  text(doc, label.toUpperCase(), M + 6, y + 6.2);
  return y + 14;
}

function blocTotaux(doc: Doc, M: number, W: number, y: number, rows: { label: string; value: string; hot?: boolean; neg?: boolean }[], title: string) {
  const bw = Math.min(W * 0.52, 120);
  const bx = W - M - bw;
  const h = 12 + rows.length * 8 + 5;
  roundedCard(doc, bx, y, bw, h, C.ink);
  doc.setTextColor(...C.amber);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  text(doc, title.toUpperCase(), bx + 5, y + 7.5);
  let yy = y + 15;
  for (const row of rows) {
    doc.setFont("helvetica", row.hot ? "bold" : "normal");
    doc.setFontSize(row.hot ? 10 : 8.2);
    const c = row.hot ? [255, 255, 255] : row.neg ? [254, 202, 202] : [226, 232, 240];
    doc.setTextColor(...c);
    text(doc, row.label, bx + 5, yy, { maxWidth: bw * 0.55 });
    text(doc, row.value, bx + bw - 5, yy, { align: "right" });
    yy += 8;
  }
  return { bottom: y + h };
}

function tableauDetaille(doc: Doc, M: number, W: number, y: number, H: number, groups: [string, LignePdf[]][], fontSize: number) {
  const maxY = H - 34;
  const descW = (W - 2 * M) * 0.48;
  const topY = y;
  y = sectionTitre(doc, "Détail quantitatif estimatif", M, y, W);

  groups.forEach(([section, rows]) => {
    const totalSection = rows.reduce((sum, row) => sum + (Number(row.quantite) || 0) * (Number(row.prixUnitaire) || 0), 0);
    if (y + 24 > maxY) {
      doc.addPage();
      y = 18;
    }

    roundedCard(doc, M, y, W - 2 * M, 9, C.pale, C.line);
    doc.setTextColor(...C.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    text(doc, section.toUpperCase(), M + 5, y + 6.1);
    doc.setTextColor(...C.amberDark);
    text(doc, `${money(totalSection)} FCFA`, W - M - 5, y + 6.1, { align: "right" });
    y += 12;

    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    text(doc, "DÉSIGNATION", M + 4, y);
    text(doc, "UNITÉ", M + descW + 10, y);
    text(doc, "QTÉ", M + descW + 55, y, { align: "right" });
    text(doc, "P.U. FCFA", M + descW + 92, y, { align: "right" });
    text(doc, "TOTAL FCFA", W - M - 4, y, { align: "right" });
    y += 3;
    line(doc, M + 3, y, W - M - 3, y, C.line, 0.25);
    y += 4;

    rows.forEach((row, index) => {
      const wrapped = doc.splitTextToSize(clean(row.designation + (row.detail ? ` — ${row.detail}` : "")), descW - 8);
      const blockH = Math.max(7, wrapped.length * (fontSize + 0.5) + 2);
      if (y + blockH > maxY) {
        doc.addPage();
        y = 18;
      }
      if (index % 2 === 1) {
        doc.setFillColor(250, 251, 253);
        doc.rect(M, y - 2, W - 2 * M, blockH + 2, "F");
      }
      doc.setTextColor(...C.ink);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      text(doc, wrapped, M + 4, y + 1.5);
      doc.setTextColor(...C.slate);
      doc.setFontSize(7.2);
      text(doc, row.unite, M + descW + 10, y + 1.5);
      text(doc, fmtN(row.quantite), M + descW + 55, y + 1.5, { align: "right" });
      text(doc, money(row.prixUnitaire), M + descW + 92, y + 1.5, { align: "right" });
      doc.setTextColor(...C.ink);
      doc.setFont("helvetica", "bold");
      text(doc, money((Number(row.quantite) || 0) * (Number(row.prixUnitaire) || 0)), W - M - 4, y + 1.5, { align: "right" });
      y += blockH + 1;
      line(doc, M + 3, y - 1, W - M - 3, y - 1, C.line, 0.18);
    });
    y += 2;
  });
  return y;
}

function tableauLots(doc: Doc, M: number, W: number, y: number, H: number, lots: { nom: string; montant: number }[], total: number, fontSize: number) {
  const maxY = H - 38;
  y = sectionTitre(doc, "Résumé par grandes étapes", M, y, W);
  lots.forEach((lot, idx) => {
    const pct = (lot.montant / (total || 1)) * 100;
    if (y + 18 > maxY) {
      doc.addPage();
      y = 18;
    }
    roundedCard(doc, M, y, W - 2 * M, 16, idx % 2 ? C.pale : C.white, C.line);
    doc.setFillColor(...C.amber);
    doc.circle(M + 7, y + 8, 3, "F");
    doc.setTextColor(...C.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize + 0.6);
    text(doc, `${idx + 1}. ${lot.nom}`, M + 14, y + 6.8, { maxWidth: W * 0.48 });
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    text(doc, `${Math.round(pct)} % du montant HT`, M + 14, y + 12.6);
    const barX = W * 0.62, barW = W * 0.16;
    doc.setFillColor(...C.line); doc.roundedRect(barX, y + 7.5, barW, 2.3, 1, 1, "F");
    if (pct > 0) {
      doc.setFillColor(...C.amber); doc.roundedRect(barX, y + 7.5, Math.max(2, barW * (pct / 100)), 2.3, 1, 1, "F");
    }
    doc.setTextColor(...C.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.8);
    text(doc, `${money(lot.montant)} FCFA`, W - M - 4, y + 9.8, { align: "right" });
    y += 18;
  });
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  text(doc, "Le détail quantitatif et les calculs restent disponibles dans le DQE complet.", M, y + 3, { maxWidth: W - 2 * M });
  return y + 9;
}

function tableauCategories(doc: Doc, M: number, W: number, y: number, H: number, cats: { nom: string; quantite?: number; unite?: string; montant: number }[], fontSize: number) {
  const maxY = H - 38;
  y = sectionTitre(doc, "Synthèse par catégories", M, y, W);
  const qtyX = W * 0.62;
  cats.forEach((cat, i) => {
    if (y + 12 > maxY) {
      doc.addPage();
      y = 18;
    }
    if (i % 2 === 0) {
      roundedCard(doc, M, y - 4.5, W - 2 * M, 10, C.pale);
    }
    doc.setTextColor(...C.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    text(doc, cat.nom, M + 3, y + 1.2, { maxWidth: W * 0.45 });
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    text(doc, cat.quantite ? `${fmtN(cat.quantite)} ${cat.unite || ""}` : "—", qtyX, y + 1.2, { align: "right" });
    doc.setTextColor(...C.ink);
    doc.setFont("helvetica", "bold");
    text(doc, `${money(cat.montant)} FCFA`, W - M - 3, y + 1.2, { align: "right" });
    y += 11;
  });
  return y + 2;
}

function tableauMateriauxClient(doc: Doc, M: number, W: number, y: number, H: number, achats: { designation: string; quantite: number; unite: string }[], fontSize: number) {
  const maxY = H - 38;
  y = sectionTitre(doc, "Matériaux à prévoir", M, y, W, C.green);
  roundedCard(doc, M, y, W - 2 * M, 18, C.greenPale, [167, 243, 208]);
  doc.setTextColor(...C.green);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  text(doc, "L’entreprise facture uniquement la main d’œuvre et la mise en œuvre.", M + 5, y + 7, { maxWidth: W - 2 * M - 12 });
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.muted);
  doc.setFontSize(6.8);
  text(doc, "MATÉRIAU", M + 4, y);
  text(doc, "QUANTITÉ À PRÉVOIR", W - M - 4, y, { align: "right" });
  y += 3; line(doc, M + 3, y, W - M - 3, y); y += 5;

  achats.forEach((item, i) => {
    const rowH = 8;
    if (y + rowH > maxY) {
      doc.addPage();
      y = 18;
    }
    if (i % 2 === 0) {
      roundedCard(doc, M, y - 3, W - 2 * M, 8, C.pale);
    }
    doc.setTextColor(...C.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    text(doc, clean(item.designation), M + 4, y + 1.5, { maxWidth: W * 0.58 });
    doc.setFont("helvetica", "bold");
    text(doc, `${fmtN(item.quantite)} ${clean(item.unite)}`, W - M - 4, y + 1.5, { align: "right" });
    y += rowH + 1.5;
  });
  return y + 3;
}

function blocPlanning(doc: Doc, M: number, W: number, y: number, H: number, planning: any[], fontSize: number) {
  if (!planning?.length) return y;
  const maxY = H - 38;
  if (y + 15 > maxY) {
    doc.addPage();
    y = 20;
  }
  y = sectionTitre(doc, "Planning estimatif", M, y, W);
  const total = planning.reduce((sum, step) => sum + (Number(step.dureeJours) || 0), 0);
  const gx = M + W * 0.62;
  const gw = W - M - gx - 12;
  roundedCard(doc, M, y, W - 2 * M, 12, C.pale);
  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  text(doc, "Durée totale estimée", M + 5, y + 6.5);
  doc.setTextColor(...C.amberDark);
  text(doc, `${total} jours ouvrés  •  ~${Math.ceil(total / 5)} sem.`, W - M - 5, y + 6.5, { align: "right" });
  y += 15;

  let cumul = 0;
  planning.forEach((step, index) => {
    const d = Number(step.dureeJours) || 0;
    if (y + 12 > maxY) {
      doc.addPage();
      y = 20;
    }
    const label = clean(`${index + 1}. ${step.etape || "Étape"}`);
    doc.setTextColor(...C.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    text(doc, label, M + 2, y + 1.2, { maxWidth: W * 0.48 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.1);
    doc.setTextColor(...C.muted);
    if (step.detail) {
      const detail = doc.splitTextToSize(clean(step.detail), W * 0.48);
      text(doc, detail.slice(0, 2), M + 2, y + 5.2);
    }

    const start = total > 0 ? (cumul / total) * gw : 0;
    const width = total > 0 ? (d / total) * gw : 0;
    doc.setFillColor(...C.line);
    doc.roundedRect(gx, y + 1, gw, 3.2, 1.2, 1.2, "F");
    if (width > 0) {
      doc.setFillColor(...C.amber);
      doc.roundedRect(gx + start, y + 1, Math.max(2, width), 3.2, 1.2, 1.2, "F");
    }
    doc.setTextColor(...C.slate);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    text(doc, `${d} j`, W - M - 4, y + 2.5, { align: "right" });
    cumul += d;
    y += 11;
  });
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  text(doc, "Planning indicatif, hors aléas météo et délais d’approvisionnement.", M, y + 2, { maxWidth: W - 2 * M });
  return y + 8;
}

function piedPage(doc: Doc, ent: PdfEntreprise | null | undefined, W: number, H: number, M: number) {
  const pages = doc.getNumberOfPages();
  const legal = [ent?.nom || "", ent?.rccm ? `RCCM ${ent.rccm}` : "", ent?.compteContribuable ? `CC ${ent.compteContribuable}` : "", ent?.adresse || ent?.ville || ""].filter(Boolean).join("  •  ");
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    line(doc, M, H - 16, W - M, H - 16, C.line, 0.35);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.setFontSize(6.6);
    if (legal) text(doc, legal, W / 2, H - 11, { align: "center", maxWidth: W - 2 * M });
    doc.setTextColor(...C.slate);
    text(doc, `DevisBTP CI  •  Page ${page}/${pages}`, W / 2, H - 6.5, { align: "center" });
  }
}

function signer(doc: Doc, ent: PdfEntreprise | null | undefined, clientSig?: { data?: string; nom?: string; date?: any }, W = 210, H = 297, M = 14) {
  const y = H - 58;
  doc.setTextColor(...C.slate);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  text(doc, clientSig?.data ? "SIGNATURE DU CLIENT" : "BON POUR ACCORD", M, y);
  text(doc, "POUR L’ENTREPRISE", W - M, y, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...C.muted);
  text(doc, clientSig?.nom || "Nom + signature", M, y + 6);
  text(doc, ent?.proprietaire || ent?.nom || "Nom du responsable", W - M, y + 6, { align: "right" });

  if (clientSig?.data) addImg(doc, clientSig.data, M + 2, y + 9, 48, 14);
  if (ent?.signatureData) addImg(doc, ent.signatureData, W - M - 68, y + 9, 38, 12);
  if (ent?.cachetData) addImg(doc, ent.cachetData, W - M - 42, y + 1, 26, 26);

  line(doc, M, y + 26, M + 62, y + 26, [148, 163, 184], 0.45);
  line(doc, W - M - 62, y + 26, W - M, y + 26, [148, 163, 184], 0.45);

  if (clientSig?.date) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    text(doc, `Signé le ${new Date(clientSig.date).toLocaleDateString("fr-FR")}`, M, y + 32);
  }
}

export interface PdfDevisInput {
  format: FormatPapier;
  entreprise: PdfEntreprise | null | undefined;
  devis: any;
  lignes: LignePdf[];
  planning?: any[];
  tot: {
    materiaux: number;
    mo: number;
    htBrut: number;
    remise: number;
    ht: number;
    tva: number;
    ttc: number;
    tvaPct: number;
    remisePct: number;
    moLabel: string;
    moSeule?: boolean;
    moSeuleTTC?: number;
  };
  resume?: { lots: { nom: string; montant: number }[]; categories: { nom: string; quantite?: number; unite?: string; montant: number }[] };
  achatsClient?: { designation: string; quantite: number; unite: string }[];
  clause?: string;
  titreDoc?: string;
  nomFichier: string;
  statutSigne?: { data?: string; nom?: string; date?: any };
  apercu?: boolean;
}

export async function genererPdfDevis(input: PdfDevisInput): Promise<string> {
  const { default: jsPDF } = await import("jspdf");
  const { format, W, H } = formatPapierInfo(input.format);
  const M = input.format === "A3" ? 18 : 14;
  const fontSize = input.format === "A3" ? 9.3 : 7.8;
  const doc = new jsPDF({ unit: "mm", format, compress: true });
  const d = input.devis;
  const dateDoc = new Date(d.createdAt || Date.now()).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  pageCouvertureDevis(doc, input.entreprise, d, input.tot, W, H, M);
  doc.addPage();
  entete(doc, input.entreprise, input.titreDoc || "Devis quantitatif estimatif", d.numero || "DEVIS", dateDoc, d.lieu || "", W);

  let y = 44;
  y = blocClient(doc, M, W, y, d);

  const modeMoSeule = !!d.materiauxClient;
  const formatPdf = d.formatPdf || "general";

  if (modeMoSeule && input.achatsClient?.length) {
    y = tableauMateriauxClient(doc, M, W, y, H, input.achatsClient, fontSize);
  } else if (formatPdf === "general" && input.resume?.lots?.length) {
    y = tableauLots(doc, M, W, y, H, input.resume.lots, input.tot.htBrut, fontSize);
  } else if (formatPdf === "materiaux" && input.resume?.categories?.length) {
    y = tableauCategories(doc, M, W, y, H, input.resume.categories, fontSize);
  } else {
    const groups = new Map<string, LignePdf[]>();
    for (const item of input.lignes) {
      const section = item.section || "Divers";
      const list = groups.get(section) || [];
      list.push(item);
      groups.set(section, list);
    }
    y = tableauDetaille(doc, M, W, y, H, Array.from(groups.entries()), fontSize);
  }

  y = blocPlanning(doc, M, W, y, H, input.planning || [], fontSize);

  const t = input.tot;
  const rowsTotaux = modeMoSeule
    ? [
        { label: "Main-d'œuvre HT", value: `${money((t.moSeuleTTC || t.mo) / (1 + t.tvaPct / 100))} FCFA` },
        { label: `TVA ${t.tvaPct} %`, value: `${money((t.moSeuleTTC || t.mo) - ((t.moSeuleTTC || t.mo) / (1 + t.tvaPct / 100)))} FCFA` },
        { label: "TOTAL À PAYER TTC", value: `${money(t.moSeuleTTC || t.mo)} FCFA`, hot: true },
      ]
    : formatPdf === "general"
      ? [
          { label: "Total travaux HT", value: `${money(t.htBrut)} FCFA` },
          ...(t.remise > 0 ? [{ label: `Remise ${t.remisePct} %`, value: `− ${money(t.remise)} FCFA`, neg: true }] : []),
          { label: `TVA ${t.tvaPct} %`, value: `${money(t.tva)} FCFA` },
          { label: "TOTAL TTC", value: `${money(t.ttc)} FCFA`, hot: true },
        ]
      : [
          { label: "Matériaux & fournitures", value: `${money(t.materiaux)} FCFA` },
          { label: `Main-d'œuvre (${t.moLabel})`, value: `${money(t.mo)} FCFA` },
          { label: "Total HT", value: `${money(t.htBrut)} FCFA` },
          ...(t.remise > 0 ? [{ label: `Remise ${t.remisePct} %`, value: `− ${money(t.remise)} FCFA`, neg: true }] : []),
          { label: `TVA ${t.tvaPct} %`, value: `${money(t.tva)} FCFA` },
          { label: "TOTAL TTC", value: `${money(t.ttc)} FCFA`, hot: true },
        ];

  const noteW = W * 0.46;
  const notes = [
    `Validité de l'offre : ${d.validiteJours || 30} jours.`,
    "Paiement : acompte 40 % au démarrage, 40 % à mi-chantier, 20 % à la réception.",
    modeMoSeule ? `Valeur totale des travaux si l'entreprise fournissait les matériaux : ${money(t.ttc)} FCFA TTC.` : "Arrêté le présent devis à la somme TTC ci-contre.",
    d.formatPdf === "detaille" ? "Quantités selon normes CI : 13 agglos 40×20/m² ; mortier 0,25 sac + 0,025 m³ sable/m² ; enduit 0,25 sac + 0,03 m³/m² ; béton 350 kg/m³ = 7 sacs + 0,40 m³." : "Le détail technique est disponible en interne et sur demande.",
  ];

  if (y > H - 95) {
    doc.addPage();
    y = 24;
    entete(doc, input.entreprise, input.titreDoc || "Devis quantitatif estimatif", d.numero || "DEVIS", dateDoc, d.lieu || "", W);
  }

  const noteBlockY = y;
  const noteBlockH = 8 + notes.reduce((sum, note) => sum + doc.splitTextToSize(clean(note), noteW - 10).length * 4, 0);
  const totalsBoxY = y;
  const totalsBoxH = 12 + rowsTotaux.length * 8 + 6;

  if (noteBlockH + totalsBoxH > H - 80) {
    doc.addPage();
    y = 24;
    entete(doc, input.entreprise, input.titreDoc || "Devis quantitatif estimatif", d.numero || "DEVIS", dateDoc, d.lieu || "", W);
  }

  roundedCard(doc, M, y, noteW, noteBlockH, C.pale, C.line);
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  text(doc, "À SAVOIR", M + 5, y + 6);
  doc.setTextColor(...C.slate);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  let ny = y + 11;
  notes.forEach((note) => {
    const lines = doc.splitTextToSize(clean(note), noteW - 10);
    text(doc, lines, M + 5, ny);
    ny += lines.length * 4;
  });

  const totalsY = y;
  const totalsBoxW = W - M - noteW - 10;
  const totalsX = W - M - totalsBoxW;
  roundedCard(doc, totalsX, totalsY, totalsBoxW, totalsBoxH, C.ink);
  doc.setTextColor(...C.amber);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  text(doc, "RÉCAPITULATIF", totalsX + 5, totalsY + 7.5);
  let ty = totalsY + 15;
  for (const row of rowsTotaux) {
    doc.setFont("helvetica", row.hot ? "bold" : "normal");
    doc.setFontSize(row.hot ? 10 : 8.2);
    const color = row.hot ? [255, 255, 255] : row.neg ? [254, 202, 202] : [226, 232, 240];
    doc.setTextColor(...color);
    text(doc, row.label, totalsX + 5, ty);
    text(doc, row.value, totalsX + totalsBoxW - 5, ty, { align: "right" });
    ty += 8;
  }

  const clauseY = Math.max(y + 40, H - 74);
  if (input.clause) {
    const clauseLines = doc.splitTextToSize(clean(input.clause), W - 2 * M - 10);
    const clauseH = 8 + Math.min(clauseLines.length, 3) * 3.4;
    roundedCard(doc, M, clauseY, W - 2 * M, clauseH, [255, 248, 235], [252, 211, 77]);
    doc.setTextColor(...C.amberDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    text(doc, "VALIDITÉ DE L’OFFRE", M + 5, clauseY + 5.6);
    doc.setTextColor(...C.slate);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    text(doc, clauseLines.slice(0, 3), M + 5, clauseY + 9.8);
  }

  signer(doc, input.entreprise, input.statutSigne, W, H, M);
  piedPage(doc, input.entreprise, W, H, M);

  if (input.apercu) return doc.output("bloburl") as unknown as string;
  doc.save(input.nomFichier);
  return input.nomFichier;
}

export async function genererPdfFacture(input: {
  format: FormatPapier;
  entreprise: PdfEntreprise | null | undefined;
  facture: any;
  devis: any;
  nomFichier: string;
}): Promise<string> {
  const { default: jsPDF } = await import("jspdf");
  const { format, W, H } = formatPapierInfo(input.format);
  const M = input.format === "A3" ? 18 : 14;
  const doc = new jsPDF({ unit: "mm", format, compress: true });
  const { facture: f, devis: d } = input;
  const dateDoc = new Date(f.createdAt || Date.now()).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  pageCouvertureFacture(doc, input.entreprise, f, d, W, H, M);
  doc.addPage();
  entete(doc, input.entreprise, "Facture d’acompte", f.numero, dateDoc, d.lieu || "", W);

  let y = 45;
  y = blocClient(doc, M, W, y, d);
  roundedCard(doc, M, y, W - 2 * M, 17, [255, 247, 237], [253, 186, 116]);
  doc.setTextColor(...C.amberDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  text(doc, `Acompte de ${f.pct || 0} %`, M + 5, y + 8);
  doc.setTextColor(...C.ink);
  doc.setFontSize(13.5);
  text(doc, `${money(f.montant || 0)} FCFA À PAYER`, W - M - 5, y + 12, { align: "right" });
  y += 24;

  const rows = [
    { label: "Total devis TTC", value: `${money(f.totalDevisTTC || 0)} FCFA` },
    { label: `Acompte demandé (${f.pct || 0} %)`, value: `${money(f.montant || 0)} FCFA` },
    { label: "Déjà facturé", value: `${money(f.dejaFacture || 0)} FCFA` },
    { label: "Solde restant", value: `${money(f.soldeRestant || 0)} FCFA`, hot: true },
  ];
  const totalBox = blocTotaux(doc, M, W, y, rows, "Détail de l’acompte");
  const noteY = totalBox.bottom + 8;
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const note = doc.splitTextToSize("Paiement par Wave, Orange Money ou virement. Cette facture d’acompte vient en déduction du montant total du devis.", W - 2 * M);
  text(doc, note, M, noteY, { maxWidth: W - 2 * M });

  signer(doc, input.entreprise, undefined, W, H, M);
  piedPage(doc, input.entreprise, W, H, M);
  doc.save(input.nomFichier);
  return input.nomFichier;
}

export async function genererPdfAvenant(input: {
  format: FormatPapier;
  entreprise: PdfEntreprise | null | undefined;
  avenant: any;
  devis: any;
  lignes: LignePdf[];
  nomFichier: string;
  signesAvant?: number;
}): Promise<string> {
  const { default: jsPDF } = await import("jspdf");
  const { format, W, H } = formatPapierInfo(input.format);
  const M = input.format === "A3" ? 18 : 14;
  const fontSize = input.format === "A3" ? 9.3 : 7.8;
  const doc = new jsPDF({ unit: "mm", format, compress: true });
  const { avenant: a, devis: d } = input;
  const dateDoc = new Date(a.createdAt || Date.now()).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  pageCouvertureAvenant(doc, input.entreprise, a, d, W, H, M);
  doc.addPage();
  entete(doc, input.entreprise, `Avenant au devis ${d.numero || "DEVIS"}`, a.numero || "AVENANT", dateDoc, d.lieu || "", W);

  let y = 44;
  roundedCard(doc, M, y, W - 2 * M, 16, [255, 247, 237], [253, 186, 116]);
  doc.setTextColor(...C.amberDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  text(doc, a.titre || "Travaux supplémentaires", M + 5, y + 8.5);
  y += 22;

  roundedCard(doc, M, y, W - 2 * M, 26, C.pale, C.line);
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  text(doc, "RATTACHEMENT AU DEVIS D’ORIGINE", M + 5, y + 7);
  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  text(doc, `Devis d’origine : ${d.numero || "—"}  •  Client : ${d.clientNom || "—"}`, M + 5, y + 14);
  text(doc, `Chantier : ${d.lieu || "—"}  •  Total initial TTC : ${money(d.totalTTC || 0)} FCFA`, M + 5, y + 20);
  y += 34;

  if (a.description) {
    const desc = doc.splitTextToSize(clean(`Motif : ${a.description}`), W - 2 * M - 10);
    roundedCard(doc, M, y, W - 2 * M, 12 + desc.length * 3.5, C.pale, C.line);
    doc.setTextColor(...C.slate);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    text(doc, desc, M + 5, y + 6);
    y += 12 + desc.length * 3.5 + 4;
  }

  y = sectionTitre(doc, "Travaux supplémentaires", M, y, W, C.violet);
  const descW = (W - 2 * M) * 0.52;
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  text(doc, "DÉSIGNATION", M + 4, y);
  text(doc, "UNITÉ", M + descW + 14, y);
  text(doc, "QTÉ", M + descW + 52, y, { align: "right" });
  text(doc, "P.U. FCFA", M + descW + 92, y, { align: "right" });
  text(doc, "TOTAL FCFA", W - M - 4, y, { align: "right" });
  y += 3; line(doc, M + 3, y, W - M - 3, y, C.line, 0.25); y += 5;

  let maxY = H - 70;
  input.lignes.forEach((item, index) => {
    const wrapped = doc.splitTextToSize(clean(item.designation + (item.detail ? ` — ${item.detail}` : "")), descW - 8);
    const blockH = Math.max(8, wrapped.length * (fontSize + 0.5) + 2);
    if (y + blockH > maxY) {
      doc.addPage();
      y = 20;
      entete(doc, input.entreprise, `Avenant au devis ${d.numero || "DEVIS"}`, a.numero || "AVENANT", dateDoc, d.lieu || "", W);
    }
    if (index % 2 === 1) {
      doc.setFillColor(250, 251, 253); doc.rect(M, y - 2, W - 2 * M, blockH + 2, "F");
    }
    doc.setTextColor(...C.ink); doc.setFont("helvetica", "normal"); doc.setFontSize(fontSize);
    text(doc, wrapped, M + 4, y + 1.5);
    doc.setTextColor(...C.slate); doc.setFont("helvetica", "normal"); doc.setFontSize(7.2);
    text(doc, item.unite, M + descW + 14, y + 1.5);
    text(doc, fmtN(item.quantite), M + descW + 52, y + 1.5, { align: "right" });
    text(doc, money(item.prixUnitaire), M + descW + 92, y + 1.5, { align: "right" });
    doc.setTextColor(...C.ink); doc.setFont("helvetica", "bold");
    text(doc, money((Number(item.quantite) || 0) * (Number(item.prixUnitaire) || 0)), W - M - 4, y + 1.5, { align: "right" });
    y += blockH + 1.5;
    line(doc, M + 3, y - 1, W - M - 3, y - 1, C.line, 0.18);
  });

  const htA = input.lignes.reduce((sum, item) => sum + (Number(item.quantite) || 0) * (Number(item.prixUnitaire) || 0), 0);
  const tvaPct = Number(d.tvaPct ?? 18);
  const tvaA = htA * tvaPct / 100;
  y += 6;
  const rows = [
    { label: "Total avenant HT", value: `${money(htA)} FCFA` },
    { label: `TVA ${tvaPct} %`, value: `${money(tvaA)} FCFA` },
    { label: "TOTAL AVENANT TTC", value: `${money(htA + tvaA)} FCFA`, hot: true },
    { label: "Nouveau total chantier", value: `${money((d.totalTTC || 0) + (input.signesAvant || 0) + htA + tvaA)} FCFA` },
  ];
  const totalBox = blocTotaux(doc, M, W, y, rows, "Récapitulatif de l’avenant");
  const noteY = totalBox.bottom + 10;
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const note = doc.splitTextToSize("Le présent avenant complète le devis d’origine. Les travaux supplémentaires démarrent après accord écrit du client.", W - 2 * M);
  text(doc, note, M, noteY, { maxWidth: W - 2 * M });

  signer(doc, input.entreprise, undefined, W, H, M);
  piedPage(doc, input.entreprise, W, H, M);
  doc.save(input.nomFichier);
  return input.nomFichier;
}
