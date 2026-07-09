import { jsPDF } from 'jspdf';
import {
  CertificateSettings,
  CertificateTextElement,
  CertificateImageElement,
  CertificateImageAsset,
  CertificateFontFamily,
  CertificateElementVisibility,
} from '../types.ts';

const ASSET_BASE = '/assets/certificates';

const ASSET_PATHS: Record<CertificateImageAsset, string> = {
  shield: `${ASSET_BASE}/dogs-life-shield.png`,
  signature: `${ASSET_BASE}/signature-huber.png`,
  hundeschuleLogo: `${ASSET_BASE}/hundeschule-bw-logo.png`,
  businessCardStamp: `${ASSET_BASE}/business-card-stamp.png`,
  euBadge: `${ASSET_BASE}/eu-qualified-badge.png`,
  eurozertSeal: `${ASSET_BASE}/eurozert-seal.png`,
  koalaSeal: `${ASSET_BASE}/koala-pruefer-seal.png`,
};

export const IMAGE_ASSET_LABELS: Record<CertificateImageAsset, string> = {
  shield: 'Dog\u00B4s Life Academy Wappen',
  signature: 'Unterschrift',
  hundeschuleLogo: 'Hundeschule Bayerischer Wald (Logo)',
  businessCardStamp: 'Stempel (mit Kontaktdaten)',
  euBadge: 'EU Qualified Experts Siegel',
  eurozertSeal: 'Euro-Zert Siegel',
  koalaSeal: 'KoAla-Prüfer Siegel',
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function textEl(partial: Omit<CertificateTextElement, 'id'>): CertificateTextElement {
  return { id: uid(), ...partial };
}

function imgEl(partial: Omit<CertificateImageElement, 'id'>): CertificateImageElement {
  return { id: uid(), ...partial };
}

export const DEFAULT_CERTIFICATE_SETTINGS: CertificateSettings = {
  sidebarColor: '#909D8C',
  sidebarWidthMm: 32,
  locationDefault: 'Ascha',
  gridSizeMm: 5,
  snapToGrid: true,
  showGrid: true,

  textElements: [
    textEl({ label: 'Wasserzeichen', text: 'Dog\u00B4s Life Academy', x: 16, y: 150, fontSize: 13, color: '#FFFFFF', fontFamily: 'times', align: 'center', vertical: true, visibility: 'all' }),
    textEl({ label: 'Titel', text: 'Zertifikat', x: 46, y: 40, fontSize: 40, color: '#373737', fontFamily: 'times', align: 'left', visibility: 'all' }),
    textEl({ label: 'Name', text: '{name}', x: 46, y: 58, fontSize: 22, color: '#646464', fontFamily: 'times', align: 'left', visibility: 'all' }),
    textEl({ label: 'Einleitung', text: 'hat am {datum} an der', x: 46, y: 78, fontSize: 11, color: '#373737', fontFamily: 'helvetica', align: 'left', visibility: 'all' }),
    textEl({ label: 'Überschrift Zeile 1', text: 'Theorie-Prüfung', x: 46, y: 92, fontSize: 24, color: '#373737', fontFamily: 'times', align: 'left', visibility: 'all' }),
    textEl({ label: 'Überschrift Zeile 2 (Trainer)', text: 'zum/zur Hundetrainer/in', x: 46, y: 103, fontSize: 24, color: '#373737', fontFamily: 'times', align: 'left', visibility: 'trainer' }),
    textEl({ label: 'Überschrift Zeile 2 (KoAla)', text: 'des KoAla-Test\u00AE', x: 46, y: 103, fontSize: 24, color: '#373737', fontFamily: 'times', align: 'left', visibility: 'koala' }),
    textEl({ label: 'Rechtstext (Trainer)', text: 'angelehnt an §11 Abs. 1 Satz 1 Nummer 8 Buchstabe f TierSchG teilgenommen', x: 46, y: 119, fontSize: 11, color: '#373737', fontFamily: 'helvetica', align: 'left', maxWidthMm: 146, visibility: 'trainer' }),
    textEl({ label: 'Teilnahmetext (KoAla)', text: 'teilgenommen', x: 46, y: 119, fontSize: 11, color: '#373737', fontFamily: 'helvetica', align: 'left', visibility: 'koala' }),
    textEl({ label: 'Ergebnis', text: 'und die Prüfung mit einem Ergebnis von {ergebnis}% am {datum}', x: 46, y: 131, fontSize: 11, color: '#373737', fontFamily: 'helvetica', align: 'left', maxWidthMm: 146, visibility: 'all' }),
    textEl({ label: 'Bestanden', text: 'erfolgreich abgelegt und bestanden.', x: 46, y: 143, fontSize: 11, color: '#373737', fontFamily: 'helvetica', align: 'left', visibility: 'all' }),
    textEl({ label: 'Hunde-Zeile', text: 'in Begleitung von Hund {hundename} (Chip-Nr. {chipnummer})', x: 46, y: 157, fontSize: 10.5, color: '#373737', fontFamily: 'helvetica', italic: true, align: 'left', visibility: 'koala' }),
    textEl({ label: 'Ort & Datum', text: '{ort}, den {datum}', x: 46, y: 228, fontSize: 11, color: '#373737', fontFamily: 'helvetica', align: 'left', visibility: 'all' }),
    textEl({ label: 'Signatur-Label', text: 'Sachverständiger | Christian Huber', x: 46, y: 251, fontSize: 8.5, color: '#969696', fontFamily: 'helvetica', align: 'left', visibility: 'all' }),
    textEl({ label: 'Veranstalter-Label', text: 'Veranstalter | Hundeschule Bayerischer Wald', x: 86, y: 251, fontSize: 8.5, color: '#969696', fontFamily: 'helvetica', align: 'left', visibility: 'all' }),
    textEl({ label: 'Fußzeile', text: "Dog\u00B4s Life Academy - www.dogs-life-academy.com  |  Hundeschule Bayerischer Wald - www.hs-bw.com  |  Hundezentrum Bayerischer Wald - www.hundezentrum-bayerischer-wald.de", x: 46, y: 289, fontSize: 7.5, color: '#969696', fontFamily: 'helvetica', align: 'left', maxWidthMm: 150, visibility: 'all' }),
  ],

  imageElements: [
    imgEl({ label: 'Wappen (Seitenstreifen)', asset: 'shield', x: 7, y: 12, width: 18, height: 18, visibility: 'all' }),
    imgEl({ label: 'Unterschrift', asset: 'signature', x: 46, y: 232, width: 34, height: 14, visibility: 'all' }),
    imgEl({ label: 'Stempel', asset: 'businessCardStamp', x: 84, y: 227, width: 62, height: 24, visibility: 'all' }),
    imgEl({ label: 'EU-Siegel', asset: 'euBadge', x: 172, y: 255, width: 20, height: 20, visibility: 'all' }),
    imgEl({ label: 'Euro-Zert Siegel', asset: 'eurozertSeal', x: 148, y: 255, width: 20, height: 20, visibility: 'trainer' }),
    imgEl({ label: 'KoAla-Prüfer Siegel', asset: 'koalaSeal', x: 148, y: 255, width: 20, height: 20, visibility: 'koala' }),
  ],
};

export function mergeCertificateSettings(override?: Partial<CertificateSettings> | null): CertificateSettings {
  if (!override || !Array.isArray(override.textElements) || !Array.isArray(override.imageElements)) {
    // Old/incompatible or missing settings: fall back to the current defaults.
    return { ...DEFAULT_CERTIFICATE_SETTINGS };
  }
  return {
    ...DEFAULT_CERTIFICATE_SETTINGS,
    ...override,
  };
}

interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
}

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
    case 'times': return '"Times New Roman", Times, serif';
    case 'courier': return '"Courier New", Courier, monospace';
    default: return 'Helvetica, Arial, sans-serif';
  }
}

// Renders text rotated 90° into a canvas image. Far more reliable than jsPDF's native
// rotated-text option, which frequently fails to render at all when combined with alignment.
function renderVerticalTextImage(text: string, colorHex: string, fontSizePt: number, family: CertificateFontFamily): LoadedImage {
  const cssFont = fontFamilyToCss(family);
  const scale = 4;
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

// Fits an image (preserving aspect ratio) centered inside a given mm box.
// A unique `alias` is passed for dynamically generated (non-cached) images so jsPDF's
// internal image cache never mistakes new pixel content for a previously seen image.
function drawImageInBox(doc: jsPDF, img: LoadedImage, boxX: number, boxY: number, boxW: number, boxH: number, alias?: string) {
  const ratio = Math.min(boxW / img.width, boxH / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const drawX = boxX + (boxW - w) / 2;
  const drawY = boxY + (boxH - h) / 2;
  doc.addImage(img.dataUrl, 'PNG', drawX, drawY, w, h, alias, undefined, 0);
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

function matchesVisibility(vis: CertificateElementVisibility, isTrainer: boolean): boolean {
  if (vis === 'all') return true;
  return isTrainer ? vis === 'trainer' : vis === 'koala';
}

function fontStyle(el: { bold?: boolean; italic?: boolean }): string {
  if (el.bold && el.italic) return 'bolditalic';
  if (el.bold) return 'bold';
  if (el.italic) return 'italic';
  return 'normal';
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
  const isTrainer = data.category === 'Trainerprüfung';

  const neededAssets = Array.from(new Set(settings.imageElements.map(el => el.asset)));
  const loadedPairs = await Promise.all(neededAssets.map(async asset => [asset, await loadImage(ASSET_PATHS[asset])] as const));
  const loadedImages: Partial<Record<CertificateImageAsset, LoadedImage>> = {};
  loadedPairs.forEach(([asset, img]) => { loadedImages[asset] = img; });

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageH = 297;

  const date = data.certifiedAt ? new Date(data.certifiedAt) : new Date();
  const dateStr = formatDateDE(date);
  const location = data.location || settings.locationDefault;

  const vars = {
    name: `${data.firstName} ${data.lastName}`,
    datum: dateStr,
    ergebnis: String(data.scorePercentage),
    hundename: data.dogName || '',
    chipnummer: data.chipNumber || '',
    ort: location,
  };

  // --- Sidebar background ---
  doc.setFillColor(...hexToRgb(settings.sidebarColor));
  doc.rect(0, 0, settings.sidebarWidthMm, pageH, 'F');

  // --- Image elements ---
  for (const el of settings.imageElements) {
    if (!matchesVisibility(el.visibility, isTrainer)) continue;
    const img = loadedImages[el.asset];
    if (!img) continue;
    drawImageInBox(doc, img, el.x, el.y, el.width, el.height);
  }

  // --- Text elements ---
  for (const el of settings.textElements) {
    if (!matchesVisibility(el.visibility, isTrainer)) continue;
    const content = fillPlaceholders(el.text, vars);
    if (!content) continue;

    if (el.vertical) {
      const img = renderVerticalTextImage(content, el.color, el.fontSize, el.fontFamily);
      const boxW = el.maxWidthMm || Math.max(settings.sidebarWidthMm - 6, 4);
      const boxH = 200;
      drawImageInBox(doc, img, el.x - boxW / 2, el.y - boxH / 2, boxW, boxH, `wm-${el.id}-${content.length}-${el.fontSize}`);
      continue;
    }

    doc.setFont(el.fontFamily, fontStyle(el));
    doc.setFontSize(el.fontSize);
    doc.setTextColor(...hexToRgb(el.color));

    if (el.maxWidthMm) {
      const lines = doc.splitTextToSize(content, el.maxWidthMm);
      doc.text(lines, el.x, el.y, { align: el.align });
    } else {
      doc.text(content, el.x, el.y, { align: el.align });
    }
  }

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
