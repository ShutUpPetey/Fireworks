import { useMemo } from 'react';
import { MapPin, Printer } from 'lucide-react';
import type { Firework, ShowItem } from '../types';
import { parseCue } from '../types';

function printMap(locationMap: Map<string, CueEntry[]>, layout: typeof LAYOUT) {
  const locBoxes = layout.map(loc => {
    const entries = locationMap.get(loc.id) ?? [];
    const entryHtml = entries.length === 0
      ? '<div class="empty">empty</div>'
      : entries.map(e =>
          `<div class="entry">
            <span class="cue${e.isManual?' manual':e.cue?'':' nc'}">${e.isManual?'MAN':e.cue||'—'}</span>
            <span class="ename">${e.name}</span>
          </div>`
        ).join('');
    return `<div class="loc" style="grid-column:${loc.col};grid-row:${loc.row}">
      <div class="lh"><span class="ll">${loc.label}</span>${entries.length?`<span class="sc">${entries.length} shots</span>`:''}</div>
      <div class="le${loc.wide?' wide':''}">${entryHtml}</div>
    </div>`;
  }).join('');

  const win = window.open('', '_blank');
  if (!win) { alert('Allow popups for this site to enable printing.'); return; }
  win.document.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8"><title>Firing Map</title>
<style>
@page{size:letter landscape;margin:.4in .45in;}
*{box-sizing:border-box;}body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#000;margin:0;padding:0;}
h1{font-size:12pt;margin:0 0 6pt;}
.grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:auto auto auto;gap:7pt;width:100%;}
.loc{border:1.5pt solid #000;border-radius:3pt;overflow:hidden;}
.lh{background:#f2f2f2;border-bottom:1pt solid #ccc;padding:3pt 6pt;display:flex;align-items:center;}
.ll{font-weight:700;font-size:10pt;letter-spacing:1pt;}
.sc{margin-left:auto;font-size:7.5pt;color:#666;}
.le{padding:4pt 6pt;}
.wide{display:grid;grid-template-columns:repeat(auto-fill,minmax(110pt,1fr));gap:1pt;}
.empty{color:#bbb;font-size:8pt;font-style:italic;padding:2pt 0;}
.entry{display:flex;align-items:baseline;gap:4pt;padding:1pt 0;border-bottom:.3pt solid #eee;}
.entry:last-child{border-bottom:none;}
.cue{font-family:monospace;font-weight:700;font-size:8.5pt;min-width:22pt;}
.manual{color:#6d28d9;}.nc{color:#bbb;}
.ename{font-size:8.5pt;}
.footer{margin-top:7pt;text-align:center;font-size:7.5pt;color:#888;}
</style></head><body>
<h1>Firing Location Map</h1>
<div class="grid">${locBoxes}</div>
<div class="footer">↑ Back of site &nbsp;·&nbsp; ↓ Audience / Front &nbsp;·&nbsp; Printed ${new Date().toLocaleDateString()}</div>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 250);
}

interface Props {
  fireworks: Firework[];
  showItems: ShowItem[];
}

interface CueEntry {
  cue: string;
  name: string;
  time: number;
  isManual: boolean;
}

// Physical staging layout matching the paint diagram
const LAYOUT = [
  { id: 'BL',    label: 'BL',    col: '1',     row: '1', wide: false },
  { id: 'TRAIL', label: 'TRAIL', col: '2',     row: '1', wide: false },
  { id: 'BR',    label: 'BR',    col: '3',     row: '1', wide: false },
  { id: 'OTHER', label: 'OTHER', col: '1 / 4', row: '2', wide: true  },
  { id: 'FL',    label: 'FL',    col: '1',     row: '3', wide: false },
  { id: 'FC',    label: 'FC',    col: '2',     row: '3', wide: false },
  { id: 'FR',    label: 'FR',    col: '3',     row: '3', wide: false },
] as const;

function sortEntries(a: CueEntry, b: CueEntry) {
  const pa = parseCue(a.cue);
  const pb = parseCue(b.cue);
  if (pa && pb) return pa.rack !== pb.rack ? pa.rack - pb.rack : pa.pos - pb.pos;
  if (pa) return -1;
  if (pb) return 1;
  return a.time - b.time;
}

export default function MapTab({ fireworks, showItems }: Props) {
  const locationMap = useMemo(() => {
    const map = new Map<string, CueEntry[]>();
    LAYOUT.forEach(l => map.set(l.id, []));

    showItems.forEach(item => {
      const fw = fireworks.find(f => f.id === item.fireworkId);
      if (!fw) return;
      const loc = item.location || 'OTHER';
      if (!map.has(loc)) map.set(loc, []);
      map.get(loc)!.push({ cue: item.cue, name: fw.name, time: item.startTime, isManual: item.cue === 'MANUAL' });

      (item.simultaneous ?? []).forEach(sim => {
        const sfw = fireworks.find(f => f.id === sim.fireworkId);
        if (!sfw) return;
        const sloc = sim.location || loc;
        if (!map.has(sloc)) map.set(sloc, []);
        map.get(sloc)!.push({ cue: sim.cue, name: sfw.name, time: item.startTime + (sim.offset ?? 0), isManual: sim.cue === 'MANUAL' });
      });
    });

    map.forEach(entries => entries.sort(sortEntries));
    return map;
  }, [fireworks, showItems]);

  const totalAssigned = [...locationMap.values()].reduce((s, e) => s + e.length, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-700 text-sm shrink-0">
        <div className="flex items-center gap-2 text-slate-400">
          <MapPin size={14} />
          <span>Firing location map</span>
        </div>
        <span className="text-slate-400">
          <span className="text-white font-semibold">{totalAssigned}</span> shots placed
        </span>
        <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-blue-400">1.3</span> Electric cue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-purple-400">MAN</span> Manual
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-slate-500">—</span> No cue
          </span>
          <button
            onClick={() => printMap(locationMap, LAYOUT)}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <Printer size={13} /> Print Map
          </button>
        </div>
      </div>

      {/* Map canvas */}
      <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
        {showItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <span className="text-5xl mb-4">🗺️</span>
            <p className="text-lg font-medium mb-2">No show planned yet</p>
            <p className="text-sm">Add fireworks to your show in the Planner tab first</p>
          </div>
        ) : (
          <div className="w-full max-w-4xl">
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'auto auto auto' }}
            >
              {LAYOUT.map(loc => {
                const entries = locationMap.get(loc.id) ?? [];
                const occupied = entries.length > 0;
                return (
                  <div
                    key={loc.id}
                    style={{ gridColumn: loc.col, gridRow: loc.row }}
                    className={`rounded-xl border-2 flex flex-col overflow-hidden transition-colors ${
                      occupied
                        ? 'border-slate-500 bg-slate-800/70'
                        : 'border-slate-700/60 bg-slate-900/30'
                    }`}
                  >
                    {/* Location header */}
                    <div className={`flex items-center gap-2 px-3 py-2 border-b ${
                      occupied ? 'border-slate-600 bg-slate-700/40' : 'border-slate-800/60'
                    }`}>
                      <span className="font-bold text-sm tracking-widest text-white">{loc.label}</span>
                      {occupied && (
                        <span className="ml-auto text-xs text-slate-400">
                          {entries.length} {entries.length === 1 ? 'shot' : 'shots'}
                        </span>
                      )}
                    </div>

                    {/* Entries — wide (OTHER) shows in a multi-column grid */}
                    <div
                      className="p-2 flex-1"
                      style={loc.wide ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2px' } : undefined}
                    >
                      {entries.length === 0 ? (
                        <div className="text-center py-4 text-slate-700 text-xs">empty</div>
                      ) : (
                        entries.map((entry, i) => (
                          <div
                            key={i}
                            className="flex items-baseline gap-2 px-1.5 py-0.5 rounded hover:bg-slate-700/40 transition-colors"
                          >
                            <span className={`font-mono text-xs font-bold shrink-0 w-10 ${
                              entry.isManual
                                ? 'text-purple-400'
                                : entry.cue
                                ? 'text-blue-400'
                                : 'text-slate-600'
                            }`}>
                              {entry.isManual ? 'MAN' : entry.cue || '—'}
                            </span>
                            <span className="text-xs text-slate-200 truncate">{entry.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compass / orientation hint */}
            <p className="text-center text-xs text-slate-600 mt-6">↑ Back of site &nbsp;·&nbsp; ↓ Audience / Front</p>
          </div>
        )}
      </div>
    </div>
  );
}
