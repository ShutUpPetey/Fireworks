import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { DragEndEvent, DragStartEvent, DragOverEvent, DragMoveEvent } from '@dnd-kit/core';
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, useDraggable, useDroppable, DragOverlay,
} from '@dnd-kit/core';
import { v4 as uuid } from 'uuid';
import {
  GripVertical, Plus, X, Clock, DollarSign,
  ChevronDown, Info, Link2, List, BarChart2, Pencil, Star,
} from 'lucide-react';
import type { Firework, ShowItem, SimultaneousItem } from '../types';
import {
  PHASE_LABELS, PHASE_COLORS, FIREWORK_TYPE_LABELS, TYPE_COLORS,
  LOCATIONS, formatDuration, formatTime,
} from '../types';
import GanttView from './GanttView';

interface Props {
  fireworks: Firework[];
  showItems: ShowItem[];
  onAdd: (item: ShowItem) => void;
  onAddMany: (items: ShowItem[]) => void;
  onUpdate: (item: ShowItem) => void;
  onUpdateFirework: (fw: Firework) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onAddSimultaneous: (showItemId: string, fw: Firework) => void;
  onUpdateSimultaneous: (showItemId: string, sim: SimultaneousItem) => void;
  onRemoveSimultaneous: (showItemId: string, simId: string) => void;
}

type DropHint = { itemId: string; position: 'before' | 'after' | 'on' } | null;

const FIREWORK_TYPES = Object.entries(FIREWORK_TYPE_LABELS) as [import('../types').FireworkType, string][];
const PHASE_ORDER = ['start', 'body', 'mid_finale', 'finale', 'other'] as const;

function InsertLine() {
  return (
    <div className="flex items-center pointer-events-none relative z-20 -my-px">
      <div className="shrink-0" style={{ width: 88 }} />
      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 -ml-1" />
      <div className="flex-1 h-0.5 bg-blue-500 rounded-full" />
    </div>
  );
}

// ── Main show-item edit modal ──────────────────────────────────────────
function EditItemModal({ item, fw, onUpdate, onUpdateFirework, onClose }: {
  item: ShowItem;
  fw: Firework;
  onUpdate: (item: ShowItem) => void;
  onUpdateFirework: (fw: Firework) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(item);
  const [fwDraft, setFwDraft] = useState(fw);

  const save = () => {
    onUpdate(draft);
    onUpdateFirework(fwDraft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-slate-800 rounded-t-2xl md:rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div>
            <h3 className="text-white font-semibold text-base">Edit Cue</h3>
            <p className="text-xs text-slate-400 mt-0.5">Changes apply to this cue and the inventory item</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 -mr-1"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-3 space-y-4">
          {/* Cue settings */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Cue Settings</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Start time
                  <span className="ml-2 text-slate-500 font-mono">{formatTime(draft.startTime)}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" step="1"
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                    value={draft.startTime}
                    onChange={e => setDraft(d => ({ ...d, startTime: Math.max(0, parseInt(e.target.value) || 0) }))}
                  />
                  <span className="text-xs text-slate-500 shrink-0">seconds</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Cue #</label>
                  <input
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                    placeholder="1.1" value={draft.cue}
                    onChange={e => setDraft(d => ({ ...d, cue: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Location</label>
                  <select
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={draft.location} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))}
                  >
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Show notes</label>
                <input
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="Notes for the operator…" value={draft.showNotes}
                  onChange={e => setDraft(d => ({ ...d, showNotes: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700" />

          {/* Firework details */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Firework Details</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Name</label>
                <input
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="Firework name" value={fwDraft.name}
                  onChange={e => setFwDraft(d => ({ ...d, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Type</label>
                  <select
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={fwDraft.type} onChange={e => setFwDraft(d => ({ ...d, type: e.target.value as Firework['type'] }))}
                  >
                    {FIREWORK_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Show phase</label>
                  <select
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    value={fwDraft.phase} onChange={e => setFwDraft(d => ({ ...d, phase: e.target.value as Firework['phase'] }))}
                  >
                    {PHASE_ORDER.map(ph => <option key={ph} value={ph}>{PHASE_LABELS[ph]}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Duration (sec)</label>
                  <input
                    type="number" min="1" step="1"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                    value={fwDraft.duration}
                    onChange={e => setFwDraft(d => ({ ...d, duration: Math.max(1, parseInt(e.target.value) || 1) }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Cost ($)</label>
                  <input
                    type="number" min="0" step="0.01"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                    value={fwDraft.cost}
                    onChange={e => setFwDraft(d => ({ ...d, cost: Math.max(0, parseFloat(e.target.value) || 0) }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Rating</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" min="0" max="10" step="1"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                      value={fwDraft.rating}
                      onChange={e => setFwDraft(d => ({ ...d, rating: Math.max(0, Math.min(10, parseInt(e.target.value) || 0)) }))}
                    />
                    <Star size={13} className="text-amber-400 shrink-0" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Firework notes</label>
                <input
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="Color effects, height, etc." value={fwDraft.notes}
                  onChange={e => setFwDraft(d => ({ ...d, notes: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-700 shrink-0">
          <button onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-3 text-sm font-medium transition-colors">Cancel</button>
          <button onClick={save} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 text-sm font-medium transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Linked cue edit modal ──────────────────────────────────────────────
function SimEditModal({ sim, fw, showItemId, parentStartTime, parentDuration, onUpdate, onClose }: {
  sim: SimultaneousItem;
  fw: Firework;
  showItemId: string;
  parentStartTime: number;
  parentDuration: number;
  onUpdate: (showItemId: string, sim: SimultaneousItem) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(sim);
  const absoluteFireTime = parentStartTime + draft.offset;
  const alignEndOffset = Math.max(0, parentDuration - fw.duration);

  const save = () => { onUpdate(showItemId, draft); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-800 rounded-t-2xl md:rounded-2xl border border-slate-700 shadow-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-base">{fw.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Linked cue · {FIREWORK_TYPE_LABELS[fw.type]} · {formatDuration(fw.duration)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 -mt-1 -mr-1"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Fire time
              <span className="ml-2 text-slate-500 font-mono">{formatTime(absoluteFireTime)}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min="0" step="1"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                value={absoluteFireTime}
                onChange={e => {
                  const abs = Math.max(0, parseInt(e.target.value) || 0);
                  setDraft(d => ({ ...d, offset: abs - parentStartTime }));
                }}
              />
              <span className="text-xs text-slate-500 shrink-0">seconds</span>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setDraft(d => ({ ...d, offset: 0 }))}
                className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${draft.offset === 0 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
              >Same time as parent</button>
              <button
                onClick={() => setDraft(d => ({ ...d, offset: alignEndOffset }))}
                className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${draft.offset === alignEndOffset ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
              >Align end</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Cue #</label>
              <input
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                placeholder="cue" value={draft.cue}
                onChange={e => setDraft(d => ({ ...d, cue: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Location</label>
              <select
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                value={draft.location} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))}
              >
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-3 text-sm font-medium transition-colors">Cancel</button>
          <button onClick={save} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 text-sm font-medium transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Linked cue display card ────────────────────────────────────────────
function SimCard({
  sim, fw, showItemId, parentStartTime, parentDuration, onUpdate, onEdit, onRemove,
}: {
  sim: SimultaneousItem;
  fw: Firework | undefined;
  showItemId: string;
  parentStartTime: number;
  parentDuration: number;
  onUpdate: (showItemId: string, sim: SimultaneousItem) => void;
  onEdit: () => void;
  onRemove: (showItemId: string, simId: string) => void;
}) {
  if (!fw) return null;
  const absoluteFireTime = parentStartTime + sim.offset;
  const alignEndOffset = Math.max(0, parentDuration - fw.duration);

  return (
    <div className="border-t border-black/20 bg-black/10">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <Link2 size={11} className="text-slate-400 shrink-0" />
        <span className="text-xs text-white font-medium truncate flex-1">{fw.name}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${TYPE_COLORS[fw.type]}`}>{FIREWORK_TYPE_LABELS[fw.type]}</span>
        <span className="text-xs font-mono text-slate-400 shrink-0">{formatDuration(fw.duration)}</span>
        <input
          className="w-14 bg-slate-900/50 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
          placeholder="cue"
          value={sim.cue}
          onChange={e => onUpdate(showItemId, { ...sim, cue: e.target.value })}
        />
        <select
          className="bg-slate-900/50 border border-slate-700 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500"
          value={sim.location}
          onChange={e => onUpdate(showItemId, { ...sim, location: e.target.value })}
        >
          {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <button onClick={onEdit} className="p-1 text-slate-500 hover:text-blue-400 transition-colors shrink-0" title="Edit linked cue">
          <Pencil size={12} />
        </button>
        <button onClick={() => onRemove(showItemId, sim.id)} className="p-1 text-slate-500 hover:text-red-400 transition-colors shrink-0">
          <X size={12} />
        </button>
      </div>
      <div className="flex items-center gap-1.5 px-3 pb-1.5 pl-7">
        <Clock size={9} className="text-slate-500 shrink-0" />
        <input
          type="number" min="0" step="1"
          className="w-14 bg-slate-900/50 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-white text-center focus:outline-none focus:border-blue-500"
          value={absoluteFireTime}
          onChange={e => {
            const abs = Math.max(0, parseInt(e.target.value) || 0);
            onUpdate(showItemId, { ...sim, offset: abs - parentStartTime });
          }}
        />
        <span className="text-xs text-slate-500">sec · <span className="font-mono text-blue-300">{formatTime(absoluteFireTime)}</span></span>
        <button
          onClick={() => onUpdate(showItemId, { ...sim, offset: 0 })}
          className={`text-xs px-1.5 py-0.5 rounded transition-colors ${sim.offset === 0 ? 'bg-blue-700 text-white' : 'bg-slate-900/50 text-slate-500 hover:text-slate-300'}`}
        >Same</button>
        <button
          onClick={() => onUpdate(showItemId, { ...sim, offset: alignEndOffset })}
          className={`text-xs px-1.5 py-0.5 rounded transition-colors ${sim.offset === alignEndOffset && alignEndOffset !== 0 ? 'bg-blue-700 text-white' : 'bg-slate-900/50 text-slate-500 hover:text-slate-300'}`}
        >+End</button>
      </div>
    </div>
  );
}

// ── Draggable sidebar card ─────────────────────────────────────────────
function DraggableFireworkCard({ fw, qty, onSetQty, onClickAdd }: {
  fw: Firework;
  qty: number;
  onSetQty: (v: number) => void;
  onClickAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-${fw.id}`,
    data: { type: 'sidebar', fireworkId: fw.id },
  });

  return (
    <div ref={setNodeRef} className={`rounded-lg bg-slate-800 overflow-hidden transition-opacity ${isDragging ? 'opacity-40' : ''}`}>
      <div className="flex items-center">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing px-2 py-3.5 text-slate-500 hover:text-slate-300 touch-none shrink-0" title="Drag to add">
          <GripVertical size={15} />
        </div>
        <button onClick={onClickAdd} className="flex-1 text-left py-2 pr-3 hover:bg-slate-700 transition-colors group">
          <div className="flex items-center gap-2">
            <Plus size={12} className="shrink-0 text-slate-500 group-hover:text-blue-400" />
            <span className="text-xs text-white font-medium truncate flex-1">{fw.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 pl-4">
            <span className="text-xs text-slate-500 font-mono">{formatDuration(fw.duration)}</span>
            {fw.cost > 0 && <span className="text-xs text-slate-500">${fw.cost}</span>}
          </div>
        </button>
      </div>
      <div className="flex items-center gap-1 px-3 pb-2.5">
        <span className="text-xs text-slate-500 mr-1">Qty:</span>
        <button onClick={() => onSetQty(qty - 1)} className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs flex items-center justify-center">−</button>
        <input
          type="number" min="1" max="20"
          className="w-10 bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-xs text-white text-center focus:outline-none focus:border-blue-500"
          value={qty} onChange={e => onSetQty(parseInt(e.target.value) || 1)} onClick={e => e.stopPropagation()}
        />
        <button onClick={() => onSetQty(qty + 1)} className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs flex items-center justify-center">+</button>
        {qty > 1 && <span className="text-xs text-blue-400 ml-1">×{qty}</span>}
      </div>
    </div>
  );
}

// ── Droppable show-item row ────────────────────────────────────────────
interface RowProps {
  item: ShowItem;
  fw: Firework | undefined;
  effectiveDuration: number;
  index: number;
  fireworks: Firework[];
  onRemove: (id: string) => void;
  onRemoveSimultaneous: (showItemId: string, simId: string) => void;
  onUpdateSimultaneous: (showItemId: string, sim: SimultaneousItem) => void;
  maxDuration: number;
  isSimDropTarget: boolean;
  onEditItem: () => void;
  onEditSim: (simId: string) => void;
}

function DroppableRow({
  item, fw, effectiveDuration, index, fireworks,
  onRemove, onRemoveSimultaneous, onUpdateSimultaneous,
  maxDuration, isSimDropTarget, onEditItem, onEditSim,
}: RowProps) {
  const { setNodeRef } = useDroppable({ id: item.id });

  if (!fw) return null;
  const pc = PHASE_COLORS[fw.phase];
  const barWidth = maxDuration > 0 ? Math.max(2, (effectiveDuration / maxDuration) * 100) : 0;
  const startTime = item.startTime;

  return (
    <div ref={setNodeRef} className="flex gap-0">
      <div className="w-16 shrink-0 flex flex-col items-end pr-2 pt-3.5">
        <span className="text-xs font-mono text-slate-500">{formatTime(startTime)}</span>
      </div>
      <div className="w-6 shrink-0 flex flex-col items-center">
        <div className={`w-2 h-2 rounded-full mt-4 shrink-0 ${pc.text} bg-current`} />
        <div className="w-px flex-1 bg-slate-700 mt-0.5" />
      </div>
      <div className={`flex-1 mb-2 rounded-lg border ${pc.border} ${pc.bg} overflow-hidden relative ${isSimDropTarget ? 'ring-2 ring-blue-400' : ''}`}>
        {isSimDropTarget && (
          <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center z-10 pointer-events-none">
            <div className="flex items-center gap-2 bg-blue-900/90 rounded-lg px-3 py-1.5 border border-blue-500 shadow-lg">
              <Link2 size={12} className="text-blue-300" />
              <span className="text-xs font-medium text-blue-200">Drop to fire simultaneously</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 px-3 py-0.5 bg-black/15 border-b border-black/10 text-xs text-slate-500">
          <Clock size={9} className="shrink-0" />
          <span className="font-mono">{formatTime(startTime)}</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="text-slate-500 text-xs font-mono w-6 text-center shrink-0">{index + 1}</span>
          {item.cue && (
            <span className="bg-slate-900/60 text-slate-200 text-xs font-mono px-2 py-0.5 rounded font-bold shrink-0">{item.cue}</span>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium text-sm truncate">{fw.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${TYPE_COLORS[fw.type]}`}>{FIREWORK_TYPE_LABELS[fw.type]}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-slate-900/50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${pc.text} bg-current opacity-70`} style={{ width: `${barWidth}%` }} />
              </div>
              <span className="text-xs font-mono text-slate-400 shrink-0">{formatDuration(effectiveDuration)}</span>
            </div>
          </div>
          {item.location && item.location !== 'FC' && (
            <span className="text-xs text-slate-400 font-mono shrink-0">{item.location}</span>
          )}
          <button onClick={onEditItem} className="p-2 text-slate-500 hover:text-blue-400 transition-colors shrink-0" title="Edit cue">
            <Pencil size={13} />
          </button>
          <button onClick={() => onRemove(item.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>

        {(item.simultaneous ?? []).map(sim => (
          <SimCard
            key={sim.id}
            sim={sim}
            fw={fireworks.find(f => f.id === sim.fireworkId)}
            showItemId={item.id}
            parentStartTime={startTime}
            parentDuration={fw.duration}
            onUpdate={onUpdateSimultaneous}
            onEdit={() => onEditSim(sim.id)}
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
export default function PlannerTab({
  fireworks, showItems,
  onAdd, onAddMany, onUpdate, onUpdateFirework, onRemove, onClear,
  onAddSimultaneous, onUpdateSimultaneous, onRemoveSimultaneous,
}: Props) {
  const [sidebarPhase, setSidebarPhase] = useState<typeof PHASE_ORDER[number]>('start');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
  const [activeSidebarFwId, setActiveSidebarFwId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<DropHint>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingSim, setEditingSim] = useState<{ showItemId: string; simId: string } | null>(null);

  const pointerYRef = useRef(0);
  useEffect(() => {
    const handler = (e: PointerEvent) => { pointerYRef.current = e.clientY; };
    document.addEventListener('pointermove', handler, { capture: true, passive: true });
    return () => document.removeEventListener('pointermove', handler, { capture: true });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const getQty = (fwId: string) => qtys[fwId] ?? 1;
  const setQty = (fwId: string, v: number) => setQtys(q => ({ ...q, [fwId]: Math.max(1, v) }));

  const effectiveDurationMap = useMemo(() => {
    const map = new Map<string, number>();
    showItems.forEach(item => {
      const primary = fireworks.find(f => f.id === item.fireworkId)?.duration ?? 0;
      const simEnd = (item.simultaneous ?? [])
        .map(s => (s.offset ?? 0) + (fireworks.find(f => f.id === s.fireworkId)?.duration ?? 0))
        .reduce((a, b) => Math.max(a, b), 0);
      map.set(item.id, Math.max(primary, simEnd));
    });
    return map;
  }, [showItems, fireworks]);

  const sortedItems = useMemo(
    () => [...showItems].sort((a, b) => a.startTime - b.startTime),
    [showItems],
  );

  const { totalTime, totalCost } = useMemo(() => {
    let maxEnd = 0;
    let cost = 0;
    showItems.forEach(si => {
      const fw = fireworks.find(f => f.id === si.fireworkId);
      if (fw) cost += fw.cost;
      maxEnd = Math.max(maxEnd, si.startTime + (effectiveDurationMap.get(si.id) ?? 0));
    });
    return { totalTime: maxEnd, totalCost: cost };
  }, [showItems, fireworks, effectiveDurationMap]);

  const maxDuration = useMemo(() => {
    const vals = Array.from(effectiveDurationMap.values());
    return vals.length > 0 ? Math.max(...vals, 1) : 1;
  }, [effectiveDurationMap]);

  const getNextStartTime = () => {
    if (showItems.length === 0) return 0;
    return Math.max(0, ...showItems.map(si => si.startTime + (effectiveDurationMap.get(si.id) ?? 0)));
  };

  const handleRemove = (id: string) => {
    const item = showItems.find(si => si.id === id);
    if (item) {
      const effectiveDur = effectiveDurationMap.get(id) ?? 0;
      const deletedEnd = item.startTime + effectiveDur;
      showItems.forEach(si => {
        if (si.id !== id && si.startTime >= deletedEnd) {
          onUpdate({ ...si, startTime: si.startTime - effectiveDur });
        }
      });
    }
    onRemove(id);
  };

  const makeShowItem = (fw: Firework, startTime = 0): ShowItem => ({
    id: uuid(), fireworkId: fw.id, cue: '', location: 'FC',
    showNotes: '', startTime, simultaneous: [],
  });

  const computePosition = (overRect: { top: number; height: number }): 'before' | 'on' | 'after' => {
    const relY = pointerYRef.current - overRect.top;
    const frac = overRect.height > 0 ? relY / overRect.height : 0.5;
    if (frac < 0.25) return 'before';
    if (frac > 0.75) return 'after';
    return 'on';
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'sidebar') {
      setActiveSidebarFwId(event.active.data.current.fireworkId as string);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.active.data.current?.type !== 'sidebar' || !event.over) { setDropHint(null); return; }
    const overId = String(event.over.id);
    if (!showItems.some(si => si.id === overId)) { setDropHint(null); return; }
    const pos = computePosition(event.over.rect);
    setDropHint(prev => (prev?.itemId === overId && prev?.position === pos ? prev : { itemId: overId, position: pos }));
  };

  const handleDragMove = (event: DragMoveEvent) => {
    if (event.active.data.current?.type !== 'sidebar') return;
    if (!event.over) { setDropHint(null); return; }
    const overId = String(event.over.id);
    if (!showItems.some(si => si.id === overId)) { setDropHint(null); return; }
    const newPos = computePosition(event.over.rect);
    setDropHint(prev => (prev?.itemId === overId && prev?.position === newPos ? prev : { itemId: overId, position: newPos }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.data.current?.type === 'sidebar') {
      const fwId = active.data.current.fireworkId as string;
      const fw = fireworks.find(f => f.id === fwId);
      if (fw) {
        if (over) {
          const overId = String(over.id);
          const targetIdx = sortedItems.findIndex(si => si.id === overId);
          if (targetIdx !== -1) {
            const position = computePosition(over.rect);
            if (position === 'on') {
              onAddSimultaneous(overId, fw);
            } else {
              const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
              const prevIdx = insertIdx - 1;
              const newStartTime = prevIdx >= 0
                ? (sortedItems[prevIdx].startTime + (effectiveDurationMap.get(sortedItems[prevIdx].id) ?? 0))
                : 0;
              onAdd(makeShowItem(fw, newStartTime));
            }
            setActiveSidebarFwId(null);
            setDropHint(null);
            return;
          }
        }
        const t = getNextStartTime();
        const qty = getQty(fwId);
        if (qty === 1) {
          onAdd(makeShowItem(fw, t));
        } else {
          let cursor = t;
          const items = Array.from({ length: qty }, () => { const item = makeShowItem(fw, cursor); cursor += fw.duration; return item; });
          onAddMany(items);
        }
      }
    }
    setActiveSidebarFwId(null);
    setDropHint(null);
  };

  const handleDragCancel = () => { setActiveSidebarFwId(null); setDropHint(null); };

  const activeSidebarFw = activeSidebarFwId ? fireworks.find(f => f.id === activeSidebarFwId) : null;
  const sidebarFws = fireworks.filter(fw => fw.phase === sidebarPhase);

  const editingItem = editingItemId ? showItems.find(si => si.id === editingItemId) : null;
  const editingFw = editingItem ? fireworks.find(f => f.id === editingItem.fireworkId) : null;

  const editingSimShowItem = editingSim ? showItems.find(si => si.id === editingSim.showItemId) : null;
  const editingSimItem = editingSimShowItem?.simultaneous.find(s => s.id === editingSim?.simId) ?? null;
  const editingSimFw = editingSimItem ? fireworks.find(f => f.id === editingSimItem.fireworkId) : null;
  const editingSimParentFw = editingSimShowItem ? fireworks.find(f => f.id === editingSimShowItem.fireworkId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col md:flex-row h-full">
        {/* Inventory Sidebar */}
        <div className={`shrink-0 border-b md:border-b-0 md:border-r border-slate-700 flex flex-col overflow-hidden transition-all duration-200 ${sidebarOpen ? 'h-72 md:h-auto md:w-72' : 'h-12 md:h-auto md:w-10'}`}>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="flex items-center justify-between px-3 py-3 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border-b border-slate-700"
          >
            {sidebarOpen && <span className="text-xs font-semibold uppercase tracking-wider">Inventory</span>}
            <ChevronDown size={14} className={`transition-transform ${sidebarOpen ? '' : '-rotate-90'}`} />
          </button>

          {sidebarOpen && (
            <>
              <div className="flex flex-col border-b border-slate-700">
                {PHASE_ORDER.map(phase => {
                  const pc = PHASE_COLORS[phase];
                  const count = fireworks.filter(fw => fw.phase === phase).length;
                  return (
                    <button key={phase} onClick={() => setSidebarPhase(phase)}
                      className={`flex items-center justify-between px-3 py-2.5 text-xs font-medium transition-colors border-l-2 ${sidebarPhase === phase ? `${pc.text} border-current bg-slate-800` : 'text-slate-400 border-transparent hover:bg-slate-800/50'}`}>
                      <span>{PHASE_LABELS[phase]}</span>
                      <span className="text-slate-500">{count}</span>
                    </button>
                  );
                })}
              </div>
              <div className="px-3 py-1.5 bg-slate-900/40 border-b border-slate-700/50">
                <p className="text-[10px] text-slate-500 leading-snug">Click to add · Drag onto item → fire together · Drag between items → insert there</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sidebarFws.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6 px-2">No fireworks in this phase. Add them in Inventory.</p>
                ) : (
                  sidebarFws.map(fw => (
                    <DraggableFireworkCard
                      key={fw.id} fw={fw} qty={getQty(fw.id)} onSetQty={v => setQty(fw.id, v)}
                      onClickAdd={() => {
                        const qty = getQty(fw.id);
                        const t = getNextStartTime();
                        if (qty === 1) {
                          onAdd(makeShowItem(fw, t));
                        } else {
                          let cursor = t;
                          const items = Array.from({ length: qty }, () => { const item = makeShowItem(fw, cursor); cursor += fw.duration; return item; });
                          onAddMany(items);
                        }
                      }}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 bg-slate-800/30 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock size={14} />
              <span>Total: <span className="text-white font-mono font-semibold">{formatTime(totalTime)}</span></span>
            </div>
            <div className="text-sm text-slate-400">Items: <span className="text-white font-semibold">{showItems.length}</span></div>
            <div className="flex items-center gap-1 text-sm text-slate-400">
              <DollarSign size={14} />
              <span>Cost: <span className="text-emerald-400 font-semibold">${totalCost.toFixed(2)}</span></span>
            </div>
            <div className="flex border border-slate-600 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${viewMode === 'list' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
                <List size={12} /> List
              </button>
              <button onClick={() => setViewMode('gantt')} className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${viewMode === 'gantt' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
                <BarChart2 size={12} /> Timeline
              </button>
            </div>
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
              <button onClick={() => { if (confirm('Clear the entire show?')) onClear(); }} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Clear Show</button>
            )}
          </div>

          {viewMode === 'gantt' ? (
            <div className="flex-1 overflow-hidden">
              <GanttView
                fireworks={fireworks}
                showItems={sortedItems}
                totalTime={totalTime}
                onEditItem={id => setEditingItemId(id)}
                onUpdate={onUpdate}
                onUpdateSimultaneous={onUpdateSimultaneous}
                onRemove={handleRemove}
                dropHint={dropHint}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              {sortedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <span className="text-5xl mb-4">🎇</span>
                  <p className="text-lg font-medium mb-2">Show is empty</p>
                  <p className="text-sm text-center px-4">Click sidebar items to add · drag between rows to insert · drag onto a row to fire simultaneously</p>
                </div>
              ) : (
                <div>
                  {sortedItems.map((item, idx) => {
                    const hint = dropHint?.itemId === item.id ? dropHint : null;
                    return (
                      <React.Fragment key={item.id}>
                        {hint?.position === 'before' && <InsertLine />}
                        <DroppableRow
                          item={item}
                          fw={fireworks.find(f => f.id === item.fireworkId)}
                          effectiveDuration={effectiveDurationMap.get(item.id) ?? 0}
                          index={idx}
                          fireworks={fireworks}
                          onRemove={handleRemove}
                          onRemoveSimultaneous={onRemoveSimultaneous}
                          onUpdateSimultaneous={onUpdateSimultaneous}
                          maxDuration={maxDuration}
                          isSimDropTarget={hint?.position === 'on'}
                          onEditItem={() => setEditingItemId(item.id)}
                          onEditSim={simId => setEditingSim({ showItemId: item.id, simId })}
                        />
                        {hint?.position === 'after' && <InsertLine />}
                      </React.Fragment>
                    );
                  })}
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
              )}
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeSidebarFw && (
          <div className="flex items-center gap-2 bg-slate-700 border border-blue-500 rounded-lg px-3 py-2.5 shadow-xl opacity-95 pointer-events-none">
            <GripVertical size={14} className="text-slate-400" />
            <div>
              <div className="text-xs font-medium text-white">{activeSidebarFw.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">{formatDuration(activeSidebarFw.duration)}</div>
            </div>
          </div>
        )}
      </DragOverlay>

      {editingItem && editingFw && (
        <EditItemModal
          item={editingItem}
          fw={editingFw}
          onUpdate={onUpdate}
          onUpdateFirework={onUpdateFirework}
          onClose={() => setEditingItemId(null)}
        />
      )}

      {editingSimShowItem && editingSimItem && editingSimFw && (
        <SimEditModal
          sim={editingSimItem}
          fw={editingSimFw}
          showItemId={editingSimShowItem.id}
          parentStartTime={editingSimShowItem.startTime}
          parentDuration={editingSimParentFw?.duration ?? 0}
          onUpdate={onUpdateSimultaneous}
          onClose={() => setEditingSim(null)}
        />
      )}
    </DndContext>
  );
}
