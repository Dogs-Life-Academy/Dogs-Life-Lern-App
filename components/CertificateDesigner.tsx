import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CertificateSettings, CertificateFontFamily } from '../types.ts';
import { DEFAULT_CERTIFICATE_SETTINGS, buildCertificatePdf, CertificateData } from '../services/certificateGenerator.ts';
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
      if (loaded) setSettings({ ...DEFAULT_CERTIFICATE_SETTINGS, ...loaded });
      setLoading(false);
    })();
  }, []);

  // Regenerate the live PDF preview (debounced) whenever settings or preview category change.
  useEffect(() => {
    if (loading) return;
    setPreviewLoading(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const sampleData: CertificateData = {
          ...SAMPLE_BASE,
          category: previewCategory,
          dogName: previewCategory === 'Hundeführerschein' ? 'Bello' : undefined,
          chipNumber: previewCategory === 'Hundeführerschein' ? '276000000000000' : undefined,
        };
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
  }, [settings, previewCategory, loading]);

  // Revoke the last blob URL on unmount.
  useEffect(() => {
    return () => {
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    };
  }, []);

  const update = useCallback(<K extends keyof CertificateSettings>(key: K, value: CertificateSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
    if (window.confirm('Alle Zertifikat-Einstellungen auf den Standard zurücksetzen? (Erst nach "Speichern" endgültig)')) {
      setSettings(DEFAULT_CERTIFICATE_SETTINGS);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-400 font-bold">Lade Zertifikat-Einstellungen...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm text-gray-500 max-w-xl">
          Alle Änderungen werden sofort rechts in der Vorschau angezeigt. Erst mit <span className="font-bold">"Speichern"</span> werden sie für neu ausgestellte Zertifikate übernommen.
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* --- Form Controls --- */}
        <div className="space-y-5">
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
            <NumberField label="Größe Fußzeile" value={settings.footerFontSize} onChange={v => update('footerFontSize', v)} min={5} max={12} step={0.5} />
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

        {/* --- Live Preview --- */}
        <div className="xl:sticky xl:top-4 h-fit space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setPreviewCategory('Hundeführerschein')}
              className={`flex-1 py-2 rounded-xl font-bold text-sm border-2 transition ${previewCategory === 'Hundeführerschein' ? 'bg-[#FF9F43] border-[#e67e22] text-white' : 'border-gray-200 text-gray-500'}`}
            >
              Vorschau: Hundeführerschein
            </button>
            <button
              onClick={() => setPreviewCategory('Trainerprüfung')}
              className={`flex-1 py-2 rounded-xl font-bold text-sm border-2 transition ${previewCategory === 'Trainerprüfung' ? 'bg-[#6C5CE7] border-[#4834d4] text-white' : 'border-gray-200 text-gray-500'}`}
            >
              Vorschau: Trainerprüfung
            </button>
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-gray-100" style={{ aspectRatio: '210 / 297' }}>
            {previewUrl && (
              <iframe src={previewUrl} title="Zertifikat-Vorschau" className="w-full h-full border-0" />
            )}
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
