import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CertificateSettings, CertificateFontFamily, CertificateElementKey } from '../types.ts';
import {
  DEFAULT_CERTIFICATE_SETTINGS,
  mergeCertificateSettings,
  buildCertificatePdf,
  CertificateData,
} from '../services/certificateGenerator.ts';
import { fetchCertificateSettings, saveCertificateSettings } from '../services/supabaseClient.ts';

type PreviewCategory = 'Hundeführerschein' | 'Trainerprüfung';

// --- small reusable form controls -------------------------------------------------

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <h3 className="font-extrabold text-gray-800 mb-4">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-2 gap-3">{children}</div>
);

const ColorField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
      <input type="text" value={value} onChange={e => onChange(e.target.value)} className="flex-1 p-2 text-sm rounded-lg border border-gray-200 font-mono" />
    </div>
  </div>
);

const NumberField: React.FC<{ label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }> = ({ label, value, onChange, min = 0, max = 100, step = 1 }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
    <div className="flex items-center gap-2">
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="flex-1" />
      <span className="text-xs font-bold text-gray-600 w-10 text-right">{value}</span>
    </div>
  </div>
);

const TextField: React.FC<{ label: string; value: string; onChange: (v: string) => void; hint?: string }> = ({ label, value, onChange, hint }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
    <input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-full p-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7] outline-none" />
    {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
  </div>
);

const TextAreaField: React.FC<{ label: string; value: string; onChange: (v: string) => void; hint?: string }> = ({ label, value, onChange, hint }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={2} className="w-full p-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7] outline-none resize-none" />
    {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
  </div>
);

const PLACEHOLDER_HINT = 'Platzhalter: {name} {datum} {ergebnis} {hundename} {chipnummer}';

// --- drag & drop position canvas ----------------------------------------------------

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const PX_PER_MM = 2.1;
const CANVAS_W = PAGE_W_MM * PX_PER_MM;
const CANVAS_H = PAGE_H_MM * PX_PER_MM;

function fontFamilyToCss(family: CertificateFontFamily): string {
  switch (family) {
    case 'times': return '"Times New Roman", Times, serif';
    case 'courier': return '"Courier New", Courier, monospace';
    default: return 'Helvetica, Arial, sans-serif';
  }
}

interface DragLabelProps {
  label: string;
  x: number;
  y: number;
  fontSize: number; // pt, same unit as jsPDF setFontSize
  color: string;
  fontFamily: string;
  italic?: boolean;
  align?: 'left' | 'center';
  vertical?: boolean;
  onDrag: (xMm: number, yMm: number) => void;
}

const DragLabel: React.FC<DragLabelProps> = ({ label, x, y, fontSize, color, fontFamily, italic, align = 'left', vertical, onDrag }) => {
  const startRef = useRef<{ startClientX: number; startClientY: number; startX: number; startY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startRef.current = { startClientX: e.clientX, startClientY: e.clientY, startX: x, startY: y };
    setDragging(true);

    const onMove = (moveEvent: PointerEvent) => {
      if (!startRef.current) return;
      const dxMm = (moveEvent.clientX - startRef.current.startClientX) / PX_PER_MM;
      const dyMm = (moveEvent.clientY - startRef.current.startClientY) / PX_PER_MM;
      const newX = Math.min(Math.max(startRef.current.startX + dxMm, 0), PAGE_W_MM);
      const newY = Math.min(Math.max(startRef.current.startY + dyMm, 0), PAGE_H_MM);
      onDrag(newX, newY);
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const baseTransform = vertical
    ? 'translate(-50%, -50%) rotate(-90deg)'
    : (align === 'center' ? 'translate(-50%, -60%)' : 'translate(0, -60%)');

  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        left: x * PX_PER_MM,
        top: y * PX_PER_MM,
        transform: baseTransform,
        fontFamily,
        fontStyle: italic ? 'italic' : 'normal',
        fontSize: Math.max(fontSize * PX_PER_MM * 0.352, 7),
        color,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        cursor: dragging ? 'grabbing' : 'grab',
        padding: '1px 4px',
        borderRadius: 4,
        border: dragging ? '1px dashed #6C5CE7' : '1px dashed transparent',
        background: dragging ? 'rgba(108,92,231,0.12)' : 'transparent',
        lineHeight: 1.15,
        touchAction: 'none',
        zIndex: dragging ? 20 : 10,
      }}
      className="hover:border-[#6C5CE7] hover:bg-[#6C5CE7]/10"
      title="Zum Verschieben ziehen"
    >
      {label}
    </div>
  );
};

// --- main component -----------------------------------------------------------------

const SAMPLE_BASE = {
  firstName: 'Max',
  lastName: 'Mustermann',
  scorePercentage: 92,
  certifiedAt: new Date(),
};

const CertificateDesigner: React.FC = () => {
  const [settings, setSettings] = useState<CertificateSettings>(DEFAULT_CERTIFICATE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewCategory, setPreviewCategory] = useState<PreviewCategory>('Hundeführerschein');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(true);
  const debounceRef = useRef<number | null>(null);
  const currentUrlRef = useRef<string>('');

  useEffect(() => {
    (async () => {
      const loaded = await fetchCertificateSettings();
      setSettings(mergeCertificateSettings(loaded));
      setLoading(false);
    })();
  }, []);

  const sampleData: CertificateData = {
    ...SAMPLE_BASE,
    category: previewCategory,
    dogName: previewCategory === 'Hundeführerschein' ? 'Bello' : undefined,
    chipNumber: previewCategory === 'Hundeführerschein' ? '276000000000000' : undefined,
  };

  // Regenerate the live PDF preview (debounced) whenever settings or preview category change.
  useEffect(() => {
    if (loading) return;
    setPreviewLoading(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const doc = await buildCertificatePdf(sampleData, settings);
        const blobUrl = doc.output('bloburl') as unknown as string;
        if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = blobUrl;
        setPreviewUrl(blobUrl);
      } catch (err) {
        console.error('Vorschau konnte nicht erstellt werden:', err);
      } finally {
        setPreviewLoading(false);
      }
    }, 500);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, previewCategory, loading]);

  useEffect(() => {
    return () => {
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    };
  }, []);

  const update = useCallback(<K extends keyof CertificateSettings>(key: K, value: CertificateSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updatePosition = useCallback((key: CertificateElementKey, xMm: number, yMm: number) => {
    setSettings(prev => ({
      ...prev,
      positions: { ...prev.positions, [key]: { x: Math.round(xMm * 10) / 10, y: Math.round(yMm * 10) / 10 } },
    }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await saveCertificateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Einstellungen konnten nicht gespeichert werden. Ist die Tabelle "certificate_settings" in Supabase angelegt?');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Alle Zertifikat-Einstellungen (inkl. Positionen) auf den Standard zurücksetzen? (Erst nach "Speichern" endgültig)')) {
      setSettings(DEFAULT_CERTIFICATE_SETTINGS);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-400 font-bold">Lade Zertifikat-Einstellungen...</div>;
  }

  const isTrainer = previewCategory === 'Trainerprüfung';
  const pos = settings.positions;
  const headingCss = fontFamilyToCss(settings.fontFamily);
  const bodyCss = fontFamilyToCss('helvetica');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm text-gray-500 max-w-xl">
          Ziehe die Textfelder in der Vorschau direkt an die gewünschte Stelle. Farben, Schrift & Texte änderst du links.
          Erst mit <span className="font-bold">"Speichern"</span> gilt alles für neu ausgestellte Zertifikate.
        </p>
        <div className="flex gap-2">
          <button onClick={handleReset} className="py-2 px-4 rounded-xl border-2 border-gray-200 text-gray-500 font-bold text-sm hover:bg-gray-50 transition">
            Zurücksetzen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="py-2 px-6 rounded-xl bg-[#6C5CE7] text-white font-bold text-sm shadow-md hover:bg-[#5f4dd0] transition disabled:opacity-60"
          >
            {saving ? 'Speichert...' : saveSuccess ? '✓ Gespeichert' : 'Speichern'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-6 items-start">
        {/* --- Form Controls --- */}
        <div className="space-y-5 order-2 xl:order-1">
          <Section title="🎨 Farben">
            <Row>
              <ColorField label="Seitenstreifen" value={settings.sidebarColor} onChange={v => update('sidebarColor', v)} />
              <ColorField label="Wasserzeichen-Text" value={settings.watermarkColor} onChange={v => update('watermarkColor', v)} />
            </Row>
            <Row>
              <ColorField label="Titel" value={settings.titleColor} onChange={v => update('titleColor', v)} />
              <ColorField label="Name" value={settings.nameColor} onChange={v => update('nameColor', v)} />
            </Row>
            <Row>
              <ColorField label="Fließtext" value={settings.bodyColor} onChange={v => update('bodyColor', v)} />
              <ColorField label="Fußzeile" value={settings.footerColor} onChange={v => update('footerColor', v)} />
            </Row>
          </Section>

          <Section title="🔤 Schrift">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Schriftart (Titel &amp; Überschriften)</label>
              <select
                value={settings.fontFamily}
                onChange={e => update('fontFamily', e.target.value as CertificateFontFamily)}
                className="w-full p-2.5 text-sm rounded-lg border border-gray-200"
              >
                <option value="times">Elegant / Serif (Times)</option>
                <option value="helvetica">Modern / Klar (Helvetica)</option>
                <option value="courier">Schreibmaschine (Courier)</option>
              </select>
            </div>
            <Row>
              <NumberField label="Größe Titel" value={settings.titleFontSize} onChange={v => update('titleFontSize', v)} min={20} max={60} />
              <NumberField label="Größe Name" value={settings.nameFontSize} onChange={v => update('nameFontSize', v)} min={12} max={36} />
            </Row>
            <Row>
              <NumberField label="Größe Überschrift" value={settings.headingFontSize} onChange={v => update('headingFontSize', v)} min={14} max={40} />
              <NumberField label="Größe Fließtext" value={settings.bodyFontSize} onChange={v => update('bodyFontSize', v)} min={7} max={16} step={0.5} />
            </Row>
            <Row>
              <NumberField label="Größe Fußzeile" value={settings.footerFontSize} onChange={v => update('footerFontSize', v)} min={5} max={12} step={0.5} />
              <NumberField label="Größe Wasserzeichen" value={settings.watermarkFontSize} onChange={v => update('watermarkFontSize', v)} min={6} max={24} />
            </Row>
          </Section>

          <Section title="📐 Layout">
            <Row>
              <NumberField label="Breite Seitenstreifen (mm)" value={settings.sidebarWidthMm} onChange={v => update('sidebarWidthMm', v)} min={0} max={60} />
              <NumberField label="Größe der Siegel (mm)" value={settings.sealSizeMm} onChange={v => update('sealSizeMm', v)} min={10} max={35} />
            </Row>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
              <input type="checkbox" checked={settings.showWatermarkText} onChange={e => update('showWatermarkText', e.target.checked)} className="w-4 h-4" />
              Wasserzeichen-Text im Seitenstreifen anzeigen
            </label>
            <p className="text-[11px] text-gray-400">
              💡 Tipp: Alle Textfelder lassen sich in der Vorschau rechts direkt per Ziehen an die gewünschte Position verschieben.
            </p>
          </Section>

          <Section title="✏️ Texte">
            <p className="text-[11px] text-gray-400 -mt-2">{PLACEHOLDER_HINT}</p>
            <TextField label="Wasserzeichen-Text" value={settings.watermarkText} onChange={v => update('watermarkText', v)} />
            <TextField label="Titel" value={settings.titleText} onChange={v => update('titleText', v)} />
            <TextField label="Einleitungssatz" value={settings.introText} onChange={v => update('introText', v)} />
            <TextField label="Überschrift Zeile 1 (beide Prüfungen)" value={settings.headingLine1} onChange={v => update('headingLine1', v)} />
            <TextField label="Überschrift Zeile 2 – Trainerprüfung" value={settings.headingLine2Trainer} onChange={v => update('headingLine2Trainer', v)} />
            <TextField label="Überschrift Zeile 2 – Hundeführerschein" value={settings.headingLine2Koala} onChange={v => update('headingLine2Koala', v)} />
            <TextAreaField label="Rechtstext – nur Trainerprüfung" value={settings.legalLineTrainer} onChange={v => update('legalLineTrainer', v)} />
            <TextField label="Teilnahmetext – nur Hundeführerschein" value={settings.participationLineKoala} onChange={v => update('participationLineKoala', v)} />
            <TextAreaField label="Ergebnis-Satz" value={settings.resultLine} onChange={v => update('resultLine', v)} />
            <TextField label="Bestanden-Satz" value={settings.passedLine} onChange={v => update('passedLine', v)} />
            <TextField label="Hunde-Zeile (nur Hundeführerschein)" value={settings.dogLineTemplate} onChange={v => update('dogLineTemplate', v)} />
            <TextField label="Standard-Ort" value={settings.locationDefault} onChange={v => update('locationDefault', v)} />
            <TextField label="Signatur-Label" value={settings.signatureLabel} onChange={v => update('signatureLabel', v)} />
            <TextField label="Veranstalter-Label" value={settings.veranstalterLabel} onChange={v => update('veranstalterLabel', v)} />
            <TextAreaField label="Fußzeile" value={settings.footerText} onChange={v => update('footerText', v)} />
          </Section>
        </div>

        {/* --- Drag canvas + Live PDF Preview --- */}
        <div className="order-1 xl:order-2 xl:sticky xl:top-4 space-y-3" style={{ width: CANVAS_W }}>
          <div className="flex gap-2">
            <button
              onClick={() => setPreviewCategory('Hundeführerschein')}
              className={`flex-1 py-2 rounded-xl font-bold text-xs border-2 transition ${previewCategory === 'Hundeführerschein' ? 'bg-[#FF9F43] border-[#e67e22] text-white' : 'border-gray-200 text-gray-500'}`}
            >
              Hundeführerschein
            </button>
            <button
              onClick={() => setPreviewCategory('Trainerprüfung')}
              className={`flex-1 py-2 rounded-xl font-bold text-xs border-2 transition ${previewCategory === 'Trainerprüfung' ? 'bg-[#6C5CE7] border-[#4834d4] text-white' : 'border-gray-200 text-gray-500'}`}
            >
              Trainerprüfung
            </button>
          </div>

          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">✋ Positionen ziehen</p>
          <div
            className="relative bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
            style={{ width: CANVAS_W, height: CANVAS_H }}
          >
            {/* sidebar */}
            <div style={{ position: 'absolute', left: 0, top: 0, width: settings.sidebarWidthMm * PX_PER_MM, height: CANVAS_H, background: settings.sidebarColor }} />
            {/* seal placeholders (fixed, not draggable) */}
            <div style={{ position: 'absolute', right: 18 * PX_PER_MM, bottom: 22 * PX_PER_MM, width: settings.sealSizeMm * PX_PER_MM, height: settings.sealSizeMm * PX_PER_MM, border: '1px dashed #ccc', borderRadius: '50%' }} className="flex items-center justify-center text-[8px] text-gray-300">EU</div>
            <div style={{ position: 'absolute', right: (18 + settings.sealSizeMm + 4) * PX_PER_MM, bottom: 22 * PX_PER_MM, width: settings.sealSizeMm * PX_PER_MM, height: settings.sealSizeMm * PX_PER_MM, border: '1px dashed #ccc', borderRadius: '50%' }} className="flex items-center justify-center text-[8px] text-gray-300 text-center px-1">Siegel</div>
            {/* signature images placeholder */}
            <div style={{ position: 'absolute', left: pos.signatureDate.x * PX_PER_MM, top: (pos.signatureDate.y + 3) * PX_PER_MM, width: 96 * PX_PER_MM, height: 20 * PX_PER_MM, border: '1px dashed #ccc' }} className="flex items-center justify-center text-[8px] text-gray-300">Unterschrift / Stempel / Logo</div>

            {settings.showWatermarkText && (
              <DragLabel
                label={settings.watermarkText}
                x={pos.watermark.x}
                y={pos.watermark.y}
                fontSize={settings.watermarkFontSize}
                color={settings.watermarkColor}
                fontFamily={headingCss}
                vertical
                onDrag={(x, y) => updatePosition('watermark', x, y)}
              />
            )}
            <DragLabel label={settings.titleText} x={pos.title.x} y={pos.title.y} fontSize={settings.titleFontSize} color={settings.titleColor} fontFamily={headingCss} onDrag={(x, y) => updatePosition('title', x, y)} />
            <DragLabel label={`${sampleData.firstName} ${sampleData.lastName}`} x={pos.name.x} y={pos.name.y} fontSize={settings.nameFontSize} color={settings.nameColor} fontFamily={headingCss} onDrag={(x, y) => updatePosition('name', x, y)} />
            <DragLabel label={settings.introText.replace('{datum}', '07. Dezember 2024')} x={pos.intro.x} y={pos.intro.y} fontSize={settings.bodyFontSize} color={settings.bodyColor} fontFamily={bodyCss} onDrag={(x, y) => updatePosition('intro', x, y)} />
            <DragLabel label={settings.headingLine1} x={pos.heading1.x} y={pos.heading1.y} fontSize={settings.headingFontSize} color={settings.bodyColor} fontFamily={headingCss} onDrag={(x, y) => updatePosition('heading1', x, y)} />
            <DragLabel label={isTrainer ? settings.headingLine2Trainer : settings.headingLine2Koala} x={pos.heading2.x} y={pos.heading2.y} fontSize={settings.headingFontSize} color={settings.bodyColor} fontFamily={headingCss} onDrag={(x, y) => updatePosition('heading2', x, y)} />
            <DragLabel label={isTrainer ? settings.legalLineTrainer.slice(0, 45) + '…' : settings.participationLineKoala} x={pos.legalOrParticipation.x} y={pos.legalOrParticipation.y} fontSize={settings.bodyFontSize} color={settings.bodyColor} fontFamily={bodyCss} onDrag={(x, y) => updatePosition('legalOrParticipation', x, y)} />
            <DragLabel label={settings.resultLine.replace('{ergebnis}', '92').replace('{datum}', '07. Dezember 2024')} x={pos.result.x} y={pos.result.y} fontSize={settings.bodyFontSize} color={settings.bodyColor} fontFamily={bodyCss} onDrag={(x, y) => updatePosition('result', x, y)} />
            <DragLabel label={settings.passedLine} x={pos.passed.x} y={pos.passed.y} fontSize={settings.bodyFontSize} color={settings.bodyColor} fontFamily={bodyCss} onDrag={(x, y) => updatePosition('passed', x, y)} />
            {!isTrainer && (
              <DragLabel label={settings.dogLineTemplate.replace('{hundename}', 'Bello').replace('{chipnummer}', '276000000000000')} x={pos.dogLine.x} y={pos.dogLine.y} fontSize={settings.bodyFontSize - 0.5} italic color={settings.bodyColor} fontFamily={bodyCss} onDrag={(x, y) => updatePosition('dogLine', x, y)} />
            )}
            <DragLabel label={`${settings.locationDefault}, den 07. Dezember 2024`} x={pos.signatureDate.x} y={pos.signatureDate.y} fontSize={settings.bodyFontSize} color={settings.bodyColor} fontFamily={bodyCss} onDrag={(x, y) => updatePosition('signatureDate', x, y)} />
            <DragLabel label={settings.signatureLabel} x={pos.signatureLabel.x} y={pos.signatureLabel.y} fontSize={8.5} color={settings.footerColor} fontFamily={bodyCss} onDrag={(x, y) => updatePosition('signatureLabel', x, y)} />
            <DragLabel label={settings.veranstalterLabel} x={pos.veranstalterLabel.x} y={pos.veranstalterLabel.y} fontSize={8.5} color={settings.footerColor} fontFamily={bodyCss} onDrag={(x, y) => updatePosition('veranstalterLabel', x, y)} />
            <DragLabel label={settings.footerText.slice(0, 50) + '…'} x={pos.footer.x} y={pos.footer.y} fontSize={settings.footerFontSize} color={settings.footerColor} fontFamily={bodyCss} onDrag={(x, y) => updatePosition('footer', x, y)} />
          </div>

          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide pt-2">📄 Echte PDF-Vorschau</p>
          <div className="relative rounded-xl overflow-hidden shadow-xl border border-gray-200 bg-gray-100" style={{ width: CANVAS_W, height: CANVAS_H }}>
            {previewUrl && <iframe src={previewUrl} title="Zertifikat-PDF-Vorschau" className="w-full h-full border-0" />}
            {previewLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <span className="text-gray-400 font-bold text-sm">Vorschau wird aktualisiert...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateDesigner;
