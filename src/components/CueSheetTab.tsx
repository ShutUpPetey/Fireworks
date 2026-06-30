import React, { useState, useMemo } from 'react';
import { Printer, Wand2, AlertCircle, Grid3X3, List, Link2 } from 'lucide-react';
import type { Firework, ShowItem, SimultaneousItem } from '../types';
import {
  LOCATIONS, PHASE_LABELS, PHASE_COLORS,
  FIREWORK_TYPE_LABELS, TYPE_COLORS, formatDuration, formatTime, parseCue,
} from '../types';

interface Props {
  fireworks: Firework[];
  showItems: ShowItem[];
  onUpdate: (item: ShowItem) => void;
  onUpdateSimultaneous: (showItemId: string, sim: SimultaneousItem) => void;
}

type ViewMode = 'list' | 'grid';

export default function CueSheetTab({ fireworks, showItems, onUpdate, onUpdateSimultaneous }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const sortedItems = useMemo(
    () => [...showItems].sort((a, b) => a.startTime - b.startTime),
    [showItems],
  );


  const autoAssignCues = () => {
    if (!confirm('Auto-assign cue numbers? This will overwrite existing cues.')) return;
    let rack1 = 1;
    sortedItems.forEach(item => {
      const newCue = `1.${rack1}`;
      if (rack1 <= 12) {
        onUpdate({ ...item, cue: newCue });
        rack1++;
      }
    });
  };

  // Build grid data: cue grid 10 racks × 12 positions
  const gridData = useMemo(() => {
    const grid: Array<Array<{ item: ShowItem; fw: Firework } | null>> =
      Array.from({ length: 10 }, () => Array(12).fill(null));
    showItems.forEach(item => {
      const parsed = parseCue(item.cue);
      if (!parsed) return;
      const fw = fireworks.find(f => f.id === item.fireworkId);
      if (!fw) return;
      grid[parsed.rack - 1][parsed.pos - 1] = { item, fw };
    });
    return grid;
  }, [showItems, fireworks]);

  const hasCues = sortedItems.some(si => si.cue);

  const CueInput = ({ item }: { item: ShowItem }) => {
    const [val, setVal] = useState(item.cue);
    const valid = !val || !!parseCue(val);
    return (
      <div className="relative">
        <input
          className={`w-20 bg-slate-700 border rounded px-2 py-1 text-sm font-mono text-white focus:outline-none transition-colors ${
            valid ? 'border-slate-600 focus:border-blue-500' : 'border-red-500'
          }`}
          placeholder="1.1"
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => {
            if (valid) onUpdate({ ...item, cue: val });
            else setVal(item.cue);
          }}
        />
        {!valid && (
          <AlertCircle size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-red-400" />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 px-4 md:px-6 py-3 border-b border-slate-700">
        <div className="text-sm text-slate-400">
          <span className="text-white font-semibold">{sortedItems.length}</span> items in show
          {hasCues && (
            <span className="ml-3">
              · <span className="text-white font-semibold">{sortedItems.filter(si => si.cue).length}</span> cued
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border border-slate-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${viewMode === 'list' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
            >
              <List size={14} /> List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${viewMode === 'grid' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
            >
              <Grid3X3 size={14} /> Rack Grid
            </button>
          </div>

          <button
            onClick={autoAssignCues}
            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <Wand2 size={14} /> Auto-Assign Cues
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {showItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <span className="text-5xl mb-4">📋</span>
            <p className="text-lg font-medium mb-2">No show planned yet</p>
            <p className="text-sm">Add fireworks to your show in the Planner tab first</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="p-0">
            {/* Cue format hint */}
            <div className="flex items-center gap-2 px-6 py-2 bg-blue-950/30 border-b border-blue-900/30 text-xs text-blue-400">
              <AlertCircle size={12} />
              Cue format: <strong>rack.position</strong> — rack 1–10, position 1–12 (e.g. 1.1, 3.7, 10.12)
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-900 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium w-10">#</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium w-24">Time</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Firework</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Phase</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Duration</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Cue #</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Location</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedItems.map((item, idx) => {
                  const fw = fireworks.find(f => f.id === item.fireworkId);
                  if (!fw) return null;
                  const pc = PHASE_COLORS[fw.phase];
                  const sims = item.simultaneous ?? [];
                  return (
                    <React.Fragment key={item.id}>
                    <tr className="hover:bg-slate-800/30 group">
                      <td className="px-4 py-2.5 text-slate-500 font-mono" rowSpan={sims.length + 1}>{idx + 1}</td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs" rowSpan={sims.length + 1}>
                        {formatTime(item.startTime)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-white font-medium">{fw.name}</span>
                        {fw.notes && (
                          <p className="text-xs text-slate-500 truncate max-w-48 mt-0.5">{fw.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[fw.type]}`}>
                          {FIREWORK_TYPE_LABELS[fw.type]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${pc.badge}`}>
                          {PHASE_LABELS[fw.phase]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-400 font-mono text-xs">
                        {formatDuration(fw.duration)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <CueInput item={item} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <select
                          className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                          value={item.location}
                          onChange={e => onUpdate({ ...item, location: e.target.value })}
                        >
                          {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-500 focus:outline-none text-xs text-slate-400 placeholder-slate-600 py-0.5"
                          placeholder="show notes…"
                          value={item.showNotes}
                          onChange={e => onUpdate({ ...item, showNotes: e.target.value })}
                        />
                      </td>
                    </tr>
                    {/* Simultaneous sub-rows */}
                    {sims.map(sim => {
                      const sfw = fireworks.find(f => f.id === sim.fireworkId);
                      if (!sfw) return null;
                      const spc = PHASE_COLORS[sfw.phase];
                      return (
                        <tr key={sim.id} className="bg-slate-900/40 border-t border-slate-800/50">
                          <td className="px-4 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <Link2 size={11} className="text-slate-500 shrink-0" />
                              <span className="text-slate-300 text-xs">{sfw.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-1.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[sfw.type]}`}>
                              {FIREWORK_TYPE_LABELS[sfw.type]}
                            </span>
                          </td>
                          <td className="px-4 py-1.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${spc.badge}`}>
                              {PHASE_LABELS[sfw.phase]}
                            </span>
                          </td>
                          <td className="px-4 py-1.5 text-right text-slate-500 font-mono text-xs">
                            {formatDuration(sfw.duration)}
                          </td>
                          <td className="px-4 py-1.5 text-center">
                            <input
                              className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                              placeholder="cue"
                              value={sim.cue}
                              onChange={e => onUpdateSimultaneous(item.id, { ...sim, cue: e.target.value })}
                            />
                          </td>
                          <td className="px-4 py-1.5 text-center">
                            <select
                              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                              value={sim.location}
                              onChange={e => onUpdateSimultaneous(item.id, { ...sim, location: e.target.value })}
                            >
                              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                className="w-14 bg-slate-700 border border-slate-600 rounded px-1.5 py-1 text-xs font-mono text-white text-center focus:outline-none focus:border-blue-500"
                                value={sim.offset}
                                onChange={e => onUpdateSimultaneous(item.id, { ...sim, offset: parseInt(e.target.value) || 0 })}
                              />
                              <span className="text-xs text-slate-500 italic">
                                {sim.offset === 0 ? 'same time' : sim.offset > 0 ? `${sim.offset}s after` : `${Math.abs(sim.offset)}s before`}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Rack Grid view */
          <div className="p-6 overflow-x-auto">
            <div className="mb-4 text-sm text-slate-400">
              Rack grid shows fireworks assigned by cue number.
              Assign cues in List view, then view the physical rack layout here.
            </div>
            <div className="inline-block min-w-full">
              {/* Header row */}
              <div className="flex gap-1 mb-1">
                <div className="w-16 shrink-0" />
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="w-32 text-center text-xs text-slate-500 font-mono">
                    .{i + 1}
                  </div>
                ))}
              </div>
              {/* Grid rows */}
              {gridData.map((row, rackIdx) => (
                <div key={rackIdx} className="flex gap-1 mb-1">
                  <div className="w-16 shrink-0 flex items-center justify-end pr-2">
                    <span className="text-sm font-mono font-bold text-slate-400">{rackIdx + 1}</span>
                  </div>
                  {row.map((cell, posIdx) => (
                    <div
                      key={posIdx}
                      className={`w-32 h-16 rounded border flex flex-col items-center justify-center text-center p-1 transition-colors ${
                        cell
                          ? `${PHASE_COLORS[cell.fw.phase].bg} ${PHASE_COLORS[cell.fw.phase].border} cursor-default`
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      {cell ? (
                        <>
                          <span className="text-xs font-mono font-bold text-slate-200">
                            {rackIdx + 1}.{posIdx + 1}
                          </span>
                          <span className="text-xs text-white font-medium leading-tight mt-0.5 line-clamp-2">
                            {cell.fw.name}
                          </span>
                          <span className="text-xs text-slate-400 font-mono mt-0.5">
                            {cell.item.location}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-700 text-xs font-mono">{rackIdx + 1}.{posIdx + 1}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
