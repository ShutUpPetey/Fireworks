import { useState, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { X, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Firework, FireworkType, ShowPhase } from '../types';
import { FIREWORK_TYPE_LABELS, PHASE_LABELS } from '../types';

interface Props {
  onImport: (fws: Firework[]) => void;
  onClose: () => void;
}

type ColumnMap = {
  name: string;
  type: string;
  cost: string;
  duration: string;
  phase: string;
  notes: string;
  rating: string;
  quantity: string;
};

const DEFAULT_MAP: ColumnMap = {
  name: '', type: '', cost: '', duration: '', phase: '', notes: '', rating: '', quantity: '',
};

function guessType(val: string): FireworkType {
  const v = val.toLowerCase();
  if (v.includes('500')) return 'cake_500g';
  if (v.includes('200') || v.includes('cake')) return 'cake_200g';
  if (v.includes('fountain') || v.includes('ftn')) return 'fountain';
  if (v.includes('reload') || v.includes('mortar') || v.includes('shell')) return 'reload';
  if (v.includes('roman') || v.includes('candle') || v.includes('rc')) return 'roman_candle';
  return 'misc';
}

function guessPhase(val: string): ShowPhase {
  const v = val.toLowerCase();
  if (v.includes('start') || v.includes('open')) return 'start';
  if (v.includes('finale') && v.includes('mid')) return 'mid_finale';
  if (v.includes('finale') || v.includes('fin')) return 'finale';
  if (v.includes('body') || v.includes('main')) return 'body';
  return 'other';
}

export default function ImportModal({ onImport, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [colMap, setColMap] = useState<ColumnMap>({ ...DEFAULT_MAP });
  const [step, setStep] = useState<'upload' | 'map' | 'done'>('upload');
  const [preview, setPreview] = useState<Firework[]>([]);
  const [error, setError] = useState('');

  const handleFile = (file: File) => {
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
        if (!json.length) { setError('No data found in file'); return; }
        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRows(json.map(r => {
          const out: Record<string, string> = {};
          hdrs.forEach(h => { out[h] = String(r[h] ?? ''); });
          return out;
        }));
        // Auto-map obvious columns
        const map: ColumnMap = { ...DEFAULT_MAP };
        hdrs.forEach(h => {
          const l = h.toLowerCase();
          if (!map.name && (l === 'name' || l.includes('name'))) map.name = h;
          if (!map.type && (l === 'type' || l.includes('type'))) map.type = h;
          if (!map.cost && (l === 'cost' || l.includes('cost') || l.includes('price'))) map.cost = h;
          if (!map.duration && (l === 'duration' || l.includes('time') || l.includes('sec'))) map.duration = h;
          if (!map.phase && (l === 'phase' || l.includes('phase'))) map.phase = h;
          if (!map.notes && (l === 'notes' || l.includes('note') || l.includes('effect'))) map.notes = h;
          if (!map.rating && (l === 'rating' || l.includes('rating') || l.includes('score'))) map.rating = h;
          if (!map.quantity && (l === 'qty' || l.includes('qty') || l.includes('quantity') || l.includes('amount'))) map.quantity = h;
        });
        setColMap(map);
        setStep('map');
      } catch (err) {
        setError('Failed to parse file. Please use CSV or Excel (.xlsx) format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const buildFireworks = (): Firework[] => {
    return rows
      .filter(r => colMap.name && r[colMap.name]?.trim())
      .map(r => {
        const rawType = colMap.type ? r[colMap.type] : '';
        const rawPhase = colMap.phase ? r[colMap.phase] : '';
        const rawDuration = colMap.duration ? r[colMap.duration] : '';

        let duration = 0;
        const dStr = rawDuration.replace(/[^0-9:]/g, '');
        if (dStr.includes(':')) {
          const [m, s] = dStr.split(':').map(Number);
          duration = (m || 0) * 60 + (s || 0);
        } else {
          duration = parseInt(dStr) || 0;
        }

        return {
          id: uuid(),
          name: colMap.name ? r[colMap.name].trim() : '',
          type: rawType ? guessType(rawType) : 'cake_200g',
          cost: colMap.cost ? parseFloat(r[colMap.cost]) || 0 : 0,
          duration,
          phase: rawPhase ? guessPhase(rawPhase) : 'body',
          notes: colMap.notes ? r[colMap.notes] : '',
          rating: colMap.rating ? parseFloat(r[colMap.rating]) || 0 : 0,
          quantity: colMap.quantity ? parseInt(r[colMap.quantity]) || 1 : 1,
        } as Firework;
      });
  };

  const handlePreview = () => {
    const fws = buildFireworks();
    setPreview(fws);
    setStep('done');
  };

  const handleConfirm = () => {
    onImport(preview);
    onClose();
  };

  const ColumnSelect = ({ field, label }: { field: keyof ColumnMap; label: string }) => (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <select
        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        value={colMap[field]}
        onChange={e => setColMap(m => ({ ...m, [field]: e.target.value }))}
      >
        <option value="">(skip)</option>
        {headers.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl bg-slate-800 rounded-xl shadow-2xl border border-slate-700 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-white">Import Fireworks</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {step === 'upload' && (
            <div
              className="border-2 border-dashed border-slate-600 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={40} className="mx-auto mb-4 text-slate-400" />
              <p className="text-slate-300 font-medium mb-1">Drop your file here or click to browse</p>
              <p className="text-slate-500 text-sm">Supports Excel (.xlsx, .xls) and CSV files</p>
              <a
                href="fireworks-import-template.xlsx"
                download
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 mt-4 text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                ↓ Download blank template
              </a>
              {error && (
                <p className="mt-4 text-red-400 flex items-center justify-center gap-2">
                  <AlertCircle size={16} /> {error}
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-5">
              <p className="text-slate-300 text-sm">
                Found <strong className="text-white">{rows.length}</strong> rows with{' '}
                <strong className="text-white">{headers.length}</strong> columns.
                Map your columns to the app fields:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <ColumnSelect field="name" label="Name *" />
                <ColumnSelect field="type" label="Type" />
                <ColumnSelect field="cost" label="Cost ($)" />
                <ColumnSelect field="duration" label="Duration (seconds or m:ss)" />
                <ColumnSelect field="phase" label="Phase" />
                <ColumnSelect field="notes" label="Notes / Effects" />
                <ColumnSelect field="rating" label="Rating (1–10)" />
                <ColumnSelect field="quantity" label="Quantity" />
              </div>
              <div className="bg-slate-900 rounded-lg p-3 text-xs text-slate-400">
                <p className="font-medium text-slate-300 mb-1">Auto-detection tips:</p>
                <p>Type values like "200g cake", "fountain", "reload" are auto-detected.</p>
                <p>Phase values like "start", "body", "mid-finale", "finale" are auto-detected.</p>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle size={20} />
                <span className="font-medium">Ready to import {preview.length} fireworks</span>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900 sticky top-0">
                    <tr>
                      {['Name', 'Type', 'Cost', 'Duration', 'Phase'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-slate-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {preview.map(fw => (
                      <tr key={fw.id} className="hover:bg-slate-750">
                        <td className="px-3 py-2 text-white">{fw.name}</td>
                        <td className="px-3 py-2 text-slate-300">{FIREWORK_TYPE_LABELS[fw.type]}</td>
                        <td className="px-3 py-2 text-slate-300">${fw.cost}</td>
                        <td className="px-3 py-2 text-slate-300">{fw.duration}s</td>
                        <td className="px-3 py-2 text-slate-300">{PHASE_LABELS[fw.phase]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-700 shrink-0">
          <button onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2 font-medium transition-colors">
            Cancel
          </button>
          {step === 'map' && (
            <button
              onClick={handlePreview}
              disabled={!colMap.name}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-2 font-medium transition-colors"
            >
              Preview Import
            </button>
          )}
          {step === 'done' && (
            <button
              onClick={handleConfirm}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2 font-medium transition-colors"
            >
              Add {preview.length} Fireworks to Inventory
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
