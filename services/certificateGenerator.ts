import { jsPDF } from 'jspdf';
import { CertificateSettings, CertificatePositions, CertificateFontFamily } from '../types.ts';

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

// Default positions match the original fixed layout (mm, from top-left of an A4 page).
export const DEFAULT_POSITIONS: CertificatePositions = {
  watermark: { x: 16, y: 150 },
  title: { x: 46, y: 40 },
  name: { x: 46, y: 58 },
  intro: { x: 46, y: 78 },
  heading1: { x: 46, y: 92 },
  heading2: { x: 46, y: 103 },
  legalOrParticipation: { x: 46, y: 119 },
  result: { x: 46, y: 131 },
  passed: { x: 46, y: 143 },
  dogLine: { x: 46, y: 157 },
  signatureDate: { x: 46, y: 228 },
  signatureLabel: { x: 46, y: 251 },
  veranstalterLabel: { x: 86, y: 251 },
  footer: { x: 46, y: 289 },
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
  watermarkFontSize: 13,

  sidebarWidthMm: 32,
  sealSizeMm: 20,
  showWatermarkText: true,

  positions: DEFAULT_POSITIONS,

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

// Merges a partial/stored settings object with the defaults, deep-merging the `positions` map
// so older saved settings (without every key) never end up with missing coordinates.
export function mergeCertificateSettings(override?: Partial<CertificateSettings> | null): CertificateSettings {
  return {
    ...DEFAULT_CERTIFICATE_SETTINGS,
    ...(override || {}),
    positions: {
      ...DEFAULT_POSITIONS,
      ...((override && override.positions) || {}),
    },
  };
}

interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
}

// Cache loaded (fetched) images across multiple certificate generations in the same session.
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

function fontFamilyToCss(family: CertificateFontFamily): string {
  switch (family) {
    case 'times':
      return '"Times New Roman", Times, serif';
    case 'courier':
      return '"Courier New", Courier, monospace';
    default:
      return 'Helvetica, Arial, sans-serif';
  }
}

// Renders text rotated 90° into a canvas and returns it as an image — far more reliable
// than jsPDF's native rotated-text option, which frequently fails to render at all when
// combined with center alignment.
function renderVerticalTextImage(text: string, colorHex: string, fontSizePt: number, family: CertificateFontFamily): LoadedImage {
  const cssFont = fontFamilyToCss(family);
  const scale = 4; // supersample for a crisp result once embedded into the PDF
  const fontPx = Math.max(fontSizePt * 1.333 * scale, 1);

  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = `${fontPx}px ${cssFont}`;
  const textWidth = Math.max(measure.measureText(text || ' ').width, 1);

  const paddingX = fontPx * 0.25;
  const height = Math.ceil(textWidth + paddingX * 2);
  const width = Math.ceil(fontPx * 1.4);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${fontPx}px ${cssFont}`;
  ctx.fillStyle = colorHex;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(text || '', 0, 0);

  return { dataUrl: canvas.toDataURL('image/png'), width, height };
}

function addImageFitted(
  doc: jsPDF,
  img: LoadedImage,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  hAlign: 'left' | 'center' | 'right' = 'left',
  vAlign: 'top' | 'center' = 'top'
): { w: number; h: number } {
  const ratio = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  let drawX = x;
  if (hAlign === 'center') drawX = x - w / 2;
  if (hAlign === 'right') drawX = x - w;
  let drawY = y;
  if (vAlign === 'center') drawY = y - h / 2;
  doc.addImage(img.dataUrl, 'PNG', drawX, drawY, w, h);
  return { w, h };
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex || '#000000').replace('#', '');
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
  settingsOverride?: Partial<CertificateSettings> | null
): Promise<jsPDF> {
  const settings = mergeCertificateSettings(settingsOverride);
  const pos = settings.positions;
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
  const rightMargin = 18;

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

  if (settings.showWatermarkText && settings.watermarkText) {
    const wmImg = renderVerticalTextImage(settings.watermarkText, settings.watermarkColor, settings.watermarkFontSize, settings.fontFamily);
    addImageFitted(doc, wmImg, pos.watermark.x, pos.watermark.y, Math.max(sidebarW - 6, 4), pageH - 40, 'center', 'center');
  }

  // --- Title ---
  doc.setTextColor(...hexToRgb(settings.titleColor));
  doc.setFont(settings.fontFamily, 'normal');
  doc.setFontSize(settings.titleFontSize);
  doc.text(settings.titleText, pos.title.x, pos.title.y);

  // --- Name ---
  doc.setFontSize(settings.nameFontSize);
  doc.setTextColor(...hexToRgb(settings.nameColor));
  doc.text(vars.name, pos.name.x, pos.name.y);

  // --- Intro line ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(settings.bodyFontSize);
  doc.setTextColor(...hexToRgb(settings.bodyColor));
  doc.text(fillPlaceholders(settings.introText, vars), pos.intro.x, pos.intro.y);

  // --- Category heading ---
  doc.setFont(settings.fontFamily, 'normal');
  doc.setFontSize(settings.headingFontSize);
  doc.text(settings.headingLine1, pos.heading1.x, pos.heading1.y);
  doc.text(isTrainer ? settings.headingLine2Trainer : settings.headingLine2Koala, pos.heading2.x, pos.heading2.y);

  // --- Legal / participation line ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(settings.bodyFontSize);
  doc.setTextColor(...hexToRgb(settings.bodyColor));
  const legalWrapW = pageW - rightMargin - pos.legalOrParticipation.x;
  if (isTrainer) {
    doc.text(doc.splitTextToSize(settings.legalLineTrainer, legalWrapW), pos.legalOrParticipation.x, pos.legalOrParticipation.y);
  } else {
    doc.text(settings.participationLineKoala, pos.legalOrParticipation.x, pos.legalOrParticipation.y);
  }

  // --- Result & passed lines ---
  const resultWrapW = pageW - rightMargin - pos.result.x;
  doc.text(doc.splitTextToSize(fillPlaceholders(settings.resultLine, vars), resultWrapW), pos.result.x, pos.result.y);
  doc.text(settings.passedLine, pos.passed.x, pos.passed.y);

  // --- Dog line (Hundeführerschein only) ---
  if (!isTrainer && data.dogName) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(Math.max(settings.bodyFontSize - 0.5, 6));
    doc.setTextColor(...hexToRgb(settings.bodyColor));
    doc.text(fillPlaceholders(settings.dogLineTemplate, vars), pos.dogLine.x, pos.dogLine.y);
  }

  // --- Signature block ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(settings.bodyFontSize);
  doc.setTextColor(...hexToRgb(settings.bodyColor));
  doc.text(`${location}, den ${dateStr}`, pos.signatureDate.x, pos.signatureDate.y);

  addImageFitted(doc, signature, pos.signatureDate.x, pos.signatureDate.y + 4, 34, 14, 'left');
  addImageFitted(doc, stamp, pos.signatureDate.x + 40, pos.signatureDate.y + 1, 28, 18, 'left');
  addImageFitted(doc, hundeschuleLogo, pos.signatureDate.x + 76, pos.signatureDate.y + 1, 20, 20, 'left');

  doc.setFontSize(8.5);
  doc.setTextColor(...hexToRgb(settings.footerColor));
  doc.text(settings.signatureLabel, pos.signatureLabel.x, pos.signatureLabel.y);
  doc.text(settings.veranstalterLabel, pos.veranstalterLabel.x, pos.veranstalterLabel.y);

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
  const footerWrapW = pageW - rightMargin - sidebarW - 4;
  doc.text(doc.splitTextToSize(settings.footerText, footerWrapW), pos.footer.x, pos.footer.y);

  return doc;
}

function buildFilename(data: CertificateData): string {
  const safe = `${data.lastName}_${data.firstName}`.replace(/\s+/g, '_');
  const cat = data.category === 'Trainerprüfung' ? 'Trainerpruefung' : 'Hundefuehrerschein';
  return `Zertifikat_${cat}_${safe}.pdf`;
}

export async function downloadCertificate(
  data: CertificateData,
  settingsOverride?: Partial<CertificateSettings> | null
): Promise<void> {
  const doc = await buildCertificatePdf(data, settingsOverride);
  doc.save(buildFilename(data));
}
