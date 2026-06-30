import { useState } from 'react';
import { Plus, Upload, Pencil, Trash2, Star, Search, SlidersHorizontal } from 'lucide-react';
import type { Firework, FireworkType, ShowPhase } from '../types';
import {
  FIREWORK_TYPE_LABELS, PHASE_LABELS, PHASE_COLORS, TYPE_COLORS, formatDuration
} from '../types';
import FireworkModal from './FireworkModal';
import ImportModal from './ImportModal';

interface Props {
  fireworks: Firework[];
  onAdd: (fw: Firework) => void;
  onUpdate: (fw: Firework) => void;
  onDelete: (id: string) => void;
  onImport: (fws: Firework[]) => void;
}

export default function InventoryTab({ fireworks, onAdd, onUpdate, onDelete, onImport }: Props) {
  const [modalFw, setModalFw] = useState<Firework | null | undefined>(undefined);
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPhase, setFilterPhase] = useState<ShowPhase | ''>('');
  const [filterType, setFilterType] = useState<FireworkType | ''>('');
  const [sortBy, setSortBy] = useState<'name' | 'phase' | 'cost' | 'duration' | 'rating'>('phase');

  const filtered = fireworks
    .filter(fw => {
      if (search && !fw.name.toLowerCase().includes(search.toLowerCase()) && !fw.notes.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterPhase && fw.phase !== filterPhase) return false;
      if (filterType && fw.type !== filterType) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'phase') {
        const order: ShowPhase[] = ['start', 'body', 'mid_finale', 'finale', 'other'];
        return order.indexOf(a.phase) - order.indexOf(b.phase) || a.name.localeCompare(b.name);
      }
      if (sortBy === 'cost') return b.cost - a.cost;
      if (sortBy === 'duration') return b.duration - a.duration;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });

  const totalCost = fireworks.reduce((s, fw) => s + fw.cost * fw.quantity, 0);
  const totalItems = fireworks.reduce((s, fw) => s + fw.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Stats Bar */}
      <div className="flex gap-6 px-6 py-3 bg-slate-800/50 border-b border-slate-700 text-sm">
        <span className="text-slate-400">
          Total items: <span className="text-white font-semibold">{totalItems}</span>
        </span>
        <span className="text-slate-400">
          Unique: <span className="text-white font-semibold">{fireworks.length}</span>
        </span>
        <span className="text-slate-400">
          Total cost: <span className="text-emerald-400 font-semibold">${totalCost.toFixed(2)}</span>
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 px-4 md:px-6 py-3 border-b border-slate-700">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            placeholder="Search fireworks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          value={filterPhase}
          onChange={e => setFilterPhase(e.target.value as ShowPhase | '')}
        >
          <option value="">All Phases</option>
          {(Object.entries(PHASE_LABELS) as [ShowPhase, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          value={filterType}
          onChange={e => setFilterType(e.target.value as FireworkType | '')}
        >
          <option value="">All Types</option>
          {(Object.entries(FIREWORK_TYPE_LABELS) as [FireworkType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <SlidersHorizontal size={16} className="text-slate-400" />
          <select
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="phase">Sort: Phase</option>
            <option value="name">Sort: Name</option>
            <option value="cost">Sort: Cost ↓</option>
            <option value="duration">Sort: Duration ↓</option>
            <option value="rating">Sort: Rating ↓</option>
          </select>
        </div>

        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Upload size={16} /> Import
        </button>
        <button
          onClick={() => setModalFw(null)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Firework
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {fireworks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <span className="text-5xl mb-4">🎆</span>
            <p className="text-lg font-medium mb-2">No fireworks yet</p>
            <p className="text-sm">Add fireworks manually or import from your spreadsheet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-900 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 text-slate-400 font-medium w-8">#</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Phase</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Cost</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Qty</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Duration</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Rating</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((fw, i) => {
                const pc = PHASE_COLORS[fw.phase];
                return (
                  <tr key={fw.id} className="hover:bg-slate-800/50 group">
                    <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-white font-medium">{fw.name}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[fw.type]}`}>
                        {FIREWORK_TYPE_LABELS[fw.type]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${pc.badge}`}>
                        {PHASE_LABELS[fw.phase]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-300">
                      {fw.cost > 0 ? `$${fw.cost.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{fw.quantity}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300 font-mono">
                      {formatDuration(fw.duration)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {fw.rating > 0 ? (
                        <span className="flex items-center justify-end gap-1 text-amber-400">
                          <Star size={12} fill="currentColor" />
                          <span className="font-mono text-xs">{fw.rating}</span>
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs max-w-48 truncate">
                      {fw.notes || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setModalFw(fw)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${fw.name}"?`)) onDelete(fw.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Empty filtered state */}
      {fireworks.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No fireworks match your filters
        </div>
      )}

      {modalFw !== undefined && (
        <FireworkModal
          initial={modalFw}
          onSave={modalFw ? onUpdate : onAdd}
          onClose={() => setModalFw(undefined)}
        />
      )}
      {showImport && (
        <ImportModal onImport={onImport} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
