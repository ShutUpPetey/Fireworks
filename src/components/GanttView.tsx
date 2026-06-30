import { useState } from 'react';
import { ZoomIn, ZoomOut, GripVertical, Link2 } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Firework, ShowItem } from '../types';
import { PHASE_COLORS, FIREWORK_TYPE_LABELS, formatDuration, formatTime } from '../types';

type DropHint = { itemId: string; position: 'before' | 'after' | 'on' } | null;

interface Props {
  fireworks: Firework[];
  showItems: ShowItem[];
  overlapSeconds: number;
  timings: number[];
  effectiveDurations: number[];
  totalTime: number;
  onEditItem?: (id: string) => void;
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

interface RowProps {
  item: ShowItem;
  fireworks: Firework[];
  idx: number;
  start: number;
  pxPerSec: number;
  trackW: number;
  ticks: number[];
  overlapSeconds: number;
  totalItems: number;
  dropHint?: DropHint;
  onEditItem?: (id: string) => void;
}

function SortableGanttRow({
  item, fireworks, idx, start, pxPerSec, trackW, ticks,
  overlapSeconds, totalItems, dropHint, onEditItem,
}: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const fw = fireworks.find(f => f.id === item.fireworkId);
  if (!fw) return null;

  const pc = PHASE_COLORS[fw.phase];
  const sims = item.simultaneous ?? [];
  const rowH = 44 + sims.length * 22;
  const hint = dropHint?.itemId === item.id ? dropHint : null;
  const isSimTarget = hint?.position === 'on';

  return (
    <>
      {hint?.position === 'before' && <GanttInsertLine />}
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          minHeight: rowH,
          opacity: isDragging ? 0.4 : 1,
        }}
        className={`flex border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors relative ${isSimTarget ? 'ring-1 ring-inset ring-blue-400' : ''}`}
      >
        {/* Simultaneous drop overlay */}
        {isSimTarget && (
          <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center z-10 pointer-events-none">
            <div className="flex items-center gap-2 bg-blue-900/90 rounded-lg px-3 py-1.5 border border-blue-500 shadow-lg">
              <Link2 size={12} className="text-blue-300" />
              <span className="text-xs font-medium text-blue-200">Drop to fire simultaneously</span>
            </div>
          </div>
        )}

        {/* Label */}
        <div
          className="shrink-0 flex items-start gap-1 px-2 py-2 border-r border-slate-800"
          style={{ width: LABEL_W, minWidth: LABEL_W }}
        >
          <button
            {...attributes} {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 shrink-0 touch-none p-1 mt-0.5"
            title="Drag to reorder"
          >
            <GripVertical size={13} />
          </button>
          <span className="text-xs font-mono text-slate-600 w-4 shrink-0 pt-0.5">{idx + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white font-medium truncate leading-tight">{fw.name}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{formatTime(start)} · {formatDuration(fw.duration)}</p>
          </div>
        </div>

        {/* Track */}
        <div className="relative flex-1" style={{ minWidth: trackW }}>
          {ticks.map(sec => (
            <div
              key={sec}
              className="absolute top-0 bottom-0 w-px bg-slate-800/60"
              style={{ left: sec * pxPerSec }}
            />
          ))}

          {overlapSeconds > 0 && idx < totalItems - 1 && (
            <div
              className="absolute top-0 bottom-0 bg-amber-500/8 border-l border-dashed border-amber-500/25"
              style={{
                left: Math.max(0, (start + fw.duration - overlapSeconds) * pxPerSec),
                width: overlapSeconds * pxPerSec,
              }}
            />
          )}

          {/* Primary bar */}
          <div
            className={`absolute top-2 rounded flex items-center gap-1 px-2 border ${pc.bg} ${pc.border} overflow-hidden ${onEditItem ? 'cursor-pointer hover:brightness-125 transition-[filter]' : ''}`}
            style={{
              left: start * pxPerSec,
              width: Math.max(fw.duration * pxPerSec, 6),
              height: 32,
            }}
            title={onEditItem ? `${fw.name} — tap to edit` : `${fw.name} · ${formatDuration(fw.duration)} · ${FIREWORK_TYPE_LABELS[fw.type]}`}
            onClick={() => onEditItem?.(item.id)}
          >
            {fw.duration * pxPerSec > 36 && (
              <span className={`text-xs font-medium truncate ${pc.text}`}>{fw.name}</span>
            )}
            {fw.duration * pxPerSec > 90 && (
              <span className="text-[10px] font-mono text-slate-400 ml-auto pl-1 shrink-0">
                {formatDuration(fw.duration)}
              </span>
            )}
          </div>

          {/* Simultaneous bars */}
          {sims.map((sim, si) => {
            const sfw = fireworks.find(f => f.id === sim.fireworkId);
            if (!sfw) return null;
            const spc = PHASE_COLORS[sfw.phase];
            return (
              <div
                key={sim.id}
                className={`absolute rounded flex items-center px-2 border border-dashed ${spc.bg} ${spc.border} overflow-hidden opacity-80`}
                style={{
                  top: 40 + si * 22,
                  left: start * pxPerSec,
                  width: Math.max(sfw.duration * pxPerSec, 6),
                  height: 18,
                }}
                title={`${sfw.name} (simultaneous)`}
              >
                {sfw.duration * pxPerSec > 40 && (
                  <span className={`text-[10px] font-medium truncate flex items-center gap-1 ${spc.text}`}>
                    <Link2 size={9} className="shrink-0" />{sfw.name}
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

export default function GanttView({ fireworks, showItems, overlapSeconds, timings, totalTime, onEditItem, dropHint }: Props) {
  const [pxPerSec, setPxPerSec] = useState(2);

  const zoomIn  = () => setPxPerSec(p => Math.min(12, +(p * 1.6).toFixed(2)));
  const zoomOut = () => setPxPerSec(p => Math.max(0.2, +(p / 1.6).toFixed(2)));

  const tickInterval = pxPerSec >= 4 ? 15 : pxPerSec >= 2 ? 30 : pxPerSec >= 0.8 ? 60 : 120;
  const trackW = Math.ceil(totalTime * pxPerSec) + 100;
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
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700 bg-slate-800/30 shrink-0">
        <button onClick={zoomOut} className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors" title="Zoom out">
          <ZoomOut size={14} />
        </button>
        <button onClick={zoomIn} className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors" title="Zoom in">
          <ZoomIn size={14} />
        </button>
        <span className="text-xs text-slate-500 font-mono">{pxPerSec.toFixed(1)}px/s</span>

        {/* Phase legend */}
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

        <span className="ml-auto text-xs text-slate-600">Drag ⠿ to reorder · drag from inventory to insert · click bar to edit</span>
      </div>

      {/* Scrollable chart */}
      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: LABEL_W + trackW }}>

          {/* Time ruler */}
          <div
            className="flex sticky top-0 z-10 bg-slate-950 border-b border-slate-800"
            style={{ height: 28 }}
          >
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
          <SortableContext items={showItems.map(si => si.id)} strategy={verticalListSortingStrategy}>
            {showItems.map((item, idx) => (
              <SortableGanttRow
                key={item.id}
                item={item}
                fireworks={fireworks}
                idx={idx}
                start={timings[idx] ?? 0}
                pxPerSec={pxPerSec}
                trackW={trackW}
                ticks={ticks}
                overlapSeconds={overlapSeconds}
                totalItems={showItems.length}
                dropHint={dropHint}
                onEditItem={onEditItem}
              />
            ))}
          </SortableContext>

          {/* Show-end row */}
          <div className="flex" style={{ height: 32 }}>
            <div
              style={{ width: LABEL_W, minWidth: LABEL_W }}
              className="shrink-0 border-r border-slate-800 flex items-center px-3"
            >
              <span className="text-xs font-mono font-bold text-amber-400">{formatTime(totalTime)}</span>
            </div>
            <div className="relative flex-1" style={{ minWidth: trackW }}>
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-500"
                style={{ left: totalTime * pxPerSec }}
              />
              <span
                className="absolute top-1.5 text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded"
                style={{ left: totalTime * pxPerSec + 6 }}
              >
                SHOW END
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
