import { jsPDF } from 'jspdf';

const ASSET_BASE = '/assets/certificates';

const ASSET_PATHS = {
  shield: `${ASSET_BASE}/dogs-life-shield.png`,
  hundeschuleLogo: `${ASSET_BASE}/hundeschule-bw-logo.png`,
  signature: `${ASSET_BASE}/signature-huber.png`,
  stamp: `${ASSET_BASE}/stamp-huber.png`,
  euBadge: `${ASSET_BASE}/eu-qualified-badge.png`,
  eurozertSeal: `${ASSET_BASE}/eurozert-seal.png`,
  koalaSeal: `${ASSET_BASE}/koala-pruefer-seal.png`,
};

interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
}

// Cache loaded images across multiple certificate generations in the same session.
const imageCache: Record<string, Promise<LoadedImage>> = {};

function loadImage(src: string): Promise<LoadedImage> {
  if (!imageCache[src]) {
    imageCache[src] = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas-Kontext nicht verfügbar'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => reject(new Error(`Bild konnte nicht geladen werden: ${src}`));
      img.src = src;
    });
  }
  return imageCache[src];
}

// Draws an image constrained to a max box, keeping aspect ratio.
function addImageFitted(
  doc: jsPDF,
  img: LoadedImage,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  align: 'left' | 'center' | 'right' = 'left'
): { w: number; h: number } {
  const ratio = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  let drawX = x;
  if (align === 'center') drawX = x - w / 2;
  if (align === 'right') drawX = x - w;
  doc.addImage(img.dataUrl, 'PNG', drawX, y, w, h);
  return { w, h };
}

export interface CertificateData {
  firstName: string;
  lastName: string;
  dogName?: string;
  chipNumber?: string;
  category: string; // 'Hundeführerschein' | 'Trainerprüfung'
  scorePercentage: number;
  certifiedAt?: string | Date;
  location?: string;
}

const SIDEBAR_COLOR: [number, number, number] = [144, 157, 140];
const TEXT_DARK: [number, number, number] = [55, 55, 55];
const TEXT_MEDIUM: [number, number, number] = [100, 100, 100];
const TEXT_FOOTER: [number, number, number] = [150, 150, 150];

function formatDateDE(d: Date): string {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
}

export async function buildCertificatePdf(data: CertificateData): Promise<jsPDF> {
  const isTrainer = data.category === 'Trainerprüfung';

  const [shield, hundeschuleLogo, signature, stamp, euBadge, eurozertSeal, koalaSeal] = await Promise.all([
    loadImage(ASSET_PATHS.shield),
    loadImage(ASSET_PATHS.hundeschuleLogo),
    loadImage(ASSET_PATHS.signature),
    loadImage(ASSET_PATHS.stamp),
    loadImage(ASSET_PATHS.euBadge),
    loadImage(ASSET_PATHS.eurozertSeal),
    loadImage(ASSET_PATHS.koalaSeal),
  ]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = 210;
  const pageH = 297;
  const sidebarW = 32;
  const contentX = sidebarW + 14;
  const rightMargin = 18;
  const contentW = pageW - contentX - rightMargin;

  // --- Sidebar ---
  doc.setFillColor(...SIDEBAR_COLOR);
  doc.rect(0, 0, sidebarW, pageH, 'F');
  addImageFitted(doc, shield, sidebarW / 2, 12, 18, 18, 'center');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.text('Hundezentrum Bayerischer Wald', sidebarW / 2 + 3, pageH / 2, { angle: 90, align: 'center' });

  const date = data.certifiedAt ? new Date(data.certifiedAt) : new Date();
  const dateStr = formatDateDE(date);
  const location = data.location || 'Ascha';

  // --- Title ---
  doc.setTextColor(...TEXT_DARK);
  doc.setFont('times', 'normal');
  doc.setFontSize(40);
  doc.text('Zertifikat', contentX, 40);

  // --- Name ---
  doc.setFontSize(22);
  doc.setTextColor(...TEXT_MEDIUM);
  doc.text(`${data.firstName} ${data.lastName}`, contentX, 58);

  // --- Intro line ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...TEXT_DARK);
  doc.text(`hat am ${dateStr} an der`, contentX, 78);

  // --- Category heading ---
  doc.setFont('times', 'normal');
  doc.setFontSize(24);
  let headY = 92;
  doc.text('Theorie-Prüfung', contentX, headY);
  headY += 11;
  doc.text(isTrainer ? 'zum/zur Hundetrainer/in' : 'des KoAla-Test\u00AE', contentX, headY);

  let y = headY + 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  if (isTrainer) {
    const legalLine = doc.splitTextToSize(
      'angelehnt an §11 Abs. 1 Satz 1 Nummer 8 Buchstabe f TierSchG teilgenommen',
      contentW
    );
    doc.text(legalLine, contentX, y);
    y += legalLine.length * 6 + 4;
  } else {
    doc.text('teilgenommen', contentX, y);
    y += 10;
  }

  const resultLine = doc.splitTextToSize(
    `und die Prüfung mit einem Ergebnis von ${data.scorePercentage}% am ${dateStr}`,
    contentW
  );
  doc.text(resultLine, contentX, y);
  y += resultLine.length * 6 + 2;
  doc.text('erfolgreich abgelegt und bestanden.', contentX, y);
  y += 14;

  if (data.dogName) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10.5);
    doc.setTextColor(...TEXT_MEDIUM);
    const chipPart = data.chipNumber ? ` (Chip-Nr. ${data.chipNumber})` : '';
    doc.text(`in Begleitung von Hund ${data.dogName}${chipPart}`, contentX, y);
  }

  // --- Signature block ---
  const sigY = 228;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text(`${location}, den ${dateStr}`, contentX, sigY);

  addImageFitted(doc, signature, contentX, sigY + 4, 34, 14, 'left');
  addImageFitted(doc, stamp, contentX + 40, sigY + 1, 28, 18, 'left');
  addImageFitted(doc, hundeschuleLogo, contentX + 76, sigY + 1, 20, 20, 'left');

  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_MEDIUM);
  doc.text('Sachverständiger | Christian Huber', contentX, sigY + 23);
  doc.text('Veranstalter | Hundeschule Bayerischer Wald', contentX + 40, sigY + 23);

  // --- Seals bottom-right ---
  const sealY = pageH - 42;
  const sealRightX = pageW - rightMargin;
  addImageFitted(doc, euBadge, sealRightX, sealY, 20, 20, 'right');
  const secondSeal = isTrainer ? eurozertSeal : koalaSeal;
  addImageFitted(doc, secondSeal, sealRightX - 24, sealY, 20, 20, 'right');

  // --- Footer ---
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_FOOTER);
  const footer =
    "Dog\u00B4s Life Academy - www.dogs-life-academy.com  |  Hundeschule Bayerischer Wald - www.hs-bw.com  |  Hundezentrum Bayerischer Wald - www.hundezentrum-bayerischer-wald.de";
  doc.text(doc.splitTextToSize(footer, contentW + sidebarW - contentX + 5), contentX, pageH - 8);

  return doc;
}

function buildFilename(data: CertificateData): string {
  const safe = `${data.lastName}_${data.firstName}`.replace(/\s+/g, '_');
  const cat = data.category === 'Trainerprüfung' ? 'Trainerpruefung' : 'Hundefuehrerschein';
  return `Zertifikat_${cat}_${safe}.pdf`;
}

export async function downloadCertificate(data: CertificateData): Promise<void> {
  const doc = await buildCertificatePdf(data);
  doc.save(buildFilename(data));
}
