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
  ChevronDown, ChevronUp, Pause, Info,
} from 'lucide-react';
import type { Firework, ShowItem, ShowPhase } from '../types';
import {
  PHASE_LABELS, PHASE_COLORS, FIREWORK_TYPE_LABELS, TYPE_COLORS, formatDuration, formatTime,
} from '../types';

interface Props {
  fireworks: Firework[];
  showItems: ShowItem[];
  onAdd: (item: ShowItem) => void;
  onUpdate: (item: ShowItem) => void;
  onRemove: (id: string) => void;
  onReorder: (items: ShowItem[]) => void;
  onClear: () => void;
}

const PHASE_ORDER: ShowPhase[] = ['start', 'body', 'mid_finale', 'finale', 'other'];

// ── Sortable row component ─────────────────────────────────────────────
interface RowProps {
  item: ShowItem;
  fw: Firework | undefined;
  startTime: number;
  index: number;
  onRemove: (id: string) => void;
  onUpdate: (item: ShowItem) => void;
  maxDuration: number;
}

function SortableRow({ item, fw, startTime, index, onRemove, onUpdate, maxDuration }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [editGap, setEditGap] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (!fw) return null;
  const pc = PHASE_COLORS[fw.phase];
  const barWidth = maxDuration > 0 ? Math.max(2, (fw.duration / maxDuration) * 100) : 0;

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
      <div className={`flex-1 mb-2 rounded-lg border ${pc.border} ${pc.bg} overflow-hidden`}>
        {/* Gap indicator above */}
        {item.gapBefore > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-black/20 border-b border-slate-700/50 text-xs text-slate-400">
            <Pause size={10} />
            <span>{item.gapBefore}s pause before</span>
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-2">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 shrink-0 touch-none"
          >
            <GripVertical size={16} />
          </button>

          {/* Sequence number */}
          <span className="text-slate-500 text-xs font-mono w-6 text-center shrink-0">{index + 1}</span>

          {/* Cue badge */}
          {item.cue && (
            <span className="bg-slate-900/60 text-slate-200 text-xs font-mono px-2 py-0.5 rounded font-bold shrink-0">
              {item.cue}
            </span>
          )}

          {/* Firework info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium text-sm truncate">{fw.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${TYPE_COLORS[fw.type]}`}>
                {FIREWORK_TYPE_LABELS[fw.type]}
              </span>
            </div>
            {/* Duration bar */}
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-slate-900/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${pc.text} bg-current opacity-70`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-400 shrink-0">{formatDuration(fw.duration)}</span>
            </div>
          </div>

          {/* Location */}
          {item.location && (
            <span className="text-xs text-slate-400 font-mono shrink-0">{item.location}</span>
          )}

          {/* Gap button */}
          <button
            onClick={() => setEditGap(g => !g)}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors shrink-0"
            title="Set gap before"
          >
            <Pause size={12} />
          </button>

          {/* Remove */}
          <button
            onClick={() => onRemove(item.id)}
            className="p-1 text-slate-500 hover:text-red-400 transition-colors shrink-0"
            title="Remove from show"
          >
            <X size={14} />
          </button>
        </div>

        {/* Gap editor */}
        {editGap && (
          <div className="flex items-center gap-3 px-3 py-2 bg-black/20 border-t border-slate-700/50">
            <Pause size={12} className="text-slate-400 shrink-0" />
            <label className="text-xs text-slate-400">Pause before (sec):</label>
            <input
              type="number" min="0" max="300"
              className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              value={item.gapBefore}
              onChange={e => onUpdate({ ...item, gapBefore: parseInt(e.target.value) || 0 })}
            />
            <button
              onClick={() => setEditGap(false)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >Done</button>
          </div>
        )}

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
export default function PlannerTab({ fireworks, showItems, onAdd, onUpdate, onRemove, onReorder, onClear }: Props) {
  const [sidebarPhase, setSidebarPhase] = useState<ShowPhase>('start');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Compute running time for each item
  const { timings, totalTime, totalCost } = useMemo(() => {
    let t = 0;
    const timings: number[] = [];
    let cost = 0;
    showItems.forEach(si => {
      t += si.gapBefore;
      timings.push(t);
      const fw = fireworks.find(f => f.id === si.fireworkId);
      if (fw) { t += fw.duration; cost += fw.cost; }
    });
    return { timings, totalTime: t, totalCost: cost };
  }, [showItems, fireworks]);

  const maxDuration = useMemo(() => {
    return Math.max(...showItems.map(si => fireworks.find(f => f.id === si.fireworkId)?.duration ?? 0), 1);
  }, [showItems, fireworks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = showItems.findIndex(i => i.id === active.id);
      const newIndex = showItems.findIndex(i => i.id === over.id);
      onReorder(arrayMove(showItems, oldIndex, newIndex));
    }
  };

  const addToShow = (fw: Firework) => {
    onAdd({
      id: uuid(),
      fireworkId: fw.id,
      cue: '',
      location: 'FC',
      showNotes: '',
      gapBefore: 0,
    });
  };

  const sidebarFws = fireworks.filter(fw => fw.phase === sidebarPhase);
  const usedIds = new Set(showItems.map(si => si.fireworkId));


  return (
    <div className="flex h-full">
      {/* ── Inventory Sidebar ── */}
      <div className={`shrink-0 border-r border-slate-700 flex flex-col transition-all duration-200 ${sidebarOpen ? 'w-64' : 'w-10'}`}>
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="flex items-center justify-between px-3 py-3 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border-b border-slate-700"
        >
          {sidebarOpen && <span className="text-xs font-semibold uppercase tracking-wider">Inventory</span>}
          {sidebarOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} className="rotate-90" />}
        </button>

        {sidebarOpen && (
          <>
            {/* Phase tabs */}
            <div className="flex flex-col border-b border-slate-700">
              {PHASE_ORDER.map(phase => {
                const pc = PHASE_COLORS[phase];
                const count = fireworks.filter(fw => fw.phase === phase).length;
                return (
                  <button
                    key={phase}
                    onClick={() => setSidebarPhase(phase)}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors border-l-2 ${
                      sidebarPhase === phase
                        ? `${pc.text} border-current bg-slate-800`
                        : 'text-slate-400 border-transparent hover:bg-slate-800/50'
                    }`}
                  >
                    <span>{PHASE_LABELS[phase]}</span>
                    <span className="text-slate-500">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Fireworks list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sidebarFws.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6 px-2">
                  No fireworks in this phase. Add them in Inventory.
                </p>
              ) : (
                sidebarFws.map(fw => {
                  const inShow = usedIds.has(fw.id);
                  return (
                    <button
                      key={fw.id}
                      onClick={() => addToShow(fw)}
                      className={`w-full text-left rounded-lg px-3 py-2 transition-colors group ${
                        inShow
                          ? 'bg-slate-800/30 opacity-50 cursor-default'
                          : 'bg-slate-800 hover:bg-slate-700 cursor-pointer'
                      }`}
                      disabled={inShow}
                      title={inShow ? 'Already in show' : `Add ${fw.name} to show`}
                    >
                      <div className="flex items-center gap-2">
                        <Plus size={12} className={`shrink-0 ${inShow ? 'opacity-0' : 'text-slate-500 group-hover:text-blue-400'}`} />
                        <span className="text-xs text-white font-medium truncate">{fw.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 pl-4">
                        <span className="text-xs text-slate-500 font-mono">{formatDuration(fw.duration)}</span>
                        {fw.cost > 0 && (
                          <span className="text-xs text-slate-500">${fw.cost}</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Timeline ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Timeline header */}
        <div className="flex items-center gap-6 px-4 py-3 border-b border-slate-700 bg-slate-800/30">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Clock size={14} />
            <span>Total: <span className="text-white font-mono font-semibold">{formatTime(totalTime)}</span></span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-4xl leading-none">🎆</span>
            <span>Items: <span className="text-white font-semibold">{showItems.length}</span></span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <DollarSign size={14} />
            <span>Cost: <span className="text-emerald-400 font-semibold">${totalCost.toFixed(2)}</span></span>
          </div>

          {/* Phase legend */}
          <div className="flex items-center gap-3 ml-auto">
            {PHASE_ORDER.map(phase => {
              const pc = PHASE_COLORS[phase];
              const count = showItems.filter(si => {
                const fw = fireworks.find(f => f.id === si.fireworkId);
                return fw?.phase === phase;
              }).length;
              if (count === 0) return null;
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
              onClick={() => { if (confirm('Clear the entire show? This cannot be undone.')) onClear(); }}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors ml-2"
            >
              Clear Show
            </button>
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
                  {showItems.map((item, idx) => {
                    const fw = fireworks.find(f => f.id === item.fireworkId);
                    return (
                      <SortableRow
                        key={item.id}
                        item={item}
                        fw={fw}
                        startTime={timings[idx] ?? 0}
                        index={idx}
                        onRemove={onRemove}
                        onUpdate={onUpdate}
                        maxDuration={maxDuration}
                      />
                    );
                  })}
                  {/* End marker */}
                  <div className="flex gap-0 pt-1">
                    <div className="w-16 shrink-0 flex flex-col items-end pr-2">
                      <span className="text-xs font-mono text-slate-400 font-bold">{formatTime(totalTime)}</span>
                    </div>
                    <div className="w-6 shrink-0 flex justify-center">
                      <div className="w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center">
                        <span className="text-[8px]">🎆</span>
                      </div>
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
