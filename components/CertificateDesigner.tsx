import React, { useState, useEffect, useRef } from 'react';
import {
  CertificateSettings,
  CertificateTextElement,
  CertificateImageElement,
  CertificateImageAsset,
  CertificateFontFamily,
  CertificateElementVisibility,
} from '../types.ts';
import {
  DEFAULT_CERTIFICATE_SETTINGS,
  mergeCertificateSettings,
  buildCertificatePdf,
  IMAGE_ASSET_LABELS,
  CertificateData,
} from '../services/certificateGenerator.ts';
import { fetchCertificateSettings, saveCertificateSettings } from '../services/supabaseClient.ts';

type PreviewCategory = 'Hundeführerschein' | 'Trainerprüfung';

const ASSET_PUBLIC_PATHS: Record<CertificateImageAsset, string> = {
  shield: '/assets/canicanum-logo.png',
  signature: '/assets/certificates/signature-huber.png',
  hundeschuleLogo: '/assets/certificates/hundeschule-bw-logo.png',
  businessCardStamp: '/assets/certificates/business-card-stamp.png',
  euBadge: '/assets/certificates/eu-qualified-badge.png',
  eurozertSeal: '/assets/certificates/eurozert-seal.png',
  koalaSeal: '/assets/certificates/koala-pruefer-seal.png',
};

function fontFamilyToCss(family: CertificateFontFamily): string {
  switch (family) {
    case 'times': return '"Times New Roman", Times, serif';
    case 'courier': return '"Courier New", Courier, monospace';
    default: return 'Helvetica, Arial, sans-serif';
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const PX_PER_MM = 2.15;
const CANVAS_W = PAGE_W_MM * PX_PER_MM;
const CANVAS_H = PAGE_H_MM * PX_PER_MM;

const SAMPLE_BASE = { firstName: 'Max', lastName: 'Mustermann', scorePercentage: 92, certifiedAt: new Date() };

function sampleVars(category: PreviewCategory): Record<string, string> {
  return {
    name: `${SAMPLE_BASE.firstName} ${SAMPLE_BASE.lastName}`,
    datum: '07. Dezember 2024',
    ergebnis: String(SAMPLE_BASE.scorePercentage),
    hundename: category === 'Hundeführerschein' ? 'Bello' : '',
    chipnummer: category === 'Hundeführerschein' ? '276000000000000' : '',
    ort: 'Ascha',
  };
}

function fillVars(template: string, vars: Record<string, string>): string {
  let out = template;
  Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(v); });
  return out;
}

function matches(vis: CertificateElementVisibility, isTrainer: boolean) {
  return vis === 'all' || (isTrainer ? vis === 'trainer' : vis === 'koala');
}

function snap(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled || gridSize <= 0) return Math.round(value * 10) / 10;
  return Math.round(value / gridSize) * gridSize;
}

// --- small form controls ------------------------------------------------------------

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full p-2 text-sm rounded-lg border border-gray-200 focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7] outline-none";

// --- main component -----------------------------------------------------------------

const CertificateDesigner: React.FC = () => {
  const [settings, setSettings] = useState<CertificateSettings>(DEFAULT_CERTIFICATE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewCategory, setPreviewCategory] = useState<PreviewCategory>('Hundeführerschein');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(true);
  const [selected, setSelected] = useState<{ type: 'text' | 'image'; id: string } | null>(null);
  const [newAssetToAdd, setNewAssetToAdd] = useState<CertificateImageAsset>('hundeschuleLogo');
  const debounceRef = useRef<number | null>(null);
  const currentUrlRef = useRef('');

  useEffect(() => {
    (async () => {
      const loaded = await fetchCertificateSettings();
      setSettings(mergeCertificateSettings(loaded));
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    setPreviewLoading(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const data: CertificateData = {
          ...SAMPLE_BASE,
          category: previewCategory,
          dogName: previewCategory === 'Hundeführerschein' ? 'Bello' : undefined,
          chipNumber: previewCategory === 'Hundeführerschein' ? '276000000000000' : undefined,
        };
        const doc = await buildCertificatePdf(data, settings);
        const blobUrl = doc.output('bloburl') as unknown as string;
        if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = blobUrl;
        setPreviewUrl(blobUrl);
      } catch (err) {
        console.error('Vorschau konnte nicht erstellt werden:', err);
      } finally {
        setPreviewLoading(false);
      }
    }, 450);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [settings, previewCategory, loading]);

  useEffect(() => () => { if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current); }, []);

  const isTrainer = previewCategory === 'Trainerprüfung';
  const vars = sampleVars(previewCategory);

  const selectedText: CertificateTextElement | undefined = selected?.type === 'text'
    ? settings.textElements.find(t => t.id === selected.id) : undefined;
  const selectedImage: CertificateImageElement | undefined = selected?.type === 'image'
    ? settings.imageElements.find(i => i.id === selected.id) : undefined;

  const updateText = (id: string, patch: Partial<CertificateTextElement>) => {
    setSettings(prev => ({ ...prev, textElements: prev.textElements.map(t => t.id === id ? { ...t, ...patch } : t) }));
  };
  const updateImage = (id: string, patch: Partial<CertificateImageElement>) => {
    setSettings(prev => ({ ...prev, imageElements: prev.imageElements.map(i => i.id === id ? { ...i, ...patch } : i) }));
  };
  const deleteSelected = () => {
    if (!selected) return;
    if (selected.type === 'text') {
      setSettings(prev => ({ ...prev, textElements: prev.textElements.filter(t => t.id !== selected.id) }));
    } else {
      setSettings(prev => ({ ...prev, imageElements: prev.imageElements.filter(i => i.id !== selected.id) }));
    }
    setSelected(null);
  };
  const addText = () => {
    const newEl: CertificateTextElement = {
      id: uid(), label: 'Neuer Text', text: 'Neuer Text', x: 60, y: 150, fontSize: 12,
      color: '#373737', fontFamily: 'helvetica', align: 'left', visibility: 'all',
    };
    setSettings(prev => ({ ...prev, textElements: [...prev.textElements, newEl] }));
    setSelected({ type: 'text', id: newEl.id });
  };
  const addImage = () => {
    const newEl: CertificateImageElement = {
      id: uid(), label: IMAGE_ASSET_LABELS[newAssetToAdd], asset: newAssetToAdd, x: 60, y: 150, width: 25, height: 25, visibility: 'all',
    };
    setSettings(prev => ({ ...prev, imageElements: [...prev.imageElements, newEl] }));
    setSelected({ type: 'image', id: newEl.id });
  };

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
    if (window.confirm('Alles auf die Standardvorlage zurücksetzen? (Erst nach "Speichern" endgültig)')) {
      setSettings(DEFAULT_CERTIFICATE_SETTINGS);
      setSelected(null);
    }
  };

  // --- drag handling (text move, image move+resize) ---
  const dragText = (el: CertificateTextElement, e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    setSelected({ type: 'text', id: el.id });
    const startClientX = e.clientX, startClientY = e.clientY;
    const startX = el.x, startY = el.y;
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startClientX) / PX_PER_MM;
      const dy = (ev.clientY - startClientY) / PX_PER_MM;
      const nx = snap(Math.min(Math.max(startX + dx, 0), PAGE_W_MM), settings.gridSizeMm, settings.snapToGrid);
      const ny = snap(Math.min(Math.max(startY + dy, 0), PAGE_H_MM), settings.gridSizeMm, settings.snapToGrid);
      updateText(el.id, { x: nx, y: ny });
    };
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const dragImage = (el: CertificateImageElement, e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    setSelected({ type: 'image', id: el.id });
    const startClientX = e.clientX, startClientY = e.clientY;
    const startX = el.x, startY = el.y;
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startClientX) / PX_PER_MM;
      const dy = (ev.clientY - startClientY) / PX_PER_MM;
      const nx = snap(Math.min(Math.max(startX + dx, 0), PAGE_W_MM - el.width), settings.gridSizeMm, settings.snapToGrid);
      const ny = snap(Math.min(Math.max(startY + dy, 0), PAGE_H_MM - el.height), settings.gridSizeMm, settings.snapToGrid);
      updateImage(el.id, { x: nx, y: ny });
    };
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const resizeImage = (el: CertificateImageElement, e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    setSelected({ type: 'image', id: el.id });
    const startClientX = e.clientX, startClientY = e.clientY;
    const startW = el.width, startH = el.height;
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startClientX) / PX_PER_MM;
      const dy = (ev.clientY - startClientY) / PX_PER_MM;
      const nw = snap(Math.max(startW + dx, 6), settings.gridSizeMm, settings.snapToGrid);
      const nh = snap(Math.max(startH + dy, 6), settings.gridSizeMm, settings.snapToGrid);
      updateImage(el.id, { width: nw, height: nh });
    };
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-400 font-bold">Lade Zertifikat-Einstellungen...</div>;
  }

  const gridBackground = settings.showGrid
    ? {
        backgroundImage:
          `linear-gradient(to right, rgba(108,92,231,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(108,92,231,0.15) 1px, transparent 1px)`,
        backgroundSize: `${settings.gridSizeMm * PX_PER_MM}px ${settings.gridSizeMm * PX_PER_MM}px`,
      }
    : {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm text-gray-500 max-w-xl">
          Klicke ein Element in der Vorschau an, um es zu bearbeiten, zu verschieben oder zu löschen. Mit "+ Textfeld" bzw. "+ Bild" fügst du neue Elemente hinzu.
        </p>
        <div className="flex gap-2">
          <button onClick={handleReset} className="py-2 px-4 rounded-xl border-2 border-gray-200 text-gray-500 font-bold text-sm hover:bg-gray-50 transition">Zurücksetzen</button>
          <button onClick={handleSave} disabled={saving} className="py-2 px-6 rounded-xl bg-[#6C5CE7] text-white font-bold text-sm shadow-md hover:bg-[#5f4dd0] transition disabled:opacity-60">
            {saving ? 'Speichert...' : saveSuccess ? '✓ Gespeichert' : 'Speichern'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[auto_minmax(0,1fr)] gap-6 items-start">
        {/* --- Canvas + PDF preview --- */}
        <div className="space-y-3" style={{ width: CANVAS_W }}>
          <div className="flex gap-2">
            <button onClick={() => setPreviewCategory('Hundeführerschein')} className={`flex-1 py-2 rounded-xl font-bold text-xs border-2 transition ${previewCategory === 'Hundeführerschein' ? 'bg-[#FF9F43] border-[#e67e22] text-white' : 'border-gray-200 text-gray-500'}`}>Hundeführerschein</button>
            <button onClick={() => setPreviewCategory('Trainerprüfung')} className={`flex-1 py-2 rounded-xl font-bold text-xs border-2 transition ${previewCategory === 'Trainerprüfung' ? 'bg-[#6C5CE7] border-[#4834d4] text-white' : 'border-gray-200 text-gray-500'}`}>Trainerprüfung</button>
          </div>

          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">✋ Editor (klicken, ziehen, Ecke zum Skalieren)</p>
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden" style={{ width: CANVAS_W, height: CANVAS_H, ...gridBackground }} onPointerDown={() => setSelected(null)}>
            {/* sidebar */}
            <div style={{ position: 'absolute', left: 0, top: 0, width: settings.sidebarWidthMm * PX_PER_MM, height: CANVAS_H, background: settings.sidebarColor, pointerEvents: 'none' }} />

            {/* image elements */}
            {settings.imageElements.filter(el => matches(el.visibility, isTrainer)).map(el => {
              const isSel = selected?.type === 'image' && selected.id === el.id;
              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => dragImage(el, e)}
                  style={{
                    position: 'absolute', left: el.x * PX_PER_MM, top: el.y * PX_PER_MM,
                    width: el.width * PX_PER_MM, height: el.height * PX_PER_MM,
                    border: isSel ? '2px solid #6C5CE7' : '1px dashed #bbb',
                    cursor: 'grab', touchAction: 'none',
                  }}
                >
                  <img src={ASSET_PUBLIC_PATHS[el.asset]} alt={el.label} className="w-full h-full object-contain pointer-events-none select-none" draggable={false} />
                  {isSel && (
                    <div
                      onPointerDown={(e) => resizeImage(el, e)}
                      style={{ position: 'absolute', right: -6, bottom: -6, width: 12, height: 12, background: '#6C5CE7', borderRadius: 3, cursor: 'nwse-resize', touchAction: 'none' }}
                    />
                  )}
                </div>
              );
            })}

            {/* text elements */}
            {settings.textElements.filter(el => matches(el.visibility, isTrainer)).map(el => {
              const isSel = selected?.type === 'text' && selected.id === el.id;
              const content = fillVars(el.text, vars);
              if (!content) return null;
              const transform = el.vertical
                ? 'translate(-50%, -50%) rotate(-90deg)'
                : (el.align === 'center' ? 'translate(-50%, -60%)' : el.align === 'right' ? 'translate(-100%, -60%)' : 'translate(0, -60%)');
              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => dragText(el, e)}
                  style={{
                    position: 'absolute', left: el.x * PX_PER_MM, top: el.y * PX_PER_MM,
                    transform, fontFamily: fontFamilyToCss(el.fontFamily),
                    fontStyle: el.italic ? 'italic' : 'normal', fontWeight: el.bold ? 'bold' : 'normal',
                    fontSize: Math.max(el.fontSize * PX_PER_MM * 0.352, 7), color: el.color,
                    whiteSpace: el.maxWidthMm ? 'normal' : 'nowrap',
                    width: el.maxWidthMm && !el.vertical ? el.maxWidthMm * PX_PER_MM : undefined,
                    userSelect: 'none', cursor: 'grab', padding: '1px 4px', borderRadius: 4,
                    border: isSel ? '1px solid #6C5CE7' : '1px dashed transparent',
                    background: isSel ? 'rgba(108,92,231,0.12)' : 'transparent',
                    lineHeight: 1.15, touchAction: 'none', zIndex: isSel ? 20 : 10,
                  }}
                  className="hover:border-[#6C5CE7] hover:bg-[#6C5CE7]/10"
                >
                  {content}
                </div>
              );
            })}
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

        {/* --- Side panel: global settings, add buttons, element properties --- */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-extrabold text-gray-800">⚙️ Allgemein</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Seitenstreifen-Farbe">
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.sidebarColor} onChange={e => setSettings(p => ({ ...p, sidebarColor: e.target.value }))} className="w-9 h-9 rounded border cursor-pointer" />
                  <input type="text" value={settings.sidebarColor} onChange={e => setSettings(p => ({ ...p, sidebarColor: e.target.value }))} className={inputCls + ' font-mono'} />
                </div>
              </Field>
              <Field label="Breite Seitenstreifen (mm)">
                <input type="number" value={settings.sidebarWidthMm} onChange={e => setSettings(p => ({ ...p, sidebarWidthMm: parseFloat(e.target.value) || 0 }))} className={inputCls} />
              </Field>
            </div>
            <Field label="Standard-Ort (Platzhalter {ort})">
              <input type="text" value={settings.locationDefault} onChange={e => setSettings(p => ({ ...p, locationDefault: e.target.value }))} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rastergröße (mm)">
                <input type="number" min={1} max={20} value={settings.gridSizeMm} onChange={e => setSettings(p => ({ ...p, gridSizeMm: parseFloat(e.target.value) || 5 }))} className={inputCls} />
              </Field>
              <div className="flex flex-col justify-end gap-2 pb-1">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                  <input type="checkbox" checked={settings.showGrid} onChange={e => setSettings(p => ({ ...p, showGrid: e.target.checked }))} /> Raster anzeigen
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                  <input type="checkbox" checked={settings.snapToGrid} onChange={e => setSettings(p => ({ ...p, snapToGrid: e.target.checked }))} /> Am Raster ausrichten
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-gray-800">➕ Element hinzufügen</h3>
            <button onClick={addText} className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#6C5CE7] text-[#6C5CE7] font-bold text-sm hover:bg-[#6C5CE7]/5">+ Textfeld hinzufügen</button>
            <div className="flex gap-2">
              <select value={newAssetToAdd} onChange={e => setNewAssetToAdd(e.target.value as CertificateImageAsset)} className={inputCls + ' flex-1'}>
                {(Object.keys(IMAGE_ASSET_LABELS) as CertificateImageAsset[]).map(key => (
                  <option key={key} value={key}>{IMAGE_ASSET_LABELS[key]}</option>
                ))}
              </select>
              <button onClick={addImage} className="py-2 px-4 rounded-xl border-2 border-dashed border-[#00b894] text-[#00b894] font-bold text-sm hover:bg-[#00b894]/5 whitespace-nowrap">+ Bild</button>
            </div>
          </div>

          {selectedText && (
            <div className="bg-white rounded-2xl border-2 border-[#6C5CE7] shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-gray-800">✏️ {selectedText.label}</h3>
                <button onClick={deleteSelected} className="text-[#e17055] hover:text-[#c0392b] font-bold text-xs">Löschen</button>
              </div>
              <Field label="Text (Platzhalter: {name} {datum} {ergebnis} {hundename} {chipnummer} {ort})">
                <textarea rows={2} value={selectedText.text} onChange={e => updateText(selectedText.id, { text: e.target.value })} className={inputCls + ' resize-none'} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Farbe">
                  <div className="flex items-center gap-2">
                    <input type="color" value={selectedText.color} onChange={e => updateText(selectedText.id, { color: e.target.value })} className="w-9 h-9 rounded border cursor-pointer" />
                    <input type="text" value={selectedText.color} onChange={e => updateText(selectedText.id, { color: e.target.value })} className={inputCls + ' font-mono'} />
                  </div>
                </Field>
                <Field label="Schriftgröße">
                  <input type="number" step={0.5} value={selectedText.fontSize} onChange={e => updateText(selectedText.id, { fontSize: parseFloat(e.target.value) || 1 })} className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Schriftart">
                  <select value={selectedText.fontFamily} onChange={e => updateText(selectedText.id, { fontFamily: e.target.value as CertificateFontFamily })} className={inputCls}>
                    <option value="times">Serif (Times)</option>
                    <option value="helvetica">Klar (Helvetica)</option>
                    <option value="courier">Schreibmaschine</option>
                  </select>
                </Field>
                <Field label="Ausrichtung">
                  <select value={selectedText.align} disabled={!!selectedText.vertical} onChange={e => updateText(selectedText.id, { align: e.target.value as 'left' | 'center' | 'right' })} className={inputCls}>
                    <option value="left">Links</option>
                    <option value="center">Zentriert</option>
                    <option value="right">Rechts</option>
                  </select>
                </Field>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                  <input type="checkbox" checked={!!selectedText.bold} onChange={e => updateText(selectedText.id, { bold: e.target.checked })} /> Fett
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                  <input type="checkbox" checked={!!selectedText.italic} onChange={e => updateText(selectedText.id, { italic: e.target.checked })} /> Kursiv
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                  <input type="checkbox" checked={!!selectedText.vertical} onChange={e => updateText(selectedText.id, { vertical: e.target.checked })} /> Gedreht (senkrecht)
                </label>
              </div>
              <Field label="Zeilenumbruch-Breite in mm (leer = kein Umbruch)">
                <input type="number" value={selectedText.maxWidthMm ?? ''} onChange={e => updateText(selectedText.id, { maxWidthMm: e.target.value ? parseFloat(e.target.value) : undefined })} className={inputCls} placeholder="z. B. 140" />
              </Field>
              <Field label="Sichtbarkeit">
                <select value={selectedText.visibility} onChange={e => updateText(selectedText.id, { visibility: e.target.value as CertificateElementVisibility })} className={inputCls}>
                  <option value="all">Beide Prüfungen</option>
                  <option value="trainer">Nur Trainerprüfung</option>
                  <option value="koala">Nur Hundeführerschein</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Position X (mm)">
                  <input type="number" value={selectedText.x} onChange={e => updateText(selectedText.id, { x: parseFloat(e.target.value) || 0 })} className={inputCls} />
                </Field>
                <Field label="Position Y (mm)">
                  <input type="number" value={selectedText.y} onChange={e => updateText(selectedText.id, { y: parseFloat(e.target.value) || 0 })} className={inputCls} />
                </Field>
              </div>
            </div>
          )}

          {selectedImage && (
            <div className="bg-white rounded-2xl border-2 border-[#00b894] shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-gray-800">🖼️ {selectedImage.label}</h3>
                <button onClick={deleteSelected} className="text-[#e17055] hover:text-[#c0392b] font-bold text-xs">Löschen</button>
              </div>
              <Field label="Bild">
                <select value={selectedImage.asset} onChange={e => updateImage(selectedImage.id, { asset: e.target.value as CertificateImageAsset })} className={inputCls}>
                  {(Object.keys(IMAGE_ASSET_LABELS) as CertificateImageAsset[]).map(key => (
                    <option key={key} value={key}>{IMAGE_ASSET_LABELS[key]}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Breite (mm)">
                  <input type="number" value={selectedImage.width} onChange={e => updateImage(selectedImage.id, { width: parseFloat(e.target.value) || 1 })} className={inputCls} />
                </Field>
                <Field label="Höhe (mm)">
                  <input type="number" value={selectedImage.height} onChange={e => updateImage(selectedImage.id, { height: parseFloat(e.target.value) || 1 })} className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Position X (mm)">
                  <input type="number" value={selectedImage.x} onChange={e => updateImage(selectedImage.id, { x: parseFloat(e.target.value) || 0 })} className={inputCls} />
                </Field>
                <Field label="Position Y (mm)">
                  <input type="number" value={selectedImage.y} onChange={e => updateImage(selectedImage.id, { y: parseFloat(e.target.value) || 0 })} className={inputCls} />
                </Field>
              </div>
              <Field label="Sichtbarkeit">
                <select value={selectedImage.visibility} onChange={e => updateImage(selectedImage.id, { visibility: e.target.value as CertificateElementVisibility })} className={inputCls}>
                  <option value="all">Beide Prüfungen</option>
                  <option value="trainer">Nur Trainerprüfung</option>
                  <option value="koala">Nur Hundeführerschein</option>
                </select>
              </Field>
            </div>
          )}

          {!selectedText && !selectedImage && (
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-400">
              Klicke links ein Element an, um es zu bearbeiten.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateDesigner;
