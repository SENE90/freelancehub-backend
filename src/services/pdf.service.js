const PDFDocument = require('pdfkit');

const VERT = '#16a34a';
const GRIS = '#64748b';
const GRIS_CLAIR = '#f8fafc';
const GRIS_BORDER = '#e2e8f0';
const NOIR = '#0f172a';

const genererFacturePDF = (facture, freelance) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 40, 
        size: 'A4',
        autoFirstPage: true,
        bufferPages: true
      });
      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageW = doc.page.width;
      const margin = 40;
      const contentW = pageW - margin * 2;
      const fmt = (n) => (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F';

      doc.rect(0, 0, pageW, 6).fill(VERT);

      doc.fontSize(20).font('Helvetica-Bold').fillColor(VERT).text('FreelanceHub', margin, 20);
      doc.fontSize(8).font('Helvetica').fillColor(GRIS).text('Plateforme freelance · Sénégal', margin, 44);
      doc.fontSize(20).font('Helvetica-Bold').fillColor(NOIR).text(facture.numero, 0, 20, { align: 'right', width: pageW - margin });
      doc.fontSize(9).font('Helvetica').fillColor(GRIS).text('FACTURE', 0, 44, { align: 'right', width: pageW - margin });

      doc.moveTo(margin, 62).lineTo(pageW - margin, 62).strokeColor(GRIS_BORDER).lineWidth(0.5).stroke();

      let y = 75;
      const col2X = pageW / 2 + 10;

      doc.fontSize(7).font('Helvetica-Bold').fillColor(GRIS).text('DE', margin, y); y += 13;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(NOIR).text(`${freelance.prenom} ${freelance.nom}`, margin, y); y += 14;
      doc.fontSize(8).font('Helvetica').fillColor(GRIS);
      if (freelance.email) { doc.text(freelance.email, margin, y); y += 11; }
      if (freelance.telephone) { doc.text(freelance.telephone, margin, y); y += 11; }

      let yC = 75;
      doc.fontSize(7).font('Helvetica-Bold').fillColor(GRIS).text('FACTURÉ À', col2X, yC); yC += 13;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(NOIR).text(facture.client.nom, col2X, yC); yC += 14;
      doc.fontSize(8).font('Helvetica').fillColor(GRIS);
      if (facture.client.entreprise) { doc.text(facture.client.entreprise, col2X, yC); yC += 11; }
      if (facture.client.email) { doc.text(facture.client.email, col2X, yC); yC += 11; }

      y = Math.max(y, yC) + 14;

      const colW = contentW / 3;
      const sColors = { payee: VERT, en_attente: '#d97706', brouillon: GRIS, en_retard: '#dc2626' };
      const sLabels = { payee: 'PAYÉE', en_attente: 'EN ATTENTE', brouillon: 'BROUILLON', en_retard: 'EN RETARD' };

      doc.rect(margin, y, contentW, 38).fill(GRIS_CLAIR);
      doc.fontSize(7).font('Helvetica-Bold').fillColor(GRIS).text("DATE D'ÉMISSION", margin + 8, y + 7);
      doc.fontSize(9).font('Helvetica').fillColor(NOIR).text(new Date(facture.dateEmission).toLocaleDateString('fr-FR'), margin + 8, y + 18);
      doc.fontSize(7).font('Helvetica-Bold').fillColor(GRIS).text("DATE D'ÉCHÉANCE", margin + colW + 8, y + 7);
      doc.fontSize(9).font('Helvetica').fillColor(NOIR).text(facture.dateEcheance ? new Date(facture.dateEcheance).toLocaleDateString('fr-FR') : '—', margin + colW + 8, y + 18);
      doc.fontSize(7).font('Helvetica-Bold').fillColor(GRIS).text('STATUT', margin + colW * 2 + 8, y + 7);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(sColors[facture.statut] || GRIS).text(sLabels[facture.statut] || facture.statut.toUpperCase(), margin + colW * 2 + 8, y + 18);
      y += 50;

      doc.rect(margin, y, contentW, 24).fill(NOIR);
      const c = { d: margin + 8, q: margin + contentW * 0.52, p: margin + contentW * 0.67, t: margin + contentW * 0.84 };
      doc.fontSize(7).font('Helvetica-Bold').fillColor('white');
      doc.text('DESCRIPTION', c.d, y + 8);
      doc.text('QTÉ', c.q, y + 8);
      doc.text('PRIX UNIT.', c.p, y + 8);
      doc.text('TOTAL', c.t, y + 8);
      y += 24;

      facture.lignes.forEach((ligne, i) => {
        const rowH = 24;
        doc.rect(margin, y, contentW, rowH).fill(i % 2 === 0 ? 'white' : GRIS_CLAIR);
        const tot = ligne.quantite * ligne.prixUnitaire;
        doc.fontSize(8).font('Helvetica').fillColor(NOIR);
        doc.text(ligne.description, c.d, y + 7, { width: contentW * 0.48 });
        doc.text(String(ligne.quantite), c.q, y + 7);
        doc.text(fmt(ligne.prixUnitaire), c.p, y + 7);
        doc.font('Helvetica-Bold').text(fmt(tot), c.t, y + 7);
        y += rowH;
      });

      y += 12;

      const tX = col2X;
      const tW = pageW - margin - tX;

      doc.fontSize(8).font('Helvetica').fillColor(GRIS).text('Sous-total', tX, y);
      doc.fillColor(NOIR).text(fmt(facture.sousTotal), tX, y, { align: 'right', width: tW }); y += 16;

      if (facture.tva > 0) {
        doc.fontSize(8).font('Helvetica').fillColor(GRIS).text(`TVA (${facture.tva}%)`, tX, y);
        doc.fillColor(NOIR).text(fmt(facture.montantTva), tX, y, { align: 'right', width: tW }); y += 16;
      }

      if (facture.remise > 0) {
        doc.fontSize(8).font('Helvetica').fillColor(GRIS).text('Remise', tX, y);
        doc.fillColor('#dc2626').text('-' + fmt(facture.remise), tX, y, { align: 'right', width: tW }); y += 16;
      }

      doc.moveTo(tX, y).lineTo(pageW - margin, y).strokeColor(GRIS_BORDER).lineWidth(0.5).stroke(); y += 6;
      doc.rect(tX, y, tW, 30).fill(VERT);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('white').text('TOTAL', tX + 8, y + 10);
      doc.fontSize(13).font('Helvetica-Bold').fillColor('white').text(fmt(facture.total), tX, y + 9, { align: 'right', width: tW - 8 });
      y += 42;

      const methodes = { wave: 'Wave', orange_money: 'Orange Money', virement: 'Virement bancaire', especes: 'Espèces' };
      
      doc.moveTo(margin, y).lineTo(pageW - margin, y).strokeColor(GRIS_BORDER).lineWidth(0.5).stroke(); y += 10;
      if (facture.conditionsPaiement) {
        doc.fontSize(7).font('Helvetica-Bold').fillColor(GRIS).text('CONDITIONS DE PAIEMENT', margin, y); y += 11;
        doc.fontSize(8).font('Helvetica').fillColor(NOIR).text(facture.conditionsPaiement, margin, y); y += 14;
      }
      if (facture.methodePaiement) {
        doc.fontSize(7).font('Helvetica-Bold').fillColor(GRIS).text('MODE DE PAIEMENT', margin, y); y += 11;
        doc.fontSize(8).font('Helvetica').fillColor(VERT).text(methodes[facture.methodePaiement] || facture.methodePaiement, margin, y);
      }

      const pageH = doc.page.height;
      doc.rect(0, pageH - 32, pageW, 32).fill(GRIS_CLAIR);
      doc.moveTo(0, pageH - 32).lineTo(pageW, pageH - 32).strokeColor(GRIS_BORDER).lineWidth(0.5).stroke();
      doc.fontSize(7).font('Helvetica').fillColor(GRIS).text(`Généré par FreelanceHub · ${new Date().toLocaleDateString('fr-FR')}`, margin, pageH - 20);
      doc.fontSize(7).font('Helvetica').fillColor(GRIS).text(facture.numero, 0, pageH - 20, { align: 'right', width: pageW - margin });

      doc.end();
    } catch (err) { reject(err); }
  });
};

module.exports = { genererFacturePDF };
