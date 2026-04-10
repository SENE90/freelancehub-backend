const PDFDocument = require('pdfkit');

const VERT = '#16a34a';
const GRIS = '#64748b';
const GRIS_CLAIR = '#f8fafc';
const GRIS_BORDER = '#e2e8f0';
const NOIR = '#0f172a';

const genererFacturePDF = (facture, freelance) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const margin = 50;
      const contentW = pageW - margin * 2;
      const fmt = (n) => (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F';

      // Bande verte haut
      doc.rect(0, 0, pageW, 8).fill(VERT);

      // Logo
      doc.fontSize(22).font('Helvetica-Bold').fillColor(VERT).text('FreelanceHub', margin, 30);
      doc.fontSize(9).font('Helvetica').fillColor(GRIS).text('Plateforme freelance · Sénégal', margin, 56);

      // Numéro facture
      doc.fontSize(22).font('Helvetica-Bold').fillColor(NOIR).text(facture.numero, 0, 30, { align: 'right', width: pageW - margin });
      doc.fontSize(10).font('Helvetica').fillColor(GRIS).text('FACTURE', 0, 56, { align: 'right', width: pageW - margin });

      doc.moveTo(margin, 80).lineTo(pageW - margin, 80).strokeColor(GRIS_BORDER).lineWidth(1).stroke();

      // Infos DE / POUR
      let y = 100;
      const col2X = pageW / 2 + 20;

      doc.fontSize(8).font('Helvetica-Bold').fillColor(GRIS).text('DE', margin, y);
      y += 15;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(NOIR).text(`${freelance.prenom} ${freelance.nom}`, margin, y);
      y += 16;
      doc.fontSize(9).font('Helvetica').fillColor(GRIS);
      if (freelance.email) { doc.text(freelance.email, margin, y); y += 13; }
      if (freelance.telephone) { doc.text(freelance.telephone, margin, y); y += 13; }

      let yC = 100;
      doc.fontSize(8).font('Helvetica-Bold').fillColor(GRIS).text('FACTURÉ À', col2X, yC); yC += 15;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(NOIR).text(facture.client.nom, col2X, yC); yC += 16;
      doc.fontSize(9).font('Helvetica').fillColor(GRIS);
      if (facture.client.entreprise) { doc.text(facture.client.entreprise, col2X, yC); yC += 13; }
      if (facture.client.email) { doc.text(facture.client.email, col2X, yC); yC += 13; }

      y = Math.max(y, yC) + 20;

      // Bande dates
      doc.rect(margin, y, contentW, 45).fill(GRIS_CLAIR);
      doc.rect(margin, y, contentW, 45).stroke(GRIS_BORDER);
      const colW = contentW / 3;

      doc.fontSize(8).font('Helvetica-Bold').fillColor(GRIS).text("DATE D'ÉMISSION", margin + 10, y + 8);
      doc.fontSize(10).font('Helvetica').fillColor(NOIR).text(new Date(facture.dateEmission).toLocaleDateString('fr-FR'), margin + 10, y + 21);

      doc.fontSize(8).font('Helvetica-Bold').fillColor(GRIS).text("DATE D'ÉCHÉANCE", margin + colW + 10, y + 8);
      doc.fontSize(10).font('Helvetica').fillColor(NOIR).text(facture.dateEcheance ? new Date(facture.dateEcheance).toLocaleDateString('fr-FR') : '—', margin + colW + 10, y + 21);

      const sColors = { payee: VERT, en_attente: '#d97706', brouillon: GRIS, en_retard: '#dc2626' };
      const sLabels = { payee: 'PAYÉE', en_attente: 'EN ATTENTE', brouillon: 'BROUILLON', en_retard: 'EN RETARD' };
      doc.fontSize(8).font('Helvetica-Bold').fillColor(GRIS).text('STATUT', margin + colW * 2 + 10, y + 8);
      doc.fontSize(10).font('Helvetica-Bold').fillColor(sColors[facture.statut] || GRIS).text(sLabels[facture.statut] || facture.statut.toUpperCase(), margin + colW * 2 + 10, y + 21);

      y += 60;

      // En-tête tableau
      doc.rect(margin, y, contentW, 28).fill(NOIR);
      const c = { d: margin + 10, q: margin + contentW * 0.52, p: margin + contentW * 0.67, t: margin + contentW * 0.84 };
      doc.fontSize(8).font('Helvetica-Bold').fillColor('white');
      doc.text('DESCRIPTION', c.d, y + 10);
      doc.text('QTÉ', c.q, y + 10);
      doc.text('PRIX UNIT.', c.p, y + 10);
      doc.text('TOTAL', c.t, y + 10);
      y += 28;

      // Lignes
      facture.lignes.forEach((ligne, i) => {
        const rowH = 30;
        doc.rect(margin, y, contentW, rowH).fill(i % 2 === 0 ? 'white' : GRIS_CLAIR);
        doc.rect(margin, y, contentW, rowH).stroke(GRIS_BORDER);
        const tot = ligne.quantite * ligne.prixUnitaire;
        doc.fontSize(9).font('Helvetica').fillColor(NOIR);
        doc.text(ligne.description, c.d, y + 9, { width: contentW * 0.5 - 10 });
        doc.text(String(ligne.quantite), c.q, y + 9);
        doc.text(fmt(ligne.prixUnitaire), c.p, y + 9);
        doc.font('Helvetica-Bold').text(fmt(tot), c.t, y + 9);
        y += rowH;
      });

      y += 15;

      // Totaux
      const tX = col2X;
      const tW = pageW - margin - tX;

      doc.fontSize(9).font('Helvetica').fillColor(GRIS).text('Sous-total', tX, y);
      doc.font('Helvetica').fillColor(NOIR).text(fmt(facture.sousTotal), tX, y, { align: 'right', width: tW }); y += 18;

      if (facture.tva > 0) {
        doc.fontSize(9).font('Helvetica').fillColor(GRIS).text(`TVA (${facture.tva}%)`, tX, y);
        doc.fillColor(NOIR).text(fmt(facture.montantTva), tX, y, { align: 'right', width: tW }); y += 18;
      }

      if (facture.remise > 0) {
        doc.fontSize(9).font('Helvetica').fillColor(GRIS).text('Remise', tX, y);
        doc.fillColor('#dc2626').text('-' + fmt(facture.remise), tX, y, { align: 'right', width: tW }); y += 18;
      }

      doc.moveTo(tX, y).lineTo(pageW - margin, y).strokeColor(GRIS_BORDER).lineWidth(0.5).stroke(); y += 8;
      doc.rect(tX, y, tW, 36).fill(VERT);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('white').text('TOTAL', tX + 10, y + 12);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('white').text(fmt(facture.total), tX, y + 11, { align: 'right', width: tW - 10 });
      y += 55;

      // Conditions
      if (facture.conditionsPaiement) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor(GRIS).text('CONDITIONS DE PAIEMENT', margin, y); y += 13;
        doc.fontSize(9).font('Helvetica').fillColor(NOIR).text(facture.conditionsPaiement, margin, y); y += 20;
      }

      const methodes = { wave: 'Wave', orange_money: 'Orange Money', virement: 'Virement bancaire', especes: 'Espèces' };
      if (facture.methodePaiement) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor(GRIS).text('MODE DE PAIEMENT', margin, y); y += 13;
        doc.fontSize(9).font('Helvetica').fillColor(VERT).text(methodes[facture.methodePaiement] || facture.methodePaiement, margin, y);
      }

      // Footer
      doc.rect(0, pageH - 40, pageW, 40).fill(GRIS_CLAIR);
      doc.moveTo(0, pageH - 40).lineTo(pageW, pageH - 40).strokeColor(GRIS_BORDER).lineWidth(1).stroke();
      doc.fontSize(8).font('Helvetica').fillColor(GRIS).text(`Généré par FreelanceHub · ${new Date().toLocaleDateString('fr-FR')}`, margin, pageH - 26);
      doc.fontSize(8).font('Helvetica').fillColor(GRIS).text(facture.numero, 0, pageH - 26, { align: 'right', width: pageW - margin });

      doc.end();
    } catch (err) { reject(err); }
  });
};

module.exports = { genererFacturePDF };
