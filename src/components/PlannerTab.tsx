import { useState, useMemo } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuid } from 'uuid';
import {
  GripVertical, Plus, X, Clock, DollarSign,
  ChevronDown, Pause, Info, Link2, Unlink,
} from 'lucide-react';
import type { Firework, ShowItem, SimultaneousItem } from '../types';
import {
  PHASE_LABELS, PHASE_COLORS, FIREWORK_TYPE_LABELS, TYPE_COLORS,
  LOCATIONS, formatDuration, formatTime,
} from '../types';

interface Props {
  fireworks: Firework[];
  showItems: ShowItem[];
  overlapSeconds: number;
  onAdd: (item: ShowItem) => void;
  onAddMany: (items: ShowItem[]) => void;
  onUpdate: (item: ShowItem) => void;
  onRemove: (id: string) => void;
  onReorder: (items: ShowItem[]) => void;
  onClear: () => void;
  onSetOverlap: (s: number) => void;
  onAddSimultaneous: (showItemId: string, fw: Firework) => void;
  onUpdateSimultaneous: (showItemId: string, sim: SimultaneousItem) => void;
  onRemoveSimultaneous: (showItemId: string, simId: string) => void;
}

// ── Simultaneous sub-card ──────────────────────────────────────────────
function SimCard({
  sim, fw, showItemId,
  onUpdate, onRemove,
}: {
  sim: SimultaneousItem;
  fw: Firework | undefined;
  showItemId: string;
  onUpdate: (showItemId: string, s: SimultaneousItem) => void;
  onRemove: (showItemId: string, simId: string) => void;
}) {
  if (!fw) return null;
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 border-t border-black/20 bg-black/10`}>
      <Link2 size={11} className="text-slate-400 shrink-0" />
      <span className="text-xs text-white font-medium truncate flex-1">{fw.name}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${TYPE_COLORS[fw.type]}`}>
        {FIREWORK_TYPE_LABELS[fw.type]}
      </span>
      <span className="text-xs font-mono text-slate-400 shrink-0">{formatDuration(fw.duration)}</span>
      {/* Cue */}
      <input
        className="w-16 bg-slate-900/60 border border-slate-600 rounded px-1.5 py-0.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
        placeholder="cue"
        value={sim.cue}
        onChange={e => onUpdate(showItemId, { ...sim, cue: e.target.value })}
      />
      {/* Location */}
      <select
        className="bg-slate-900/60 border border-slate-600 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
        value={sim.location}
        onChange={e => onUpdate(showItemId, { ...sim, location: e.target.value })}
      >
        {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
      </select>
      <button onClick={() => onRemove(showItemId, sim.id)} className="text-slate-500 hover:text-red-400 p-0.5">
        <X size={12} />
      </button>
    </div>
  );
}

// ── Sortable row ───────────────────────────────────────────────────────
interface RowProps {
  item: ShowItem;
  fw: Firework | undefined;
  startTime: number;
  effectiveDuration: number;
  index: number;
  fireworks: Firework[];
  onRemove: (id: string) => void;
  onUpdate: (item: ShowItem) => void;
  onUpdateSimultaneous: (showItemId: string, sim: SimultaneousItem) => void;
  onRemoveSimultaneous: (showItemId: string, simId: string) => void;
  maxDuration: number;
  pairingFor: string | null;
  onTogglePairing: (id: string | null) => void;
}

function SortableRow({
  item, fw, startTime, effectiveDuration, index, fireworks,
  onRemove, onUpdate,
  onUpdateSimultaneous, onRemoveSimultaneous,
  maxDuration, pairingFor, onTogglePairing,
}: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [editGap, setEditGap] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (!fw) return null;
  const pc = PHASE_COLORS[fw.phase];
  const barWidth = maxDuration > 0 ? Math.max(2, (effectiveDuration / maxDuration) * 100) : 0;
  const isPairing = pairingFor === item.id;

  return (
    <div ref={setNodeRef} style={style} className={`flex gap-0 ${isDragging ? 'z-50' : ''}`}>
      {/* Time ruler */}
      <div className="w-16 shrink-0 flex flex-col items-end pr-2 pt-3">
        <span className="text-xs font-mono text-slate-500">{formatTime(startTime)}</span>
      </div>

      {/* Timeline connector */}
      <div className="w-6 shrink-0 flex flex-col items-center">
        <div className={`w-2 h-2 rounded-full mt-4 shrink-0 ${pc.text} bg-current`} />
        <div className="w-px flex-1 bg-slate-700 mt-0.5" />
      </div>

      {/* Card */}
      <div className={`flex-1 mb-2 rounded-lg border ${pc.border} ${pc.bg} overflow-hidden ${isPairing ? 'ring-2 ring-blue-400' : ''}`}>
        {item.gapBefore > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-black/20 border-b border-slate-700/50 text-xs text-slate-400">
            <Pause size={10} />
            <span>{item.gapBefore}s pause before</span>
          </div>
        )}

        {/* Main row */}
        <div className="flex items-center gap-2 px-3 py-2">
          <button {...attributes} {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 shrink-0 touch-none">
            <GripVertical size={16} />
          </button>

          <span className="text-slate-500 text-xs font-mono w-6 text-center shrink-0">{index + 1}</span>

          {item.cue && (
            <span className="bg-slate-900/60 text-slate-200 text-xs font-mono px-2 py-0.5 rounded font-bold shrink-0">
              {item.cue}
            </span>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium text-sm truncate">{fw.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${TYPE_COLORS[fw.type]}`}>
                {FIREWORK_TYPE_LABELS[fw.type]}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-slate-900/50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${pc.text} bg-current opacity-70`}
                  style={{ width: `${barWidth}%` }} />
              </div>
              <span className="text-xs font-mono text-slate-400 shrink-0">{formatDuration(effectiveDuration)}</span>
            </div>
          </div>

          {item.location && (
            <span className="text-xs text-slate-400 font-mono shrink-0">{item.location}</span>
          )}

          {/* Pair button */}
          <button
            onClick={() => onTogglePairing(isPairing ? null : item.id)}
            className={`p-1 transition-colors shrink-0 ${isPairing ? 'text-blue-400' : 'text-slate-500 hover:text-blue-400'}`}
            title={isPairing ? 'Cancel pairing — click a firework in the sidebar to add it as simultaneous' : 'Add simultaneous firework'}
          >
            <Link2 size={13} />
          </button>

          {/* Gap */}
          <button onClick={() => setEditGap(g => !g)}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors shrink-0" title="Set gap before">
            <Pause size={12} />
          </button>

          {/* Remove */}
          <button onClick={() => onRemove(item.id)}
            className="p-1 text-slate-500 hover:text-red-400 transition-colors shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Gap editor */}
        {editGap && (
          <div className="flex items-center gap-3 px-3 py-2 bg-black/20 border-t border-slate-700/50">
            <Pause size={12} className="text-slate-400 shrink-0" />
            <label className="text-xs text-slate-400">Pause before (sec):</label>
            <input type="number" min="0" max="300"
              className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              value={item.gapBefore}
              onChange={e => onUpdate({ ...item, gapBefore: parseInt(e.target.value) || 0 })} />
            <button onClick={() => setEditGap(false)} className="text-xs text-blue-400 hover:text-blue-300">Done</button>
          </div>
        )}

        {/* Pairing hint */}
        {isPairing && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/30 border-t border-blue-700/40 text-xs text-blue-300">
            <Link2 size={11} className="shrink-0" />
            Click any firework in the sidebar to fire it simultaneously with <strong className="text-white">{fw.name}</strong>
          </div>
        )}

        {/* Simultaneous sub-cards */}
        {(item.simultaneous ?? []).map(sim => (
          <SimCard
            key={sim.id}
            sim={sim}
            fw={fireworks.find(f => f.id === sim.fireworkId)}
            showItemId={item.id}
            onUpdate={onUpdateSimultaneous}
            onRemove={onRemoveSimultaneous}
          />
        ))}

        {fw.notes && (
          <div className="px-3 pb-2 flex items-start gap-1.5">
            <Info size={11} className="text-slate-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">{fw.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main planner tab ───────────────────────────────────────────────────
const PHASE_ORDER = ['start', 'body', 'mid_finale', 'finale', 'other'] as const;

export default function PlannerTab({
  fireworks, showItems, overlapSeconds,
  onAdd, onAddMany, onUpdate, onRemove, onReorder, onClear,
  onSetOverlap, onAddSimultaneous, onUpdateSimultaneous, onRemoveSimultaneous,
}: Props) {
  const [sidebarPhase, setSidebarPhase] = useState<typeof PHASE_ORDER[number]>('start');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [pairingFor, setPairingFor] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const getQty = (fwId: string) => qtys[fwId] ?? 1;
  const setQty = (fwId: string, v: number) => setQtys(q => ({ ...q, [fwId]: Math.max(1, v) }));

  // Compute effective duration per item (max of primary + all simultaneous)
  const effectiveDurations = useMemo(() =>
    showItems.map(item => {
      const primary = fireworks.find(f => f.id === item.fireworkId)?.duration ?? 0;
      const simMax = (item.simultaneous ?? [])
        .map(s => fireworks.find(f => f.id === s.fireworkId)?.duration ?? 0)
        .reduce((a, b) => Math.max(a, b), 0);
      return Math.max(primary, simMax);
    }),
  [showItems, fireworks]);

  // Compute running time for each item, accounting for overlap
  const { timings, totalTime, totalCost } = useMemo(() => {
    let t = 0;
    const timings: number[] = [];
    let cost = 0;
    showItems.forEach((si, idx) => {
      t += si.gapBefore;
      timings.push(t);
      const fw = fireworks.find(f => f.id === si.fireworkId);
      if (fw) cost += fw.cost;
      const dur = effectiveDurations[idx] ?? 0;
      t += Math.max(0, dur - overlapSeconds);
    });
    return { timings, totalTime: t, totalCost: cost };
  }, [showItems, fireworks, effectiveDurations, overlapSeconds]);

  const maxDuration = useMemo(() =>
    Math.max(...effectiveDurations, 1),
  [effectiveDurations]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = showItems.findIndex(i => i.id === active.id);
      const newIdx = showItems.findIndex(i => i.id === over.id);
      onReorder(arrayMove(showItems, oldIdx, newIdx));
    }
  };

  const makeShowItem = (fw: Firework): ShowItem => ({
    id: uuid(), fireworkId: fw.id, cue: '', location: 'FC',
    showNotes: '', gapBefore: 0, simultaneous: [],
  });

  const handleSidebarClick = (fw: Firework) => {
    // If in pairing mode, add as simultaneous to the target item
    if (pairingFor) {
      onAddSimultaneous(pairingFor, fw);
      setPairingFor(null);
      return;
    }
    const qty = getQty(fw.id);
    if (qty === 1) {
      onAdd(makeShowItem(fw));
    } else {
      onAddMany(Array.from({ length: qty }, () => makeShowItem(fw)));
    }
  };

  const sidebarFws = fireworks.filter(fw => fw.phase === sidebarPhase);

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* ── Inventory Sidebar ── */}
      <div className={`shrink-0 border-b md:border-b-0 md:border-r border-slate-700 flex flex-col overflow-hidden transition-all duration-200 ${
        sidebarOpen ? 'h-72 md:h-auto md:w-72' : 'h-12 md:h-auto md:w-10'
      }`}>
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="flex items-center justify-between px-3 py-3 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border-b border-slate-700"
        >
          {sidebarOpen && <span className="text-xs font-semibold uppercase tracking-wider">Inventory</span>}
          <ChevronDown size={14} className={`transition-transform ${sidebarOpen ? '' : '-rotate-90'}`} />
        </button>

        {sidebarOpen && (
          <>
            {/* Phase tabs */}
            <div className="flex flex-col border-b border-slate-700">
              {PHASE_ORDER.map(phase => {
                const pc = PHASE_COLORS[phase];
                const count = fireworks.filter(fw => fw.phase === phase).length;
                return (
                  <button key={phase} onClick={() => setSidebarPhase(phase)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors border-l-2 ${
                      sidebarPhase === phase
                        ? `${pc.text} border-current bg-slate-800`
                        : 'text-slate-400 border-transparent hover:bg-slate-800/50'
                    }`}>
                    <span>{PHASE_LABELS[phase]}</span>
                    <span className="text-slate-500">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Fireworks list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {pairingFor && (
                <div className="text-xs text-blue-300 bg-blue-900/30 rounded px-2 py-1.5 mb-2 flex items-center gap-1.5">
                  <Link2 size={11} className="shrink-0" />
                  Click a firework to pair it
                  <button onClick={() => setPairingFor(null)} className="ml-auto text-blue-400 hover:text-blue-200">
                    <X size={12} />
                  </button>
                </div>
              )}

              {sidebarFws.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6 px-2">
                  No fireworks in this phase. Add them in Inventory.
                </p>
              ) : (
                sidebarFws.map(fw => (
                  <div key={fw.id} className="rounded-lg bg-slate-800 overflow-hidden">
                    <button
                      onClick={() => handleSidebarClick(fw)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <Plus size={12} className="shrink-0 text-slate-500 group-hover:text-blue-400" />
                        <span className="text-xs text-white font-medium truncate flex-1">{fw.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 pl-4">
                        <span className="text-xs text-slate-500 font-mono">{formatDuration(fw.duration)}</span>
                        {fw.cost > 0 && <span className="text-xs text-slate-500">${fw.cost}</span>}
                      </div>
                    </button>

                    {/* Quantity stepper */}
                    {!pairingFor && (
                      <div className="flex items-center gap-1 px-3 pb-2">
                        <span className="text-xs text-slate-500 mr-1">Qty:</span>
                        <button
                          onClick={() => setQty(fw.id, getQty(fw.id) - 1)}
                          className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs flex items-center justify-center leading-none"
                        >−</button>
                        <input
                          type="number" min="1" max="20"
                          className="w-10 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-xs text-white text-center focus:outline-none focus:border-blue-500"
                          value={getQty(fw.id)}
                          onChange={e => setQty(fw.id, parseInt(e.target.value) || 1)}
                          onClick={e => e.stopPropagation()}
                        />
                        <button
                          onClick={() => setQty(fw.id, getQty(fw.id) + 1)}
                          className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs flex items-center justify-center leading-none"
                        >+</button>
                        {getQty(fw.id) > 1 && (
                          <span className="text-xs text-blue-400 ml-1">×{getQty(fw.id)}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Timeline ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-700 bg-slate-800/30 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Clock size={14} />
            <span>Total: <span className="text-white font-mono font-semibold">{formatTime(totalTime)}</span></span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>Items: <span className="text-white font-semibold">{showItems.length}</span></span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <DollarSign size={14} />
            <span>Cost: <span className="text-emerald-400 font-semibold">${totalCost.toFixed(2)}</span></span>
          </div>

          {/* Overlap control */}
          <div className="flex items-center gap-2 ml-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
            <Unlink size={13} className="text-slate-400 shrink-0" />
            <label className="text-xs text-slate-400 whitespace-nowrap">Overlap:</label>
            <input
              type="number" min="0" max="60"
              className="w-14 bg-slate-700 border border-slate-600 rounded px-2 py-0.5 text-xs text-white font-mono text-center focus:outline-none focus:border-blue-500"
              value={overlapSeconds}
              onChange={e => onSetOverlap(Math.max(0, parseInt(e.target.value) || 0))}
            />
            <span className="text-xs text-slate-500">sec early</span>
          </div>

          {/* Phase legend */}
          <div className="flex items-center gap-3 ml-auto flex-wrap">
            {PHASE_ORDER.map(phase => {
              const pc = PHASE_COLORS[phase];
              const count = showItems.filter(si => fireworks.find(f => f.id === si.fireworkId)?.phase === phase).length;
              if (!count) return null;
              return (
                <span key={phase} className={`text-xs flex items-center gap-1 ${pc.text}`}>
                  <span className="w-2 h-2 rounded-full bg-current inline-block" />
                  {PHASE_LABELS[phase]} ({count})
                </span>
              );
            })}
          </div>

          {showItems.length > 0 && (
            <button
              onClick={() => { if (confirm('Clear the entire show?')) onClear(); }}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors"
            >Clear Show</button>
          )}
        </div>

        {/* Timeline body */}
        <div className="flex-1 overflow-y-auto p-4">
          {showItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <span className="text-5xl mb-4">🎇</span>
              <p className="text-lg font-medium mb-2">Show is empty</p>
              <p className="text-sm">Click fireworks in the sidebar to add them to the show</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={showItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-0">
                  {showItems.map((item, idx) => (
                    <SortableRow
                      key={item.id}
                      item={item}
                      fw={fireworks.find(f => f.id === item.fireworkId)}
                      startTime={timings[idx] ?? 0}
                      effectiveDuration={effectiveDurations[idx] ?? 0}
                      index={idx}
                      fireworks={fireworks}
                      onRemove={onRemove}
                      onUpdate={onUpdate}
                      onUpdateSimultaneous={onUpdateSimultaneous}
                      onRemoveSimultaneous={onRemoveSimultaneous}
                      maxDuration={maxDuration}
                      pairingFor={pairingFor}
                      onTogglePairing={setPairingFor}
                    />
                  ))}
                  {/* End marker */}
                  <div className="flex gap-0 pt-1">
                    <div className="w-16 shrink-0 flex items-end justify-end pr-2">
                      <span className="text-xs font-mono text-amber-400 font-bold">{formatTime(totalTime)}</span>
                    </div>
                    <div className="w-6 shrink-0 flex justify-center">
                      <div className="w-3 h-3 rounded-full bg-amber-500 mt-0.5" />
                    </div>
                    <div className="flex-1 pl-2">
                      <span className="text-xs text-amber-400 font-semibold">SHOW END</span>
                    </div>
                  </div>
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
