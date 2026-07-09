import { jsPDF } from 'jspdf';
import { CertificateSettings } from '../types.ts';

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

export const DEFAULT_CERTIFICATE_SETTINGS: CertificateSettings = {
  sidebarColor: '#909D8C',
  titleColor: '#373737',
  nameColor: '#646464',
  bodyColor: '#373737',
  footerColor: '#969696',
  watermarkColor: '#FFFFFF',

  fontFamily: 'times',
  titleFontSize: 40,
  nameFontSize: 22,
  headingFontSize: 24,
  bodyFontSize: 11,
  footerFontSize: 7.5,

  sidebarWidthMm: 32,
  sealSizeMm: 20,
  showWatermarkText: true,

  watermarkText: 'Hundezentrum Bayerischer Wald',
  titleText: 'Zertifikat',
  introText: 'hat am {datum} an der',
  headingLine1: 'Theorie-Prüfung',
  headingLine2Trainer: 'zum/zur Hundetrainer/in',
  headingLine2Koala: 'des KoAla-Test\u00AE',
  legalLineTrainer: 'angelehnt an §11 Abs. 1 Satz 1 Nummer 8 Buchstabe f TierSchG teilgenommen',
  participationLineKoala: 'teilgenommen',
  resultLine: 'und die Prüfung mit einem Ergebnis von {ergebnis}% am {datum}',
  passedLine: 'erfolgreich abgelegt und bestanden.',
  dogLineTemplate: 'in Begleitung von Hund {hundename} (Chip-Nr. {chipnummer})',
  locationDefault: 'Ascha',
  signatureLabel: 'Sachverständiger | Christian Huber',
  veranstalterLabel: 'Veranstalter | Hundeschule Bayerischer Wald',
  footerText:
    "Dog\u00B4s Life Academy - www.dogs-life-academy.com  |  Hundeschule Bayerischer Wald - www.hs-bw.com  |  Hundezentrum Bayerischer Wald - www.hundezentrum-bayerischer-wald.de",
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

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function fillPlaceholders(template: string, vars: Record<string, string>): string {
  let result = template;
  Object.entries(vars).forEach(([key, value]) => {
    result = result.split(`{${key}}`).join(value);
  });
  return result;
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

function formatDateDE(d: Date): string {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
}

export async function buildCertificatePdf(
  data: CertificateData,
  settingsOverride?: Partial<CertificateSettings>
): Promise<jsPDF> {
  const settings: CertificateSettings = { ...DEFAULT_CERTIFICATE_SETTINGS, ...settingsOverride };
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
  const sidebarW = settings.sidebarWidthMm;
  const contentX = sidebarW + 14;
  const rightMargin = 18;
  const contentW = pageW - contentX - rightMargin;

  const date = data.certifiedAt ? new Date(data.certifiedAt) : new Date();
  const dateStr = formatDateDE(date);
  const location = data.location || settings.locationDefault;

  const vars = {
    name: `${data.firstName} ${data.lastName}`,
    datum: dateStr,
    ergebnis: String(data.scorePercentage),
    hundename: data.dogName || '',
    chipnummer: data.chipNumber || '',
  };

  // --- Sidebar ---
  doc.setFillColor(...hexToRgb(settings.sidebarColor));
  doc.rect(0, 0, sidebarW, pageH, 'F');
  addImageFitted(doc, shield, sidebarW / 2, 12, 18, 18, 'center');
  if (settings.showWatermarkText) {
    doc.setTextColor(...hexToRgb(settings.watermarkColor));
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.text(settings.watermarkText, sidebarW / 2 + 3, pageH / 2, { angle: 90, align: 'center' });
  }

  // --- Title ---
  doc.setTextColor(...hexToRgb(settings.titleColor));
  doc.setFont(settings.fontFamily, 'normal');
  doc.setFontSize(settings.titleFontSize);
  doc.text(settings.titleText, contentX, 40);

  // --- Name ---
  doc.setFontSize(settings.nameFontSize);
  doc.setTextColor(...hexToRgb(settings.nameColor));
  doc.text(vars.name, contentX, 58);

  // --- Intro line ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(settings.bodyFontSize);
  doc.setTextColor(...hexToRgb(settings.bodyColor));
  doc.text(fillPlaceholders(settings.introText, vars), contentX, 78);

  // --- Category heading ---
  doc.setFont(settings.fontFamily, 'normal');
  doc.setFontSize(settings.headingFontSize);
  let headY = 92;
  doc.text(settings.headingLine1, contentX, headY);
  headY += 11;
  doc.text(isTrainer ? settings.headingLine2Trainer : settings.headingLine2Koala, contentX, headY);

  let y = headY + 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(settings.bodyFontSize);
  doc.setTextColor(...hexToRgb(settings.bodyColor));
  if (isTrainer) {
    const legalLine = doc.splitTextToSize(settings.legalLineTrainer, contentW);
    doc.text(legalLine, contentX, y);
    y += legalLine.length * 6 + 4;
  } else {
    doc.text(settings.participationLineKoala, contentX, y);
    y += 10;
  }

  const resultLine = doc.splitTextToSize(fillPlaceholders(settings.resultLine, vars), contentW);
  doc.text(resultLine, contentX, y);
  y += resultLine.length * 6 + 2;
  doc.text(settings.passedLine, contentX, y);
  y += 14;

  if (!isTrainer && data.dogName) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(settings.bodyFontSize - 0.5);
    doc.setTextColor(...hexToRgb(settings.bodyColor));
    doc.text(fillPlaceholders(settings.dogLineTemplate, vars), contentX, y);
  }

  // --- Signature block ---
  const sigY = 228;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(settings.bodyFontSize);
  doc.setTextColor(...hexToRgb(settings.bodyColor));
  doc.text(`${location}, den ${dateStr}`, contentX, sigY);

  addImageFitted(doc, signature, contentX, sigY + 4, 34, 14, 'left');
  addImageFitted(doc, stamp, contentX + 40, sigY + 1, 28, 18, 'left');
  addImageFitted(doc, hundeschuleLogo, contentX + 76, sigY + 1, 20, 20, 'left');

  doc.setFontSize(8.5);
  doc.setTextColor(...hexToRgb(settings.footerColor));
  doc.text(settings.signatureLabel, contentX, sigY + 23);
  doc.text(settings.veranstalterLabel, contentX + 40, sigY + 23);

  // --- Seals bottom-right ---
  const sealSize = settings.sealSizeMm;
  const sealY = pageH - sealSize - 22;
  const sealRightX = pageW - rightMargin;
  addImageFitted(doc, euBadge, sealRightX, sealY, sealSize, sealSize, 'right');
  const secondSeal = isTrainer ? eurozertSeal : koalaSeal;
  addImageFitted(doc, secondSeal, sealRightX - sealSize - 4, sealY, sealSize, sealSize, 'right');

  // --- Footer ---
  doc.setFontSize(settings.footerFontSize);
  doc.setTextColor(...hexToRgb(settings.footerColor));
  doc.text(doc.splitTextToSize(settings.footerText, contentW + sidebarW - contentX + 5), contentX, pageH - 8);

  return doc;
}

function buildFilename(data: CertificateData): string {
  const safe = `${data.lastName}_${data.firstName}`.replace(/\s+/g, '_');
  const cat = data.category === 'Trainerprüfung' ? 'Trainerpruefung' : 'Hundefuehrerschein';
  return `Zertifikat_${cat}_${safe}.pdf`;
}

export async function downloadCertificate(
  data: CertificateData,
  settingsOverride?: Partial<CertificateSettings>
): Promise<void> {
  const doc = await buildCertificatePdf(data, settingsOverride);
  doc.save(buildFilename(data));
}
