import PDFDocument from 'pdfkit';

export interface ContractData {
  bookingId: string;
  // Client
  clientPrenom: string;
  clientNom: string;
  clientEmail: string;
  clientTelephone: string;
  // Loueur
  loueurNom: string;
  loueurEmail: string;
  loueurTelephone: string;
  // Équipement
  equipmentName: string;
  equipmentCategory: string;
  equipmentId: string;
  // Dates & tarification
  startDate: string;
  endDate: string;
  dureeJours: number;
  prixJournalier: number;
  sousTotal: number;
  fraisService: number;
  totalLocation: number;
  montantCaution: number;
}

/**
 * Génère le contrat de location au format PDF et retourne un Buffer.
 */
export async function generateContractPDF(data: ContractData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Contrat de Location - ${data.bookingId}`,
          Author: 'Matik - Location de Matériel',
          Subject: `Location ${data.equipmentName}`,
        },
      });

      const chunks: Uint8Array[] = [];
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 100; // 100 = margins left + right

      // ─── EN-TÊTE ──────────────────────────────────────────
      doc
        .rect(50, 50, pageWidth, 60)
        .fill('#F59E0B');

      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('MATIK', 70, 65, { width: pageWidth - 40 });

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#44403C')
        .text('Location de Matériel & Équipements entre Particuliers et Professionnels', 70, 93, { width: pageWidth - 40 });

      // ─── TITRE DU CONTRAT ─────────────────────────────────
      doc
        .moveDown(2.5)
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('CONTRAT DE LOCATION DE MATÉRIEL', { align: 'center' });

      doc
        .moveDown(0.3)
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#64748B')
        .text(`Référence : ${data.bookingId}`, { align: 'center' });

      doc
        .fontSize(10)
        .text(`Date d'émission : ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'center' });

      // ─── PARTIES ──────────────────────────────────────────
      const partiesY = doc.y + 25;

      // Loueur (colonne gauche)
      doc
        .rect(50, partiesY, pageWidth / 2 - 10, 100)
        .lineWidth(0.5)
        .stroke('#CBD5E1');

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#F59E0B')
        .text('LE LOUEUR', 60, partiesY + 10, { width: pageWidth / 2 - 30 });

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text(data.loueurNom || 'Propriétaire Matik', 60, partiesY + 25, { width: pageWidth / 2 - 30 });

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#475569')
        .text(`E-mail : ${data.loueurEmail || 'Non renseigné'}`, 60, partiesY + 42)
        .text(`Tél : ${data.loueurTelephone || 'Non renseigné'}`, 60, partiesY + 56);

      // Client (colonne droite)
      const rightColX = 50 + pageWidth / 2 + 10;
      doc
        .rect(rightColX, partiesY, pageWidth / 2 - 10, 100)
        .lineWidth(0.5)
        .stroke('#CBD5E1');

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#F59E0B')
        .text('LE LOCATAIRE', rightColX + 10, partiesY + 10, { width: pageWidth / 2 - 30 });

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text(`${data.clientPrenom} ${data.clientNom}`, rightColX + 10, partiesY + 25, { width: pageWidth / 2 - 30 });

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#475569')
        .text(`E-mail : ${data.clientEmail}`, rightColX + 10, partiesY + 42)
        .text(`Tél : ${data.clientTelephone || 'Non renseigné'}`, rightColX + 10, partiesY + 56);

      doc.y = partiesY + 120;

      // ─── ARTICLE 1 : OBJET DE LA LOCATION ─────────────────
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('Article 1 — Objet de la location');

      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#334155')
        .text(
          `Le Loueur met à disposition du Locataire le matériel suivant :`,
          { lineGap: 4 }
        );

      doc.moveDown(0.3);

      // Tableau équipement
      const tableY = doc.y;
      const col1W = pageWidth * 0.5;
      const col2W = pageWidth * 0.5;

      // Header
      doc.rect(50, tableY, pageWidth, 22).fill('#F8FAFC');
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('Désignation', 60, tableY + 6, { width: col1W })
        .text('Catégorie', 60 + col1W, tableY + 6, { width: col2W });

      // Row
      doc.rect(50, tableY + 22, pageWidth, 22).lineWidth(0.3).stroke('#E2E8F0');
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#334155')
        .text(data.equipmentName, 60, tableY + 28, { width: col1W })
        .text(data.equipmentCategory || '—', 60 + col1W, tableY + 28, { width: col2W });

      doc.y = tableY + 55;

      // ─── ARTICLE 2 : DURÉE ────────────────────────────────
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('Article 2 — Durée de la location');

      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#334155')
        .text(`La location prend effet le ${data.startDate} et se termine le ${data.endDate}, soit une durée de ${data.dureeJours} jour(s).`, { lineGap: 4 });

      // ─── ARTICLE 3 : CONDITIONS FINANCIÈRES ───────────────
      doc.moveDown(0.8);
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('Article 3 — Conditions financières');

      doc.moveDown(0.3);

      const finY = doc.y;
      const labelW = pageWidth * 0.65;
      const valW = pageWidth * 0.35;
      const lineH = 22;
      const lines = [
        [`Prix journalier`, `${data.prixJournalier.toFixed(2)} €`],
        [`Sous-total (${data.dureeJours} jour(s))`, `${data.sousTotal.toFixed(2)} €`],
        [`Frais de service & garantie Matik (10%)`, `+ ${data.fraisService.toFixed(2)} €`],
        [`TOTAL LOCATION TTC`, `${data.totalLocation.toFixed(2)} €`],
        [`Caution (empreinte bancaire, non débitée)`, `${data.montantCaution.toFixed(2)} €`],
      ];

      lines.forEach((line, i) => {
        const y = finY + i * lineH;
        if (i === 3) {
          doc.rect(50, y, pageWidth, lineH).fill('#FEF3C7');
        } else {
          doc.rect(50, y, pageWidth, lineH).lineWidth(0.3).stroke('#E2E8F0');
        }
        doc
          .fontSize(i === 3 ? 10 : 9)
          .font(i === 3 || i === 4 ? 'Helvetica-Bold' : 'Helvetica')
          .fillColor(i === 3 ? '#0F172A' : '#334155')
          .text(line[0], 60, y + 6, { width: labelW })
          .text(line[1], 60 + labelW, y + 6, { width: valW - 10, align: 'right' });
      });

      doc.y = finY + lines.length * lineH + 15;

      // ─── ARTICLE 4 : CAUTION STRIPE ───────────────────────
      doc.moveDown(0.3);
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('Article 4 — Caution & garantie');

      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#334155')
        .text(
          `Une empreinte bancaire de ${data.montantCaution.toFixed(2)} € est requise via Stripe. Aucun montant n'est débité : ` +
          `il s'agit d'une simple autorisation de prélèvement qui sera automatiquement levée dans les 24 h suivant la restitution ` +
          `du matériel en bon état. En cas de dégradation constatée lors de l'état des lieux de sortie, le loueur pourra capturer ` +
          `tout ou partie de la caution pour couvrir les réparations ou le remplacement.`,
          { lineGap: 4 }
        );

      // ─── ARTICLE 5 : RESPONSABILITÉS ──────────────────────
      doc.moveDown(0.8);
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('Article 5 — Responsabilités & obligations');

      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#334155')
        .text(
          `Le Locataire s'engage à utiliser le matériel en bon père de famille, conformément à sa destination. ` +
          `Il est responsable de tout dommage, perte ou vol survenu pendant la période de location. ` +
          `Le Locataire devra restituer le matériel dans l'état dans lequel il l'a reçu, usure normale exclue.`,
          { lineGap: 4 }
        );

      // ─── SIGNATURES ───────────────────────────────────────
      doc.moveDown(1.5);
      const sigY = doc.y;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, 50, sigY);

      doc.moveDown(1);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#64748B')
        .text('Signature du Loueur :', 50, doc.y, { width: pageWidth / 2 - 10 })
        .text('Signature du Locataire :', rightColX, doc.y - doc.currentLineHeight(), { width: pageWidth / 2 - 10 });

      doc.moveDown(0.3);
      doc
        .moveTo(50, doc.y + 30)
        .lineTo(50 + pageWidth / 2 - 30, doc.y + 30)
        .stroke('#CBD5E1');

      doc
        .moveTo(rightColX, doc.y + 30)
        .lineTo(rightColX + pageWidth / 2 - 30, doc.y + 30)
        .stroke('#CBD5E1');

      // ─── PIED DE PAGE ─────────────────────────────────────
      const footerY = doc.page.height - 60;
      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor('#94A3B8')
        .text(
          'Matik — Plateforme de location de matériel entre particuliers et professionnels. Document généré automatiquement et valant contrat entre les parties.',
          50,
          footerY,
          { width: pageWidth, align: 'center' }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
