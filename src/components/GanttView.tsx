import { useState } from 'react';
import { ZoomIn, ZoomOut, Link2 } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import type { Firework, ShowItem, SimultaneousItem } from '../types';
import { PHASE_COLORS, formatDuration, formatTime } from '../types';

type DropHint = { itemId: string; position: 'before' | 'after' | 'on' } | null;

interface Props {
  fireworks: Firework[];
  showItems: ShowItem[];
  totalTime: number;
  onEditItem?: (id: string) => void;
  onUpdate?: (item: ShowItem) => void;
  onUpdateSimultaneous?: (showItemId: string, sim: SimultaneousItem) => void;
  dropHint?: DropHint;
}

const LABEL_W = 196;

function GanttInsertLine() {
  return (
    <div className="relative z-20 flex items-center pointer-events-none" style={{ height: 4 }}>
      <div className="shrink-0 border-r border-slate-800" style={{ width: LABEL_W }} />
      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 -ml-1.5" />
      <div className="flex-1 h-0.5 bg-blue-500" />
    </div>
  );
}

function formatOffset(offset: number): string {
  if (offset === 0) return 'same time';
  return offset > 0 ? `+${offset}s` : `${offset}s`;
}

interface RowProps {
  item: ShowItem;
  fireworks: Firework[];
  idx: number;
  pxPerSec: number;
  trackW: number;
  ticks: number[];
  dropHint?: DropHint;
  onEditItem?: (id: string) => void;
  onUpdate?: (item: ShowItem) => void;
  onUpdateSimultaneous?: (showItemId: string, sim: SimultaneousItem) => void;
}

function DroppableGanttRow({
  item, fireworks, idx, pxPerSec, trackW, ticks,
  dropHint, onEditItem, onUpdate, onUpdateSimultaneous,
}: RowProps) {
  const { setNodeRef } = useDroppable({ id: item.id });
  const [liveStart, setLiveStart] = useState<number | null>(null);
  const [liveOffsets, setLiveOffsets] = useState<Record<string, number>>({});

  const fw = fireworks.find(f => f.id === item.fireworkId);
  if (!fw) return null;

  const pc = PHASE_COLORS[fw.phase];
  const sims = item.simultaneous ?? [];
  const rowH = 44 + sims.length * 22;
  const hint = dropHint?.itemId === item.id ? dropHint : null;
  const isSimTarget = hint?.position === 'on';
  const effectiveStart = liveStart ?? item.startTime;

  const handleBarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const startX = e.clientX;
    const origTime = item.startTime;
    let moved = false;
    const pointerId = e.pointerId;
    const el = e.currentTarget;

    const compute = (clientX: number) => Math.max(0, Math.round(origTime + (clientX - startX) / pxPerSec));

    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - startX) >= 4) {
        moved = true;
        el.setPointerCapture(pointerId);
      }
      if (moved) setLiveStart(compute(ev.clientX));
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (moved && onUpdate) {
        onUpdate({ ...item, startTime: compute(ev.clientX) });
      } else if (!moved) {
        onEditItem?.(item.id);
      }
      setLiveStart(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleSimPointerDown = (e: React.PointerEvent<HTMLDivElement>, sim: SimultaneousItem) => {
    if (!onUpdateSimultaneous) return;
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const origOffset = sim.offset;
    const pointerId = e.pointerId;
    const el = e.currentTarget;
    el.setPointerCapture(pointerId);

    const compute = (clientX: number) => Math.round(origOffset + (clientX - startX) / pxPerSec);

    const onMove = (ev: PointerEvent) => {
      setLiveOffsets(prev => ({ ...prev, [sim.id]: compute(ev.clientX) }));
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      onUpdateSimultaneous(item.id, { ...sim, offset: compute(ev.clientX) });
      setLiveOffsets(prev => { const next = { ...prev }; delete next[sim.id]; return next; });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <>
      {hint?.position === 'before' && <GanttInsertLine />}
      <div
        ref={setNodeRef}
        style={{ minHeight: rowH }}
        className={`flex border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors relative ${isSimTarget ? 'ring-1 ring-inset ring-blue-400' : ''}`}
      >
        {isSimTarget && (
          <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center z-10 pointer-events-none">
            <div className="flex items-center gap-2 bg-blue-900/90 rounded-lg px-3 py-1.5 border border-blue-500 shadow-lg">
              <Link2 size={12} className="text-blue-300" />
              <span className="text-xs font-medium text-blue-200">Drop to fire simultaneously</span>
            </div>
          </div>
        )}

        {/* Label */}
        <div className="shrink-0 flex items-start gap-1.5 px-2 py-2 border-r border-slate-800" style={{ width: LABEL_W, minWidth: LABEL_W }}>
          <span className="text-xs font-mono text-slate-600 w-5 shrink-0 pt-0.5 text-right">{idx + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white font-medium truncate leading-tight">{fw.name}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              {liveStart !== null
                ? <span className="text-blue-400">{formatTime(liveStart)}</span>
                : formatTime(item.startTime)
              } · {formatDuration(fw.duration)}
            </p>
          </div>
        </div>

        {/* Track */}
        <div className="relative flex-1 overflow-visible" style={{ minWidth: trackW }}>
          {ticks.map(sec => (
            <div key={sec} className="absolute top-0 bottom-0 w-px bg-slate-800/60" style={{ left: sec * pxPerSec }} />
          ))}

          {/* Primary bar */}
          <div
            className={`absolute top-2 rounded flex items-center gap-1 px-2 border ${pc.bg} ${pc.border} overflow-visible cursor-grab active:cursor-grabbing select-none ${liveStart !== null ? 'ring-2 ring-white/30 z-20' : 'hover:brightness-110'} transition-[filter]`}
            style={{ left: effectiveStart * pxPerSec, width: Math.max(fw.duration * pxPerSec, 6), height: 32 }}
            title={`${fw.name} — drag to retime · click to edit`}
            onPointerDown={handleBarPointerDown}
          >
            {liveStart !== null && (
              <span className="absolute -top-6 left-0 text-[10px] font-mono font-bold text-white bg-slate-900 border border-slate-600 px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none">
                {formatTime(liveStart)}
              </span>
            )}
            {fw.duration * pxPerSec > 36 && (
              <span className={`text-xs font-medium truncate ${pc.text}`}>{fw.name}</span>
            )}
            {fw.duration * pxPerSec > 90 && (
              <span className="text-[10px] font-mono text-slate-400 ml-auto pl-1 shrink-0">{formatDuration(fw.duration)}</span>
            )}
          </div>

          {/* Simultaneous bars */}
          {sims.map((sim, si) => {
            const sfw = fireworks.find(f => f.id === sim.fireworkId);
            if (!sfw) return null;
            const spc = PHASE_COLORS[sfw.phase];
            const liveOffset = liveOffsets[sim.id] ?? sim.offset;
            const isDraggingSim = liveOffsets[sim.id] !== undefined;
            return (
              <div
                key={sim.id}
                className={`absolute rounded flex items-center px-2 border border-dashed ${spc.bg} ${spc.border} overflow-visible opacity-80 cursor-ew-resize select-none ${isDraggingSim ? 'z-20 opacity-100 ring-1 ring-white/40' : 'hover:opacity-100'}`}
                style={{ top: 40 + si * 22, left: (effectiveStart + liveOffset) * pxPerSec, width: Math.max(sfw.duration * pxPerSec, 6), height: 18 }}
                title={`${sfw.name} (${formatOffset(liveOffset)}) — drag to retime`}
                onPointerDown={e => handleSimPointerDown(e, sim)}
              >
                {isDraggingSim && (
                  <span className="absolute -top-5 left-0 text-[10px] font-mono font-bold text-white bg-slate-900 border border-slate-600 px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none">
                    {formatTime(effectiveStart + liveOffset)}
                  </span>
                )}
                {sfw.duration * pxPerSec > 40 && (
                  <span className={`text-[10px] font-medium truncate flex items-center gap-1 ${spc.text}`}>
                    <Link2 size={9} className="shrink-0" />{sfw.name}
                    {liveOffset !== 0 && <span className="opacity-70 shrink-0">{formatOffset(liveOffset)}</span>}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {hint?.position === 'after' && <GanttInsertLine />}
    </>
  );
}

export default function GanttView({ fireworks, showItems, totalTime, onEditItem, onUpdate, onUpdateSimultaneous, dropHint }: Props) {
  const [pxPerSec, setPxPerSec] = useState(2);

  const zoomIn  = () => setPxPerSec(p => Math.min(12, +(p * 1.6).toFixed(2)));
  const zoomOut = () => setPxPerSec(p => Math.max(0.2, +(p / 1.6).toFixed(2)));

  const tickInterval = pxPerSec >= 4 ? 15 : pxPerSec >= 2 ? 30 : pxPerSec >= 0.8 ? 60 : 120;
  const trackW = Math.ceil(totalTime * pxPerSec) + 200;
  const ticks = Array.from({ length: Math.floor(totalTime / tickInterval) + 2 }, (_, i) => i * tickInterval);

  if (showItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <span className="text-5xl mb-4">🎇</span>
        <p className="text-lg font-medium mb-2">Show is empty</p>
        <p className="text-sm">Drag from the Inventory sidebar to add fireworks to the show</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700 bg-slate-800/30 shrink-0">
        <button onClick={zoomOut} className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors" title="Zoom out">
          <ZoomOut size={14} />
        </button>
        <button onClick={zoomIn} className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors" title="Zoom in">
          <ZoomIn size={14} />
        </button>
        <span className="text-xs text-slate-500 font-mono">{pxPerSec.toFixed(1)}px/s</span>

        <div className="flex items-center gap-4 ml-6">
          {(['start','body','mid_finale','finale'] as const).map(phase => {
            const pc = PHASE_COLORS[phase];
            const count = showItems.filter(si => fireworks.find(f => f.id === si.fireworkId)?.phase === phase).length;
            if (!count) return null;
            return (
              <span key={phase} className={`text-xs flex items-center gap-1.5 ${pc.text}`}>
                <span className={`w-2.5 h-2.5 rounded-sm inline-block ${pc.bg} border ${pc.border}`} />
                {count}
              </span>
            );
          })}
        </div>

        <span className="ml-auto text-xs text-slate-600">Drag bar to retime · drag linked bars to offset · click to edit</span>
      </div>

      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: LABEL_W + trackW }}>
          {/* Time ruler */}
          <div className="flex sticky top-0 z-10 bg-slate-950 border-b border-slate-800" style={{ height: 28 }}>
            <div style={{ width: LABEL_W, minWidth: LABEL_W }} className="shrink-0 border-r border-slate-800" />
            <div className="relative flex-1" style={{ minWidth: trackW }}>
              {ticks.map(sec => (
                <div key={sec} className="absolute top-0" style={{ left: sec * pxPerSec }}>
                  <div className="w-px h-2 bg-slate-700" />
                  <span className="text-[10px] font-mono text-slate-500 pl-1 select-none">{formatTime(sec)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Item rows */}
          {showItems.map((item, idx) => (
            <DroppableGanttRow
              key={item.id}
              item={item}
              fireworks={fireworks}
              idx={idx}
              pxPerSec={pxPerSec}
              trackW={trackW}
              ticks={ticks}
              dropHint={dropHint}
              onEditItem={onEditItem}
              onUpdate={onUpdate}
              onUpdateSimultaneous={onUpdateSimultaneous}
            />
          ))}

          {/* Show-end marker */}
          <div className="flex" style={{ height: 32 }}>
            <div style={{ width: LABEL_W, minWidth: LABEL_W }} className="shrink-0 border-r border-slate-800 flex items-center px-3">
              <span className="text-xs font-mono font-bold text-amber-400">{formatTime(totalTime)}</span>
            </div>
            <div className="relative flex-1" style={{ minWidth: trackW }}>
              <div className="absolute top-0 bottom-0 w-0.5 bg-amber-500" style={{ left: totalTime * pxPerSec }} />
              <span className="absolute top-1.5 text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded" style={{ left: totalTime * pxPerSec + 6 }}>
                SHOW END
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
