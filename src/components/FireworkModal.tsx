import { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { X } from 'lucide-react';
import type { Firework, FireworkType, ShowPhase } from '../types';
import { FIREWORK_TYPE_LABELS, PHASE_LABELS } from '../types';

interface Props {
  initial?: Firework | null;
  onSave: (fw: Firework) => void;
  onClose: () => void;
}

const EMPTY: Omit<Firework, 'id'> = {
  name: '', type: 'cake_200g', cost: 0, duration: 30,
  phase: 'body', notes: '', rating: 0, quantity: 1,
};

export default function FireworkModal({ initial, onSave, onClose }: Props) {
  const [form, setForm] = useState<Omit<Firework, 'id'>>(initial ? { ...initial } : { ...EMPTY });

  useEffect(() => {
    setForm(initial ? { ...initial } : { ...EMPTY });
  }, [initial]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ id: initial?.id ?? uuid(), ...form });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg bg-slate-800 rounded-xl shadow-2xl border border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">
            {initial ? 'Edit Firework' : 'Add Firework'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
            <input
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Bling Bling, Alien Disco"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
              <select
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                value={form.type}
                onChange={e => set('type', e.target.value as FireworkType)}
              >
                {(Object.entries(FIREWORK_TYPE_LABELS) as [FireworkType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Phase</label>
              <select
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                value={form.phase}
                onChange={e => set('phase', e.target.value as ShowPhase)}
              >
                {(Object.entries(PHASE_LABELS) as [ShowPhase, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Cost ($)</label>
              <input
                type="number" min="0" step="0.01"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                value={form.cost}
                onChange={e => set('cost', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Duration (sec)</label>
              <input
                type="number" min="0"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                value={form.duration}
                onChange={e => set('duration', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Qty</label>
              <input
                type="number" min="1"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                value={form.quantity}
                onChange={e => set('quantity', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Rating (0–10)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range" min="0" max="10" step="0.5"
                className="flex-1"
                value={form.rating}
                onChange={e => set('rating', parseFloat(e.target.value))}
              />
              <span className="text-white font-mono w-8 text-right">
                {form.rating === 0 ? '—' : form.rating}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Notes / Effects</label>
            <textarea
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="e.g. mines and crackle, angled boards help, crowd favorite"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 font-medium transition-colors"
            >
              {initial ? 'Save Changes' : 'Add Firework'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
