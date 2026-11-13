"use client";

/**
 * Génération PDF DevisBTP CI.
 * Mise en page vectorielle pensée pour l'impression A4/A3 et la lecture sur téléphone :
 * hiérarchie claire, chiffres alignés, couleurs sobres, tables aérées et pages paginées.
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
  green: [0, 154, 68] as [number, number, number],
  greenPale: [236, 253, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const clean = (s: unknown) => String(s ?? "")
  .replace(/œ/g, "oe").replace(/Œ/g, "OE").replace(/[’‘]/g, "'")
  .replace(/[“”]/g, '"').replace(/✓/g, "OK")
  .replace(/[\u{1F300}-\u{1FAFF}]/gu, "");
const money = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));
const fmtN = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(n) || 0);
type Doc = any;

export type PdfEntreprise = {
  nom?: string; proprietaire?: string; telephone?: string; email?: string;
  adresse?: string; ville?: string; rccm?: string; compteContribuable?: string;
  logoData?: string; signatureData?: string; cachetData?: string;
};

type LignePdf = { section?: string; designation: string; detail?: string | null; unite: string; quantite: number; prixUnitaire: number };

type TotauxPdf = {
  materiaux: number; mo: number; htBrut: number; remise: number; ht: number; tva: number; ttc: number;
  tvaPct: number; remisePct: number; moLabel: string; moSeule?: boolean; moSeuleTTC?: number;
};

function addImg(doc: Doc, data: string | undefined, x: number, y: number, w: number, h: number) {
  if (!data) return;
  try { doc.addImage(data, data.includes("image/png") ? "PNG" : "JPEG", x, y, w, h, undefined, "FAST"); } catch { /* image optionnelle illisible */ }
}

function text(doc: Doc, value: unknown, x: number, y: number, options?: Record<string, unknown>) {
  doc.text(clean(value), x, y, options);
}

function line(doc: Doc, x1: number, y1: number, x2: number, y2: number, color = C.line, width = 0.3) {
  doc.setDrawColor(...color); doc.setLineWidth(width); doc.line(x1, y1, x2, y2);
}

function roundRect(doc: Doc, x: number, y: number, w: number, h: number, fill: [number, number, number], stroke?: [number, number, number]) {
  doc.setFillColor(...fill);
  if (stroke) { doc.setDrawColor(...stroke); doc.setLineWidth(0.35); doc.roundedRect(x, y, w, h, 2.5, 2.5, "FD"); }
  else doc.roundedRect(x, y, w, h, 2.5, 2.5, "F");
}

/** Marque et identité documentaire, avec une vraie séparation entre société et devis. */
function entete(doc: Doc, ent: PdfEntreprise | null | undefined, titre: string, numero: string, date: string, lieu: string, W: number, M: number) {
  doc.setFillColor(...C.ink); doc.rect(0, 0, W, 39, "F");
  doc.setFillColor(...C.amber); doc.rect(0, 39, W, 2.3, "F");
  const logo = !!ent?.logoData;
  if (logo) {
    roundRect(doc, M, 7, 23, 23, C.white);
    addImg(doc, ent!.logoData, M + 1.5, 8.5, 20, 20);
  }
  const tx = logo ? M + 29 : M;
  doc.setTextColor(...C.white); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  text(doc, ent?.nom || "DevisBTP CI", tx, 14);
  doc.setTextColor(203, 213, 225); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  const contact = [ent?.adresse || ent?.ville || "Abidjan, Côte d'Ivoire", ent?.telephone, ent?.email].filter(Boolean).join("  •  ");
  const leftMax = Math.max(60, W * 0.53 - tx);
  const contactLines = doc.splitTextToSize(clean(contact), leftMax);
  text(doc, contactLines.slice(0, 2), tx, 20);
  const legal = [ent?.rccm ? `RCCM ${ent.rccm}` : "", ent?.compteContribuable ? `CC ${ent.compteContribuable}` : ""].filter(Boolean).join("  •  ");
  if (legal) { doc.setFontSize(7.5); text(doc, legal, tx, 31); }

  const rx = W - M;
  doc.setTextColor(...C.amber); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  text(doc, titre.toUpperCase(), rx, 10, { align: "right" });
  doc.setTextColor(...C.white); doc.setFontSize(14);
  text(doc, numero, rx, 19, { align: "right" });
  doc.setTextColor(203, 213, 225); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  text(doc, `Émis le ${date}`, rx, 26, { align: "right" });
  const lieuLines = doc.splitTextToSize(clean(`Chantier : ${lieu}`), W * 0.40);
  text(doc, lieuLines.slice(0, 1), rx, 32, { align: "right" });
}

function blocClient(doc: Doc, M: number, W: number, y: number, d: any) {
  const w = W - 2 * M;
  roundRect(doc, M, y, w, 31, C.pale, C.line);
  const half = w * 0.51;
  doc.setTextColor(...C.muted); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
  text(doc, "CLIENT", M + 5, y + 7);
  doc.setTextColor(...C.ink); doc.setFontSize(11.5);
  text(doc, d.clientNom || "Client", M + 5, y + 14);
  doc.setTextColor(...C.slate); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  text(doc, d.clientTel || "Téléphone non renseigné", M + 5, y + 21);
  text(doc, clean(d.lieu || "Chantier non renseigné"), M + 5, y + 27);

  const rightX = M + half;
  doc.setTextColor(...C.muted); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
  text(doc, "OBJET DES TRAVAUX", rightX, y + 7);
  doc.setTextColor(...C.ink); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  const travaux = doc.splitTextToSize(clean(d.natureTravaux || "Travaux de construction"), w - half - 10);
  text(doc, travaux.slice(0, 2), rightX, y + 14);
  doc.setTextColor(...C.muted); doc.setFontSize(7.5);
  text(doc, `${d.surface || "—"} m²  •  ${d.nbPieces || "—"} pièces  •  ${d.nbEtages || 1} niveau(x)`, rightX, y + 27);
  return y + 38;
}

function sectionTitre(doc: Doc, label: string, M: number, y: number, W: number, accent: [number, number, number] = C.amber) {
  doc.setFillColor(...C.ink); doc.roundedRect(M, y, W - 2 * M, 9, 1.8, 1.8, "F");
  doc.setFillColor(...accent); doc.roundedRect(M, y, 2.2, 9, 1, 1, "F");
  doc.setTextColor(...C.white); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  text(doc, label.toUpperCase(), M + 6, y + 6.1);
  return y + 14;
}

function blocTotaux(doc: Doc, M: number, W: number, y: number, rows: { label: string; value: string; hot?: boolean; neg?: boolean }[], title: string) {
  const bw = Math.min(W * 0.54, 105);
  const bx = W - M - bw;
  const h = 12 + rows.length * 8 + 5;
  roundRect(doc, bx, y, bw, h, C.ink);
  doc.setTextColor(...C.amber); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  text(doc, title.toUpperCase(), bx + 5, y + 8);
  let yy = y + 16;
  for (const row of rows) {
    doc.setFont("helvetica", row.hot ? "bold" : "normal");
    doc.setFontSize(row.hot ? 10 : 8.5);
    doc.setTextColor(...(row.hot ? [255, 255, 255] as [number, number, number] : row.neg ? [252, 165, 165] as [number, number, number] : [226, 232, 240] as [number, number, number]));
    text(doc, row.label, bx + 5, yy, { maxWidth: bw * 0.58 });
    text(doc, row.value, bx + bw - 5, yy, { align: "right" });
    yy += 8;
  }
  return { x: bx, y, w: bw, h, bottom: y + h };
}

function tableauDetaille(doc: Doc, M: number, W: number, y: number, H: number, groups: [string, LignePdf[]][], fontSize: number) {
  const maxY = H - 31;
  const widths = { desc: (W - 2 * M) * 0.47, unit: 13, qty: 17, pu: 28, total: 32 };
  const colX = { desc: M + 4, unit: M + widths.desc, qty: M + widths.desc + widths.unit, pu: M + widths.desc + widths.unit + widths.qty, total: W - M - 4 };
  y = sectionTitre(doc, "Détail quantitatif estimatif", M, y, W);

  groups.forEach(([section, rows]) => {
    const sectionHeight = 17;
    if (y + sectionHeight > maxY) { doc.addPage(); y = 18; }
    doc.setFillColor(241, 245, 249); doc.roundedRect(M, y, W - 2 * M, 7.5, 1.5, 1.5, "F");
    doc.setTextColor(...C.ink); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    text(doc, section.toUpperCase(), M + 4, y + 5.2);
    const totalSection = rows.reduce((sum, row) => sum + (Number(row.quantite) || 0) * (Number(row.prixUnitaire) || 0), 0);
    doc.setTextColor(...C.amberDark); text(doc, `${money(totalSection)} FCFA`, W - M - 4, y + 5.2, { align: "right" });
    y += 10;
    doc.setTextColor(...C.muted); doc.setFont("helvetica", "bold"); doc.setFontSize(6.8);
    text(doc, "DÉSIGNATION", colX.desc, y);
    text(doc, "UNITÉ", colX.unit, y);
    text(doc, "QTÉ", colX.qty, y, { align: "right" });
    text(doc, "P.U. (FCFA)", colX.pu, y, { align: "right" });
    text(doc, "TOTAL (FCFA)", colX.total, y, { align: "right" });
    y += 3;
    line(doc, M + 3, y, W - M - 3, y);
    y += 4;

    rows.forEach((row, i) => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(fontSize);
      const description = clean(row.designation + (row.detail ? ` — ${row.detail}` : ""));
      const wrapped = doc.splitTextToSize(description, widths.desc - 7);
      const rowHeight = Math.max(8, wrapped.length * (fontSize * 0.42 + 1.6) + 3);
      if (y + rowHeight > maxY) {
        doc.addPage(); y = 18;
        doc.setFillColor(...C.pale); doc.rect(M, y - 3, W - 2 * M, 8, "F");
        doc.setTextColor(...C.muted); doc.setFont("helvetica", "bold"); doc.setFontSize(6.8);
        text(doc, "DÉSIGNATION", colX.desc, y + 2);
        text(doc, "UNITÉ", colX.unit, y + 2);
        text(doc, "QTÉ", colX.qty, y + 2, { align: "right" });
        text(doc, "P.U. (FCFA)", colX.pu, y + 2, { align: "right" });
        text(doc, "TOTAL (FCFA)", colX.total, y + 2, { align: "right" });
        y += 8;
      }
      if (i % 2 === 1) { doc.setFillColor(250, 251, 253); doc.rect(M, y - 3, W - 2 * M, rowHeight, "F"); }
      doc.setTextColor(...C.ink); doc.setFont("helvetica", "normal"); doc.setFontSize(fontSize);
      text(doc, wrapped, colX.desc, y + 1, { maxWidth: widths.desc - 7 });
      doc.setTextColor(...C.slate); doc.setFontSize(7.5);
      text(doc, row.unite, colX.unit, y + 1, { maxWidth: widths.unit - 2 });
      text(doc, fmtN(row.quantite), colX.qty, y + 1, { align: "right" });
      text(doc, money(row.prixUnitaire), colX.pu, y + 1, { align: "right" });
      doc.setTextColor(...C.ink); doc.setFont("helvetica", "bold");
      text(doc, money((Number(row.quantite) || 0) * (Number(row.prixUnitaire) || 0)), colX.total, y + 1, { align: "right" });
      y += rowHeight;
      line(doc, M + 3, y - 1, W - M - 3, y - 1, [241, 245, 249], 0.2);
    });
    y += 4;
  });
  return y;
}

function tableauLots(doc: Doc, M: number, W: number, y: number, H: number, lots: { nom: string; montant: number }[], total: number, fontSize: number) {
  const maxY = H - 38;
  y = sectionTitre(doc, "Résumé du projet par étapes", M, y, W);
  lots.forEach((lot, index) => {
    if (y + 22 > maxY) { doc.addPage(); y = 20; }
    const pct = Math.max(0, Math.min(1, lot.montant / (total || 1)));
    roundRect(doc, M, y, W - 2 * M, 18, index % 2 ? C.pale : C.white, C.line);
    doc.setFillColor(...C.amber); doc.circle(M + 7, y + 9, 3.2, "F");
    doc.setTextColor(...C.ink); doc.setFont("helvetica", "bold"); doc.setFontSize(fontSize + 0.7);
    text(doc, `${index + 1}. ${lot.nom}`, M + 14, y + 7.2, { maxWidth: W * 0.52 });
    doc.setTextColor(...C.muted); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    text(doc, `${Math.round(pct * 100)} % du montant HT`, M + 14, y + 13.5);
    const barX = W * 0.62, barW = W * 0.16;
    doc.setFillColor(...C.line); doc.roundedRect(barX, y + 8, barW, 2.3, 1, 1, "F");
    if (pct > 0) { doc.setFillColor(...C.amber); doc.roundedRect(barX, y + 8, Math.max(2, barW * pct), 2.3, 1, 1, "F"); }
    doc.setTextColor(...C.ink); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    text(doc, `${money(lot.montant)} FCFA`, W - M - 4, y + 11, { align: "right" });
    y += 22;
  });
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...C.muted);
  text(doc, "Le détail des quantités et calculs reste disponible dans le DQE complet.", M, y + 2, { maxWidth: W - 2 * M });
  return y + 9;
}

function tableauCategories(doc: Doc, M: number, W: number, y: number, H: number, cats: { nom: string; quantite?: number; unite?: string; montant: number }[], fontSize: number) {
  const maxY = H - 38;
  y = sectionTitre(doc, "Synthèse par catégorie", M, y, W);
  const qtyX = W * 0.62;
  cats.forEach((cat, i) => {
    if (y + 12 > maxY) { doc.addPage(); y = 20; }
    if (i % 2 === 0) { doc.setFillColor(...C.pale); doc.roundedRect(M, y - 5, W - 2 * M, 11, 1.5, 1.5, "F"); }
    doc.setTextColor(...C.ink); doc.setFont("helvetica", "bold"); doc.setFontSize(fontSize);
    text(doc, cat.nom, M + 3, y, { maxWidth: W * 0.42 });
    doc.setTextColor(...C.muted); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    text(doc, cat.quantite ? `${fmtN(cat.quantite)} ${cat.unite || ""}` : "—", qtyX, y, { align: "right" });
    doc.setTextColor(...C.ink); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    text(doc, `${money(cat.montant)} FCFA`, W - M - 3, y, { align: "right" });
    y += 11;
  });
  return y + 2;
}

function tableauMateriauxClient(doc: Doc, M: number, W: number, y: number, H: number, achats: { designation: string; quantite: number; unite: string }[], fontSize: number) {
  const maxY = H - 38;
  y = sectionTitre(doc, "Matériaux à prévoir", M, y, W, C.green);
  roundRect(doc, M, y, W - 2 * M, 18, C.greenPale, [167, 243, 208]);
  doc.setTextColor(6, 95, 70); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  const intro = doc.splitTextToSize("Le client fournit les matériaux ci-dessous. L'entreprise facture uniquement la main-d'œuvre et la mise en œuvre.", W - 2 * M - 10);
  text(doc, intro.slice(0, 2), M + 5, y + 7);
  y += 25;
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...C.muted);
  text(doc, "MATÉRIAU", M + 4, y); text(doc, "QUANTITÉ À PRÉVOIR", W - M - 4, y, { align: "right" });
  y += 4; line(doc, M + 3, y, W - M - 3, y); y += 5;
  achats.forEach((item, i) => {
    const wrapped = doc.splitTextToSize(clean(item.designation), W * 0.56);
    const rowHeight = Math.max(9, wrapped.length * 4 + 3);
    if (y + rowHeight > maxY) { doc.addPage(); y = 20; }
    if (i % 2 === 0) { doc.setFillColor(...C.pale); doc.rect(M, y - 3, W - 2 * M, rowHeight, "F"); }
    doc.setTextColor(...C.ink); doc.setFont("helvetica", "normal"); doc.setFontSize(fontSize);
    text(doc, wrapped, M + 4, y + 1);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    text(doc, `${fmtN(item.quantite)} ${clean(item.unite)}`, W - M - 4, y + 1, { align: "right" });
    y += rowHeight;
  });
  return y + 4;
}

function blocPlanning(doc: Doc, M: number, W: number, y: number, H: number, planning: any[], fontSize: number) {
  if (!planning?.length) return y;
  const maxY = H - 38;
  if (y + 25 > maxY) { doc.addPage(); y = 20; }
  y = sectionTitre(doc, "Planning prévisionnel", M, y, W);
  const total = planning.reduce((sum, item) => sum + (Number(item.dureeJours) || 0), 0);
  const gx = M + W * 0.59, gw = W - M - gx - 12;
  roundRect(doc, M, y - 2, W - 2 * M, 11, C.pale);
  doc.setTextColor(...C.ink); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  text(doc, "Durée totale estimée", M + 4, y + 5);
  doc.setTextColor(...C.amberDark); text(doc, `${total} jours ouvrés  (≈ ${Math.ceil(total / 5)} sem.)`, W - M - 4, y + 5, { align: "right" });
  y += 15;
  let elapsed = 0;
  planning.forEach((step, index) => {
    const duration = Number(step.dureeJours) || 0;
    const label = clean(`${index + 1}. ${step.etape || "Étape"}`);
    const detail = clean(step.detail || "");
    const wrapped = detail ? doc.splitTextToSize(detail, W * 0.48) : [];
    const rowHeight = Math.max(12, 8 + wrapped.length * 3.5);
    if (y + rowHeight > maxY) { doc.addPage(); y = 20; }
    doc.setTextColor(...C.ink); doc.setFont("helvetica", "bold"); doc.setFontSize(fontSize);
    text(doc, label, M + 2, y + 1, { maxWidth: W * 0.5 });
    if (wrapped.length) { doc.setTextColor(...C.muted); doc.setFont("helvetica", "normal"); doc.setFontSize(7.2); text(doc, wrapped.slice(0, 2), M + 2, y + 5); }
    const start = total > 0 ? (elapsed / total) * gw : 0;
    const width = total > 0 ? (duration / total) * gw : 0;
    doc.setFillColor(...C.line); doc.roundedRect(gx, y + 1, gw, 3, 1.2, 1.2, "F");
    if (width > 0) { doc.setFillColor(...C.amber); doc.roundedRect(gx + start, y + 1, Math.max(2, width), 3, 1.2, 1.2, "F"); }
    doc.setTextColor(...C.slate); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
    text(doc, `${duration} j`, W - M - 2, y + 2, { align: "right" });
    elapsed += duration;
    y += rowHeight;
  });
  doc.setTextColor(...C.muted); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
  text(doc, "Durée indicative, hors aléas météo et délais d'approvisionnement.", M, y + 2, { maxWidth: W - 2 * M });
  return y + 8;
}

function blocNotes(doc: Doc, M: number, y: number, w: number, notes: string[]) {
  const innerW = w - 10;
  const wrapped = notes.flatMap((note) => doc.splitTextToSize(clean(note), innerW));
  const h = 8 + wrapped.length * 4;
  roundRect(doc, M, y, w, h, C.pale, C.line);
  doc.setTextColor(...C.muted); doc.setFont("helvetica", "bold"); doc.setFontSize(7.2);
  text(doc, "À SAVOIR", M + 5, y + 5);
  doc.setTextColor(...C.slate); doc.setFont("helvetica", "normal"); doc.setFontSize(7.2);
  text(doc, wrapped, M + 5, y + 10);
  return y + h;
}

function piedPage(doc: Doc, ent: PdfEntreprise | null | undefined, W: number, H: number, M: number) {
  const pages = doc.getNumberOfPages();
  const legal = [ent?.nom || "", ent?.rccm ? `RCCM ${ent.rccm}` : "", ent?.compteContribuable ? `CC ${ent.compteContribuable}` : "", ent?.adresse || ent?.ville || ""].filter(Boolean).join("  •  ");
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    line(doc, M, H - 17, W - M, H - 17, C.line, 0.35);
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.6); doc.setTextColor(...C.muted);
    if (legal) text(doc, legal, W / 2, H - 12, { align: "center", maxWidth: W - 2 * M });
    doc.setTextColor(148, 163, 184);
    text(doc, `DevisBTP CI  •  Page ${page}/${pages}`, W / 2, H - 6, { align: "center" });
  }
}

function signer(doc: Doc, ent: PdfEntreprise | null | undefined, clientSig?: { data?: string; nom?: string; date?: any }, W = 210, H = 297, M = 14) {
  const y = H - 48;
  doc.setTextColor(...C.slate); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  text(doc, clientSig?.data ? "SIGNATURE DU CLIENT" : "BON POUR ACCORD DU CLIENT", M, y);
  text(doc, "POUR L'ENTREPRISE", W - M, y, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...C.muted);
  text(doc, clientSig?.nom || "Nom et signature", M, y + 5);
  text(doc, ent?.proprietaire || ent?.nom || "Nom du responsable", W - M, y + 5, { align: "right" });
  if (clientSig?.data) addImg(doc, clientSig.data, M + 2, y + 7, 48, 14);
  if (ent?.signatureData) addImg(doc, ent.signatureData, W - M - 63, y + 7, 38, 13);
  if (ent?.cachetData) addImg(doc, ent.cachetData, W - M - 34, y + 1, 27, 27);
  line(doc, M, y + 25, M + 62, y + 25, [148, 163, 184], 0.45);
  line(doc, W - M - 68, y + 25, W - M, y + 25, [148, 163, 184], 0.45);
  if (clientSig?.date) { doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); text(doc, `Signé le ${new Date(clientSig.date).toLocaleDateString("fr-FR")}`, M, y + 30); }
}

export interface PdfDevisInput {
  format: FormatPapier;
  entreprise: PdfEntreprise | null | undefined;
  devis: any;
  lignes: LignePdf[];
  planning?: any[];
  tot: TotauxPdf;
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
  const M = input.format === "A3" ? 20 : 14;
  const fontSize = input.format === "A3" ? 10 : 8.8;
  const doc = new jsPDF({ unit: "mm", format, compress: true });
  const d = input.devis;
  const date = new Date(d.createdAt || Date.now()).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  entete(doc, input.entreprise, input.titreDoc || "Devis quantitatif estimatif", d.numero || "DEVIS", date, d.lieu || "", W, M);
  let y = 48;
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
    const grouped = new Map<string, LignePdf[]>();
    for (const item of input.lignes) {
      const section = item.section || "Divers";
      const rows = grouped.get(section) || [];
      rows.push(item);
      grouped.set(section, rows);
    }
    y = tableauDetaille(doc, M, W, y, H, Array.from(grouped.entries()), fontSize);
  }

  y = blocPlanning(doc, M, W, y, H, input.planning || [], fontSize);
  const totalsRows = modeMoSeule
    ? [
        { label: "Main-d'œuvre HT", value: `${money(input.tot.moSeuleTTC ? input.tot.moSeuleTTC / (1 + input.tot.tvaPct / 100) : input.tot.mo)} FCFA` },
        { label: `TVA ${input.tot.tvaPct} %`, value: `${money(input.tot.moSeuleTTC ? input.tot.moSeuleTTC - input.tot.moSeuleTTC / (1 + input.tot.tvaPct / 100) : input.tot.tva)} FCFA` },
        { label: "TOTAL À PAYER TTC", value: `${money(input.tot.moSeuleTTC || input.tot.mo)} FCFA`, hot: true },
      ]
    : formatPdf === "general"
      ? [
          { label: "Total des travaux HT", value: `${money(input.tot.htBrut)} FCFA` },
          ...(input.tot.remise > 0 ? [{ label: `Remise ${input.tot.remisePct} %`, value: `− ${money(input.tot.remise)} FCFA`, neg: true }] : []),
          { label: `TVA ${input.tot.tvaPct} %`, value: `${money(input.tot.tva)} FCFA` },
          { label: "TOTAL TTC", value: `${money(input.tot.ttc)} FCFA`, hot: true },
        ]
      : [
          { label: "Matériaux & fournitures", value: `${money(input.tot.materiaux)} FCFA` },
          { label: `Main-d'œuvre (${input.tot.moLabel})`, value: `${money(input.tot.mo)} FCFA` },
          { label: "Total HT", value: `${money(input.tot.htBrut)} FCFA` },
          ...(input.tot.remise > 0 ? [{ label: `Remise ${input.tot.remisePct} %`, value: `− ${money(input.tot.remise)} FCFA`, neg: true }] : []),
          { label: `TVA ${input.tot.tvaPct} %`, value: `${money(input.tot.tva)} FCFA` },
          { label: "TOTAL TTC", value: `${money(input.tot.ttc)} FCFA`, hot: true },
        ];

  const notes = [
    `Validité de l'offre : ${d.validiteJours || 30} jours.`,
    "Échéancier proposé : 40 % au démarrage, 40 % à mi-chantier, 20 % à la réception.",
    modeMoSeule ? `Valeur indicative des travaux avec fourniture des matériaux : ${money(input.tot.ttc)} FCFA TTC.` : "Estimation à valider après visite et métré contradictoire du chantier.",
    formatPdf === "detaille" ? "Les quantités et prix unitaires sont fournis à titre estimatif et restent ajustables avant accord." : "Le détail technique est disponible sur demande.",
  ];
  const notesW = W * 0.44 - M;
  const notesH = 8 + notes.reduce((sum, note) => sum + doc.splitTextToSize(clean(note), notesW - 10).length * 3.4, 0);
  const totalsH = 17 + totalsRows.length * 8;
  const bottomLimit = H - 55;
  if (y + Math.max(notesH, totalsH) > bottomLimit) { doc.addPage(); y = 22; }
  const notesBottom = blocNotes(doc, M, y, notesW, notes);
  const totalsBox = blocTotaux(doc, M, W, y, totalsRows, modeMoSeule ? "À payer à l'entrepreneur" : "Récapitulatif financier");
  let signY = Math.max(notesBottom, totalsBox.bottom) + 8;
  if (signY > H - 48) { doc.addPage(); signY = 22; }
  // Signature block is deliberately placed after the financial summary, with ample clear space.
  signer(doc, input.entreprise, input.statutSigne, W, H, M);
  if (input.clause) {
    const clauseLines = doc.splitTextToSize(clean(input.clause), W - 2 * M - 10);
    const clauseH = Math.min(20, 7 + clauseLines.length * 3.2);
    if (signY + clauseH < H - 53) {
      roundRect(doc, M, signY, W - 2 * M, clauseH, [255, 248, 235], [252, 211, 77]);
      doc.setFont("helvetica", "bold"); doc.setFontSize(6.8); doc.setTextColor(...C.amberDark);
      text(doc, "VALIDITÉ DE L'OFFRE", M + 5, signY + 5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.6); doc.setTextColor(...C.slate);
      text(doc, clauseLines.slice(0, 3), M + 5, signY + 9, { maxWidth: W - 2 * M - 10 });
    }
  }
  piedPage(doc, input.entreprise, W, H, M);
  if (input.apercu) return doc.output("bloburl") as unknown as string;
  doc.save(input.nomFichier);
  return input.nomFichier;
}

export async function genererPdfFacture(input: {
  format: FormatPapier; entreprise: PdfEntreprise | null | undefined;
  facture: any; devis: any; nomFichier: string;
}): Promise<string> {
  const { default: jsPDF } = await import("jspdf");
  const { format, W, H } = formatPapierInfo(input.format);
  const M = input.format === "A3" ? 20 : 14;
  const doc = new jsPDF({ unit: "mm", format, compress: true });
  const { facture: f, devis: d } = input;
  const date = new Date(f.createdAt || Date.now()).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  entete(doc, input.entreprise, "Facture d'acompte", f.numero, date, d.lieu || "", W, M);
  let y = blocClient(doc, M, W, 48, d);
  roundRect(doc, M, y, W - 2 * M, 17, [255, 247, 237], [253, 186, 116]);
  doc.setTextColor(...C.amberDark); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  text(doc, `ACOMPTE DE ${f.pct} %`, M + 5, y + 7);
  doc.setTextColor(...C.ink); doc.setFontSize(13);
  text(doc, `${money(f.montant)} FCFA À PAYER`, W - M - 5, y + 11, { align: "right" });
  y += 25;
  const rows = [
    { label: "Total du devis (TTC)", value: `${money(f.totalDevisTTC)} FCFA` },
    { label: `Acompte demandé (${f.pct} %)`, value: `${money(f.montant)} FCFA` },
    { label: "Déjà facturé, acomptes précédents inclus", value: `${money(f.dejaFacture)} FCFA` },
    { label: "Solde restant après cet acompte", value: `${money(f.soldeRestant)} FCFA`, hot: true },
  ];
  const box = blocTotaux(doc, M, W, y, rows, "Détail de l'acompte");
  const noteY = y + box.h + 12;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...C.muted);
  const note = doc.splitTextToSize("Cette facture d'acompte sera déduite du montant total du devis. Paiement par Wave, Orange Money ou virement.", W - 2 * M);
  text(doc, note, M, noteY, { maxWidth: W - 2 * M });
  signer(doc, input.entreprise, undefined, W, H, M);
  piedPage(doc, input.entreprise, W, H, M);
  doc.save(input.nomFichier);
  return input.nomFichier;
}

export async function genererPdfAvenant(input: {
  format: FormatPapier; entreprise: PdfEntreprise | null | undefined;
  avenant: any; devis: any; lignes: LignePdf[]; nomFichier: string;
  signesAvant?: number;
}): Promise<string> {
  const { default: jsPDF } = await import("jspdf");
  const { format, W, H } = formatPapierInfo(input.format);
  const M = input.format === "A3" ? 20 : 14;
  const fontSize = input.format === "A3" ? 10 : 8.8;
  const doc = new jsPDF({ unit: "mm", format, compress: true });
  const { avenant: a, devis: d } = input;
  const date = new Date(a.createdAt || Date.now()).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  entete(doc, input.entreprise, `Avenant au devis ${d.numero}`, a.numero || "AVENANT", date, d.lieu || "", W, M);
  let y = 48;
  roundRect(doc, M, y, W - 2 * M, 18, [255, 247, 237], [253, 186, 116]);
  doc.setTextColor(...C.amberDark); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5);
  text(doc, a.titre || "Travaux supplémentaires", M + 5, y + 7);
  doc.setTextColor(...C.slate); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  text(doc, `Rattaché au devis ${d.numero}  •  Client : ${d.clientNom}  •  Montant initial : ${money(d.totalTTC)} FCFA TTC`, M + 5, y + 13);
  y += 26;
  if (a.description) {
    const desc = doc.splitTextToSize(clean(`Motif : ${a.description}`), W - 2 * M - 10);
    const h = 8 + Math.min(desc.length, 3) * 3.5;
    roundRect(doc, M, y, W - 2 * M, h, C.pale, C.line);
    doc.setTextColor(...C.slate); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    text(doc, desc.slice(0, 3), M + 5, y + 5);
    y += h + 8;
  }
  const maxY = H - 35;
  y = sectionTitre(doc, "Travaux supplémentaires", M, y, W, [139, 92, 246]);
  const nameW = (W - 2 * M) * 0.48;
  const unitX = M + nameW, qtyX = M + nameW + 14, priceX = M + nameW + 32, totalX = W - M - 4;
  doc.setTextColor(...C.muted); doc.setFont("helvetica", "bold"); doc.setFontSize(6.8);
  text(doc, "DÉSIGNATION", M + 3, y); text(doc, "UNITÉ", unitX, y); text(doc, "QTÉ", qtyX, y, { align: "right" });
  text(doc, "P.U. FCFA", priceX + 25, y, { align: "right" }); text(doc, "TOTAL FCFA", totalX, y, { align: "right" });
  y += 5; line(doc, M + 3, y, W - M - 3, y); y += 5;
  input.lignes.forEach((item, i) => {
    const wrapped = doc.splitTextToSize(clean(item.designation + (item.detail ? ` — ${item.detail}` : "")), nameW - 7);
    const h = Math.max(9, wrapped.length * 4 + 3);
    if (y + h > maxY) { doc.addPage(); y = 22; }
    if (i % 2 === 0) { doc.setFillColor(...C.pale); doc.rect(M, y - 3, W - 2 * M, h, "F"); }
    doc.setTextColor(...C.ink); doc.setFont("helvetica", "normal"); doc.setFontSize(fontSize);
    text(doc, wrapped, M + 3, y + 1, { maxWidth: nameW - 7 });
    doc.setTextColor(...C.slate); doc.setFontSize(7.5);
    text(doc, item.unite, unitX, y + 1); text(doc, fmtN(item.quantite), qtyX, y + 1, { align: "right" });
    text(doc, money(item.prixUnitaire), priceX + 25, y + 1, { align: "right" });
    doc.setTextColor(...C.ink); doc.setFont("helvetica", "bold");
    text(doc, money((Number(item.quantite) || 0) * (Number(item.prixUnitaire) || 0)), totalX, y + 1, { align: "right" });
    y += h;
  });
  const ht = input.lignes.reduce((sum, item) => sum + (Number(item.quantite) || 0) * (Number(item.prixUnitaire) || 0), 0);
  const tvaPct = Number(d.tvaPct ?? 18);
  const tva = ht * tvaPct / 100;
  y += 7;
  const rows = [
    { label: "Total avenant HT", value: `${money(ht)} FCFA` },
    { label: `TVA ${tvaPct} %`, value: `${money(tva)} FCFA` },
    { label: "TOTAL AVENANT TTC", value: `${money(ht + tva)} FCFA`, hot: true },
    { label: "Nouveau total du chantier", value: `${money((d.totalTTC || 0) + (input.signesAvant || 0) + ht + tva)} FCFA` },
  ];
  const totalsH = 17 + rows.length * 8;
  if (y + totalsH > H - 55) { doc.addPage(); y = 22; }
  const totals = blocTotaux(doc, M, W, y, rows, "Récapitulatif de l'avenant");
  const noteY = Math.min(totals.bottom + 8, H - 54);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...C.muted);
  text(doc, "Cet avenant complète le devis d'origine. Les travaux supplémentaires débutent après accord écrit du client.", M, noteY, { maxWidth: W - 2 * M });
  signer(doc, input.entreprise, undefined, W, H, M);
  piedPage(doc, input.entreprise, W, H, M);
  doc.save(input.nomFichier);
  return input.nomFichier;
}
